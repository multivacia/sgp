# Especificação — Dispensar atividade (STEP ABORTED) em esteira liberada

> Spec gerada por `sgp-feature-spec-writer` após inventário aprovado e veredito **SEGUIR**.
> Inventário: `docs/inventory/abortar-atividade-producao-inventario.md`.
> **Não implementa** código. Implementação somente via `sgp-implementer` com esta spec fechada.

## Demanda

Permitir que o gestor dispense (estado técnico `ABORTED` / rótulo **Dispensada**) uma atividade `STEP` de esteira já liberada para produção, sem excluir o nó, sem apontamento fictício e sem tratá-la como concluída, sincronizando planos e liberando a sequência.

## Decisões incorporadas

Fonte: decisões humanas fechadas em `2026-08-08` + inventário (veredito **SEGUIR** após validação humana). Não reabrir.

| Tema | Definição |
|---|---|
| Estado técnico | `ABORTED` |
| Nome apresentado | **Dispensada** |
| `COMPLETED` → `ABORTED` | **Não** permitir; exige reabertura prévia (`COMPLETED` → `REOPENED`) |
| Previsto | Excluir da **carga operacional efetiva** e da **pendência**; preservar o previsto original no histórico do nó/eventos |
| Realizado existente | Preservar integralmente (`conveyor_time_entries` intactas) |
| Restauração | Permitir `ABORTED` → `REOPENED` **somente** ao gestor |
| Planejamento ao restaurar | **Não** reativar automaticamente itens cancelados; volta como atividade **não planejada** |
| Motivo | Catálogo padronizado + **Outro** com texto obrigatório |
| Permissão | Gestor com `conveyors.create`; **nunca** kiosk/colaborador |
| UI de ação | Somente **detalhe da esteira**; demais telas apenas exibem o estado |
| Esteira `FINALIZADA` / `CANCELADA` | **Não** permitir dispensa |
| Auditoria | Campos próprios no nó **e** evento operacional |
| Sincronização | Cancelar plano da esteira **e** planejamento semanal na **mesma transação** |
| Idempotência | Chave estável da requisição + atualização condicional / lock do nó |
| Fonte da verdade | `conveyor_nodes.operational_status` (STEP) — inventário §6.1 |
| Origens para abortar | `PENDING`, `REOPENED`, `IN_PROGRESS`, `BLOCKED` |
| Não reutilizar | `operational_completed_at` / `operational_completed_by` para aborto |

## Comportamento esperado

### Modelo e predicados

1. Incluir `ABORTED` no CHECK `chk_conveyor_nodes_step_operational_status` (hoje só `PENDING|IN_PROGRESS|BLOCKED|COMPLETED|REOPENED` — verificado em `server/migrations/0028_conveyor_nodes_step_operational.sql`).
2. Separar predicados de domínio (BE + FE):
   - `isStepOperationallyCompleted` → somente `COMPLETED` (já existe em `src/domain/conveyors/stepOperationalStatus.ts`).
   - `isStepAborted` → `ABORTED`.
   - `isStepClosedForSequence` → `COMPLETED` **ou** `ABORTED` (hoje a sequência trata aberto se `≠ COMPLETED` — verificado em `analyzeConveyorActivitySequence`, `conveyorActivitySequence.logic.ts`).
3. Label FE: `ABORTED` → **Dispensada**.
4. Progresso/evolução (`conveyor-progress`): `ABORTED` **não** é `isCompleted`; previsto efetivo / denominador de % e pendência agregada **excluem** STEPs `ABORTED`; minutos planejados originais permanecem no histórico do nó/DTO analítico; realizado (soma de entries) permanece.

### Dispensa (abort)

5. Ação dedicada de domínio (serviço próprio; **não** liberar PATCH genérico de item de plano pós-`DRAFT`):
   - Autenticação app + permissão `conveyors.create` (mesmo eixo de reopen — verificado em `assertCanPatchStepCompletion`).
   - Esteira **não** pode estar `FINALIZADA` nem `CANCELADA`.
   - STEP deve estar em origem permitida: `PENDING | REOPENED | IN_PROGRESS | BLOCKED`.
   - Rejeitar `COMPLETED` → `ABORTED` (422 / transição inválida).
   - Motivo obrigatório: código do catálogo mínimo; se código = `OUTRO`, texto livre obrigatório (trim não vazio).
