# Retorno — backup-restore-bases

- **TASK_ID:** `backup-restore-bases`
- **Data/hora:** 2026-10-19 (UTC−3)
- **Objetivo:** backup automático da base de produção, cópia para o OneDrive da Bravo (máquina de Compras), backup antes do deploy, tela Backups (Super-admin) com restore protegido, runbook de desastre e versão 1.11.0.
- **Status final:** IMPLEMENTADO E VALIDADO LOCALMENTE — commits locais, **sem push, sem merge, sem deploy**. Configuração da VPS e da máquina de Compras pendente (passos manuais abaixo).
- **Branch:** `feat/backup-restore-bases` (local; não publicada)
- **SHA inicial:** `a43208e2` (`develop` = `origin/develop`, já com o Histórico de esteiras / migration 0054)
- **SHA final:** ver `git log -1 feat/backup-restore-bases` (o commit desta atualização do retorno é o último; o anterior é `cbe63881`)
- **Prompt:** `docs/ai/prompts/backup-restore-bases.md`

## Resumo

| # | Item do prompt | Entrega |
|---|---|---|
| 1 | Script de backup na VPS | `scripts/db/backup/sgp-db-backup.sh`: lê o `.env` da API (DATABASE_URL ou PG*), `pg_dump -Fc` + `pg_dumpall --globals-only --no-role-passwords`, `pg_restore --list`, `.sha256`, destino `/opt/sgp/backups/db` (umask 027), `--reason`, `flock`, retenção 7/4/3, log JSONL. Também faz o `--restore` usado pela tela. |
| 2 | Agendamento e pré-deploy | `deploy/systemd/sgp-db-backup.{service,timer}.example` (03:00 `America/Sao_Paulo`). Workflow HostGator: backup `pre-deploy` depois do `git fetch` e **antes** do `git reset --hard`; falha → `exit 1`. Nenhum secret alterado. |
| 3 | Cópia para o OneDrive | `scripts/db/backup/sgp-backup-remote.sh` (forced command: `list`, `get`, `confirm`) e `scripts/db/windows/sgp-backup-pull.ps1` (OpenSSH nativo, só arquivos novos, SHA-256, confirma depois de conferir, log local, `-KeepDays` padrão 0 = não apaga). |
| 4 | Tela Backups | Módulo `server/src/modules/database-backups`, rotas `/api/v1/admin/database-backups` com `system_settings.manage`; página `Backups da base` em Estrutura e administração. |
| 5 | Desastre | `docs/backup-restore-runbook.md` (VPS nova, roles, `pg_restore`, migrations, app, Nginx, validação; restore de backup que só está no OneDrive). |
| 6 | Documentação | `docs/backup-bases.md`: decisão de permitir restore destrutivo pela tela; aponta para scripts e runbook; pendência de mascarar senhas em HML. |
| 7 | Versão | `app-version.json` → 1.11.0, commit isolado; `env.test.ts` alinhado. |

### Rotas (todas `requireAuth` + `requirePermission('system_settings.manage')`)

| Método | Rota | Resultado |
|---|---|---|
| GET | `/admin/database-backups` | só `.dump` presentes na VPS **e** com `copy-confirm` no log para o mesmo SHA-256 |
| GET | `/admin/database-backups/status` | nome da base, última execução (erro se falhou), restore atual |
| POST | `/admin/database-backups` | 202; 409 se a trava estiver ocupada |
| GET | `/admin/database-backups/:fileName/download` | streaming; 422 nome inválido; 404 fora da lista |
| POST | `/admin/database-backups/restore` | 202; 422 nome da base errado; 404 fora da lista; 409 trava |
| GET | `/admin/database-backups/restore/status` | resultado do restore |

## Decisões técnicas

