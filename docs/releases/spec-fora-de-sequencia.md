# Especificação de Implementação — Regra "Fora de Sequência" por dono do planejamento

> **Para:** agente de código (Cursor / Claude Code) executar de forma autônoma.
> **Repositório:** SGP (monorepo — `server/` backend Node/TS + Postgres, `src/` frontend React/TS).
> **Natureza:** ajuste **provisório**, até o fechamento do sistema. Priorizar mudança cirúrgica e retrocompatível.
> **Não** faça deploy nem rode migrações destrutivas. Sem alteração de schema.

---

## 1. Contexto / problema

Hoje uma atividade (STEP) é marcada como **"fora de sequência"** sempre que existe **qualquer** atividade anterior (na ordem estrutural da esteira) ainda não concluída. Isso dispara três efeitos a partir de um único flag `isOutOfSequence`:

1. Badge "Fora de sequência" na UI.
2. Justificativa obrigatória no apontamento.
3. Bloqueio HTTP 422 na conclusão/apontamento.

**Problema:** um colaborador é bloqueado por uma atividade anterior que **não é dele** (é de outro colaborador). O apontamento das horas é orientado pelo **planejamento**, não pela esteira.

### Modelo operacional (para entender o "dono")
Gestor cria uma **matriz** (tarefa/setor/atividade + time/responsável) → Admin gera a **esteira** a partir da matriz → Líder faz o **planejamento** (aloca colaborador por atividade, podendo planejar tudo / semana / dia) → Fábrica **executa e aponta**. O "dono" de uma atividade, para efeito desta regra, é **quem está planejado para ela** (`operational_work_plan_items.assigned_collaborator_id`).

---

## 2. Objetivo (comportamento alvo)

Para o colaborador **C** apontando a atividade **A** numa esteira:

- **🔴 Fora de sequência (bloqueante)** — apenas quando existe atividade **anterior**, ainda **não concluída**, **planejada para o próprio C**. Mantém badge + justificativa + 422.
- **🟡 Aguardando etapa X (informativo)** — quando existe atividade anterior, não concluída, planejada para **outro** colaborador. Mostra rótulo nomeando a etapa. **Não** bloqueia, **não** pede justificativa.
- **Ignorada** — atividade anterior não concluída **não planejada** ou **sem colaborador** alocado. Nenhum efeito.
- Atividade anterior **concluída** (`COMPLETED`) nunca conta (comportamento atual).

### Tabela de decisão

| Predecessora aberta (não `COMPLETED`) | `isOutOfSequence` | Justificativa | UI |
|---------------------------------------|:-----------------:|:-------------:|----|
| Planejada para o **próprio** C | ✅ true | obrigatória | 🔴 Badge "Fora de sequência" |
| Planejada para **outro** colaborador | ❌ false | não | 🟡 "Aguardando etapa {nome}" |
| **Não planejada** ainda | ❌ false | não | — (nada) |
| Planejada **sem colaborador** (ou só time) | ❌ false | não | — (nada) |

---

## 3. Fonte de verdade do "dono"

Tabela `operational_work_plan_items` (migração `0034_operational_work_plans.sql`). Colunas relevantes:
`conveyor_id`, `activity_node_id`, `assigned_collaborator_id` (NULL permitido), `assigned_team_id` (NULL permitido), `status` (`PLANNED` | `MOVED` | `CANCELLED`), `deleted_at`.

**Regra de posse:** uma atividade é "planejada para C" se existir item **não deletado** e **status ≠ `CANCELLED`** com `assigned_collaborator_id = C` para aquele `activity_node_id` na esteira.

> ⚠️ **Simplificação provisória (confirmada):** posse considera **apenas** `assigned_collaborator_id`. Itens com só `assigned_team_id` (sem colaborador) contam como **sem dono** → ignorados. **Consequência:** se o planejamento for feito só em nível de time (sem alocar pessoa), nenhuma atividade terá dono e a regra bloqueante nunca dispara. Deixar `// TODO(definitivo): considerar assigned_team_id + team_members` no código.

---

## 4. Mudança na função core (pura)

**Arquivo:** `server/src/modules/conveyors/conveyorActivitySequence.logic.ts`

