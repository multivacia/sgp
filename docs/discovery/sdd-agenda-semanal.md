# SDD — Agenda da Semana (nova tela)

> **Etapa:** 1 — Discovery (SDD). Implementação bloqueada até aprovação explícita.
>
> **Repositório investigado:** `sgp-argos` (`C:\Users\gustavoalmeida\Documents\sgp-argos`)
>
> **Data:** 2026-07-04

---

## 1. Problema e objetivo

A tela atual de **Planejamento** (`/app/planejamento-semanal`, `OperationalPlanningPage.tsx`) concentra demasiada informação: múltiplos KPIs, painéis de desvio, factory intake, kanban diário, histórico e quadro semanal competindo pela mesma atenção. A Bravo reportou três dores operacionais concretas:

1. **Interface poluída** — difícil enxergar o essencial da semana.
2. **Drag-and-drop frágil em touch** — o DnD atual só cobre backlog → célula, com `PointerSensor` e sem arrastar itens já planejados.
3. **Falta de visão rápida do que falta alocar** — backlog e modo guiado de alocação em lote ausentes na experiência desejada.

**Objetivo desta iniciativa:** entregar uma **tela nova e adicional**, **Agenda da Semana**, validada com a Bravo via protótipo `docs/discovery/planejamento-combinado.html`, que ofereça:

- Cabeçalho enxuto (semana, status, publicar, menu secundário).
- Faixa de resumo única (planejado, realizado, equipe + chip de atenção).
- Grade colaborador × dia com cards compactos.
- Backlog em gaveta flutuante.
- DnD completo (backlog → agenda, agenda → agenda, troca de dia por arraste até aba).
- Modo **Fila de alocação em lote** como overlay na mesma rota.
- Painel de atenção (sync + fora do plano) em drawer, não como banners permanentes.

A tela antiga **permanece intocada** até decisão de aposentadoria. Ambas convivem; compartilham o **mesmo plano semanal** no backend (mesmos endpoints).

---

## 2. Estado atual confirmado

### 2.1 API — `operationalPlanningApiService.ts`

**Arquivo:** `src/services/operational-planning/operationalPlanningApiService.ts`

Todas as funções citadas no diagnóstico **existem** com as assinaturas abaixo. Há também funções extras úteis não mencionadas no briefing.

```ts
export async function getOperationalPlanningWeek(
  weekStartDate: string,
): Promise<OperationalPlanningWeekPayload>

export async function saveOperationalPlanningWeek(
  body: SaveOperationalWeekPlanInput,
): Promise<OperationalPlanningWeekPayload>

export async function patchOperationalPlanningWeek(
  planId: string,
  body: SaveOperationalWeekPlanInput,
): Promise<OperationalPlanningWeekPayload>

export async function publishOperationalPlanningWeek(
  planId: string,
): Promise<{ published: boolean }>

export async function listOperationalPlanningBacklog(params: {
  q?: string
  limit?: number
  conveyorId?: string
  collaboratorId?: string
}): Promise<OperationalPlanningBacklogPayload>

export async function getFactoryIntakeItems(
  weekStart?: string,
): Promise<OperationalPlanningFactoryIntakePayload>

// Extras (não citados no diagnóstico, já usados na tela atual):
export async function applyConveyorPlanValuesToWeekItem(
  workPlanItemId: string,
  body?: { fields?: Array<'plannedDate' | 'plannedMinutes' | 'assignedCollaboratorId' | 'assignedTeamId'> },
): Promise<OperationalPlanningWeekPayload>

export async function getOperationalPlanningWeekActivity(
  weekStartDate: string,
  limit = 100,
): Promise<OperationalPlanningWeekActivityPayload>
```

**Contratos de domínio:** `src/domain/operational-planning/operational-planning.types.ts`

### 2.2 Capacidade por colaborador/dia — correção do diagnóstico

| Afirmação original | Status real |
|---|---|
| `operationalCapacity.service.ts` expõe `capacityByCollaboratorDay` | **Incorreto** |

**O que existe de fato:**

- `capacityByCollaboratorDay` vem no payload de **`getOperationalPlanningWeek`**, campo de `OperationalPlanningWeekPayload`:

```ts
capacityByCollaboratorDay: Array<{
  collaboratorId: string
  date: string
  capacityMinutes: number
  plannedMinutes: number
}>
```

- Calculado no backend em `server/src/modules/operational-planning/operational-planning.service.ts` → `buildCapacityByCollaboratorDay()`, que resolve capacidade via `serviceResolveCollaboratorDailyCapacity` **apenas para pares colaborador+dia que já têm itens planejados**.
- `src/services/operationalCapacity.service.ts` expõe CRUD/admin de configuração (`getOperationalCapacitySettings`, `getCollaboratorCapacityResolved`, etc.) — **não** retorna a matriz semanal do plano.

**Implicação para o modo Fila:** o cálculo de “quem tem mais folga” será **client-side**, combinando `draftItems` + `capacityByCollaboratorDay` + lista de colaboradores ativos. Dias sem linha em `capacityByCollaboratorDay` precisam de regra de fallback (ver §8).

### 2.3 Drag-and-drop — `@dnd-kit`

**Dependências confirmadas** em `package.json`:

- `@dnd-kit/core` ^6.3.1
- `@dnd-kit/sortable` ^10.0.0
- `@dnd-kit/utilities` ^3.2.2

**Uso atual em `OperationalPlanningPage.tsx`:**

```ts
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'

const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
```

**Limitações do DnD atual (importante para o SDD):**

| Comportamento do protótipo | Tela atual |
|---|---|
| Arrastar do backlog para célula | ✅ `handleDragEnd` com id `bl\|{activityNodeId}` → `cell\|{collaboratorId}\|{date}` |
| Arrastar item já planejado entre células | ❌ `PlanScheduledCard` não é draggable |
| Reordenar dentro do mesmo dia/colaborador | ❌ só botões move up/down |
| Arrastar até aba de outro dia muda o dia | ❌ não há drop zones nas abas |
| Touch confiável | ⚠️ só `PointerSensor`; sem `TouchSensor` dedicado |

**Padrão a seguir na nova tela:** `@dnd-kit` com `PointerSensor` + `TouchSensor` (activationConstraint), `useDraggable` para backlog e cards planejados, `useDroppable` para células e abas de dia, e `@dnd-kit/sortable` para reordenação intra-célula. **Não** reimplementar com pointer events crus (isso é só do HTML estático do protótipo).

**Helpers de ID já usados na tela atual** (referência para extrair/copiar):

```ts
function dragCellId(collaboratorId: string, plannedDate: string): string {
  return `cell|${collaboratorId}|${plannedDate}`
}
// backlog: `bl|${activityNodeId}`
// planejado (proposto): `plan|${localKey}`
// aba de dia (proposto): `day-tab|${isoDate}`
```

### 2.4 Modelo de dados — `plannedDate` + `plannedOrder`

**Confirmado.** Não há campo de hora de início/fim no plano semanal.

```ts
// OperationalPlanningPlanItem e SaveOperationalWeekPlanInput.items[]
plannedDate: string        // ISO date (dia útil da semana)
plannedOrder: number       // ordem dentro do dia + colaborador
plannedMinutes: number | null
```

Persistência e patch usam `buildSavePayload` → `recalculateOrders` (hoje funções privadas em `OperationalPlanningPage.tsx`, linhas ~200–249).

### 2.5 Componentes reutilizáveis da tela atual (sem alterá-la)

| Componente / módulo | Caminho | Uso na Agenda |
|---|---|---|
| Painel de divergências sync | `PlanningSyncIssuesPanel.tsx` | Drawer de atenção — seção sync |
| Badge sync por card | `PlanningSyncBadge.tsx` | Opcional nos cards compactos |
| Fora do plano | `PlanningExecutionOutsidePlanPanel.tsx` | Drawer de atenção — seção fora do plano |
| Helpers sync | `domain/operational-planning/planningSyncIssues.ts` | Contagem e listagem |
| Histórico da semana | `PlanningWeekHistoryPanel.tsx` | Menu ⋯ → histórico |
| Impressão de tickets | `PlanningWeekTicketsPrintDialog.tsx` + módulo `operational-tickets` | Menu ⋯ → imprimir |
| Backlog visível | `buildVisiblePlanningBacklogItems.ts` | Gaveta de backlog |
| Resumo operacional | `planningWeekOperationalSummary.ts` | Métricas da faixa de resumo |
| Formatação / capacidade | `planningBoardHelpers.ts` | Cards e estados de capacidade |
| Cópias de status do plano | `operationalPlanningPlanStatusCopy.ts` | Botões publicar/salvar |
| Navegação de semana | `operationalPlanningWeekRange.ts` | Segunda–sexta, labels PT |

