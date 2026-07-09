# Deploy de homologacao isolada na HostGator VPS

Este runbook documenta apenas o ambiente de homologacao isolado do SGP+ Web na mesma VPS HostGator, sem alterar o workflow de producao existente (`.github/workflows/deploy-hostgator-vps.yml`).

## Arquivos versionados desta entrega

- `.github/workflows/deploy-hostgator-vps-homol.yml`
- `deploy/nginx/sgp-homol.conf.example`
- `docs/deploy-hostgator-homologacao.md`

## Objetivo operacional

Publicar a branch `homol` em um ambiente isolado com:

- app dir: `/opt/sgp/sgp-homol`
- web dir: `/var/www/sgp-homol`
- PM2: `sgp-api-homol`
- porta backend: `4001`
- banco: `sgp_homol`
- origem CORS: `https://sgp-homol.multivacia.com`
- marcador explicito: `APP_ENV=homologation`
- `NODE_ENV=production`

## Guardrails obrigatorios

Homologacao nunca pode apontar para nenhum destes alvos de producao:

- `PGDATABASE=sgp_prod`
- `/opt/sgp/sgp-main`
- `/var/www/sgp-web`
- PM2 `sgp-api`
- porta `4000`
- `https://sgp.multivacia.com`

Homologacao deve usar valores dedicados para:

- `JWT_SECRET`
- `PRODUCTION_JWT_SECRET`
- `AUTH_COOKIE_NAME`
- `PRODUCTION_AUTH_COOKIE_NAME`
- `PRODUCTION_KIOSK_TOKEN`
- `HEALTH_INFRA_TOKEN` (recomendado; minimo 32 caracteres)
- credenciais de banco e qualquer token adicional

## Trigger e secrets do workflow

Workflow: `.github/workflows/deploy-hostgator-vps-homol.yml`

Triggers:

- `push` em `homol`
- `workflow_dispatch` (somente com ref `homol`; o workflow falha fora dessa ref)

Secrets obrigatorios no GitHub Actions:

- `HML_VPS_HOST`
- `HML_VPS_PORT`
- `HML_VPS_USER`
- `HML_VPS_SSH_KEY`
- `HML_VPS_KNOWN_HOSTS`

Envs fixos versionados no workflow:

- `DEPLOY_BRANCH=homol`
- `REMOTE_APP_DIR=/opt/sgp/sgp-homol`
- `REMOTE_WEB_DIR=/var/www/sgp-homol`
- `HEALTH_URL=https://sgp-homol.multivacia.com/api/v1/health`
- `APP_ENV=homologation`
- `EXPECTED_PM2_PROCESS=sgp-api-homol`
- `EXPECTED_PORT=4001`
- `EXPECTED_PGDATABASE=sgp_homol`
- `EXPECTED_CORS_ORIGIN=https://sgp-homol.multivacia.com`

O workflow nao roda migrations automaticamente.

## Preparacao da VPS

Substitua `<deploy-user>` pelo usuario real de deploy e ajuste apenas o que for necessario para o host.

### 1) Banco de homologacao

Validar se o banco ja existe:

```bash
sudo -u postgres psql -tAc "SELECT datname FROM pg_database WHERE datname = 'sgp_homol';"
```

Criar usuario e banco dedicados (exemplo):

```bash
sudo -u postgres psql <<'SQL'
CREATE USER sgp_homol_user WITH PASSWORD 'CHANGE_ME_HML_ONLY';
CREATE DATABASE sgp_homol OWNER sgp_homol_user;
GRANT ALL PRIVILEGES ON DATABASE sgp_homol TO sgp_homol_user;
SQL
```

Smoke check de conexao:

```bash
PGPASSWORD='CHANGE_ME_HML_ONLY' psql -h 127.0.0.1 -U sgp_homol_user -d sgp_homol -c "select current_database(), current_user;"
```

### 2) Diretorios isolados

Criar diretorios oficiais:

