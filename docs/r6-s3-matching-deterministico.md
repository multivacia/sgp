# R6 S3 — Matching determinístico (Camada 1) com a Matriz

**Release:** R6 — OS Bravo por Documento + Matching Operacional  
**Sprint:** S3 — Score textual auditável, sinónimos, limiares, sem LLM

## Objectivo

Melhorar a qualidade do **matching operacional** entre `serviceItems` extraídos da OS Bravo e atividades existentes em `matrix_nodes`, com heurística **explicável**, **determinística** e **testável**. Sem materialização automática de esteira/atividade; revisão humana mantém-se obrigatória no fluxo de produto.

## Normalização

- `normalizeOperationalText`: NFD, minúsculas, `porta-malas` → `porta malas`, remoção de pontuação fraca, remoção de códigos numéricos curtos (3–5 dígitos).
- `tokenizeOperationalText`: *stopwords* operacionais (ex.: de, com, completo, par, jogo, original, padrão), *noise* de veículo (gti, gol, vw, laguna, …), *sinónimos* canónicos (`revestir`→`revestimento`, `trocar`→`troca`, `aço`→`aco`, …), agregação do bigrama **`porta`+`malas` → `porta malas`**.

## Sinónimos (mapa canónico)

Mapeamento por token (expansão controlada, sem explosão combinatória). Exemplos: `revestir`/`tapeçar` → `revestimento`; `trocar`/`troca` → `troca`; `courvim` → `courvin`; `reforma` → `reparo`.

## Score (0–1)

Componentes combinados de forma explícita:

1. **Jaccard** e **coeficiente de sobreposição** sobre *tokens* alinhados.
2. **Termos fortes** coincidentes (intersecção com lista forte: banco, recaro, ombreira, lateral, courvin, troca, …).
3. **Bónus de frases** quando **ambos** os textos normalizados evidenciam combinações (ex.: `banco`+`recaro`, `volante`+`couro`, `ombreira`+`dianteira`, `troca`+`tecido`, `cabo`+`aco`, `tampa`+`traseira`, `revestimento`+`courvin`, …), com tecto global.
4. **Penalização de genérico** se o título do candidato na Matriz for só termos genéricos (`revestimento`, `troca`, …) sem suporte específico — evita **REUSE_EXISTING** indevido.
5. **Sanidade de comprimento**: penalização leve quando há muitos *tokens* na OS mas pouca intersecção com candidato muito curto.

Combinação com descrição da atividade na Matriz (quando existe):  
`max(score_activity, score_activity * 0.82 + score_description * 0.18)`.

Constantes exportadas: `MATCH_THRESHOLD_REUSE` (0,85), `MATCH_THRESHOLD_REVIEW` (0,65), `MATCH_AMBIGUITY_MAX_GAP` (0,08).

## Limiares e acções

| Score | Acção |
|--------|--------|
| ≥ 0,85 | `REUSE_EXISTING` (se não houver ambiguidade) |
| ≥ 0,65 e < 0,85 | `REVIEW_SIMILAR` |
| < 0,65 | `CREATE_NEW` |

**Ambiguidade:** se o 2.º melhor candidato tiver score ≥ 0,65 e **|top1 − top2| ≤ 0,08** → `REVIEW_SIMILAR` (mesmo que o 1.º ≥ 0,85).

## `matchReason`

Mensagens orientadas a revisão: alta similaridade com termos; similaridade moderada; candidatos próximos (Δ); ou ausência de similaridade mínima, com indicação do melhor score observado.

## Candidatos alternativos (opcional)

Até **3** entradas em `alternativeCandidates` (extensão do item do `matchingPlan` no schema), com `matrixNodeId`, `activity`, `sector`, `step`, `plannedMinutes`, `confidence` e `matchReason` curto.

## Limitações (S3)

- Sem fuzzy SQL, sem LLM, sem semântica distributiva.
- Sinónimos são **fechados**; novos padrões exigem alteração de código e testes.
- Dados financeiros/LGPD não entram no matching (continuam filtrados *upstream*).

## Evolução (S4)

- Recall ILIKE + blend título/descrição: `docs/r6-s4-matching-fuzzy-like.md`

## Próximos passos (S5+)

- Índices / refinamento de pesos / UX de revisão — conforme roadmap.

## Referência

- S2 (erro de query / warnings): `docs/r6-s2-matching-failed-diagnostico.md`
