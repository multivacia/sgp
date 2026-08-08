# Relatório de Implementação — Dispensar atividade (STEP ABORTED)

## Spec atendida

`docs/specs/dispensar-atividade-producao-spec.md` — dispensar/restaurar atividade `STEP` em esteira liberada (`ABORTED` / rótulo **Dispensada**), com lock compartilhado, sync de planos, UI só no detalhe da esteira.

## Identificação Git

| Campo | Valor |
|---|---|
| Branch | `feature/abortar-atividade-producao` |
| Remoto `origin` | `https://github.com/multivacia/sgp` |
| SHA-base (`origin/main`) | `34679fd90b5270dc3e8f56c4f9b6f32bedf8815b` |
| HEAD (sem commit desta implementação) | `276a92ffae2fec58b87c3f646382f83cbf6006b6` |

### `git status --short` atual (Rodada 2 — pós-correção REPROVA)

```text
 M docs/specs/dispensar-atividade-producao-spec.md
 M server/src/modules/conveyor-progress/conveyor-progress.service.ts
 M server/src/modules/conveyors/conveyor-step-operational.service.ts
 M server/src/modules/conveyors/conveyorActivitySequence.logic.ts
 M server/src/modules/conveyors/conveyorAssignments.controller.ts
 M server/src/modules/conveyors/conveyorAssignments.routes.ts
 M server/src/modules/conveyors/conveyorAssignments.schemas.ts
 M server/src/modules/conveyors/conveyorAssignments.service.ts
 M server/src/modules/conveyors/conveyors.dto.ts
 M server/src/modules/conveyors/conveyors.repository.ts
 M server/src/modules/conveyors/conveyors.service.ts
 M server/src/modules/conveyors/operational-events/conveyor-operational-events.types.ts
 M server/src/modules/conveyors/stepOperationalStatus.ts
 M server/src/modules/my-activities/my-activities.repository.ts
 M server/src/modules/my-work-queue/my-work-queue.repository.ts
 M server/src/modules/my-work-queue/my-work-queue.service.ts
 M server/src/modules/production/production-time-entries.service.ts
 M server/src/modules/production/production-work-queue.rules.ts
 M server/src/modules/production/production-work-queue.service.ts
 M server/src/tests/conveyor-progress.service.test.ts
 M server/src/tests/conveyorActivitySequence.logic.test.ts
 M server/src/tests/stepOperationalStatus.test.ts
 M src/domain/conveyors/conveyor.types.ts
 M src/domain/conveyors/formatConveyorOperationalEvent.ts
 M src/domain/conveyors/operationalEventTaxonomy.ts
 M src/domain/conveyors/stepOperationalStatus.test.ts
 M src/domain/conveyors/stepOperationalStatus.ts
 M src/domain/production/production.helpers.ts
 M src/features/esteiras/EsteiraDetalhePage.tsx
 M src/features/operational-planning/planningCardActions.test.ts
 M src/features/operational-planning/planningCardActions.ts
 M src/features/operational-planning/planningExecutionHelpers.test.ts
 M src/features/operational-planning/planningExecutionHelpers.ts
 M src/features/operational-tickets/activityTicketConveyorSource.ts
 M src/features/operational-tickets/activityTicketPlanningSource.ts
 M src/features/operational-tickets/buildConveyorActivityTicketPrintModels.test.ts
 M src/features/operational-tickets/filterPlanningActivityTicketSources.test.ts
 M src/services/conveyors/conveyorsApiService.ts
?? docs/implementation/
?? server/migrations/0050_conveyor_nodes_step_aborted.sql
?? server/src/modules/conveyors/conveyor-step-abort.service.ts
?? server/src/modules/conveyors/lockConveyorAndStepForUpdate.ts
?? server/src/modules/conveyors/stepAbortReasons.ts
?? server/src/tests/conveyor-step-abort.integration.test.ts
?? server/src/tests/conveyor-step-abort.unit.test.ts
?? src/domain/conveyors/stepAbortReasons.ts
```

### `git diff --stat` (tracked)

