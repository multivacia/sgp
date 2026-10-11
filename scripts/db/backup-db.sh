#!/usr/bin/env bash
# Backup lógico de uma base PostgreSQL do SGP+ (pg_dump -Fc), com globals,
# manifesto JSON e checksum sha256.
#
# Uso:
#   backup-db.sh --type daily|adhoc|pre-restore [--reason "<texto>"] [--db <nome>]
#
#   --type    daily       -> $BACKUP_ROOT/local/  (retenção DAILY_RETENTION_DAYS)
#             adhoc       -> $BACKUP_ROOT/adhoc/  (retenção ADHOC_RETENTION_DAYS; 0 = nunca apagar)
#             pre-restore -> $BACKUP_ROOT/adhoc/  (idem adhoc; usado por restore-db.sh)
#   --reason  obrigatório para adhoc e pre-restore
#   --db      base a copiar (padrão: BACKUP_DB)
#
# Conjunto gerado (nome base <db>_<type>_<YYYYMMDD_HHMMSS>[_N], nunca sobrescreve):
#   <base>.dump  <base>.globals.sql  <base>.manifest.json  <base>.dump.sha256
#
# Configuração: /opt/sgp/backup.env ou SGP_BACKUP_CONFIG (ver backup.env.example).
# Credenciais: ~/.pgpass do usuário que executa (role BACKUP_PGUSER).
# A retenção apaga somente conjuntos com o padrão de nome deste script; nunca
# toca em outros arquivos (ex.: .dump do backup-sgp.sh legado, frontend-*).
#
# Ver docs/runbooks/backup-restore-postgresql.md

set -euo pipefail

SGP_LOG_TAG="backup-db"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/backup-common.sh
source "$SCRIPT_DIR/lib/backup-common.sh"

usage() {
  sed -n '5,13p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

TYPE=""
REASON=""
DB=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --type) TYPE="${2:-}"; shift 2 ;;
    --reason) REASON="${2:-}"; shift 2 ;;
    --db) DB="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) log_error "argumento desconhecido: $1"; usage >&2; exit 2 ;;
  esac
done

case "$TYPE" in
  daily|adhoc|pre-restore) ;;
  *) log_error "--type deve ser daily, adhoc ou pre-restore."; usage >&2; exit 2 ;;
esac

if [[ "$TYPE" != "daily" && -z "${REASON// /}" ]]; then
  log_error "--reason é obrigatório para --type $TYPE."
  exit 2
fi

load_config
DB="${DB:-$BACKUP_DB}"
validate_db_name "$DB"

umask 077

# Estado para limpeza em caso de falha.
TMP_FILES=()
DONE=0

# shellcheck disable=SC2329  # chamada via trap EXIT
cleanup() {
  local rc=$?
  local f
  for f in "${TMP_FILES[@]+"${TMP_FILES[@]}"}"; do
    [[ -n "$f" && -e "$f" ]] && rm -f -- "$f"
  done
  if [[ "$DONE" -ne 1 ]]; then
    [[ "$rc" -eq 0 ]] && rc=1
    log_error "backup de $DB ($TYPE) falhou (código $rc)."
    send_alert "FALHA no backup $TYPE de $DB" \
      "O backup $TYPE da base $DB falhou (código $rc). Motivo informado: ${REASON:--}. Verifique o log do cron/execução."
  fi
  exit "$rc"
}
trap cleanup EXIT

acquire_lock
resolve_pg_bins

if [[ -n "$BACKUP_PGUSER" ]]; then
  export PGUSER="$BACKUP_PGUSER"
fi

check_pg_dump_version "$DB"
SERVER_VERSION="$(pg_server_version "$DB")"
PG_DUMP_VERSION="$("$PG_DUMP" --version | head -n1)"

if [[ "$TYPE" == "daily" ]]; then
  DEST_DIR="$BACKUP_ROOT/local"
  RETENTION_DAYS="$DAILY_RETENTION_DAYS"
else
  DEST_DIR="$BACKUP_ROOT/adhoc"
  RETENTION_DAYS="$ADHOC_RETENTION_DAYS"
fi
mkdir -p "$DEST_DIR"

TS="$(date +%Y%m%d_%H%M%S)"
BASE="${DB}_${TYPE}_${TS}"
N=0
set_exists() {
  local b="$1" ext
  for ext in dump globals.sql manifest.json dump.sha256; do
    [[ -e "$DEST_DIR/$b.$ext" || -e "$DEST_DIR/.$b.$ext.tmp" ]] && return 0
  done
  return 1
}
while set_exists "$BASE"; do
  N=$((N + 1))
  BASE="${DB}_${TYPE}_${TS}_${N}"
done

DUMP_FILE="$DEST_DIR/$BASE.dump"
GLOBALS_FILE="$DEST_DIR/$BASE.globals.sql"
MANIFEST_FILE="$DEST_DIR/$BASE.manifest.json"
SHA_FILE="$DEST_DIR/$BASE.dump.sha256"

TMP_DUMP="$DEST_DIR/.$BASE.dump.tmp"
TMP_GLOBALS="$DEST_DIR/.$BASE.globals.sql.tmp"
TMP_MANIFEST="$DEST_DIR/.$BASE.manifest.json.tmp"
TMP_SHA="$DEST_DIR/.$BASE.dump.sha256.tmp"
TMP_FILES=("$TMP_DUMP" "$TMP_GLOBALS" "$TMP_MANIFEST" "$TMP_SHA")

