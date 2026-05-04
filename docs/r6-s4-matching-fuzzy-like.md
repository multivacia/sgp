# R6 S4 — Recall textual (ILIKE) + score S3

**Release:** R6 — OS Bravo por Documento + Matching Operacional  
**Sprint:** S4 — Fuzzy/LIKE em base, sem LLM, sem materialização automática

## Objectivo

Melhorar a **recuperação de candidatos** da Matriz **antes** do score final: combinar busca por tokens (ILIKE parametrizado) com o score determinístico da S3. Sem alterar o parser Bravo; sem novos endpoints ou migrations.

## Diferença face à S3

| S3 | S4 |
|----|-----|
| Carregar até ~1200 actividades enriquecidas e pontuar todas para cada serviço | Por **serviceItem**: gerar padrões `%token%` seguros → query **ILIKE ANY** em nome/descrição da actividade, sector e task |
| Blend título+descrição subponderava a descrição | **Blend**: `max(score_título, score_descrição, combinação_linear)` para recuperar casos com título genérico e descrição rica |

## Estratégia de busca

1. **`COUNT(*)`** em `matrix_nodes` (ACTIVITY activas): se **0** → `matching.no_candidates` (consulta OK, Matriz vazia).
2. Por serviço:
   - **`buildIlikePatternsFromService`**: tokenização operacional S3, preferência por termos fortes, até **8** padrões; escape de `%`/`_` (**sem** interpolar SQL cru).
   - **`SQL_MATRIX_ACTIVITY_RECALL_*`**: `ILIKE ANY($1::text[])` sobre `act.name`, `act.description`, `sec.name`, `task.name` (enriquecida); em erro recuperável (42P01/42703/42501) → recall **fallback** só em `matrix_nodes`.
   - **Limite** `MATCH_RECALL_LIMIT` (50) por query — MVP documentado.
3. Se recall devolver **0** linhas ou não houver tokens → **fallback**: mesma carga ampla S2/S3 (`loadMatrixActivityCandidates`, até 1200).
4. **`rankCandidatesForService`** + limiares S3 + **ambientação** S4 nas alternativas.

## Score final

Inalterado nos componentes base (**computeOperationalMatchScore**); mudança apenas no **blend** título/descrição da linha da Matriz.

## alternativeCandidates

Até **3** entradas com `confidence >= MATCH_ALTERNATIVE_MIN_SCORE` (0,45), excluindo lixo de baixa pontuação.

## Comportamento

- **Matriz vazia** → `outcome: no_candidates`; cada linha do plano pode ser `CREATE_NEW` com mensagem coerente.
- **Matriz com dados mas nenhum score ≥ 0,65** → `CREATE_NEW` por serviço, **`outcome.kind: ok`** (não é `no_candidates`).
- **Ambiguidade** S3 mantida (Δ ≤ 0,08).

## Performance

- N queries por ingest = **1 + N × (1 recall ou fallback em cache)**; primeira chamada a lista ampla enche cache por pedido.
- **Índices** em `name`/`description`/`ILIKE`: não criados nesta sprint — avaliar em ops.

## Logs seguros

Com `SGP_DOCUMENT_DRAFT_PIPELINE_FLAGS=1`: `document_draft.matching.recall_summary` com contagens, uso de fallback completo, `durationMs`, amostra de scores — sem texto da OS, cliente ou placa.

## Limitações

- ILIKE não substitui sinónimos fora dos tokens normalizados (sinónimos canónicos continuam na tokenização).
- Limite 50 pode omitir candidatos raros se muitos falsos positivos — aceite MVP.

## Próxima frente (S5)

- Materialização / UX revisão humana / índices DB / refinamento de pesos — conforme roadmap do produto.

## Referência

- S3: `docs/r6-s3-matching-deterministico.md`