1. **Restore executado pelo próprio script** (`--restore`): a mesma trava `flock` cobre backup e restore; o script faz o `pre-restore` (se falhar, sai com 3 sem tocar na base) e o `pg_restore --clean --if-exists --single-transaction --exit-on-error`.
2. **Entradas de extensão ficam fora do restore** (`--use-list` sem `EXTENSION`/`COMMENT - EXTENSION`). Validado localmente: com usuário não superusuário, o `--clean` falha em `DROP EXTENSION uuid-ossp` ("must be owner"). As extensões já existem na base. Restore validado com dono não superusuário e senha com espaço e `#`.
3. **Modo manutenção bloqueia tudo**, inclusive o acompanhamento do restore, porque `requireAuth` consulta o banco. O 503 leva `details.restorePhase`; a tela usa isso para mostrar o andamento e pega o resultado quando a API volta. Estado em memória do processo (a API roda em um processo PM2).
4. **Auditoria `database_restored`** em `admin_audit_events` depois do restore (sucesso e falha), com `actor_user_id` resolvido por subselect (o autor pode não existir na base restaurada) e e-mail na metadata. Novo tipo na allowlist do servidor. A tela "Trilha administrativa" do frontend tem lista própria de tipos e **não** foi alterada (escopo congelado): o evento aparece com o código cru e não é filtrável por ela.
5. **Retenção** conta só datas que têm backup (se o timer parar, nada some). `pre-restore` não dispara retenção. Semanal = último backup do domingo; mensal = último backup do dia 1 (horário de São Paulo).
6. **Pré-deploy** usa o script da versão a publicar (`git show origin/main:...`) porque no primeiro deploy com backup o script ainda não existe na árvore da VPS. Credenciais vindas de `$REMOTE_APP_DIR/server/.env`.
7. **Credenciais do script**: lê só as chaves necessárias do `.env` (sem `source`), exporta `PGPASSWORD` só para o processo; nada vai para log/linha de comando. `ps` durante o teste não mostrou a senha.
8. **Globals sem senhas** (`--no-role-passwords`): não exige superusuário e não grava hash de senha no OneDrive. No desastre, a senha do usuário da aplicação é redefinida (runbook, seção 6).
9. **Sem migration** (permissão reusada, log em arquivo). **Nenhuma migration automatizada** em ponto algum.
10. `page-meta.ts` não foi alterado (fora das exceções do escopo): o título do shell na tela nova fica "Configurações do sistema".

## Arquivos

Criados:

- `scripts/db/backup/sgp-db-backup.sh` — backup, retenção, restore, log
- `scripts/db/backup/sgp-backup-remote.sh` — forced command do usuário SSH de cópia
- `scripts/db/windows/sgp-backup-pull.ps1` — cópia na máquina de Compras
- `deploy/systemd/sgp-db-backup.service.example`, `deploy/systemd/sgp-db-backup.timer.example`
- `server/src/modules/database-backups/` — `files`, `state`, `maintenance`, `runner`, `repository`, `schemas`, `service`, `controller`, `routes`
- `server/src/tests/database-backups-scripts.test.ts` — retenção e forced command (20 testes)
- `server/src/tests/database-backups-http.integration.test.ts` — API, 409, 422, download, 503 (9 testes)
- `server/src/tests/database-backups-restore-e2e.integration.test.ts` — restore ponta a ponta (3 testes)
- `src/domain/database-backups/databaseBackups.types.ts`, `src/services/databaseBackups/databaseBackupsApiService.ts`
- `src/features/admin/database-backups/DatabaseBackupsPage.tsx`, `databaseBackupsCopy.ts`, `databaseBackups.test.ts` (8 testes)
- `docs/backup-restore-runbook.md`, este retorno

Alterados:

- `.github/workflows/deploy-hostgator-vps.yml` — passo de backup pré-deploy
- `server/src/app.ts` — `maintenanceGuard()` e registro das rotas
- `server/src/modules/admin-audit/admin-audit.types.ts`, `admin-audit.metadata.ts` — tipo `database_restored` e allowlist (necessário para auditar o restore)
- `src/lib/shell/app-nav-config.ts`, `src/routes/AppRoutes.tsx` — item de menu e rota
- `docs/backup-bases.md` — decisão e ponteiros
- `app-version.json`, `server/src/tests/env.test.ts` — 1.11.0 (commit separado)