```bash
sudo mkdir -p /opt/sgp/sgp-homol
sudo mkdir -p /var/www/sgp-homol
sudo mkdir -p /opt/sgp/backups
sudo chown -R <deploy-user>:<deploy-user> /opt/sgp/sgp-homol /var/www/sgp-homol /opt/sgp/backups
```

Se o clone ainda nao existir:

```bash
sudo -u <deploy-user> git clone <repo-url> /opt/sgp/sgp-homol
cd /opt/sgp/sgp-homol
git checkout homol
```

Validacoes minimas:

```bash
test -d /opt/sgp/sgp-homol
test -d /var/www/sgp-homol
readlink -f /opt/sgp/sgp-homol
readlink -f /var/www/sgp-homol
test "$(readlink -f /opt/sgp/sgp-homol)" != "/opt/sgp/sgp-main"
test "$(readlink -f /var/www/sgp-homol)" != "/var/www/sgp-web"
```

Os `realpath` finais devem continuar em:

- `/opt/sgp/sgp-homol`
- `/var/www/sgp-homol`

### 3) Arquivo raiz `.env`

Arquivo: `/opt/sgp/sgp-homol/.env`

Para deploy publicado no mesmo dominio, o padrao mais seguro e manter a API same-origin:

```dotenv
VITE_API_BASE_URL=
VITE_SUPPORT_TICKETS_ENABLED=0
VITE_PRODUCTION_KIOSK_TOKEN=CHANGE_ME_HML_KIOSK_TOKEN
```

Se optar por preencher `VITE_API_BASE_URL`, use somente:

```dotenv
VITE_API_BASE_URL=https://sgp-homol.multivacia.com/api
```

Nunca usar:

```dotenv
VITE_API_BASE_URL=https://sgp.multivacia.com/api
```

### 4) Arquivo do backend `server/.env`

Arquivo: `/opt/sgp/sgp-homol/server/.env`

Minimo obrigatorio para homologacao:

```dotenv
NODE_ENV=production
APP_ENV=homologation
PORT=4001
CORS_ORIGIN=https://sgp-homol.multivacia.com
LOG_LEVEL=info

AUTH_COOKIE_NAME=sgp_hml_auth
JWT_SECRET=CHANGE_ME_HML_JWT_SECRET_16_PLUS

PRODUCTION_AUTH_COOKIE_NAME=sgp_hml_production_auth
PRODUCTION_JWT_SECRET=CHANGE_ME_HML_PRODUCTION_JWT_SECRET_16_PLUS
PRODUCTION_KIOSK_TOKEN=CHANGE_ME_HML_KIOSK_TOKEN
HEALTH_INFRA_TOKEN=CHANGE_ME_HML_HEALTH_TOKEN_WITH_32_PLUS

PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=sgp_homol
PGUSER=sgp_homol_user
PGPASSWORD=CHANGE_ME_HML_DB_PASSWORD

DOCUMENT_DRAFT_ADAPTER=local
```

Se houver `DATABASE_URL`, ele tambem deve apontar para `sgp_homol`. Mesmo nesse caso, mantenha `PGDATABASE=sgp_homol` no arquivo para a validacao de guardrail do workflow.

Nunca usar em `server/.env` de HML:

```dotenv
PGDATABASE=sgp_prod
PORT=4000
CORS_ORIGIN=https://sgp.multivacia.com
AUTH_COOKIE_NAME=sgp_auth
PRODUCTION_AUTH_COOKIE_NAME=sgp_production_auth
```

## Nginx

Template versionado:

- `deploy/nginx/sgp-homol.conf.example`

Copiar para o host:

```bash
sudo cp /opt/sgp/sgp-homol/deploy/nginx/sgp-homol.conf.example /etc/nginx/conf.d/sgp-homol.conf
sudo nginx -t
sudo systemctl reload nginx
```

Validacoes:

```bash
sudo nginx -t
curl -I http://sgp-homol.multivacia.com/
curl -I http://sgp-homol.multivacia.com/api/v1/health
```

O template deve permanecer com:

- `server_name sgp-homol.multivacia.com`
- `root /var/www/sgp-homol`
- `proxy_pass http://127.0.0.1:4001/api/;`
- `try_files $uri $uri/ /index.html;`

