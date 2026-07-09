# Checklist operacional enxuto - HML na VPS HostGator

Este documento consolida o passo a passo operacional, em ordem exata, para subir a homologacao do SGP+ Web na mesma VPS **sem tocar na producao**.

> Importante
> - Nao executar tudo de uma vez.
> - Avancar bloco por bloco, validando o checkpoint antes de seguir.
> - Nao alterar o workflow de producao.
> - Nao rodar migrations automaticamente no workflow.
> - Nao copiar producao para HML nesta primeira etapa.

---

## 0) Pre-condicao de operacao

**Alvos oficiais da HML**

- app dir: `/opt/sgp/sgp-homol`
- web dir: `/var/www/sgp-homol`
- PM2: `sgp-api-homol`
- porta: `4001`
- banco: `sgp_homol`
- dominio: `sgp-homol.multivacia.com`
- env marker: `APP_ENV=homologation`
- runtime: `NODE_ENV=production`

**Nunca usar na HML**

- `/opt/sgp/sgp-main`
- `/var/www/sgp-web`
- `sgp-api`
- porta `4000`
- `PGDATABASE=sgp_prod`
- `https://sgp.multivacia.com`

**Checkpoint 0**

- Confirmar que todo mundo envolvido sabe que:
  - producao fica intacta
  - HML e outra instalacao
  - o workflow de HML nao roda migrations automaticamente

---

## 1) Conferencia inicial na VPS [LEITURA SOMENTE]

### 1.1 Validar usuario e contexto

```bash
whoami
hostname
pwd
```

**Esperado**

- `whoami` = `deploy`

### 1.2 Ver PM2 atual

```bash
pm2 status
pm2 describe sgp-api
```

**Esperado**

- `sgp-api` existe e esta online
- nenhum `sgp-api-homol` ainda, ou se existir, entender o estado antes de mexer

### 1.3 Confirmar producao preservada

```bash
ss -ltnp | rg ':4000 '
curl -fsS https://sgp.multivacia.com/api/v1/health
```

**Esperado**

- algo ouvindo na `4000`
- health de producao responde com sucesso

### 1.4 Descobrir PostgreSQL e porta real

```bash
sudo systemctl status postgresql --no-pager
sudo -u postgres psql -tAc "show port;"
ss -ltnp | rg ':(5432|5433) '
```

**Esperado**

- identificar a porta real do PostgreSQL local
- usar essa porta na HML
- nao assumir `5433` sem conferir

### 1.5 Conferir Nginx atual

```bash
sudo nginx -t
sudo rg -n "server_name|proxy_pass|root" /etc/nginx /etc/nginx/conf.d /etc/nginx/sites-enabled 2>/dev/null
```

**Esperado**

- configuracao atual valida
- identificar onde esta o server block de producao
- nao editar o bloco de producao

### 1.6 Conferir espaco em disco

```bash
df -h
du -sh /opt/sgp/sgp-main /var/www/sgp-web 2>/dev/null
```

**Esperado**

- espaco suficiente para:
  - novo checkout
  - novo build frontend
  - backups de frontend HML

### Checkpoint 1

So seguir se:

- `whoami = deploy`
- producao esta saudavel
- porta de producao `4000` esta preservada
- PostgreSQL e porta real foram identificados
- Nginx esta valido
- ha espaco em disco

---

## 2) DNS [ACAO EXTERNA + LEITURA]

### 2.1 Criar registro DNS

No provedor DNS, criar:

- `sgp-homol.multivacia.com -> IP publico da VPS`

Nao seguir para Certbot antes de propagar.

### 2.2 Validar DNS

```bash
dig +short sgp-homol.multivacia.com
nslookup sgp-homol.multivacia.com
```

**Esperado**

- resolver para o IP correto da VPS

### Checkpoint 2

So seguir se:

- `sgp-homol.multivacia.com` ja resolve para a VPS

---

## 3) Banco [ESCRITA CONTROLADA]

### 3.1 Validar que `sgp_homol` nao conflita com producao

```bash
sudo -u postgres psql -tAc "SELECT datname FROM pg_database WHERE datname IN ('sgp_homol','sgp_prod');"
```

**Esperado**

- enxergar claramente os nomes
- confirmar que HML sera criada como `sgp_homol`
- nao tocar em `sgp_prod`

