# Spec — backup-restore-fase1

**TASK_ID:** `backup-restore-fase1`
**Data:** 2026-10-11
**Origem:** análise `docs/ai/returns/verificar-backups-bases-retorno.md` (decisões humanas registradas lá).
**Impacto:** SEGUIR — somente scripts operacionais e runbook; **nenhuma** alteração em `src/`, `server/src/`, `server/migrations/` ou workflows.

## Contexto real

- VPS HostGator, PostgreSQL 18 na porta 5433, base `sgp_prod`, API sob PM2 (`sgp-api`) em `/opt/sgp/sgp-main`.
- Backup diário existente fora do repo: `/opt/sgp/backup-sgp.sh`, cron `30 2 * * *`, destino `/opt/sgp/backups/local/`, retenção 14 dias, formato `.dump`. **Não alterar nem substituir** nesta fase; o runbook descreve a troca opcional do cron pelo novo script após validação humana.
- Deploy da VPS não roda migrations (guardrail) → backup pré-migration é passo de runbook manual.
- `server/src/scripts/migrate.ts` não registra versão aplicada → manifesto precisa da versão/SHA publicada.
- Servidor on-premise do cliente: **Windows**, cópia por **pull** via OpenSSH nativo.
- Retenção Windows: 30 diários + 12 mensais. Alertas: **e-mail**.
- Restore exige **digitar o nome exato do arquivo**.

## Entregáveis (todos novos, em `scripts/db/`, salvo indicação)

### 1. `backup.env.example`
Modelo da configuração lida pelos scripts bash (arquivo real fica fora do repo, padrão `/opt/sgp/backup.env`, sobrescrevível por `SGP_BACKUP_CONFIG`). Sem segredos — senhas via `~/.pgpass`.
Variáveis (com default sensato quando houver):
`PG_BIN_DIR` (`/usr/lib/postgresql/18/bin`), `PGHOST` (`127.0.0.1`), `PGPORT` (`5433`), `BACKUP_PGUSER` (role somente leitura), `RESTORE_PGUSER` (role administrativo, default `postgres`), `RESTORE_DB_OWNER` (dono dos objetos restaurados), `BACKUP_DB` (`sgp_prod`), `ALLOWED_TARGET_DBS` (lista separada por espaço; default `sgp_prod`), `BACKUP_ROOT` (`/opt/sgp/backups`), `DAILY_RETENTION_DAYS` (`14`), `ADHOC_RETENTION_DAYS` (`90`; `0` = nunca apagar), `APP_DIR` (`/opt/sgp/sgp-main`), `VERSION_URL` (opcional, ex. `http://127.0.0.1:<porta>/api/version`), `HEALTH_URL` (opcional), `PM2_PROCESS` (`sgp-api`), `PM2_USER` (opcional; se definido usar `sudo -u`), `PM2_CMD` (`pm2`), `MAINTENANCE_FLAG` (opcional, ex. `/opt/sgp/maintenance.flag`), `RESTORE_JOBS` (`2`), `ALERT_EMAIL_TO`, `ALERT_EMAIL_FROM`, `SENDMAIL_CMD` (`/usr/sbin/sendmail`).

### 2. `lib/backup-common.sh`
Funções compartilhadas: carregar config; log com timestamp; resolver binários em `PG_BIN_DIR`; **checar que o major do `pg_dump` ≥ major do servidor** (abortar se menor); `flock` em `$BACKUP_ROOT/.sgp-backup.lock` (backup e restore não rodam juntos); sha256; obter versão da app (`VERSION_URL` via `curl` → fallback `git -C $APP_DIR rev-parse --short HEAD` → `desconhecida`); envio de e-mail via `SENDMAIL_CMD` (se ausente ou `ALERT_EMAIL_TO` vazio: apenas log de aviso, sem falhar); validação de nome de base (`^[a-z_][a-z0-9_]*$`).

