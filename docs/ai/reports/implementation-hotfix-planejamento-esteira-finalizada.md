# Relatório de Implementação — SGP+ Web

## Spec atendida
Hotfix: permitir save do planejamento semanal quando o FE reenvia itens legados de esteira `FINALIZADA` **pré-existentes e inalterados**, rejeitando novos ou alterados.

## Alterações feitas
- `validatePlanItems`: esteira `FINALIZADA` só rejeita se **não** pré-existente **ou** campos de decisão diferem do baseline; inalterado → `continue` (como COMPLETED).
- Novo `listActiveWeekPlanItemBaselines` no repository (DRAFT preferido sobre PUBLISHED).
- Helper puro exportado `isUnchangedFinalizedPlanItem`.
- Suite nova `operational-planning.finalized-preserve.test.ts`.
- `AppError.details` opcional com `{ conveyorId, activityNodeId, conveyorOperationalStatus: 'FINALIZADA' }`.

## Critérios de aceite
| Critério | Atendido? | Onde |
|---|---|---|
| Pré-existente + inalterado FINALIZADA → permite | Sim | service + testes 1–2 |
| Novo FINALIZADA → rejeita mensagem atual | Sim | teste 3 |
| Pré-existente + alterado → rejeita | Sim | testes 4–5 |
| Não comparar `plannedOrder` | Sim | helper + teste 1 (order 9) |
| Baseline draft∪published, preferir DRAFT | Sim | `listActiveWeekPlanItemBaselines` |
| Remoção por omissão: sem bloqueio novo | Sim (documentado) | replace atual |
| Regressão COMPLETED preserve | Sim | teste 6 + suite completed-preserve |
| Sem migration / FE / late-add | Sim | escopo só backend+testes |

## Campos de comparação (inalterado)
`assignedCollaboratorId`, `assignedTeamId`, `plannedDate`, `plannedMinutes`, `notes`, `conveyorOperationalPlanItemId`  
**Não** compara: `plannedOrder`  
Normalização: null/undefined em team/minutes/cop; notes vazias/whitespace → null.

## Decisão sobre remoção (Caso 4)
**Não** há bloqueio novo nesta hotfix. Omitir item FINALIZADA do payload continua permitindo soft-delete via `replaceWeekPlanItems` (exceto se o STEP também for `COMPLETED`, que já tem preserve-by-id).

## Evidência reexecutável
- Base: `07ec5c085bcaa4d6c5e5975e6fc25722f850e3d6`
- Commit: `6d4204ec26b253cffd2706e5f8c7882090efa651`
- Branch pushed: `hotfix/planejamento-esteira-finalizada-preexistente`
- `diagnostico-planejamento-esteira-concluida.md` **não** incluído no commit (permanece untracked)

### Comandos
```
cd /workspace/server && npx vitest run src/tests/operational-planning.finalized-preserve.test.ts src/tests/operational-planning.completed-preserve.test.ts
# EXIT:0 — 2 files, 29 tests passed

cd /workspace/server && npx vitest run src/tests/operational-planning.revision.test.ts
# EXIT:0 — 1 file, 10 tests passed

cd /workspace/server && npm run build   # tsc -p tsconfig.json
# EXIT:0
```
- `npm run lint`: não rodado (sem script lint no `server/package.json`; fora do escopo corrigir lint preexistente).

## Migrations
Nenhuma.

## Riscos residuais
- Remoção por omissão de item FINALIZADA (sem STEP COMPLETED) ainda possível.
- Item FINALIZADA inalterado pode ser delete+reinsert no replace (OK nesta hotfix); se o step for COMPLETED, o preserve-by-id existente se aplica.
- Baseline exige match nos campos de decisão; divergência silenciosa FE↔baseline gera 400 com a mensagem genérica de esteira concluída.
