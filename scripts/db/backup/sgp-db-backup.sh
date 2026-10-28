#!/usr/bin/env bash
# SGP+ — backup e restore da base de produção (VPS).
#
# Uso:
#   sgp-db-backup.sh --reason scheduled|manual|pre-deploy|pre-restore
#   sgp-db-backup.sh --restore <arquivo.dump>
#   sgp-db-backup.sh --retention-plan    (lê nomes de arquivo na entrada padrão; não toca em nada)
#
# Backup (--reason):
#   - pg_dump -Fc da base da aplicação e pg_dumpall --globals-only (roles, sem senhas);
#   - valida o dump com pg_restore --list e grava o SHA-256 de cada arquivo em <arquivo>.sha256;
#   - aplica a retenção (abaixo) e registra uma linha JSON por execução no log.
#
# Restore (--restore), usado pela tela Backups:
#   1. confere o SHA-256 do arquivo escolhido;
#   2. faz backup de segurança com motivo pre-restore (sem aplicar retenção). Se falhar, sai com 3 e a base não é tocada;
#   3. pg_restore --clean --if-exists --single-transaction (sem as entradas de extensão, que já existem na base),
#      executado pelo psql com ON_ERROR_STOP e lock_timeout (padrão 120000 ms). Se falhar (inclusive por tempo
#      limite de bloqueio), a transação é desfeita e sai com 4;
#   4. não executa migrations.
#
# Credenciais: lidas do mesmo arquivo .env usado pela API (DATABASE_URL ou PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD).
# A senha só vai para a variável de ambiente PGPASSWORD do processo; nunca em log nem em linha de comando.
#
# Variáveis de ambiente (opcionais):
#   SGP_SERVER_ENV_FILE  arquivo .env da API         (padrão: /opt/sgp/sgp-main/server/.env)
#   SGP_BACKUP_DIR       diretório dos backups        (padrão: /opt/sgp/backups/db)
#   SGP_BACKUP_LOG       log JSONL das execuções      (padrão: $SGP_BACKUP_DIR/backup-log.jsonl)
#   SGP_BACKUP_TZ        fuso do nome dos arquivos    (padrão: America/Sao_Paulo)
#   SGP_PG_BIN_DIR       diretório com pg_dump/pg_restore compatíveis com o servidor (opcional)
#   SGP_RESTORE_LOCK_TIMEOUT_MS  lock_timeout do pg_restore no --restore (padrão: 120000; usado nos testes
#                                com valor menor). Não afeta o backup.
#
# Nome dos arquivos: sgp_<AAAAMMDD-HHMMSS>_<motivo>.dump e sgp_<AAAAMMDD-HHMMSS>_<motivo>.globals.sql
# (data e hora de São Paulo).
#
# Retenção (aplicada depois de cada backup bem-sucedido, exceto o pre-restore):
#   - diários: todos os backups dos 7 dias mais recentes que têm backup (qualquer motivo,
#     inclusive pre-deploy e pre-restore);
#   - semanais: o último backup de cada um dos 4 domingos mais recentes que têm backup;
#   - mensais: o último backup de cada um dos 3 dias 1 mais recentes que têm backup;
#   - o resto é apagado. Arquivos com outro padrão de nome nunca são apagados.
#   Os dias contam só datas com backup: se o agendamento parar, os últimos backups não são apagados.
#
# Trava: flock em $SGP_BACKUP_DIR/.sgp-db-backup.lock. Nunca dois backups ou restores ao mesmo tempo.
#
# Saída padrão: "LOCK_ACQUIRED" quando a trava é obtida; "PHASE <fase>" e "PRE_RESTORE_BACKUP <arquivo>"
# durante o restore.
#
# Códigos de saída: 0 ok; 1 falha; 2 uso inválido; 3 backup de segurança falhou (restore não executado);
#                   4 pg_restore falhou (transação desfeita); 75 trava ocupada.

set -euo pipefail
umask 027

