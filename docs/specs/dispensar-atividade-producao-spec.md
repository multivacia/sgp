# Especificação — Dispensar atividade (STEP ABORTED) em esteira liberada

> Spec gerada por `sgp-feature-spec-writer` e **revisada** após feedback humano (`APROVADA COM AJUSTES OBRIGATÓRIOS`).
> Inventário: `docs/inventory/abortar-atividade-producao-inventario.md`.
> **Não implementa** código. Implementação permanece **bloqueada** até aprovação explícita desta revisão.

## Demanda

Permitir que o gestor dispense (estado técnico `ABORTED` / rótulo **Dispensada**) uma atividade `STEP` de esteira já liberada para produção, sem excluir o nó, sem apontamento fictício e sem tratá-la como concluída, sincronizando planos e liberando a sequência.

## Decisões incorporadas

Fonte: decisões humanas fechadas em `2026-08-08` + inventário (veredito **SEGUIR**) + ajustes obrigatórios desta revisão. Não reabrir.

| Tema | Definição |
|---|---|
| Estado técnico | `ABORTED` |
| Nome apresentado | **Dispensada** |
| `COMPLETED` → `ABORTED` | **Não** permitir; exige reabertura prévia (`COMPLETED` → `REOPENED`) |
| Previsto | Excluir da **carga operacional efetiva** e da **pendência**; preservar o previsto original no histórico do nó/eventos |
| Realizado existente | Preservar integralmente (`conveyor_time_entries` intactas) |
| Restauração | Permitir `ABORTED` → `REOPENED` **somente** ao gestor |
| Planejamento ao restaurar | **Não** reativar automaticamente itens cancelados; volta como atividade **não planejada**, porém **elegível** a novo planejamento |
| Motivo | Catálogo padronizado + **Outro** com texto obrigatório |
| Permissão | Gestor com `conveyors.create`; **nunca** kiosk/colaborador |
| UI de ação | Somente **detalhe da esteira**; demais telas apenas exibem o estado |
| Esteira `FINALIZADA` / `CANCELADA` | **Não** permitir dispensa |
| Auditoria | Campos próprios no nó **e** evento operacional |
| Sincronização | Cancelar plano da esteira **e** planejamento semanal na **mesma transação** |
| Idempotência | Header `Idempotency-Key` estável + atualização condicional / lock do nó |
| Concorrência | Protocolo de lock **compartilhado** entre dispensa, restauração, conclusão e gravação de apontamento |
| Fonte da verdade | `conveyor_nodes.operational_status` (STEP) — inventário §6.1 |
| Origens para abortar | `PENDING`, `REOPENED`, `IN_PROGRESS`, `BLOCKED` |
| Não reutilizar | `operational_completed_at` / `operational_completed_by` para aborto |

## Status da spec

| Item | Valor |
|---|---|
| Avaliação humana anterior | `APROVADA COM AJUSTES OBRIGATÓRIOS` |
| Esta revisão | Fecha concorrência, contrato HTTP, restauração, 409 de chave e testes concorrentes |
| Implementação | **APROVADA PARA IMPLEMENTAÇÃO** (autorização humana explícita `2026-08-08` — implementação local; sem commit/push/PR/deploy) |

---

## Contrato HTTP (fechado)

Base path alinhado às rotas existentes em `conveyorAssignments.routes.ts` (`/conveyors/:conveyorId/steps/:stepNodeId/...`).

Resposta de sucesso segue o contrato já usado pelo detalhe da esteira na conclusão explícita:

```text
200 { ok: true, data: <ConveyorDetailApi>, meta?: { … } }
```

(verificado em `conveyorAssignments.controller.ts`: `res.status(200).json(ok(out.detail, { stepCompletionIdempotent: out.idempotent }))`).

### Dispensar

```http
POST /api/v1/conveyors/:conveyorId/steps/:stepNodeId/abort
Idempotency-Key: <UUID>
Content-Type: application/json

{
  "reasonCode": "NAO_MAIS_NECESSARIA",
  "reasonText": null
}
```