log_info "base: $DB  tipo: $TYPE  destino: $DUMP_FILE"
log_info "servidor: $PGHOST:$PGPORT  usuário: ${PGUSER:-$(id -un)}"

# 1. Dump da base
if ! "$PG_DUMP" -Fc -d "$DB" -f "$TMP_DUMP"; then
  log_error "pg_dump terminou com erro."
  exit 1
fi
SIZE_BYTES="$(wc -c <"$TMP_DUMP" | tr -d ' ')"
if [[ "${SIZE_BYTES:-0}" -eq 0 ]]; then
  log_error "arquivo gerado tem 0 bytes."
  exit 1
fi
if ! "$PG_RESTORE" --list "$TMP_DUMP" >/dev/null; then
  log_error "pg_restore --list falhou: dump ilegível."
  exit 1
fi

# 2. Globals (roles). Sem permissão em pg_authid -> --no-role-passwords -> sem globals.
GLOBALS="missing"
if "$PG_DUMPALL" --globals-only -f "$TMP_GLOBALS" 2>/dev/null; then
  GLOBALS="full"
elif "$PG_DUMPALL" --globals-only --no-role-passwords -f "$TMP_GLOBALS" 2>/dev/null; then
  GLOBALS="no-passwords"
  log_warn "globals gerados sem senhas de roles (--no-role-passwords)."
else
  rm -f -- "$TMP_GLOBALS"
  log_warn "não foi possível gerar globals (pg_dumpall --globals-only); seguindo sem globals."
fi

# 3. Checksum e manifesto
SHA256="$(sha256_of "$TMP_DUMP")"
printf '%s  %s\n' "$SHA256" "$BASE.dump" >"$TMP_SHA"

APP_VERSION="$(get_app_version)"
CREATED_AT="$(utc_now_iso)"
OPERATOR="$(operator_name)"
REASON_JSON="null"
if [[ -n "$REASON" ]]; then
  REASON_JSON="\"$(json_escape "$REASON")\""
fi

cat >"$TMP_MANIFEST" <<EOF
{
  "file": "$(json_escape "$BASE.dump")",
  "db": "$(json_escape "$DB")",
  "type": "$(json_escape "$TYPE")",
  "reason": $REASON_JSON,
  "operator": "$(json_escape "$OPERATOR")",
  "created_at": "$CREATED_AT",
  "server_version": "$(json_escape "$SERVER_VERSION")",
  "pg_dump_version": "$(json_escape "$PG_DUMP_VERSION")",
  "app_version": "$(json_escape "$APP_VERSION")",
  "size_bytes": $SIZE_BYTES,
  "sha256": "$SHA256",
  "globals": "$GLOBALS"
}
EOF

# 4. Publica o conjunto (renomeações atômicas no mesmo diretório)
mv -n -- "$TMP_DUMP" "$DUMP_FILE"
if [[ "$GLOBALS" != "missing" ]]; then
  mv -n -- "$TMP_GLOBALS" "$GLOBALS_FILE"
fi
mv -n -- "$TMP_SHA" "$SHA_FILE"
mv -n -- "$TMP_MANIFEST" "$MANIFEST_FILE"
DONE=1

log_info "OK — $DUMP_FILE ($SIZE_BYTES bytes, sha256 $SHA256, globals: $GLOBALS)"

# 5. Retenção (somente conjuntos deste script, do tipo correspondente, no diretório de destino)
apply_retention() {
  local days="$1" dir="$2" types_regex="$3"
  local cutoff f name base set_ts set_type
  local -A bases=()
  if [[ "$days" -eq 0 ]]; then
    log_info "retenção desativada em $dir (0 = nunca apagar)."
    return 0
  fi
  cutoff="$(date -d "-$days days" +%Y%m%d%H%M%S)"
  for f in "$dir"/*; do
    [[ -f "$f" ]] || continue
    name="$(basename "$f")"
    case "$name" in
      *.dump.sha256) base="${name%.dump.sha256}" ;;
      *.globals.sql) base="${name%.globals.sql}" ;;
      *.manifest.json) base="${name%.manifest.json}" ;;
      *.dump) base="${name%.dump}" ;;
      *) continue ;;
    esac
    [[ "$base" =~ $SGP_SET_BASE_REGEX ]] || continue
    set_type="${BASH_REMATCH[2]}"
    set_ts="${BASH_REMATCH[3]}${BASH_REMATCH[4]}"
    [[ "$set_type" =~ ^($types_regex)$ ]] || continue
    if [[ "$set_ts" < "$cutoff" ]]; then
      bases["$base"]=1
    fi
  done
  for base in "${!bases[@]}"; do
    log_info "retenção: removendo conjunto $base (mais de $days dias)."
    rm -f -- "$dir/$base.dump" "$dir/$base.globals.sql" "$dir/$base.manifest.json" "$dir/$base.dump.sha256"
  done
  return 0
}

if [[ "$TYPE" == "daily" ]]; then
  apply_retention "$RETENTION_DAYS" "$DEST_DIR" 'daily' || log_warn "falha ao aplicar retenção."
else
  apply_retention "$RETENTION_DAYS" "$DEST_DIR" 'adhoc|pre-restore' || log_warn "falha ao aplicar retenção."
fi

exit 0