### 3. `backup-db.sh`
`backup-db.sh --type daily|adhoc|pre-restore [--reason "<texto>"] [--db <nome>]`
- `--reason` obrigatório para `adhoc` e `pre-restore`.
- Destino: `daily` → `$BACKUP_ROOT/local/`; `adhoc` e `pre-restore` → `$BACKUP_ROOT/adhoc/`.
- Nome base: `<db>_<type>_<YYYYMMDD_HHMMSS>`; nunca sobrescreve (sufixo `_1`, `_2`…).
- Gera conjunto: `<base>.dump` (`pg_dump -Fc`), `<base>.globals.sql` (`pg_dumpall --globals-only`; se falhar por permissão, tentar `--no-role-passwords`; se falhar de novo, seguir sem globals e registrar), `<base>.manifest.json`, `<base>.dump.sha256` (formato `sha256sum`).
- Gravar em arquivo temporário e renomear só após: exit code 0, tamanho > 0 e `pg_restore --list` ok.
- Manifesto JSON: `file`, `db`, `type`, `reason`, `operator`, `created_at` (UTC ISO 8601), `server_version`, `pg_dump_version`, `app_version`, `size_bytes`, `sha256`, `globals` (`full|no-passwords|missing`).
- Retenção após sucesso: `daily` apaga conjuntos com mais de `DAILY_RETENTION_DAYS` **somente no diretório `local/` e somente arquivos que seguem o padrão de nome deste script**; `adhoc`/`pre-restore` idem com `ADHOC_RETENTION_DAYS` (0 = não apaga). Nunca tocar outros arquivos (ex.: `.dump` do `backup-sgp.sh` legado, `frontend-*`).
- Falha: remove temporários, envia e-mail, exit ≠ 0.

### 4. `list-backups.sh`
Lista conjuntos de `local/` e `adhoc/` (inclusive `.dump` legados sem manifesto, marcados como tal): data, tipo, base, tamanho, versão da app, motivo, checksum (`ok|falhou|sem-checksum`). Opção `--json` (array) para uso futuro da Fase 2.

### 5. `restore-db.sh`
`restore-db.sh --file <caminho.dump> [--target-db <nome>] [--pm2-process <nome>] [--confirm <nome-do-arquivo>]`
`restore-db.sh --undo --target-db <nome> --old-db <nome_old_ts> [--confirm <nome_old_ts>]`

Restore:
1. Lock; `--target-db` (default `BACKUP_DB`) precisa estar em `ALLOWED_TARGET_DBS`.
2. Validar arquivo: existe; se houver `.sha256`, conferir (divergência → abortar); `pg_restore --list` ok.
3. Exibir resumo: data do backup, tipo/motivo, versão da app no backup × versão publicada (aviso se diferente), **janela de perda** (agora − data do backup, em horas), base alvo, processo PM2.
4. Confirmação: digitar o **nome exato do arquivo** (basename). Sem TTY, aceitar apenas `--confirm` igual ao basename. Divergência → abortar sem alterar nada.
5. Criar `<target>_restore_<ts>` (owner `RESTORE_DB_OWNER` se definido) e `pg_restore -j $RESTORE_JOBS --no-owner [--role=$RESTORE_DB_OWNER]` com `RESTORE_PGUSER`. Falha → dropar a base temporária e abortar; produção intacta.
6. Validar base restaurada: quantidade de tabelas em `public` > 0; exibir contagem de tabelas alvo × restaurada.
7. Backup de segurança da base alvo atual: `backup-db.sh --type pre-restore --reason "pre-restore de <arquivo>"` (falha → abortar e dropar a temporária). Lock: não pode dar deadlock com o lock já obtido (usar mecanismo de lock reentrante, ex. variável de ambiente indicando lock herdado).
8. Troca: criar `MAINTENANCE_FLAG` (se configurado) → `pm2 stop` → `pg_terminate_backend` das conexões na base alvo → `ALTER DATABASE <target> RENAME TO <target>_old_<ts>` → `ALTER DATABASE <target>_restore_<ts> RENAME TO <target>` → `pm2 start` → `HEALTH_URL` (se configurado, até ~60 s) → remover flag.
   Qualquer falha após o `pm2 stop`: desfazer os renames que já ocorreram, `pm2 start`, remover flag, e-mail de alerta, exit ≠ 0.
9. Registrar uma linha JSON em `$BACKUP_ROOT/restore-log/restore.log.jsonl` (fora do banco; sobrevive ao restore): data, operador, arquivo, alvo, base antiga, resultado.
10. Imprimir o comando exato de `--undo` e lembrar que `<target>_old_<ts>` **não** é apagada automaticamente.

Undo: confirmação digitando o nome da base antiga; mesma sequência de manutenção/PM2; `<target>` → `<target>_discarded_<ts>`, `<old>` → `<target>`; log; e-mail em falha.

