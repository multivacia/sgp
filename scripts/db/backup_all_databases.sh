#!/usr/bin/env bash
# Backup lógico completo do cluster PostgreSQL via pg_dumpall (globals + todas as databases).
#
# Gera um único ficheiro plain SQL com timestamp. Não sobrescreve ficheiros existentes.
# Credenciais: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGSSLMODE, e/ou ~/.pgpass
# Ver docs/backup-bases.md
#
# Não apaga backups antigos. Não executa restore.
#
# Variáveis opcionais:
#   BACKUP_OUTPUT_DIR   — diretório de saída (predef.: diretório atual)
#   BACKUP_FILE_PREFIX   — prefixo opcional do nome do ficheiro
#   BACKUP_HOST_LABEL    — segmento host/ambiente no nome do ficheiro
#   BACKUP_ENV_LABEL     — se BACKUP_HOST_LABEL vazio, usa isto; senão PGHOST; senão cluster
#
# Uso:
#   export PGHOST=localhost PGPORT=5432 PGUSER=postgres
#   ./backup_all_databases.sh
#   BACKUP_OUTPUT_DIR=/var/backups/pg BACKUP_ENV_LABEL=hml ./backup_all_databases.sh

set -euo pipefail

if ! command -v pg_dumpall >/dev/null 2>&1; then
  echo "[backup_all_databases] ERRO: pg_dumpall não encontrado no PATH." >&2
  echo "Instale o cliente PostgreSQL e garanta que o diretório bin está no PATH." >&2
  exit 1
fi

OUTPUT_DIR="${BACKUP_OUTPUT_DIR:-.}"
FILE_PREFIX="${BACKUP_FILE_PREFIX:-}"
HOST_LABEL="${BACKUP_HOST_LABEL:-}"
ENV_LABEL="${BACKUP_ENV_LABEL:-}"

sanitize_label() {
  local raw="${1:-cluster}"
  printf '%s' "$raw" | tr -cs 'a-zA-Z0-9._-' '_' | cut -c1-64
}

if [[ -z "$HOST_LABEL" ]]; then
  if [[ -n "$ENV_LABEL" ]]; then
    HOST_LABEL="$ENV_LABEL"
  elif [[ -n "${PGHOST:-}" ]]; then
    HOST_LABEL="$PGHOST"
  else
    HOST_LABEL="cluster"
  fi
fi
LABEL="$(sanitize_label "$HOST_LABEL")"
PREFIX="$FILE_PREFIX"

mkdir -p "$OUTPUT_DIR"

TS="$(date +%Y%m%d_%H%M%S)"
BASE="${PREFIX}backup_all_databases_${LABEL}_${TS}.sql"
OUT_FILE="$OUTPUT_DIR/$BASE"
N=0
while [[ -e "$OUT_FILE" ]]; do
  N=$((N + 1))
  BASE="${PREFIX}backup_all_databases_${LABEL}_${TS}_${N}.sql"
  OUT_FILE="$OUTPUT_DIR/$BASE"
done

echo "[backup_all_databases] pg_dumpall: $(command -v pg_dumpall)"
echo "[backup_all_databases] PGHOST=${PGHOST:-} PGPORT=${PGPORT:-} PGUSER=${PGUSER:-}"
echo "[backup_all_databases] Saída: $OUT_FILE"

set +e
pg_dumpall -f "$OUT_FILE"
RC=$?
set -e
if [[ "$RC" -ne 0 ]]; then
  echo "[backup_all_databases] ERRO: pg_dumpall terminou com código $RC." >&2
  exit "$RC"
fi

SIZE=$(wc -c <"$OUT_FILE" | tr -d ' ')
if [[ "${SIZE:-0}" -eq 0 ]]; then
  echo "[backup_all_databases] ERRO: ficheiro gerado tem tamanho 0 bytes." >&2
  exit 1
fi

FULLPATH="$(cd "$(dirname "$OUT_FILE")" && pwd)/$(basename "$OUT_FILE")"
echo "[backup_all_databases] OK — ficheiro: $FULLPATH ($SIZE bytes)"