### 4.1. Estender o tipo de retorno (retrocompatível)
```ts
export type ConveyorActivitySequenceAnalysis = {
  targetFound: boolean
  isOutOfSequence: boolean            // AGORA: existe predecessora aberta planejada para o colaborador atual
  previousOpenCount: number           // predecessoras abertas PRÓPRIAS (bloqueantes)
  previousOpenActivities: PreviousOpenActivitySummary[]  // próprias
  awaitingOthersCount: number         // NOVO: predecessoras abertas de OUTRO colaborador
  awaitingOthersActivities: PreviousOpenActivitySummary[] // NOVO: para o rótulo informativo
}
```

### 4.2. Novo parâmetro opcional de posse
```ts
export type SequenceOwnershipContext = {
  currentCollaboratorId: string
  /** activity_node_id -> conjunto de collaborator_ids planejados (exclui NULL). Chave ausente = não planejada. */
  plannedCollaboratorsByActivityNodeId: Map<string, Set<string>>
}

export function analyzeConveyorActivitySequence(
  nodes: SequenceAnalysisNode[],
  activityNodeId: string,
  ownership?: SequenceOwnershipContext, // NOVO, opcional
): ConveyorActivitySequenceAnalysis
```

### 4.3. Lógica de classificação de cada predecessora aberta `P`
Após montar `openBefore` (predecessoras com `operational_status ?? 'PENDING' !== 'COMPLETED'`):

- **Sem `ownership`** (retrocompat / visão do gestor): todas as `openBefore` vão para `previousOpenActivities` (comportamento atual). `awaitingOthers*` vazios. `isOutOfSequence = previousOpenCount > 0`.
- **Com `ownership`**: para cada `P`, seja `owners = plannedCollaboratorsByActivityNodeId.get(P.id)`:
  - `owners` contém `currentCollaboratorId` → **própria** → `previousOpenActivities`.
  - `owners` não-vazio e **não** contém `currentCollaboratorId` → **de terceiro** → `awaitingOthersActivities`.
  - `owners` indefinido ou vazio → **ignorada** (nenhuma lista).
  - `isOutOfSequence = previousOpenActivities.length > 0`.

Manter os campos `targetFound` e o early-return de `targetFound: false` acrescentando `awaitingOthersCount: 0, awaitingOthersActivities: []`.

---

## 5. Nova query (mapa de posse por esteira)

**Arquivo:** `server/src/modules/conveyors/conveyors.repository.ts` (ao lado de `listConveyorNodesForSequenceAnalysis`).

```ts
export async function listPlannedCollaboratorsByActivityNode(
  pool: pg.Pool | pg.PoolClient,
  conveyorId: string,
): Promise<Map<string, Set<string>>> {
  const r = await pool.query<{ activity_node_id: string; assigned_collaborator_id: string }>(
    `SELECT activity_node_id::text, assigned_collaborator_id::text
       FROM operational_work_plan_items
      WHERE conveyor_id = $1::uuid
        AND deleted_at IS NULL
        AND status <> 'CANCELLED'
        AND assigned_collaborator_id IS NOT NULL`,
    [conveyorId],
  )
  const map = new Map<string, Set<string>>()
  for (const row of r.rows) {
    const set = map.get(row.activity_node_id) ?? new Set<string>()
    set.add(row.assigned_collaborator_id)
    map.set(row.activity_node_id, set)
  }
  return map
}
```

> **Importante:** esta query **NÃO** deve filtrar por colaborador — precisa enxergar os donos de **todas** as atividades da esteira (inclusive de terceiros). Escopo = qualquer plano ativo da esteira (decisão fechada: posse independe da data/semana).

**Arquivo:** `server/src/modules/conveyors/conveyorActivitySequence.service.ts` — estender `serviceAnalyzeConveyorActivitySequence` com um 4º parâmetro opcional `currentCollaboratorId?: string`. Quando presente, carregar o mapa via a nova query e montar o `SequenceOwnershipContext` antes de chamar a função pura.

