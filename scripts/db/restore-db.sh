#!/usr/bin/env bash
# Restore seguro de backup PostgreSQL do SGP+ com troca de base por rename.
#
# Uso:
#   restore-db.sh --file <caminho.dump> [--target-db <nome>] [--pm2-process <nome>] [--confirm <nome-do-arquivo>]
#   restore-db.sh --undo --target-db <nome> --old-db <nome_old_ts> [--confirm <nome_old_ts>]
#
# Restore: valida o arquivo (sha256 + pg_restore --list), mostra o resumo e a
# janela de perda, exige digitar o NOME EXATO DO ARQUIVO (sem TTY: --confirm),
# restaura em <alvo>_restore_<ts>, valida, faz backup pre-restore da base atual
# e troca: <alvo> -> <alvo>_old_<ts>, <alvo>_restore_<ts> -> <alvo>.
# A base <alvo>_old_<ts> NÃO é apagada automaticamente.
#
# Undo: <alvo> -> <alvo>_discarded_<ts>, <old> -> <alvo> (confirmação: nome da base antiga).
#
# Qualquer falha após o pm2 stop desfaz os renames, sobe o processo PM2 e envia alerta.
# Log de operações: $BACKUP_ROOT/restore-log/restore.log.jsonl
# Configuração: /opt/sgp/backup.env ou SGP_BACKUP_CONFIG (ver backup.env.example).
# Credenciais: ~/.pgpass com a role RESTORE_PGUSER (precisa de CREATEDB e poder
# renomear/encerrar conexões da base alvo; normalmente postgres).
#
# Ver docs/runbooks/backup-restore-postgresql.md

set -euo pipefail

SGP_LOG_TAG="restore-db"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/backup-common.sh
source "$SCRIPT_DIR/lib/backup-common.sh"

usage() {
  sed -n '4,6p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

FILE=""
TARGET_DB=""
PM2_PROC_ARG=""
CONFIRM=""
UNDO=0
OLD_DB=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file) FILE="${2:-}"; shift 2 ;;
    --target-db) TARGET_DB="${2:-}"; shift 2 ;;
    --pm2-process) PM2_PROC_ARG="${2:-}"; shift 2 ;;
    --confirm) CONFIRM="${2:-}"; shift 2 ;;
    --old-db) OLD_DB="${2:-}"; shift 2 ;;
    --undo) UNDO=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) log_error "argumento desconhecido: $1"; usage >&2; exit 2 ;;
  esac
done

load_config
TARGET_DB="${TARGET_DB:-$BACKUP_DB}"
PM2_PROC="${PM2_PROC_ARG:-$PM2_PROCESS}"
validate_db_name "$TARGET_DB"

if [[ " $ALLOWED_TARGET_DBS " != *" $TARGET_DB "* ]]; then
  log_error "base alvo '$TARGET_DB' não está em ALLOWED_TARGET_DBS ($ALLOWED_TARGET_DBS)."
  exit 2
fi
if [[ -n "$RESTORE_DB_OWNER" ]] && ! validate_db_name "$RESTORE_DB_OWNER"; then
  log_error "RESTORE_DB_OWNER inválido."
  exit 2
