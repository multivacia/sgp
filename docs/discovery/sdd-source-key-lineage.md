# SDD — Lineage de source_key entre Matriz e Esteira

## 0. Isso já existia antes desta tarefa?

**Não.** Checagem feita em 2026-07-05:

| Verificação | Resultado |
|---|---|
| Branch com nome `source-key`, `lineage` ou similar (local + remote) | **Nenhuma** — apenas branches `feature/agenda-semanal-pr*` e demais já conhecidas |
| `docs/discovery/sdd-source-key-lineage.md` | **Não existia** — criado nesta etapa |
| `docs/discovery/matriz-reaproveitamento-decisao.html` (protótipo de referência) | **Não está no repo** |
| `source_key` populado nos pontos do diagnóstico | **Não** — colunas existem nas migrations, mas o encanamento frontend → POST → persistência grava `null` em todos os caminhos investigados |

**Observação:** `source_key` aparece em scripts de import Excel (`docs/import_matrix_nodes_from_excel*.py`) e em testes/fixtures com valor `null`. Não há implementação de propagação `source_key ?? id` em nenhum ponto do fluxo matriz → esteira.

---

## 1. Problema

Apontamentos de tempo (`conveyor_time_entries`) referenciam um nó STEP (`conveyor_node_id`), mas não carregam identidade de “tipo de atividade” entre esteiras. A coluna `conveyor_nodes.source_key` existe para isso, mas hoje permanece `NULL` na criação de esteiras — mesmo quando a atividade nasce de uma matriz com `matrix_nodes.source_key` preenchido.

Sem lineage estável, não é possível agrupar tempo realizado de atividades equivalentes em esteiras diferentes (pré-requisito para calibragem estatística futura, **fora de escopo**).

**Regra de negócio acordada:**

- Tempo planejado e responsável **não** afetam identidade.
- Só edição de **descrição** de atividade reaproveitada deve acionar decisão explícita manter/quebrar vínculo (UI futura; protótipo ainda não versionado).
- **Propagação:** `novoSourceKey = original.source_key ?? original.id` — dois clones do mesmo original devem convergir para a **mesma** `source_key`, nunca formar cadeia de ponteiros (clone de clone apontando para ID do intermediário).

---

## 2. Estado atual confirmado

### 2.1 Colunas no banco — confirmado, sem migration nova

`matrix_nodes.source_key` e `conveyor_nodes.source_key` existem como `VARCHAR(100) NULL`:

- `server/migrations/0003_matrix_nodes.sql` (linha 21)
- `server/migrations/0005_conveyors_and_nodes.sql` (linha 85)

### 2.2 Ponto 1 — `cloneTaskSubtreeWithNewIds` (draft de Nova Matriz)

**Status: confirmado — gap persiste.**

Arquivo: `src/features/operation-matrix/criar-matriz/cloneCatalogTaskSubtreeForDraft.ts`

```37:43:src/features/operation-matrix/criar-matriz/cloneCatalogTaskSubtreeForDraft.ts
    return {
      ...node,
      id: newId,
      parent_id: mappedParent,
      root_id: newTaskId,
      children: sortChildren(node).map(rebuild),
    }
```

O spread `...node` preserva `source_key` do original (geralmente `null`) sem aplicar fallback para `node.id` (ID original, antes do remap). Usado em `OperationMatrixNewPage.tsx` ao adicionar/duplicar tarefa do catálogo.

**PRs weekly-agenda:** não tocaram este arquivo.

### 2.3 Ponto 1b (adicional) — `cloneTaskSubtreeUnderItem` (persistência API da Nova Matriz)

**Status: gap relacionado, não estava no diagnóstico original.**

Arquivo: `src/features/operation-matrix/criar-matriz/cloneMatrixTaskSubtree.ts`

```16:26:src/features/operation-matrix/criar-matriz/cloneMatrixTaskSubtree.ts
  const shared = {
    parentId,
    name: node.name,
    code: node.code,
    description: node.description,
    orderIndex: node.order_index,
    isActive: node.is_active,
    required: node.required,
    sourceKey: node.source_key,
    metadataJson: node.metadata_json ?? undefined,
  }
```

Passa `sourceKey: node.source_key` sem fallback. Após submit do wizard (`OperationMatrixNewPage.handleSubmitFinal`), o draft clonado persiste com `source_key = null` no banco.

