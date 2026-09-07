# Relatório — Edição Incremental da Estrutura da Esteira

```text
STATUS_FINAL: CONCLUÍDO COM RESSALVAS
BRANCH: claude/prompt-implementation-p1onl2
BASE_ORIGIN_MAIN: 6b768c852a18b7428e3dadf761bad7e35c1d61ef
COMMIT: 1a21704 (feature em d0c5ff4 + limpeza em 1a21704)
MIGRATION: NÃO NECESSÁRIA
```

> Nota de governança de branch: as instruções de sessão fixaram o desenvolvimento em
> `claude/prompt-implementation-p1onl2` (regra de branch da execução), não no nome
> sugerido pelo prompt anexo (`feature/edicao-incremental-estrutura-esteira`). No
> momento em que a branch foi criada, ela já apontava exatamente para
> `origin/main` (`6b768c8`, "fix: liberar inclusão de itens em qualquer status da
> esteira"), sem nenhum commit próprio anterior — portanto serve como base limpa
> equivalente à exigida pela seção 2 do prompt.

---

## 1. Diagnóstico anterior

`PATCH /api/v1/conveyors/:id/structure` executava um **replace destrutivo**:

1. `canReplaceConveyorStructure` (`conveyorOperationalStatus`/`conveyors.service.ts:135-140`) só permitia a operação com a esteira em `EM_ELABORACAO` ou `AGUARDANDO_PLANEJAMENTO`.
2. `findConveyorDeleteBlockingDeps` bloqueava a operação inteira (409) se existisse qualquer apontamento ou item de plano ativo em **qualquer nó** da esteira.
3. Dentro de uma transação, `deleteConveyorAssigneesAndNodes` fazia **hard `DELETE`** de todos os `conveyor_node_assignees` e `conveyor_nodes` (STEP → AREA → OPTION) da esteira.
4. `materializeConveyorOptions` recriava a árvore inteira do zero, gerando **um `id` novo (`randomUUID()`) para cada nó**, mesmo para nós logicamente "iguais" ao que existia antes.

Consequência: qualquer edição de estrutura — mesmo trocar o nome de um STEP — trocava o `id` de toda a árvore, quebrando (ou exigindo bloqueio prévio de) referências de planejamento semanal, apontamentos, eventos operacionais e alocações.

## 2. Arquitetura implementada

Novo fluxo de **diff incremental**, acionado pelo mesmo endpoint (`PATCH /conveyors/:id/structure`), organizado em 3 arquivos novos que seguem o padrão do projeto (comparação → validação → persistência):

- `server/src/modules/conveyors/conveyor-structure-diff.ts` — tipos (`StructureDiff`, `StructureDiffInsert/Update/Removal`) e funções **puras**, sem I/O: `assertStructureDiffOwnershipAndHierarchy` (valida que todo `id` recebido pertence à esteira e que a hierarquia OPTION→AREA→STEP é coerente, antes de qualquer escrita) e `buildStructureDiff` (compara payload recebido × árvore ativa carregada e classifica cada nó em INSERT/UPDATE/REORDER/REMOVE).
- `server/src/modules/conveyors/conveyor-structure-diff.service.ts` — orquestração: abre transação com `SELECT ... FOR UPDATE` na esteira, trata `Idempotency-Key` (replay-noop), carrega a árvore ativa, chama a validação/diff puro, aplica as operações, recalcula totais a partir do estado final e emite o evento de auditoria.
- `server/src/modules/conveyors/conveyor-structure-diff.repository.ts` — acesso a dados novo: update em lote de campos cadastrais, soft-delete em lote (com cascata) e recálculo de totais. Reaproveita, sem duplicar, `insertConveyorNode`, `newNodeId`, `insertConveyorNodeAssignee` e `softDeleteConveyorNodeAssignee` já existentes.

O schema Zod do PATCH (`conveyors.schemas.ts`) ganhou variantes próprias (`patchConveyorStructure{Option,Area,Step}Schema`) com `id?: uuid()` opcional — presente = nó existente a comparar, ausente = nó novo. Os schemas usados por `POST /conveyors` (criação) e `POST /structure/items` (inclusão tardia) **não foram tocados**.

## 3. Preservação de IDs

- **UPDATE**: nó existente é identificado pelo `id` recebido; só os campos cadastrais efetivamente diferentes (`name`, `planned_minutes`, `order_index`, `required`) são escritos, via `UPDATE ... WHERE id = $1` — o `id` nunca é regenerado.
- **INSERT**: nó sem `id` no payload gera um `id` novo via `newNodeId()` (já existente), exatamente como hoje.
- **REORDER**: tratado como um caso particular de UPDATE (só `order_index` muda) — nenhuma linha é apagada/recriada; confirmado em teste por contagem de linhas e `id`s antes/depois.
- **Segurança cross-conveyor**: todo `id` recebido é validado contra o conjunto de nós ativos da própria esteira (carregado sob o lock) antes de qualquer escrita; um `id` de outra esteira, ou uma hierarquia inconsistente (ex.: STEP como pai de AREA), resulta em 4xx com rollback total, sem tocar em nenhuma esteira.

## 4. Regras de remoção

Decisão adotada (documentada e validada na análise de impacto antes de implementar): **REMOVE é sempre soft-delete via `conveyor_nodes.deleted_at = now()`, nunca hard-delete — independentemente de o nó ter ou não histórico.**

Justificativa: a coluna `deleted_at` já existe em `conveyor_nodes` desde a migração original, já tem índices parciais dedicados (`WHERE deleted_at IS NULL`) e já é o campo que praticamente toda leitura do sistema filtra (`my-activities`, `operational-planning`, `conveyor-operational-plan`, `dashboard`, `conveyorAssignments`, `conveyor-progress`, o próprio carregador de estrutura). Em contraste, `is_active` — que a spec original do prompt sugeria investigar primeiro — é usado em todo o resto do schema (`collaborators`, `teams`, `sectors`, `roles`, `system_settings`) como toggle de ativação de catálogo, não como marcador de remoção, e é consumido por `conveyorActivitySequence.logic.ts` para outro propósito (linearização de sequência operacional). Sobrecarregá-lo teria efeitos colaterais não intencionais na fila de produção/kiosk. Por isso **`is_active` não foi usado para "removido"**.

Como soft-delete nunca colide com as FKs `ON DELETE RESTRICT` existentes (`conveyor_node_assignees`, `conveyor_time_entries`, `operational_work_plan_items.activity_node_id`, `conveyor_operational_plan_items.activity_node_id`), o mesmo tratamento se aplica uniformemente a todos os casos:

- **Sem histórico/dependência**: soft-delete (mesmo comportamento, por simplicidade e uniformidade — evita lógica condicional "tem histórico? hard ou soft" que seria uma fonte adicional de bugs).
- **Com planejamento**: soft-delete; o item de plano continua existindo e apontando para o mesmo `conveyor_node_id` (a FK nunca é violada porque a linha continua fisicamente presente).
- **Com apontamento**: soft-delete; `conveyor_time_entries` preservado, mesmo `conveyor_node_id`.
- **COMPLETED**: soft-delete permitido; `operational_status`/`operational_completed_at/by` preservados como estavam.
- **ABORTED**: soft-delete permitido; `aborted_at/by/abort_reason_*` preservados.

Remover uma OPTION ou AREA soft-deleta, na mesma transação, toda a subárvore de descendentes ativos.

## 5. Planejamento

Como o nó soft-deletado continua fisicamente presente em `conveyor_nodes` (só com `deleted_at` preenchido), qualquer `operational_work_plan_items`/`conveyor_operational_plan_items` que referencie aquele `activity_node_id` continua íntegro — a FK nunca é violada e o registro de planejamento **não é apagado, cancelado nem reescrito como efeito colateral** da edição de estrutura. Testado explicitamente (`conveyors-structure-diff.integration.test.ts` e reescrita do teste equivalente em `conveyors-patch-structure.integration.test.ts`, que antes esperava bloqueio 409 e agora confirma sucesso com soft-delete).

## 6. Apontamentos

Mesma lógica: `conveyor_time_entries.conveyor_node_id` nunca precisa mudar porque o nó nunca é apagado fisicamente. Testado explicitamente: remover um STEP com time entry ativa é bem-sucedido (sem erro `23503`), e a entry permanece com o mesmo `conveyor_node_id`.

## 7. Inclusão tardia

`conveyor-structure-append.service.ts`, `LateStructureAppendDrawer.tsx` e `lateAddToWeeklyBacklog` **não foram alterados** (confirmado por `git diff` vazio nesses arquivos e nos testes correspondentes, todos passando sem modificação). O novo endpoint de diff e o de inclusão tardia coexistem sem compartilhar lógica de negócio — só reaproveitam utilidades de baixo nível já existentes no repositório (`insertConveyorNode`, `newNodeId`). Teste dedicado confirma que um item incluído tardiamente em esteira `EM_ANDAMENTO` continua elegível ao backlog de planejamento após um PATCH de diff subsequente.

## 8. Frontend

- Removidos: `structureEditLocked`, `canReplaceConveyorStructure` (frontend) e o banner `STRUCTURE_TAB_BLOCKED_UX_MESSAGE` — a aba Estrutura de `ConveyorCreateEditPage.tsx` fica editável em qualquer status operacional, sem alterar RBAC (`conveyors.create` continua sendo exigida do mesmo jeito).
- Novo builder `buildConveyorStructureEditInput.ts`, exclusivo do fluxo de edição, que usa um campo `id` **novo e distinto de `key`** — achado crítico de design: `ManualOptionDraft/AreaDraft/StepDraft.key` é sempre um UUID, inclusive para nós criados nesta sessão de edição (`newKey() = crypto.randomUUID()`), então não seria seguro usar `key` para decidir INSERT vs. UPDATE. O campo `id` só é preenchido quando o nó vem do baseline carregado do servidor.
- `buildManualConveyorInput` (usado por `POST /conveyors`, criação) **não foi alterado** — o payload de criação continua idêntico, sem `id` em nenhum nível.
- `patchConveyorStructure` (`conveyorsApiService.ts`) passou a enviar `Idempotency-Key`.

## 9. Backend — serviços/repositories criados ou alterados

**Criados**: `conveyor-structure-diff.ts`, `conveyor-structure-diff.service.ts`, `conveyor-structure-diff.repository.ts`.

**Alterados**: `conveyors.patch.controller.ts` (lê `Idempotency-Key`, chama o novo serviço), `conveyors.schemas.ts` (variantes de schema com `id?` para o PATCH), `conveyors.service.ts` (remoção de `serviceReplaceConveyorStructure`/`canReplaceConveyorStructure` e helpers órfãos), `operational-events/conveyor-operational-events.types.ts` (novo tipo de evento `CONVEYOR_STRUCTURE_UPDATED`).

**Limpeza de follow-up** (após a revisão independente apontar código morto remanescente): remoção de `ErrorCodes.CONVEYOR_STRUCTURE_REPLACE_HAS_DEPENDENCIES`, `CONVEYOR_STRUCTURE_REPLACE_STATUS_MESSAGE`/`_HAS_DEPENDENCIES_MESSAGE` e das funções `countActiveTimeEntriesByConveyor`/`deleteConveyorAssigneesAndNodes` em `conveyors.repository.ts`, todas sem chamador restante após a remoção do replace destrutivo (confirmado por grep full-repo antes da remoção).

## 10. Migration

**NÃO NECESSÁRIA.** `conveyor_nodes.deleted_at` e `conveyor_nodes.metadata_json` já existiam desde a migração original (`0005`) e já eram filtrados/indexados corretamente pela maior parte do sistema. Nenhuma coluna nova foi criada.

## 11. Testes

Executados pelo implementador e reexecutados de forma independente pelo `sgp-test-reviewer` (do zero, banco Postgres local `sgp_test`, sem apontar para HML/PRD):

- **Frontend (vitest)**: 192 arquivos, **1264 testes**, todos passando.
- **Backend (vitest)**: 141 arquivos passando, **1127 testes passando**, 5 arquivos com skips (guard de ambiente pré-existente, arquivo sem diff), **2 falhas pré-existentes** (não relacionadas a esta feature):
  - `operational-planning.weekly-view.http.test.ts` — divergência de formato de fórmula XLSX.
  - `production-auth.integration.test.ts` — divergência de collation `pt-BR` do ambiente local.
  - Ambas reproduzidas de forma idêntica em `origin/main` (commit `6b768c8`, via `git worktree`, sem o diff desta feature) pelo implementador **e** de forma independente pelo revisor — confirmadas como pré-existentes, não regressão.

Novos testes cobrindo os 18 critérios de aceite de backend: `server/src/tests/conveyors-structure-diff.integration.test.ts` (edição em cada um dos 7 status, UPDATE preserva id, INSERT gera id novo, REORDER sem recriação, REMOVE soft-delete simples e em cascata, REMOVE com apontamento/plano vinculado sem bloqueio, COMPLETED/ABORTED preservados, totais batendo com COUNT/SUM real, segurança cross-conveyor, hierarquia inválida, replay idempotente, backlog eligibility pós-PATCH) e `server/src/tests/conveyor-structure-diff.rollback.unit.test.ts` (prova de rollback total via falha forçada no meio da aplicação). Reescrita pontual de um teste em `conveyors-patch-structure.integration.test.ts` que antes esperava bloqueio 409 por dependência de plano e agora confirma sucesso com soft-delete (mudança de comportamento intencional da feature).

Novos testes de frontend: `buildConveyorStructureEditInput.test.ts` (UPDATE carrega `id`, INSERT não carrega, remoção omite do payload) e ajuste de `conveyorEditSavePolicy.test.ts` para a política sem gate de status.

## 12. Build/typecheck

- `tsc -b` (frontend): **exit 0**, sem output.
- `tsc -p tsconfig.json` (backend): **exit 0**, sem output.
- `npm run build` (frontend) e `npm run build` (backend): **exit 0** em ambos.
- `npm run lint` (raiz): **exit 1**, 93 errors / 23 warnings — confirmado **pré-existente** (mesma contagem e conteúdo ao rodar contra `origin/main` sem o diff, via `git worktree`, tanto pelo implementador quanto pelo revisor independente). Nenhum arquivo tocado por esta feature aparece na lista de erros do lint.

## 13. Arquivos alterados

**Criados**
- `server/src/modules/conveyors/conveyor-structure-diff.ts`
- `server/src/modules/conveyors/conveyor-structure-diff.service.ts`
- `server/src/modules/conveyors/conveyor-structure-diff.repository.ts`
- `server/src/tests/conveyors-structure-diff.integration.test.ts`
- `server/src/tests/conveyor-structure-diff.rollback.unit.test.ts`
- `src/features/esteiras/nova-esteira/buildConveyorStructureEditInput.ts`
- `src/features/esteiras/nova-esteira/buildConveyorStructureEditInput.test.ts`

**Alterados**
- `server/src/modules/conveyors/conveyors.patch.controller.ts`
- `server/src/modules/conveyors/conveyors.schemas.ts`
- `server/src/modules/conveyors/conveyors.service.ts`
- `server/src/modules/conveyors/conveyors.repository.ts` (feature + limpeza de follow-up)
- `server/src/modules/conveyors/conveyorOperationalStatus.ts` (limpeza de follow-up)
- `server/src/shared/errors/errorCodes.ts` (limpeza de follow-up)
- `server/src/modules/conveyors/operational-events/conveyor-operational-events.types.ts`
- `server/src/tests/conveyors-patch-structure.integration.test.ts`
- `src/domain/conveyors/conveyor.types.ts`
- `src/features/esteiras/ConveyorCreateEditPage.tsx`
- `src/features/esteiras/conveyorEditSavePolicy.ts` (+ `.test.ts`)
- `src/features/esteiras/conveyorEditStructureSnapshot.ts`
- `src/features/esteiras/nova-esteira/NovaEsteiraComposicaoManual.tsx`
- `src/features/esteiras/nova-esteira/matrixToConveyorCreateInput.ts`
- `src/services/conveyors/conveyorsApiService.ts`

## 14. Riscos residuais

1. **Permissão reaproveitada**: `PATCH /conveyors/:id/structure` continua exigindo `conveyors.create` — a mesma permissão de criação/inclusão tardia — mesmo passando a permitir edição estrutural com a esteira `EM_ANDAMENTO`. O nome da permissão não comunica esse alcance. Decisão de criar uma permissão dedicada ficou fora de escopo desta entrega (registrada como dívida de governança de acesso).
2. **Rollback provado com pool mockado, não com falha real de banco**: todas as violações possíveis (order_index duplicado, assignee inválido, hierarquia inconsistente) já são barradas por validação Zod/negócio *antes* de qualquer escrita, então não há caminho legal para forçar uma falha real de constraint do Postgres no meio da transação. O teste de rollback usa um repositório mockado para simular a falha e prova a sequência `BEGIN → ... → ROLLBACK` sem `COMMIT` — é uma prova válida da lógica de controle, mas não uma prova end-to-end contra um banco real sofrendo erro de constraint.
3. **`Idempotency-Key` com corpo diferente na mesma key**: não há teste dedicado desse caso especificamente no novo endpoint de diff (existe só para o endpoint de inclusão tardia, que compartilha a mesma função de validação de fingerprint). Risco considerado baixo, mas não coberto por teste direto.
4. **Ausência de teste para `Idempotency-Key` ausente no PATCH de diff** (400) — cobertura equivalente existe hoje só no endpoint de append.
5. **Guard `hasPlannedQuantityColumn`** faz 4 testes de `conveyors-create-planned-quantity.integration.test.ts` (arquivo sem diff desta feature) serem pulados neste ambiente de teste, mesmo a coluna existindo fisicamente no banco `sgp_test` — quirk de ambiente pré-existente, não introduzido por esta feature, mas reduz a cobertura de regressão observada nesta rodada. Vale investigar separadamente.
6. **Tickets térmicos**: um UPDATE que preserva o `id` de um STEP pode deixar o conteúdo de um ticket já impresso (nome/tempo previsto) desatualizado. É uma melhoria em relação ao modelo anterior (que invalidava o `id` inteiro a cada edição), mas não há reimpressão/invalidação automática — risco operacional de processo, não de software, a comunicar à operação.
7. **Referência textual remanescente no frontend**: `src/lib/errors/sgpErrorContract.test.ts` ainda usa o literal `'CONVEYOR_STRUCTURE_REPLACE_HAS_DEPENDENCIES'` como valor de exemplo em um teste de contrato de erro genérico do cliente HTTP — não é uma importação do símbolo removido do backend (o teste continua passando), mas é um código de erro que o backend não emite mais; não foi removido por estar fora do escopo definido para a limpeza de follow-up.

## 15. Validação manual sugerida

### Caso A — AGUARDANDO_PLANEJAMENTO
1. Abrir `/app/esteiras/:id/alterar` de uma esteira em `AGUARDANDO_PLANEJAMENTO`.
2. Trocar o nome de uma atividade existente.
3. Alterar o tempo previsto.
4. Reordenar duas atividades.
5. Salvar.
6. Reabrir a tela e confirmar que as alterações persistiram e os `id`s das atividades não mudaram (comparar com o payload de rede antes/depois, se possível).

### Caso B — EM_ANDAMENTO com planejamento
1. Selecionar uma atividade já presente no planejamento semanal publicado.
2. Alterar nome/tempo previsto.
3. Salvar.
4. Confirmar que o item de planejamento continua existindo e apontando para a mesma atividade (mesmo `conveyor_node_id`, visível pelo comportamento da tela de planejamento, que não deve "perder" o item).

### Caso C — Atividade com apontamento
1. Alterar uma atividade que já tem apontamento(s) registrado(s) por um colaborador.
2. Salvar.
3. Confirmar que o apontamento permanece visível/íntegro (Jornada do Colaborador / Minhas Atividades).

### Caso D — Nova atividade
1. Adicionar uma atividade nova à estrutura.
2. Salvar.
3. Confirmar que ela aparece no Backlog do Planejamento conforme as regras já existentes.

### Caso E — FINALIZADA
1. Abrir uma esteira `FINALIZADA`.
2. Editar um campo estrutural permitido (ex.: nome de uma atividade).
3. Salvar.
4. Confirmar que o status da esteira continua `FINALIZADA` e que atividades `COMPLETED` continuam com `operational_status`/`completed_at`/`completed_by` preservados.

### Caso F — Remoção com histórico
1. Remover da estrutura uma atividade que já tem apontamento ou planejamento vinculado.
2. Confirmar que ela desaparece da estrutura ativa (tela de Estrutura, contagens/totais).
3. Confirmar que o histórico (apontamento, planejamento, Evolução de Esteiras) continua consultável e íntegro.
4. Confirmar ausência de qualquer erro de FK/500 no fluxo.

### Caso G (adicional, recomendado pela revisão independente) — Kiosk/Produção sob concorrência
1. Com um colaborador logado no `/app/kiosk` ou `/app/producao` com uma atividade em aberto, o gestor edita a estrutura da mesma esteira (ex.: remove ou reordena outra atividade) em paralelo.
2. Confirmar que o apontamento em andamento não é interrompido/corrompido e que o lock da transação evita estado inconsistente.