## Migrations

Nenhuma criada, nenhuma executada em ambiente compartilhado. Localmente: `npm run server:migrate` em base vazia descartável (0001→0054) para montar a base de teste.

## Validação (saída real, instância PostgreSQL 16 descartável na porta 55432, já apagada)

| Comando | Resultado |
|---|---|
| `npm run build` (`tsc -b && vite build`) | exit 0 |
| `npm run server:build` (`tsc -p tsconfig.json`) | exit 0 |
| `npm run lint` | exit 1 — **146 problemas, idêntico à `develop` `a43208e2`** (mesma lista de arquivos; `server/dist/` gerado entra no lint, preexistente). `eslint` nos arquivos novos/alterados e no `server/dist` gerado por eles: exit 0 |
| `npx vitest run` (frontend completo) | exit 0 — 222 arquivos, **1465** testes (develop: 1457) |
| `npm run server:test` (suíte completa, **base limpa**: PostgreSQL descartável recriado e migrado do zero com `npm run server:migrate`, sem seed) | exit 1 — 172 arquivos (2 falham, 166 passam, 4 ignorados); **1341 aprovados, 6 falhas preexistentes, 17 ignorados** (1364). `develop` `a43208e2` na mesma condição: 1308 aprovados, 7 falhas, 17 ignorados (1332) — as mesmas 6 + `env.test` |
| `database-backups-restore-e2e` sozinho, base recém-migrada (super-admin inexistente antes) | exit 0 — 3/3 (antes da correção `cbe63881`: 3/3 falhavam com 401) |
| testes do módulo (3 arquivos juntos), mesma base limpa | exit 0 — 32/32 |
| `shellcheck` (via `pip install shellcheck-py`, 0.11.0) nos dois `.sh` | exit 0; heredoc do workflow: `bash -n` ok e `shellcheck -S warning` exit 0 |
| `sgp-backup-pull.ps1` | PowerShell 7.4.6 (release oficial, só para validar): parse ok; teste funcional com `ssh` falso chamando o forced command real: copia, confere, confirma; 2ª execução não baixa de novo; arquivo com SHA divergente é descartado e **não** é confirmado. **Não testado em Windows PowerShell 5.1 real.** |

### Restore ponta a ponta (teste automatizado `database-backups-restore-e2e`)

1. base `sgp_restore_e2e` clonada da base de teste; backup `scheduled` pelo script real;
2. fluxo da máquina de Compras (`list` → `get` → SHA-256 → `confirm`) → backup passa a aparecer na lista;
3. insere setor novo, restaura pela API → setor some, `pre-restore` gerado, aviso de `npm run migrate:file`, `admin_audit_events` com `database_restored`/`success`, log da VPS com `restore`/`success`, modo manutenção desligado;
4. falha simulada (view fora do backup dependendo de `sectors` faz o `DROP` do `--clean` falhar): status `failure`, mensagem "pg_restore falhou…", setor novo e view continuam, contagem de esteiras igual, auditoria `failure`, API volta a responder.

### Falhas preexistentes (não relacionadas)

Execução em base limpa (recriada e migrada do zero, sem seed), branch e `develop` `a43208e2` (worktree temporária) na mesma condição:

- `admin-password-governance.test.ts` — **5 testes** (reset administrativo, `/auth/me` após reset, reset da própria conta → 422, sem governança → 403 recebe 401, login com senha temporária). Falham iguais na `develop`: o arquivo depende de usuários de teste (ex.: `66666666-…` `colaborador-only`) criados por outros arquivos/seed, não por ele mesmo.
- `operational-planning.weekly-view.http.test.ts` — exportação XLSX (`=SUM`), já registrada no checkpoint. Igual na `develop`.
- `env.test.ts` — falha só na `develop` (esperava 1.9.4); corrigido nesta branch no commit da versão.