| Campo | Regra |
|---|---|
| Header `Idempotency-Key` | **Obrigatório**. UUID (ou string estável 1–180 chars alinhada ao padrão de eventos). **Proibido** derivar de `occurredAt`/timestamp variável. |
| `reasonCode` | Obrigatório; um dos códigos do catálogo (§ Catálogo). |
| `reasonText` | `null`/omitido se `reasonCode ≠ OUTRO`; se `OUTRO`, string trim não vazia obrigatória. |

**Sucesso `200`:**

```json
{
  "ok": true,
  "data": { "...ConveyorDetailApi...": true },
  "meta": { "stepAbortIdempotent": false }
}
```

- Replay com a **mesma** `Idempotency-Key` após aborto bem-sucedido: `200` com `meta.stepAbortIdempotent: true` e **sem** reaplicar cancelamentos/eventos.

### Restaurar dispensa

```http
POST /api/v1/conveyors/:conveyorId/steps/:stepNodeId/restore-aborted
Idempotency-Key: <UUID>
```

Sem body obrigatório (body vazio `{}` permitido).

**Sucesso `200`:**

```json
{
  "ok": true,
  "data": { "...ConveyorDetailApi...": true },
  "meta": { "stepRestoreAbortedIdempotent": false }
}
```

- Replay com a **mesma** key: `200` + `meta.stepRestoreAbortedIdempotent: true`.

### Códigos de erro (fechados)

| HTTP | Quando |
|---|---|
| **400** | Corpo inválido; `reasonCode` fora do catálogo; `OUTRO` sem texto; `Idempotency-Key` ausente/inválida |
| **403** | Ausência de permissão `conveyors.create` |
| **404** | Esteira inexistente **ou** STEP inexistente / não pertence à esteira / não é `node_type = STEP` |
| **409** | Transição inválida ou conflito de estado, incluindo: esteira `FINALIZADA`/`CANCELADA`; origem não permitida (ex.: `COMPLETED`→abort); STEP já `ABORTED` com **outra** `Idempotency-Key`; restore quando status ≠ `ABORTED` (exceto replay da mesma key); conflito de concorrência equivalente |

> Nota: a conclusão explícita legada usa 422 em algumas transições (`INVALID_STATUS_TRANSITION`). **Para abort/restore**, esta spec fecha **409** conforme decisão humana. Não misturar 422 nesses dois endpoints.

### Autenticação / superfície

- Somente sessão app (gestor) com `conveyors.create`.
- **Não** expor em rotas de produção/kiosk/PIN.

---

## Protocolo de lock e concorrência (obrigatório e compartilhado)

### Problema que esta seção resolve

Bloquear o nó **somente** no serviço de dispensa **não basta**. Sem o mesmo protocolo na gravação de apontamento (e na conclusão), este cenário é possível:

1. Apontamento lê o STEP como `PENDING` (fora de lock / antes do lock).
2. Dispensa bloqueia e altera o nó para `ABORTED`.
3. Apontamento, que já havia validado o estado anterior, grava horas depois.

### Protocolo único

As operações abaixo **devem** adotar o **mesmo** protocolo de lock de `conveyor_nodes` **dentro** das respectivas transações, **antes** de decidir mutação com base em `operational_status`:

| Operação | Onde (evidência atual / alvo) |
|---|---|
| Dispensa (`POST …/abort`) | Novo serviço |
| Restauração (`POST …/restore-aborted`) | Novo serviço |
| Conclusão / reabertura explícita (`PATCH …/completion`) | `conveyor-step-operational.service.ts` — **adaptar** |
| Gravação de apontamento web / on-behalf | `conveyorAssignments.service.ts` (TX já usa `BEGIN` ~L651/L856) — **adaptar** |
| Gravação de apontamento produção/kiosk | `production-time-entries.service.ts` (TX `BEGIN` ~L279) — **adaptar** |