fi
if (( ${#TARGET_DB} > 40 )); then
  log_error "nome da base alvo longo demais para os sufixos _restore_/_old_/_discarded_ (máx. 40)."
  exit 2
fi

OPERATOR="$(operator_name)"
LOG_DIR="$BACKUP_ROOT/restore-log"
LOG_FILE="$LOG_DIR/restore.log.jsonl"

# ---------------------------------------------------------------------------
# Auxiliares
# ---------------------------------------------------------------------------

psql_admin() {
  "$PSQL" -X -q -v ON_ERROR_STOP=1 -U "$RESTORE_PGUSER" -d postgres "$@"
}

psql_value() {
  "$PSQL" -X -A -t -v ON_ERROR_STOP=1 -U "$RESTORE_PGUSER" "$@"
}

db_exists() {
  local r
  r="$(psql_value -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '$1'")"
  [[ "$r" == "1" ]]
}

count_public_tables() {
  psql_value -d "$1" -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
}

# Encerra conexões e renomeia (com algumas tentativas, caso alguém reconecte).
rename_db() {
  local from="$1" to="$2" attempt
  for attempt in 1 2 3 4 5; do
    if psql_admin >/dev/null <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$from' AND pid <> pg_backend_pid();
ALTER DATABASE "$from" RENAME TO "$to";
SQL
    then
      log_info "base renomeada: $from -> $to"
      return 0
    fi
    log_warn "tentativa $attempt de renomear $from -> $to falhou; repetindo."
    sleep 1
  done
  log_error "não foi possível renomear $from -> $to."
  return 1
}

drop_db() {
  local db="$1"
  psql_admin >/dev/null <<SQL || log_warn "não foi possível remover a base $db; remova manualmente."
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$db' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS "$db";
SQL
}

PM2_ARGV=()
read -r -a PM2_ARGV <<<"$PM2_CMD"

pm2_run() {
  local action="$1"
  if [[ -n "$PM2_USER" && "$PM2_USER" != "$(id -un)" ]]; then
    sudo -u "$PM2_USER" -H "${PM2_ARGV[@]}" "$action" "$PM2_PROC"
  else
    "${PM2_ARGV[@]}" "$action" "$PM2_PROC"
  fi
}

wait_health() {
  local deadline
  [[ -z "$HEALTH_URL" ]] && return 0
  deadline=$(( $(date +%s) + HEALTH_TIMEOUT_SECONDS ))
  while (( $(date +%s) < deadline )); do
    if curl -fsS --max-time 5 -o /dev/null "$HEALTH_URL" 2>/dev/null; then
      log_info "health ok: $HEALTH_URL"
      return 0
    fi
    sleep 2
  done
  log_error "health não respondeu em ${HEALTH_TIMEOUT_SECONDS}s: $HEALTH_URL"
  return 1
}

# write_log <action> <file> <old_db> <result> <detail> [restored_db]
write_log() {
  mkdir -p "$LOG_DIR"
  printf '{"date":"%s","operator":"%s","action":"%s","file":%s,"target_db":"%s","old_db":%s,"restored_db":%s,"result":"%s","detail":"%s"}\n' \
    "$(utc_now_iso)" "$(json_escape "$OPERATOR")" "$1" \
    "$([[ -n "$2" ]] && printf '"%s"' "$(json_escape "$2")" || printf 'null')" \
    "$TARGET_DB" \
    "$([[ -n "$3" ]] && printf '"%s"' "$3" || printf 'null')" \
    "$([[ -n "${6:-}" ]] && printf '"%s"' "$6" || printf 'null')" \
    "$4" "$(json_escape "$5")" >>"$LOG_FILE" || log_warn "não foi possível gravar $LOG_FILE"
}

# ---------------------------------------------------------------------------
# Troca com rollback
# ---------------------------------------------------------------------------
# swap_databases <parked_name> <source_name>
#   <target> -> <parked_name>; <source_name> -> <target>
# Em falha após o pm2 stop: desfaz renames, pm2 start, remove flag. Retorna:
#   0 sucesso; 1 falha revertida; 3 falha com rollback incompleto.

SWAP_ERROR=""

swap_databases() {
  local parked="$1" source="$2"
  local flag_created=0 renamed_target=0 renamed_source=0 rb_ok=1

  if [[ -n "$MAINTENANCE_FLAG" ]]; then
    if touch "$MAINTENANCE_FLAG"; then
      flag_created=1
      log_info "modo manutenção ativado ($MAINTENANCE_FLAG)."
    else
      SWAP_ERROR="não foi possível criar MAINTENANCE_FLAG"
      log_error "$SWAP_ERROR"
      return 1
    fi
  fi

  local step_ok=1
  log_info "pm2 stop $PM2_PROC"
  if ! pm2_run stop; then
    SWAP_ERROR="falha no pm2 stop"
    step_ok=0
  fi
  if [[ "$step_ok" -eq 1 ]]; then
    if rename_db "$TARGET_DB" "$parked"; then
      renamed_target=1
    else
      SWAP_ERROR="falha ao renomear $TARGET_DB -> $parked"
      step_ok=0
    fi
  fi
  if [[ "$step_ok" -eq 1 ]]; then
    if rename_db "$source" "$TARGET_DB"; then
      renamed_source=1
    else
      SWAP_ERROR="falha ao renomear $source -> $TARGET_DB"
      step_ok=0
    fi
  fi
  if [[ "$step_ok" -eq 1 ]]; then
    log_info "pm2 start $PM2_PROC"
    if ! pm2_run start; then
      SWAP_ERROR="falha no pm2 start"
      step_ok=0
    fi
  fi
  if [[ "$step_ok" -eq 1 ]] && ! wait_health; then
    SWAP_ERROR="health check falhou após a troca"
    step_ok=0
  fi

  if [[ "$step_ok" -eq 1 ]]; then
    if [[ "$flag_created" -eq 1 ]]; then
      rm -f -- "$MAINTENANCE_FLAG" || log_warn "não foi possível remover $MAINTENANCE_FLAG"
      log_info "modo manutenção desativado."
    fi
    return 0
  fi

  # ---- Rollback ----
  log_error "$SWAP_ERROR — iniciando rollback."
  if [[ "$renamed_source" -eq 1 ]]; then
    pm2_run stop || log_warn "pm2 stop durante rollback falhou."
    if ! rename_db "$TARGET_DB" "$source"; then
      rb_ok=0
    fi
  fi
  if [[ "$renamed_target" -eq 1 && "$rb_ok" -eq 1 ]]; then
    if ! rename_db "$parked" "$TARGET_DB"; then
      rb_ok=0
    fi
  fi
  log_info "pm2 start $PM2_PROC (rollback)"
  if ! pm2_run start; then
    log_error "pm2 start durante rollback falhou."
    rb_ok=0
  fi
  if [[ "$flag_created" -eq 1 ]]; then
    rm -f -- "$MAINTENANCE_FLAG" || log_warn "não foi possível remover $MAINTENANCE_FLAG"
  fi
  if [[ "$rb_ok" -eq 1 ]]; then
    log_info "rollback concluído: $TARGET_DB voltou ao estado anterior."
    return 1
  fi
  log_error "ROLLBACK INCOMPLETO. Verifique manualmente as bases $TARGET_DB, $parked e $source e o processo $PM2_PROC."
  return 3
}

# ---------------------------------------------------------------------------
# Início
# ---------------------------------------------------------------------------

acquire_lock
resolve_pg_bins

if ! db_exists "$TARGET_DB"; then
  log_error "base alvo '$TARGET_DB' não existe."
  exit 2
fi

TS="$(date +%Y%m%d_%H%M%S)"

# ===================== UNDO =====================
if [[ "$UNDO" -eq 1 ]]; then
  if [[ -n "$FILE" ]]; then
    log_error "--undo não aceita --file."
    exit 2
  fi
  if [[ ! "$OLD_DB" =~ ^${TARGET_DB}_old_[0-9]{8}_[0-9]{6}$ ]]; then
    log_error "--old-db deve ter o formato ${TARGET_DB}_old_<YYYYMMDD_HHMMSS>."
    exit 2
  fi
  if ! db_exists "$OLD_DB"; then
    log_error "base antiga '$OLD_DB' não existe."
    exit 2
  fi
  DISCARDED_DB="${TARGET_DB}_discarded_${TS}"
  if db_exists "$DISCARDED_DB"; then
    log_error "base $DISCARDED_DB já existe; tente novamente em alguns segundos."
    exit 2
  fi

  echo
  echo "================ DESFAZER RESTORE ================"
  echo "Base alvo:         $TARGET_DB  (atual será renomeada para $DISCARDED_DB)"
  echo "Base a reativar:   $OLD_DB"
  echo "Processo PM2:      $PM2_PROC"
  echo "Dados gravados em $TARGET_DB após o restore ficarão somente em $DISCARDED_DB."
  echo "=================================================="
  echo

  if [[ -z "$CONFIRM" ]]; then
    if [[ -t 0 ]]; then
      read -r -p "Para confirmar, digite o nome exato da base antiga ($OLD_DB): " CONFIRM
    else
      log_error "sem TTY: informe --confirm $OLD_DB."
      write_log "undo" "" "$OLD_DB" "cancelado" "sem confirmação"
      exit 1
    fi
  fi
  if [[ "$CONFIRM" != "$OLD_DB" ]]; then
    log_error "confirmação não confere. Nada foi alterado."
    write_log "undo" "" "$OLD_DB" "cancelado" "confirmação não confere"
    exit 1
  fi

  rc=0
  swap_databases "$DISCARDED_DB" "$OLD_DB" || rc=$?
  if [[ "$rc" -eq 0 ]]; then
    write_log "undo" "" "$OLD_DB" "sucesso" "$TARGET_DB atual movida para $DISCARDED_DB"
    log_info "OK — $OLD_DB voltou a ser $TARGET_DB. Base descartada mantida: $DISCARDED_DB (não é apagada automaticamente)."
    exit 0
  fi
  result="falha-revertida"
  [[ "$rc" -eq 3 ]] && result="falha-rollback-incompleto"
  write_log "undo" "" "$OLD_DB" "$result" "$SWAP_ERROR (base descartada prevista: $DISCARDED_DB)"
  send_alert "FALHA no undo de restore de $TARGET_DB" \
    "O undo de $TARGET_DB (reativar $OLD_DB) falhou: $SWAP_ERROR. Resultado: $result. Verifique o servidor."
  exit 1
fi

# ===================== RESTORE =====================
if [[ -z "$FILE" ]]; then
  log_error "--file é obrigatório."
  usage >&2
  exit 2
fi
if [[ ! -f "$FILE" ]]; then
  log_error "arquivo não encontrado: $FILE"
  exit 2
fi
FILE="$(cd "$(dirname "$FILE")" && pwd)/$(basename "$FILE")"
FILE_NAME="$(basename "$FILE")"

checksum="$(verify_sha256_file "$FILE")"
case "$checksum" in
  ok) log_info "sha256 confere." ;;
  sem-checksum) log_warn "arquivo sem .sha256; integridade não verificada por checksum." ;;
  *) log_error "sha256 NÃO confere com $FILE.sha256. Abortando."; exit 1 ;;
