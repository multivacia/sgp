# Relatório — PR-1 source_key lineage (Etapa 2)

**Branch:** `feature/source-key-lineage-pr1`  
**SDD:** `docs/discovery/sdd-source-key-lineage.md` §3  
**Data:** 2026-07-06

---

## ✅ Verificado em runtime

### `resolveNodeSourceKey.test.ts` (casos a/b/c da seção 2.1)

```
 RUN  vitest run resolveNodeSourceKey

 Test Files  1 passed (1)
      Tests  3 passed (3)
```

- (a) `source_key` preenchida vence sobre `id`
- (b) `null` / `undefined` / `''` / `'   '` → fallback para `id`
- (c) Dois nós com a mesma `source_key` de origem resolvem igual

### Suíte de testes esteira/matriz

```
# Frontend — operation-matrix, nova-esteira, criar-matriz
 Test Files  36 passed (36)
      Tests  261 passed (261)

# Frontend — arquivos tocados diretamente
 Test Files  5 passed (5)
      Tests  23 passed (23)
  (resolveNodeSourceKey, cloneCatalogTaskSubtree, cloneMatrixTaskSubtree,
   matrixToConveyorCreateInput, novaEsteiraDraftFromMatrix)

# Server — conveyors
 Test Files  10 passed | 1 skipped (11)
      Tests  90 passed | 4 skipped (94)
```

**Fixtures/asserts ajustados neste PR:**

| Arquivo | Mudança | Motivo |
|---------|---------|--------|
| `cloneMatrixTaskSubtree.test.ts` | `sourceKey: 'activity-1'` no último `createMatrixNode` | Com `source_key: null` na origem, `resolveNodeSourceKey` propaga o `id` da atividade |
| `matrixToConveyorCreateInput.test.ts` | Assert `sourceKey === actId` em `mapMatrixTreeToConveyorOptions` | Caminho direto matriz→POST agora propaga lineage |
| `novaEsteiraDraftFromMatrix.test.ts` | +2 testes: `sourceKey` no draft e no `buildManualConveyorInput` | Caminho de produção (draft manual → POST) |
| `cloneCatalogTaskSubtreeForDraft.test.ts` | **novo** — 2 casos de clone com fallback e `source_key` explícita | Cobertura do ponto 2.2 |

### Teste `materializeConveyorOptions` → `insertConveyorNode`

Arquivo: `server/src/tests/conveyors-source-key-materialize.test.ts`

```
 Test Files  1 passed (1)
      Tests  2 passed (2)
```

- STEP com `sourceKey: 'lineage-xyz'` → `insertConveyorNode` chamado com `source_key: 'lineage-xyz'`
- OPTION e AREA → `source_key: null` (inalterados)
- STEP sem `sourceKey` no payload → `source_key: null` (retrocompat)

**PATCH de estrutura:** `materializeConveyorOptions` é o mesmo helper usado no PATCH (~L953). Mudança aditiva: steps com `sourceKey` no body passam a persistir; steps sem o campo continuam `null`. Suíte `conveyors-patch-structure` permanece verde (sem regressão).

### Build e lint

| Comando | Resultado |
|---------|-----------|
| `npm run build` (frontend) | ✅ sem erro |
| `npm run build` (server) | ✅ sem erro |
| `eslint` nos arquivos deste PR | ✅ sem erro novo |

> `npm run lint` no repo inteiro reporta erros pré-existentes em outros módulos (139 problemas); nenhum nos arquivos deste PR.

---

## 👤 Verificado por humano (obrigatório antes de aprovar)

- [ ] Criar esteira a partir de matriz pela UI, publicar, consultar `conveyor_nodes`:
  ```sql
  SELECT id, node_type, name, source_key
  FROM conveyor_nodes
  WHERE conveyor_id = '<id-da-esteira>' AND node_type = 'STEP' AND deleted_at IS NULL;
  ```
  Esperado: STEPs com `source_key` = `source_key` ou `id` da atividade de origem na matriz.

- [ ] Criar **duas** esteiras a partir da **mesma** atividade de origem → `source_key` do STEP deve convergir (mesmo valor nas duas).

- [ ] Criar esteira manual pura (sem matriz) → funciona; STEPs com `source_key: null`.

---

## ❓ Não verificado

- **Backfill** de matrizes/esteiras existentes — fora de escopo; registros antigos permanecem `null`.
- **Preview-persist** (`operationMatrixPreviewPersist.ts`, `operationMatrixPreviewStructureCreate.ts`) e **estrutura manual de matriz** (`createManualMatrixStructure.ts`) — continuam gravando `null` (PR-3 desta frente).
- **`buildCreateConveyorFromMatrixInput`** — corrigido por simetria via `mapMatrixTreeToConveyorOptionsWithOrigin`; não exercitado em produção hoje; validado por teste unitário indireto (`mapMatrixTreeToConveyorOptions`).
- **Validação manual UI + banco** — pendente do dono do produto (seção 👤 acima).

---

## Arquivos alterados (escopo PR-1)

| Arquivo | Alteração |
|---------|-----------|
| `src/domain/operation-matrix/resolveNodeSourceKey.ts` | **novo** — helper compartilhado |
| `src/domain/operation-matrix/resolveNodeSourceKey.test.ts` | **novo** — testes unitários |
| `src/features/operation-matrix/criar-matriz/cloneCatalogTaskSubtreeForDraft.ts` | `source_key` no clone de draft |
| `src/features/operation-matrix/criar-matriz/cloneCatalogTaskSubtreeForDraft.test.ts` | **novo** |
| `src/features/operation-matrix/criar-matriz/cloneMatrixTaskSubtree.ts` | `sourceKey: resolveNodeSourceKey(node)` |
| `src/features/operation-matrix/criar-matriz/cloneMatrixTaskSubtree.test.ts` | assert atualizado |
| `src/features/esteiras/nova-esteira/matrixToConveyorCreateInput.ts` | `ManualStepDraft.sourceKey`, mapeamentos POST |
| `src/features/esteiras/nova-esteira/matrixToConveyorCreateInput.test.ts` | assert `sourceKey` |
| `src/features/esteiras/nova-esteira/novaEsteiraDraftFromMatrix.ts` | `sourceKey` em `emptyStepFromActivity` |
| `src/features/esteiras/nova-esteira/novaEsteiraDraftFromMatrix.test.ts` | +2 testes |
| `src/domain/conveyors/conveyor.types.ts` | `CreateConveyorStepInput.sourceKey` |
| `server/src/modules/conveyors/conveyors.schemas.ts` | `postConveyorStepSchema.sourceKey` |
| `server/src/modules/conveyors/conveyors.service.ts` | STEP: `source_key: st.sourceKey?.trim() \|\| null` |
| `server/src/tests/conveyors-source-key-materialize.test.ts` | **novo** — materialização |

**Fora do escopo (não tocados):** migrations, endpoints novos, preview-persist, UI de decisão manter/quebrar vínculo, backfill.
