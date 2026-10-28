# Runbook — backup, cópia externa e restore da base de produção

**Escopo:** base de produção do SGP+ na VPS HostGator. Perda aceita: até 24 h.
**Atividade de origem:** `backup-restore-bases` (19/10/2026).

## 1. Visão geral

| Peça | Onde | O que faz |
|---|---|---|
| `scripts/db/backup/sgp-db-backup.sh` | VPS | `pg_dump -Fc` + `pg_dumpall --globals-only`, valida com `pg_restore --list`, SHA-256, retenção, log JSONL, `flock`; também executa o restore da tela |
| `deploy/systemd/sgp-db-backup.{service,timer}.example` | VPS | backup diário às 03:00 (São Paulo) |
| `.github/workflows/deploy-hostgator-vps.yml` | GitHub Actions → VPS | backup `pre-deploy` antes de trocar a release; se falhar, o deploy para |
| `scripts/db/backup/sgp-backup-remote.sh` | VPS (forced command) | `list`, `get <arquivo>`, `confirm <arquivo> <sha256>` para o usuário SSH de cópia |
| `scripts/db/windows/sgp-backup-pull.ps1` | Máquina de Compras | puxa os backups novos para o OneDrive da Bravo, confere SHA-256 e confirma na VPS |
| Tela **Backups da base** | SGP+ (Super-admin) | lista, status, backup manual, download e restore |

Arquivos na VPS (padrão `/opt/sgp/backups/db`):

```text
sgp_AAAAMMDD-HHMMSS_<motivo>.dump            # pg_dump -Fc da base da aplicação
sgp_AAAAMMDD-HHMMSS_<motivo>.globals.sql     # roles (sem senhas: --no-role-passwords)
<arquivo>.sha256                             # saída do sha256sum
backup-log.jsonl                             # uma linha JSON por execução (backup, prune, restore, copy-confirm)
```

Motivos: `scheduled`, `manual`, `pre-deploy`, `pre-restore`. Data e hora do nome: horário de São Paulo.

Credenciais: o script lê o mesmo `.env` da API (`/opt/sgp/sgp-main/server/.env`, configurável em
`SGP_SERVER_ENV_FILE`), aceitando `DATABASE_URL` ou `PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD`.
A senha vai só para a variável `PGPASSWORD` do processo; nunca para log nem linha de comando.

A API (tela) usa os mesmos padrões; para mudar, defina no `server/.env`: `SGP_BACKUP_DIR`, `SGP_BACKUP_LOG`,
`SGP_BACKUP_SCRIPT` (caminho do `sgp-db-backup.sh`) e `SGP_SERVER_ENV_FILE`. O processo da API precisa
ter `pg_dump`/`pg_restore` no PATH (ou `SGP_PG_BIN_DIR`) e permissão de escrita no diretório de backups.

## 2. Retenção na VPS

Aplicada depois de cada backup bem-sucedido (exceto `pre-restore`):

- **diários:** todos os backups dos 7 dias mais recentes que têm backup (inclui `pre-deploy` e `pre-restore`);
- **semanais:** o último backup de cada um dos 4 domingos mais recentes com backup;
- **mensais:** o último backup de cada um dos 3 dias 1 mais recentes com backup;
- o restante é apagado (o `.globals.sql` e os `.sha256` acompanham o `.dump`).

Os "dias" contam só datas que têm backup: se o agendamento parar, os últimos backups não somem.
Simulação sem apagar nada: `ls /opt/sgp/backups/db | bash sgp-db-backup.sh --retention-plan`.

Retenção no OneDrive: parâmetro `-KeepDays` do `.ps1`. **Padrão: não apaga nada** (retenção ainda não definida).

## 3. Rotina

- **Conferir o agendamento:** `systemctl list-timers sgp-db-backup.timer` e `journalctl -u sgp-db-backup.service -n 50`.
- **Conferir o log:** `tail -n 5 /opt/sgp/backups/db/backup-log.jsonl | jq .`
- **Backup manual pelo terminal:** `sudo -u <usuário-da-api> bash /opt/sgp/sgp-main/scripts/db/backup/sgp-db-backup.sh --reason manual`
- **Tela:** Configurações → *Backups da base* mostra só backups com cópia confirmada no OneDrive e ainda presentes na VPS. Se o último backup falhou, o erro aparece no topo.