### 3.2 Criar role propria

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE sgp_homol_user LOGIN PASSWORD 'CHANGE_ME_HML_ONLY';
SQL
```

### 3.3 Criar database propria

```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE sgp_homol OWNER sgp_homol_user;
GRANT ALL PRIVILEGES ON DATABASE sgp_homol TO sgp_homol_user;
SQL
```

### 3.4 Validar conexao no banco correto

```bash
PGPASSWORD='CHANGE_ME_HML_ONLY' psql -h 127.0.0.1 -p <PORTA_POSTGRES_REAL> -U sgp_homol_user -d sgp_homol -c "select current_database(), current_user;"
```

**Esperado**

- `current_database = sgp_homol`
- `current_user = sgp_homol_user`

### 3.5 Guardrail explicito

```bash
PGPASSWORD='CHANGE_ME_HML_ONLY' psql -h 127.0.0.1 -p <PORTA_POSTGRES_REAL> -U sgp_homol_user -d sgp_homol -c "select 'HML_OK' as env;"
```

**Nunca usar**

- `-d sgp_prod`

### Checkpoint 3

So seguir se:

- role `sgp_homol_user` existe
- banco `sgp_homol` existe
- conexao testada entra em `sgp_homol`
- nenhuma acao foi feita em `sgp_prod`

---

## 4) Diretorios [ESCRITA CONTROLADA]

### 4.1 Criar diretorios oficiais da HML

```bash
sudo mkdir -p /opt/sgp/sgp-homol
sudo mkdir -p /var/www/sgp-homol
sudo mkdir -p /opt/sgp/backups
sudo chown -R deploy:deploy /opt/sgp/sgp-homol /var/www/sgp-homol /opt/sgp/backups
```

### 4.2 Validar paths e ownership

```bash
test -d /opt/sgp/sgp-homol
test -d /var/www/sgp-homol
stat -c '%U:%G %n' /opt/sgp/sgp-homol /var/www/sgp-homol
readlink -f /opt/sgp/sgp-homol
readlink -f /var/www/sgp-homol
```

**Esperado**

- ownership `deploy:deploy`
- realpaths:
  - `/opt/sgp/sgp-homol`
  - `/var/www/sgp-homol`

### 4.3 Guardrails de path

```bash
test "$(readlink -f /opt/sgp/sgp-homol)" != "/opt/sgp/sgp-main"
test "$(readlink -f /var/www/sgp-homol)" != "/var/www/sgp-web"
```

### Checkpoint 4

So seguir se:

- diretorios existem
- pertencem a `deploy:deploy`
- nao apontam para paths de producao

---

## 5) Checkout e `.env` [ESCRITA CONTROLADA]

### 5.1 Garantir checkout isolado da HML

Se ainda nao existir clone:

```bash
sudo -u deploy git clone <REPO_URL> /opt/sgp/sgp-homol
cd /opt/sgp/sgp-homol
git checkout homol
```

Se ja existir:

```bash
cd /opt/sgp/sgp-homol
git status --short --branch
git remote -v
```

### 5.2 Criar `/opt/sgp/sgp-homol/server/.env`

Conteudo minimo:

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
PGPORT=<PORTA_POSTGRES_REAL>
PGDATABASE=sgp_homol
PGUSER=sgp_homol_user
PGPASSWORD=CHANGE_ME_HML_DB_PASSWORD

DOCUMENT_DRAFT_ADAPTER=local
SUPPORT_TICKETS_ENABLED=0
SUPPORT_EMAIL_ENABLED=0
SUPPORT_WHATSAPP_ENABLED=0
```

### 5.3 Criar `/opt/sgp/sgp-homol/.env`

**Recomendado:**

```dotenv
VITE_API_BASE_URL=
VITE_SUPPORT_TICKETS_ENABLED=0
VITE_PRODUCTION_KIOSK_TOKEN=CHANGE_ME_HML_KIOSK_TOKEN
```

**Se quiser preencher `VITE_API_BASE_URL`, usar somente:**

```dotenv
VITE_API_BASE_URL=https://sgp-homol.multivacia.com
```

**Nunca usar:**

```dotenv
VITE_API_BASE_URL=https://sgp-homol.multivacia.com/api
VITE_API_BASE_URL=https://sgp.multivacia.com
```