**Padrão de import cross-feature:** já aceito no projeto (ex.: `operational-tickets` importa de `operational-planning`).

### 2.6 Rota, permissão e menu

| Item | Estado |
|---|---|
| Rota atual planejamento | `/app/planejamento-semanal` em `AppRoutes.tsx` com `RequirePermission permission="conveyors.create"` |
| Nav atual | `GESTAO_NAV_ITEMS` → label **"Planejamento"**, `permission: 'conveyors.create'` |
| Rota proposta `/app/agenda-semanal` | **Livre** — não existe conflito |
| Ícone sidebar | `AppSidebar.tsx` mapeia ícones por rota em switch local — **novo case necessário** para `/app/agenda-semanal` |

### 2.7 Regras de publicação (tela atual — replicar na Agenda)

**Frontend** (`OperationalPlanningPage.tsx`, botão Publicar):

```ts
disabled={
  busy ||
  dirty ||                        // alterações não salvas
  draftItems.length === 0 ||
  !weekPayload?.plan ||           // plano precisa existir (salvo ao menos uma vez)
  weekPayload.plan.status === 'PUBLISHED'
}
```

**Backend** (`servicePublishOperationalWeekPlan`):

- Plano deve existir.
- Status ≠ `PUBLISHED`.
- Pelo menos 1 item planejado.

**Nota:** `handlePublish` não salva antes de publicar; o botão fica desabilitado se `dirty`. Fluxo: salvar rascunho → publicar.

### 2.8 Protótipo HTML

**Status:** `docs/discovery/planejamento-combinado.html` **não encontrado** no repositório nem em buscas locais (Downloads, Documents, `.cursor`, `.sgp`). A pasta `docs/discovery/` foi criada com este SDD.

**Ação necessária antes da Etapa 2:** fornecer/copiar o arquivo para `docs/discovery/planejamento-combinado.html`. A implementação deve seguir esse HTML como especificação de interação e visual.

---

## 3. Arquitetura proposta

### 3.1 Nova feature — estrutura de pastas

Seguindo a convenção `src/features/<domínio>/`:

```
src/features/weekly-agenda/
├── WeeklyAgendaPage.tsx              # página raiz (estado, data fetching, orquestração)
├── components/
│   ├── WeeklyAgendaHeader.tsx        # semana, status, publicar, menu ⋯
│   ├── WeeklyAgendaSummaryStrip.tsx  # 3 métricas + chip atenção
│   ├── WeeklyAgendaBoard.tsx         # grade colaborador × dia (dia ativo em mobile)
│   ├── WeeklyAgendaDayTabs.tsx       # abas seg–sex; drop target para mudança de dia
│   ├── WeeklyAgendaCell.tsx          # célula droppable + lista sortable
│   ├── WeeklyAgendaPlanCard.tsx      # card compacto draggable
│   ├── WeeklyAgendaBacklogFab.tsx    # FAB com contador
│   ├── WeeklyAgendaBacklogDrawer.tsx # gaveta lateral inferior
│   ├── WeeklyAgendaAttentionDrawer.tsx # sync + fora do plano
│   ├── WeeklyAgendaQueueOverlay.tsx  # modo Fila (overlay full-screen)
│   └── WeeklyAgendaOverflowMenu.tsx  # salvar, imprimir, histórico
├── hooks/
│   ├── useWeeklyAgendaWeek.ts        # load week, backlog, collaborators
│   └── useWeeklyAgendaDnD.ts         # DndContext, sensors, onDragEnd
├── weeklyAgendaDraft.ts              # DraftPlanItem, recalculateOrders, buildSavePayload
├── weeklyAgendaDnD.ts                # parse ids, apply drag mutations
├── weeklyAgendaQueue.ts              # lógica do modo Fila + pickCollaboratorWithMostSlack
├── weeklyAgendaSummary.ts            # adaptador p/ métricas da faixa de resumo
└── *.test.ts                         # ao lado de cada helper
```

