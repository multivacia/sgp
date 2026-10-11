# Retorno — backup-restore-fase1

- **TASK_ID:** `backup-restore-fase1`
- **Data/hora:** 2026-10-11 (UTC)
- **Objetivo:** implementar a spec `docs/specs/backup-restore-fase1-spec.md` (scripts operacionais de backup/restore PostgreSQL + cópia Windows + runbook).
- **Status final:** IMPLEMENTADO e VALIDADO; commit/push na branch e PR para `develop` (sem merge).
- **Branch:** `ccr-9273502a-59u7mt`
- **SHA inicial:** `39194e6` (no início da sessão); HEAD passou a `7a35799` (commit da spec, feito fora desta implementação).
- **SHA final:** commit `feat(db): scripts de backup/restore...` desta branch (ver PR).

## Relatório de implementação

### Spec atendida
`docs/specs/backup-restore-fase1-spec.md` — Fase 1: scripts versionados de backup/restore e cópia on-premise Windows.

### Alterações feitas
Criados (todos novos):
- `scripts/db/backup.env.example`
- `scripts/db/lib/backup-common.sh`
- `scripts/db/backup-db.sh`
- `scripts/db/list-backups.sh`
- `scripts/db/restore-db.sh`
- `scripts/db/windows/pull-backups.ps1`
- `scripts/db/windows/pull-backups.config.example.psd1`
- `scripts/db/windows/test-restore.ps1`
- `docs/runbooks/backup-restore-postgresql.md`
- `docs/ai/returns/backup-restore-fase1-retorno.md` (este arquivo)

Alterado:
- `docs/backup-bases.md` — nota no topo apontando para o runbook novo (restante intacto).

Nada em `src/`, `server/`, `.github/` ou `server/migrations/`.

### Critérios de aceite
| Critério | Atendido? | Onde / evidência |
|---|---|---|
| 1. `shellcheck` sem erros; `bash -n` ok | Sim | `shellcheck -x` exit 0 nos 4 `.sh`; `bash -n` exit 0 |
| 2. PowerShell sem erros de parse | Sim | `Parser::ParseFile` sem erros nos 2 `.ps1` e no `.psd1` (pwsh 7.4) |
| 3. Backup gera 4 arquivos, manifesto válido (`jq`), sha256 confere, retenção só no padrão próprio | Sim | Teste de fumaça (PostgreSQL 16 local): 11 checks PASS |
| 4. Restore: confirmação errada não altera; correta troca, mantém `_old`, registra log; `--undo` volta | Sim | 15 checks PASS (restore + undo) |
| 5. Falha após `pm2 stop` desfaz renames e reinicia processo | Sim | Health falhando após as duas renomeações e `pm2 stop` falhando: 4 checks PASS |
| 6. `list-backups.sh --json` válido incluindo `.dump` legado | Sim | 4 checks PASS; JSON idêntico com e sem `jq` no PATH |
| 7. Nada fora de `scripts/db/`, `docs/runbooks/`, `docs/backup-bases.md`, `docs/specs/`, `docs/ai/` | Sim | `git status --short` |

### Evidência reexecutável
- `git diff`: só `docs/backup-bases.md` (+2 linhas); demais arquivos são novos (untracked).
- `shellcheck -x backup-db.sh list-backups.sh restore-db.sh lib/backup-common.sh`: exit 0.
- `bash -n` (4 arquivos): exit 0.
- Parse pwsh: `pull-backups.ps1`, `test-restore.ps1`, `pull-backups.config.example.psd1` — nenhum erro.
- Teste de fumaça (script fora do repo, no scratchpad da sessão: `smoke.sh`): `PASS=34 FAIL=0`, exit 0.
- Testes extras: fallback de globals `--no-role-passwords` (role sem `pg_read_all_data`); alerta por e-mail (stub de sendmail) com `PG_BIN_DIR` inválido; lock ocupado → falha; dump sem tabelas → aborta e remove a temporária; sha256 corrompido → aborta; `VERSION_URL` (`/api/v1/version`) com e sem `jq`; `Invoke-BackupRetention` (DryRun/WhatIf/real, 30 diários + 12 mensais, adhoc 0/90); `pull-backups.ps1` com stub de `sftp` (download, `.part`, SHA256 divergente → apaga e alerta, exit 1); `test-restore.ps1` contra o PostgreSQL local (sucesso e sha divergente → exit 1).
- `npm run lint`: **exit 2 — FALHA AMBIENTAL**: `node_modules` ausente no container (ERR_MODULE_NOT_FOUND). Nenhum arquivo TS/JS alterado.
- `tsc -b`: **exit 1 — FALHA AMBIENTAL**: tipos `node` não instalados (mesma causa).
- `npm test` / `npm run server:test`: **não executados** (dependências não instaladas; nenhuma alteração em código da aplicação).

### Migrations
Nenhuma.