BACKUP_DIR="${SGP_BACKUP_DIR:-/opt/sgp/backups/db}"
LOG_FILE="${SGP_BACKUP_LOG:-$BACKUP_DIR/backup-log.jsonl}"
ENV_FILE="${SGP_SERVER_ENV_FILE:-/opt/sgp/sgp-main/server/.env}"
LOCK_FILE="$BACKUP_DIR/.sgp-db-backup.lock"
BACKUP_TZ="${SGP_BACKUP_TZ:-America/Sao_Paulo}"
if [[ -n "${SGP_PG_BIN_DIR:-}" ]]; then
  PATH="$SGP_PG_BIN_DIR:$PATH"
fi
RESTORE_LOCK_TIMEOUT_MS="${SGP_RESTORE_LOCK_TIMEOUT_MS:-120000}"

KEEP_DAILY=7
KEEP_WEEKLY=4
KEEP_MONTHLY=3

REASON_RE='^(scheduled|manual|pre-deploy|pre-restore)$'
NAME_RE='^sgp_[0-9]{8}-[0-9]{6}_(scheduled|manual|pre-deploy|pre-restore)\.(dump|globals\.sql)$'
DUMP_RE='^sgp_[0-9]{8}-[0-9]{6}_(scheduled|manual|pre-deploy|pre-restore)\.dump$'

LAST_BACKUP_DUMP=""
LAST_ERROR=""

usage() {
  sed -n '2,8p' "$0" 2>/dev/null || true
}

now_iso() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

