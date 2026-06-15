# Runbook — Carga de dados produção → desenvolvimento

## 1. Objetivo

Popular a base local **`sgp_dev`** com **dados reais de produção**, mantendo a **estrutura atual do código** (migrations até `0046`).

A produção antiga fica isolada em **`sgp_prod_raw`** (somente leitura). O dump **não** é restaurado diretamente sobre `sgp_dev`.

Fluxo:

```
dump produção (pg_dump custom)
    → pg_restore → sgp_prod_raw
    → migrate → sgp_dev (schema 0046, sem seed.ts)
    → load-prod-to-dev.sql → sgp_dev com dados adaptados
```

---

## 2. Pré-requisitos

| Item | Detalhe |
|------|---------|
| PostgreSQL local | Cliente com `psql`, `pg_restore`, `createdb`, `dropdb` |
| Dump de produção | Ex.: `dump-sgp-202606101819.sql` (formato **custom**, não plain SQL) |
| Node.js | Para rodar migrations do backend |
| Repositório | Branch com migrations `0001`–`0046` |
| Permissões | Superuser ou role com `CREATE EXTENSION`, `postgres_fdw`, `CREATE DATABASE` |
| **Não executar** | `npm run seed`, `seed-production-pins`, `reset_to_initial_state*.sql` |

---

## 3. Restaurar dump em `sgp_prod_raw`

O arquivo de dump analisado é **formato custom** (`PGDMP` no cabeçalho). Use **`pg_restore`**, não `psql -f`.

```bash
# Linux/macOS
createdb sgp_prod_raw
pg_restore -d sgp_prod_raw --no-owner --no-privileges /caminho/para/dump-sgp-202606101819.sql
```

```powershell
# Windows (PowerShell) — ajuste caminhos do binário PostgreSQL se necessário
createdb -U postgres sgp_prod_raw
pg_restore -U postgres -d sgp_prod_raw --no-owner --no-privileges "C:\Users\...\dump-sgp-202606101819.sql"
```

Verificação rápida:

```bash
psql -d sgp_prod_raw -c "SELECT COUNT(*) FROM conveyors;"
psql -d sgp_prod_raw -c "SELECT COUNT(*) FROM collaborators;"
```

**Não altere** `sgp_prod_raw` após restaurar (fonte de leitura).

---

## 4. Recriar `sgp_dev` com schema atual

```bash
dropdb sgp_dev    # somente se puder descartar a base DEV anterior
createdb sgp_dev
```

---

## 5. Rodar migrations em `sgp_dev`

A partir da raiz do repositório:

```bash
cd server
set DATABASE_URL=postgresql://postgres:SENHA@127.0.0.1:5432/sgp_dev   # Windows cmd
# export DATABASE_URL=postgresql://postgres:SENHA@127.0.0.1:5432/sgp_dev  # bash

npm run migrate
```

**Importante:**

- Rode **uma vez** em base vazia.
- **Não** execute `npm run seed` — sobrescreveria usuários e senhas.
- **Não** use `migrate.js` em `sgp_prod_raw`.

Confirme schema:

```bash
psql -d sgp_dev -c "SELECT column_name FROM information_schema.columns WHERE table_name='conveyor_nodes' AND column_name='planned_quantity';"
```

Deve retornar `planned_quantity`.

---

## 6. Executar `scripts/db/load-prod-to-dev.sql`

1. Edite o script e ajuste o **USER MAPPING** do FDW (usuário/senha com acesso a `sgp_prod_raw`):

```sql
CREATE USER MAPPING IF NOT EXISTS FOR CURRENT_USER
  SERVER sgp_prod_raw_srv
  OPTIONS (
    user 'postgres',
    password 'COLOQUE_A_SENHA_AQUI'
  );
```

2. Execute conectado a **`sgp_dev`**:

```bash
psql -d sgp_dev -v ON_ERROR_STOP=1 -f scripts/db/load-prod-to-dev.sql
```

O script:

- Valida preflight (`sgp_dev`, existência de `sgp_prod_raw`, colunas 0043+).
- Cria `postgres_fdw` → schema `prod_raw`.
- `TRUNCATE` dados em `sgp_dev` (preserva schema).
- Copia **32 tabelas** com mapeamento explícito de colunas.
- Converte status legado de esteiras.
- Preenche colunas novas (`planned_quantity`, `executed_quantity`, etc.).
- Reconcilia permissões/settings das migrations 0016/0019/0036/0037.
- `COMMIT` e em seguida roda SELECTs de validação.

---

## 7. Validar contagens

Compare contagens entre origem e destino:

```bash
psql -d sgp_prod_raw -c "
SELECT 'collaborators' AS t, COUNT(*) FROM collaborators
UNION ALL SELECT 'conveyors', COUNT(*) FROM conveyors
UNION ALL SELECT 'conveyor_nodes', COUNT(*) FROM conveyor_nodes
UNION ALL SELECT 'conveyor_time_entries', COUNT(*) FROM conveyor_time_entries
UNION ALL SELECT 'matrix_nodes', COUNT(*) FROM matrix_nodes
ORDER BY 1;
"

psql -d sgp_dev -c "
SELECT 'collaborators' AS t, COUNT(*) FROM collaborators
UNION ALL SELECT 'conveyors', COUNT(*) FROM conveyors
UNION ALL SELECT 'conveyor_nodes', COUNT(*) FROM conveyor_nodes
UNION ALL SELECT 'conveyor_time_entries', COUNT(*) FROM conveyor_time_entries
UNION ALL SELECT 'matrix_nodes', COUNT(*) FROM matrix_nodes
ORDER BY 1;
"
```

Os totais devem coincidir (exceto tabelas que estavam vazias em prod).

---

## 8. Validar FKs órfãs

O final de `load-prod-to-dev.sql` já inclui queries. Todas devem retornar **0**:

- `orphan_conveyor_nodes`
- `orphan_time_entries_node`
- `orphan_time_entries_collaborator`
- `orphan_step_parent`
- `orphan_work_plan_conveyor_link`

Ou execute manualmente:

```sql
SELECT COUNT(*) FROM conveyor_time_entries te
LEFT JOIN conveyor_nodes cn ON cn.id = te.conveyor_node_id
WHERE cn.id IS NULL;
```

---

## 9. Validar status convertidos

```sql
-- Deve retornar 0 linhas
SELECT operational_status, COUNT(*)
FROM conveyors
WHERE operational_status IN ('NO_BACKLOG','EM_REVISAO','PRONTA_LIBERAR','EM_PRODUCAO','CONCLUIDA')
GROUP BY 1;

-- Distribuição esperada (novos status)
SELECT operational_status, COUNT(*)
FROM conveyors
WHERE deleted_at IS NULL
GROUP BY 1
ORDER BY 2 DESC;
```

Mapeamento aplicado na carga:

| Legado (prod) | Novo (dev) |
|---------------|------------|
| `NO_BACKLOG` | `EM_ELABORACAO` |
| `EM_REVISAO` | `AGUARDANDO_PLANEJAMENTO` |
| `PRONTA_LIBERAR` | `A_INICIAR` |
| `EM_PRODUCAO` | `EM_ANDAMENTO` |
| `CONCLUIDA` | `FINALIZADA` |

Status de atividades (STEP) **não** são convertidos — já compatíveis.

---

## 10. Subir o sistema local apontando para `sgp_dev`

**Backend** (`server/.env` ou variáveis):

```env
DATABASE_URL=postgresql://postgres:SENHA@127.0.0.1:5432/sgp_dev
```

**Frontend** (`.env` local):

```env
VITE_API_BASE_URL=http://localhost:3334/api/v1
```

Terminal 1:

```bash
cd server && npm run dev
```

Terminal 2:

```bash
npm run dev
```

Login: use credenciais de **usuários reais copiados de produção** (não as do `seed.ts`).

---

## 11. Checklist manual nas telas

| Tela | O que verificar |
|------|-----------------|
| **Login** | Usuário de prod autentica; permissões corretas |
| **Colaboradores** | Lista e contagem batem com prod |
| **Matrizes** | Árvore ITEM→TASK→SECTOR→ACTIVITY intacta |
| **Detalhe de esteira** | Estrutura, assignees, status **novos** (ex.: `EM_ANDAMENTO`) |
| **Planejamento semanal** | Planos publicados, itens, encaixe com plano da esteira |
| **Produção / Kiosk** | PIN funciona se credenciais foram copiadas (`collaborator_production_credentials`) |
| **Apontamentos** | Histórico de `conveyor_time_entries`, minutos, fora-de-sequência |
| **Evolução das esteiras** | Relatório carrega; `planned_quantity=1` nos nós |
| **Dashboard** | KPIs sem erro 500 |
| **Backlog** | Esteiras listadas com pipeline novo |

---

## 12. Plano de rollback local

Se a carga falhar ou os dados ficarem inconsistentes:

1. **Manter intactos:** dump original, `sgp_prod_raw`, produção remota.
2. **Descartar apenas `sgp_dev`:**
   ```bash
   dropdb sgp_dev
   createdb sgp_dev
   cd server && npm run migrate
   ```
3. Corrigir causa (credencial FDW, erro de FK, etc.) e reexecutar `load-prod-to-dev.sql`.
4. **Nunca** restaurar o dump custom diretamente sobre `sgp_dev`.
5. **Nunca** rodar `docker compose down -v` se Postgres estiver em Docker com volumes compartilhados — preferir `dropdb`/`createdb` cirúrgico.

---

## Referências

- Script de carga: [`scripts/db/load-prod-to-dev.sql`](../../scripts/db/load-prod-to-dev.sql)
- Migrations: [`server/migrations/`](../../server/migrations/)
- Backup (orientação geral): [`docs/backup-bases.md`](../backup-bases.md)
