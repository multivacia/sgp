# R6 — S9.1 Refino de matching por TASK / macroestrutura da Matriz

## Problema identificado

Serviços da OS Bravo com forte correspondência **macro** (família “LATERAL TRASEIRA”, “OMBREIRA”, “TAMPA TRASEIRA”, “FORROS DE PORTAS”) caíam em `CREATE_NEW` com mensagem do tipo “Nenhuma atividade da Matriz atingiu similaridade mínima”, porque o pipeline privilegiava **folhas (ACTIVITY)** com score médio e não recuperava ou não pontuava bem **TASKs** com estrutura reaproveitável.

## Diferença ACTIVITY vs TASK

| Aspecto | ACTIVITY | TASK |
|--------|----------|------|
| Uso típico | Reaproveitar uma etapa pontual da OS | Reaproveitar **pacote** de setores/etapas (`MATRIX_SUBTREE`) |
| Recall S4 | ILIKE em nome/descrição de atividade + setor + task da hierarquia | **Recall direto** `SQL_MATRIX_TASK_RECALL_ENRICHED`: nome/descrição da TASK + preview das folhas |
| Score | Limiar global 0,65 revisão / 0,85 reuse | Camada macro (`applyMacroTaskScoreLayer`), gate estrutural (`taskMacroStructuralGate`), limiares dedicados: revisão a partir de **0,58**, reuse a partir de **0,72** |

## Regras principais (sem LLM)

1. **Recall direto de TASK**: mesmos padrões ILIKE dos tokens do serviço; inclui agregados (`descendantActivitiesCount`, `plannedMinutes`, preview textual).
2. **Sinónimos / plural**: mapas em `TOKEN_CANONICAL` + `expandOperationalSynonyms` (ex.: lateral+traseira → laterais/traseiras; lateral+porta → forro/forros; tampão → tampa/tampao).
3. **Gate estrutural**: não promover TASK só com termos genéricos (`revestimento`, `troca`, `acabamento` isolados); é preciso termo **estrutural** alinhado (`MACRO_STRUCTURAL_TERM_SET`).
4. **Antes de CREATE_NEW**: se nenhuma ACTIVITY passa no limiar global mas uma TASK passa no gate com score ≥ **0,58**, o plano deve ser `REVIEW_SIMILAR` ou `REUSE_EXISTING` (≥ **0,72**), com `reusedStructure.kind = MATRIX_SUBTREE` quando aplicável.
5. **Alternativas em CREATE_NEW**: candidatos com score ≥ **0,45** entram em `alternativeCandidates` para revisão humana (`MATCH_ALTERNATIVE_MIN_SCORE`).

## Diagnóstico (`SGP_DOCUMENT_DRAFT_PIPELINE_FLAGS=1`)

Logs `console.info` no estágio `document_draft.matching.hierarchical_summary` por item: índice, scores, contagens por tipo de nó, top TASKs, flags de reorder macro. Sem cliente, placa, PDF ou dados financeiros.

## UX (painel de revisão)

- `suggestedAction === CREATE_NEW` → **não** mostrar “Aceitar sugestão” (`shouldShowAcceptSuggestedButton`).
- Com `alternativeCandidates`, continuar mostrando “Escolher alternativa”, “Criar como novo item”, “Ignorar item”.

## Exemplos de domínio

| Serviço OS (trecho) | TASK esperada na Matriz |
|---------------------|-------------------------|
| LATERAL TRASEIRA … TROCAR TECIDO | `10 - LATERAIS TRASEIRAS` |
| OMBREIRA DIANTEIRA/TRASEIRA … REVESTIMENTO | `11 - OMBREIRA` |
| ACABAMENTO DA TAMPA TRASEIRA … COURVIN / TAMPÃO | `9 - TAMPA TRASEIRA` |
| LATERAL DE PORTA | `12 - FORROS DE PORTAS` |

## Limitações

- Pontuação continua determinística e lexicais; homónimos exigem revisão (`REVIEW_SIMILAR`).
- `MATRIX_SUBTREE` materializada depende das folhas presentes no **pool** carregado para aquele request; contagens agregadas na TASK podem vir do recall SQL mesmo quando o pool tem menos folhas.

## Critérios não alterados nesta sprint

Sem LLM, endpoint novo, migration, mudança no parser Bravo, financeiro/LGPD ou criação automática de nós na Matriz.
