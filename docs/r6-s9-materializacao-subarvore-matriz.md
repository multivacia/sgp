# R6 — Sprint S9 — Materialização de subárvore da Matriz

## Problema resolvido

O matching hierárquico (S8) já podia sugerir **TASK**, **SECTOR** ou **ACTIVITY**, com `subtreeSummary` apenas descritivo. Ao aceitar **`MATRIX_SUBTREE`**, o draft continuava com **uma única etapa** alinhada ao item da OS; o payload oficial não refletia áreas/etapas reais da Matriz.

A S9 **materializa** a subárvore no draft editável e no **`POST /api/v1/conveyors`**, sem novo endpoint, sem LLM e sem criar nós na Matriz.

## Contrato `matrixSubtree` (aditivo)

Campo opcional em cada entrada do `matchingPlan` (e opcionalmente nas alternativas):

- `rootNodeId`, `rootNodeType` (`TASK` | `SECTOR`), `rootTitle`
- `totalAreas`, `totalActivities`, `totalPlannedMinutes` (totais sobre o conjunto completo de folhas filtradas antes do truncamento de serialização)
- `areas[]`: por área da Matriz — `matrixNodeId`, `title`, `orderIndex`, `plannedMinutes` opcional por área
- `activities[]`: folhas — `matrixNodeId`, `title`, `orderIndex`, `plannedMinutes`, opcionalmente responsável/time quando já vier da query enriquecida
- `subtreeTruncated` / `subtreeWarning` quando o volume excede o limite de segurança (**120** etapas serializadas)

**Não inclui:** cliente, placa, financeiro, peças, texto bruto de PDF, `candidateLines`, debug.

## Regras de expansão no draft

| Match aceito | Comportamento |
|--------------|----------------|
| **TASK** + `MATRIX_SUBTREE` | Remove a etapa simples correspondente; **insere uma nova opção** no draft com `title = rootTitle` e áreas/etapas vindas de `matrixSubtree`. |
| **SECTOR** + `MATRIX_SUBTREE` | Remove a etapa simples; **acrescenta uma ou mais áreas** na primeira opção (após a área “Serviço” com os itens simples restantes). |
| **ACTIVITY** (`MATRIX_ACTIVITY`) | Inalterado vs S6: uma etapa com título/minutos da Matriz. |

**Metadados nos passos:** `sourceOrigin` → `reaproveitada` na materialização para POST; `matrixNodeId` da atividade preservado em meta de revisão; `orderIndex` **reindexado** em todo o draft após aplicar decisões.

## Duplicidade (mesma TASK/SECTOR)

Mantém-se um conjunto **`materializedSubtreeRootIds`** (`rootNodeType:rootNodeId`). Se dois `serviceItems` aceitarem o mesmo root:

- A **primeira** decisão expande a subárvore.
- A **segunda** apenas **remove** a etapa simples duplicada (não reinsere estrutura).

A auditoria pode marcar `subtreeMaterializationSkippedDuplicate`.

## Auditoria (`documentReviewAudit`)

Campos aditivos por decisão (resumo seguro, sem árvore completa):

- `matchedMatrixNodeType`, `reusedStructureKind`
- `expandedSubtree`, `expandedAreasCount`, `expandedActivitiesCount`, `expandedPlannedMinutesTotal`
- `subtreeMaterializationSkippedDuplicate`

No **summary**: `expandedSubtreeDecisionsCount`, `uniqueSubtreeRootsMaterialized`.

## Limitações

- Limite de **120** etapas na carga útil de `matrixSubtree`; totais numéricos refletem a árvore completa antes do truncamento.
- Query **fallback** sem joins pode não preencher `taskNodeId`/`sectorNodeId` → subárvore pode ficar indisponível apesar de `subtreeSummary`.
- Deploy automático, migrações e parser Bravo **fora do âmbito** desta sprint.

## Próximos passos possíveis

- Endpoints dedicados de leitura da Matriz **somente** se o volume/complexidade exigir e for aprovado.
- Afinação de limites e UX para árvores muito grandes.
