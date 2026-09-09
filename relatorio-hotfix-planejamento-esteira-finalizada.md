# Relatório — Hotfix planejamento esteira finalizada

## 1. STATUS_FINAL

```text
IMPLEMENTADO
```

## 2. Base

| Item | Valor |
|------|--------|
| SHA `origin/main` usado | `07ec5c085bcaa4d6c5e5975e6fc25722f850e3d6` |
| Branch | `hotfix/planejamento-esteira-finalizada-preexistente` |
| Commit da correção | `6d4204ec26b253cffd2706e5f8c7882090efa651` |
| Commit do relatório interno AI | `04080ee2c9da63a58a00b704ca2e6d90dd553d2c` |
| PR | https://github.com/multivacia/sgp/pull/28 |

## 3. Causa raiz

O save do Planejamento Semanal envia **todo** o `draftItems`. `validatePlanItems` rejeitava **qualquer** item cuja esteira estivesse `FINALIZADA`, **antes** de considerar pré-existência e sem distinguir item legado inalterado de item novo/alterado.

Itens válidos na publicação original, cuja esteira foi finalizada depois, passaram a bloquear qualquer salvamento da revisão — inclusive alterações em outros itens.

Classificação: **C** (save revalida itens não alterados) + **B** (regra correta no momento errado para legado).

## 4. Solução

Em `validatePlanItems`:

1. Se esteira ≠ `FINALIZADA` → fluxo anterior.
2. Se `FINALIZADA` e **não** pré-existente (draft∪published da semana) → `400` mensagem atual.
3. Se `FINALIZADA` e pré-existente → carrega baseline via `listActiveWeekPlanItemBaselines` (prefere DRAFT sobre PUBLISHED).
4. Se baseline ausente **ou** campos de planejamento diferem → `400`.
5. Se pré-existente **e** inalterado → `continue` (preserva no payload; pula COP/409), análogo ao STEP `COMPLETED` pré-existente.

Helper puro: `isUnchangedFinalizedPlanItem`.

### Campos usados para “inalterado”

| Campo | Comparado? | Motivo |
|-------|:----------:|--------|
| `assignedCollaboratorId` | Sim | Decisão de alocação |
| `assignedTeamId` | Sim | Decisão de alocação (null normalizado) |
| `plannedDate` | Sim | Dia planejado |
| `plannedMinutes` | Sim | Duração planejada (null normalizado) |
| `notes` | Sim | Conteúdo de planejamento (trim; vazio → null) |
| `conveyorOperationalPlanItemId` | Sim | Vínculo COP (null normalizado) |
| `plannedOrder` | **Não** | FE chama `recalculateOrders` no save → falso positivo |

### Remoção (Caso 4)

**Decisão:** não adicionar bloqueio novo nesta hotfix.

Omitir item `FINALIZADA` do payload continua resultando em remoção pelo `replaceWeekPlanItems` atual (diferente do preserve-by-id de STEP `COMPLETED`). Escopo mínimo preserva o comportamento pré-existente de omissão.

### Erro

Mensagem user-facing inalterada. `AppError.details` passa a incluir `conveyorId`, `activityNodeId`, `conveyorOperationalStatus: 'FINALIZADA'` (uso interno/diagnóstico).

## 5. Arquivos alterados

| Arquivo | Finalidade |
|---------|------------|
| `server/src/modules/operational-planning/operational-planning.service.ts` | Regra FINALIZADA pré-existente+inalterado; helper; details no erro |
| `server/src/modules/operational-planning/operational-planning.repository.ts` | `listActiveWeekPlanItemBaselines` |
| `server/src/tests/operational-planning.finalized-preserve.test.ts` | Testes obrigatórios da hotfix |
| `docs/ai/reports/implementation-hotfix-planejamento-esteira-finalizada.md` | Relatório interno do implementador |
| `relatorio-hotfix-planejamento-esteira-finalizada.md` | Este relatório |

**Frontend:** não alterado (desnecessário).  
**Migration / schema:** nenhum.

## 6. Testes

Reexecução independente (parent), exit codes reais:

```text
cd /workspace/server && npx vitest run \
  src/tests/operational-planning.finalized-preserve.test.ts \
  src/tests/operational-planning.completed-preserve.test.ts \
  src/tests/operational-planning.revision.test.ts
→ 3 files / 39 tests passed / exit 0

cd /workspace/server && npm run build   # tsc -p tsconfig.json
→ exit 0
```