### 5.4 Validar `.env` da HML

```bash
cd /opt/sgp/sgp-homol

test -f server/.env
test -f .env

rg '^NODE_ENV=production$' server/.env
rg '^APP_ENV=homologation$' server/.env
rg '^PORT=4001$' server/.env
rg '^PGDATABASE=sgp_homol$' server/.env
rg '^CORS_ORIGIN=https://sgp-homol\.multivacia\.com$' server/.env
rg '^AUTH_COOKIE_NAME=' server/.env
rg '^PRODUCTION_AUTH_COOKIE_NAME=' server/.env
rg '^JWT_SECRET=' server/.env
rg '^PRODUCTION_JWT_SECRET=' server/.env
rg '^PRODUCTION_KIOSK_TOKEN=' server/.env

rg '^VITE_API_BASE_URL=' .env
```

### 5.5 Guardrails negativos

```bash
! rg '^PGDATABASE=sgp_prod$' server/.env
! rg '^PORT=4000$' server/.env
! rg '^CORS_ORIGIN=https://sgp\.multivacia\.com$' server/.env
! rg '^AUTH_COOKIE_NAME=sgp_auth$' server/.env
! rg '^PRODUCTION_AUTH_COOKIE_NAME=sgp_production_auth$' server/.env
! rg '^VITE_API_BASE_URL=https://sgp\.multivacia\.com' .env
! rg '^VITE_API_BASE_URL=.*\/api$' .env
```

### Checkpoint 5

So seguir se:

- os dois `.env` existem
- todos os valores criticos da HML estao corretos
- nenhum valor aponta para producao

---

## 5B) Schema do banco [ETAPA MANUAL SEPARADA - NAO AUTOMATICA NO WORKFLOW]

Observacao critica: sem schema no `sgp_homol`, o deploy pode ate subir o processo, mas a HML nao ficara utilizavel para login e fluxos reais.

Como o workflow nao deve rodar migrations automaticamente, o preparo do schema deve ser manual e em etapa separada.

### Comandos previstos

```bash
cd /opt/sgp/sgp-homol
npm ci
npm --prefix server ci
npm --prefix server run migrate
npm --prefix server run seed
npm --prefix server run seed:production-pins
```

### Checkpoint 5B

So seguir para o bootstrap final se:

- schema do `sgp_homol` estiver preparado manualmente
- isso tiver sido feito fora do workflow

---

## 6) Nginx [ESCRITA CONTROLADA]

### 6.1 Backup antes de qualquer alteracao

```bash
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak-$(date +%Y%m%d-%H%M%S)
sudo cp /etc/nginx/conf.d/sgp-homol.conf /etc/nginx/conf.d/sgp-homol.conf.bak-$(date +%Y%m%d-%H%M%S) 2>/dev/null || true
```

Nao mexer no server block de producao.

### 6.2 Criar server block da HML

```bash
sudo cp /opt/sgp/sgp-homol/deploy/nginx/sgp-homol.conf.example /etc/nginx/conf.d/sgp-homol.conf
```

### 6.3 Validar e recarregar

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 6.4 Validar HTTP da HML

```bash
curl -I http://sgp-homol.multivacia.com/
curl -I http://sgp-homol.multivacia.com/api/v1/health
```

### Checkpoint 6

So seguir se:

- `nginx -t` = ok
- reload ok
- producao nao foi alterada
- HML responde via HTTP

---

## 7) Certbot [ESCRITA CONTROLADA]

### 7.1 Emitir certificado

```bash
sudo certbot --nginx -d sgp-homol.multivacia.com
```

### 7.2 Validar HTTPS

```bash
curl -I https://sgp-homol.multivacia.com/
curl -fsS https://sgp-homol.multivacia.com/api/v1/health
sudo certbot renew --dry-run
```

### Checkpoint 7

So seguir se:

- HML responde em HTTPS
- Certbot concluiu sem afetar producao

---

## 8) PM2 [ESCRITA CONTROLADA]

### 8.1 Instalar dependencias e build no checkout da HML

```bash
cd /opt/sgp/sgp-homol
npm ci
npm --prefix server ci
npm --prefix server run build
npm run build
```

### 8.2 Bootstrap do PM2 da HML

```bash
pm2 start npm --name sgp-api-homol --cwd /opt/sgp/sgp-homol/server -- start
pm2 save
```

