#!/usr/bin/env bash
# Funções compartilhadas pelos scripts de backup/restore do SGP+ (backup-db.sh,
# list-backups.sh, restore-db.sh). Não executar diretamente: usar `source`.
#
# Configuração: arquivo no formato de scripts/db/backup.env.example.
#   Padrão: /opt/sgp/backup.env (sobrescrevível por SGP_BACKUP_CONFIG).
#   Senhas NÃO ficam na configuração: usar ~/.pgpass (modo 600).
#
# Ver docs/runbooks/backup-restore-postgresql.md

# shellcheck disable=SC2034  # variáveis usadas pelos scripts que fazem `source`

if [[ -n "${SGP_BACKUP_COMMON_LOADED:-}" ]]; then
  return 0
fi
SGP_BACKUP_COMMON_LOADED=1

# Prefixo das mensagens; cada script define SGP_LOG_TAG antes do `source`.
SGP_LOG_TAG="${SGP_LOG_TAG:-sgp-backup}"

# Padrão de nome de base aceito (evita injeção em comandos SQL/arquivos).
SGP_DB_NAME_REGEX='^[a-z_][a-z0-9_]*$'

# Padrão de nome base dos conjuntos gerados por backup-db.sh:
#   <db>_<type>_<YYYYMMDD>_<HHMMSS>[_N]
SGP_SET_BASE_REGEX='^([a-z_][a-z0-9_]*)_(daily|adhoc|pre-restore)_([0-9]{8})_([0-9]{6})(_[0-9]+)?$'

# ---------------------------------------------------------------------------
# Log
# ---------------------------------------------------------------------------

log_ts() {
  date '+%Y-%m-%d %H:%M:%S'
}

log_info() {
  printf '%s [%s] %s\n' "$(log_ts)" "$SGP_LOG_TAG" "$*"
}

log_warn() {
  printf '%s [%s] AVISO: %s\n' "$(log_ts)" "$SGP_LOG_TAG" "$*" >&2
}

log_error() {
  printf '%s [%s] ERRO: %s\n' "$(log_ts)" "$SGP_LOG_TAG" "$*" >&2
}

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------

load_config() {
  local cfg="${SGP_BACKUP_CONFIG:-/opt/sgp/backup.env}"
  if [[ -f "$cfg" ]]; then
    # shellcheck disable=SC1090  # caminho definido em tempo de execução
    source "$cfg"
    SGP_BACKUP_CONFIG_USED="$cfg"
  elif [[ -n "${SGP_BACKUP_CONFIG:-}" ]]; then
    log_error "arquivo de configuração não encontrado: $cfg"
    return 1
  else
    log_warn "arquivo de configuração $cfg não encontrado; usando valores padrão."
    SGP_BACKUP_CONFIG_USED=""
  fi

  PG_BIN_DIR="${PG_BIN_DIR:-/usr/lib/postgresql/18/bin}"
  PGHOST="${PGHOST:-127.0.0.1}"
  PGPORT="${PGPORT:-5433}"
  BACKUP_PGUSER="${BACKUP_PGUSER:-}"
  RESTORE_PGUSER="${RESTORE_PGUSER:-postgres}"
  RESTORE_DB_OWNER="${RESTORE_DB_OWNER:-}"
  BACKUP_DB="${BACKUP_DB:-sgp_prod}"
  ALLOWED_TARGET_DBS="${ALLOWED_TARGET_DBS:-sgp_prod}"
  BACKUP_ROOT="${BACKUP_ROOT:-/opt/sgp/backups}"
  DAILY_RETENTION_DAYS="${DAILY_RETENTION_DAYS:-14}"
  ADHOC_RETENTION_DAYS="${ADHOC_RETENTION_DAYS:-90}"
  APP_DIR="${APP_DIR:-/opt/sgp/sgp-main}"
  VERSION_URL="${VERSION_URL:-}"
  HEALTH_URL="${HEALTH_URL:-}"
  HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-60}"
  PM2_PROCESS="${PM2_PROCESS:-sgp-api}"
  PM2_USER="${PM2_USER:-}"
  PM2_CMD="${PM2_CMD:-pm2}"
  MAINTENANCE_FLAG="${MAINTENANCE_FLAG:-}"
  RESTORE_JOBS="${RESTORE_JOBS:-2}"
  ALERT_EMAIL_TO="${ALERT_EMAIL_TO:-}"
  ALERT_EMAIL_FROM="${ALERT_EMAIL_FROM:-}"
  SENDMAIL_CMD="${SENDMAIL_CMD:-/usr/sbin/sendmail}"

  export PGHOST PGPORT

  local n
  for n in DAILY_RETENTION_DAYS ADHOC_RETENTION_DAYS RESTORE_JOBS HEALTH_TIMEOUT_SECONDS; do
    if [[ ! "${!n}" =~ ^[0-9]+$ ]]; then
      log_error "$n deve ser um número inteiro (valor: '${!n}')."
      return 1
    fi
  done
  return 0
}

