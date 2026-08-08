# Análise de Impacto — Responsável na Atividade da Matriz

## 0. Metadados da análise

| Campo | Valor |
|---|---|
| Data da análise | 2026-08-08 |
| Commit da `main` analisado | `34679fd90b5270dc3e8f56c4f9b6f32bedf8815b` (10/07/2026) |
| Branch de análise | `docs/analise-responsavel-atividade-matriz` |
| Escopo desta entrega | Somente análise de impacto (Etapa 1). Nenhum código, migration, teste funcional ou configuração foi alterado. |
| Autor | Claude Code, seguindo o fluxo `sgp-context-reader` → `sgp-impact-analyst` deste repositório |

---

## 1. Resumo executivo

A infraestrutura de dados para "responsável por atividade" **já existe e nunca foi removida do schema** — ela foi **deliberadamente desativada no backend** (HTTP 422) em favor de "equipe padrão" via `team_ids`. Reabilitar o campo é tecnicamente barato em termos de schema (nenhuma migration é estritamente necessária para o caso básico), mas é uma **reversão explícita de uma decisão de produto registrada em código**, cuja mensagem de erro afirma: *"Colaborador padrão não é mais usado em Atividades da Matriz. Use teamIds (equipe padrão)."*

Essa decisão foi introduzida no commit `5af13dcc` ("Ajustes em Matriz", 14/05/2026), autoria `Gustavo Almeida <gustavoramosalmeida@gmail.com>` — o mesmo autor desta solicitação. Não há, no repositório, um registro do motivo de negócio por trás da descontinuação; fica como pergunta pendente a ser respondida antes da implementação (ver seção 20).

O maior risco técnico não é o dado em si, mas a **superfície fragmentada** em que a herança Matriz → Esteira precisaria ser implementada:

- **Duas telas de Matriz** precisam de UI nova: o assistente de criação (`CriarMatrizEstruturaManual.tsx`) e o **editor de matriz já persistida** (`OperationMatrixEditorPage.tsx`) — esta segunda tela não constava na pista da análise preliminar e foi confirmada nesta análise.
- **Dois fluxos de produção ativos e independentes** convertem Matriz em Esteira: a composição manual (`ConveyorCreateEditPage.tsx` → `NovaEsteiraComposicaoManual.tsx`, via `novaEsteiraDraftFromMatrix.ts` / `matrixToConveyorCreateInput.ts`) e a importação de documento — pipeline R6 (`NovaEsteiraPorDocumentoPage.tsx` → `draftToCreateConveyorInput.ts`, alimentado por `matchOperationalItems.ts`). Implementar a herança em apenas um deles produz comportamento inconsistente sem erro visível.
- Existe um **efeito colateral latente e verificado**: o módulo de Planejamento Semanal (`conveyor-operational-plan.service.ts`) já tem um fallback dormente que lê `conveyor_nodes.default_responsible_id` como responsável padrão de um item de plano. Essa coluna é hoje sempre `null`; se a implementação decidir gravar o responsável herdado ali (em vez de exclusivamente em `conveyor_node_assignees`, a fonte de verdade documentada no próprio banco), o Planejamento Semanal muda de comportamento sem que isso tenha sido pedido.

Como **nenhuma Atividade de Matriz possui hoje responsável configurado** (todo caminho de escrita verificado zera ou rejeita o campo), tornar o responsável **obrigatório de forma imediata e sem transição** invalidaria 100% das atividades existentes.

**Recomendação desta análise: SEGUIR COM AJUSTES** — condicionada a decisões de produto explícitas listadas na seção 20, antes de abrir a especificação de implementação.

---

## 2. Entendimento da regra de negócio

- Cada Atividade da Matriz (`matrix_nodes` tipo `ACTIVITY`) continua associada a uma equipe (`team_ids`, hoje limitado a 1 na prática de aplicação).
- A atividade passa a ter também um **colaborador responsável**, que deve ser colaborador **ativo** e **membro da equipe** selecionada na própria atividade.
- Na UI, a equipe é selecionada antes do responsável; o campo de responsável lista somente colaboradores elegíveis da equipe selecionada.
- Trocar a equipe limpa o responsável atual se ele não pertencer à nova equipe, exigindo nova seleção.
- Atividades diferentes da mesma Matriz podem ter equipes e responsáveis diferentes (já é assim hoje para equipe; responsável seria por atividade, não por matriz).
- Ao materializar uma Esteira a partir da Matriz, cada atividade gerada herda equipe **e** responsável configurados na Atividade da Matriz naquele momento.
- Após a criação, Matriz e Esteira ficam independentes: alteração de responsável na Esteira não deve escrever de volta na Matriz; a Matriz não é afetada por edições feitas na Esteira.
- Próximas Esteiras continuam usando o que estiver configurado na Matriz no momento de cada nova criação (não há vínculo retroativo).
- **Fora de escopo desta análise (Etapa 2)**: impedir exclusão/inativação de colaborador que seja responsável em Matriz ou em Esteira aberta. Citada apenas como dependência futura/risco de integridade referencial (seção 15), sem entrar na estimativa da Etapa 1.

---

## 3. Comportamento atual confirmado por leitura de código

### 3.1 Banco de dados

| Tabela / coluna | Situação | Evidência |
|---|---|---|
| `matrix_nodes.default_responsible_id` | **Já existe**, UUID, FK `collaborators`, `ON DELETE SET NULL`, com índice. Nasceu na migration original, nunca foi removida. | `server/migrations/0003_matrix_nodes.sql:18,51` |
| `matrix_node_assignment_teams` | Tabela de vínculo N:N matriz-atividade ↔ equipe, soft delete. Representa "equipe da atividade" hoje. **Sem `UNIQUE` de banco** limitando a 1 equipe ativa por atividade — o limite de "só 1" é imposto apenas na camada de aplicação. | `server/migrations/0021_matrix_node_assignment_teams.sql` |
| `teams` / `team_members` | Equipe ↔ colaborador via tabela de vínculo, com `is_active`, `is_primary`, índice único de "1 principal ativo por equipe". | `server/migrations/0016_teams_and_permissions.sql` |
| `conveyor_nodes.default_responsible_id` | Mesmo padrão legado da Matriz, também sempre `null` hoje. Comentário de migration afirma explicitamente que é mantida "por compatibilidade" e que a fonte de verdade é `conveyor_node_assignees`. | `server/migrations/0005_conveyors_and_nodes.sql:82`; `server/migrations/0006_conveyor_assignees_and_time_entries.sql:1-4` |
| `conveyor_node_assignees` | Fonte de verdade real de alocação por STEP. Suporta `assignment_type` `COLLABORATOR`/`TEAM` coexistindo no mesmo STEP; só 1 `COLLABORATOR is_primary=TRUE` por STEP; `TEAM` nunca é principal. | `server/migrations/0006_...sql`; `server/migrations/0023_conveyor_assignees_team_support.sql:26-53` |
| Trigger de apontamento | `fn_validate_conveyor_time_entry_row` permite apontamento se o colaborador é membro ativo do time alocado no assignee do STEP. | `server/migrations/0029_conveyor_time_entry_team_assignee_validation.sql` |

