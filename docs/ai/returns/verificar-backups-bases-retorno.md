# Retorno — verificar-backups-bases

- **TASK_ID:** `verificar-backups-bases`
- **Data/hora:** 2026-10-11 (UTC)
- **Objetivo:** levantar o que existe na branch `develop` relacionado a backup das bases de dados do SGP.
- **Status final:** CONCLUÍDO (análise, sem alteração de código) — atualizado com a configuração do servidor
- **Branch de trabalho:** `ccr-9273502a-59u7mt`
- **Ref analisada:** `origin/develop` @ `b3416c1`
- **SHA inicial (branch de trabalho):** `c611d10`
- **SHA final:** ver commit que adiciona este arquivo

## Resumo do que existe na `develop`

### 1. Backup lógico do cluster PostgreSQL (único mecanismo de backup de banco)
| Arquivo | Função |
|---|---|
| `docs/backup-bases.md` | Documentação do fluxo: pré-requisitos, variáveis, credenciais, validação, restore básico, limitações |
| `scripts/db/backup_all_databases.sh` | Bash: roda `pg_dumpall -f` → um `.sql` plain com globals (roles) + todas as databases |
| `scripts/db/backup_all_databases.ps1` | Equivalente em PowerShell (Windows) |
| `scripts/sql/list_databases_precheck.sql` | Só inspeção (lista `pg_database`), não faz backup |

Características dos scripts:
- Nome: `{prefix}backup_all_databases_{label}_YYYYMMDD_HHMMSS.sql`; nunca sobrescreve (sufixo `_1`, `_2`…).
- Configuração por `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGSSLMODE` ou `.pgpass`; `BACKUP_OUTPUT_DIR`, `BACKUP_FILE_PREFIX`, `BACKUP_HOST_LABEL`, `BACKUP_ENV_LABEL`.
- Validam presença de `pg_dumpall`, exit code e tamanho > 0.
- **Execução manual** — não há agendamento.

Fora do escopo declarado pela própria doc: backup físico, PITR/WAL, replicação/HA, **retenção/rotação**, **restore automatizado**, compressão e criptografia do arquivo (o `.sql` fica em texto puro).

### 2. Backups citados em outros fluxos
- `.github/workflows/deploy-hml.yml` e `deploy-hostgator-vps.yml`: fazem `rsync` **apenas do frontend** para `/opt/sgp/backups/frontend-*-before-deploy-<ts>` antes de publicar. **Não fazem backup de banco.**
- `docs/deploy-automatico-argos-ec2.md`: `migrate_on_deploy` padrão `0`; só habilitar "com backup/plano compatível" (orientação, sem automação).
- `docs/reset-base-inicial.md` e `docs/setup_inicial.md`: exigem backup manual (`pg_dump`) antes do reset destrutivo.
- `docs/runbooks/load-prod-data-into-dev.md` + `scripts/db/load-prod-to-dev.sql`: **restore** de um dump de produção (formato custom, ex. `dump-sgp-202606101819.sql`) em `sgp_prod_raw` via `pg_restore`, e carga adaptada para `sgp_dev`. O dump em si **não** está no repositório.

### 3. O que NÃO existe
- Nenhum arquivo de dump/backup versionado (`.sql.gz`, `.dump`, `.bak`); `.gitignore` ignora `scripts/db/*.local.sql`.
- Nenhum workflow agendado (`schedule`/`cron`) de backup de banco nos workflows (`deploy-hml`, `deploy-hostgator-vps`, `verify-deploy`, `legacy/deploy-ec2.yml.disabled`).
- Nenhuma política de retenção, envio off-site (S3 etc.) ou teste periódico de restore.
- Nenhum backup de banco automático antes de migrations no deploy.

## Atualização — configuração real no servidor (informada pelo usuário em 2026-10-11)

Existe backup automático **fora do repositório**, na VPS HostGator:

| Item | Configuração |
|---|---|
| Banco | `sgp_prod` (PostgreSQL 18, porta 5433) |
| Agendamento | cron `30 2 * * *` (diário, 02h30) |
| Script | `/opt/sgp/backup-sgp.sh` (**não versionado** no repositório) |
| Destino | `/opt/sgp/backups/local/` |
| Retenção | remove arquivos com mais de 14 dias |
| Formato | `.dump` (formato custom do `pg_dump`, restaurável com `pg_restore`) |

Isso corrige a conclusão anterior "não há backup automático": há, no servidor; o repositório só não o registra.
Fonte: informação humana; o conteúdo do script e o crontab **não foram vistos** por esta análise.

### Lacunas que permanecem
1. **Sem cópia fora da VPS** — backup e banco no mesmo servidor; perda/comprometimento da VPS leva os dois. Principal risco.
2. **Script não versionado** — `/opt/sgp/backup-sgp.sh` só existe no servidor; sem revisão nem recuperação se a VPS for perdida.
3. **Sem monitoramento/alerta** — falha do cron passa despercebida; recomendado alerta e checagem de tamanho > 0 / `pg_restore --list`.
4. **Sem teste periódico de restore** — conferir pelo menos mensalmente (o runbook `load-prod-data-into-dev.md` já mostra um fluxo de restore em base isolada).
5. **Só `sgp_prod`** — base de HML (`/opt/sgp/sgp-homol`) e globals do cluster (roles/senhas, que o `pg_dump` de uma base não inclui) não aparecem cobertos.
6. **Sem backup imediato antes de migrations** no deploy (`migrate_on_deploy=1`); o último backup pode ter até ~24h.
7. **Versão do cliente** — porta 5433 sugere mais de um cluster na VPS; o `pg_dump` usado pelo script precisa ser da versão 18 (cliente mais antigo falha contra servidor 18). Verificar com `pg_dump --version` no caminho usado pelo script.
8. **Backups de frontend** dos deploys ficam em `/opt/sgp/backups/frontend-*` (fora de `local/`); se a limpeza de 14 dias atua só em `local/`, esses acumulam sem rotação.
9. **Documentação divergente** — `docs/backup-bases.md` descreve só o `pg_dumpall` manual em `.sql`; não cita o backup diário em `.dump`.