# ---------------------------------------------------------------------------
# Binários PostgreSQL
# ---------------------------------------------------------------------------

# Resolve PG_DUMP, PG_DUMPALL, PG_RESTORE, PSQL a partir de PG_BIN_DIR.
resolve_pg_bins() {
  local name var path
  for name in pg_dump pg_dumpall pg_restore psql; do
    path="$PG_BIN_DIR/$name"
    if [[ ! -x "$path" ]]; then
      log_error "binário não encontrado ou sem permissão de execução: $path (verifique PG_BIN_DIR)."
      return 1
    fi
    var="$(printf '%s' "$name" | tr '[:lower:]' '[:upper:]')"
    printf -v "$var" '%s' "$path"
  done
  return 0
}

# Major de um binário cliente (ex.: "pg_dump (PostgreSQL) 18.1" -> 18).
pg_client_major() {
  "$1" --version | sed -nE 's/^[^0-9]*\) ([0-9]+).*/\1/p' | head -n1
}

# Versão do servidor (texto) e major. Usa a base informada (padrão: postgres).
pg_server_version() {
  "$PSQL" -X -A -t -v ON_ERROR_STOP=1 -d "${1:-postgres}" -c 'SHOW server_version' 2>/dev/null | head -n1 | awk '{print $1}'
}

pg_server_major() {
  local num
  num="$("$PSQL" -X -A -t -v ON_ERROR_STOP=1 -d "${1:-postgres}" -c 'SHOW server_version_num' | head -n1)"
  [[ "$num" =~ ^[0-9]+$ ]] || return 1
  printf '%s\n' $((num / 10000))
}

# Aborta se o major do pg_dump for menor que o do servidor.
check_pg_dump_version() {
  local db="${1:-postgres}" client server
  client="$(pg_client_major "$PG_DUMP")"
  if ! server="$(pg_server_major "$db")"; then
    log_error "não foi possível consultar a versão do servidor (base $db, $PGHOST:$PGPORT)."
    return 1
  fi
  if [[ -z "$client" ]]; then
    log_error "não foi possível identificar a versão de $PG_DUMP."
    return 1
  fi
  if (( client < server )); then
    log_error "pg_dump $client é mais antigo que o servidor PostgreSQL $server. Ajuste PG_BIN_DIR."
    return 1
  fi
  log_info "pg_dump major $client / servidor major $server: ok."
  return 0
}

# ---------------------------------------------------------------------------
# Lock (backup e restore não rodam juntos)
# ---------------------------------------------------------------------------
# Reentrância: o processo que obtém o lock exporta SGP_BACKUP_LOCK_HELD=<PID>.
# Um processo filho direto (PPID igual) herda o lock em vez de tentar obtê-lo
# de novo (evita deadlock do restore chamando backup-db.sh).

acquire_lock() {
  local lock_file="$BACKUP_ROOT/.sgp-backup.lock"
  if [[ -n "${SGP_BACKUP_LOCK_HELD:-}" && "${SGP_BACKUP_LOCK_HELD}" == "$PPID" ]]; then
    log_info "lock herdado do processo $PPID."
    return 0
  fi
  mkdir -p "$BACKUP_ROOT"
  exec 9>>"$lock_file"
  if ! flock -n 9; then
    log_error "outro backup/restore está em execução (lock $lock_file)."
    return 1
  fi
  SGP_BACKUP_LOCK_HELD="$$"
  export SGP_BACKUP_LOCK_HELD
  return 0
}

# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

sha256_of() {
  sha256sum "$1" | awk '{print $1}'
}

# Confere <arquivo> contra <arquivo>.sha256 (formato sha256sum).
# Saída: ok | falhou | sem-checksum
verify_sha256_file() {
  local file="$1" sumfile="$1.sha256" expected actual
  if [[ ! -f "$sumfile" ]]; then
    printf 'sem-checksum\n'
    return 0
  fi
  expected="$(awk 'NR==1{print $1}' "$sumfile")"
  actual="$(sha256_of "$file")"
  if [[ -n "$expected" && "$expected" == "$actual" ]]; then
    printf 'ok\n'
  else
    printf 'falhou\n'
  fi
}

