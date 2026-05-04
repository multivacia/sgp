# R6 S9.4 — Materialização de times e TASK como container

## Times na esteira

- O pool SQL de atividades agrega **todos** os vínculos em `matrix_node_assignment_teams` (com join a `teams` ativos) em `teamAssignments[]`; o primeiro entra também em `teamId`/`teamName` (retrocompat).
- Na expansão `MATRIX_SUBTREE`, cada folha repassa `teamAssignments` na meta da etapa; `buildValidStepAssigneesFromMatrixActivity` gera **colaborador primário** (se houver) + **N assignees TEAM** (`isPrimary: false`), sem `null` nos ids.

## Etapa sintética da TASK

- Se `reusedStructure.kind === MATRIX_SUBTREE` mas **não** há expansão (subárvore vazia ou ausente), **não** se sobrepõem na etapa do Serviço o título/`plannedMinutes` de rollup da TASK (`activity` / `plannedMinutes` do plano). Mantém-se o texto/minutos da linha da OS.
- O mesmo vale para `SELECT_ALTERNATIVE` quando o candidato é `MATRIX_SUBTREE`: não se usa o título/minutos macro como única etapa “executável”.

## Auditoria

- `totalPlannedMinutes` da subárvore continua só em metadados de auditoria / resumo; não vira minutos de uma etapa folha.