**PRs weekly-agenda:** não tocaram este arquivo.

### 2.4 Ponto 2 — `emptyStepFromActivity` / `ManualStepDraft`

**Status: confirmado — gap persiste.**

Arquivo: `src/features/esteiras/nova-esteira/novaEsteiraDraftFromMatrix.ts`

```35:41:src/features/esteiras/nova-esteira/novaEsteiraDraftFromMatrix.ts
function emptyStepFromActivity(act: MatrixNodeTreeApi): ManualStepDraft {
  return {
    key: newKey(),
    titulo: act.name.trim(),
    plannedMinutes: Math.max(0, Math.floor(Number(act.planned_minutes ?? 0))),
    plannedQuantity: 1,
  }
}
```

`ManualStepDraft` em `matrixToConveyorCreateInput.ts` não tem campo de identidade:

```197:202:src/features/esteiras/nova-esteira/matrixToConveyorCreateInput.ts
export type ManualStepDraft = {
  key: string
  titulo: string
  plannedMinutes: number
  plannedQuantity?: number
}
```

**Nota:** `ManualOptionDraft.catalogSourceKey` é conceito **diferente** — dedup de opção/catálogo (`mroot:…`, `t:…`), não lineage de atividade.

**PRs weekly-agenda:** não tocaram estes arquivos.

### 2.5 Ponto 3 — `mapMatrixTreeToConveyorOptionsWithOrigin` (caminho direto matriz → POST)

**Status: confirmado — gap persiste.**

Arquivo: `src/features/esteiras/nova-esteira/matrixToConveyorCreateInput.ts`

```58:68:src/features/esteiras/nova-esteira/matrixToConveyorCreateInput.ts
          ).map((act) => ({
            titulo: act.name.trim(),
            orderIndex: act.order_index + 1,
            plannedMinutes: Math.max(
              0,
              Math.floor(Number(act.planned_minutes ?? 0)),
            ),
            plannedQuantity: 1,
            sourceOrigin: nodeOrigin,
            required: act.required,
            assignees: assignmentsByMatrixActivityId[act.id] ?? [],
          })),
```

**Observação de escopo:** este caminho (`buildCreateConveyorFromMatrixInput`, `buildCreateConveyorFromBaseAndComplementMatrices`) **não é usado em produção hoje** — `ConveyorCreateEditPage` materializa matriz via draft manual (`matrixItemTreeToManualOptions` → `buildManualConveyorInput`). Mesmo assim, deve ser corrigido por simetria e para uso futuro (ex.: R6).

`buildManualConveyorInput` (caminho de produção) também não propaga identidade:

```217:225:src/features/esteiras/nova-esteira/matrixToConveyorCreateInput.ts
      steps: ar.steps.map((st, si) => ({
        titulo: st.titulo.trim(),
        orderIndex: si + 1,
        plannedMinutes: Math.max(0, Math.floor(st.plannedMinutes)),
        plannedQuantity: 1,
        sourceOrigin: 'manual',
        required: true,
        assignees: assigneesByStepKey[st.key] ?? [],
      })),
```

**PRs weekly-agenda:** não tocaram estes arquivos.

### 2.6 Ponto 4 — `CreateConveyorStepInput` sem campo de identidade

**Status: confirmado.**

Arquivo: `src/domain/conveyors/conveyor.types.ts`

```35:44:src/domain/conveyors/conveyor.types.ts
export type CreateConveyorStepInput = {
  titulo: string
  orderIndex: number
  plannedMinutes: number
  plannedQuantity?: number
  sourceOrigin: ConveyorSourceOrigin
  required?: boolean
  /** Se não vazio, deve haver exatamente um `isPrimary: true` (validação no servidor). */
  assignees?: CreateConveyorStepAssigneeInput[]
}
```

Schema Zod correspondente (`postConveyorStepSchema` em `conveyors.schemas.ts`) também não aceita `sourceKey`.

**PRs weekly-agenda:** não tocaram.

### 2.7 Ponto 5 — Handler POST `/api/v1/conveyors` não grava `source_key`

**Status: confirmado.**

- Controller: `server/src/modules/conveyors/conveyors.controller.ts` → `postConveyor` → `serviceCreateConveyor`
- Materialização: `materializeConveyorOptions` em `conveyors.service.ts` força `source_key: null` em OPTION, AREA e STEP (linhas 506, 533, 560)
- O mesmo helper é reutilizado no PATCH de estrutura (linha ~953)
- Repository (`insertConveyorNode`) **já suporta** gravar `source_key` — só falta receber o valor