### 6. `windows/pull-backups.ps1` + `windows/pull-backups.config.example.psd1`
PowerShell 5.1+ (compatível também com 7). Agendado pelo Agendador de Tarefas.
- Config: `VpsHost`, `VpsPort`, `VpsUser`, `IdentityFile`, `KnownHostsFile`, `RemoteDirs` (`local`, `adhoc` — caminhos relativos à raiz SFTP), `DestRoot` (ex. `D:\SGP\backups`), `DailyKeepDays` (30), `MonthlyKeepMonths` (12), `AdhocKeepDays` (0 = não apagar), SMTP (`SmtpServer`, `SmtpPort`, `SmtpUseSsl`, `MailFrom`, `MailTo`, `SmtpCredentialFile` — `Export-Clixml` de PSCredential, protegido por DPAPI), `NotifyOnSuccess` ($false).
- Usa `sftp` do OpenSSH com arquivo batch (`-b`), modo leitura: `ls -1` para listar, `get -p` para baixar (preserva data). Baixar para `.part`, renomear após sucesso. Só baixa o que não existe localmente (ou tamanho diferente).
- Verifica `Get-FileHash -Algorithm SHA256` contra `.sha256` quando existir; divergência → apagar o arquivo local, registrar e alertar.
- Retenção local, apenas em `.dump` e arquivos irmãos do mesmo conjunto (base comum): `local/` mantém tudo dos últimos `DailyKeepDays` + o backup mais antigo de cada mês dos últimos `MonthlyKeepMonths` meses; `adhoc/` conforme `AdhocKeepDays`. Data de referência: timestamp do nome quando houver, senão `LastWriteTime`.
- Log em `DestRoot\logs\pull-AAAAMMDD.log`. Falha → e-mail; exit code ≠ 0.
- Lógica de retenção em função isolada, com parâmetro `-WhatIf`/`-DryRun`.

### 7. `windows/test-restore.ps1`
Teste mensal: pega o `.dump` mais recente de `DestRoot\local`, confere sha256, restaura em `sgp_restore_test` no PostgreSQL 18 local (config: `PgBinDir`, `PgHost`, `PgPort`, `PgUser`; senha via `pgpass.conf`), conta tabelas em `public` (> 0), dropa a base de teste, e-mail com resultado (sucesso ou falha). Nunca toca outra base além de `sgp_restore_test`.

### 8. Documentação
- Novo `docs/runbooks/backup-restore-postgresql.md` — único runbook, em pt-BR:
  VPS (config, role de backup somente leitura com `pg_read_all_data`, `.pgpass`, MTA/`msmtp` para e-mail, cron opcional substituindo `backup-sgp.sh` só após validação), backup esporádico, migration manual com backup prévio, listar, restore, undo, limpeza manual das bases `_old`, usuário SFTP somente leitura com `ForceCommand internal-sftp -R` + `ChrootDirectory`; Windows (OpenSSH, chave, config, credencial SMTP, tarefas agendadas diária e mensal, BitLocker, PostgreSQL 18 client); recuperação de desastre (VPS perdida → restore manual a partir da cópia do Windows); trecho nginx opcional para `MAINTENANCE_FLAG`.
- `docs/backup-bases.md`: acrescentar no topo uma nota curta apontando para o runbook novo (o restante permanece).

## Fora de escopo
Tela no SGP, agente, base `sgp_ops`, permissões RBAC, migrations, alteração de workflows, alteração do `backup-sgp.sh`/crontab reais, restore produção → HML executado (apenas `ALLOWED_TARGET_DBS`/`--pm2-process` deixam preparado).

## Critérios de aceite
1. `shellcheck` sem erros nos scripts bash; `bash -n` ok.
2. Scripts PowerShell sem erros de parse.
3. Em PostgreSQL real (teste local): `backup-db.sh` gera os 4 arquivos, manifesto válido (`jq`), sha256 confere, retenção apaga só o padrão próprio.
4. `restore-db.sh` com confirmação errada não altera nada; com confirmação correta troca a base, mantém `_old`, registra log; `--undo` volta ao estado anterior.
5. Falha simulada após `pm2 stop` desfaz renames e reinicia o processo.
6. `list-backups.sh --json` gera JSON válido incluindo `.dump` legado.
7. Nenhum arquivo fora de `scripts/db/`, `docs/runbooks/`, `docs/backup-bases.md`, `docs/specs/` e `docs/ai/` alterado.
