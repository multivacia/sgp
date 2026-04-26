# Base de Esteira — Relatório de impacto e decisões fechadas (arquitetura)

Documento de referência para implementação. **Nomenclatura e regras abaixo são definitivas** para o domínio em inglês no PostgreSQL (consistente com `matrix_nodes`, `collaborators`).

---

## 1. Nomenclatura oficial das tabelas

| Objeto | Nome definitivo |
|--------|-----------------|
| Cabeçalho da Base | **`conveyor_bases`** |
| Nós hierárquicos (OPTION → AREA → STEP) | **`conveyor_base_nodes`** |

Não usar nomes em português no DDL nem misturar (`esteira_bases`, etc.) neste domínio.

---

## 2. Alinhamento com Matriz

- A **estrutura** da Base replica a filosofia de **`matrix_nodes`** (`0003_matrix_nodes.sql`): árvore única com `parent_id`, `root_id`, `node_type`, `order_index`, `level_depth`, `metadata_json`, `source_key`, `planned_minutes`, `default_responsible_id` → `collaborators`, soft delete (`deleted_at`), índices por parent/root/tipo/ativo/responsável e composto para leitura ordenada.
- A **adaptação de domínio** é: na Matriz, `ITEM → TASK → SECTOR → ACTIVITY`; na Base de Esteira, **`OPTION → AREA → STEP`** (preset operacional, não biblioteca genérica de matriz).

---

## 3. Versionamento (MVP)

- **`version`** é `INT NOT NULL DEFAULT 1` no cabeçalho (`conveyor_bases`), com **`CHECK (version > 0)`** no DDL.
- **Regra MVP:** uma única linha por base lógica; **edições em base ativa incrementam `version` na mesma linha** (`UPDATE ... SET version = version + 1`, com `updated_at`).
- **Não há** tabela de histórico nem novas linhas por versão no MVP.
- Esteiras já registradas guardam **snapshot** (`base_id`, `code`, `name`, `version`, tipo de origem) no momento do registro — não dependem de versões futuras.

---

## 4. `source_type` e `source_ref_id` (referência polimórfica)

- **`source_ref_id`** é **`UUID NULL` sem FK no banco** — referência **polimórfica** cujo significado é dado por **`source_type`**. A integridade é validada na **camada de aplicação** (service/repository), não por FK múltipla.

| `source_type` | Uso de `source_ref_id` |
|---------------|-------------------------|
| **MANUAL** | `NULL` |
| **MATRIX** | UUID do **ITEM raiz** em `matrix_nodes` (`node_type = 'ITEM'`, `parent_id IS NULL`) |
| **CONVEYOR** | UUID da **esteira de origem** (quando o modelo de esteira persistido existir) |

- Isto evita que o cabeçalho fique semanticamente preso só a `matrix_nodes`, o que seria incorreto para `CONVEYOR`.

---

## 5. Regra oficial de `root_id` (`conveyor_base_nodes`)

- **OPTION:** `root_id = id` do **próprio** nó OPTION.
- **AREA** e **STEP:** `root_id` = **`id` da OPTION raiz** da subárvore (o mesmo valor para todos os nós dessa “opção” de pedido).
- **`root_id` deve sempre identificar um nó OPTION** existente na mesma base (`base_id`); que o nó referenciado seja OPTION e pertença à base é **validado na aplicação** nesta fase (sem constraint SQL complexa).

---

## 6. `code` — cabeçalho e nós (MVP)

- **`conveyor_bases.code`:** opcional (`NULL` permitido). Quando preenchido, é único entre bases não apagadas (`UNIQUE` parcial).
- **`conveyor_base_nodes.code`:** opcional (`NULL` permitido), alinhado a `matrix_nodes.code`.
- **Sem** `UNIQUE` obrigatório por `(base_id, code)` nos nós nesta fase; pode ser avaliado depois.

---

## 7. Checks de sanidade (DDL)

- **Cabeçalho:** `version > 0`.
- **Nós:** `order_index >= 0`, `level_depth >= 0`, `planned_minutes IS NULL OR planned_minutes >= 0`.
- **Hierarquia mínima:** OPTION com `parent_id IS NULL`; AREA e STEP com `parent_id NOT NULL` (como `ITEM` vs restantes em Matriz).
- Regras finas de domínio (**OPTION** só filho AREA, **AREA** só filho STEP, **STEP** sem filhos) permanecem na **aplicação**, como na operation-matrix.

---

## 8. Base aplicada, draft e esteira real

- **Base não é link vivo** para a esteira em operação: ao usar uma Base na Nova Esteira, a **estrutura é copiada para o draft**; o utilizador pode editar à vontade.
- **Registo da esteira** persiste um **snapshot** (identidade da base, versão, origem) na esteira real; alterações futuras na Base **não** alteram esteiras já registadas.

---

## 9. Migration `0004` e estratégia DROP

- O ficheiro **`server/migrations/0004_conveyor_bases_and_nodes.sql`** começa com **`DROP TABLE IF EXISTS`** das tabelas das Bases (nós primeiro, cabeçalho depois), para **recriação limpa** em **desenvolvimento e homologação** nesta fase.
- **É aceitável** enquanto não há dados de produção a preservar nas tabelas das Bases.
- **Em produção futura**, a estratégia deverá ser **incremental** (`ALTER TABLE`, novas migrations sem apagar tabelas inteiras), salvo projetos pontuais de migração de dados.

---

## 10. Migrations de referência

- `server/migrations/0003_matrix_nodes.sql` — referência estrutural.
- `server/migrations/0002_auth_and_collaborators.sql` — FK de `default_responsible_id`.
- Implementação das Bases: **`server/migrations/0004_conveyor_bases_and_nodes.sql`**.