esac
if ! "$PG_RESTORE" --list "$FILE" >/dev/null; then
  log_error "pg_restore --list falhou: arquivo ilegível."
  exit 1
fi

MANIFEST="${FILE%.dump}.manifest.json"
if [[ -f "$MANIFEST" ]]; then
  B_CREATED="$(manifest_get "$MANIFEST" created_at)"
  B_TYPE="$(manifest_get "$MANIFEST" type)"
  B_REASON="$(manifest_get "$MANIFEST" reason)"
  B_APP="$(manifest_get "$MANIFEST" app_version)"
  B_DB="$(manifest_get "$MANIFEST" db)"
  [[ "$B_REASON" == "null" ]] && B_REASON=""
else
  B_CREATED="$(date -u -d "@$(stat -c %Y "$FILE")" '+%Y-%m-%dT%H:%M:%SZ')"
  B_TYPE="legado (sem manifesto)"
  B_REASON=""
  B_APP="desconhecida"
  B_DB=""
fi
CUR_APP="$(get_app_version)"
B_EPOCH="$(date -u -d "$B_CREATED" +%s 2>/dev/null || stat -c %Y "$FILE")"
LOSS_HOURS="$(awk -v n="$(date +%s)" -v b="$B_EPOCH" 'BEGIN { printf "%.1f", (n - b) / 3600 }')"
B_LOCAL="$(date -d "@$B_EPOCH" '+%d/%m/%Y %H:%M:%S')"