```text
 38 files changed, 1041 insertions(+), 83 deletions(-)
```

## Alterações feitas

1. **Migration `0050_conveyor_nodes_step_aborted.sql`**: amplia CHECK com `ABORTED`; colunas `aborted_at`, `aborted_by`, `abort_reason_code`, `abort_reason_text`. Event types sem CHECK de enum no banco.
2. **Domínio BE/FE**: `ABORTED`, predicados (`isStepAborted`, `isStepClosedForSequence`), transições, catálogo de motivos, label **Dispensada**.
3. **Lock compartilhado** `lockConveyorAndStepForUpdate` (esteira → STEP); adaptado em conclusão/reabertura, time entries web/on-behalf e produção, além de abort/restore.
4. **HTTP**: `POST …/abort` e `POST …/restore-aborted` com `Idempotency-Key`, permissão `conveyors.create`, meta idempotente, sync de planos na TX.
5. **Consumidores**: sequência, progresso (previsto efetivo exclui ABORTED), filas, tickets, bloqueio de novos apontamentos.
6. **UI**: apenas `EsteiraDetalhePage` (Dispensar / Restaurar + modal de motivo + badge).
7. **Testes**: unitários + integração (idempotência, 409, restore, sync, concorrência real).

## Rodada 2 — correções pós-REPROVA (sgp-test-reviewer)

Somente lacunas de teste/documentação; sem mudança de contrato HTTP.

| Lacuna | Correção |
|---|---|
| 1. Integração fail-fast | `describe.skipIf(!hasDb)`; se DB ok mas migration 0050 ausente → `throw` no `beforeAll` (não `return` silencioso). Documentado no cabeçalho do arquivo. |
| 2. Esteira FINALIZADA/CANCELADA → 409 | Novo `it` na integração cobrindo ambos os status. |
| 3. Tickets ABORTED | Caso em `filterPlanningActivityTicketSources.test.ts` + filtro conveyor em `buildConveyorActivityTicketPrintModels.test.ts`. |
| 4. Sync `operational_work_plan_items` | Novo `it` assertando `CANCELLED` no item semanal além do plano da esteira. |
| 5. Progresso previsto efetivo | Novo unitário em `conveyor-progress.service.test.ts` (ABORTED ≠ completed; agregado exclui previsto). |
| 6. Idempotency-Key ausente → 400 | Unitário `conveyor-step-abort.unit.test.ts` via `parseIdempotencyKeyHeader`. |

## Migrations

| Item | Valor |
|---|---|
| Arquivo | `server/migrations/0050_conveyor_nodes_step_aborted.sql` |
| Aplicada em HML/PRD? | **Não** |
| Aplicada localmente? | **Sim**, somente em PostgreSQL local descartável da sessão de testes (`PGDATABASE=sgp` local) |

## Critérios de aceite

| Critério | Atendido? | Onde |
|---|---|---|
| Migration CHECK aceita `ABORTED` + colunas abort | Sim | `0050_…sql`; teste integração (fail-fast se ausente) |
| Tipos BE/FE + label Dispensada | Sim | `stepOperationalStatus.ts` (BE/FE); testes unitários |
| Transição só de PENDING/REOPENED/IN_PROGRESS/BLOCKED | Sim | `canTransitionStepStatus`; testes |
| COMPLETED→ABORTED → 409 | Sim | serviço abort; integração |
| Esteira FINALIZADA/CANCELADA → 409 | Sim | `assertConveyorAllowsAbort` + **teste integração Rodada 2** |
| `isStepClosedForSequence` inclui ABORTED | Sim | sequência + progresso |
| Progresso: ABORTED ≠ completed; previsto efetivo exclui | Sim | `conveyor-progress.service.ts` + **teste unitário Rodada 2** |
| POST abort / restore-aborted + Idempotency-Key | Sim | routes/controller/service |
| 400 motivo/key; 403 perm; 404; 409 conflitos | Sim | serviço + **unitário key ausente Rodada 2** |
| Replay mesma key idempotente; key divergente 409 | Sim | integração |
| Lock compartilhado + ordem esteira→STEP→demais | Sim | `lockConveyorAndStepForUpdate` + TXs adaptadas |
| Concorrência apontamento×dispensa e conclusão×dispensa | Sim | integração (2 conexões) |
| Sync planos CANCELLED + cancellation_reason | Sim | abort service; integração + **sync work_plan_items Rodada 2** |
| Time entries preservadas; sem fictício; block novos | Sim | integração |
| Filas/tickets excluem ou não apontam ABORTED | Sim | my-work-queue, production rules + **testes ticket Rodada 2** |
| UI só detalhe; restore limpa abort_* + evento RESTORED; não reativa planos | Sim | EsteiraDetalhePage + serviço |
| Regressão COMPLETE/REOPEN | Sim | integração |