| Teste | Resultado |
|-------|-----------|
| legado finalizado inalterado | PASS |
| alteração de outro item (com legado FINALIZADA) | PASS |
| novo item finalizado | PASS |
| mudança de dia | PASS |
| mudança de colaborador | PASS |
| regressão COMPLETED (`completed-preserve` + caso na suite nova) | PASS (exit 0) |
| revision suite | PASS (exit 0) |
| typecheck/build (`tsc`) | PASS (exit 0) |

Lint global do server: sem script dedicado no `package.json` do server — não aplicável.

## 7. Riscos / ressalvas

1. Remoção por omissão de item `FINALIZADA` **não** é bloqueada (decisão consciente de escopo mínimo).
2. Integração de rejeição por mudança de `assignedTeamId` / `plannedMinutes` / `notes` / COP id coberta no helper unitário; cenários de save HTTP focaram date e collaborator (aceitação da spec).
3. Validação manual em ambiente Bravo (semana real 2026-09-07) ainda recomendada.
4. Divergência 151×152 e late-add em FINALIZADA **fora do escopo** — não alteradas.
5. `CANCELADA` continua sem o mesmo tratamento no save (assimetria pré-existente).

### Validação manual recomendada

1. Carregar semana com plano publicado.
2. Garantir item de esteira posteriormente `FINALIZADA`.
3. Alterar outro item ativo → salvar → deve funcionar.
4. Alterar dia do item da esteira finalizada → deve bloquear.
5. Alterar colaborador do item da esteira finalizada → deve bloquear.
6. Tentar incluir novo item de esteira finalizada → deve bloquear.

## Ajuste adicional durante validação — data padrão

### Problema

Ao clicar em **Adicionar ao plano** no backlog (e no fallback do factory intake sem `plannedDate` na semana), o modal sempre pré-selecionava o **primeiro dia da semana** (`weekdayDates[0]`), mesmo quando a semana exibida continha o dia de hoje. Isso gerava drafts novos no dia errado (ex.: segunda quando hoje é quarta).

### Arquivo / funções

- Helper puro: `resolveDefaultNewPlanItemDay` em `src/features/operational-planning/operationalPlanningWeekRange.ts`
- Uso: `openAddModal` e `openAddFactoryIntakeModal` em `src/features/operational-planning/OperationalPlanningPage.tsx`
- Testes: `src/features/operational-planning/operationalPlanningWeekRange.test.ts`

### Comportamento anterior

1. Backlog → `setModalDay(weekdayDates[0] ?? weekMonday)` (sempre 1º dia útil)
2. Factory intake → preservava `item.plannedDate` se na semana; senão mesmo fallback do 1º dia

### Comportamento novo (prioridade)

1. Dia explicitamente preferido **se na semana**: `dailySelectedDay` (≠ `'week'`) no backlog; `item.plannedDate` no factory intake
2. `todayIso` se estiver em `weekdayDates`
3. `weekdayDates[0] ?? weekMonday` fallback

Semana futura / passada (hoje fora da semana): cai no 1º dia útil — mesma intenção do fallback antigo, sem forçar “hoje” inválido.

Confirmação do modal continua criando **novo** draft com `plannedDate: modalDay` — não sobrescreve itens existentes. Datas de editar/reabrir **não** foram alteradas. Backend FINALIZADA **não** tocado.

### Testes do helper

| Caso | Resultado esperado |
|------|--------------------|
| Semana 2026-09-07..11, today=2026-09-09 | 2026-09-09 |
| today=2026-09-07 | 2026-09-07 |
| today=2026-09-11 | 2026-09-11 |
| Semana futura 2026-09-14..18, today=2026-09-09 | 2026-09-14 |
| Semana passada 2026-08-31..09-04, today=2026-09-09 | 2026-08-31 |
| preferredDay=2026-09-10, today=2026-09-09 | 2026-09-10 |
| preferredDay fora da semana | today-in-week ou fallback |

### Commit

`985c4197587fe3a771356d253ba6ce4b4d10c471` — `fix(planning): default new item date to current day`.

## 8. Diff final

Commits na branch vs `origin/main`:

- `6d4204ec` — fix backend FINALIZADA (3 arquivos código/teste)
- `04080ee2` — docs AI report
- commits de relatório + **ajuste FE data padrão** (este seção)

Resumo do fix de código backend: **3 arquivos**, alteração mínima em service + repository + suite nova. Sem migration, sem schema.
Frontend adicional: helper de dia padrão + uso no modal de inclusão + testes.