**Rota e wiring (PR 1):**

- `AppRoutes.tsx` — adicionar rota `agenda-semanal` com `RequirePermission permission="conveyors.create"`.
- `app-nav-config.ts` — novo item na seção `gestao`, imediatamente após "Planejamento".
- `AppSidebar.tsx` — ícone para `/app/agenda-semanal`.

**Guardrail respeitado:** nenhuma alteração em `OperationalPlanningPage.tsx` nem na rota `planejamento-semanal`.

### 3.2 Estado e fluxo de dados

```
┌─────────────────────────────────────────────────────────────┐
│ WeeklyAgendaPage                                            │
│  weekPayload ← getOperationalPlanningWeek(weekMonday)       │
│  draftItems  ← espelho local de plan.items (+ mutações)     │
│  backlog     ← listOperationalPlanningBacklog()             │
│  collaborators ← collaboratorsApi.listCollaborators()       │
│  dirty       ← JSON draftItems ≠ saved snapshot             │
└─────────────────────────────────────────────────────────────┘
         │ save/patch              │ publish
         ▼                         ▼
  saveOperationalPlanningWeek   publishOperationalPlanningWeek
  patchOperationalPlanningWeek
```

- **Mesmo plano** que a tela antiga: editar na Agenda reflete na API; abrir Planejamento na mesma semana mostra as mesmas alterações (após save/reload).
- **Factory intake:** fora do escopo visual do protótipo (backlog simples). Não incluir painel factory intake na v1 da Agenda salvo decisão em §8.

### 3.3 Integração DnD com dados reais

**Estado local `draftItems`** (mesma forma lógica da tela atual: `localKey`, `plannedDate`, `plannedOrder`, etc.).

**Mutations em `weeklyAgendaDnD.ts`:**

| Evento | Ação |
|---|---|
| `bl\|*` → `cell\|*` | Criar `DraftPlanItem` (espelha `handleDragEnd` atual) |
| `plan\|*` → `cell\|*` | Atualizar `assignedCollaboratorId`, `plannedDate`, recalcular `plannedOrder` |
| `plan\|*` → `day-tab\|*` | Atualizar só `plannedDate`, manter colaborador |
| `plan\|*` reorder em SortableContext | Atualizar `plannedOrder` na célula |

Após mutação: `setDirty(true)`. Persistência explícita via “Salvar rascunho” (mesmo contrato da tela atual).

**Sensores propostos:**

```ts
useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
)
```

**Auto-scroll:** considerar `DragOverlay` para feedback visual durante arraste (padrão dnd-kit).

### 3.4 Modo Fila — overlay na mesma tela

**Gatilho (protótipo):** `visibleBacklogItems.length >= 3`.

**Estado `queueMode: 'idle' | 'active'`** em `WeeklyAgendaPage` — não é rota separada.

**Fluxo:**

1. Banner/convite na gaveta de backlog ou toast discreto.
2. Ao aceitar → `WeeklyAgendaQueueOverlay` cobre a tela.
3. Um item por vez; para cada item:
   - Mostrar card do backlog.
   - Sugerir colaborador via `pickCollaboratorWithMostSlack()` (ver §3.5).
   - Sugerir dia com maior folga na semana para aquele colaborador (ou primeiro dia útil com folga).
   - Ações: Confirmar (adiciona ao `draftItems`), Pular, Sair da fila.
4. Ao confirmar todos ou sair → overlay fecha; usuário pode salvar rascunho.

### 3.5 Cálculo de folga (modo Fila)

**Novo helper** `pickCollaboratorWithMostSlack` em `weeklyAgendaQueue.ts`:

```ts
type SlackInput = {
  collaboratorIds: string[]           // colaboradores ativos exibidos na grade
  weekdayDates: string[]
  draftItems: DraftPlanItem[]
  capacityRows: OperationalPlanningWeekPayload['capacityByCollaboratorDay']
  defaultDailyMinutes?: number        // fallback opcional
}

// slack(collab) = Σ_d max(0, capacity(collab,d) - planned(collab,d))
// planned derivado de draftItems; capacity de capacityRows ou fallback
```

**Empate:** menor carga já planejada na semana; desempate alfabético por nome.

### 3.6 Visualização sem horário de relógio

Cards ordenados por `plannedOrder` dentro da célula. Altura proporcional a `plannedMinutes` (opcional, visual) **sem** rótulos `09:00–11:00`. Se o protótipo mostrar faixas horárias, tratá-las como **decorativas/ilustrativas** — não persistir hora.

### 3.7 Opções de rótulo no menu

| Opção | Prós | Contras |
|---|---|---|
| **Agenda da semana** (recomendado) | Claro, alinhado ao título da tela; não denigre a tela antiga | Dois itens de planejamento no menu |
| **Agenda (nova)** | Deixa explícito que é versão nova | Pode parecer temporário para sempre |
| **Planejamento — agenda** | Agrupa mentalmente com Planejamento | Rótulo longo no sidebar |
| **Agenda** | Curto | Ambíguo vs. outros conceitos de agenda |

**Recomendação SDD:** label **"Agenda da semana"** no menu; título da página **"Agenda da Semana"**; rota `/app/agenda-semanal`.

---

## 4. Impacto no contrato de API

**Nenhum endpoint novo necessário** para o escopo aprovado.

A Agenda consome:

| Endpoint | Uso |
|---|---|
| `GET .../operational-planning/week` | Plano, itens, summary, capacity, fora do plano |
| `POST/PATCH .../operational-planning/week` | Salvar rascunho / alterações |
| `POST .../week/:id/publish` | Publicar |
| `GET .../operational-planning/backlog` | Gaveta + modo Fila |
| `POST .../week-items/:id/apply-conveyor-plan-values` | Aplicar sync (via `PlanningSyncIssuesPanel`) |
| `GET .../operational-planning/week-activity` | Histórico (menu ⋯) |
| `GET /api/v1/collaborators` (via `collaboratorsApi`) | Linhas da grade |

**Lacuna potencial (não bloqueante para v1):** `capacityByCollaboratorDay` só cobre pares com itens já planejados. Para folga precisa de fallback client-side (§8). **Não** requer novo endpoint se aceitarmos fallback com `defaultDailyMinutes` fixo ou média das células conhecidas.

---

## 5. Decisão: ordem como posição, não horário

**Confirmado e adotado para v1.**

- O backend persiste `plannedDate` + `plannedOrder` + `plannedMinutes`.
- Não existe `plannedStartTime` / `plannedEndTime` em `operational_work_plan_items`.
- A “linha do tempo” do protótipo HTML é **metáfora visual**: posição vertical = sequência do dia (`plannedOrder`), altura opcional ∝ duração estimada (`plannedMinutes`).
- Impressão de tickets e fila de produção já usam dia + ordem, não hora de relógio.

**Decisão consciente:** horário real fica fora de escopo da v1; não é omissão.

---

## 6. Compatibilidade multi-tenant

| Aspecto | Avaliação |
|---|---|
| Tipo de mudança | **Aditiva** — nova rota, novo item de menu, nova pasta `features/weekly-agenda` |
| Permissão | `conveyors.create` (igual à tela atual) |
| Dados | Lê/escreve o **mesmo** `operational_work_plans` do tenant — não há migração |
| Efeito em outros clientes | Qualquer tenant com `conveyors.create` **verá o novo item de menu** e poderá usar a Agenda. Não altera comportamento da tela antiga |
| Risco de regressão | **Baixo**, desde que `OperationalPlanningPage.tsx` não seja modificado |

**Sinalização:** se a intenção for restringir a Bravo temporariamente, seria necessário feature flag (ex. env ou flag de cliente) — **não existe hoje** flag específica para isso. Sem flag, a mudança é visível a todos os gestores com permissão. Isso é seguro (aditivo), mas pode gerar dúvida em clientes que não participaram da validação — recomenda-se comunicação ou flag opcional (decisão em §8).

---

## 7. Estratégia de teste