json_escape() {
  local s=$1
  s=${s//\\/\\\\}
  s=${s//\"/\\\"}
  s=${s//$'\n'/\\n}
  s=${s//$'\r'/\\r}
  s=${s//$'\t'/\\t}
  printf '%s' "$s" | tr -d '\000-\010\013\014\016-\037'
}

json_str_or_null() {
  if [[ -z $1 ]]; then
    printf 'null'
  else
    printf '"%s"' "$(json_escape "$1")"
  fi
}

ensure_log_file() {
  if [[ ! -e $LOG_FILE ]]; then
    : >"$LOG_FILE"
    # O usuário de cópia (grupo do diretório) precisa acrescentar a confirmação.
    chmod 660 "$LOG_FILE"
  fi
}

append_log() {
  ensure_log_file
  printf '%s\n' "$1" >>"$LOG_FILE"
}

err_tail() {
  # Últimas linhas de erro de uma ferramenta, em uma linha só.
  tail -n 5 "$1" 2>/dev/null | tr '\n' ' ' | sed 's/[[:space:]]*$//'
}

# ---------------------------------------------------------------------------
# Credenciais
# ---------------------------------------------------------------------------

ENV_VALUE=""

read_env_value() {
  local key=$1 line val found=1
  ENV_VALUE=""
  while IFS= read -r line || [[ -n $line ]]; do
    line=${line%$'\r'}
    [[ $line =~ ^[[:space:]]*(export[[:space:]]+)?${key}[[:space:]]*=(.*)$ ]] || continue
    val=${BASH_REMATCH[2]}
    val="${val#"${val%%[![:space:]]*}"}"
    if [[ $val == \"* ]]; then
      val=${val#\"}
      val=${val%%\"*}
    elif [[ $val == \'* ]]; then
      val=${val#\'}
      val=${val%%\'*}
    else
      val=${val%%[[:space:]]#*}
      val="${val%"${val##*[![:space:]]}"}"
    fi
    ENV_VALUE=$val
    found=0
  done <"$ENV_FILE"
  return $found
}

url_decode() {
  printf '%b' "${1//%/\\x}"
}

load_db_env() {
  unset DATABASE_URL PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD PGSSLMODE
  if [[ ! -r $ENV_FILE ]]; then
    LAST_ERROR="Arquivo de configuração da API não encontrado ou sem permissão de leitura: $ENV_FILE"
    return 1
  fi

  local url=""
  if read_env_value DATABASE_URL && [[ -n $ENV_VALUE ]]; then
    url=$ENV_VALUE
  fi

  if [[ -n $url ]]; then
    local re='^postgres(ql)?://([^:@/]+)(:([^@]*))?@([^:/?]+)(:([0-9]+))?/([^?]+)(\?(.*))?$'
    if [[ ! $url =~ $re ]]; then
      LAST_ERROR="DATABASE_URL em formato não suportado pelo script de backup."
      return 1
    fi
    PGUSER=$(url_decode "${BASH_REMATCH[2]}")
    PGPASSWORD=$(url_decode "${BASH_REMATCH[4]}")
    PGHOST=${BASH_REMATCH[5]}
    PGPORT=${BASH_REMATCH[7]:-5432}
    PGDATABASE=$(url_decode "${BASH_REMATCH[8]}")
    local query=${BASH_REMATCH[10]}
    if [[ $query =~ (^|&)sslmode=([^&]+) ]]; then
      PGSSLMODE=${BASH_REMATCH[2]}
      export PGSSLMODE
    fi
  else
    local key missing=""
    for key in PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD; do
      if read_env_value "$key" && [[ -n $ENV_VALUE ]]; then
        printf -v "$key" '%s' "$ENV_VALUE"
      else
        missing="$missing $key"
      fi
    done
    if [[ -n $missing ]]; then
      LAST_ERROR="Credenciais do banco incompletas em $ENV_FILE (faltando:$missing)."
      return 1
    fi
    if read_env_value PGSSLMODE && [[ -n $ENV_VALUE ]]; then
      PGSSLMODE=$ENV_VALUE
      export PGSSLMODE
    fi
  fi
  export PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD
}

# ---------------------------------------------------------------------------
# Retenção
# ---------------------------------------------------------------------------

day_of_week() {
  local d=$1
  TZ=UTC date -d "${d:0:4}-${d:4:2}-${d:6:2}" +%u
}

# Entrada: nomes de arquivo (um por linha). Saída: "keep <nome>", "delete <nome>" ou "ignore <nome>".
retention_plan() {
  local -a names=() dates=() sets_desc=()
  local -A set_date=() latest_of_date=() keep_set=()
  local name set d count

  while IFS= read -r name || [[ -n $name ]]; do
    [[ -z $name ]] && continue
    names+=("$name")
    if [[ $name =~ $NAME_RE ]]; then
      set=${name%%.*}
      set_date[$set]=${set:4:8}
    fi
  done

  if ((${#set_date[@]} > 0)); then
    mapfile -t sets_desc < <(printf '%s\n' "${!set_date[@]}" | sort -r)
    mapfile -t dates < <(printf '%s\n' "${set_date[@]}" | sort -ru)

    for set in "${sets_desc[@]}"; do
      d=${set_date[$set]}
      [[ -z ${latest_of_date[$d]:-} ]] && latest_of_date[$d]=$set
    done

    # Diários: todos os backups dos KEEP_DAILY dias mais recentes com backup.
    local -A daily_date=()
    count=0
    for d in "${dates[@]}"; do
      ((count < KEEP_DAILY)) || break
      daily_date[$d]=1
      count=$((count + 1))
    done
    for set in "${sets_desc[@]}"; do
      [[ -n ${daily_date[${set_date[$set]}]:-} ]] && keep_set[$set]=1
    done

    # Semanais: último backup dos KEEP_WEEKLY domingos mais recentes com backup.
    count=0
    for d in "${dates[@]}"; do
      ((count < KEEP_WEEKLY)) || break
      if [[ $(day_of_week "$d") == 7 ]]; then
        keep_set[${latest_of_date[$d]}]=1
        count=$((count + 1))
      fi
    done

    # Mensais: último backup dos KEEP_MONTHLY dias 1 mais recentes com backup.
    count=0
    for d in "${dates[@]}"; do
      ((count < KEEP_MONTHLY)) || break
      if [[ ${d:6:2} == 01 ]]; then
        keep_set[${latest_of_date[$d]}]=1
        count=$((count + 1))
      fi
    done
  fi

  for name in "${names[@]}"; do
    if [[ $name =~ $NAME_RE ]]; then
      set=${name%%.*}
      if [[ -n ${keep_set[$set]:-} ]]; then
        printf 'keep %s\n' "$name"
      else
        printf 'delete %s\n' "$name"
      fi
    else
      printf 'ignore %s\n' "$name"
    fi
  done
}

prune_backups() {
  local plan action name deleted_json="" started
  started=$(now_iso)
  plan=$(find "$BACKUP_DIR" -maxdepth 1 -type f -printf '%f\n' | retention_plan)
  while read -r action name; do
    [[ $action == delete ]] || continue
    rm -f -- "${BACKUP_DIR:?}/$name" "${BACKUP_DIR:?}/$name.sha256"
    deleted_json+="${deleted_json:+,}\"$(json_escape "$name")\""
  done <<<"$plan"
  if [[ -n $deleted_json ]]; then
    append_log "{\"event\":\"prune\",\"status\":\"success\",\"startedAt\":\"$started\",\"finishedAt\":\"$(now_iso)\",\"deleted\":[$deleted_json]}"
  fi
}

# ---------------------------------------------------------------------------
# Backup
# ---------------------------------------------------------------------------

log_backup_failure() {
  local reason=$1 started=$2
  append_log "{\"event\":\"backup\",\"status\":\"failure\",\"reason\":\"$reason\",\"startedAt\":\"$started\",\"finishedAt\":\"$(now_iso)\",\"database\":$(json_str_or_null "${PGDATABASE:-}"),\"files\":[],\"errorMessage\":$(json_str_or_null "$LAST_ERROR")}"
}

# do_backup <motivo> <aplicar retenção: yes|no>
do_backup() {
  local reason=$1 prune=$2 started stamp base tries=0
  local dump globals tmp_dump tmp_globals errf sha_dump sha_globals size_dump size_globals
  started=$(now_iso)
  LAST_BACKUP_DUMP=""

  if ! load_db_env; then
    log_backup_failure "$reason" "$started"
    return 1
  fi

  while :; do
    stamp=$(TZ="$BACKUP_TZ" date +%Y%m%d-%H%M%S)
    base="sgp_${stamp}_${reason}"
    [[ -e "$BACKUP_DIR/$base.dump" || -e "$BACKUP_DIR/$base.globals.sql" ]] || break
    tries=$((tries + 1))
    if ((tries > 5)); then
      LAST_ERROR="Não foi possível gerar um nome de arquivo único."
      log_backup_failure "$reason" "$started"
      return 1
    fi
    sleep 1
  done

  dump="$base.dump"
  globals="$base.globals.sql"
  tmp_dump="$BACKUP_DIR/.$dump.partial"
  tmp_globals="$BACKUP_DIR/.$globals.partial"
  errf=$(mktemp "$BACKUP_DIR/.err.XXXXXX")

  local ok=1
  if ! pg_dump -Fc --file="$tmp_dump" 2>"$errf"; then
    LAST_ERROR="pg_dump falhou: $(err_tail "$errf")"
    ok=0
  elif ! pg_restore --list "$tmp_dump" >/dev/null 2>"$errf"; then
    LAST_ERROR="Dump gerado é inválido (pg_restore --list): $(err_tail "$errf")"
    ok=0
  elif ! pg_dumpall --globals-only --no-role-passwords --database="$PGDATABASE" --file="$tmp_globals" 2>"$errf"; then
    LAST_ERROR="pg_dumpall --globals-only falhou: $(err_tail "$errf")"
    ok=0
  fi
  rm -f -- "$errf"

  if ((ok == 0)); then
    rm -f -- "$tmp_dump" "$tmp_globals"
    log_backup_failure "$reason" "$started"
    return 1
  fi

  mv -- "$tmp_dump" "$BACKUP_DIR/$dump"
  mv -- "$tmp_globals" "$BACKUP_DIR/$globals"
  chmod 640 "$BACKUP_DIR/$dump" "$BACKUP_DIR/$globals"

  sha_dump=$(cd "$BACKUP_DIR" && sha256sum -- "$dump" | tee "$dump.sha256" | cut -d' ' -f1)
  sha_globals=$(cd "$BACKUP_DIR" && sha256sum -- "$globals" | tee "$globals.sha256" | cut -d' ' -f1)
  chmod 640 "$BACKUP_DIR/$dump.sha256" "$BACKUP_DIR/$globals.sha256"
  size_dump=$(stat -c %s "$BACKUP_DIR/$dump")
  size_globals=$(stat -c %s "$BACKUP_DIR/$globals")

  append_log "{\"event\":\"backup\",\"status\":\"success\",\"reason\":\"$reason\",\"startedAt\":\"$started\",\"finishedAt\":\"$(now_iso)\",\"database\":$(json_str_or_null "$PGDATABASE"),\"files\":[{\"name\":\"$dump\",\"sizeBytes\":$size_dump,\"sha256\":\"$sha_dump\"},{\"name\":\"$globals\",\"sizeBytes\":$size_globals,\"sha256\":\"$sha_globals\"}],\"errorMessage\":null}"
  LAST_BACKUP_DUMP=$dump

  if [[ $prune == yes ]]; then
    prune_backups
  fi
  return 0
}

# ---------------------------------------------------------------------------
# Restore
# ---------------------------------------------------------------------------

log_restore() {
  local status=$1 file=$2 started=$3 pre=$4
  append_log "{\"event\":\"restore\",\"status\":\"$status\",\"file\":$(json_str_or_null "$file"),\"preRestoreBackup\":$(json_str_or_null "$pre"),\"startedAt\":\"$started\",\"finishedAt\":\"$(now_iso)\",\"database\":$(json_str_or_null "${PGDATABASE:-}"),\"errorMessage\":$(json_str_or_null "$LAST_ERROR")}"
}

do_restore() {
  local file=$1 started expected actual errf listf
  started=$(now_iso)

  if [[ ! $file =~ $DUMP_RE || ! -f "$BACKUP_DIR/$file" || -L "$BACKUP_DIR/$file" || ! -f "$BACKUP_DIR/$file.sha256" ]]; then
    LAST_ERROR="Arquivo de backup inválido ou inexistente: $file"
    log_restore failure "$file" "$started" ""
    return 1
  fi
  expected=$(cut -d' ' -f1 <"$BACKUP_DIR/$file.sha256")
  actual=$(sha256sum -- "$BACKUP_DIR/$file" | cut -d' ' -f1)
  if [[ $expected != "$actual" ]]; then
    LAST_ERROR="SHA-256 do arquivo não confere com o registrado. Restore cancelado; a base não foi alterada."
    log_restore failure "$file" "$started" ""
    return 1
  fi

  echo "PHASE pre-restore-backup"
  if ! do_backup pre-restore no; then
    LAST_ERROR="Backup de segurança falhou; a base não foi alterada. Detalhe: $LAST_ERROR"
    log_restore failure "$file" "$started" ""
    return 3
  fi
  local pre=$LAST_BACKUP_DUMP
  echo "PRE_RESTORE_BACKUP $pre"

  echo "PHASE restore"
  errf=$(mktemp "$BACKUP_DIR/.err.XXXXXX")
  listf=$(mktemp "$BACKUP_DIR/.list.XXXXXX")
  # Extensões (uuid-ossp, pgcrypto) já existem na base e costumam pertencer ao superusuário:
  # ficam fora do restore para que o usuário da aplicação consiga executar o --clean.
  if ! pg_restore --list "$BACKUP_DIR/$file" 2>"$errf" |
    grep -v -E '^[0-9]+; [0-9]+ [0-9]+ (EXTENSION|COMMENT - EXTENSION) ' >"$listf"; then
    LAST_ERROR="Não foi possível ler o conteúdo do backup; a base não foi alterada. Detalhe: $(err_tail "$errf")"
    rm -f -- "$errf" "$listf"
    log_restore failure "$file" "$started" "$pre"
    return 4
  fi
  # lock_timeout só no restore: se uma sessão segurar bloqueio numa tabela, o restore desiste em vez de
  # esperar indefinidamente; a transação única é desfeita e a base fica intacta.
  # O dump traz "SET lock_timeout = 0;" no cabeçalho (anularia PGOPTIONS), por isso o SQL é gerado
  # com pg_restore -f -, essa primeira linha é trocada e o psql executa com ON_ERROR_STOP. O BEGIN/COMMIT
  # vem do --single-transaction: em erro o psql sai sem COMMIT e a transação é desfeita.
  # PGOPTIONS fica como reforço, caso o dump não traga a linha SET.
  if ! pg_restore --clean --if-exists --single-transaction --use-list="$listf" \
    --file=- "$BACKUP_DIR/$file" 2>"$errf" |
    sed "0,/^SET lock_timeout = 0;\$/s//SET lock_timeout = $RESTORE_LOCK_TIMEOUT_MS;/" |
    PGOPTIONS="-c lock_timeout=$RESTORE_LOCK_TIMEOUT_MS ${PGOPTIONS:-}" \
      psql -X -q -v ON_ERROR_STOP=1 --dbname="$PGDATABASE" >/dev/null 2>>"$errf"; then
    if grep -q 'lock timeout' "$errf"; then
      LAST_ERROR="pg_restore falhou: tempo limite de espera por bloqueio ($((RESTORE_LOCK_TIMEOUT_MS / 1000)) s) esgotado; outra sessão está usando a base. A transação foi desfeita e a base continua como estava. Detalhe: $(err_tail "$errf")"
    else
      LAST_ERROR="pg_restore falhou; a transação foi desfeita e a base continua como estava. Detalhe: $(err_tail "$errf")"
    fi
    rm -f -- "$errf" "$listf"
    log_restore failure "$file" "$started" "$pre"
    return 4
  fi
  rm -f -- "$errf" "$listf"
  LAST_ERROR=""
  log_restore success "$file" "$started" "$pre"
  return 0
}

# ---------------------------------------------------------------------------
# Principal
# ---------------------------------------------------------------------------

usage_error() {
  echo "Uso inválido. Veja o cabeçalho de $0." >&2
  exit 2
}

main() {
  local reason="" restore_file="" plan=0
  while (($# > 0)); do
    case $1 in
      --reason)
        (($# >= 2)) || usage_error
        reason=$2
        shift 2
        ;;
      --restore)
        (($# >= 2)) || usage_error
        restore_file=$2
        shift 2
        ;;
      --retention-plan)
        plan=1
        shift
        ;;
      -h | --help)
        usage
        exit 0
        ;;
      *) usage_error ;;
    esac
  done

  local modes=0
  [[ -n $reason ]] && modes=$((modes + 1))
  [[ -n $restore_file ]] && modes=$((modes + 1))
  ((plan == 1)) && modes=$((modes + 1))
  ((modes == 1)) || usage_error

  if ((plan == 1)); then
    retention_plan
    exit 0
  fi

  if [[ ! $RESTORE_LOCK_TIMEOUT_MS =~ ^[1-9][0-9]*$ ]]; then
    echo "SGP_RESTORE_LOCK_TIMEOUT_MS inválido: $RESTORE_LOCK_TIMEOUT_MS" >&2
    exit 2
  fi

  if [[ -n $reason && ! $reason =~ $REASON_RE ]]; then
    echo "Motivo inválido: $reason" >&2
    exit 2
  fi

  local tool
  for tool in pg_dump pg_dumpall pg_restore psql sha256sum flock; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      echo "Ferramenta não encontrada no PATH: $tool" >&2
      exit 1
    fi
  done

  if [[ ! -d $BACKUP_DIR ]]; then
    mkdir -p -- "$BACKUP_DIR"
  fi

  exec 9>>"$LOCK_FILE"
  # Timer, deploy e API podem rodar com usuários diferentes do mesmo grupo.
  chmod 660 "$LOCK_FILE" 2>/dev/null || true
  if ! flock -n 9; then
    echo "Já existe um backup ou restauração em andamento." >&2
    exit 75
  fi
  echo "LOCK_ACQUIRED"

  if [[ -n $restore_file ]]; then
    local rc=0
    do_restore "$restore_file" || rc=$?
    if ((rc != 0)); then
      echo "$LAST_ERROR" >&2
    fi
    exit "$rc"
  fi

  if ! do_backup "$reason" yes; then
    echo "$LAST_ERROR" >&2
    exit 1
  fi
  echo "Backup concluído: $LAST_BACKUP_DUMP"
}

main "$@"