6. Na mesma transação DB:
   - `SELECT … FOR UPDATE` no `conveyor_nodes` do STEP.
   - Atualização **condicional** do status (só se status atual ∈ origens permitidas).
   - Gravar auditoria no nó: `aborted_at`, `aborted_by`, `abort_reason_code`, `abort_reason_text` (ou equivalente; **não** usar `operational_completed_*`).
   - Inserir evento `CONVEYOR_STEP_ABORTED` com `idempotency_key` estável, `reason`/metadata (código, texto, ids de itens cancelados, status anterior).
   - Cancelar itens vinculados em `conveyor_operational_plan_items` (mesmo se plano ≠ `DRAFT` — **somente** por este serviço) e `operational_work_plan_items` ligados (FK 0039), gravando `cancellation_reason` quando aplicável; item já `CANCELLED` = no-op.
7. Pós-aborto:
   - Sequência libera sucessoras (predecessora `ABORTED` não conta como aberta).
   - Filas produção/kiosk/my-work-queue/my-activities **excluem** ou tornam não apontáveis STEPs `ABORTED`.
   - Novos apontamentos (produção, web, kiosk) rejeitados se STEP `ABORTED`.
   - Tickets térmicos do lote padrão excluem atividade `ABORTED` (e itens cancelados).
   - **Não** criar `conveyor_time_entries` fictícias; **não** marcar `COMPLETED`; **não** soft-delete do nó.

### Restauração

8. Ação gestorial dedicada: `ABORTED` → `REOPENED`, permissão `conveyors.create`.
9. Limpa campos de aborto do nó; grava evento `CONVEYOR_STEP_RESTORED` (ou nome equivalente fechado na implementação, desde que distinto de `CONVEYOR_STEP_REOPENED` de conclusão).
10. **Não** reativa automaticamente itens de plano da esteira nem do planejamento semanal cancelados no aborto; atividade restaura como **não planejada** (replanejamento manual futuro fora desta entrega).

### UI

11. Botões **Dispensar atividade** / **Restaurar atividade dispensada** apenas em `EsteiraDetalhePage` (junto Concluir/Reabrir).
12. Confirmação com efeito claro + seleção de motivo (catálogo + Outro).
13. Badge/estado **Dispensada** + motivo/autor/data no detalhe; histórico de eventos reconhece o novo tipo.
14. Produção, kiosk, colaborador, planejamento semanal e plano operacional: **sem** ação de dispensar; podem apenas refletir/exibir o estado ou sumir da pendência.

### Catálogo de motivos (mínimo — sem UI admin)

Constante/seed mínima no backend (fora de escopo: CRUD admin completo). Códigos sugeridos (fechados para esta entrega):

| Código | Label |
|---|---|
| `NAO_MAIS_NECESSARIA` | Não é mais necessária |
| `SUBSTITUIDA_POR_OUTRA` | Substituída por outra atividade |
| `ERRO_DE_PLANEJAMENTO` | Erro de planejamento / escopo |
| `SOLICITACAO_CLIENTE` | Solicitação do cliente |
| `OUTRO` | Outro (exige texto) |

Não reutilizar o catálogo de justificativas de apontamento (`operational_time_entry_justifications`) nesta entrega.

## Notas de concorrência/idempotência

**ERRADO (proibido):**

```text
conveyor_step_aborted:{conveyorId}:{stepNodeId}:{occurredIso}
```

Timestamp variável não garante idempotência em retry/double-click.

**CERTO:**