### Próximo passo recomendado (requer decisão humana)
- Enviar o conteúdo de `/opt/sgp/backup-sgp.sh` (sem senhas) e a linha do crontab para versionar em `scripts/db/` e documentar em `docs/backup-bases.md`.
- Definir destino off-site (ex.: bucket S3/Backblaze/Google Drive via `rclone`) com retenção própria.

## Atualização 2 — sugestões para backup esporádico, restore e cópia on-premise (2026-10-11)

Decisão humana: manter backup na VPS **e** em servidor on-premise do cliente. Fontes ficam no GitHub; alvo é só PostgreSQL.
Status: **proposta, nada implementado** — aguardando aprovação.

Achado no código: `server/src/scripts/migrate.ts` executa todos os `.sql` a cada execução e **não há tabela de controle de migrations**. Um `.dump` não registra a versão do schema → cada backup precisa de manifesto com o SHA/tag da aplicação publicada.

### Cópia on-premise
- Modelo **pull**: o servidor on-premise busca da VPS (`rsync` via SSH com chave restrita, `command=`/`rrsync` read-only em `/opt/sgp/backups/`). VPS comprometida não consegue apagar a cópia on-premise; dispensa abrir porta no cliente.
- Agendar após o backup (ex.: 03h30), verificar `sha256` e `pg_restore --list` no destino.
- Retenção própria maior (sugestão: 30 diários + 12 mensais); criptografar em repouso (`age`/`gpg`) — dump contém dados pessoais (LGPD).

### Backup esporádico (sob demanda)
- Script versionado `scripts/db/backup-adhoc.sh` com motivo obrigatório (ex.: `pre-migration`, `pre-reset`, `manual`).
- Gera: `pg_dump -Fc` da base escolhida + `pg_dumpall --globals-only` (roles) + `manifest.txt` (data, operador, motivo, base, versão do servidor, SHA/tag publicado, sha256).
- Destino separado `/opt/sgp/backups/adhoc/`, **fora** da limpeza de 14 dias (retenção manual ou 90 dias); sincronizado também ao on-premise.
- Binário explícito do PG 18 (ex.: `/usr/lib/postgresql/18/bin/pg_dump`), porta 5433.
- Usuário de backup dedicado com `pg_read_all_data` (não superuser), senha em `~/.pgpass` 600.
- Disparo: manual via SSH e/ou workflow `workflow_dispatch` "backup-db"; chamado automaticamente no deploy quando `migrate_on_deploy=1` (falha no backup aborta o deploy).

### Restore
- Script versionado `scripts/db/restore-db.sh`, com confirmação explícita digitando o nome da base.
- Padrão seguro: restaurar em base nova (`sgp_restore_YYYYMMDD`) com `pg_restore -j N`, validar (contagens, login, telas principais) e só então trocar:
  1. parar `sgp-api`; 2. backup ad hoc da base atual; 3. `ALTER DATABASE sgp_prod RENAME TO sgp_prod_old_<ts>` e `sgp_restore_... RENAME TO sgp_prod`; 4. subir `sgp-api`; 5. manter `_old` por alguns dias.
- Rollback = renomear de volta (rápido, sem novo restore).
- Conferir que o código publicado corresponde ao SHA do manifesto; se não, publicar a release correspondente ou rodar `migrate` (migrations precisam ser idempotentes).
- Teste mensal de restore no servidor on-premise (serve também para validar a cópia).

### Perguntas em aberto
- On-premise: SO (Linux/Windows), se alcança a VPS por SSH, espaço disponível.
- Restore só em produção ou também HML ← produção (já há runbook para DEV).
- Disparo do esporádico via GitHub Actions é desejado?

## Riscos / ressalvas
- Backup de banco depende inteiramente de execução manual; se ninguém rodar, não há cópia.
- Backups de frontend em `/opt/sgp/backups/` crescem sem rotação (inferido pelo workflow; não verificado no servidor).
- Clone é raso (`shallow`); datas de introdução dos arquivos no histórico não são confiáveis.
- Não foi possível verificar o estado real dos servidores (crons do SO, snapshots do provedor/VPS) — fora do repositório.

## Próximo passo recomendado (se desejado, requer decisão humana)
Automatizar backup diário do banco de produção/HML (cron na VPS ou workflow agendado) com compressão, retenção e cópia off-site, e um backup automático antes de `migrate_on_deploy=1`.

## Arquivos
- Criado: `docs/ai/returns/verificar-backups-bases-retorno.md`
- Nenhum código alterado. Migrations envolvidas: nenhuma.

## Validação executada
- `git fetch origin develop`; `git ls-tree -r origin/develop | grep -iE 'backup|dump|restore'`; `git grep -il 'backup|pg_dump|pg_restore' origin/develop`; leitura dos arquivos listados.
- Build/lint/testes: não aplicável (análise sem alteração de código).

## Git
- `git status` final: limpo após commit.
- Commit/push: na branch `ccr-9273502a-59u7mt`. Sem PR.

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