Padrão do projeto: `*.test.ts` ao lado do helper (`vitest`).

### 7.1 `weeklyAgendaQueue.test.ts`

- `pickCollaboratorWithMostSlack` retorna colaborador com maior soma de `(capacity - planned)` na semana.
- Empate resolvido por menor minutos já planejados.
- Colaborador sem nenhuma célula em `capacityRows` usa fallback (`defaultDailyMinutes` × dias úteis).
- Exclui colaboradores sem id / lista vazia → `null`.

### 7.2 `weeklyAgendaDnD.test.ts`

- Backlog → célula: gera item com `plannedOrder` = max+1 na célula.
- Plan → outra célula: atualiza `assignedCollaboratorId`, `plannedDate`, reordena ambas as células.
- Plan → `day-tab`: muda só `plannedDate`.
- Reorder intra-célula: sequência `plannedOrder` contínua 0..n-1 após `recalculateOrders`.
- `buildSavePayload` produz `SaveOperationalWeekPlanInput` válido (campos obrigatórios, sem `localKey`).

### 7.3 `weeklyAgendaDraft.test.ts`

- `recalculateOrders` estável por `(plannedDate, assignedCollaboratorId, plannedOrder)`.
- Item removido/cancelado não entra no payload.

### 7.4 `weeklyAgendaPublishRules.test.ts`

- `canPublishPlan({ dirty, draftCount, hasPlan, status })` espelha regras da tela atual:
  - `false` se `dirty`, sem plano, sem itens, ou já `PUBLISHED`.
  - `true` só com plano `DRAFT`, itens > 0, não dirty.

### 7.5 `buildVisiblePlanningBacklogItems` (já existe)

- Reutilizar testes existentes; garantir integração na gaveta.

### 7.6 Testes manuais (checklist pós-PR)

- Touch em tablet: arrastar backlog e card planejado.
- Arrastar card sobre aba de outro dia muda o dia.
- Modo Fila com 3+ itens; sugestão de colaborador coerente.
- Chip atenção abre drawer com sync + fora do plano.
- Publicar bloqueado com alterações não salvas.
- Salvar na Agenda → recarregar Planejamento antigo mostra mesmos itens.

---

## 8. Riscos e perguntas em aberto

### 8.1 Bloqueante para Etapa 2

1. **Protótipo ausente** — enviar `planejamento-combinado.html` para `docs/discovery/`. Sem ele, detalhes de micro-interação (animações, breakpoints, textos exatos do modo Fila) ficam baseados só no resumo do briefing.

### 8.2 Decisões de produto

2. **Backlog vs. factory intake** — o protótipo fala em “itens pendentes”. A tela atual separa `listOperationalPlanningBacklog` e `getFactoryIntakeItems`. A Agenda v1 deve incluir só backlog, ou também intake “aguardando encaixe”?

3. **Visibilidade multi-tenant** — novo menu para todos com `conveyors.create`, ou flag só Bravo até estabilizar?

4. **Rótulo do menu** — confirmar “Agenda da semana” vs. alternativas da §3.7.

5. **Fallback de capacidade no modo Fila** — para colaborador sem linhas em `capacityByCollaboratorDay`:
   - (A) assumir capacidade padrão (ex. 480 min/dia × 5) — pode chamar `getOperationalCapacitySettings` (requer permissão admin)?
   - (B) considerar folga “infinita” e priorizar quem nunca foi alocado?
   - (C) só sugerir entre colaboradores que já têm pelo menos uma célula na semana?

6. **Auto-save** — protótipo não menciona; manter save explícito como na tela atual?

7. **Ações nos cards (⋯)** — replicar todas as quick actions da tela atual (apontar, concluir, reabrir, imprimir ticket) ou subconjunto enxuto na v1?

### 8.3 Riscos técnicos

| Risco | Mitigação |
|---|---|
| Duplicação de lógica de draft/DnD vs. tela antiga | Extrair helpers em `weeklyAgendaDraft.ts`; migração da tela antiga fica fora de escopo |
| DnD touch ainda falho | `TouchSensor` + `DragOverlay`; testar em dispositivo real Bravo |
| Dois editores do mesmo plano | Comportamento já existente; mensagem se `409`/conflito de versão |
| Menu poluído com duas entradas de planejamento | Rótulos distintos; aposentar tela antiga depois |