validate_db_name() {
  local name="$1"
  if [[ ! "$name" =~ $SGP_DB_NAME_REGEX ]] || (( ${#name} > 63 )); then
    log_error "nome de base inválido: '$name' (permitido: ^[a-z_][a-z0-9_]*\$, até 63 caracteres)."
    return 1
  fi
  return 0
}

operator_name() {
  printf '%s\n' "${SUDO_USER:-$(id -un 2>/dev/null || echo desconhecido)}"
}

utc_now_iso() {
  date -u '+%Y-%m-%dT%H:%M:%SZ'
}

# Escapa texto para uso dentro de uma string JSON (sem as aspas externas).
json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  printf '%s' "$s" | tr -d '\000-\010\013\014\016-\037'
}

# Lê um campo string/número de um manifesto gerado por backup-db.sh.
# Usa jq quando disponível; senão, extração simples (um campo por linha).
manifest_get() {
  local file="$1" key="$2"
  if command -v jq >/dev/null 2>&1; then
    jq -r --arg k "$key" '.[$k] // empty | tostring' "$file" 2>/dev/null
  else
    local line val
    line="$(grep -m1 -E "^[[:space:]]*\"$key\"[[:space:]]*:" "$file" || true)"
    [[ -n "$line" ]] || return 0
    val="${line#*:}"
    val="$(printf '%s' "$val" | sed -E 's/^[[:space:]]+//; s/[[:space:]]*,?[[:space:]]*$//')"
    if [[ "$val" == \"*\" ]]; then
      val="${val#\"}"
      val="${val%\"}"
      printf '%s\n' "$val" | sed -E 's/\\n/ /g; s/\\(.)/\1/g'
    elif [[ "$val" != "null" ]]; then
      printf '%s\n' "$val"
    fi
  fi
}

# Versão da aplicação publicada: VERSION_URL -> git do APP_DIR -> desconhecida.
get_app_version() {
  local body ver commit sha
  if [[ -n "$VERSION_URL" ]] && command -v curl >/dev/null 2>&1; then
    if body="$(curl -fsS --max-time 5 "$VERSION_URL" 2>/dev/null)" && [[ -n "$body" ]]; then
      if command -v jq >/dev/null 2>&1; then
        ver="$(printf '%s' "$body" | jq -r '(.data // .).version // empty' 2>/dev/null || true)"
        commit="$(printf '%s' "$body" | jq -r '(.data // .).commit // empty' 2>/dev/null || true)"
      else
        ver="$(printf '%s' "$body" | sed -nE 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/p' | head -n1)"
        commit="$(printf '%s' "$body" | sed -nE 's/.*"commit"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/p' | head -n1)"
      fi
      if [[ -n "$ver" ]]; then
        if [[ -n "$commit" ]]; then
          printf '%s (%s)\n' "$ver" "$commit"
        else
          printf '%s\n' "$ver"
        fi
        return 0
      fi
    fi
  fi
  if [[ -n "$APP_DIR" && -d "$APP_DIR" ]] && command -v git >/dev/null 2>&1; then
    if sha="$(git -C "$APP_DIR" rev-parse --short HEAD 2>/dev/null)" && [[ -n "$sha" ]]; then
      printf 'git %s\n' "$sha"
      return 0
    fi
  fi
  printf 'desconhecida\n'
}

# Envia e-mail de alerta. Nunca falha: sem destino/MTA, só registra aviso.
send_alert() {
  local subject="$1" body="$2" from host
  if [[ -z "$ALERT_EMAIL_TO" ]]; then
    log_warn "ALERT_EMAIL_TO vazio; alerta não enviado: $subject"
    return 0
  fi
  if [[ ! -x "$SENDMAIL_CMD" ]]; then
    log_warn "SENDMAIL_CMD ($SENDMAIL_CMD) não encontrado; alerta não enviado: $subject"
    return 0
  fi
  host="$(hostname 2>/dev/null || echo servidor)"
  from="${ALERT_EMAIL_FROM:-sgp-backup@$host}"
  if ! {
    printf 'From: %s\n' "$from"
    printf 'To: %s\n' "$ALERT_EMAIL_TO"
    printf 'Subject: [SGP backup] %s\n' "$subject"
    printf 'Content-Type: text/plain; charset=UTF-8\n'
    printf '\n'
    printf '%s\n\n' "$body"
    printf 'Servidor: %s\nData: %s\n' "$host" "$(log_ts)"
  } | "$SENDMAIL_CMD" -t; then
    log_warn "falha ao enviar e-mail de alerta via $SENDMAIL_CMD."
  fi
  return 0
}
