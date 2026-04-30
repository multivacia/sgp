#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:?Usage: ec2-remote-deploy.sh <app_dir> <release_dir>}"
RELEASE_DIR="${2:?Usage: ec2-remote-deploy.sh <app_dir> <release_dir>}"

CURRENT_LINK="${APP_DIR}/current"
SHARED_DIR="${APP_DIR}/shared"
SERVER_DIR="${RELEASE_DIR}/server"
SERVER_ENV_FILE="${SHARED_DIR}/server.env"

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
sudo systemctl is-active --quiet sgp-api.service

curl -fsS --max-time 10 "http://127.0.0.1:3333/api/v1/health" >/dev/null
curl -fsS --max-time 10 "http://127.0.0.1/" >/dev/null

echo "Deploy completed: ${RELEASE_DIR}"