**Conclusão de banco:** não é necessária nenhuma migration para reintroduzir o campo básico na Matriz — a coluna e o índice já existem. Migration só seria necessária se a decisão de produto for (a) tornar o campo `NOT NULL` no banco, ou (b) alterar `matrix_node_assignment_teams` para impor unicidade de equipe por atividade no nível de schema (não obrigatório pela demanda, mas relevante registrar como pré-condição implícita hoje só garantida em aplicação).

### 3.2 Backend — `operation-matrix` (rejeição ativa do campo)

Módulo: `server/src/modules/operation-matrix/`.

- **Contrato Zod** (`operation-matrix.schemas.ts:22-38,89-104`) já aceita `defaultResponsibleId` em nós `ACTIVITY`, tanto em `POST` quanto em `PATCH`.
- **Service rejeita em runtime**, independentemente do schema permitir:
  - Criação: `operation-matrix.service.ts:253-262` — se `nodeType === 'ACTIVITY'` e `defaultResponsibleId !== undefined`, lança `AppError('Colaborador padrão não é mais usado em Atividades da Matriz. Use teamIds (equipe padrão).', 422, VALIDATION_ERROR)`.
  - Patch: mesma rejeição em `patchBodyToDb`, `operation-matrix.service.ts:329-334,352-358`.
  - `servicePatchNode` (`:386-401`): quando `teamIds` de uma `ACTIVITY` é alterado, o próprio patch força `default_responsible_id = null`.
  - Duplicação de item como nova raiz (`serviceDuplicateItemAsNewRoot`, `:511-512`) e duplicação de subárvore (`serviceDuplicateSubtreeUnderSameParent`, `:617-618`): para `ACTIVITY`, o responsável é **sempre nulado** na cópia; `team_ids` **é** copiado.
- **Repository** (`operation-matrix.repository.ts`):
  - `collaboratorExists` (`:179-188`) existe como helper mas **não é chamado em nenhum lugar** do módulo — código morto, aparentemente preparado para validação futura.
  - `replaceNodeTeamLinks` (`:302-330`) impõe no máximo 1 equipe por `ACTIVITY` (para no primeiro id), apesar do contrato `team_ids: string[]` sugerir múltiplas.
  - `listExistingTeamIds` (`:190-202`) valida apenas que o `team_id` existe em `teams` — **não valida `is_active`** da equipe.

### 3.3 Backend — `teams` (reaproveitável)

- `GET /teams/:teamId/members` **existe e funciona** (`teams.routes.ts:30-34`, guardado por `teams.view`), retornando apenas membros com `team_members.is_active = TRUE` (`teams.service.ts:88-97`). Hoje só é consumido por `EquipeDetalhePage.tsx` (gestão de equipes) — nenhum fluxo de Matriz ou Esteira o usa.
- Padrão de "colaborador ativo" já implementado e reaproveitável: `assertCollaboratorActiveForNewMembership` (`teams.service.ts:99-113`) + `findCollaboratorEligibility` (`teams.repository.ts:218-234`), que checa `deleted_at IS NULL`, `is_active`, `status === 'ACTIVE'`.

### 3.4 Frontend — Matriz

- **Criação** (`src/features/operation-matrix/criar-matriz/CriarMatrizEstruturaManual.tsx`): já existe UI de "Equipe de execução" (checkboxes) e "Colaboradores" (multi-select com rádio "Principal") por atividade — **mas os dois seletores são independentes**: a lista de colaboradores não é filtrada pela equipe selecionada (`:401-453`).
  - `createManualMatrixStructure.ts:38-57` envia ao backend `teamIds` (máx. 1) e `metadataJson` com `supportIds` = todos os colaboradores selecionados — **sem marcar quem era o "Principal"**. O `primaryCollaboratorId` é descartado no envio.
  - `criarMatrizManualDraft.ts:12-13` traz um comentário afirmando que o principal "também é persistido como `defaultResponsibleId`" — **isso é falso frente ao código atual**; é débito de documentação/UX órfã.
  - `createManualMatrixStructure.test.ts:42,51-56` usa `primaryCollaboratorId` num fixture mas **não asserta** que ele chega ao payload de `defaultResponsibleId` — condizente com o fato de o dado ser descartado.
- **Edição de matriz já persistida** (`src/features/operation-matrix/OperationMatrixEditorPage.tsx`, rota ativa em `src/routes/AppRoutes.tsx:246`): edita `name`/`plannedMinutes`/`teamIds`/`required` de `ACTIVITY` (`:625-645`) — **não tem nenhum campo de responsável**. Esta tela não constava na pista da análise preliminar; é confirmada aqui como segunda superfície de UI a alterar.
- `operationMatrixPreviewPersist.ts` (outro caminho de patch, usado em reconciliação/import) também só trata `plannedMinutes`/`teamIds`/`required`/`orderIndex`/`name`.
- `matrixTreeAggregates.ts:26` já trata `default_responsible_id` como legado que "não conta" nos agregados de "atividade sem equipe padrão" — o próprio código já assume a coluna como morta.
- `metadata_json.sgp.matrixActivityCollaborators.v1` (`matrixActivityCollaboratorsMeta.ts`) é hoje o único lugar onde colaboradores ficam de fato associados a uma `ACTIVITY` da Matriz, sem marcação de "principal".

### 3.5 Frontend — Esteira a partir de Matriz

Existem **dois fluxos de produção ativos e independentes**:

1. **Composição manual**: `ConveyorCreateEditPage.tsx` → `NovaEsteiraComposicaoManual.tsx`, usando `buildManualConveyorInput`/`manualAssigneeRowsToApi` de `matrixToConveyorCreateInput.ts` no submit (`ConveyorCreateEditPage.tsx:598-608,626`).
   - **Há herança parcial hoje**: `matrixActivityToInitialAllocRows` (`novaEsteiraDraftFromMatrix.ts:19-34`) já lê `matrixActivityPrimaryTeamId` (primeiro `team_ids` da atividade) e pré-preenche uma linha `TEAM` na alocação inicial da esteira ao trazer uma tarefa/atividade da matriz para a composição (`matrixTaskSubtreeToManualDraft`, mesmo arquivo, usado em `ConveyorCreateEditPage.tsx:418-434,452,468`). **Não há herança de responsável** (o conceito não existe hoje do lado backend da Matriz). Essa linha pré-preenchida é livremente editável pelo usuário antes de submeter — não é um vínculo travado.
2. **Importação de documento (pipeline R6)**: `NovaEsteiraPorDocumentoPage.tsx` (rota `ImportarOsPage`, `src/routes/AppRoutes.tsx:9,92`) → `draftToCreateConveyorInput.ts`, alimentado por `document-draft.schemas.ts:134-136` e `matchOperationalItems.ts:377-379,561-563`, que já trafegam `teamId`/`defaultResponsibleId` em estruturas de matching — lógica própria e paralela à do fluxo manual.

Um terceiro conversor, `mapNovaEsteiraSnapshotToCreateConveyorInput.ts`, **não é usado em nenhum ponto de produção** além do próprio teste (confirmado por busca textual em `src/`) e não monta `assignees` — não é caminho ativo hoje, mas ficaria inconsistente se algum dia for religado.

- Backend: `materializeConveyorOptions` (`conveyors.service.ts:479-587`) recebe `assignees[]` já prontos no payload `POST /conveyors` (`conveyors.schemas.ts:251-262`) e grava em `conveyor_node_assignees` (`:567-583`). `conveyor_nodes.default_responsible_id` é **sempre `null`** na criação (`:504,531,558`).
- `matrixRootItemId` é gravado apenas para auditoria/rastreio (`conveyors.schemas.ts:258-259`), não como vínculo funcional contínuo — condizente com a exigência de independência pós-criação.

### 3.6 Duplicação de Matriz / subárvore

- `POST /operation-matrix/items/:id/duplicate` e `POST /operation-matrix/nodes/:id/duplicate` (`operation-matrix.routes.ts:41,54`), implementados por `serviceDuplicateItemAsNewRoot`/`serviceDuplicateMatrixItem`/`serviceDuplicateSubtreeUnderSameParent`/`serviceDuplicate` em `operation-matrix.service.ts:464-650`.
- Em ambos os casos, para `ACTIVITY`: `default_responsible_id` é sempre nulado na cópia; `team_ids` **é** copiado; `metadata_json` (que carrega os `supportIds`) **é** copiado integralmente.
- Frontend: botão "Duplicar matriz" em `OperationMatrixListPage.tsx:190,197,400` (com log de auditoria `matrix_item_duplicate`).

### 3.7 Consumidores operacionais

- `my-work-queue-step-assignees.repository.ts:15-109` (`buildConveyorStepOwnershipIndex`) já implementa, do lado da **Esteira**, um `UNION`/dedupe entre colaborador atribuído diretamente e colaborador que é membro ativo de um time atribuído ao mesmo STEP — esse é o padrão de dedupe que a pista da análise preliminar mencionava; ele existe, mas só do lado Esteira.
- `production-plan-assignee.ts:33-83` (Modo Fábrica) cria um assignee "de apoio" sob demanda quando um colaborador logado via PIN está no plano semanal publicado mas ainda não tem alocação formal.
- **Efeito colateral verificado**: `conveyor-operational-plan.service.ts:243-274,328-355` já tem um fallback que, ao criar um item de plano sem `plannedCollaboratorId` explícito, usa `stepDefaults.defaultResponsibleId` — que vem de `conveyor_nodes.default_responsible_id`. Como essa coluna é sempre `null` hoje, esse fallback é código morto na prática atual, mas passaria a ser ativado se a implementação decidir gravar o responsável herdado nessa coluna legada em vez de usar exclusivamente `conveyor_node_assignees`.
- `my-activities`, `kiosk`, `dashboard`, `operational-planning`: nenhum consumidor lê `default_responsible_id` de Matriz ou Esteira diretamente; toda leitura de "quem está alocado" passa por `conveyor_node_assignees` (+ `team_members` quando aplicável).

### 3.8 Permissões

- `operation_matrix.view` / `operation_matrix.manage` protegem toda a gestão de estrutura de Matriz (não há permissão específica para "gerir responsável" separada).
- `teams.view` / `teams.manage_members` protegem `teams.routes.ts`, incluindo `GET .../members`.
- `conveyors.manage_assignments` protege alocação por STEP na Esteira.
- Nenhuma permissão nova parece necessária: os endpoints que passariam a aceitar `defaultResponsibleId` já são protegidos pela mesma permissão (`operation_matrix.manage`) que já protege `teamIds` hoje.

### 3.9 Testes existentes

- `server/src/tests/operation-matrix.test.ts` **não cobre** a rejeição 422 atual de `defaultResponsibleId` — não há teste de regressão que sinalize a remoção dessa regra.
- `teams.test.ts:97-113` cobre `GET /api/v1/teams/:id/members`.
- `conveyor-assignments.integration.test.ts`, `conveyor-assignments-http.integration.test.ts` cobrem alocação por STEP na Esteira.
- Frontend: `matrixToConveyorCreateInput.test.ts`, `novaEsteiraDraftFromMatrix.test.ts`, `criarMatrizManualDraft.test.ts`, `matrixActivityCollaboratorsMeta.test.ts`, `createManualMatrixStructure.test.ts` — nenhum cobre filtro de colaborador elegível por equipe, nem herança de responsável (porque o conceito não existe hoje no lado ativo do código).

---

## 4. Arquitetura e fluxo atual relevante