### 8.4 Lacunas de backend

**Nenhuma lacuna que exija novo endpoint** para o escopo definido. A limitação de `capacityByCollaboratorDay` é de **completude dos dados**, não de ausência de API — resolvível no cliente com fallback (§8.2 item 5).

---

## 9. Plano de PRs

Ordem sugerida — **PRs pequenos, cada um mergeável independentemente** (após o anterior).

| PR | Escopo | Depende de | Arquivos principais |
|---|---|---|---|
| **PR-1** | Fundação | — | `docs/discovery/planejamento-combinado.html`, `docs/discovery/sdd-agenda-semanal.md` (este doc), rota `agenda-semanal`, item menu, `WeeklyAgendaPage` shell (“em construção”), ícone sidebar |
| **PR-2** | Leitura + visualização estática | PR-1 | `useWeeklyAgendaWeek`, header, summary strip, grade com dados reais, navegação de semana, **sem DnD** |
| **PR-3** | Painel de atenção + backlog read-only | PR-2 | `WeeklyAgendaAttentionDrawer`, `WeeklyAgendaBacklogFab` + drawer, reuso `PlanningSyncIssuesPanel`, `PlanningExecutionOutsidePlanPanel` |
| **PR-4** | DnD completo | PR-3 | `useWeeklyAgendaDnD`, `weeklyAgendaDnD.ts`, cards draggable, day-tab drop, save/patch, regras publish |
| **PR-5** | Modo Fila | PR-4 | `weeklyAgendaQueue.ts`, `WeeklyAgendaQueueOverlay`, convite 3+ itens |
| **PR-6** | Ações secundárias | PR-4 (pode paralelizar com PR-5) | Menu ⋯: salvar, imprimir (`PlanningWeekTicketsPrintDialog`), histórico (`PlanningWeekHistoryPanel`) |

**Fora destes PRs:** qualquer alteração em `OperationalPlanningPage.tsx`, migrations, endpoints novos.

---

## 10. Conferência item a item contra o diagnóstico original

| # | Item do diagnóstico original | Status | Nota (se não for Confirmado) |
|---|---|---|---|
| 1 | Endpoints existentes cobrem toda a necessidade da tela | **Confirmado** | Todos em `operationalPlanningApiService.ts`; extras `applyConveyorPlanValuesToWeekItem` e `getOperationalPlanningWeekActivity` também úteis |
| 2 | `operationalCapacity.service.ts` cobre o cálculo de folga da Fila | **Corrigido** | `capacityByCollaboratorDay` vem em `OperationalPlanningWeekPayload` (GET week), não no service de admin. Folga calculada no cliente |
| 3 | `@dnd-kit` já usado em `OperationalPlanningPage.tsx` é reaproveitável | **Parcialmente confirmado** | Pacotes e padrão básico sim; falta DnD de itens planejados, sortable, touch e drop em abas — a implementar na nova feature |
| 4 | Modelo de dados não tem horário real, só `plannedDate` + `plannedOrder` | **Confirmado** | Ver §5 |
| 5 | Rota/permissão/nav propostas são viáveis como descrito | **Confirmado** | `/app/agenda-semanal` livre; `conveyors.create`; padrão `RequirePermission` e `GESTAO_NAV_ITEMS` aplicáveis |

---

## Referências de código investigadas

- `src/services/operational-planning/operationalPlanningApiService.ts`
- `src/domain/operational-planning/operational-planning.types.ts`
- `src/services/operationalCapacity.service.ts`
- `src/features/operational-planning/OperationalPlanningPage.tsx` (somente leitura)
- `src/features/operational-planning/PlanningSyncIssuesPanel.tsx`
- `src/features/operational-planning/PlanningExecutionOutsidePlanPanel.tsx`
- `src/features/operational-planning/operationalPlanningPlanStatusCopy.ts`
- `src/routes/AppRoutes.tsx`
- `src/lib/shell/app-nav-config.ts`
- `server/src/modules/operational-planning/operational-planning.service.ts`
