# R6 S6 - Materializacao controlada das decisoes

## Objetivo

Garantir que o payload final de criacao oficial da esteira respeita as decisoes de revisao humana definidas na S5, sem automacao indevida e sem vazamento de conteudo financeiro/LGPD/debug.

## Regra de materializacao por decisao

- `ACCEPT_SUGGESTED`
  - Mantem o item na criacao.
  - Reaproveita `plannedMinutes` de `reusedStructure` quando presente.
  - Reaproveita o titulo da atividade (`reusedStructure.activity`) quando presente.
  - Marca a etapa com `sourceOrigin: "reaproveitada"` no payload final.
- `SELECT_ALTERNATIVE`
  - Mantem o item na criacao.
  - Usa `activity` e `plannedMinutes` do `alternativeCandidate` escolhido.
  - Marca `sourceOrigin: "reaproveitada"`.
- `CONFIRM_CREATE_NEW`
  - Mantem o item como etapa nova (sem criar atividade na Matriz).
  - Preserva o titulo e o tempo editados no draft.
  - Mantem `sourceOrigin: "manual"`.
- `IGNORE_ITEM`
  - Remove a etapa do draft materializado.
  - Nao envia a etapa no `POST /api/v1/conveyors`.

Itens com `suggestedAction: "IGNORE"` no matching plan tambem nao sao enviados.

## Bloqueios antes do POST

`validateDraftForCreate` bloqueia envio quando:

- existe conteudo financeiro/sensivel no draft;
- notas operacionais de ingest trazem conteudo proibido;
- ha pendencias obrigatorias (`REVIEW_SIMILAR`/`CREATE_NEW`);
- o draft contem chaves internas de debug (`candidateLines`, `debugLines`, `debug`);
- o draft contem `partItems`.

## O que entra no payload final

- `dados` operacionais saneados (`nome`, `veiculo`, etc.);
- estrutura `options/areas/steps` com:
  - `sourceOrigin` por etapa (`manual` ou `reaproveitada`);
  - `plannedMinutes` final apos aplicacao das decisoes;
  - etapas ignoradas removidas.
- `matrixRootItemId` inferido quando ha match de matriz em formato UUID.

## O que nunca entra

- texto bruto do PDF;
- `partItems`;
- campos de debug (`candidateLines`, `debug*`);
- dados financeiros/comerciais bloqueados pelo guard operacional;
- dados LGPD bloqueados pelo guard operacional.

## Rastreabilidade

Sem endpoint novo e sem migration nesta sprint.

- Foi aproveitado o campo existente `matrixRootItemId` no contrato de criacao para rastrear vinculacao com matriz quando possivel (UUID valido).
- O contrato atual de `POST /api/v1/conveyors` nao aceita um objeto livre de metadata adicional; portanto, resumo completo de decisoes permanece pendente para evolucao futura.

## Pendencias para S7

- Persistencia explicita de `reviewDecisionsSummary` e `matchedItems` em metadata estruturada de esteira (com contrato e schema dedicados).
- Consulta/auditoria de decisoes por item apos criacao.
- Estrategia de exposicao segura desses metadados na API de detalhe sem vazar conteudo sensivel.