**Passos obrigatórios em cada TX que muta status do STEP ou grava `conveyor_time_entries` no STEP:**

1. `BEGIN`
2. Obter locks na **ordem única** (§ Ordem de locks)
3. **Relê** `operational_status` (e dados necessários) **já sob lock**
4. Valida regras com o estado relido
5. Mutação condicional / insert
6. `COMMIT` (ou `ROLLBACK` em erro)

Leitura de status **antes** do lock **não** autoriza gravação posterior.

### Resultados determinísticos (apontamento × dispensa)

| Quem obtém o lock do STEP primeiro | Resultado |
|---|---|
| **Apontamento** primeiro | Grava as horas; a dispensa posterior, ao obter o lock, vê o estado atual (ainda abortável se origem ∈ permitidas), aplica `ABORTED` e **preserva** as horas já gravadas |
| **Dispensa** primeiro | Apontamento espera o lock, **relê** `ABORTED` e é **rejeitado** (409 ou erro de domínio equivalente já usado para STEP não apontável — desde que não grave) |

### Resultados determinísticos (conclusão × dispensa)

| Quem obtém o lock do STEP primeiro | Resultado |
|---|---|
| **Conclusão** primeiro | STEP vira `COMPLETED`; dispensa posterior recebe **409** (`COMPLETED`→`ABORTED` proibido) |
| **Dispensa** primeiro | STEP vira `ABORTED`; conclusão posterior recebe **409**/transição inválida e **não** marca `COMPLETED` |

### Ordem única de locks (anti-deadlock)

Toda TX coberta por este protocolo **deve** adquirir locks nesta ordem fixa (nunca na ordem inversa):

1. **`conveyors`** — `SELECT … FROM conveyors WHERE id = :conveyorId FOR UPDATE` (quando a operação também lê/muta status da esteira, ex. auto-start `A_INICIAR`→`EM_ANDAMENTO`, ou valida `FINALIZADA`/`CANCELADA`).
2. **`conveyor_nodes` (STEP alvo)** — `SELECT … FROM conveyor_nodes WHERE id = :stepNodeId AND conveyor_id = :conveyorId FOR UPDATE`.
3. **Demais linhas** (itens de plano da esteira, itens do planejamento semanal, inserts de time entry, eventos): somente **depois** dos locks 1–2; se múltiplos itens de plano forem travados, ordenar por `id ASC`.

Se a operação **não** precisar mutar/validar a esteira sob escrita, ainda assim, para homogeneidade e anti-deadlock com caminhos que auto-iniciam esteira, **preferir sempre** adquirir o lock da esteira (passo 1) antes do STEP. Implementação pode documentar helper único (ex. `lockConveyorAndStepForUpdate(client, conveyorId, stepNodeId)`).

**Proibido:** lock de time-entry/plan item **antes** do STEP; lock de STEP A depois STEP B em ordem de id decrescente se algum fluxo futuro travar dois STEPs (nessa entrega só um STEP é alvo).

### Idempotência (abort e restore)

**Proibido:**

```text
conveyor_step_aborted:{conveyorId}:{stepNodeId}:{occurredIso}
```

**Obrigatório:**

1. Chave = header `Idempotency-Key` da requisição (estável; cliente reenvia no retry).
2. Persistência da chave no evento operacional (`idempotency_key`) com unicidade já existente.
3. **Mesma key** após sucesso → replay idempotente `200` + meta `*Idempotent: true`, sem reaplicar efeitos.
4. STEP já `ABORTED` com **key diferente** → **409** (não silenciar como sucesso).
5. Restore: mesmas regras com evento `CONVEYOR_STEP_RESTORED` (nome fechado nesta revisão).

---

## Comportamento esperado

### Modelo e predicados