RESTORE_DB="${TARGET_DB}_restore_${TS}"
OLD_NEW_DB="${TARGET_DB}_old_${TS}"

echo
echo "===================== RESTORE ====================="
echo "Arquivo:              $FILE"
echo "Data do backup:       $B_LOCAL"
echo "Tipo / motivo:        $B_TYPE / ${B_REASON:--}"
echo "Base de origem:       ${B_DB:--}"
echo "Versão app (backup):  ${B_APP:-desconhecida}"
echo "Versão app (atual):   $CUR_APP"
if [[ "${B_APP:-desconhecida}" != "$CUR_APP" ]]; then
  echo "AVISO: a versão da aplicação no backup difere da publicada. Avalie publicar a"
  echo "       versão correspondente ou rodar as migrations após o restore."
fi
echo "JANELA DE PERDA:      $LOSS_HOURS horas (dados gravados após $B_LOCAL serão perdidos em $TARGET_DB)"
echo "Base alvo:            $TARGET_DB  (atual será mantida como $OLD_NEW_DB)"
echo "Processo PM2:         $PM2_PROC  (ficará parado durante a troca)"
echo "==================================================="
echo

if [[ -z "$CONFIRM" ]]; then
  if [[ -t 0 ]]; then
    read -r -p "Para confirmar, digite o nome exato do arquivo ($FILE_NAME): " CONFIRM
  else
    log_error "sem TTY: informe --confirm $FILE_NAME."
    write_log "restore" "$FILE_NAME" "" "cancelado" "sem confirmação"
    exit 1
  fi
fi
if [[ "$CONFIRM" != "$FILE_NAME" ]]; then
  log_error "confirmação não confere com o nome do arquivo. Nada foi alterado."
  write_log "restore" "$FILE_NAME" "" "cancelado" "confirmação não confere"
  exit 1
