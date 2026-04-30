# SGP + ARGOS na EC2 (deploy automatizado)

Este documento define o fluxo de deploy para demo/sprint sem alterar regra de negocio.

## O que foi adicionado

- Workflow GitHub Actions: `.github/workflows/deploy-ec2.yml`
- Script remoto de deploy: `scripts/deploy/ec2-remote-deploy.sh`
- Template systemd: `deploy/systemd/sgp-api.service.example`
- Template nginx: `deploy/nginx/sgp.conf.example`

## Segredos GitHub obrigatorios

- `EC2_HOST`
- `EC2_USER`
- `EC2_SSH_KEY`
- `EC2_APP_DIR` (ex.: `/opt/sgp`)
- Opcional: `DEPLOY_ENV`

## Layout esperado na EC2

- `${EC2_APP_DIR}/releases/<release-id>`
- `${EC2_APP_DIR}/current` (symlink para release ativo)
- `${EC2_APP_DIR}/shared/server.env` (arquivo real de ambiente do backend)

## Envs obrigatorias do backend (`shared/server.env`)

- `NODE_ENV=production`
- `PORT=3333`
- `DATABASE_URL` **ou** `PGHOST`/`PGPORT`/`PGDATABASE`/`PGUSER`/`PGPASSWORD`
- `JWT_SECRET`
- `AUTH_COOKIE_NAME`
- `CORS_ORIGIN`
- `LOG_LEVEL`

Integracao ARGOS na mesma EC2:

- `ARGOS_BASE_URL=http://127.0.0.1:8080`
- `ARGOS_CONVEYOR_HEALTH_ANALYZE_PATH=/api/v1/specialists/conveyor-health/analyze`
- `ARGOS_HEALTH_TIMEOUT_MS=120000` (ajustavel)
- `ARGOS_HEALTH_ENABLED=true`
- `ARGOS_INGEST_TOKEN` (quando exigido no gateway)

## Workflow de deploy (resumo)

1. Checkout
2. Setup Node
3. `npm ci` (frontend) e `npm ci --prefix server` (backend)
4. Build backend (`npm run server:build`)
5. Build frontend (`npm run build`)
6. Empacota artefatos (`dist`, `server/dist`, `server/migrations`)
7. SCP para EC2
8. Executa script remoto:
   - valida env
   - instala deps runtime do backend
   - roda migration se `migrate_on_deploy=1`
   - troca symlink `current`
   - restart `sgp-api.service`
   - health check backend e frontend local

## Config systemd (alvo)

Base em `deploy/systemd/sgp-api.service.example`:

- `WorkingDirectory=/opt/sgp/current/server`
- `EnvironmentFile=/opt/sgp/shared/server.env`
- `ExecStart=/usr/bin/node /opt/sgp/current/server/dist/server.js`
- `Restart=always`

Se Node vier de NVM, usar caminho absoluto do binario (ex.: `/home/ec2-user/.nvm/versions/node/v22.x.x/bin/node`).

## Config nginx (alvo)

Base em `deploy/nginx/sgp.conf.example`:

- Frontend servido de `/opt/sgp/current/frontend-dist`
- `location ^~ /api/` para proxy em `http://127.0.0.1:3333`
- `try_files` para SPA
- `client_max_body_size 20m` (ajuste conforme necessidade)

## ARGOS gateway na mesma EC2

Recomendado:

- gateway ARGOS via service separado (ex.: `argos-gateway.service`) na `:8080`
- sem exposicao publica do ARGOS
- validar conectividade local no host:
  - `curl -fsS http://127.0.0.1:8080/health` (ou endpoint equivalente do ARGOS)

## Validacao rapida pos-deploy

- Backend SGP: `curl -fsS http://127.0.0.1:3333/api/v1/health`
- Frontend via nginx: `curl -fsS http://127.0.0.1/`
- Service SGP: `sudo systemctl status sgp-api.service --no-pager`

## Observacoes de seguranca

- Nao commitar `.env` real.
- Nao imprimir secrets nos logs.
- Migration automatica fica opt-in no workflow (`migrate_on_deploy`).