```
Matriz (matrix_nodes: ITEM → TASK → SECTOR → ACTIVITY)
  ACTIVITY.team_ids  (matrix_node_assignment_teams) ── único hoje, usado
  ACTIVITY.default_responsible_id ── coluna existe, sempre NULL (rejeitada no service)
  ACTIVITY.metadata_json.sgp.matrixActivityCollaborators.v1.supportIds ── "apoios" sem marcação de principal

        │  (conversão acontece no FRONTEND, não no backend)
        ▼
┌───────────────────────────┬─────────────────────────────────┐
│ Fluxo manual                │ Fluxo documento (R6)             │
│ novaEsteiraDraftFromMatrix   │ matchOperationalItems.ts         │
│ matrixToConveyorCreateInput  │ draftToCreateConveyorInput.ts    │
│ herda hoje: team_ids (só)    │ já trafega teamId/defaultResp.   │
└───────────────────────────┴─────────────────────────────────┘
        │
        ▼
POST /conveyors → materializeConveyorOptions (conveyors.service.ts)
  conveyor_nodes.default_responsible_id ── sempre NULL (legado morto)
  conveyor_node_assignees ── fonte de verdade real (COLLABORATOR + TEAM, is_primary)
        │
        ▼
Consumidores: my-work-queue (dedupe via UNION), production (fallback de plano),
conveyor-operational-plan (fallback dormente em default_responsible_id — RISCO)
```

---

## 5. Inventário de impactos por camada

| Camada | Impacto |
|---|---|
| Banco de dados | Nenhuma migration obrigatória para o caso básico (coluna já existe). Migration só se obrigatoriedade `NOT NULL` ou constraint de equipe única forem decididas. |
| Backend — `operation-matrix` | Remover as duas rejeições 422 e o zeramento forçado em patch/duplicação; adicionar validação nova "responsável ativo e membro da equipe informada". |
| Backend — `teams` | Nenhuma alteração funcional; reaproveitar `findCollaboratorEligibility`/`GET /teams/:teamId/members` como referência de padrão. |
| Backend — `conveyors` | Decisão de design: herdar via `conveyor_node_assignees` (recomendado) sem tocar `conveyor_nodes.default_responsible_id`. |
| Backend — `conveyor-operational-plan` | Deve ser revisado explicitamente para não reativar o fallback dormente sem decisão consciente. |
| Backend — `argos-integration` (R6) | `matchOperationalItems.ts`/`document-draft.schemas.ts` já trafegam campos relacionados; precisa de verificação de compatibilidade na fase de especificação. |
| Frontend — Matriz | Duas telas (`CriarMatrizEstruturaManual.tsx`, `OperationMatrixEditorPage.tsx`) + `operationMatrixPreviewPersist.ts` precisam de campo de responsável dependente de equipe. |
| Frontend — Nova Esteira (manual) | `novaEsteiraDraftFromMatrix.ts`/`matrixToConveyorCreateInput.ts` precisam herdar responsável junto com equipe. |
| Frontend — Nova Esteira (documento/R6) | `draftToCreateConveyorInput.ts` precisa de tratamento equivalente, separado do fluxo manual. |
| Permissões | Nenhuma nova permissão necessária. |
| Consumidores operacionais | Nenhuma alteração funcional esperada em `my-work-queue`, `kiosk`, `dashboard`, `production`, desde que a herança use `conveyor_node_assignees` e não a coluna legada. |
| Testes | Cobertura nova obrigatória nos módulos acima; nenhum teste de regressão existente cobre a regra atual que será removida. |
| Documentação | Este arquivo; `CLAUDE.md` (seção de features/backlog) precisaria de atualização futura na implementação. |

---

## 6. Tabela de arquivos afetados

| Arquivo | Alteração prevista |
|---|---|
| `server/src/modules/operation-matrix/operation-matrix.service.ts` | Remover rejeições 422 (criação e patch); remover zeramento forçado em `servicePatchNode`, `serviceDuplicateItemAsNewRoot`, `serviceDuplicateSubtreeUnderSameParent`; adicionar validação de pertencimento e ativo. |
| `server/src/modules/operation-matrix/operation-matrix.schemas.ts` | Ajustar regra de `superRefine` se for necessário exigir `teamIds` junto com `defaultResponsibleId`. |
| `server/src/modules/operation-matrix/operation-matrix.repository.ts` | Nova query de validação (responsável ativo + membro da equipe); decidir sobre `collaboratorExists` código morto. |
| `server/src/modules/conveyors/conveyors.service.ts` | Confirmar/registrar decisão de manter `conveyor_nodes.default_responsible_id` sempre `null` e herdar só via `conveyor_node_assignees`. |
| `server/src/modules/conveyor-operational-plan/conveyor-operational-plan.service.ts` | Revisão explícita do fallback em `stepDefaults.defaultResponsibleId` (linhas ~243-274, ~328-355). |
| `server/src/modules/argos-integration/pipeline/matchOperationalItems.ts`, `document-draft.schemas.ts` | Verificação de compatibilidade do campo `defaultResponsibleId`/`collaboratorId` já trafegado no matching R6. |
| `src/domain/operation-matrix/operation-matrix.types.ts` | Já expõe `default_responsible_id`; revisar tipagem/uso. |
| `src/features/operation-matrix/criar-matriz/CriarMatrizEstruturaManual.tsx` | Filtro de colaborador dependente da equipe selecionada; enviar `defaultResponsibleId` real ao invés de descartar o "Principal". |
| `src/features/operation-matrix/criar-matriz/createManualMatrixStructure.ts` | Incluir `defaultResponsibleId` no payload de criação. |
| `src/features/operation-matrix/criar-matriz/criarMatrizManualDraft.ts` | Corrigir/realinhar comentário e lógica de reconciliação com o comportamento real. |
| `src/features/operation-matrix/OperationMatrixEditorPage.tsx` | Novo campo de responsável dependente de equipe na edição de matriz persistida. |
| `src/features/operation-matrix/operationMatrixPreviewPersist.ts` | Incluir `defaultResponsibleId` no diff de patch. |
| `src/features/operation-matrix/matrixTreeAggregates.ts` | Decidir se agregados passam a considerar responsável (hoje ignora deliberadamente). |
| `src/features/esteiras/nova-esteira/novaEsteiraDraftFromMatrix.ts` | Herdar responsável junto com `matrixActivityPrimaryTeamId`. |
| `src/features/esteiras/nova-esteira/matrixToConveyorCreateInput.ts` | Herdar responsável no mapeamento de `assignees`. |
| `src/features/documentos/nova-esteira-documento/draftToCreateConveyorInput.ts` | Tratamento equivalente para o fluxo de importação de documento (R6). |
| `server/src/tests/operation-matrix.test.ts` (+ testes locais do módulo) | Novos casos: aceitar responsável válido, rejeitar responsável fora da equipe/inativo, comportamento na troca de equipe e na duplicação. |
| `server/src/tests/conveyor-operational-plan.*.test.ts` | Confirmar que o fallback dormente permanece inativo (ou cobrir novo comportamento, se decidido o contrário). |
| `src/features/esteiras/nova-esteira/novaEsteiraDraftFromMatrix.test.ts`, `matrixToConveyorCreateInput.test.ts` | Casos de herança de responsável. |
| `src/features/operation-matrix/criar-matriz/createManualMatrixStructure.test.ts`, `criarMatrizManualDraft.test.ts` | Atualizar para cobrir envio real de `defaultResponsibleId`. |
| `CLAUDE.md` | Atualização de inventário de features, se e quando a implementação for concluída (fora desta Etapa 1). |