**PRs weekly-agenda:** commit `d3249146` (“Tela planejamento semanal”) tocou `conveyors.service.ts` apenas para `stripConveyorPlanningTempoFromNotes` em `initial_notes` — **sem relação com `source_key`**.

### 2.8 Impacto das PRs weekly-agenda (PR-1 a PR-5)

| Área do diagnóstico | Tocada por weekly-agenda? |
|---|---|
| `cloneCatalogTaskSubtreeForDraft.ts` | Não |
| `cloneMatrixTaskSubtree.ts` | Não |
| `novaEsteiraDraftFromMatrix.ts` | Não |
| `matrixToConveyorCreateInput.ts` | Não |
| `conveyor.types.ts` | Não |
| `conveyors.schemas.ts` | Não |
| `conveyors.service.ts` | Sim — apenas strip de notas de planejamento |
| `src/features/weekly-agenda/**` | N/A — fora de escopo |

**Conclusão:** weekly-agenda não alterou o diagnóstico de lineage. Áreas distintas confirmadas.

### 2.9 Gaps adicionais (fora do diagnóstico original, mesma família)

| Local | Problema |
|---|---|
| `operationMatrixPreviewPersist.ts` → `toCreateMatrixNodeInput` | Não envia `sourceKey` ao criar nós pendentes no preview |
| `createManualMatrixStructure.ts` | Cria TASK/SECTOR/ACTIVITY sem `sourceKey` (fica `null` no banco; aceitável se fallback for na leitura/propagação) |
| `operationMatrixPreviewStructureCreate.ts` | Nós pendentes nascem com `source_key: null` |

Estes não bloqueiam o objetivo imediato (esteira), mas afetam lineage na matriz. **Recomendação:** incluir `cloneMatrixTaskSubtree.ts` e `cloneTaskSubtreeWithNewIds` no PR de encanamento; deixar preview-persist e estrutura manual para PR separado ou mesma branch se diff permanecer pequeno.

---

## 3. Design proposto

### 3.1 Regra central (helper compartilhado)

Criar helper puro (ex.: `resolveActivitySourceKey(node: { id: string; source_key?: string | null })`) em local compartilhado do domínio matriz:

```typescript
export function resolveNodeSourceKey(node: {
  id: string
  source_key?: string | null
}): string {
  const sk = node.source_key?.trim()
  return sk && sk.length > 0 ? sk : node.id
}
```

Usar em todos os pontos de propagação. **Nunca** usar o novo ID gerado no clone — sempre o ID (ou `source_key` já resolvida) do nó **de origem** naquela operação.

### 3.2 Ponto 1 — `cloneTaskSubtreeWithNewIds`

```typescript
return {
  ...node,
  id: newId,
  parent_id: mappedParent,
  root_id: newTaskId,
  source_key: resolveNodeSourceKey(node), // node.id = ID original neste ponto
  children: sortChildren(node).map(rebuild),
}
```

### 3.3 Ponto 1b — `cloneMatrixTaskSubtree.ts`

```typescript
sourceKey: resolveNodeSourceKey(node),
```

### 3.4 Ponto 2 — draft de esteira

`ManualStepDraft`:

```typescript
export type ManualStepDraft = {
  key: string
  titulo: string
  plannedMinutes: number
  plannedQuantity?: number
  /** Lineage de atividade — propagado para conveyor_nodes.source_key */
  sourceKey?: string | null
}
```

`emptyStepFromActivity`:

```typescript
sourceKey: resolveNodeSourceKey(act),
```

### 3.5 Ponto 3 — mapeamento para POST

Em `mapMatrixTreeToConveyorOptionsWithOrigin` (steps):

```typescript
sourceKey: resolveNodeSourceKey(act),
```

Em `buildManualConveyorInput` (steps):

```typescript
sourceKey: st.sourceKey ?? null,
```

### 3.6 Ponto 4 — contrato frontend

`CreateConveyorStepInput`:

```typescript
/** Identidade estável da atividade (lineage matriz → esteira). Opcional — retrocompat. */
sourceKey?: string | null
```

### 3.7 Ponto 5 — backend

`postConveyorStepSchema`:

```typescript
sourceKey: z.string().max(100).nullable().optional(),
```

