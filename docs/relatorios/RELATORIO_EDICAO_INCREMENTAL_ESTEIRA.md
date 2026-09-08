# RELATÓRIO — Edição incremental da estrutura da esteira

STATUS_FINAL: CONCLUÍDO COM RESSALVAS  
BRANCH: `cursor/edicao-incremental-estrutura-esteira-c836`  
BASE_ORIGIN_MAIN: `6b768c852a18b7428e3dadf761bad7e35c1d61ef`  
COMMIT: `7f15c21722fb97b0d4f642620a9c6090274f644d`  
MIGRATION: NÃO NECESSÁRIA

---

## 1. Diagnóstico anterior

O `PATCH /api/v1/conveyors/:id/structure` executava replace destrutivo:

1. Gate de status (`EM_ELABORACAO` | `AGUARDANDO_PLANEJAMENTO`)
2. Bloqueio se havia time entries ou itens de plano
3. `deleteConveyorAssigneesAndNodes` (apaga assignees + STEP/AREA/OPTION)
4. Rematerialização com `newNodeId()` para **todos** os nós

Consequência: qualquer edição regenerava UUIDs e quebrava vínculos de planejamento, apontamentos, eventos, COMPLETED/ABORTED e alocações.

No frontend, `structureEditLocked` + `canReplaceConveyorStructure` bloqueavam a UI por status; `buildManualConveyorInput` descartava os IDs dos drafts.

A inclusão tardia (`POST /structure/items`) já era append-only seguro e permaneceu intacta.

## 2. Arquitetura implementada

```
payload (com id? opcional)
    ↓
computeConveyorStructureDiff (puro)
    ↓
TX + FOR UPDATE no conveyor
    ↓
INSERTS → UPDATES → sync assignees por STEP → remoções híbridas
    ↓
recalcular totais (ativos) + evento CONVEYOR_STRUCTURE_UPDATED
```

Camadas:

| Camada | Arquivo |
|--------|---------|
| Diff | `server/src/modules/conveyors/conveyor-structure-diff.ts` |
| Persistência | helpers em `conveyors.repository.ts` |
| Orquestração | `serviceApplyConveyorStructureDiff` (alias `serviceReplaceConveyorStructure`) |

Contrato HTTP mantido: `PATCH /structure`.

## 3. Preservação de IDs

- Payload com `id` UUID → UPDATE in-place (mesmo `conveyor_nodes.id`)
- Payload sem `id` → INSERT com novo UUID
- Frontend envia `id` **somente** para nós presentes no baseline carregado da API (`persistedNodeIds`), evitando confusão com `crypto.randomUUID()` de drafts novos
- Validação: ID desconhecido / tipo errado / cross-conveyor → `422 VALIDATION_ERROR`

## 4. Regras de remoção

Híbrida, bottom-up por subárvore:

| Situação | Ação |
|----------|------|
| Sem deps/histórico na subárvore | Hard delete (assignees do nó + nós) |
| Com time entries / plan items / eventos / STEP COMPLETED\|ABORTED | Soft `is_active=false` em cascata |

Não apaga: apontamentos, itens de plano, eventos (soft), completed_*/aborted_*.

## 5. Planejamento

Itens de `operational_work_plan_items` / `conveyor_operational_plan_items` continuam apontando ao mesmo `activity_node_id`. Soft-remove não cancela o plano automaticamente (risco residual aceito: órfão lógico; filas já filtram `is_active=true`).

## 6. Apontamentos

Time entries permanecem no mesmo `conveyor_node_id`. Hard delete só ocorre se **não** houver entries (nem outros deps).

## 7. Inclusão tardia

`POST /structure/items` e `LateStructureAppendDrawer` **não** foram alterados em comportamento. Botão “Incluir novo item” permanece como atalho UX. STEPs novos via PATCH em status avançado recebem `lateAddToWeeklyBacklog` com `lateAddReason: INCREMENTAL_STRUCTURE_EDIT`.

## 8. Frontend

- `canReplaceConveyorStructure` → sempre `true` (qualquer status conhecido)
- `structureEditLocked` removido (sempre editável; RBAC intacto)
- Banner antigo de bloqueio por status removido da UI
- `buildManualConveyorInput(..., { persistedNodeIds })` propaga IDs no PATCH
- Texto do atalho late-append atualizado (estrutura não é mais “somente leitura”)

## 9. Backend

Criados/alterados:

- `conveyor-structure-diff.ts` (+ unit tests)
- `conveyors.service.ts` — `serviceApplyConveyorStructureDiff`
- `conveyors.repository.ts` — lock, update fields, soft/hard, deps
- `conveyors.schemas.ts` — `id?` em option/area/step
- `conveyorOperationalStatus.ts` — mensagens alinhadas
- `conveyor-operational-events.types.ts` — `CONVEYOR_STRUCTURE_UPDATED`
- Detalhe GET/PATCH retorna structure só com nós ativos

## 10. Migration

**NÃO NECESSÁRIA** — `is_active` e `metadata_json` já existem; `event_type` é VARCHAR livre.

## 11. Testes

Comandos executados:

```bash
# Backend unit
cd server && npx vitest run src/tests/conveyor-structure-diff.test.ts
# → 7/7 pass (exit 0)

cd server && npx vitest run src/tests/conveyors-structure-append.fingerprint.test.ts \
  src/tests/conveyors-structure-append.idempotency.unit.test.ts \
  src/tests/conveyorActivitySequence.logic.test.ts
# → 29/29 pass (exit 0)

# Integração PATCH (skipped — sem DATABASE_URL /.env neste ambiente)
cd server && npx vitest run src/tests/conveyors-patch-structure.integration.test.ts
# → 11 skipped (exit 0)

# Frontend
npx vitest run src/features/esteiras/
# → 90/90 pass (exit 0)
```

## 12. Build / typecheck

```bash
cd server && npm run build          # tsc -p tsconfig.json → exit 0
cd /workspace && npx tsc -b         # exit 0
cd /workspace && npm run build      # tsc -b && vite build → exit 0
```

Lint global (`npm run lint`): **145 problems** — **preexistente em origin/main** (mesma contagem). Arquivos alterados desta feature: eslint limpo.

## 13. Arquivos alterados

Backend:

- `server/src/modules/conveyors/conveyor-structure-diff.ts` (novo)
- `server/src/modules/conveyors/conveyors.service.ts`
- `server/src/modules/conveyors/conveyors.repository.ts`
- `server/src/modules/conveyors/conveyors.schemas.ts`
- `server/src/modules/conveyors/conveyorOperationalStatus.ts`
- `server/src/modules/conveyors/operational-events/conveyor-operational-events.types.ts`
- `server/src/tests/conveyor-structure-diff.test.ts`
- `server/src/tests/conveyors-patch-structure.integration.test.ts`

Frontend:

- `src/domain/conveyors/conveyor.types.ts`
- `src/domain/conveyors/operationalEventTaxonomy.ts`
- `src/features/esteiras/ConveyorCreateEditPage.tsx`
- `src/features/esteiras/conveyorEditSavePolicy.ts`
- `src/features/esteiras/conveyorEditSavePolicy.test.ts`
- `src/features/esteiras/conveyorEditStructureSnapshot.ts`
- `src/features/esteiras/nova-esteira/matrixToConveyorCreateInput.ts`
- `src/features/esteiras/nova-esteira/matrixToConveyorCreateInput.test.ts`

Docs:

- `docs/relatorios/RELATORIO_EDICAO_INCREMENTAL_ESTEIRA.md`

## 14. Riscos residuais

1. Soft-remove não cancela itens de plano publicados (órfãos lógicos).
2. Progress/evolução continua podendo listar nós inativos (histórico).
3. Assignees de nós soft permanecem no banco.
4. Sem versionamento otimista além de `FOR UPDATE` na esteira.
5. Integração DB **não executada** neste ambiente (sem `.env`/Postgres) — suíte marcada `skipIf(!hasDb)`.
6. Lint global do repositório já falhava em `origin/main` (fora do escopo).

## 15. Validação manual sugerida

### Caso A — AGUARDANDO_PLANEJAMENTO
Abrir `/app/esteiras/:id/alterar`, renomear atividade, alterar tempo, reordenar, salvar, reabrir e confirmar.

### Caso B — EM_ANDAMENTO (planejada)
Alterar nome/tempo de atividade já no plano; confirmar mesmo `conveyor_node_id` e item de plano intacto.

### Caso C — Com apontamento
Editar atividade com time entry; confirmar entry e ID intactos.

### Caso D — Nova atividade
Adicionar STEP; salvar; confirmar elegibilidade no Backlog (`lateAddToWeeklyBacklog`).

### Caso E — FINALIZADA
Editar campo estrutural; status permanece `FINALIZADA`; COMPLETED preservados.

### Caso F — Remoção com histórico
Remover atividade com histórico; some da estrutura ativa; histórico consultável; sem FK quebrada.