---

## 7. Necessidade de migração e estratégia para dados legados

- **Não é necessária migration para o caso básico** — `matrix_nodes.default_responsible_id` já existe com índice desde a migration `0003`.
- Toda Atividade de Matriz hoje tem `default_responsible_id = NULL` (confirmado por leitura de todo caminho de escrita do backend, que sempre zera ou rejeita o campo). Isso é fortemente sustentado por evidência de código, mas não foi confirmado por consulta em banco real (fora do escopo desta análise — nenhuma query foi executada). Recomenda-se essa checagem (`SELECT count(*) FROM matrix_nodes WHERE node_type='ACTIVITY' AND default_responsible_id IS NOT NULL`) em HML/PRD antes de decidir sobre obrigatoriedade.
- Como não há dado de origem, **obrigatoriedade em nível de banco (`NOT NULL`) exigiria backfill sem fonte confiável** — rota de alto risco, não recomendada para a Etapa 1.
- Estratégia recomendada (a validar na especificação): obrigatoriedade **de aplicação**, não de banco — bloquear/exigir no formulário e na validação de service para escrita nova, permitindo que atividades legadas sem responsável continuem existindo até serem editadas (padrão já usado para "atividade sem equipe padrão" em `matrixTreeAggregates.ts`).

---

## 8. Regras e validações de backend necessárias

1. Remover as duas rejeições 422 atuais (criação e patch) para `defaultResponsibleId` em `ACTIVITY`.
2. Nova validação de service: se `defaultResponsibleId` informado, verificar que o colaborador está ativo (`deleted_at IS NULL`, `is_active`, `status='ACTIVE'` — reaproveitar o padrão de `teams.repository.findCollaboratorEligibility`) **e** que ele é membro ativo (`team_members.is_active = TRUE`) de **alguma** das `team_ids` submetidas junto na mesma requisição — a validação deve olhar o payload final da requisição, não o estado salvo anteriormente, para evitar janelas de inconsistência dentro do mesmo request.
3. Revalidação sempre no backend, nunca confiar apenas na lista carregada no frontend (mitiga condição de corrida — ver seção 9).
4. Ao alterar `teamIds` de uma atividade via `PATCH` sem informar `defaultResponsibleId` explicitamente, decidir e implementar de forma explícita: manter o comportamento atual de limpar automaticamente o responsável quando ele não pertence à nova equipe (coerente com a regra de negócio pedida), em vez do zeramento incondicional atual.
5. Decidir e documentar o comportamento de duplicação (hoje sempre zera `default_responsible_id`; a demanda não especifica se deve preservar).
6. Backend deve seguir sendo a autoridade final: qualquer filtro de UI é cosmético, a garantia é a validação de service.

---

## 9. Condição de corrida — composição da equipe entre consulta e gravação

A equipe pode perder o colaborador escolhido como responsável entre o carregamento do formulário (quando a lista de membros elegíveis é buscada via `GET /teams/:teamId/members`) e o submit do formulário. Mitigação: a validação de pertencimento e "ativo" descrita na seção 8 deve ser **sempre reexecutada no momento do `POST`/`PATCH`** contra o estado atual do banco, nunca aceitando apenas o que o frontend enviou como já validado. Isso é o mesmo padrão que `assertCollaboratorActiveForNewMembership` já aplica em `teams.service.ts` para adição de membro a uma equipe — não é um padrão novo a inventar, é reaproveitável.

---

## 10. Alterações de frontend e UX

- **Seleção dependente Equipe → Responsável**: ao selecionar/alterar a equipe de uma atividade, o campo de responsável deve (a) ficar desabilitado até uma equipe ser escolhida, (b) carregar a lista de membros elegíveis via `GET /teams/:teamId/members` (endpoint já existente, hoje não usado por Matriz), (c) limpar a seleção atual de responsável se ele não constar na nova lista quando a equipe é trocada.
- Isso precisa ser implementado em **duas telas**: assistente de criação (`CriarMatrizEstruturaManual.tsx`) e editor de matriz persistida (`OperationMatrixEditorPage.tsx`) — hoje só a primeira tem qualquer UI relacionada, e mesmo essa é funcionalmente quebrada (ver seção 3.4).
- Decisão de produto pendente: unificar o conceito de "responsável" com os "apoios" já existentes em `metadata_json.sgp.matrixActivityCollaborators.v1` (responsável = um apoio marcado como principal) ou manter os dois campos paralelos e independentes (ver seção 20).
- Tela de revisão do wizard (`CriarMatrizEtapaRevisao.tsx`) e visualização read-only de catálogo (`MatrixCatalogReadonlyDetails.tsx`) já leem `default_responsible_id` para exibição — passam a exibir dado real em vez de sempre vazio, sem necessidade de alteração estrutural, apenas validação de que o valor exibido bate com o persistido.

---

## 11. Fluxo de herança Matriz → Esteira

- Deve ser implementado **nos dois fluxos de produção ativos**:
  1. Manual: `novaEsteiraDraftFromMatrix.ts` (`matrixActivityToInitialAllocRows`) deve herdar `default_responsible_id` junto com `team_ids`, adicionando uma linha `COLLABORATOR isPrimary=true` além da linha `TEAM` já herdada hoje.
  2. Documento/R6: `draftToCreateConveyorInput.ts`, alimentado por `matchOperationalItems.ts`, precisa de tratamento equivalente — hoje já trafega campos relacionados (`teamId`/`defaultResponsibleId` nas estruturas de matching), mas seu comportamento exato quanto à origem desses valores precisa ser confirmado na fase de especificação (não aprofundado a nível de linha nesta análise, por proporcionalidade).