1. Incluir `ABORTED` no CHECK `chk_conveyor_nodes_step_operational_status` (hoje só `PENDING|IN_PROGRESS|BLOCKED|COMPLETED|REOPENED` — `server/migrations/0028_conveyor_nodes_step_operational.sql`).
2. Predicados BE + FE:
   - `isStepOperationallyCompleted` → somente `COMPLETED`.
   - `isStepAborted` → `ABORTED`.
   - `isStepClosedForSequence` → `COMPLETED` **ou** `ABORTED`.
3. Label FE: `ABORTED` → **Dispensada**.
4. Progresso (`conveyor-progress`): `ABORTED` ≠ `isCompleted`; previsto efetivo / % / pendência agregada **excluem** STEPs `ABORTED`; previsto original permanece no histórico; realizado (soma de entries) permanece.

### Dispensa (`POST …/abort`)

5. Serviço dedicado; **não** liberar PATCH genérico de item de plano pós-`DRAFT`.
6. Regras: `conveyors.create`; esteira ∉ `{FINALIZADA, CANCELADA}`; origem ∈ `{PENDING, REOPENED, IN_PROGRESS, BLOCKED}`; rejeitar `COMPLETED`; motivo conforme catálogo.
7. Na TX: protocolo de lock (§ acima) → update condicional → auditoria no nó (`aborted_at`, `aborted_by`, `abort_reason_code`, `abort_reason_text`) → evento `CONVEYOR_STEP_ABORTED` → cancelar `conveyor_operational_plan_items` e `operational_work_plan_items` vinculados (pós-`DRAFT` **somente** por este serviço; já `CANCELLED` = no-op; gravar `cancellation_reason` quando aplicável).
8. Pós-aborto: sequência libera sucessoras; filas/tickets excluem ou tornam não apontável; novos apontamentos rejeitados sob lock; **sem** entry fictícia; **sem** `COMPLETED`; **sem** soft-delete.

### Restauração (`POST …/restore-aborted`)

9. Mesmo protocolo de lock + `Idempotency-Key` + update **condicional** (`ABORTED` → `REOPENED` somente).
10. Limpa campos de aborto do nó; evento `CONVEYOR_STEP_RESTORED` (distinto de `CONVEYOR_STEP_REOPENED`).
11. **Não** reativa itens de plano cancelados no aborto.
12. Após restore, a atividade fica **elegível para novo planejamento** (pode entrar de novo em geração/inclusão de plano da esteira e encaixe semanal como qualquer STEP `REOPENED`/`PENDING` não planejado), **sem** reaproveitar automaticamente os itens antigos cancelados.

### UI

13. Ações somente em `EsteiraDetalhePage` (Dispensar / Restaurar), com confirmação + motivo; badge **Dispensada** + motivo/autor/data; demais telas só exibem/filtram.

### Catálogo de motivos (mínimo — sem UI admin)

| Código | Label |
|---|---|
| `NAO_MAIS_NECESSARIA` | Não é mais necessária |
| `SUBSTITUIDA_POR_OUTRA` | Substituída por outra atividade |
| `ERRO_DE_PLANEJAMENTO` | Erro de planejamento / escopo |
| `SOLICITACAO_CLIENTE` | Solicitação do cliente |
| `OUTRO` | Outro (exige texto) |

Não reutilizar `operational_time_entry_justifications` nesta entrega.

---

## Critérios de aceite

### Modelo / domínio

- [ ] Migration altera `chk_conveyor_nodes_step_operational_status` para aceitar `ABORTED` e rejeitar valores fora do enum ampliado.
- [ ] Tipos BE/FE incluem `ABORTED`; label apresentado é **Dispensada**.
- [ ] Transição para `ABORTED` só a partir de `PENDING`, `REOPENED`, `IN_PROGRESS` ou `BLOCKED`.
- [ ] `COMPLETED` → `ABORTED` rejeitado com **409** (sem mudar o nó).
- [ ] Dispensa em esteira `FINALIZADA` ou `CANCELADA` rejeitada com **409**.
- [ ] `isStepClosedForSequence` trata `ABORTED` como fechado.
- [ ] Progresso: `ABORTED` ≠ concluída; previsto efetivo/pendência excluem o STEP; previsto original consultável no histórico.
- [ ] Após dispensa, STEP **não** aparece como `COMPLETED` / “Concluída”.