## Evidência reexecutável (Rodada 2)

### Typecheck

| Comando | Exit code |
|---|---|
| `npx tsc -b` (frontend, raiz) | **0** |
| `cd server && npx tsc -p tsconfig.json` | **0** |

### Testes reexecutados nesta rodada

| Comando | Exit code | Resultado |
|---|---|---|
| `npm --prefix server test -- --run src/tests/conveyor-step-abort.unit.test.ts src/tests/conveyor-step-abort.integration.test.ts src/tests/conveyor-progress.service.test.ts` | **0** | 3 files / **15 passed** |
| `npm test -- --run src/features/operational-tickets/filterPlanningActivityTicketSources.test.ts src/features/operational-tickets/buildConveyorActivityTicketPrintModels.test.ts` | **0** | 2 files / **19 passed** |

Saída resumida server (Rodada 2):

```text
 Test Files  3 passed (3)
      Tests  15 passed (15)
```

Inclui integração: FINALIZADA/CANCELADA→409, sync `operational_work_plan_items`, fail-fast migration 0050; unitários: Idempotency-Key ausente, progresso ABORTED.

Saída resumida frontend tickets (Rodada 2):

```text
 Test Files  2 passed (2)
      Tests  19 passed (19)
```

### Evidência histórica (Rodada 1 — ainda válida para demais suites)

| Comando | Exit code |
|---|---|
| `npx vite build` | **0** |
| `npm run server:build` | **0** |
| `npm --prefix server test -- --run src/tests/stepOperationalStatus.test.ts` + integração abort (antes) | **0** |
| `npm --prefix server test -- --run src/tests/conveyorActivitySequence.logic.test.ts` | **0** |
| `npm test -- --run src/domain/conveyors/stepOperationalStatus.test.ts` (+ tickets) | **0** |
| `npm run lint` | **1** (dívidas pré-existentes fora do escopo; scoped feature → 0 errors) |

## Testes não executados / motivo

- Suite completa frontend (`npm test` sem filtro) e suite completa server (`npm run server:test` sem filtro): não rodadas por tempo/ruído; subset obrigatório da spec + lacunas da REPROVA executado com exit 0.
- Testes HTTP end-to-end via Supertest de rotas abort (além do serviço): não adicionados; cobertura via serviço + permissão na rota + unitário de header.

## Riscos residuais

- Deploy precisa ser **atômico** (migration 0050 + app); código que lê `aborted_*` quebra se migration não aplicada. Integração agora **falha** (não passa) se 0050 ausente com DB presente.
- `npm run lint` continua vermelho por dívidas pré-existentes fora do escopo.
- Writers raros de `IN_PROGRESS`/`BLOCKED` permanecem; origens de aborto continuam válidas.
- Envelope HTTP do projeto é `{ data, meta }` (sem `ok: true`); alinhado à conclusão explícita existente.
- Banco local de teste da sessão recebeu migrate+seed; **não** usar esse `.env`/banco fora do isolamento local.

## Confirmação explícita de governança

- **Não** houve `git commit`.
- **Não** houve `git push`.
- **Não** houve criação/atualização de PR.
- **Não** houve merge.
- **Não** houve deploy.
- Migration **não** aplicada em HML/PRD (apenas Postgres local descartável para testes).