## Decisões técnicas
- **Lock reentrante:** quem obtém o `flock` exporta `SGP_BACKUP_LOCK_HELD=<PID>`; o `backup-db.sh` só herda o lock se o valor for igual ao seu `PPID` (filho direto do restore).
- **`HEALTH_TIMEOUT_SECONDS`** (padrão 60): variável a mais que a lista da spec, para o "até ~60 s" ser configurável (usado no teste com 4–6 s).
- **`VERSION_URL`/`HEALTH_URL`:** a API real expõe `/api/v1/version` e `/api/v1/health` (código em `server/src/app.ts`); a spec cita `/api/version` como exemplo. Documentado com `/api/v1/...`. Formato da versão: `"<version> (<commit>)"`; fallback `git <sha>`; senão `desconhecida`.
- **`jq` opcional na VPS:** manifestos e JSON são gerados em bash; leitura usa `jq` se existir, senão extração simples (testada: saída idêntica).
- **Rollback:** após rollback completo, a base temporária `<alvo>_restore_<ts>` é removida; se o rollback for incompleto, nada é removido e o log registra `falha-rollback-incompleto`.
- **Log JSONL:** também registra tentativas canceladas (`cancelado`), além de `sucesso`, `falha`, `falha-revertida`.
- **`pull-backups.ps1` usa `ls -l`** (e não `ls -1`) porque precisa do tamanho remoto para "baixar se tamanho diferente". Continua somente leitura.
- **`test-restore.ps1`** usa `--no-owner --no-privileges` (roles da VPS podem não existir no Windows) e lê o mesmo `.psd1` do pull (chaves `PgBinDir`, `PgHost`, `PgPort`, `PgUser`).
- **SFTP chroot:** o runbook usa `/srv/sgp-pull` com *bind mounts* somente leitura de `local/` e `adhoc/` + ACL, para não trocar o dono de `/opt/sgp` (usado pelo deploy).
- **Retenção:** pelo timestamp do nome; o padrão `<db>_<daily|adhoc|pre-restore>_<AAAAMMDD>_<HHMMSS>[_N]` não casa com o nome do `backup-sgp.sh` legado, desde que esse nome não use o mesmo formato (o conteúdo do script legado não foi visto).

## Pendências, riscos e ressalvas
- Testado em PostgreSQL **16** (container), não 18; nenhum recurso específico do 18 é usado.
- `pull-backups.ps1` não foi testado contra um servidor SSH real (não há OpenSSH no container); o fluxo foi exercitado com stub de `sftp` em pwsh 7 no Linux. PowerShell 5.1/Windows não foi executado (só parse em pwsh 7.4).
- Caminho de rollback "segunda renomeação falha" não foi forçado em teste (a primeira renomeação + health e pm2 stop foram).
- O nome real dos arquivos do `backup-sgp.sh` legado não é conhecido; confirmar que não segue `<db>_daily_<AAAAMMDD>_<HHMMSS>`.
- Restore em produção real e troca do cron dependem de validação humana (runbook, seção 3.7).
- `SESSION_CHECKPOINT.md` não atualizado (sem troca de sessão).

## Próximo passo recomendado
Revisão (`sgp-test-reviewer`), depois commit/PR; em seguida instalar na VPS seguindo o runbook, rodando lado a lado com o `backup-sgp.sh`.

## Ambiente de teste
Base de teste, roles (`sgp_backup`, `sgp_app`, `sgp_bk2`) e senha temporária do `postgres` foram removidas do PostgreSQL local ao final. Arquivos de teste ficaram só no scratchpad da sessão, fora do repositório.

## Estado final do `git status --short`
```
 M docs/backup-bases.md
?? docs/ai/returns/backup-restore-fase1-retorno.md
?? docs/runbooks/backup-restore-postgresql.md
?? scripts/db/backup-db.sh
?? scripts/db/backup.env.example
?? scripts/db/lib/
?? scripts/db/list-backups.sh
?? scripts/db/restore-db.sh
?? scripts/db/windows/
```
(`docs/specs/backup-restore-fase1-spec.md` já estava commitado em `7a35799`.)

## Commit/push/PR
Não realizados (sem autorização). Este retorno existe só localmente, ainda não publicado.

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.

## Validação independente (sessão principal, após o implementer)

- `shellcheck -x` nos 4 scripts bash: exit 0. `bash -n`: ok.
- Parse PowerShell (pwsh 7.4) dos 2 `.ps1` e do `.psd1`: sem erros.
- Teste de fumaça reexecutado no PostgreSQL 16 local: `PASS=34 FAIL=0`, exit 0.
- Revisão manual de `restore-db.sh` (troca/rollback): `ON_ERROR_STOP=1` em todo `psql`; rollback desfaz renames em ordem inversa; base temporária só é removida com rollback completo. Sem achados bloqueantes.

## Pendências para produção (validação humana)
1. Confirmar que os nomes de arquivo do `backup-sgp.sh` legado **não** seguem `<db>_<daily|adhoc|pre-restore>_<AAAAMMDD>_<HHMMSS>` (senão a retenção nova os alcançaria).
2. Executar no PG 18 da VPS: primeiro `backup-db.sh --type adhoc`, depois restore de teste com `--target-db` de teste incluída em `ALLOWED_TARGET_DBS` (nunca primeiro em `sgp_prod`).
3. Configurar MTA (`msmtp`) e testar e-mail de alerta.
4. Windows: instalar OpenSSH client/PostgreSQL 18 client, criar usuário SFTP somente leitura na VPS, testar `pull-backups.ps1` e `test-restore.ps1` com PowerShell 5.1 real.
5. Só após 1–4, avaliar troca do cron `backup-sgp.sh` pelo `backup-db.sh --type daily`.