`materializeConveyorOptions` — apenas STEP recebe lineage (OPTION/AREA permanecem `null`):

```typescript
source_key: st.sourceKey?.trim() || null,
```

**Decisão:** lineage só em STEP, pois apontamentos referenciam STEP. OPTION/AREA não precisam de `source_key` para o objetivo atual.

### 3.8 UI de decisão manter/quebrar vínculo

**Fora deste PR.** Quando implementada, ao quebrar vínculo: gerar novo `source_key` (ex.: novo UUID) e persistir via PATCH de matriz. Protótipo `matriz-reaproveitamento-decisao.html` deve ser copiado para `docs/discovery/` em tarefa separada.

---

## 4. Impacto no contrato de API

| Aspecto | Impacto |
|---|---|
| POST `/api/v1/conveyors` | Campo opcional `sourceKey` em cada step — **aditivo**, clientes antigos ignoram |
| PATCH `/api/v1/conveyors/:id/structure` | Mesmo schema de options — aditivo |
| GET `/api/v1/conveyors/:id` | Sem mudança (estrutura retornada hoje não expõe `source_key`; pode ser PR futuro) |
| POST/PATCH matriz | Sem mudança de contrato neste PR (fallback aplicado no frontend antes do POST conveyors) |

Validação Zod: `sourceKey` string até 100 chars, nullable, opcional — alinhado à coluna VARCHAR(100).

---

## 5. Compatibilidade multi-tenant

- Deploy atual é instância dedicada (Bravo); não há coluna `tenant_id` em `matrix_nodes` / `conveyor_nodes`.
- `source_key` é opaco e local ao ambiente; não há risco cross-tenant enquanto bancos forem isolados por ambiente (regra já vigente: `.env` local nunca aponta PRD/HML).
- Esteiras e matrizes existentes com `source_key = NULL` **continuam válidas** — nenhum backfill obrigatório.
- Novas esteiras passam a gravar `source_key` quando o frontend enviar; esteiras antigas permanecem sem lineage até recriação/edição estrutural (se implementado no futuro).

---

## 6. Estratégia de teste

### 6.1 Cenário crítico (obrigatório)

**Dois clones do mesmo original convergem para a mesma `source_key`:**

```
Original A (source_key=null, id=aaa)
  → Clone B: source_key=aaa
  → Clone C: source_key=aaa   (NÃO source_key=bbb)
```

Testar em:
1. `cloneTaskSubtreeWithNewIds` — duas chamadas sobre o mesmo `taskRoot`
2. `buildManualConveyorInput` após `matrixItemTreeToManualOptions` — duas opções com mesma atividade clonada
3. Integração: POST conveyors mock verificando payload com `sourceKey` igual

### 6.2 Cenários adicionais

| # | Cenário | Esperado |
|---|---|---|
| T2 | Atividade com `source_key='sk-legacy'` na matriz | Esteira grava `source_key='sk-legacy'` |
| T3 | Atividade manual (sem matriz) | `sourceKey` ausente ou `null` no POST |
| T4 | `buildManualConveyorInput` com step que tem `sourceKey` | Repassa no payload |
| T5 | `mapMatrixTreeToConveyorOptions` | Steps incluem `sourceKey` |
| T6 | Backend `materializeConveyorOptions` | `insertConveyorNode` recebe `source_key` do body |
| T7 | POST sem `sourceKey` (cliente legado) | `source_key=null` no banco — sem erro |

### 6.3 Onde testar

- Unit: `cloneCatalogTaskSubtreeForDraft` (novo arquivo de teste ou estender existente)
- Unit: `novaEsteiraDraftFromMatrix.test.ts`, `matrixToConveyorCreateInput.test.ts`
- Unit: `cloneMatrixTaskSubtree.test.ts` — adicionar caso com `sourceKey` propagado
- Backend: teste de service ou schema se já houver padrão em `conveyors.*.test.ts`

---

## 7. Riscos e guardrails específicos desta mudança

| Guardrail | Como respeitar |
|---|---|
| Aditivo, NULL permitido | `sourceKey` opcional em todo o pipeline; backend default `null` |
| Sem migration | Colunas já existem |
| PR pequeno | PR-1 = encanamento; PR-2 (futuro) = UI decisão descrição |
| Não quebrar esteiras existentes | Nenhum backfill; nenhuma validação obrigatória |
| Não formar cadeia de ponteiros | Teste T1 obrigatório; helper único `resolveNodeSourceKey` |
| Não misturar `catalogSourceKey` com lineage | Campos separados; documentar no código |
| weekly-agenda fora de escopo | Não tocar `src/features/weekly-agenda/` |