fi

if db_exists "$RESTORE_DB" || db_exists "$OLD_NEW_DB"; then
  log_error "$RESTORE_DB ou $OLD_NEW_DB já existe; tente novamente em alguns segundos."
  exit 1
fi

fail_before_swap() {
  local msg="$1"
  log_error "$msg"
  drop_db "$RESTORE_DB"
  write_log "restore" "$FILE_NAME" "" "falha" "$msg (produção intacta)" "$RESTORE_DB"
  send_alert "FALHA no restore de $TARGET_DB" \
    "O restore de $FILE_NAME em $TARGET_DB falhou antes da troca: $msg. A base $TARGET_DB não foi alterada."
  exit 1
}

# 5. Restore em base temporária
log_info "criando base temporária $RESTORE_DB"
OWNER_SQL=""
[[ -n "$RESTORE_DB_OWNER" ]] && OWNER_SQL=" OWNER \"$RESTORE_DB_OWNER\""
if ! psql_admin -c "CREATE DATABASE \"$RESTORE_DB\"$OWNER_SQL"; then
  log_error "não foi possível criar $RESTORE_DB."
  write_log "restore" "$FILE_NAME" "" "falha" "CREATE DATABASE falhou (produção intacta)"
  send_alert "FALHA no restore de $TARGET_DB" "Não foi possível criar $RESTORE_DB. A base $TARGET_DB não foi alterada."
  exit 1
fi

RESTORE_ARGS=(-U "$RESTORE_PGUSER" -d "$RESTORE_DB" -j "$RESTORE_JOBS" --no-owner)
[[ -n "$RESTORE_DB_OWNER" ]] && RESTORE_ARGS+=("--role=$RESTORE_DB_OWNER")
log_info "pg_restore -j $RESTORE_JOBS --no-owner ${RESTORE_DB_OWNER:+--role=$RESTORE_DB_OWNER} -> $RESTORE_DB"
if ! "$PG_RESTORE" "${RESTORE_ARGS[@]}" "$FILE"; then
  fail_before_swap "pg_restore terminou com erro"
fi

# 6. Validação
if ! RESTORED_TABLES="$(count_public_tables "$RESTORE_DB")"; then
  fail_before_swap "não foi possível contar tabelas em $RESTORE_DB"
fi
TARGET_TABLES="$(count_public_tables "$TARGET_DB" || echo '?')"
log_info "tabelas em public: $TARGET_DB (atual) = $TARGET_TABLES; $RESTORE_DB (restaurada) = $RESTORED_TABLES"
if [[ ! "$RESTORED_TABLES" =~ ^[0-9]+$ ]] || (( RESTORED_TABLES == 0 )); then
  fail_before_swap "base restaurada não tem tabelas em public"
fi

# 7. Backup de segurança da base atual (herda o lock)
log_info "backup de segurança (pre-restore) de $TARGET_DB"
if ! "$SCRIPT_DIR/backup-db.sh" --type pre-restore --reason "pre-restore de $FILE_NAME" --db "$TARGET_DB"; then
  fail_before_swap "backup pre-restore de $TARGET_DB falhou"
fi

# 8. Troca
rc=0
swap_databases "$OLD_NEW_DB" "$RESTORE_DB" || rc=$?
if [[ "$rc" -ne 0 ]]; then
  result="falha-revertida"
  if [[ "$rc" -eq 3 ]]; then
    result="falha-rollback-incompleto"
  else
    drop_db "$RESTORE_DB"
  fi
  write_log "restore" "$FILE_NAME" "" "$result" "$SWAP_ERROR" "$RESTORE_DB"
  send_alert "FALHA no restore de $TARGET_DB" \
    "O restore de $FILE_NAME em $TARGET_DB falhou durante a troca: $SWAP_ERROR. Resultado: $result. Verifique o servidor."
  exit 1
fi

# 9. Log
write_log "restore" "$FILE_NAME" "$OLD_NEW_DB" "sucesso" "tabelas public: antes=$TARGET_TABLES depois=$RESTORED_TABLES" "$RESTORE_DB"

# 10. Undo
log_info "OK — $FILE_NAME restaurado em $TARGET_DB."
echo
echo "A base anterior foi mantida como $OLD_NEW_DB e NÃO é apagada automaticamente."
echo "Para desfazer este restore:"
echo "  $SCRIPT_DIR/restore-db.sh --undo --target-db $TARGET_DB --old-db $OLD_NEW_DB"
echo
exit 0