```ts
export async function serviceAnalyzeConveyorActivitySequence(
  pool, conveyorId, activityNodeId,
  currentCollaboratorId?: string,
): Promise<ConveyorActivitySequenceAnalysis>
```

---

## 6. Call sites — passar o colaborador atual

A função core é usada em 6 superfícies. Regra: **todas as superfícies de colaborador passam o colaborador atual; a de planejamento do gestor NÃO passa** (mantém comportamento antigo).

| Arquivo | Ação |
|---------|------|
| `server/src/modules/my-work-queue/my-work-queue.service.ts` | Já tem `collaboratorId`. Carregar mapa de posse por esteira (junto de `nodesByConveyor`) e passar ao `analyze...`. Manter `isOutOfSequence = !isActivityCompleted && seq.isOutOfSequence`. Popular novos campos de "awaiting" no item. |
| `server/src/modules/my-activities/my-activities.service.ts` | Passar o colaborador logado. |
| `server/src/modules/production/production-time-entries.service.ts` | **Crítico:** passar o colaborador que está apontando (o mesmo resolvido em `resolveProductionStepAssigneeId` / input). Sem isso, o 422 volta a bloquear todos. |
| `server/src/modules/conveyors/conveyorAssignments.service.ts` | Nos 3 pontos que chamam `serviceAnalyzeConveyorActivitySequence` (conclusão/apontamento), passar o colaborador atuante. |
| `server/src/modules/operational-journey/operational-journey.service.ts` | Lê `is_out_of_sequence` **persistido** — não recomputa. Nenhuma mudança de lógica; apenas herda o novo valor gravado em novos apontamentos. |
| `server/src/modules/operational-planning/operational-planning.service.ts` | **NÃO** passar colaborador. Comportamento inalterado. |

> **Regra de ouro:** qualquer fluxo de apontamento/conclusão que **esqueça** de passar o colaborador cai no comportamento antigo (bloqueia por qualquer pendência). Garantir que todos os POST de apontamento passem.

O bloqueio 422 e a exigência de justificativa **não precisam de alteração própria** — eles já derivam de `seq.isOutOfSequence`, que agora é "só do próprio". Ver `server/src/modules/conveyors/conveyor-step-operational.service.ts` (bloco `if (seq.isOutOfSequence)`) e `production-work-queue.rules.ts` → `resolveProductionRequiresOutOfSequenceJustification` (mantém `!isActivityCompleted && isOutOfSequence`).

---

## 7. DTOs / contrato de API

Adicionar o campo informativo de "aguardando" onde a UI consome. Manter `isOutOfSequence` (agora só-próprio) e `requiresOutOfSequenceJustification` como estão.

Arquivos:
- `server/src/modules/my-work-queue/my-work-queue.dto.ts`
- `server/src/modules/production/production-work-queue.dto.ts`
- `server/src/modules/my-activities/my-activities.dto.ts`
- `server/src/modules/conveyors/conveyorAssignments.dto.ts`

Campo sugerido (nome consistente entre DTOs):
```ts
awaitingPreviousActivities: Array<{
  activityNodeId: string
  activityTitle: string
  sectorTitle: string
  taskTitle: string
  orderPath: string
}>
// derivado: isAwaitingOthers = awaitingPreviousActivities.length > 0
```
Preencher a partir de `seq.awaitingOthersActivities` (limitar a 3, como já se faz com `previousOpenActivities.slice(0, 3)`).

---

## 8. Frontend

- **Tipos/serviço:** `src/services/conveyors/conveyorsApiService.ts` e `src/features/my-work-queue/myWorkQueueUi.ts` — adicionar o novo campo `awaitingPreviousActivities` / `isAwaitingOthers`.
- **Rótulo informativo 🟡** onde hoje aparece a badge:
  - `src/features/my-work-queue/MyWorkQueuePage.tsx` (badge em ~L110/L161; KPI em ~L332)
  - `src/features/colaborador/JornadaPage.tsx` (~L613)
  - Cards de apontamento: `src/features/kiosk/KioskActivityCard.tsx`, `src/features/shell/QuickTimeEntryDrawer.tsx`
  - Texto: **"Aguardando etapa {activityTitle}"** (usar a primeira de `awaitingPreviousActivities`; se houver várias, "Aguardando {n} etapas anteriores"). Estilo informativo/neutro — **distinto** da badge de alerta 🔴.
