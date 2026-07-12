# Runbook — Gestão de backups (SGP+ Web)

## Objetivo

Operar backups **lógicos** (`pg_dump --format=custom`) com catálogo auditável, download seguro e inventário opcional de WAL — **sem** afirmar PITR ativo e **sem** restore automatizado na V1.

## Arquitetura (V1)

```
┌─────────────┐     POST /admin/backups      ┌──────────────────┐
│  UI Admin   │ ───────────────────────────► │ backups.service  │
│ (BackupsTab)│ ◄── lista/summary/download ─ │  + pg_dump spawn │
└─────────────┘                               └────────┬─────────┘
                                                       │
                                                       ▼
                                              BACKUP_DIRECTORY
                                              (arquivos .dump)
                                                       │
┌─────────────┐     sync/list WAL            ┌─────────┴─────────┐
│ WAL dir     │ ◄─────────────────────────── │ backup_wal_segments│
│ (opcional)  │                               │ (catálogo)         │
└─────────────┘                               └───────────────────┘
```

- Catálogo: tabelas `backup_runs` e `backup_wal_segments` (migration `0050`).
- Permissões `backups.*` **somente** `SUPER_ADMIN` (revoke de ADMIN/GESTOR/COLABORADOR).
- API sob `/api/v1/admin/backups/*`. Respostas **nunca** incluem `storage_key`, path absoluto, senha ou connection string.

## pg_dump lógico vs base física vs WAL

| Tipo | O que é | Serve para PITR? | Na V1 |
|------|---------|------------------|-------|
| **Lógico (`pg_dump`)** | Dump custom de **uma** database | **Não** — não é base para replay de WAL | Sim — FULL_LOGICAL |
| **Físico (base/PGDATA)** | Cópia dos ficheiros do cluster | Base para PITR com WAL | Não implementado |
| **WAL archive** | Segmentos de write-ahead log | Replay a partir de base física | Só inventário/download |

**Nunca afirmar PITR ativo** nesta versão. Summary usa `pitrStatus`: `PENDING_CONFIGURATION` | `NOT_VALIDATED`.

## Configuração (`server/.env`)

```env
BACKUP_ENABLED=false
BACKUP_DIRECTORY=
BACKUP_RETENTION_DAYS=14
BACKUP_SCHEDULE_CRON=0 2 * * *
# BACKUP_DATABASE_NAME=   # override opcional; default = PGDATABASE / URL
# BACKUP_DATABASE_HOST=
# BACKUP_DATABASE_PORT=
# BACKUP_DATABASE_USER=
BACKUP_FILE_PREFIX=sgp
# BACKUP_WAL_DIRECTORY=
# BACKUP_MAX_DOWNLOAD_SIZE_BYTES=
BACKUP_COMMAND_TIMEOUT_SECONDS=3600
BACKUP_PG_DUMP_PATH=pg_dump
BACKUP_PG_RESTORE_PATH=pg_restore
```

- App **deve** iniciar com `BACKUP_ENABLED=false`.
- Senha: `PGPASSWORD` do `pgPoolConfig` no env do processo filho — **nunca** em argv nem versionada.
- Sem `BACKUP_DIRECTORY` (ou `BACKUP_ENABLED=false`): summary com `configured: false`; endpoints de trigger/download respondem 503.

## Cron (documentação — não instalar automaticamente)

```cron
0 2 * * * /caminho/para/repo/scripts/backup/run-full-backup.sh >> /var/log/sgp-backup.log 2>&1
```

Ou:

```bash
npm run backup:full
# equivalente: npm --prefix server run backup:full
```

O shell script usa `flock`, valida `BACKUP_ENABLED`/`BACKUP_DIRECTORY` e chama o CLI TypeScript.

## Fluxo FULL_LOGICAL

1. Lock de concorrência (409 se já há REQUESTED/RUNNING).
2. Insert REQUESTED → RUNNING.
3. `pg_dump --format=custom` → ficheiro `.tmp`.
4. Rejeitar size ≤ 0; calcular SHA-256.
5. Validar com `pg_restore --list` (**não restaura**). Se falhar → FAILED + INVALID + remove ficheiro.
6. Rename atômico → COMPLETED + VALID.
7. Retenção: remove FULL_LOGICAL SCHEDULED/MANUAL com `finished_at` > N dias; **nunca** remove `PRE_RESTORE_SNAPSHOT` nem o backup recém-criado; marca EXPIRED no catálogo.