Observações de execuções anteriores (base de teste reaproveitada, com seed e dados acumulados), também presentes na `develop`: `production-auth.integration.test.ts` (ordenação por nome depende da collation e dos dados acumulados) e `admin-password-governance` com 1 falha intermitente. Em base limpa, `production-auth` passa.

## Passos manuais do Gustavo

> Nada disso foi executado. Ajuste nomes conforme a VPS. `<api>` = usuário que roda o PM2 `sgp-api` (o mesmo do deploy).

### VPS

1. **pg_dump compatível:** `psql -At -c 'show server_version'` (como `<api>`, com as credenciais do `.env`) e `pg_dump --version`. O cliente precisa ser da **mesma versão principal ou mais nova** que o servidor. Se não for, instale `postgresql-client-<versão>` e use `SGP_PG_BIN_DIR=/usr/lib/postgresql/<versão>/bin` no service e no `server/.env` (a API repassa o ambiente ao script).
2. **Grupo e diretório:**
   ```bash
   sudo groupadd -f sgp-backup
   sudo usermod -aG sgp-backup <api>
   sudo install -d -o <api> -g sgp-backup -m 2770 /opt/sgp/backups/db   # setgid: arquivos herdam o grupo
   ```
   (`/opt/sgp/backups` já existe por causa do backup do frontend; confirme que `sgpbackup` consegue atravessá-lo: `chmod o+x` ou `g+x` com o mesmo grupo.)
3. **Usuário SSH de cópia (forced command):**
   ```bash
   sudo useradd --system --create-home --shell /bin/bash -G sgp-backup sgpbackup
   sudo install -o root -g root -m 755 /opt/sgp/sgp-main/scripts/db/backup/sgp-backup-remote.sh /usr/local/sbin/sgp-backup-remote
   sudo install -d -o sgpbackup -g sgpbackup -m 700 ~sgpbackup/.ssh
   # ~sgpbackup/.ssh/authorized_keys (dono sgpbackup, 600), uma linha:
   command="/usr/local/sbin/sgp-backup-remote",restrict ssh-ed25519 AAAA... compras-bravo
   ```
   `restrict` desliga pty, port/agent/X11 forwarding. Copiar o script para `/usr/local/sbin` evita que o `git reset --hard` do deploy troque o forced command sem revisão; reinstale quando ele mudar. Se o `sshd_config` usar `AllowUsers`/`AllowGroups`, inclua `sgpbackup`. Opcional: `Match User sgpbackup` com `PasswordAuthentication no`.
4. **Permissões que o `confirm` precisa:** o log `backup-log.jsonl` é criado com `660` e o diretório é do grupo `sgp-backup`; `sgpbackup` só lê os backups e acrescenta linhas no log.
5. **Timer:**
   ```bash
   sudo cp /opt/sgp/sgp-main/deploy/systemd/sgp-db-backup.service.example /etc/systemd/system/sgp-db-backup.service
   sudo cp /opt/sgp/sgp-main/deploy/systemd/sgp-db-backup.timer.example   /etc/systemd/system/sgp-db-backup.timer
   # editar User=<api> no .service
   sudo systemctl daemon-reload && sudo systemctl enable --now sgp-db-backup.timer
   sudo systemctl start sgp-db-backup.service && tail -n 2 /opt/sgp/backups/db/backup-log.jsonl
   ```
   O `OnCalendar` com fuso exige systemd ≥ 235 (`systemctl --version`).
