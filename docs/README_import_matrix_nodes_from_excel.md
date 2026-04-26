# Importador Excel legado → `matrix_nodes`

Este script lê a aba `ATIVIDADES E APONTAMENTOS` da planilha legada do SGP e grava a árvore tipada:

`ITEM → TASK → SECTOR → ACTIVITY`

## O que ele preserva do DNA do Excel

- ordem original das tarefas pela primeira aparição no Excel
- ordem original dos setores dentro de cada tarefa
- ordem original das atividades dentro de cada setor
- `planned_minutes` a partir de `Tempo Previsto (min)`
- `default_responsible_id` a partir do nome do colaborador em `collaborators.full_name`
- metadados legados em `metadata_json`:
  - arquivo e aba de origem
  - linha original do Excel
  - nome do responsável legado
  - tempo real legado
  - `% conclusão` legado

## Pré-requisitos

- tabela `matrix_nodes` já criada
- tabela `collaborators` já criada
- colunas esperadas em `matrix_nodes`:
  - `id`
  - `parent_id`
  - `root_id`
  - `node_type`
  - `code`
  - `name`
  - `description`
  - `order_index`
  - `level_depth`
  - `is_active`
  - `planned_minutes`
  - `default_responsible_id`
  - `required`
  - `source_key`
  - `metadata_json`
  - `created_at`
  - `updated_at`
  - `deleted_at`
- variáveis de conexão PostgreSQL via `DATABASE_URL` ou `PG*`
- Python com:
  - `openpyxl`
  - `psycopg[binary]` **ou** `psycopg2-binary`

## Instalação rápida

```bash
pip install openpyxl psycopg[binary]
```

## Exemplo de uso

### 1. Dry-run

```bash
python import_matrix_nodes_from_excel.py \
  "Nova Esteira v1.0 - MESTRA - Gol GTI - OS7945.xlsx" \
  --item-code ITEM-CARPETE \
  --item-name "Carpete" \
  --dry-run
```

### 2. Carga real

```bash
export DATABASE_URL="postgresql://sgp_app:senha@localhost:5432/sgp"

python import_matrix_nodes_from_excel.py \
  "Nova Esteira v1.0 - MESTRA - Gol GTI - OS7945.xlsx" \
  --item-code ITEM-CARPETE \
  --item-name "Carpete"
```

### 3. Recarregar substituindo árvore anterior

```bash
python import_matrix_nodes_from_excel.py \
  "Nova Esteira v1.0 - MESTRA - Gol GTI - OS7945.xlsx" \
  --item-code ITEM-CARPETE \
  --item-name "Carpete" \
  --replace-existing
```

## Como o script trata dados ruins do Excel

- linhas sem `TAREFA`, `SETOR` ou `ATIVIDADE` são ignoradas
- `#N/A`, `#N/D`, vazio e similares são tratados como nulos
- se o colaborador legado não existir em `collaborators`, a activity é criada com `default_responsible_id = null` e o script emite warning

## Observações

- o script **não** implementa esteira
- o script **não** move nós entre pais
- o script grava a matriz mestre apenas em `matrix_nodes`
- o script assume que o ITEM raiz será informado via `--item-code` e, idealmente, `--item-name`
