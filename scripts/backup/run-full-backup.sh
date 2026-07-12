#!/usr/bin/env bash
# Executa backup FULL_LOGICAL do SGP+ (wrapper com lock e validação).
# Cron sugerido (não instalado automaticamente): 0 2 * * *
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOCK_FILE="${BACKUP_LOCK_FILE:-/tmp/sgp-full-backup.lock}"
LOG_PREFIX="[sgp-backup]"

cleanup() {
  if [[ -n "${LOCK_FD:-}" ]]; then
    flock -u "${LOCK_FD}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if [[ ! -d "${REPO_ROOT}/server" ]]; then
  echo "${LOG_PREFIX} diretório server não encontrado em ${REPO_ROOT}" >&2
  exit 2
fi

# Carrega server/.env se existir (sem exportar automaticamente tudo)
if [[ -f "${REPO_ROOT}/server/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${REPO_ROOT}/server/.env"
  set +a
fi

: "${BACKUP_ENABLED:=false}"
: "${BACKUP_DIRECTORY:=}"

if [[ "${BACKUP_ENABLED}" != "true" && "${BACKUP_ENABLED}" != "1" ]]; then
  echo "${LOG_PREFIX} BACKUP_ENABLED não está ativo; abortando." >&2
  exit 2
fi

if [[ -z "${BACKUP_DIRECTORY}" ]]; then
  echo "${LOG_PREFIX} BACKUP_DIRECTORY vazio; abortando." >&2
  exit 2
fi

exec {LOCK_FD}>"${LOCK_FILE}"
if ! flock -n "${LOCK_FD}"; then
  echo "${LOG_PREFIX} outro backup já está em execução (lock ${LOCK_FILE})." >&2
  exit 3
fi

echo "${LOG_PREFIX} iniciando backup FULL em $(date -u +%Y-%m-%dT%H:%M:%SZ)"
cd "${REPO_ROOT}"
npm --prefix server run backup:full
echo "${LOG_PREFIX} concluído em $(date -u +%Y-%m-%dT%H:%M:%SZ)"