## 4. Restore pela tela (VPS em funcionamento)

Somente Super-admin (`system_settings.manage`). Decisão do Gustavo (19/10/2026): restore destrutivo
permitido pela tela, com estas proteções:

1. digitar o nome exato da base (senão 422);
2. a API entra em **modo manutenção**: todas as requisições recebem 503 com mensagem em português;
3. backup de segurança `pre-restore`; se falhar, nada é alterado;
4. `pg_restore --clean --if-exists --single-transaction` do arquivo escolhido, executado pelo `psql` com
   `ON_ERROR_STOP` (as entradas de extensão ficam de fora: `uuid-ossp`/`pgcrypto` já existem e costumam pertencer
   ao superusuário), com `lock_timeout` de **2 minutos** (`SGP_RESTORE_LOCK_TIMEOUT_MS`, padrão 120000; só no
   restore). O `SET lock_timeout = 0` que o próprio dump traz é substituído por esse valor.
   Se falhar — inclusive porque outra sessão (ex.: um `psql` aberto, um job) segurou bloqueio numa tabela por mais
   de 2 minutos — a transação é desfeita, a base continua como estava, a API sai do modo manutenção e a tela mostra o erro;
5. sai do modo manutenção; registra o restore no log da VPS e em `admin_audit_events`
   (evento `database_restored`, gravado **depois** do restore porque a tabela foi substituída);
6. **não executa migrations.**

### 4.1 Reaplicar migrations depois do restore

**Risco (decisão do Gustavo, 20/10/2026: comportamento mantido, só documentado).** O restore com `--clean` só
apaga e recria os objetos que **estão no backup**. Se o backup for anterior a migrations já aplicadas:

- o restore pode **falhar** — por exemplo, uma FK criada por migration posterior aponta para tabela do backup e
  impede o `DROP`. A transação é desfeita e a base fica **intacta** (como antes do restore);
- ou pode **concluir em estado misto** — tabelas, colunas e índices criados depois do backup **permanecem**, com
  dados posteriores à data do backup (ou ficam órfãos de registros que deixaram de existir), enquanto as tabelas
  do backup voltam à data dele.

Por isso, prefira restaurar backups **posteriores** à última migration aplicada. Para backup anterior, avalie
antes, numa cópia (HML/local), o que a migration posterior cria, e decida com cuidado.

Como o runner não tem tabela de controle, identifique as migrations posteriores ao backup:

1. Liste as migrations do código em produção: `ls /opt/sgp/sgp-main/server/migrations`.
2. Descubra a data do backup (nome do arquivo) e as migrations que entraram depois dela:
   `git -C /opt/sgp/sgp-main log --since="<data do backup>" --name-only --format= -- server/migrations | sort -u`.
3. Para cada uma, verifique o que ela cria ou altera (ex.: `0054_conveyors_canceled_at.sql` → coluna `canceled_at`
   em `conveyors`). **Atenção:** o objeto existir **não prova** que a migration está aplicada de forma consistente —
   pelo risco acima, ele pode ter sobrado da base anterior ao restore, com dados que não combinam com o backup
   (ex.: `canceled_at` preenchido para esteiras cujo estado voltou à data do backup), e migrations com `UPDATE`/backfill
   podem precisar ser reexecutadas. Confira também os dados, não só o esquema.
4. Aplique as que faltam ou precisam ser refeitas, **na ordem**, uma a uma (só migrations idempotentes podem ser
   reexecutadas sem ajuste):
   `cd /opt/sgp/sgp-main && npm --prefix server run migrate:file -- migrations/<arquivo>.sql`
5. `pm2 restart sgp-api` e valide `GET /api/v1/health` e `GET /api/v1/health/db`.

Nunca use `npm run migrate` em base existente: ele reexecuta tudo desde a `0001` e falha a partir da `0002`.

### 4.2 Restore pelo terminal (sem a tela)

```bash
sudo -u <usuário-da-api> bash /opt/sgp/sgp-main/scripts/db/backup/sgp-db-backup.sh --restore sgp_AAAAMMDD-HHMMSS_<motivo>.dump
```

Pare a API antes (`pm2 stop sgp-api`), porque pelo terminal não há modo manutenção. Depois: 4.1 e `pm2 start sgp-api`.

