# Inventário — Abortar / dispensar atividade em esteira já liberada para produção

> Artefato somente de inventário e impacto. **Não implementa** código, migrations, testes, commit, push, PR ou deploy.
> Agentes executados: `sgp-context-reader` → `sgp-impact-analyst` (ambos readonly).
> Data do inventário (UTC): `2026-08-08T00:12:39Z`.

---

## 1. Resumo executivo

Hoje o SGP+ trata o encerramento operacional de uma atividade (`STEP` em `conveyor_nodes`) quase exclusivamente como `COMPLETED`. Não existe estado terminal no nó equivalente a “abortada/dispensada”. Existe cancelamento de **item do plano operacional da esteira** (`CANCELLED`), mas só em plano `DRAFT`, e esse cancelamento **não altera** o status do STEP nem libera a sequência estrutural.

Para o cenário de negócio (esteira já liberada; atividade deixa de ser necessária; sem exclusão do nó; sem apontamento fictício; sem marcar como concluída), a alternativa alinhada ao código atual é:

- introduzir um estado terminal distinto no **nó STEP** (recomendado: `ABORTED`);
- sincronizar o cancelamento dos itens de plano da esteira e do planejamento semanal vinculados;
- separar predicados “fechada para sequência” vs “concluída / realizada”.

A demanda é **tecnicamente viável**. As decisões humanas da seção 15 foram fechadas em `2026-08-08` (ver seções 11.2 e 15), com correção de idempotência/concorrência na seção 11.3.

**Veredito de impacto (atualizado):** `SEGUIR`.

---

## 2. Identificação Git e SHA-base

| Campo | Valor |
|---|---|
| Remoto `origin` | `https://github.com/multivacia/sgp` |
| Branch base | `main` (= `origin/main`) |
| SHA-base | `34679fd90b5270dc3e8f56c4f9b6f32bedf8815b` |
| Confirmação | `HEAD` da branch de inventário = `origin/main` (fast-forward ok; working tree limpa antes da branch) |
| Branch criada | `feature/abortar-atividade-producao` |
| Commit do inventário | `e7def6c2a59ae464e5e25670e2ba8260c20bac44` |
| Diff vs `origin/main` | **somente** `docs/inventory/abortar-atividade-producao-inventario.md` (+475 linhas) — evidência na seção 17 |
| Estado após validação humana | Inventário aprovado como base da spec; veredito → `SEGUIR`; **ainda sem implementação** |

---

## 3. Demanda analisada (uma frase)

Permitir que o gestor marque como abortada/dispensada uma atividade (`STEP`) de esteira já liberada para produção, sem excluir o nó, sem apontamento fictício e sem tratá-la como concluída, retirando-a das filas/planos aplicáveis e preservando histórico e horas já apontadas.

---

## 4. Validação das hipóteses preliminares