Nome: `{PREFIX}_{ENV}_FULL_YYYY-MM-DD_HHmmss.dump`.

## Download seguro

- Só por UUID; exige COMPLETED + VALID + ficheiro existente.
- `realpath` confinado em `BACKUP_DIRECTORY`; symlink escape bloqueado.
- Streaming (`createReadStream` + `pipeline`); `Content-Disposition` com nome sanitizado.
- Auditoria `backup_downloaded`.

## WAL

- Sync lista ficheiros em `BACKUP_WAL_DIRECTORY` com nome compatível (`^[0-9A-F]{24}$` ou `*.history`).
- Path traversal / fora do dir bloqueados; upsert no catálogo.
- **Não** interpreta conteúdo WAL; PITR permanece não validado.

## Restore (bloqueado na V1)

Arquivo: `server/src/modules/backups/restoreGuardrails.ts`.

Pseudocódigo **obrigatório** antes de qualquer restore futuro:

```
1. snapshot = await createPreRestoreSnapshot(...)
2. aguardar snapshot.status === 'COMPLETED' && integrityStatus === 'VALID'
3. await assertPreRestoreSnapshotReady(snapshot)
4. somente então: restaurar em janela controlada (fora do escopo V1)
```

Sem snapshot prévio validado da base atual → `RestoreBlockedError`.

## Limitações V1

- Sem restore pela UI/API.
- Sem base física / PITR operacional.
- Sem instalação automática de cron.
- Sem exclusão manual de backups pela UI (`backups.delete` reservada).
- Sem alteração de settings pela UI (`backups.settings` reservada).
- Um backup por vez (lock).
- Dump de uma database (não `pg_dumpall` de cluster).

## Pendências de governança SUPER_ADMIN

Implementado nesta branch (base segura):

- Permissões `backups.*` e `system_settings.*` só no papel `SUPER_ADMIN` (grant + revoke pós-`0013`).
- Denylist no `PUT` de permissões por papel: papéis ≠ `SUPER_ADMIN` não podem receber `backups.*` / `system_settings.*`.
- Autorização continua baseada em permissões (sem `role === 'SUPER_ADMIN'` bypass).

Ainda pendente (fora do escopo desta V1 — registrar para demanda dedicada):

- Impedir que o sistema fique sem nenhum `SUPER_ADMIN` ativo.
- Impedir que o último `SUPER_ADMIN` remova de si a capacidade de governança (role/perms).
- Auditoria específica de atribuição/remoção do papel `SUPER_ADMIN` (hoje há `role_permissions_updated` e updates de usuário genéricos).
- Remover/neutralizar promoção por e-mail hardcoded em migrations legadas (`0036` / `master@bravo.com.br`) em migration futura dedicada.
- Bootstrap explícito do primeiro `SUPER_ADMIN` (env/comando/operador) sem hardcode.

## Rollback da feature

1. `BACKUP_ENABLED=false` (ou remover `BACKUP_DIRECTORY`).
2. Remover entrada de cron, se houver.
3. Opcional: reverter grants (já só SUPER_ADMIN) / esconder aba via permissões.
4. **Não** é necessário dropar tabelas imediatamente; catálogo pode permanecer.

## Teste local

```bash
# Migration (quando instruído — não executar em shared sem aprovação)
# npm --prefix server run migrate

# Em server/.env (local):
# BACKUP_ENABLED=true
# BACKUP_DIRECTORY=/tmp/sgp-backups

npm --prefix server run backup:full
# UI: /app/configuracoes-operacionais → aba Backups (SUPER_ADMIN)
```

## Futuro em VPS (não executar neste runbook)

- Provisionar diretório dedicado, retenção em disco, monitorização de falhas.
- Cron no host com lock e alertas.
- Base física + archive_command para PITR real (fora do SGP app).
- Janela de restore com snapshot PRE_RESTORE obrigatório.

Não alterar VPS a partir desta documentação sem aprovação humana explícita.