## 5. Restore de backup que só existe no OneDrive

1. Copie o `.dump` (e o `.globals.sql`, se precisar de roles) da pasta do OneDrive para a VPS:
   `scp sgp_...dump <admin>@<vps>:/tmp/`.
2. Confira o SHA-256 com o valor registrado no log da máquina de Compras ou no `backup-log.jsonl` (`copy-confirm`):
   `sha256sum /tmp/sgp_...dump`.
3. Coloque o arquivo no diretório de backups com o `.sha256` ao lado:
   ```bash
   sudo install -o <usuário-da-api> -g sgp-backup -m 640 /tmp/sgp_...dump /opt/sgp/backups/db/
   cd /opt/sgp/backups/db && sha256sum sgp_...dump | sudo -u <usuário-da-api> tee sgp_...dump.sha256
   ```
4. Restaure pelo terminal (4.2). A tela só lista backups com cópia confirmada; um arquivo recolocado
   manualmente não aparece lá até ser confirmado de novo pela máquina de Compras.
   Atenção: se o arquivo for mais antigo que a retenção, o próximo backup bem-sucedido o apaga de novo da VPS.

## 6. Desastre: VPS perdida

Ponto de partida: o backup mais recente na pasta do OneDrive (`.dump` + `.globals.sql`).

1. **VPS nova:** mesma distribuição; usuário administrativo; firewall (22, 80, 443).
2. **PostgreSQL:** instale a mesma versão principal (ou mais nova) da produção anterior.
   O `pg_restore` precisa ser da mesma versão ou mais novo que o `pg_dump` que gerou o backup.
3. **Roles:** `sudo -u postgres psql -f sgp_...globals.sql` (cria as roles **sem senha**; erros de "role já existe"
   para `postgres` são esperados). Defina a senha do usuário da aplicação:
   `sudo -u postgres psql -c "ALTER ROLE <usuário> PASSWORD '<nova senha>'"` (anote para o `.env`).
4. **Base e extensões:**
   ```bash
   sudo -u postgres createdb -O <usuário> <base>
   sudo -u postgres psql -d <base> -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS pgcrypto;'
   ```
5. **Dados:** `sudo -u postgres pg_restore --no-owner --role=<usuário> --exit-on-error -d <base> sgp_...dump`
   (base vazia, sem `--clean`). Conferir: `psql -d <base> -c 'select count(*) from conveyors'`.
6. **Migrations:** o backup tem o esquema da época em que foi gerado. Clone o repositório (passo 7) e siga 4.1 para
   aplicar as migrations posteriores à data do backup.
7. **App:** Node 22, PM2, `git clone` em `/opt/sgp/sgp-main` (branch `main`), `server/.env` com as variáveis de
   produção (PG*, `JWT_SECRET`, `PRODUCTION_JWT_SECRET`, `CORS_ORIGIN`, `PORT` etc. — guardadas fora do Git),
   `npm ci`, `npm --prefix server ci`, `npm --prefix server run build`, `npm run build`,
   `rsync -a --delete dist/ /var/www/sgp-web/`, `pm2 start server/dist/server.js --name sgp-api && pm2 save`.
8. **Nginx + TLS:** use `deploy/nginx/sgp.conf.example` ajustando `root` para `/var/www/sgp-web` e `proxy_pass` para a
   porta da API; certificado (certbot); DNS de `sgp.multivacia.com` para o IP novo.
9. **Secrets do GitHub:** atualizar `VPS_HOST`, `VPS_PORT`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS` (ação humana).
10. **Backups de novo:** refaça a seção "Passos manuais" do retorno `docs/ai/returns/backup-restore-bases-retorno.md`
    (diretório, grupo, timer, usuário SSH de cópia) e atualize `known_hosts` na máquina de Compras.
11. **Validação:** `GET /api/v1/health` e `/api/v1/health/db`; login com Super-admin; Painel operacional abre;
    um apontamento de teste no Kiosk; tela Backups lista após a primeira cópia confirmada.

Sessões antigas deixam de valer se o `JWT_SECRET` mudar (usuários fazem login de novo).

## 7. Futuro HML

Ao restaurar produção em HML: **mascarar as senhas dos usuários** (e PINs do Kiosk) logo após o restore.
Não implementado nesta entrega.
