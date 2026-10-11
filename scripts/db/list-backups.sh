#!/usr/bin/env bash
# Lista os backups PostgreSQL do SGP+ em $BACKUP_ROOT/local/ e $BACKUP_ROOT/adhoc/.
#
# Uso:
#   list-backups.sh [--json]
#
# Para cada .dump mostra: data, tipo, base, tamanho, versão da app, motivo e
# checksum (ok | falhou | sem-checksum). Arquivos .dump sem manifesto (ex.: do
# backup-sgp.sh legado) aparecem com tipo "legado".
#   --json  imprime um array JSON (para uso pela Fase 2).
#
# Somente leitura: não apaga nem altera arquivos e não usa o lock.
# Configuração: /opt/sgp/backup.env ou SGP_BACKUP_CONFIG (ver backup.env.example).
#
# Ver docs/runbooks/backup-restore-postgresql.md

set -euo pipefail

SGP_LOG_TAG="list-backups"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/backup-common.sh
source "$SCRIPT_DIR/lib/backup-common.sh"

usage() {
  sed -n '4,10p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

JSON=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --json) JSON=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) log_error "argumento desconhecido: $1"; usage >&2; exit 2 ;;
  esac
done

# Mensagens de configuração vão para stderr; não poluem o JSON.
load_config

human_size() {
  awk -v b="$1" 'BEGIN {
    split("B KB MB GB TB", u, " "); i = 1
    while (b >= 1024 && i < 5) { b /= 1024; i++ }
    if (i == 1) printf "%d %s", b, u[i]; else printf "%.1f %s", b, u[i]
  }'
}

# Registros (separador 0x1F): sort_key, dir, path, file, created_at, type, db, size, app_version, reason, checksum, legacy, globals
ROWS=()

for sub in local adhoc; do
  dir="$BACKUP_ROOT/$sub"
  [[ -d "$dir" ]] || continue
  for f in "$dir"/*.dump; do
    [[ -f "$f" ]] || continue
    name="$(basename "$f")"
    base="${name%.dump}"
    manifest="$dir/$base.manifest.json"
    size="$(wc -c <"$f" | tr -d ' ')"
    checksum="$(verify_sha256_file "$f")"
    globals="missing"
    [[ -f "$dir/$base.globals.sql" ]] && globals="presente"
    if [[ -f "$manifest" ]]; then
      legacy="false"
      created="$(manifest_get "$manifest" created_at)"
      type="$(manifest_get "$manifest" type)"
      db="$(manifest_get "$manifest" db)"
      app="$(manifest_get "$manifest" app_version)"
      reason="$(manifest_get "$manifest" reason)"
      g="$(manifest_get "$manifest" globals)"
      [[ -n "$g" ]] && globals="$g"
    else
      legacy="true"
      created="$(date -u -d "@$(stat -c %Y "$f")" '+%Y-%m-%dT%H:%M:%SZ')"
      type="legado"
      db=""
      app=""
      reason=""
    fi
    [[ "$reason" == "null" ]] && reason=""
    sort_key="$(date -u -d "$created" +%s 2>/dev/null || stat -c %Y "$f")"
    reason="${reason//$'\n'/ }"
    app="${app//$'\n'/ }"
    ROWS+=("$(printf '%s\x1f' "$sort_key" "$sub" "$f" "$name" "$created" "$type" "$db" "$size" "$app" "$reason" "$checksum" "$legacy" "$globals")")
  done
done

SORTED=()
if [[ ${#ROWS[@]} -gt 0 ]]; then
  mapfile -t SORTED < <(printf '%s\n' "${ROWS[@]}" | sort -t $'\x1f' -k1,1nr)
fi

if [[ "$JSON" -eq 1 ]]; then
  printf '['
  first=1
  for row in "${SORTED[@]+"${SORTED[@]}"}"; do
    IFS=$'\x1f' read -r _ sub path name created type db size app reason checksum legacy globals <<<"$row"
    [[ "$first" -eq 1 ]] || printf ','
    first=0
    printf '\n  {"file":"%s","path":"%s","dir":"%s","created_at":"%s","type":"%s","db":%s,"size_bytes":%s,"app_version":%s,"reason":%s,"checksum":"%s","legacy":%s,"globals":"%s"}' \
      "$(json_escape "$name")" "$(json_escape "$path")" "$sub" "$(json_escape "$created")" "$(json_escape "$type")" \
      "$([[ -n "$db" ]] && printf '"%s"' "$(json_escape "$db")" || printf 'null')" \
      "$size" \
      "$([[ -n "$app" ]] && printf '"%s"' "$(json_escape "$app")" || printf 'null')" \
      "$([[ -n "$reason" ]] && printf '"%s"' "$(json_escape "$reason")" || printf 'null')" \
      "$checksum" "$legacy" "$(json_escape "$globals")"
  done
  [[ "$first" -eq 1 ]] || printf '\n'
  printf ']\n'
  exit 0
fi

if [[ ${#SORTED[@]} -eq 0 ]]; then
  echo "Nenhum backup encontrado em $BACKUP_ROOT/local nem $BACKUP_ROOT/adhoc."
  exit 0
fi

# "VERSÃO" tem um caractere multibyte: largura +1 para alinhar.
printf '%-19s  %-11s  %-12s  %10s  %-23s  %-12s  %-30s  %s\n' \
  "DATA" "TIPO" "BASE" "TAMANHO" "VERSÃO DA APP" "CHECKSUM" "MOTIVO" "ARQUIVO"
for row in "${SORTED[@]}"; do
  IFS=$'\x1f' read -r _ sub path name created type db size app reason checksum legacy globals <<<"$row"
  when="$(date -d "$created" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || printf '%s' "$created")"
  printf '%-19s  %-11s  %-12s  %10s  %-22s  %-12s  %-30s  %s\n' \
    "$when" "$type" "${db:--}" "$(human_size "$size")" "${app:--}" "$checksum" "${reason:--}" "$sub/$name"
done