### Contrato HTTP / permissão / motivo

- [ ] `POST …/abort` e `POST …/restore-aborted` existem conforme § Contrato HTTP.
- [ ] Header `Idempotency-Key` obrigatório; ausência/formato inválido → **400**.
- [ ] Corpo/motivo inválidos (`reasonCode` / `OUTRO` sem texto) → **400**.
- [ ] Sem `conveyors.create` → **403**; sem superfície kiosk/produção/colaborador.
- [ ] Esteira/STEP inexistente → **404**.
- [ ] Sucesso retorna `ConveyorDetailApi` no envelope `ok(data, meta)` alinhado ao detalhe da esteira.
- [ ] Replay com a **mesma** key → **200** idempotente (`meta.*Idempotent: true`) sem reaplicar efeitos.
- [ ] Key **diferente** sobre STEP já `ABORTED` → **409** (não replay).

### Lock / concorrência / sync

- [ ] Dispensa, restauração, conclusão explícita e gravação de apontamento (web + produção) usam o **mesmo** protocolo de lock de `conveyor_nodes` dentro da TX, com relê sob lock antes de mutar.
- [ ] Ordem de locks respeita § Ordem única (esteira → STEP → demais).
- [ ] Apontamento que obtém lock primeiro grava horas; dispensa posterior preserva essas horas.
- [ ] Dispensa que obtém lock primeiro faz o apontamento concurrente reler `ABORTED` e ser rejeitado **sem** gravar.
- [ ] Conclusão × dispensa: resultados determinísticos da § correspondente.
- [ ] Na mesma TX do aborto, itens vinculados de plano esteira + work plan → `CANCELLED` (pós-`DRAFT` só via este serviço).

### Dados / filas / UI / restore

- [ ] `conveyor_time_entries` existentes preservadas; nenhum fictício/`markAsDone` pelo aborto.
- [ ] Novos apontamentos em STEP `ABORTED` bloqueados.
- [ ] Filas produção/kiosk/my-work-queue/my-activities não tratam STEP `ABORTED` como pendência apontável.
- [ ] Tickets térmicos do lote padrão excluem `ABORTED`.
- [ ] Auditoria no nó + evento `CONVEYOR_STEP_ABORTED`; sem usar `operational_completed_*` para aborto.
- [ ] UI de ação só no detalhe da esteira.
- [ ] Restore: lock + idempotency + update condicional `ABORTED`→`REOPENED`; limpa auditoria de aborto; evento `CONVEYOR_STEP_RESTORED`.
- [ ] Após `ABORTED`→`REOPENED`, atividade fica **elegível a novo planejamento** e **não** reativa itens antigos cancelados.
- [ ] Regressão: COMPLETE/REOPEN e cancelamento de item em `DRAFT` permanecem corretos.

### Testes obrigatórios (além dos unitários/isolados)

- [ ] **Teste concorrente apontamento × dispensa** (dois clientes/TX competindo pelo mesmo STEP): cobre os dois vencedores de lock e asserta preservação vs rejeição.
- [ ] **Teste concorrente conclusão × dispensa** no mesmo STEP: cobre os dois vencedores de lock e asserta `COMPLETED`+409 na dispensa **ou** `ABORTED`+rejeição da conclusão.

### Relatório de implementação (obrigatório no handoff do `sgp-implementer`)

- [ ] Relatório registra **branch**, **SHA-base** (`origin/main` / commit base), saída real de `git status --short`, `git diff --stat` / `--name-only` relevantes, e comandos de teste com exit code.
- [ ] Relatório em prosa **sem** essa evidência Git **não** é aceito como prova.

---

## Fora de escopo