- **Justificativa:** garantir que o campo de justificativa e o gate só apareçam para `isOutOfSequence`/`requiresOutOfSequenceJustification` (próprio). O estado "awaiting" **nunca** abre justificativa. Ver `src/features/shell/quickTimeEntryDrawerLogic.ts` (`candidateNeedsOutOfSequenceJustification`) — não incluir awaiting.
- A badge 🔴 "Fora de sequência" continua ligada só a `isOutOfSequence` (já correto após o backend).

---

## 9. Testes (obrigatório)

Atualizar/estender:
- `server/src/tests/conveyorActivitySequence.logic.test.ts` — núcleo da regra.
- `server/src/tests/production-work-queue.rules.test.ts`
- `server/src/tests/production-time-entries.integration.test.ts`
- `server/src/tests/admin-time-entry-mark-as-done.integration.test.ts`
- `src/domain/production/production.helpers.test.ts`, `src/domain/production/kioskActivityCardLogic.test.ts`, `src/features/shell/quickTimeEntryDrawerLogic.test.ts`

Casos que **devem** existir para a função core (esteira: 1 Desmontagem, 2 Funilaria, 3 Pintura, 4 Montagem):
1. Pred. anterior aberta **do próprio** C → `isOutOfSequence = true`, entra em `previousOpenActivities`, `awaitingOthers` vazio.
2. Pred. anterior aberta **de outro** colaborador → `isOutOfSequence = false`, entra em `awaitingOthersActivities`.
3. Pred. anterior aberta **não planejada** → `isOutOfSequence = false`, ambas as listas vazias.
4. Pred. anterior aberta **sem colaborador** (só time) → como (3), ignorada.
5. Mistura: uma pred. própria aberta + uma de terceiro aberta → `isOutOfSequence = true` **e** `awaitingOthers` populado.
6. Pred. anterior **COMPLETED** → não conta em nenhuma lista.
7. **Sem `ownership`** (visão do gestor) → comportamento atual preservado (toda pred. aberta é bloqueante).
8. Cenário-alvo ponta a ponta: C=João aponta Pintura(3) com Funilaria(2) pendente da Maria → **não** bloqueia, **sem** justificativa, retorna awaiting nomeando "Funilaria".

---

## 10. Critérios de aceite

- [ ] João aponta/conclui a Pintura com a Funilaria da Maria pendente, **sem** 422 e **sem** justificativa; UI mostra 🟡 "Aguardando etapa Funilaria".
- [ ] Se a pendência anterior fosse do próprio João, mantém 🔴 badge + justificativa + 422 (inalterado).
- [ ] Predecessora não planejada / sem colaborador não gera bloqueio nem rótulo.
- [ ] Tela de **planejamento do gestor** inalterada.
- [ ] Todos os fluxos de apontamento (produção, kiosk, quick entry, conveyorAssignments) passam o colaborador atuante ao `analyze...`.
- [ ] Suites de teste (`server` e raiz) verdes: `cd server && npx vitest run` e, na raiz, `npx vitest run`.
- [ ] Sem alteração de schema; sem migração nova.

---

## 11. Fora de escopo

- Considerar `assigned_team_id` + `team_members` na posse (deixar `TODO(definitivo)`).
- Recomputar `is_out_of_sequence` histórico na jornada operacional.
- Exibir o **nome do colaborador** dono no rótulo (por ora só o nome da **etapa**).
- Qualquer mudança na visão de supervisão do gestor.

---

## 12. Ordem sugerida de execução

1. Função core + tipos (`conveyorActivitySequence.logic.ts`) + testes unitários.
2. Query de posse (`conveyors.repository.ts`) + service wrapper (`conveyorActivitySequence.service.ts`).
3. Call sites de colaborador (work-queue, my-activities, produção, conveyorAssignments).
4. DTOs + campo `awaitingPreviousActivities`.
5. Frontend (tipos, rótulo 🟡, garantir justificativa só no 🔴).
6. Testes de integração + rodar suites + ajustar.
