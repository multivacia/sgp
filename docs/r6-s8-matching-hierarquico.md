# R6 S8 - Matching hierarquico OS x Matriz

## Problema de granularidade

No matching anterior, o foco principal era `ACTIVITY` (folha). Isso podia gerar `CREATE_NEW`
para servicos que ja tinham estrutura macro consolidada na Matriz (ex.: TASK com varias areas/etapas).

## Niveis suportados

O motor agora considera candidatos em tres niveis:

- `TASK` (estrutura macro)
- `SECTOR` (subestrutura)
- `ACTIVITY` (folha)

`TASK` e `SECTOR` sao derivados a partir das atividades carregadas, agrupando por `taskNodeId` e `sectorNodeId`,
com resumo de descendentes.

## Score hierarquico

Base:

- score deterministico existente (S3/S4): termos + frases + penalidades + blend titulo/descricao.

Extensoes S8:

- texto de comparacao para macro inclui titulo + ancestrais + amostra de atividades descendentes;
- bonus hierarquico moderado para `TASK/SECTOR` quando ha descendentes suficientes;
- desempate por prioridade de tipo (`TASK` > `ACTIVITY` > `SECTOR`) quando scores empatam.

Protecoes:

- candidatos macro com menos de 2 atividades descendentes nao viram candidatos hierarquicos;
- score de atividade folha permanece valido e continua vencendo em cenarios pontuais.

## Representacao do match composto

Cada item do `matchingPlan` pode trazer (de forma aditiva):

- `matchedMatrixNodeType`: `TASK | SECTOR | ACTIVITY`
- `reusedStructure.kind`: `MATRIX_SUBTREE | MATRIX_ACTIVITY`
- `subtreeSummary`:
  - `rootNodeType`
  - `totalAreas`
  - `totalActivities`
  - `totalPlannedMinutes`
  - `previewActivities` (amostra)

Alternativas tambem podem informar `nodeType`.

## UX de revisao

No painel de revisao, quando houver `subtreeSummary`, exibimos:

- "Estrutura da Matriz sugerida"
- tipo da estrutura
- quantidade de areas
- quantidade de etapas
- minutos totais
- exemplos de etapas descendentes

## Materializacao

Nesta sprint, a subarvore fica **representada e rastreavel no matching/revisao**.
A expansao completa da subarvore para varias areas/etapas no payload oficial ainda nao foi implementada.

Ou seja:

- ja existe sugestao hierarquica confiavel (`TASK/SECTOR/ACTIVITY`);
- a materializacao continua pelo fluxo atual de etapas do draft.

## Limitacoes e proximos passos

- S9: expansao opcional da subarvore (`TASK/SECTOR`) em estrutura completa no draft/payload;
- estrategia de selecao de subarvore quando houver ambiguidades macro x folha muito proximas;
- refinamento de bonus por nivel com amostras reais de producao.