| # | Hipótese | Status | Evidência |
|---|---|---|---|
| 1 | A atividade materializada é um nó `STEP` em `conveyor_nodes` | **CONFIRMADO** | `node_type = 'STEP'`; constraint e comentários em `server/migrations/0028_conveyor_nodes_step_operational.sql`; planos referenciam `activity_node_id` → `conveyor_nodes` em `0038_conveyor_operational_plans.sql` |
| 2 | `conveyor_nodes.operational_status` aceita `PENDING`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`, `REOPENED` | **CONFIRMADO** | `chk_conveyor_nodes_step_operational_status` em `0028_…sql`; tipo `ConveyorNodeStepOperationalStatusDb` em `server/src/modules/conveyors/stepOperationalStatus.ts`; espelho FE em `src/domain/conveyors/conveyor.types.ts` + labels em `src/domain/conveyors/stepOperationalStatus.ts` |
| 3 | O nó não possui estado terminal equivalente a `ABORTED` | **CONFIRMADO** | Constraint `0028` sem `ABORTED`; `canTransitionStepStatus` só cobre `COMPLETED`/`REOPENED`; eventos STEP em `conveyorOperationalEventTypeValues` sem aborto |
| 4 | `conveyor_operational_plan_items.status` aceita `CANCELLED` e a tabela tem `cancellation_reason` | **PARCIALMENTE CONFIRMADO** | Coluna + CHECK em `0038_…sql` (`cancellation_reason TEXT NULL`; status inclui `CANCELLED`). Leitura mapeia `cancellationReason` no service. **Escrita:** `updatePlanItem` em `conveyor-operational-plan.repository.ts` **não** aceita nem persiste `cancellation_reason` |
| 5 | UI “Cancelar item” só quando o plano está em `DRAFT` | **CONFIRMADO** | `canEditConveyorOperationalPlanItems` retorna `status === 'DRAFT'` (`conveyorOperationalPlanDisplay.ts`); botão em `ConveyorOperationalPlanItemRow.tsx` (`handleCancelItem` → `{ status: 'CANCELLED' }`); confirm text: “não será removido da esteira” |
| 6 | Backend restringe alteração do item ao plano `DRAFT` | **CONFIRMADO** | `assertPlanDraft` em `conveyor-operational-plan.service.ts` (409 `INVALID_STATUS_TRANSITION`); chamado no início de `servicePatchConveyorOperationalPlanItem` |
| 7 | Itens de planejamento cancelados são excluídos de totais, tickets e filas | **PARCIALMENTE CONFIRMADO** | **Sim para itens de plano:** `conveyorPlanSummary.ts` (ativos ≠ `CANCELLED`); tickets (`filterPlanningActivityTicketSources`); my-work-queue default `AND i.status <> 'CANCELLED'`; produção `planItemStatuses: ['PLANNED']`; backlog eligibility exclui `CANCELLED`. **Não cobre o STEP:** cancelar item DRAFT não muda `operational_status` do nó |
| 8 | Sequência trata como aberta atividade cujo nó não esteja `COMPLETED` | **CONFIRMADO** | `analyzeConveyorActivitySequence` (`conveyorActivitySequence.logic.ts` L157–159): `(operational_status ?? 'PENDING') !== 'COMPLETED'` |
| 9 | Vínculo `conveyor_operational_plan_items` ↔ `operational_work_plan_items` e sync com semanal | **CONFIRMADO** | FK `conveyor_operational_plan_item_id` em `0039_operational_work_plan_conveyor_link.sql`; `origin_work_plan_item_id` no item da esteira; `deriveConveyorPlanFactorySyncState` trata `PLAN_ITEM_CANCELLED` / `FACTORY_ITEM_CANCELLED` |

---

## 5. Fluxo atual ponta a ponta

```text
Esteira (ciclo de vida: EM_ELABORACAO → … → A_INICIAR / EM_ANDAMENTO / …)
  └── conveyor_nodes STEP
        operational_status: PENDING | IN_PROGRESS | BLOCKED | COMPLETED | REOPENED
        ├── Conclusão explícita: PATCH …/steps/:stepNodeId/completion { action: COMPLETE }
        │     → COMPLETED + operational_completed_at/by + evento CONVEYOR_STEP_COMPLETED
        ├── Reabertura: mesma rota { action: REOPEN } (perm. conveyors.create)
        │     → REOPENED + limpa completed_* + evento CONVEYOR_STEP_REOPENED
        ├── Apontamento produção: POST /production/time-entries
        │     → pode markAsDone → COMPLETED; rejeita se já COMPLETED
        ├── Plano da esteira (DRAFT): PATCH item → status CANCELLED
        │     → NÃO altera STEP; bloqueado se plano ≠ DRAFT
        └── Após encaixe fábrica: operational_work_plan_items (PLANNED|MOVED|CANCELLED)
              └── PUBLISHED → filas (my-work-queue / produção / kiosk)