6. **Primeiro teste manual antes do primeiro deploy com o passo novo** — fazer **pelos dois caminhos**:
   - como o usuário da API (timer e tela):
     `sudo -u <api> bash /opt/sgp/sgp-main/scripts/db/backup/sgp-db-backup.sh --reason manual` → exit 0;
   - pelo caminho exato do deploy, como `VPS_USER` (o mesmo usuário/chave dos secrets do workflow), a partir de uma cópia do repositório nesta branch:
     ```bash
     ssh -p <VPS_PORT> VPS_USER@<VPS_HOST> 'cd /opt/sgp/sgp-main && SGP_SERVER_ENV_FILE=/opt/sgp/sgp-main/server/.env bash -s -- --reason manual' < scripts/db/backup/sgp-db-backup.sh
     ```
     → exit 0. Os caminhos são os do workflow (`REMOTE_APP_DIR=/opt/sgp/sgp-main`, env em `$REMOTE_APP_DIR/server/.env`); o deploy roda o script da versão a publicar via `git show`, por isso o teste envia o script local pela entrada padrão (validado localmente: `bash -s` gera e registra o backup normalmente).
   Se qualquer um falhar, o próximo deploy **para** (comportamento pedido).

   > **Alerta:** crie `/opt/sgp/backups/db` com dono/grupo corretos (passo 2: `<api>:sgp-backup`, modo `2770`) **ANTES** do primeiro deploy e antes desses testes. Se o primeiro a rodar o script for o deploy (ou o teste como `VPS_USER`), o script cria o diretório com dono `VPS_USER` e modo `750` (umask 027 — reproduzido localmente), e a API, o timer e o usuário `sgpbackup` deixam de conseguir gravar/ler. Se `VPS_USER` for diferente de `<api>`, inclua-o também no grupo: `sudo usermod -aG sgp-backup VPS_USER`. Corrigir depois exige `chown -R <api>:sgp-backup` + `chmod 2770` no diretório e `640`/`660` nos arquivos.
7. **Espaço em disco:** reserve ~15 vezes o tamanho de um `.dump` (7 diários + pre-deploy + 4 semanais + 3 mensais).
8. **`.env` da API (opcional):** só se mudar os padrões: `SGP_BACKUP_DIR`, `SGP_BACKUP_LOG`, `SGP_BACKUP_SCRIPT`, `SGP_SERVER_ENV_FILE`, `SGP_PG_BIN_DIR`. O PM2 precisa de `pm2 restart sgp-api --update-env` para enxergar.

### Máquina de Compras (Windows)

1. **OpenSSH Client:** Configurações → Aplicativos → Recursos opcionais → "Cliente OpenSSH" (ou `Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0`). Conferir `C:\Windows\System32\OpenSSH\ssh.exe`.
2. **Chave:** `ssh-keygen -t ed25519 -N "" -f C:\SGP\chave\sgp_backup_ed25519 -C compras-bravo`. Restringir a pasta ao usuário da tarefa (`icacls C:\SGP\chave /inheritance:r /grant:r "%USERNAME%:(OI)(CI)F"`). Enviar só o `.pub` para o `authorized_keys` da VPS (passo 3 da VPS).
3. **known_hosts:** `ssh-keyscan -p <porta> sgp.multivacia.com > C:\SGP\chave\known_hosts` e conferir a impressão digital com a da VPS (`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`) antes de confiar.
4. **Teste:** `ssh -i C:\SGP\chave\sgp_backup_ed25519 -o UserKnownHostsFile=C:\SGP\chave\known_hosts -p <porta> sgpbackup@sgp.multivacia.com list` → lista de arquivos.
5. **Pasta do OneDrive:** criar, por exemplo, `C:\Users\<usuario>\OneDrive - Bravo\Backups SGP`, marcada para manter no dispositivo/sincronizar; confirmar que a conta OneDrive é a da Bravo.
6. **Script:** copiar `scripts/db/windows/sgp-backup-pull.ps1` para `C:\SGP\`.
7. **Tarefa agendada** (Agendador de Tarefas → Criar tarefa):
   - executar como o usuário que tem o OneDrive, "Executar estando o usuário conectado ou não";
   - disparo diário às **07:00** (depois do backup das 03:00) e, opcional, "Ao fazer logon";
   - "Executar a tarefa o mais cedo possível após uma inicialização agendada ser perdida";
   - ação: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\SGP\sgp-backup-pull.ps1 -VpsHost sgp.multivacia.com -VpsPort <porta> -VpsUser sgpbackup -KeyFile C:\SGP\chave\sgp_backup_ed25519 -KnownHostsFile C:\SGP\chave\known_hosts -DestinationDir "C:\Users\<usuario>\OneDrive - Bravo\Backups SGP"`.
   - Log: `sgp-backup-pull.log` na própria pasta de destino. Exit 1 = houve erro (ver log).