## Certbot / TLS

Depois de validar o site HTTP:

```bash
sudo certbot --nginx -d sgp-homol.multivacia.com
sudo certbot renew --dry-run
```

Observacao: instale o pacote do Certbot compativel com o sistema operacional da VPS antes de executar os comandos acima.

## PM2

O processo oficial de homologacao e:

```text
sgp-api-homol
```

O processo de producao `sgp-api` nao pode ser reiniciado nem reutilizado por HML.

Bootstrap manual compativel com o projeto:

```bash
cd /opt/sgp/sgp-homol
npm ci
npm --prefix server ci
npm --prefix server run build
npm run build
pm2 start npm --name sgp-api-homol --cwd /opt/sgp/sgp-homol/server -- start
pm2 save
```

Quando o processo ja existir:

```bash
pm2 restart sgp-api-homol --update-env
pm2 save
```

Inspecao:

```bash
pm2 describe sgp-api-homol
pm2 logs sgp-api-homol --lines 100
pm2 status
```

## Smoke checks

### Na VPS

```bash
cd /opt/sgp/sgp-homol
git branch --show-current
git rev-parse --show-toplevel
test -f server/.env
test -f .env
curl -fsS http://127.0.0.1:4001/api/v1/health
ss -ltnp | rg ':4001 '
pm2 describe sgp-api-homol
```

### Pelo dominio

```bash
curl -I https://sgp-homol.multivacia.com/
curl -fsS https://sgp-homol.multivacia.com/api/v1/health
```

### Pelo GitHub Actions

Executar o workflow:

- `.github/workflows/deploy-hostgator-vps-homol.yml`

Espera-se:

- validacao local dos secrets e envs de HML
- validacao remota de `server/.env` e `.env`
- `npm ci`
- `npm --prefix server ci`
- `npm --prefix server run build`
- `npm run build`
- `pm2 restart sgp-api-homol --update-env` ou bootstrap com `pm2 start npm --name sgp-api-homol --cwd /opt/sgp/sgp-homol/server -- start`
- `pm2 save`
- health check final em `https://sgp-homol.multivacia.com/api/v1/health`

## Rollback

O rollback de HML nao pode tocar em diretorios ou processos de producao.

1. Identificar um commit estavel anterior:

```bash
cd /opt/sgp/sgp-homol
git log --oneline -5
```

2. Voltar para o commit desejado:

```bash
cd /opt/sgp/sgp-homol
git fetch origin homol
git checkout homol
git reset --hard <commit-estavel>
```

3. Rebuild e republicacao:

```bash
cd /opt/sgp/sgp-homol
npm ci
npm --prefix server ci
npm --prefix server run build
npm run build
rsync -a --delete dist/ /var/www/sgp-homol/
pm2 restart sgp-api-homol --update-env
pm2 save
```

4. Se necessario, restaurar backup do frontend gerado pelo workflow:

```bash
rsync -a --delete /opt/sgp/backups/frontend-homol-before-deploy-<timestamp>/ /var/www/sgp-homol/
```

5. Revalidar:

```bash
curl -fsS http://127.0.0.1:4001/api/v1/health
curl -fsS https://sgp-homol.multivacia.com/api/v1/health
pm2 describe sgp-api-homol
```

## Checklist final de isolamento

- [ ] Banco usado por HML eh `sgp_homol`
- [ ] `PORT=4001`
- [ ] PM2 usado por HML eh `sgp-api-homol`
- [ ] app dir eh `/opt/sgp/sgp-homol`
- [ ] web dir eh `/var/www/sgp-homol`
- [ ] `APP_ENV=homologation`
- [ ] `NODE_ENV=production`
- [ ] cookies, JWTs, tokens e credenciais de banco sao dedicados ao ambiente HML
- [ ] nenhum arquivo `.env` aponta para `sgp_prod`, `sgp-api`, `4000`, `/opt/sgp/sgp-main`, `/var/www/sgp-web` ou `https://sgp.multivacia.com`