- **Decisão de design necessária**: o responsável herdado deve ser materializado em `conveyor_node_assignees` (`assignment_type='COLLABORATOR', is_primary=true`), **não** em `conveyor_nodes.default_responsible_id` — para não reativar o fallback dormente do Planejamento Semanal (ver seção 15) e para manter consistência com a arquitetura já documentada no banco ("fonte de verdade = `conveyor_node_assignees`").
- Em ambos os fluxos, a linha herdada deve continuar **editável pelo usuário antes do submit** (mesmo comportamento já existente para a herança parcial de equipe hoje).

---

## 12. Comprovação da independência Matriz × Esteira após a criação

- Já é o comportamento hoje para outros campos herdados (nome, `planned_minutes`, `required`, `source_key`): a Esteira grava seus próprios valores em `conveyor_nodes`/`conveyor_node_assignees` no momento do `POST /conveyors`; nenhuma referência funcional contínua é mantida — `matrixRootItemId` é gravado apenas para auditoria/rastreio, não como vínculo de sincronização.
- A mesma arquitetura se aplica naturalmente ao responsável: uma vez gravado em `conveyor_node_assignees` no momento da criação, alterações posteriores nesse registro (via `conveyors.manage_assignments`) não têm nenhum caminho de escrita de volta a `matrix_nodes` — não existe, hoje, nenhuma rotina que escreva da Esteira para a Matriz.
- Prova recomendada em teste automatizado: criar Esteira a partir de Matriz com responsável X; alterar o responsável na Esteira para Y; reconsultar a Atividade da Matriz de origem e confirmar que `default_responsible_id` continua X. Depois, alterar o responsável na Matriz para Z e criar uma segunda Esteira a partir da mesma Matriz; confirmar que a nova Esteira nasce com Z, e que a primeira Esteira permanece com Y.

---

## 13. Efeitos nos fluxos de criação, edição, preview e duplicação

| Fluxo | Efeito |
|---|---|
| Criação de Matriz (wizard manual) | Passa a enviar `defaultResponsibleId` real; UI precisa de filtro dependente. |
| Edição de Matriz persistida | Novo campo antes inexistente (`OperationMatrixEditorPage.tsx`). |
| Preview/reconciliação de import | `operationMatrixPreviewPersist.ts` precisa incluir o campo no diff calculado. |
| Duplicação de item/subárvore | Comportamento hoje é zerar; precisa de decisão explícita de produto (preservar ou zerar — não especificado na demanda). |
| Criação de Esteira (manual) | Herdar responsável junto com equipe, editável antes do submit. |
| Criação de Esteira (documento/R6) | Tratamento equivalente e independente do fluxo manual. |
| Edição de Esteira já criada | Sem mudança de comportamento — continua usando `conveyor_node_assignees` normalmente, sem qualquer escrita de volta à Matriz. |

---

## 14. Impactos nos consumidores operacionais

- **Fila operacional / Minha Fila / Minhas Atividades**: nenhum impacto funcional esperado, desde que a herança grave em `conveyor_node_assignees` — o dedupe já existente (`buildConveyorStepOwnershipIndex`) continua válido sem alteração.
- **Kiosk**: nenhum impacto direto identificado; consome os mesmos índices de ownership da Esteira.
- **Planejamento semanal**: **risco concreto**, ver seção 15 — precisa de decisão explícita para não reativar comportamento dormente.
- **Produção (Modo Fábrica)**: `production-plan-assignee.ts` já lida com assignee "de apoio" a partir do plano publicado; compatível sem alteração, desde que a fonte de verdade continue sendo `conveyor_node_assignees`.
- **Relatórios/Dashboard**: nenhum consumo direto de `default_responsible_id` identificado hoje; sem impacto imediato, mas pode ser uma oportunidade de produto futura (fora do escopo desta demanda).
- **Permissões**: sem necessidade de novo código de permissão.

---

## 15. Riscos, severidade e mitigação

| Risco | Severidade | Mitigação |
|---|---|---|
| Reversão de decisão de produto anterior (422 foi introduzido deliberadamente em `5af13dcc`, "Ajustes em Matriz", 14/05/2026, mesmo autor desta demanda) sem registro do motivo original no repositório | Alta | Confirmar com quem decidiu (ou revisitar histórico fora do código) por que o campo foi descontinuado antes de reverter, para não reintroduzir o problema que motivou a mudança |
| Fragmentação: herança precisa ser replicada em 2 fluxos de produção (manual e documento/R6); risco de esquecer um e gerar esteiras sem responsável herdado dependendo da origem | Alta | Especificação deve listar os dois fluxos como itens obrigatórios de implementação e teste, não só o fluxo manual |
| Duas telas de Matriz precisam de UI nova; a segunda (`OperationMatrixEditorPage.tsx`) não constava na pista original | Média | Confirmar escopo de UI incluindo explicitamente esta tela na especificação |
| Obrigatoriedade imediata quebra 100% das atividades de matriz existentes (nenhuma tem responsável hoje); sem dado de origem para backfill | Alta | Obrigatoriedade de aplicação (não de banco), sem `NOT NULL`; saneamento incremental via edição manual, sem bloqueio retroativo |
| Corrida entre validação "responsável pertence à equipe" no carregamento do formulário e a composição real no momento do submit | Média | Revalidação obrigatória no backend a cada `POST`/`PATCH`, nunca confiar só no frontend |
| Reativação acidental do fallback dormente do Planejamento Semanal (`conveyor-operational-plan.service.ts:352-355`) se o responsável herdado for gravado em `conveyor_nodes.default_responsible_id` em vez de `conveyor_node_assignees` | Alta | Especificação deve decidir explicitamente: herança grava só em `conveyor_node_assignees`, mantendo a coluna legada sempre `null` |
| Ausência de teste de regressão cobrindo a rejeição 422 atual — remoção da regra não tem nenhum teste existente que sinalize a mudança | Baixa/Média | Adicionar teste explícito do novo comportamento (aceitação + validação de pertencimento) antes de remover a regra antiga |
| `matrix_node_assignment_teams` sem `UNIQUE` de banco para "1 equipe por atividade" — a demanda assume equipe única; se essa suposição de aplicação falhar por bug futuro, "a equipe da atividade" fica ambígua | Baixa | Não introduzido por esta demanda; registrar como pré-condição implícita a documentar |
| Duplicidade: colaborador responsável direto também membro da equipe alocada no mesmo STEP da Esteira | Baixa | Já resolvido do lado Esteira hoje via `UNION`/dedupe em `my-work-queue-step-assignees.repository.ts` — nenhum trabalho novo necessário aqui, apenas confirmar que a herança usa o mesmo modelo `conveyor_node_assignees` |
| **Etapa 2 (fora do escopo desta análise)**: nada impede hoje excluir/inativar colaborador que seja responsável em Matriz ou Esteira aberta; introduzir "responsável obrigatório" torna esse buraco de integridade referencial mais visível operacionalmente | A avaliar na Etapa 2 | Citada apenas como dependência futura, não incorporada à estimativa ou ao plano desta Etapa 1 |