```

Observações verificadas:

- “Encerrada” para sequência, progresso e vários filtros de fila = **somente** `COMPLETED`.
- Cancelar item do plano em rascunho é ação de **planejamento**, não de dispensa pós-liberação.
- Finalizar a esteira (`FINALIZADA`) é transição do **status da esteira**, não gate automático “todos os STEPs COMPLETED” (`conveyor-lifecycle` / patch de status da esteira).

---

## 6. Inventário por camada

### 6.1 Banco e modelo de domínio

**`conveyor_nodes` (STEP operacional)** — `server/migrations/0028_conveyor_nodes_step_operational.sql`

| Campo / constraint | Papel atual |
|---|---|
| `operational_status` | Enum CHECK: PENDING, IN_PROGRESS, BLOCKED, COMPLETED, REOPENED |
| `operational_completed_at` / `operational_completed_by` | Auditoria de **conclusão** explícita; limpos na reabertura |
| Índice | `idx_conveyor_nodes_conveyor_step_operational_status` |

**Não reutilizar** `operational_completed_*` para aborto: a semântica documentada no COMMENT da migration é “conclusão explícita”. Aborto precisaria de campos próprios (`aborted_at`, `aborted_by`, motivo) e/ou metadata de evento.

**`IN_PROGRESS` / `BLOCKED`:** aceitos no CHECK e em `canTransitionStepStatus(…, 'COMPLETED')`, mas **não foi encontrado writer de serviço** que atribua esses status em `server/src/modules` (apenas fixtures/testes). Tratar como estados “fantasma” até inventário de writers mais profundo na implementação.

**Planos**

| Entidade | Migration | Status relevantes | Motivo |
|---|---|---|---|
| `conveyor_operational_plans` | `0038` | DRAFT, APPROVED, WAITING_FACTORY_PLANNING, … | Gate de edição |
| `conveyor_operational_plan_items` | `0038` | PLANNED, IN_PROGRESS, COMPLETED, CANCELLED, NEEDS_REVIEW | `cancellation_reason`, `notes` |
| `operational_work_plans` / `_items` | `0034` | itens: PLANNED, MOVED, CANCELLED | Fila semanal |
| Vínculo | `0039` | FK `conveyor_operational_plan_item_id` | Sync esteira ↔ fábrica |

**Apontamentos** — `conveyor_time_entries` (`0006`, evoluções `0033`, `0044`/`0046`): minutos positivos; OOS; `mark_as_done` / `session_completion_pct`. Demanda: **preservar** entries existentes; **não** criar entry fictício.

**Eventos** — `0026_conveyor_operational_events.sql` + `conveyorOperationalEventTypeValues`: STEP tem `CONVEYOR_STEP_COMPLETED`, `CONVEYOR_STEP_REOPENED`, `CONVEYOR_STEP_OUT_OF_SEQUENCE_TIME_ENTRY`. Sem `CONVEYOR_STEP_ABORTED`.

**Tipos FE/BE**

- BE: `ConveyorNodeStepOperationalStatusDb`, `canTransitionStepStatus`
- FE: `ConveyorNodeStepOperationalStatus`, `isStepOperationallyCompleted`, `stepOperationalStatusLabel`, `canShowCompleteButton` / `canShowReopenButton`
- Plano: `src/domain/conveyor-operational-plan/conveyor-operational-plan.types.ts`

**Respostas explícitas (modelo)**

| Pergunta | Resposta inventariada |
|---|---|
| Estado abortado mora no nó, no item, nos dois ou derivado? | **Fonte da verdade no nó**; itens de plano **sincronizados** para CANCELLED |
| Entidade fonte da verdade operacional? | `conveyor_nodes.operational_status` (STEP) |
| Necessário novo estado `ABORTED`? | **Sim** (recomendado), via migration do CHECK |
| `cancellation_reason` já é persistido? | Coluna existe; **serviço atual não grava** |
| Auditoria reutilizável? | Reutilizar padrão de **evento** + `idempotency_key` + `reason`/`metadata_json`. **Não** reutilizar `operational_completed_*` para aborto |

### 6.2 Backend e contratos HTTP

| Área | Caminhos / símbolos |
|---|---|
| Conclusão/reabertura STEP | `PATCH /api/v1/conveyors/:conveyorId/steps/:stepNodeId/completion` — `servicePatchConveyorStepCompletion`, `completeConveyorStepOnClient`, `serviceReopenStep` |
| Sequência | `GET …/steps/:stepNodeId/sequence-check` — `analyzeConveyorActivitySequence` |
| Plano esteira | `PATCH …/operational-plan/:planId/items/:itemId` — `assertPlanDraft` + `updatePlanItem` |
| Produção | `GET /api/v1/production/me/work-queue`, `POST /api/v1/production/time-entries` |
| Filas web | `GET /api/v1/my-work-queue`, `/api/v1/my-activities` |
| Progresso | módulo `conveyor-progress` — `isCompletedStepStatus` |
| Eventos | `insertConveyorOperationalEvent` + tipos em `operational-events` |
| Planejamento semanal | `operational-planning/*` (backlog eligibility, apply/sync) |

**Transições STEP atuais** (`canTransitionStepStatus`):

- → `COMPLETED` a partir de PENDING / IN_PROGRESS / BLOCKED / REOPENED (idempotente COMPLETED→COMPLETED)
- → `REOPENED` somente a partir de COMPLETED (idempotente REOPENED→REOPENED)
- Qualquer outra transição = `false`

**Permissões**

- Reabrir: exige `conveyors.create` (`assertCanPatchStepCompletion`)
- Completar: gestor com `conveyors.create` **ou** colaborador assignee sob regras de esteira liberada
- Plano operacional: mutações sob permissão de criação/gestão de esteira + DRAFT
- Produção/kiosk: auth PIN isolada (sem RBAC app)

**Avaliação:** liberar genericamente edição de planos aprovados/em execução **não** é adequado. Preferível **ação de domínio dedicada** (`Abortar atividade` / `Dispensar atividade`) no eixo STEP, com sync interno de planos.

**Idempotência / concorrência:** COMPLETE/REOPEN já usam `idempotencyKey` em eventos (`conveyor_step_completed:…`, `conveyor_step_reopened:…`). Aborto deve seguir o mesmo padrão e ser seguro a double-click / retry.

### 6.3 Planejamento semanal e filas

| Consumidor | Comportamento atual relevante | Pós-aborto (necessário) |
|---|---|---|
| Plano esteira DRAFT | Cancelamento manual de item | Sync automático se abortar STEP |
| Plano esteira APPROVED / pós-DRAFT | Item imutável via PATCH atual | Cancelamento **somente** via serviço de aborto |
| Planejamento semanal draft/publicado | Itens `CANCELLED` fora de filas default | Cancelar itens ligados ao `activity_node_id` / plan item |
| Fila produção / kiosk | `planItemStatuses: ['PLANNED']`; `isActivityCompleted` bloqueia track | Tratar STEP abortado como não apontável; preferir sumir da fila ativa |
| My work queue | Default exclui CANCELLED; COMPLETED reordenado | Excluir / marcar abortado; não pendente |
| Minhas atividades / candidatos | Completude por status COMPLETED | Bloquear novos apontamentos se abortado |
| Backlog operacional | Eligibility SQL exclui itens plano CANCELLED | Garantir STEP abortado não reaparece como pendência |
| Tickets térmicos | Planejamento: exclui CANCELLED; esteira: exclui COMPLETED por default | Excluir abortado do lote padrão / reimpressão padrão |
| Totais de carga / sync | Summary ignora CANCELLED; sync codes `PLAN_ITEM_CANCELLED` | Manter consistência esteira↔fábrica na mesma transação |
| Alertas atraso | Overdue SQL usa `IS DISTINCT FROM 'COMPLETED'` (my-work-queue) | Incluir abortado como “não overdue” / não pendente |

**Com e sem item semanal publicado**

- Sem item semanal: abortar nó + cancelar item do plano da esteira (se existir) basta para sequência/progresso/UI da esteira.
- Com item publicado: além do nó, cancelar `operational_work_plan_items` vinculados; caso contrário a fila pode continuar servindo o item `PLANNED` até o colaborador tentar apontar (e aí regras de STEP/plano precisam rejeitar).

### 6.4 Sequência, progresso e conclusão

| Local | Predicado atual | ABORTED deve ser… |
|---|---|---|
| `analyzeConveyorActivitySequence` | aberto se ≠ COMPLETED | **Terminal para sequência** (não bloquear sucessoras) |
| Justificativa fora de sequência | baseada em predecessoras abertas | Não exigir justificativa por predecessora abortada |
| `isCompletedStepStatus` / progresso | só COMPLETED | **Diferente de COMPLETED** (não inflar “realizado/concluído”) |
| Pendência | implícita via não-COMPLETED | Pendência **0** para o STEP abortado |
| Previsto agregado | planned minutes dos steps | **Decisão humana** se sai do denominador de % (recomendação inventário: excluir) |
| Conclusão da esteira | status da esteira | Não misturar com `CANCELADA` da esteira; esteira pode seguir |
| Dashboards | agregações planned/completed | Revisar queries após predicados separados |
| Atividades concluídas sem tempo | caminho COMPLETE / markAsDone | Aborto **não** deve usar esse caminho |

### 6.5 Apontamentos existentes — cenários

| Cenário | Tratamento recomendado (inventário) |
|---|---|
| Nunca iniciada, sem apontamento | PENDING/REOPENED → ABORTED; filas limpas; previsto fora de pendência |
| IN_PROGRESS com horas | Preservar `conveyor_time_entries`; bloquear novos; realizado permanece |
| BLOCKED | Permitir aborto se origem permitida incluir BLOCKED (mesmo fantasma no writer) |
| Já COMPLETED | **Não** abortar direto (recomendação); exigir reabertura ou proibir |
| Previamente REOPENED | Permitir aborto (estado aberto novamente) |
| Apontar após aborto | Rejeitar (espelhar COMPLETED em produção L175–180 e guards web) |
| Concorrência aborto × apontamento | Transação no nó + checagem de status atual; 409 se já COMPLETED/ABORTED conforme regra |

### 6.6 UX e perfis

| Superfície | Achado |
|---|---|
| Detalhe da esteira | Já tem Concluir/Reabrir (`EsteiraDetalhePage.tsx` + helpers `stepOperationalStatus.ts`) — **melhor casa** para “Dispensar” / “Abortar” |
| Plano operacional | “Cancelar item” só DRAFT; copy deixa claro que não remove da esteira |
| Planejamento semanal | Consome status de item/atividade; não é o lugar natural da ação primária |
| Produção / kiosk | Touch-first; auth PIN; **não** recomendado expor aborto |
| Colaborador web | Pode concluir em alguns casos; **não** deve abortar |

**Permissão recomendada:** `conveyors.create` (mesmo eixo da reabertura).

**UX mínima inventariada:** botão gestorial → confirmação com efeito claro → motivo obrigatório (catálogo + “Outro”) → badge/histórico com estado, motivo, autor, data → restauração gestorial (se aprovada).

### 6.7 Auditoria e observabilidade

| Item | Situação |
|---|---|
| Evento novo | Recomendado: `CONVEYOR_STEP_ABORTED` (+ eventual restore) |
| Campos | `previous_value`/`new_value`, `reason`, `created_by`, `occurred_at`, `metadata_json` (canal, motivos padronizados, plan item ids cancelados) |
| Idempotency key | **Estável**, vinda da requisição (ou UUID cliente reenviado nos retries). **Proibido** embutir `occurredIso`/timestamp variável — ver §11.3 |
| Histórico UI | Taxonomia FE (`operationalEventTaxonomy` / `formatConveyorOperationalEvent`) precisa do novo tipo |
| Sync semanal | Rastrear cancelamentos no metadata do evento ou eventos de plano existentes |

### 6.8 Testes existentes e lacunas

**Existentes (amostra):**

- `server/src/tests/stepOperationalStatus.test.ts`
- `server/src/tests/conveyor-step-completion.integration.test.ts`
- `server/src/tests/conveyorActivitySequence.logic.test.ts` / `work-queue-sequence-for-collaborator.test.ts`
- `server/src/tests/production-time-entries.integration.test.ts` / `production-work-queue.integration.test.ts`
- `server/src/tests/my-work-queue.service.test.ts`
- `server/src/tests/conveyor-operational-plan.service.test.ts`
- `server/src/tests/deriveConveyorPlanFactorySyncState.test.ts`
- `server/src/tests/operational-planning.backlog-eligibility.test.ts`
- `src/domain/conveyors/stepOperationalStatus.test.ts`
- `src/features/operational-tickets/filterPlanningActivityTicketSources.test.ts`
- `src/domain/conveyor-operational-plan/conveyorPlanSummary.test.ts`

**Lacunas futuras (não implementar agora):** migration/constraint ABORTED; transições; permissão; motivo; idempotência; sync planos; filas; bloqueio apontamento; preservação hours; sequência; progresso; conclusão esteira; tickets; FE labels; restauração.

---

## 7. Matriz de estados e transições atuais (STEP)

```text
PENDING ──────┐
IN_PROGRESS ──┼──► COMPLETED ◄──► REOPENED
BLOCKED ──────┘         │
                        └── (não há ABORTED)

Idempotência: COMPLETED→COMPLETED, REOPENED→REOPENED = true
REOPENED só a partir de COMPLETED
```

Plano esteira (itens): `PLANNED|NEEDS_REVIEW|…` ↔ `CANCELLED` **somente em DRAFT** via API atual.

Plano semanal (itens): `PLANNED|MOVED|CANCELLED`.

Esteira (veículo): ciclo próprio (`EM_ELABORACAO` … `CANCELADA`) — **não confundir** `CANCELADA` da esteira com aborto de STEP.

---

## 8. Matriz de impactos por consumidor

| Consumidor | Risco se só cancelar plano | Risco se ABORTED no nó sem ajustar predicados | Ajuste necessário |
|---|---|---|---|
| Sequência | STEP PENDING continua bloqueando | ABORTED ainda “aberto” (≠ COMPLETED) | `isClosedForSequence` inclui ABORTED |
| Progresso/evolução | Pendência falsa | Se misturar com COMPLETED → KPI falso | Separar `isCompleted` vs `isAborted` / excluir previsto |
| Produção/kiosk | Pode ainda listar se item PLANNED | Pode listar e falhar no POST | Filtro + guard |
| My-work-queue / my-activities | Idem | Overdue/pendência | SQL + DTO |
| Time entries web | Continua candidato | Apontamento indevido | Guard status |
| Plano esteira | Já CANCELLED em DRAFT; pós-DRAFT bloqueado | Divergência sync | Writer de aborto cancela itens |
| Plano semanal | Item PLANNED permanece | Fila serve atividade morta | Cancel sync |
| Tickets | Pode imprimir atividade dispensada | Idem | Filtros FE/BE |
| Eventos/UI histórico | Sem rastro de aborto | Idem | Novo event type + taxonomia |
| Ciclo de vida esteira | Baixo | Baixo se não reusar CANCELADA | Manter separado |
| Permissões | N/A | Expor no kiosk = risco alto | Só gestor |

---

## 9. Cenários de dados e concorrência

1. **Abortar STEP sem plano semanal:** update nó + evento; cancelar item plano esteira se houver.
2. **Abortar com plano semanal PUBLISHED:** (1) + cancelar `operational_work_plan_items` ligados; refresh sync status.
3. **Double submit:** segunda chamada idempotente via `idempotencyKey` / no-op se já ABORTED.
4. **Apontamento em voo:** commit do time entry lê status; se abortou antes, rejeitar; se abortou depois, hours ficam (política preservar) e novos bloqueiam.
5. **Item plano já CANCELLED:** no-op no sync do plano.
6. **STEP COMPLETED:** rejeitar aborto direto (recomendação) ou exigir REOPEN prévio.
7. **Esteira FINALIZADA/CANCELADA:** decidir se aborto ainda faz sentido (provável: não, ou só auditoria histórica).

---

## 10. Alternativas de solução

### Alt A — `ABORTED` no STEP + sync de cancelamento de planos *(recomendada)*

- **Vantagens:** atende a demanda; desbloqueia sequência; não apaga nó; não finge conclusão; audita no eixo certo; reusa padrões COMPLETE/REOPEN.
- **Riscos:** migration CHECK; explosão de consumidores `=== 'COMPLETED'`; política de KPI; sync 0039.

### Alt B — só `CANCELLED` no item de plano (liberar edição pós-DRAFT), sem mudar o nó

- **Vantagens:** menos mudança no enum do STEP.
- **Riscos / inadequação:** `assertPlanDraft` é regra forte; sequência **ignora** status do plano; STEP PENDING continua bloqueando; abre edição perigosa de planos aprovados. **Não resolve** a demanda sozinha.

### Alt C — flag/coluna (`is_aborted`) sem mudar enum

- **Vantagens:** evita “poluir” o enum (ilusório).
- **Riscos:** duas fontes de verdade; todos os filtros precisam de `OR`; estados inválidos (COMPLETED+aborted). Pior que estender o enum já central.

### Alt D — soft-delete / `is_active=false` do STEP

- Remove da linearização, mas enfraquece presença estrutural/histórico; conflita com “não excluir o nó” no sentido operacional.

### Alt E — concluir com 0 min / `markAsDone` fictício

- Viola explicitamente a demanda.

---

## 11. Recomendação técnica

### 11.1 Caminho preferido

Implementar **Alt A** após decisões humanas:

1. Migration: incluir `ABORTED` em `chk_conveyor_nodes_step_operational_status`.
2. Domínio: `canTransitionStepStatus` + predicados separados:
   - `isStepOperationallyCompleted` → só COMPLETED
   - `isStepClosedForSequence` → COMPLETED **ou** ABORTED
   - `isStepAborted` → ABORTED
3. Serviço dedicado `Abortar STEP` (não liberar PATCH genérico de plano pós-DRAFT):
   - valida origens/permissão/motivo;
   - atualiza nó;
   - grava evento `CONVEYOR_STEP_ABORTED` com idempotency;
   - cancela itens de `conveyor_operational_plan_items` e `operational_work_plan_items` vinculados (mesmo que plano ≠ DRAFT, **somente** por este serviço);
   - opcionalmente passa a persistir `cancellation_reason` no item do plano.
4. Guards em produção, my-work-queue, my-activities, time entries, tickets, progresso.
5. UX gestorial no detalhe da esteira (“Dispensar atividade”).

### 11.2 Decisões humanas fechadas (2026-08-08) — base da spec

| # | Tema | Definição aprovada |
|---|---|---|
| 1 | Estado técnico | **`ABORTED`** |
| 2 | Nome apresentado | **Dispensada** |
| 3 | Fonte da verdade | **Nó STEP**; planos sincronizados na mesma TX |
| 4 | Origens para abortar | PENDING, REOPENED, IN_PROGRESS, BLOCKED; UI só no detalhe da esteira |
| 5 | COMPLETED → ABORTED | **Não** permitir; exige reabertura anterior |
| 6 | Realizado existente | **Preservar** integralmente; sem fictício; bloquear novos apontamentos |
| 7 | Permissão | Gestor com **`conveyors.create`**; nunca kiosk/colaborador |
| 8 | Motivo | Catálogo padronizado + **“Outro”** com texto obrigatório |
| 9 | Restauração | **Sim**, só gestor: ABORTED → **REOPENED**; ao restaurar **não** reativar planejamento automaticamente (volta não planejada) |
| 10 | Previsto / pendência / progresso | Excluir da **carga operacional efetiva** e da pendência; preservar previsto original no histórico; **não** `isCompleted`; fechado p/ sequência |
| 11 | Transação / idempotência / lock | Ver §11.3 |
| 12 | Esteira FINALIZADA/CANCELADA | **Não** permitir dispensa |
| 13 | Auditoria | Campos **próprios no nó** + evento operacional |
| 14 | Sincronização | Cancelar plano da esteira **e** planejamento semanal na **mesma** transação |
| 15 | Compatibilidade | Sem backfill; migration amplia CHECK; deploy atômico dos consumidores |

### 11.3 Correção de idempotência e concorrência (aprovada)

**Proibido** (não garante idempotência em retry):

```text
conveyor_step_aborted:{conveyorId}:{stepNodeId}:{occurredIso}
```

**Obrigatório:**

1. Idempotency key **da requisição** (cliente) ou chave **estável** para aquela operação — **sem** timestamp variável.
2. Na transação: **bloquear** o nó STEP no banco (`SELECT … FOR UPDATE` em `conveyor_nodes`) antes de ler/atualizar.
3. Atualização **condicional** do status (só aborta se origem ∈ permitidas).
4. Nó + evento + cancelamento de planos na **mesma** TX.

---

## 12. Arquivos provavelmente afetados em futura implementação

### Backend
- `server/migrations/` — nova migration (próximo número após a última existente)
- `server/src/modules/conveyors/stepOperationalStatus.ts`
- `server/src/modules/conveyors/conveyor-step-operational.service.ts` (+ routes/controller/schemas)
- `server/src/modules/conveyors/conveyorActivitySequence.logic.ts`
- `server/src/modules/conveyors/operational-events/conveyor-operational-events.types.ts` (+ taxonomia FE)
- `server/src/modules/conveyor-operational-plan/*` (cancel writer pós-DRAFT **somente** via aborto)
- `server/src/modules/operational-planning/*`
- `server/src/modules/production/production-work-queue.*`, `production-time-entries.service.ts`
- `server/src/modules/my-work-queue/*`, `my-activities/*`
- `server/src/modules/conveyor-progress/conveyor-progress.service.ts`

### Frontend
- `src/domain/conveyors/stepOperationalStatus.ts`, `conveyor.types.ts`
- `src/features/esteiras/EsteiraDetalhePage.tsx`
- `src/services/conveyors/conveyorsApiService.ts`
- `src/domain/conveyors/operationalEventTaxonomy.ts` / formatters
- `src/features/operational-tickets/*`
- `src/features/conveyor-progress/*` (labels)
- badges/filas produção/kiosk (somente exibição; sem ação de aborto)

### Testes
- Espelhar lista da seção 6.8 + novos integration tests do fluxo de aborto/sync.

---

## 13. Migrations e compatibilidade de dados

- **Obrigatória:** alterar `chk_conveyor_nodes_step_operational_status` para incluir `ABORTED`.
- **Opcional/recomendada:** colunas de auditoria de aborto no nó (`aborted_at`, `aborted_by`, `abort_reason` / `abort_reason_code`) **ou** confiar só em eventos — decisão de modelagem na spec.
- **Plano:** reutilizar `cancellation_reason` no item; estender `updatePlanItem` **ou** SQL dedicado no serviço de aborto.
- **Dados existentes:** sem backfill; STEPs atuais permanecem válidos.
- **Compatibilidade de código:** qualquer build que introduza `ABORTED` no banco **sem** atualizar predicados de sequência quebrará a fábrica (predecessora abortada continuaria “aberta”). Deploy precisa ser atômico app+migration.

---

## 14. Plano de testes futuro (sem implementar)

### Automatizados
1. Constraint/migration aceita ABORTED; rejeita valor inválido.
2. Transições permitidas/negadas (incl. COMPLETED→ABORTED conforme decisão).
3. Permissão: sem `conveyors.create` → 403; kiosk sem endpoint.
4. Motivo obrigatório / catálogo.
5. Idempotência de evento.
6. Sync: itens plano esteira + work plan → CANCELLED; `cancellation_reason` gravado se escopo incluir.
7. Sequência: STEP1 ABORTED não marca STEP2 fora de sequência.
8. Produção/my-work-queue/my-activities: não apontável / fora da pendência.
9. Progresso: ABORTED ≠ completed; política de previsto coberta.
10. Tickets: excluído do lote padrão.
11. Preservação de time entries anteriores.
12. Regressão COMPLETE/REOPEN e cancelamento DRAFT inalterados.

### Manuais (Bravo)
- Esteira `EM_ANDAMENTO`: dispensar atividade do meio; sucessor apontável sem justificativa indevida.
- STEP com horas reais: horas permanecem; UI não mostra “Concluída”.
- Plano semanal publicado: some da fila do colaborador.
- Ticket térmico: não imprime no lote padrão.
- Kiosk: sem ação de dispensar.

---

## 15. Dúvidas para decisão humana — status

| # | Dúvida original | Status | Resolução |
|---|---|---|---|
| 1 | COMPLETED → ABORTED direto? | **Fechada** | Não; exige reabertura anterior |
| 2 | Previsto no denominador / pendência? | **Fechada** | Excluir da carga efetiva e pendência; preservar previsto original no histórico |
| 3 | Restauração? | **Fechada** | Sim, gestor, ABORTED → REOPENED; não reativa plano |
| 4 | Formato do motivo? | **Fechada** | Catálogo + Outro com texto obrigatório |
| 5 | UI além do detalhe? | **Fechada** | Só detalhe da esteira; demais telas só exibem |
| 6 | Esteira FINALIZADA/CANCELADA? | **Fechada** | Não permitir dispensa |
| 7 | Auditoria no nó vs evento? | **Fechada** | Campos próprios no nó **e** evento |
| 8 | Restaurar reativa planejamento? | **Fechada** | Não; volta não planejada |

Correção técnica adicional aprovada: §11.3 (idempotency key estável + lock do nó).

---

## 16. Veredito final

**SEGUIR**

*(Atualizado em 2026-08-08 após validação humana do inventário e fechamento das decisões da seção 15. Veredito anterior: `BLOQUEAR ATÉ ESCLARECER`.)*

### Por quê agora SEGUIR

Alt A permanece o caminho técnico; decisões de produto/KPI/restauração/motivo/UI/auditoria/idempotência estão fechadas. A spec pode ser gerada e, após aprovação da spec, o `sgp-implementer` pode atuar com escopo fechado.

### Ainda fora desta etapa

- Implementação de código de produção, migrations aplicadas em ambiente compartilhado, merge em `develop`/`main`, deploy.

---

## 17. Evidência Git operacional (pós-validação humana)

Comandos executados na workspace em `2026-08-08` (após o commit do inventário; working tree limpa):

### `git status --short`

```text
(vazio — nenhum arquivo untracked/modified após commit)
```

### `git status -sb`

```text
## feature/abortar-atividade-producao...origin/feature/abortar-atividade-producao
```

### `git log --oneline origin/main..HEAD` (antes desta atualização de decisões/spec)

```text
e7def6c2 docs: inventário técnico para abortar atividade em produção
```

### `git diff --stat origin/main...HEAD` (antes desta atualização)

```text
 .../abortar-atividade-producao-inventario.md       | 475 +++++++++++++++++++++
 1 file changed, 475 insertions(+)
```

### `git diff --name-only origin/main...HEAD` (antes desta atualização)

```text
docs/inventory/abortar-atividade-producao-inventario.md
```

### Confirmação

| Check | Resultado |
|---|---|
| Branch | `feature/abortar-atividade-producao` |
| SHA-base `origin/main` | `34679fd90b5270dc3e8f56c4f9b6f32bedf8815b` |
| Commit inventário | `e7def6c2a59ae464e5e25670e2ba8260c20bac44` |
| Diff vs main (1º commit) | **somente** o arquivo de inventário |

> Nota: o commit seguinte nesta branch pode incluir atualização do inventário (esta seção + decisões) e a especificação em `docs/specs/`; ainda **sem** alteração de código-fonte de aplicação.

---

## Apêndice A — Separação fato / hipótese / recomendação

| Classe | Conteúdo |
|---|---|
| **Fatos** | Enum STEP sem ABORTED; sequência = ≠ COMPLETED; cancel item só DRAFT; `cancellation_reason` não escrito; vínculo 0039; filas/tickets já tratam CANCELLED de **item**; eventos STEP sem aborto; reopen exige `conveyors.create` |
| **Hipóteses** | “Liberada para produção” ≈ esteira em status que aceita time entry; writers de IN_PROGRESS/BLOCKED ausentes em serviços; catálogo de motivo pode ou não reusar justificativas |
| **Recomendações → decisões** | Fechadas em §11.2 / §15; correção de idempotência/lock em §11.3; veredito `SEGUIR` |
| **Dúvidas humanas** | Fechadas (§15) |

## Apêndice B — Símbolos-chave

- Constraints: `chk_conveyor_nodes_step_operational_status`, `chk_conveyor_operational_plan_items_status`, `chk_operational_work_plan_items_status`
- Funções: `canTransitionStepStatus`, `completeConveyorStepOnClient`, `serviceReopenStep`, `assertPlanDraft`, `updatePlanItem`, `analyzeConveyorActivitySequence`, `resolveProductionCanTrackTime`, `isCompletedStepStatus`, `canEditConveyorOperationalPlanItems`, `isStepOperationallyCompleted`
- Eventos: `CONVEYOR_STEP_COMPLETED`, `CONVEYOR_STEP_REOPENED`, `CONVEYOR_STEP_OUT_OF_SEQUENCE_TIME_ENTRY`
- Endpoints: `PATCH …/steps/:stepNodeId/completion`, `PATCH …/operational-plan/:planId/items/:itemId`, `GET/POST production/*`, `GET my-work-queue`