Nao reiniciar `sgp-api`.

### 8.3 Validar PM2

```bash
pm2 status
pm2 describe sgp-api
pm2 describe sgp-api-homol
pm2 logs sgp-api-homol --lines 120
```

### 8.4 Validar porta local da HML

```bash
ss -ltnp | rg ':4001 '
curl -fsS http://127.0.0.1:4001/api/v1/health
```

### Checkpoint 8

So seguir se:

- `sgp-api` continua online
- `sgp-api-homol` sobe online
- a porta `4001` responde
- a producao nao foi reiniciada

---

## 9) GitHub [ACAO CONTROLADA]

### 9.1 Criar secrets `HML_*`

Criar na UI do GitHub Actions:

- `HML_VPS_HOST`
- `HML_VPS_PORT`
- `HML_VPS_USER` = `deploy`
- `HML_VPS_SSH_KEY`
- `HML_VPS_KNOWN_HOSTS`

Como o `gh` disponivel aqui e read-only, isso deve ser feito pela UI do GitHub.

### 9.2 Garantir que a branch `homol` contem os arquivos da HML

```bash
git fetch origin
git checkout homol
git pull origin homol
git merge --ff-only origin/cursor/create-homologation-environment-eaa8
git push origin homol
```

Se o merge `--ff-only` nao for possivel, parar e resolver por PR ou merge controlado.

### 9.3 Primeiro deploy via workflow de HML

Rodar o workflow:

- `.github/workflows/deploy-hostgator-vps-homol.yml`

**Esperado no workflow**

- validar `HML_*`
- validar `deploy`
- validar paths HML
- validar `.env`
- build frontend e backend
- publicar em `/var/www/sgp-homol`
- restart ou bootstrap so de `sgp-api-homol`
- health final da HML

### Checkpoint 9

So seguir se:

- secrets HML existem
- branch `homol` esta atualizada
- workflow HML rodou sem tocar em producao

---

## 10) Validacoes finais [LEITURA + TESTE MANUAL]

### 10.1 Health HML

```bash
curl -fsS https://sgp-homol.multivacia.com/api/v1/health
```

### 10.2 Health producao

```bash
curl -fsS https://sgp.multivacia.com/api/v1/health
```

### 10.3 PM2 com os dois processos online

```bash
pm2 status
```

**Esperado**

- `sgp-api` online
- `sgp-api-homol` online

### 10.4 Banco HML separado

```bash
PGPASSWORD='CHANGE_ME_HML_ONLY' psql -h 127.0.0.1 -p <PORTA_POSTGRES_REAL> -U sgp_homol_user -d sgp_homol -c "select current_database(), current_user;"
```

### 10.5 Frontend HML separado

```bash
readlink -f /var/www/sgp-homol
test "$(readlink -f /var/www/sgp-homol)" != "/var/www/sgp-web"
```

### 10.6 Login HML

Teste manual no navegador:

- abrir `https://sgp-homol.multivacia.com`
- confirmar que o host e HML
- fazer login com credenciais de HML
- confirmar que a sessao funciona

### 10.7 Garantia visual e operacional de que esta em HML

Como nao houve mudanca de produto para banner visual, validar por:

- URL do navegador = `sgp-homol.multivacia.com`
- requisicoes de rede indo para `sgp-homol.multivacia.com`
- cookies de HML:
  - `sgp_hml_auth`
  - `sgp_hml_production_auth`
- nao usar cookies de producao:
  - `sgp_auth`
  - `sgp_production_auth`

### Checkpoint final

A HML so pode ser considerada "subida com seguranca" se:

- HML responde
- producao continua respondendo
- `sgp-api` e `sgp-api-homol` estao online
- banco HML e `sgp_homol`
- frontend HML esta em `/var/www/sgp-homol`
- nenhuma evidencia aponta para recursos de producao

---

## Resumo do fluxo exato

1. Conferencia inicial na VPS
2. DNS
3. Banco `sgp_homol`
4. Diretorios HML
5. `.env` e `server/.env` dedicados
6. Schema manual fora do workflow
7. Nginx com backup e novo server block HML
8. Certbot
9. PM2 `sgp-api-homol`
10. Secrets `HML_*` + branch `homol` + workflow HML
11. Validacoes finais em HML e producao