---

## 16. Plano de testes automatizados e manuais

### Automatizados

- Backend `operation-matrix`: criação/patch de `ACTIVITY` com responsável válido pertencente à equipe (sucesso); responsável fora da equipe (rejeição); responsável inativo/soft-deleted (rejeição); troca de `teamIds` limpando responsável incompatível.
- Backend: comportamento de duplicação de item/subárvore quanto ao responsável (a decidir se preserva ou zera, e testar o que for decidido).
- Backend `conveyor-operational-plan`: teste explícito confirmando que o fallback de `plannedCollaboratorId` a partir de `conveyor_nodes.default_responsible_id` **não** é acionado após a mudança (a menos que decidido o contrário).
- Frontend `novaEsteiraDraftFromMatrix.test.ts`: herança de responsável junto com equipe.
- Frontend `matrixToConveyorCreateInput.test.ts`: payload final com `assignees` incluindo `COLLABORATOR isPrimary=true` + `TEAM` para a mesma atividade.
- Frontend/documento: teste equivalente para `draftToCreateConveyorInput.ts` (fluxo R6).
- Frontend: filtro de colaborador elegível por equipe selecionada, em ambas as telas de Matriz.
- Frontend: limpeza de responsável ao trocar equipe (comportamento hoje só existe no backend).

### Manuais

- Criar atividade de matriz com equipe X; tentar selecionar responsável fora de X (deve bloquear/filtrar).
- Trocar a equipe de uma atividade existente com responsável já definido; confirmar limpeza e exigência de nova seleção.
- Materializar Esteira a partir de Matriz com equipe+responsável; confirmar herança e que editar o responsável na Esteira depois não altera a Matriz.
- Criar uma segunda Esteira a partir da mesma Matriz após alterar o responsável nela; confirmar que a nova Esteira reflete o valor atualizado.
- Repetir o fluxo de materialização pelo caminho de importação de documento (R6), não só pela composição manual.
- Validar em `OperationMatrixEditorPage.tsx` (edição de matriz persistida), não só no assistente de criação.
- Testar remoção do único membro elegível da equipe entre abertura do formulário e submit (corrida).
- Validar que Kiosk, Minha Fila e Modo Fábrica continuam funcionando sem regressão para esteiras criadas antes e depois da mudança.

### Testes de regressão para fluxos não diretamente alterados (recomendado pelo critério de qualidade da análise)

- Fluxo completo de criação de Esteira sem passar por Matriz (composição 100% manual), para garantir que a ausência de responsável de origem não quebra nada.
- Apontamento (`conveyor_time_entries`) por colaborador membro de equipe alocada, sem responsável direto — deve continuar funcionando via o trigger já existente.
- Pipeline R6 completo (parsing → matching → draft) para matrizes/documentos sem nenhum candidato com responsável, garantindo que o novo campo não é assumido como obrigatório onde não é aplicável.

---

## 17. Critérios de aceite sugeridos

1. `POST`/`PATCH` de `ACTIVITY` da Matriz aceita `defaultResponsibleId` quando o colaborador é ativo e membro de uma das `teamIds` submetidas na mesma requisição; rejeita com erro claro caso contrário.
2. Trocar `teamIds` de uma `ACTIVITY` sem informar novo `defaultResponsibleId` compatível limpa o responsável anterior quando ele não pertence à nova equipe.
3. `CriarMatrizEstruturaManual.tsx` e `OperationMatrixEditorPage.tsx` exigem equipe antes de habilitar o campo de responsável, e listam apenas membros elegíveis da equipe selecionada (via `GET /teams/:teamId/members`).
4. Materializar Esteira a partir de Matriz (fluxo manual e fluxo documento/R6) grava o responsável herdado em `conveyor_node_assignees` como `COLLABORATOR isPrimary=true`, junto com a equipe já herdada como `TEAM`.
5. Alterar o responsável de uma atividade em uma Esteira já criada não altera `matrix_nodes.default_responsible_id` da Matriz de origem, em nenhuma circunstância.
6. Criar uma nova Esteira a partir de uma Matriz cujo responsável foi alterado desde a última materialização usa o valor atual da Matriz, sem afetar esteiras já existentes.
7. Atividades de Matriz legadas sem responsável continuam funcionando normalmente em todos os fluxos (não há bloqueio retroativo).
8. `conveyor-operational-plan.service.ts` não muda de comportamento para esteiras cujo responsável foi herdado da Matriz, a menos que essa mudança seja explicitamente decidida e testada.
9. Duplicação de item/subárvore de Matriz segue o comportamento decidido na especificação (preservar ou zerar responsável), documentado e testado.

---

## 18. Plano de implementação em ordem segura (referência para a especificação — não implementado nesta entrega)

1. Resolver as decisões de produto pendentes da seção 20 (em especial: motivo da descontinuação original; unificação ou não com `supportIds`; confirmação de gravação exclusiva em `conveyor_node_assignees`).
2. Backend `operation-matrix`: nova validação de pertencimento/ativo; remoção das rejeições 422; ajuste de comportamento em patch e duplicação — com testes automatizados cobrindo cada regra antes de remover a regra antiga.
3. Backend `teams`: nenhuma alteração funcional, apenas confirmação de que `GET /teams/:teamId/members` atende ao caso de uso sem mudança de contrato.
4. Frontend Matriz: `CriarMatrizEstruturaManual.tsx` (corrigir envio real do campo) e `OperationMatrixEditorPage.tsx` (novo campo), com filtro dependente Equipe → Responsável.
5. Frontend Esteira: `novaEsteiraDraftFromMatrix.ts`/`matrixToConveyorCreateInput.ts` (fluxo manual) e `draftToCreateConveyorInput.ts` (fluxo documento/R6) — herança para `conveyor_node_assignees`.
6. Backend `conveyor-operational-plan`: confirmação/teste de que o fallback dormente permanece inativo (ou implementação consciente do novo comportamento, se decidido).
7. Testes de regressão nos consumidores operacionais (fila, kiosk, produção) e no pipeline R6.
8. Atualização de `CLAUDE.md` e documentação de produto relacionada, ao final da implementação.
9. Etapa 2 (bloqueio de exclusão/inativação de colaborador referenciado) permanece como item separado, fora desta sequência.