**Risco baixo:** confusão entre `catalogSourceKey` (opção) e `sourceKey` (atividade). Mitigação: nome `sourceKey` no step alinhado à coluna `source_key`.

**Risco médio (aceito):** matrizes já persistidas com `source_key=null` só ganham lineage na propagação para **novas** esteiras (via `act.id`), não retroativamente na matriz. Coerente com regra `?? id`.

---

## 8. Perguntas em aberto

1. **Backfill de matrizes existentes?** Propagar `source_key = id` em massa para nós com `NULL` facilitaria queries na matriz, mas não é necessário para o objetivo de esteira. Decisão do dono do produto.
2. **Expor `source_key` no GET de esteira?** Útil para debug e ferramentas futuras; pode ser PR separado.
3. **Copiar protótipo HTML** `matriz-reaproveitamento-decisao.html` para o repo? Não localizado — confirmar se ainda é referência válida.
4. **Incluir preview-persist e criação manual de matriz** no mesmo PR ou separar? Depende do tamanho do diff após implementação.
5. **R6 / ingestão de documento:** quando voltar a usar `buildCreateConveyorFromMatrixInput` em produção, o fix no ponto 3 já cobre?

---

## 9. Plano de PRs

### PR-1 — Encanamento de dados (este PR)

**Branch sugerida:** `feature/source-key-lineage-plumbing`

| Camada | Arquivos |
|---|---|
| Helper | Novo util domínio matriz (ex. `resolveNodeSourceKey`) |
| Matriz draft | `cloneCatalogTaskSubtreeForDraft.ts`, `cloneMatrixTaskSubtree.ts` |
| Esteira draft → POST | `novaEsteiraDraftFromMatrix.ts`, `matrixToConveyorCreateInput.ts` |
| Contrato FE | `conveyor.types.ts` |
| Contrato BE | `conveyors.schemas.ts`, `conveyors.service.ts` |
| Testes | Arquivos `*.test.ts` correspondentes |

**Não incluir:** UI de decisão, backfill SQL, weekly-agenda, motor de calibragem.

### PR-2 — UI decisão manter/quebrar vínculo (futuro)

- Protótipo HTML em `docs/discovery/`
- Fluxo ao renomear atividade reaproveitada na matriz
- PATCH `sourceKey` explícito ao quebrar vínculo

### PR-3 (opcional) — Matriz preview + criação manual

- `operationMatrixPreviewPersist.ts`
- `createManualMatrixStructure.ts`

---

## 10. Conferência item a item contra o diagnóstico original

| # | Item do diagnóstico original | Status | Nota (se não for Confirmado) |
|---|---|---|---|
| 1 | `cloneTaskSubtreeWithNewIds` não faz fallback de source_key | **Confirmado** | Gap persiste em `cloneCatalogTaskSubtreeForDraft.ts` |
| 2 | `emptyStepFromActivity` / `ManualStepDraft` sem campo de identidade | **Confirmado** | `catalogSourceKey` é outro conceito (opção) |
| 3 | `matrixToConveyorCreateInput.ts` (linha ~59) mesmo problema | **Confirmado** | Caminho direto não usado em produção hoje; `buildManualConveyorInput` também afetado |
| 4 | `CreateConveyorStepInput` sem campo pra identidade | **Confirmado** | Schema Zod também sem campo |
| 5 | Handler POST /api/v1/conveyors não grava source_key | **Confirmado** | `materializeConveyorOptions` força `null`; handler = `postConveyor` → `serviceCreateConveyor` |
| 6 | Regra de propagação `source_key = original.source_key ?? original.id` | **Confirmado como requisito** | Não implementada em nenhum ponto do código |

**Itens adicionais identificados na investigação:**

| # | Item adicional | Status |
|---|---|---|
| A | `cloneMatrixTaskSubtree.ts` sem fallback na persistência API | Confirmado |
| B | Colunas DB já existem — sem migration | Confirmado |
| C | weekly-agenda não impacta diagnóstico | Confirmado |
| D | Trabalho prévio (branch/SDD/implementação) | Não existia |
