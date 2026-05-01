#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:?Usage: ec2-remote-deploy.sh <app_dir> <release_dir>}"
RELEASE_DIR="${2:?Usage: ec2-remote-deploy.sh <app_dir> <release_dir>}"

CURRENT_LINK="${APP_DIR}/current"
SHARED_DIR="${APP_DIR}/shared"
SERVER_DIR="${RELEASE_DIR}/server"
SERVER_ENV_FILE="${SHARED_DIR}/server.env"

wait_for_health() {
  local url="$1"
  local attempts="${2:-30}"
  local sleep_seconds="${3:-2}"

  echo "Checking SGP API health at ${url}"

  for i in $(seq 1 "${attempts}"); do
    if curl -fsS "${url}" >/dev/null; then
      echo "SGP API health OK"
      return 0
    fi

    echo "Health check attempt ${i}/${attempts} failed; waiting ${sleep_seconds}s..."
    sleep "${sleep_seconds}"
  done

  echo "ERROR: SGP API health check failed after ${attempts} attempts"
  sudo systemctl status sgp-api.service -l --no-pager || true
  sudo journalctl -u sgp-api.service -n 80 --no-pager || true
  return 1
}

if [ ! -f "${SERVER_ENV_FILE}" ]; then
  echo "Missing required env file: ${SERVER_ENV_FILE}"
  exit 1
fi

ln -sfn "${SERVER_ENV_FILE}" "${SERVER_DIR}/.env"

cd "${SERVER_DIR}"
npm ci --omit=dev --no-audit --no-fund

if [ "${MIGRATE_ON_DEPLOY:-0}" = "1" ]; then
  node dist/scripts/migrate.js
fi

ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"

sudo systemctl restart sgp-api.service

SGP_API_PORT="${SGP_API_PORT:-3334}"
SGP_HEALTH_PATH="${SGP_HEALTH_PATH:-/api/v1/health}"
SGP_HEALTH_URL="http://127.0.0.1:${SGP_API_PORT}${SGP_HEALTH_PATH}"

wait_for_health "${SGP_HEALTH_URL}" 30 2

if ! curl -fsS http://127.0.0.1/ >/dev/null; then
  echo "WARN: frontend/nginx health check failed. API deploy succeeded."
fi

echo "Deploy completed: ${RELEASE_DIR}"