---

## 19. Estimativa de esforço detalhada por camada e total

Estimativa qualitativa (ordem de grandeza), dada a natureza exploratória desta análise — não há levantamento de pontos de história ou calendário do projeto disponível para calibrar dias exatos:

| Camada | Esforço estimado | Justificativa |
|---|---|---|
| Banco de dados | Nenhum a Muito baixo | Nenhuma migration obrigatória; eventual constraint de equipe única seria opcional |
| Backend `operation-matrix` (validação, remoção de rejeições, ajustes de patch/duplicação) | Médio | Lógica de validação nova + reavaliação de 4 pontos de código já mapeados; risco de detalhes na duplicação |
| Backend `conveyors`/`conveyor-operational-plan` | Baixo a Médio | Principalmente decisão de design + teste de não-regressão do fallback dormente |
| Backend `argos-integration` (R6) | Médio | Depende de confirmação ainda pendente sobre como `defaultResponsibleId` já trafega no matching |
| Frontend Matriz (2 telas) | Médio a Alto | Duas telas distintas, uma delas sem nenhuma UI equivalente hoje (`OperationMatrixEditorPage.tsx`); precisa de componente de seleção dependente reutilizável |
| Frontend Esteira (2 fluxos) | Médio a Alto | Dois conversores independentes a alterar e testar separadamente |
| Testes automatizados (todas as camadas) | Médio | Nenhum teste de regressão existente cobre a regra a ser removida; cobertura nova precisa ser construída do zero |
| Testes manuais/validação operacional | Baixo a Médio | Checklist já delineado na seção 16 |
| **Total estimado (Etapa 1)** | **Médio a Alto** | Concentrado em frontend (2 telas × 2 fluxos) e na necessidade de decisões de produto antes de iniciar; backend é o componente mais barato tecnicamente por já ter a base de dados pronta |

Recomenda-se que a especificação (próxima etapa, `sgp-feature-spec-writer`) refine esta estimativa em pontos/dias reais após as decisões da seção 20 estarem fechadas, pois parte do esforço de frontend depende diretamente de escolhas ainda não tomadas (unificação com `supportIds`, comportamento de duplicação).

---

## 20. Dependências, dúvidas ou decisões pendentes

1. **Por que a rejeição 422 foi introduzida** (commit `5af13dcc`, "Ajustes em Matriz", 14/05/2026)? Não há registro de motivo de negócio no repositório. Precisa de confirmação antes de reverter, para não reintroduzir o problema que motivou a descontinuação original.
2. O "responsável" desta demanda deve **reaproveitar o conceito de "apoios"** já persistido em `metadata_json.sgp.matrixActivityCollaborators.v1` (responsável = um apoio marcado como principal), ou são **dois campos paralelos e independentes**? Impacta diretamente o desenho de UI e de payload.
3. Herança para Esteira: confirmar a decisão de gravar **exclusivamente em `conveyor_node_assignees`**, mantendo `conveyor_nodes.default_responsible_id` sempre `null` — esta análise recomenda essa rota, mas é uma decisão de arquitetura a ser formalmente aprovada.
4. **Obrigatoriedade**: aceitar que o campo comece como obrigatório apenas para escrita nova (soft, sem `NOT NULL` de banco, sem bloqueio retroativo de atividades legadas), ou exigir algum mecanismo de saneamento/transição mais formal?
5. O pipeline R6 (`matchOperationalItems.ts`) precisa da mesma regra "responsável pertence à equipe" no momento do matching, ou ali o campo é apenas um valor de exibição herdado de rodada anterior? Não confirmado nesta análise a nível de linha — precisa de leitura dedicada na especificação.
6. **Duplicação de Matriz** (item raiz ou subárvore): o responsável deve ser preservado na cópia (como hoje ocorre com `teamIds`) ou zerado (como ocorre hoje com `default_responsible_id`)? A demanda não especifica.
7. Há necessidade de **auditoria** (quem alterou o responsável de uma atividade de matriz, quando) equivalente ao que já existe para ciclo de vida de Esteiras? Não solicitado explicitamente na demanda, mas coerente com o padrão de governança do projeto (backlog P0 já menciona auditoria admin como prioridade).
8. Confirmar em **HML/PRD** (fora do escopo desta análise, que não executou queries) que de fato nenhuma Atividade de Matriz tem hoje `default_responsible_id` preenchido, antes de fechar a estratégia de dados legados.
9. **Etapa 2** (bloqueio de exclusão/inativação de colaborador responsável): registrada aqui apenas como dependência futura e risco de integridade referencial; não deve ser incorporada à estimativa nem ao plano de implementação da Etapa 1, conforme instrução do solicitante.

---

## 21. Recomendação final

**SEGUIR COM AJUSTES.**

A base técnica é sólida: a coluna já existe no banco, o modelo `conveyor_node_assignees` já suporta o cenário-alvo (equipe + responsável coexistindo no mesmo STEP), e o padrão de validação "colaborador ativo e membro da equipe" já existe em outro módulo (`teams`) e pode ser reaproveitado quase diretamente. Não há bloqueio técnico que justifique `NÃO SEGUIR`.

No entanto, a demanda não deve ser tratada como uma mudança pontual em um único arquivo. Ela toca, no mínimo, duas telas de Matriz, dois conversores de produção Matriz → Esteira, e tem um efeito colateral concreto e verificado sobre o Planejamento Semanal que precisa de decisão explícita antes da implementação. Além disso, é uma **reversão de uma decisão de produto documentada em código**, cujo motivo original não está registrado no repositório.

Recomenda-se que a especificação (próxima etapa, `sgp-feature-spec-writer`) só seja aberta depois que as decisões pendentes da seção 20 — em particular os itens 1, 2 e 3 — estejam respondidas, para evitar retrabalho de UI e de arquitetura de dados durante a implementação.
