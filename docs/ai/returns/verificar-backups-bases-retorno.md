# Retorno — verificar-backups-bases

- **TASK_ID:** `verificar-backups-bases`
- **Data/hora:** 2026-10-11 (UTC)
- **Objetivo:** levantar o que existe na branch `develop` relacionado a backup das bases de dados do SGP.
- **Status final:** CONCLUÍDO (análise, sem alteração de código)
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