1. **Idempotency key** vem da requisição do cliente (header/body) **ou** é estável para aquela operação (ex.: UUID gerado uma vez no cliente e reenviado nos retries). Não embutir `occurredAt`/ISO variável na chave.
2. Dentro da transação: **bloquear** o nó STEP (`SELECT … FOR UPDATE` em `conveyor_nodes` do `stepNodeId`) antes de ler/atualizar status, para serializar concorrência com apontamentos/conclusão.
3. **Atualização condicional:** só aplica `ABORTED` se `operational_status` atual ∈ `{PENDING, REOPENED, IN_PROGRESS, BLOCKED}`; caso contrário 409/422 conforme regra (já `COMPLETED` → rejeitar; já `ABORTED` + mesma key → resposta idempotente sucesso; já `ABORTED` + key diferente → conflito/idempotência conforme padrão de eventos existente).
4. Evento + cancelamento de planos + update do nó na **mesma** TX; commit único.
5. Apontamento em voo: se o aborto commitou antes, o POST de time entry deve reler status sob regras atuais e rejeitar; entries já commitadas antes do aborto **permanecem**.

## Critérios de aceite

- [ ] Migration altera `chk_conveyor_nodes_step_operational_status` para aceitar `ABORTED` e rejeitar valores fora do enum ampliado.
- [ ] Tipos BE/FE incluem `ABORTED`; label apresentado é **Dispensada**.
- [ ] Transição para `ABORTED` é aceita somente a partir de `PENDING`, `REOPENED`, `IN_PROGRESS` ou `BLOCKED`.
- [ ] Tentativa `COMPLETED` → `ABORTED` é rejeitada (sem mudar o nó); exige reabertura prévia.
- [ ] Tentativa de dispensar STEP em esteira `FINALIZADA` ou `CANCELADA` é rejeitada.
- [ ] Dispensa exige motivo do catálogo; código `OUTRO` sem texto obrigatório é rejeitado; demais códigos não exigem texto.
- [ ] Chamada sem permissão `conveyors.create` retorna 403; não existe endpoint/ação de dispensa em kiosk, produção (PIN) ou colaborador.
- [ ] Serviço de aborto faz `SELECT … FOR UPDATE` no STEP e atualização condicional do status na mesma transação.
- [ ] Idempotency key da requisição é estável (sem `occurredIso` variável); retry com a mesma key não duplica efeito colateral (evento/cancelamentos).
- [ ] Na mesma TX do aborto, itens vinculados de `conveyor_operational_plan_items` e `operational_work_plan_items` passam a `CANCELLED` (pós-`DRAFT` permitido **somente** por este serviço); item já cancelado é no-op.
- [ ] `isStepClosedForSequence` trata `ABORTED` como fechado: sucessoras não ficam fora de sequência por predecessora dispensada.
- [ ] Progresso: `ABORTED` ≠ concluída; previsto efetivo/pendência agregada excluem o STEP dispensado; previsto original permanece consultável no histórico.
- [ ] `conveyor_time_entries` existentes do STEP são preservadas integralmente; nenhum entry fictício / `markAsDone` é criado pelo aborto.
- [ ] Novos apontamentos (produção/web/kiosk) em STEP `ABORTED` são bloqueados.
- [ ] Filas produção/kiosk/my-work-queue/my-activities não listam STEP `ABORTED` como pendência apontável (ou equivalente testável de exclusão).
- [ ] Tickets térmicos do lote padrão excluem atividade `ABORTED`.
- [ ] Campos de auditoria no nó (`aborted_at`, `aborted_by`, motivo/código) são gravados; evento `CONVEYOR_STEP_ABORTED` é registrado; `operational_completed_*` não são usados para aborto.
- [ ] UI de ação (Dispensar / Restaurar) existe apenas no detalhe da esteira; outras telas no máximo exibem o estado.
- [ ] Restauração gestorial `ABORTED` → `REOPENED` com `conveyors.create` limpa auditoria de aborto e **não** reativa itens de plano cancelados (atividade volta não planejada).
- [ ] Após dispensa, o STEP **não** aparece como `COMPLETED` / “Concluída” em UI ou predicados de conclusão.
- [ ] Regressão: COMPLETE/REOPEN existentes e cancelamento de item de plano em `DRAFT` permanecem comportando-se como antes.

## Fora de escopo