8. **Retenção no OneDrive:** padrão não apaga. Quando definida, acrescentar `-KeepDays <n>`.
9. Conferir na tela **Backups da base** que o backup aparece depois da primeira cópia confirmada.

## Divergência registrada

- `docs/deploy-sgp-ec2.md` e `docs/deploy-ec2-automatico.md` descrevem EC2 (`/opt/sgp/current`, `shared/server.env`, systemd `sgp-api`), mas o workflow ativo de produção é **HostGator VPS** (`/opt/sgp/sgp-main`, `server/.env`, PM2 `sgp-api`, frontend em `/var/www/sgp-web`). Não corrigido (fora do escopo). O runbook novo usa o layout HostGator.
- O `.env` da API em produção é presumido em `/opt/sgp/sgp-main/server/.env` (é o único que `loadDotenvFiles` lê). Confirmar na VPS.

## Pendências e riscos

- **Configuração manual** da VPS e da máquina de Compras (acima). Até lá: o timer não existe, a tela lista vazio (nenhuma cópia confirmada) e **o próximo deploy da `main` com este código falha se o backup pré-deploy falhar** (diretório/permissões/pg_dump). Fazer o passo 6 da VPS antes de promover.
- **Restore em produção nunca foi exercitado na VPS real.** Validado só em PostgreSQL 16 local (superusuário e dono não superusuário). Se o usuário da aplicação não for dono de todos os objetos, o `--clean` falha e o restore é desfeito (seguro, mas não restaura): conferir dono das tabelas antes de depender da tela.
- `pg_restore --single-transaction` em base grande segura locks por toda a duração; a API fica em manutenção nesse tempo (esperado).
- Se a API reiniciar no meio de um restore, o modo manutenção (em memória) se perde; o script continua e a transação garante consistência, mas a auditoria em `admin_audit_events` não é gravada (fica só o log da VPS).
- Backups contêm dados pessoais e hashes de senha de usuários da aplicação, sem criptografia (decisão aprovada); a pasta do OneDrive deve ter compartilhamento restrito.
- Trilha administrativa do frontend não rotula `database_restored` (ver decisão 4).
- `.ps1` validado em PowerShell 7 no Linux, não em Windows PowerShell 5.1.
- Futuro HML: mascarar senhas (e PINs do Kiosk) ao restaurar produção — não implementado.

## Próximo passo recomendado

Revisão da branch → passos manuais da VPS (pelo menos 1, 2 e 6) → PR para `develop` → validação do pacote 1.11.0 → promoção para `main` com aprovação explícita.

## Git

- Commits (locais, nesta ordem): `8c9bc9e1` scripts/workflow/systemd; `4bd52a15` API; `39e2613e` tela; `1b41704a` docs; `0435d685` versão 1.11.0; `590e3ab8` retorno; `cbe63881` correção da revisão independente (e2e autossuficiente); último: atualização deste retorno.
- Push/PR: **não feitos** (sem autorização). Arquivo de retorno não publicado.
- `git status` final: working tree limpo (`server/.env` local é ignorado pelo Git e não foi alterado).
- Ambiente: instância PostgreSQL descartável parada e apagada; PowerShell baixado removido.

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
