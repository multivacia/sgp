# Conclusão explícita de STEP (Backlog 6)

## Decisão de domínio

Uma **etapa (STEP)** só é considerada concluída operacionalmente quando existe uma ação explícita **«Concluir etapa»**. O consumo de tempo planejado (`realizedMinutes` em relação a `plannedMinutes`) **não** conclui a etapa e **não** deve emitir `CONVEYOR_STEP_COMPLETED`.

## Persistência

- Tabela `conveyor_nodes` (apenas `node_type = 'STEP'`):
  - `operational_status`: `PENDING` | `IN_PROGRESS` | `BLOCKED` | `COMPLETED` | `REOPENED`
  - `operational_completed_at`, `operational_completed_by` (referência a `app_users.id`) ao marcar `COMPLETED`
- Em `OPTION` e `AREA`, `operational_status` permanece **NULL** (constraint).

Migração: `server/migrations/0028_conveyor_nodes_step_operational.sql`.

## Endpoint

`PATCH /api/v1/conveyors/:conveyorId/steps/:stepNodeId/completion`

Corpo:

```json
{ "action": "COMPLETE", "note": "opcional" }
```

- Permissão neste sprint: `conveyors.create` (não existe `conveyors.edit` no RBAC atual).
- Resposta: mesmo contrato do `GET /conveyors/:id` (detalhe da esteira), envelope com `meta.stepCompletionIdempotent` (`true` se a etapa já estava `COMPLETED`).

## Evento operacional

`CONVEYOR_STEP_COMPLETED` é registado **apenas** neste fluxo (serviço `servicePatchConveyorStepCompletion`). Não é emitido em apontamento de horas, criação de esteira, alteração de `plannedMinutes`, etc.

## ARGOS / health snapshot

No snapshot (`buildConveyorOperationalSnapshotV1`), o `status` por STEP do tipo `completed` alinha-se a `operationalStatus === 'COMPLETED'`, e não a «pendência de tempo zero com realizado > 0».

## Workload

`pendingMinutes` por STEP passa a **0** quando `operationalStatus === 'COMPLETED'`, para que a pendência operacional não conte etapa já encerrada, mantendo `plannedMinutes` / `realizedMinutes` como métrica de esforço.

## UI

Botão **«Concluir etapa»** na secção «Estrutura operacional» da página de detalhe da esteira (`EsteiraDetalhePage`), com confirmação nativa do browser.

## Reabertura (futuro)

- Transição `COMPLETED` → `REOPENED` está **bloqueada** em `canTransitionStepStatus` até haver fluxo e evento `CONVEYOR_STEP_REOPENED`.
- Sugestão: expor `PATCH …/completion` ou `PATCH …/status` no STEP com corpo `{ "status": "REOPENED", "note": "…" }` e limpar `operational_completed_*` conforme regra de produto.