- Liberar edição genérica de planos `APPROVED` / pós-`DRAFT` via API atual de PATCH de item.
- Abortar no kiosk, produção (PIN) ou colaborador.
- Soft-delete / remoção estrutural do nó STEP.
- `markAsDone` / entry fictícia / concluir com 0 min como substituto de dispensa.
- Backfill de dados antigos.
- Mudar ciclo de vida da esteira (`FINALIZADA`/`CANCELADA` etc.).
- UI admin completa de CRUD de motivos (constante/seed mínima basta).
- Replanejamento automático ou reativação de itens cancelados na restauração.
- Alterar deploy, secrets ou migrations em HML/PRD nesta entrega de código.

## Arquivos prováveis

### Frontend

- `src/domain/conveyors/stepOperationalStatus.ts`
- `src/domain/conveyors/conveyor.types.ts`
- `src/domain/conveyors/operationalEventTaxonomy.ts`
- `src/domain/conveyors/formatConveyorOperationalEvent.ts`
- `src/features/esteiras/EsteiraDetalhePage.tsx`
- `src/services/conveyors/conveyorsApiService.ts` (+ mock/factory se aplicável)
- `src/features/operational-tickets/*` (ex.: `filterPlanningActivityTicketSources`)
- `src/features/conveyor-progress/*` (labels/exibição)
- Badges/exibição em produção/kiosk/filas (somente estado; sem ação)

### Backend

- `server/src/modules/conveyors/stepOperationalStatus.ts`
- `server/src/modules/conveyors/conveyor-step-operational.service.ts` (+ routes/controller/schemas) **ou** serviço dedicado irmão
- `server/src/modules/conveyors/conveyorActivitySequence.logic.ts`
- `server/src/modules/conveyors/operational-events/conveyor-operational-events.types.ts`
- `server/src/modules/conveyor-operational-plan/*` (cancel writer pós-`DRAFT` **somente** via aborto)
- `server/src/modules/operational-planning/*`
- `server/src/modules/production/production-work-queue.*`, `production-time-entries.service.ts`
- `server/src/modules/my-work-queue/*`, `my-activities/*`
- `server/src/modules/conveyor-progress/conveyor-progress.service.ts`
- Catálogo mínimo de motivos (constante de módulo ou seed SQL mínima)
- Testes espelhando inventário §6.8 + integration do fluxo abort/restore/sync

### Banco (migrations)

- Nova migration (próximo número após `0049_operational_work_plan_revision.sql`): ampliar CHECK de `operational_status` com `ABORTED`
- Colunas de auditoria no nó: `aborted_at`, `aborted_by`, `abort_reason_code`, `abort_reason_text` (nomes equivalentes aceitáveis se documentados)
- Opcional: seed mínima do catálogo de motivos **somente se** não for constante de código
- Eventos: valores novos no enum/CHECK de tipos de evento operacional, se houver constraint

## Impacto por perfil

- **Admin:** sem ação nova obrigatória; pode ver estado/histórico se tiver acesso gestorial às esteiras; sem UI de catálogo de motivos nesta entrega.
- **Gestor** (com `conveyors.create`): único perfil que dispensa e restaura no detalhe da esteira; vê badge **Dispensada**, motivo e eventos; planos sincronizados cancelam na dispensa.
- **Colaborador:** não dispensa; deixa de ver/apontar atividade dispensada nas filas web; horas já lançadas permanecem.
- **Kiosk / Produção:** sem ação de dispensar; atividade dispensada fora da fila apontável; POST de time entry rejeitado se STEP `ABORTED`.

## Perguntas pendentes

Nenhuma bloqueante (decisões humanas fechadas).

### Observações opcionais (não bloqueantes)

- Nome exato do evento de restauração (`CONVEYOR_STEP_RESTORED` vs outro) pode seguir convenção do módulo de eventos, desde que distinto de `CONVEYOR_STEP_REOPENED`.
- Se writers de `IN_PROGRESS`/`BLOCKED` continuarem ausentes em runtime, ainda assim as origens permanecem válidas no CHECK/transição (inventário §6.1).
- Copy final dos labels do catálogo pode ser afinada na UX sem mudar códigos.

## Próximo passo

Aprovação humana desta spec → `sgp-implementer` com escopo fechado (deploy atômico app + migration, por risco de sequência — inventário §13).