- Liberar edição genérica de planos `APPROVED` / pós-`DRAFT` via PATCH de item.
- Abortar no kiosk, produção (PIN) ou colaborador.
- Soft-delete / remoção estrutural do nó STEP.
- `markAsDone` / entry fictícia / concluir com 0 min como substituto de dispensa.
- Backfill de dados antigos.
- Mudar ciclo de vida da esteira.
- UI admin completa de CRUD de motivos.
- Reativação automática de itens cancelados na restauração.
- Alterar deploy, secrets ou migrations em HML/PRD nesta entrega.
- Chamar `sgp-implementer` antes da aprovação explícita **desta** revisão da spec.

## Arquivos prováveis

### Frontend

- `src/domain/conveyors/stepOperationalStatus.ts`, `conveyor.types.ts`
- `src/domain/conveyors/operationalEventTaxonomy.ts`, `formatConveyorOperationalEvent.ts`
- `src/features/esteiras/EsteiraDetalhePage.tsx`
- `src/services/conveyors/conveyorsApiService.ts` (+ mock/factory)
- `src/features/operational-tickets/*`, `src/features/conveyor-progress/*`
- Badges/exibição em filas (sem ação)

### Backend

- `server/src/modules/conveyors/stepOperationalStatus.ts`
- `server/src/modules/conveyors/conveyor-step-operational.service.ts` (+ routes/controller/schemas para `abort` / `restore-aborted`)
- Helper de lock compartilhado (novo símbolo documentado)
- `server/src/modules/conveyors/conveyorActivitySequence.logic.ts`
- `server/src/modules/conveyors/operational-events/*`
- `server/src/modules/conveyors/conveyorAssignments.service.ts` (lock na TX de time entry)
- `server/src/modules/production/production-time-entries.service.ts` (lock na TX)
- `server/src/modules/conveyor-operational-plan/*`, `operational-planning/*`
- `server/src/modules/my-work-queue/*`, `my-activities/*`
- `server/src/modules/conveyor-progress/conveyor-progress.service.ts`
- Catálogo mínimo de motivos
- Testes de integração incluindo **dois testes concorrentes** obrigatórios

### Banco (migrations)

- Próxima após `0049_…`: CHECK com `ABORTED` + colunas `aborted_at`, `aborted_by`, `abort_reason_code`, `abort_reason_text`
- Event types `CONVEYOR_STEP_ABORTED` e `CONVEYOR_STEP_RESTORED` se houver constraint de tipos

## Impacto por perfil

- **Admin:** sem ação nova obrigatória; vê estado/histórico se tiver acesso gestorial.
- **Gestor** (`conveyors.create`): único que chama abort/restore no detalhe da esteira.
- **Colaborador:** não dispensa; deixa de apontar atividade dispensada; horas prévias permanecem.
- **Kiosk / Produção:** sem ação de dispensar; filas/POST respeitam lock + rejeição se `ABORTED`.

## Perguntas pendentes

Nenhuma bloqueante para fechar esta revisão.

### Observações opcionais (não bloqueantes)

- Copy dos labels do catálogo pode ser afinada sem mudar códigos.
- Código de erro interno (`ErrorCodes.*`) pode espelhar 409 existente do projeto, desde que o HTTP seja 409 nos casos desta spec.
- Writers de `IN_PROGRESS`/`BLOCKED` podem continuar raros; origens permanecem válidas.

## Próximo passo

1. ~~Aprovação humana explícita desta revisão~~ — **concedida** (`SGP_AUTORIZACAO_IMPLEMENTAR_DISPENSAR_ATIVIDADE`).
2. `sgp-implementer` com escopo fechado (migration só em banco local/teste isolado).
3. Relatório do implementador **deve** incluir branch, SHA-base e `git status --short` reais.
4. `sgp-test-reviewer` independente; depois **parar** (sem commit/push/PR).

**Implementação local: autorizada. Commit/push/PR/deploy: ainda bloqueados.**
