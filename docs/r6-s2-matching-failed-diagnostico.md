# R6 S2 — Matching vs Matriz: diagnóstico e estabilização

**Release:** R6 — OS Bravo por Documento + Matching Operacional  
**Sprint:** S2 — Corrigir `matching.failed` e estabilizar matching com Matriz

## Causa raiz do `matching.failed` (pipeline local)

A query enriquecida em `matchOperationalItems.ts` fazia `LEFT JOIN collaborators c` e seleccionava **`c.name AS "collaboratorName"`**. Na migração real (`0002_auth_and_collaborators.sql`), o campo é **`full_name`**, não `name`. O PostgreSQL devolvia **`42703`** (coluna inexistente), a chamada `pool.query` falhava, o adapter capturava e emitia sempre **`matching.failed`** — mesmo com matriz e dados válidos.

Correcção: usar **`c.full_name`** na query enriquecida.

## Query principal (enriquecida)

- Fonte: `matrix_nodes` com `node_type = 'ACTIVITY'`, `deleted_at IS NULL`, `is_active = true`.
- Hierarquia espelhada em `0003_matrix_nodes.sql`: tipos em **maiúsculas** — `ITEM`, `TASK`, `SECTOR`, `ACTIVITY`.
- Joins: actividade → sector (`SECTOR`) → task (`TASK`); `collaborators` por `default_responsible_id`; primeira equipa via `matrix_node_assignment_teams` + `teams`.

## Fallback mínimo

Se a query enriquecida falhar com erros recuperáveis **`42P01`** (relação inexistente), **`42703`** (coluna inexistente) ou **`42501`** (permissão negada), repete-se uma segunda consulta **só sobre `matrix_nodes`** (sem joins opcionais), devolvendo candidatos sem sector/step/colaborador/equipa. Assim falhas em tabelas auxiliares não derrubam o matching inteiro.

Se ambas falharem ou o erro não for recuperável (ex.: conexão), o resultado é **`matching.failed`** com log estruturado seguro (`stage: document_draft.matching.failed`, sem texto da OS nem PII).

## Códigos de aviso

| Código | Quando |
|--------|--------|
| **`matching.unavailable`** | Sem `pg.Pool` no adapter local (modo sem base). Mensagem: *Matching não disponível neste modo de execução.* |
| **`matching.no_candidates`** | Consulta(s) executaram com sucesso mas **zero linhas** de actividades na matriz (ou só fallback vazio). Não é erro técnico. |
| **`matching.failed`** | Falha técnica ao consultar a base após tentar enriquecida + fallback (quando aplicável). |

**Nota:** Quando existem candidatos na matriz mas a pontuação é baixa para todos os serviços, o plano segue com `CREATE_NEW` por item, **sem** `matching.no_candidates` (há dados de matriz; só não há “match” útil).

## Próximos passos (S3+)

- S3: matching determinístico (normalização, sinónimos, score) — `docs/r6-s3-matching-deterministico.md`.
- S4+: fuzzy / LIKE / score avançado em base.

## Referência cruzada

- Baseline parser Bravo (S1): `docs/r6-s1-parser-bravo-baseline.md`
