# Análise de Impacto — Responsável na Atividade da Matriz

## 0. Metadados da análise

| Campo | Valor |
|---|---|
| Data da análise (v1) | 2026-08-08 |
| Data desta revisão (v2) | 2026-08-08 |
| Commit da `main` analisado (v1 e v2 — inalterado) | `34679fd90b5270dc3e8f56c4f9b6f32bedf8815b` (10/07/2026) |
| Branch de análise | `docs/analise-responsavel-atividade-matriz` |
| Escopo desta entrega | Somente análise de impacto (Etapa 1), revisão v2. Nenhum código, migration, teste funcional ou configuração foi alterado. |
| Autor | Claude Code, seguindo o fluxo `sgp-context-reader` → `sgp-impact-analyst` deste repositório |

### 0.1 Histórico de revisões

| Versão | Motivo | Principais mudanças |
|---|---|---|
| v1 | Entrega inicial (PR #12) | Primeira análise completa, 21 seções. |
| v2 | Correção solicitada após revisão do time | (1) Reenquadramento da mudança como adição, não reversão; (2) reconfirmação do fluxo R6 com achado de gap real de código; (3) inclusão do fluxo de catálogo e varredura completa de caminhos de duplicação/clonagem; (4) estratégia de validação do PATCH revisada para estado final efetivo, atomicidade e mensagens de erro. |

---

## 1. Resumo executivo

A infraestrutura de dados para "responsável por atividade" **já existe e nunca foi removida do schema** — `matrix_nodes.default_responsible_id` está presente desde a migration original, mas hoje é **ativamente rejeitado** pelo backend (HTTP 422) em todo caminho de escrita de uma Atividade da Matriz.

**Correção em relação à v1:** esta mudança não é uma reversão da decisão de usar Equipe. A Equipe continua vinculada à Atividade da Matriz como está hoje; o Colaborador responsável é um campo **adicional e opcional**, cuja finalidade é evitar que o usuário precise reselecionar manualmente a mesma pessoa toda vez que uma nova Esteira é criada a partir da Matriz. A decisão histórica de descontinuar o campo (commit `5af13dcc`, "Ajustes em Matriz", 14/05/2026) permanece sem motivo registrado no repositório e deve ser tratada como contexto relevante — não como um veto à reintrodução do dado com um propósito diferente (valor inicial, não obrigatório).

Nesta revisão, três achados novos e factuais alteram partes do inventário original:

1. **Fluxo R6 (importação de documento): implementação real é parcial, não completa.** O backend do pipeline já lê e transporta `default_responsible_id` (e o `teamId` da equipe) corretamente em toda a cadeia de matching. O conversor de frontend (`draftToCreateConveyorInput.ts`) **já materializa** essa herança em `assignees` — mas **somente** quando o match reaproveita uma subárvore inteira (TASK/SECTOR). No caso mais comum, o match direto de uma Atividade isolada, o mesmo dado já disponível no plano de matching **é descartado silenciosamente** antes de chegar ao `POST /conveyors` — e isso já afeta também a herança de equipe hoje (não é um problema novo desta demanda, mas fica exposto por ela). Este ponto exige **implementação nova** no caminho de match direto, e **teste de regressão** no caminho de subárvore, que já funciona.
2. **Fluxo de catálogo confirmado com dois problemas concretos**: (a) `CriarMatrizCatalogOpcaoDraftEditor.tsx` zera `default_responsible_id` incondicionalmente sempre que o `<select>` de equipe é tocado, mesmo sem mudança real de equipe; (b) `cloneMatrixTaskSubtree.ts` nunca envia `defaultResponsibleId` ao clonar uma subárvore de catálogo via API, então o dado é sempre perdido nesse caminho, independentemente da regra de negócio do backend.
3. **A duplicação de Matriz/atividade/subárvore hoje zera o responsável deliberadamente** (tanto no backend quanto nos três caminhos de clonagem de frontend mapeados) — a decisão consolidada desta revisão é que isso deve **passar a preservar** equipe e responsável, o que é uma mudança de comportamento a implementar, não apenas confirmar.
4. **O PATCH e o POST de nó hoje não são atômicos**: a atualização dos campos do nó roda fora de transação; a atualização dos vínculos de equipe roda depois, em uma transação separada. Isso precisa ser corrigido como parte da implementação da nova validação, para evitar estado parcial gravado (nó atualizado, vínculo de equipe/responsável não).

Como decisão consolidada desta revisão, **o responsável é opcional** (não obrigatório, sem `NOT NULL`, sem backfill) — isso elimina o risco de v1 sobre invalidar 100% das atividades existentes, mas não elimina a necessidade de validação correta quando o campo é informado.

**Recomendação desta revisão: LIBERAR COM RESSALVAS** — condicionada às decisões e correções listadas na seção 20.

---

## 2. Entendimento da regra de negócio (Etapa 1 — consolidada nesta revisão)

1. Cada Atividade da Matriz continua associada à sua Equipe.
2. A atividade poderá ter também um Colaborador responsável.
3. Quando informado, o responsável deve ser um colaborador **ativo** e **membro ativo** da equipe associada à atividade.
4. Ao criar uma Esteira a partir da Matriz, cada atividade herda: a Equipe configurada na Atividade da Matriz; e o Colaborador responsável configurado na Atividade da Matriz.
5. Equipe e responsável são copiados **somente como valores iniciais** da nova Esteira.
6. Qualquer alteração posterior de equipe ou responsável na Esteira **não** atualiza a Matriz de origem.
7. Atividades antigas sem responsável continuam válidas.
8. O responsável é **opcional** nesta etapa; não há preenchimento retroativo automático.

**Fora de escopo desta análise (Etapa 2)**: impedir exclusão/inativação de colaborador que seja responsável em Matriz ou em Esteira aberta. Citada apenas como dependência futura/risco de integridade referencial (seção 15), sem entrar na estimativa da Etapa 1.

---

## 3. Comportamento atual confirmado por leitura de código

### 3.1 Banco de dados

| Tabela / coluna | Situação | Evidência |
|---|---|---|
| `matrix_nodes.default_responsible_id` | Já existe, UUID, FK `collaborators`, `ON DELETE SET NULL`, com índice. Nasceu na migration original, nunca foi removida. Nulável — compatível com "opcional" da regra consolidada sem qualquer alteração de schema. | `server/migrations/0003_matrix_nodes.sql:18,51` |
| `matrix_node_assignment_teams` | Tabela de vínculo N:N atividade ↔ equipe, soft delete. Índice único é `(matrix_node_id, team_id) WHERE deleted_at IS NULL` — impede duplicar o mesmo `team_id` ativo no mesmo nó, mas **não impede** múltiplas equipes distintas ativas simultaneamente no schema. | `server/migrations/0021_matrix_node_assignment_teams.sql:10-12` |
| `teams` / `team_members` | Equipe ↔ colaborador via tabela de vínculo, com `is_active`, `is_primary`. | `server/migrations/0016_teams_and_permissions.sql` |
| `conveyor_node_assignees` | Fonte de verdade de alocação por STEP na Esteira; suporta `COLLABORATOR` + `TEAM` coexistindo, com `is_primary` exclusivo de `COLLABORATOR`. | `server/migrations/0006_conveyor_assignees_and_time_entries.sql`; `0023_conveyor_assignees_team_support.sql:26-53` |
| `conveyor_nodes.default_responsible_id` | Coluna legada, sempre `null` hoje; decisão consolidada é mantê-la assim (ver seção 8). | `server/migrations/0005_conveyors_and_nodes.sql:82` |

**Conclusão de banco (reconfirmada):** nenhuma migration é necessária para o caso básico. O campo já é nulável no schema, condizente com "responsável opcional".

**Correção sobre o modelo de equipe (item 4 da solicitação de ajuste):** o código **impõe hoje, na camada de aplicação, no máximo 1 equipe ativa por atividade** — não é uma coincidência de uso, é uma regra imposta em **dois pontos redundantes**:
- `operation-matrix.service.ts` — `normalizeActivityTeamIdsForSave(...)`: `return normalizeUniqueIds(ids).slice(0, 1)` corta a lista para 1 elemento antes mesmo de chegar ao repository.
- `operation-matrix.repository.ts:302-330` (`replaceNodeTeamLinks`), comentário explícito: *"No máximo 1 equipe padrão por atividade (1ª id válida na ordem recebida)"* — o loop faz `break` após a primeira id válida.

Não há `CHECK`/`UNIQUE` de banco que imponha esse limite — é uma regra só de aplicação (dupla, mas só de aplicação). O contrato Zod (`teamIds: z.array(z.string().uuid()).optional()`) não tem `.max(1)`, e não foi encontrado nenhum teste, comentário ou consumidor que dependa de múltiplas equipes simultâneas — todo o código (service, repository, frontend) trata o valor implicitamente como singular (`teamIds[0]`, `matrixActivityPrimaryTeamId`).

**Implicação para a regra "responsável pertence à equipe da atividade":** como hoje só existe 1 equipe ativa por atividade na prática (imposta em aplicação), a validação "responsável é membro ativo da equipe" pode ser implementada de forma direta contra essa única `team_id`, sem ambiguidade. **Decisão de produto a registrar explicitamente** (não presumir silenciosamente): se o modelo de "1 equipe" permanece uma garantia de aplicação apenas, ou se deve virar uma garantia de schema (`UNIQUE` ativo por `matrix_node_id`) antes ou junto desta implementação — esta análise não decide isso por conta própria, apenas expõe que a garantia atual não é de banco.

### 3.2 Backend — `operation-matrix` (rejeição ativa do campo, reconfirmado sem mudanças em relação à v1)

- Contrato Zod já aceita `defaultResponsibleId` em `ACTIVITY` (`operation-matrix.schemas.ts:33,98`).
- Service rejeita com 422/VALIDATION_ERROR em criação (`operation-matrix.service.ts:253-262`) e patch (`:329-334,352-358`), com a mensagem *"Colaborador padrão não é mais usado em Atividades da Matriz. Use teamIds (equipe padrão)."*
- `servicePatchNode` (`:386-401`) zera `default_responsible_id` sempre que `teamIds` muda.
- **Novo achado (item 3 da solicitação — duplicação):** o zeramento na duplicação é ainda mais amplo do que descrito na v1. Tanto `serviceDuplicateItemAsNewRoot` (`:511-512`) quanto `serviceDuplicateSubtreeUnderSameParent` (`:617-618`) zeram `default_responsible_id` para `ACTIVITY` **incondicionalmente**, mesmo copiando `team_ids` e `metadata_json` integralmente. Isso é uma escolha deliberada e consistente de código (mesma lógica nos dois métodos), não um esquecimento pontual — mas contraria a decisão consolidada desta revisão de que duplicação deve **preservar** equipe e responsável (ver seção 13).

### 3.3 Frontend — Matriz (telas de criação e edição, reconfirmado)

- `CriarMatrizEstruturaManual.tsx` e `OperationMatrixEditorPage.tsx` seguem como na v1: sem filtro dependente equipe→responsável; a segunda sem nenhum campo de responsável.

### 3.4 Novo — Fluxo de catálogo (item 3 da solicitação de ajuste)

**`src/features/operation-matrix/criar-matriz/CriarMatrizCatalogOpcaoDraftEditor.tsx`** — tela de criação/reutilização de opção a partir do catálogo de tarefas:
- `activityToEtapa` (`:51-63`) nunca lê `node.default_responsible_id` — não há UI para o campo nesta tela.
- `applyEtapaToActivity` (`:65-82`), acionado pelo `onChange` do `<select>` de "Equipe padrão" (`:507-537`), grava `default_responsible_id: null` **incondicionalmente a cada edição de equipe**, mesmo quando a equipe selecionada não muda de fato (ex.: reabrir e confirmar o mesmo valor). `team_ids` e `metadata_json.supportIds` são preservados/reescritos pela mesma função.
- **Comportamento a corrigir**: o zeramento deveria ocorrer apenas quando a equipe realmente muda e o responsável anterior deixa de pertencer a ela — hoje é incondicional, um efeito colateral não intencional do fluxo atual (coerente com o fato de o campo nunca ser exibido/editável nesta tela).

**`src/features/operation-matrix/criar-matriz/cloneCatalogTaskSubtreeForDraft.ts`** (`cloneTaskSubtreeWithNewIds`, `:16-49`) — clonagem client-side (sem chamada de API) que alimenta o rascunho editável da tela acima. O `rebuild` (`:31-46`) copia o nó por spread (`{ ...node, id: newId, ... }`), então `default_responsible_id`, `team_ids` e `metadata_json` são preservados **implicitamente**, sem tratamento explícito por nome de campo.

**`src/features/operation-matrix/criar-matriz/cloneMatrixTaskSubtree.ts`** (`cloneTaskSubtreeUnderItem`, `:54-70`) — mecanismo diferente e confirmado como existente (a busca inicial por nome exato de arquivo teve falso-negativo; localizado por conteúdo): percorre a subárvore em DFS e faz `POST /operation-matrix/nodes` nó a nó via `createMatrixNode`. O payload de cada `ACTIVITY` (`buildCreatePayload`, `:29-37`) inclui `teamIds` (só o primeiro) e `metadataJson`, mas **nunca inclui a chave `defaultResponsibleId`** — o campo simplesmente não é enviado, então o resultado é sempre `null` no backend (sem gerar 422, porque o campo nem chega no payload). Chamado a partir de `OperationMatrixNewPage.tsx:396` (assistente de nova matriz) e `OperationMatrixEditorPage.tsx:1021` ("adicionar tarefa a partir do catálogo" em matriz já persistida) — dois pontos de produção ativos.

**Conclusão do fluxo de catálogo:** hoje o responsável é perdido de forma consistente em todo o caminho de catálogo → matriz persistida (via `cloneMatrixTaskSubtree.ts`), e é preservado de forma acidental/implícita apenas no rascunho client-side que ainda não foi submetido (via `cloneCatalogTaskSubtreeForDraft.ts`). Ambos precisam de tratamento explícito na implementação.

### 3.5 Varredura completa de duplicação/clonagem (item 3 da solicitação de ajuste)

Nenhum caminho ativo adicional foi encontrado além dos já citados. Lista consolidada e definitiva:

| # | Caminho | Tipo | Trata `default_responsible_id` hoje? |
|---|---|---|---|
| 1 | `operation-matrix.service.ts` → `serviceDuplicateItemAsNewRoot` (backend, `POST /items/:id/duplicate`) | Duplicar Matriz inteira | Zera sempre para `ACTIVITY` |
| 2 | `operation-matrix.service.ts` → `serviceDuplicateSubtreeUnderSameParent` (backend, `POST /nodes/:id/duplicate`) | Duplicar subárvore/atividade sob o mesmo pai | Zera sempre para `ACTIVITY` |
| 3 | `cloneCatalogTaskSubtreeForDraft.ts` → `cloneTaskSubtreeWithNewIds` (frontend, client-only) | Clonar subárvore de catálogo dentro do rascunho de opção | Preserva implicitamente (spread) |
| 4 | `cloneMatrixTaskSubtree.ts` → `cloneTaskSubtreeUnderItem` (frontend, via POSTs sequenciais) | Clonar subárvore de catálogo para matriz nova/persistida | Sempre perde (campo nunca enviado) |

Pontos de chamada de UI confirmados para os itens 1–2 (via `duplicateMatrixItem`/`duplicateMatrixNode` do `operationMatrixApiService.ts`): botão "Duplicar matriz" em `OperationMatrixListPage.tsx:190,197,400`; duplicar setor/atividade/tarefa em `OperationMatrixEditorPage.tsx:786,856,954`. Componentes de apresentação (`TaskCard.tsx`, `TaskCompositionPanel.tsx`, `ActivityRowCompact.tsx`, `NovaMatrizEstruturaDraftPanel.tsx`) recebem o handler por prop e não chamam a API diretamente.

### 3.6 Fluxo R6 — reconfirmação factual detalhada (item 2 da solicitação de ajuste)

**Resultado da reconfirmação: parcialmente válido.** O backend está pronto; o frontend só completa a cadeia em um dos dois caminhos de match possíveis.

**Backend — confirmado, já lê e transporta o dado:**
- `matchOperationalItems.ts` lê `default_responsible_id` em 4 queries SQL (`:642,696,740,800`, ex.: `act.default_responsible_id::text AS "collaboratorId"` com `JOIN collaborators` para o nome), propaga para `MatrixMatchCandidate.collaboratorId` (`:279`) e, em candidatos de subárvore, para `MatrixSubtreeBuiltActivity.defaultResponsibleId` (`:561-562`).
- No plano de matching final, `reusedStructure.collaboratorId`/`collaboratorName` é preenchido a partir do candidato vencedor **para qualquer tipo de nó** (`:1893-1894`) — mas candidatos sintéticos agregados de TASK/SECTOR têm `collaboratorId: null` hardcoded na origem (`:1366,1397`), então só um match direto em `ACTIVITY` carrega um valor real de colaborador ali.
- `document-draft.schemas.ts` transporta o campo no contrato: `defaultResponsibleId` na subárvore (`:134`) e `collaboratorId` em `reusedStructure` (`:194`).

**Frontend (`draftToCreateConveyorInput.ts`) — a cadeia se completa só na expansão de subárvore:**
- `applyReviewDecisionsToDraftV11` grava `__reviewPrimaryCollaboratorId: act.defaultResponsibleId ?? null` **apenas** nos ramos de expansão de subárvore (`shouldExpandSubtree` verdadeiro — match em TASK/SECTOR que materializa várias atividades de uma vez): ramo TASK (`:592-594`) e ramo SECTOR (`:622-624`). Este caminho **já funciona** ponta a ponta.
- Nos dois ramos de **match direto em uma Atividade isolada** — `dec === 'SELECT_ALTERNATIVE'` (`:635-657`) e `dec === 'ACCEPT_SUGGESTED'` (`:658-676`), que é o caso mais frequente de uso do R6 (item de serviço da OS → atividade específica da Matriz) — o código **nunca lê** `m.reusedStructure.collaboratorId` nem `m.reusedStructure.teamId`, apesar de o dado já estar disponível no plano de matching. `withReviewStepMeta` desses ramos não grava `__reviewPrimaryCollaboratorId`/`__reviewPrimaryTeamId`/`__reviewTeamAssignments`.
- `readReviewStepMeta` (`:229-263`) usa `null`/`undefined` como default quando esses campos estão ausentes → `buildAssigneesFromStepMeta`/`buildValidStepAssigneesFromMatrixActivity` (`:85-128,265-272`) retornam array vazio → o mapeamento final cai no fallback de `assignees` originais do draft (vazio para itens recém-extraídos da OS) → **a esteira nasce sem equipe nem responsável herdados nesse caminho**, mesmo já existindo o dado no backend.

**Classificação correta (correção ao enquadramento pedido na solicitação):**
- Caminho de expansão de subárvore (TASK/SECTOR): **teste de regressão** — já implementado, precisa apenas de cobertura de teste específica para não quebrar com a mudança de backend.
- Caminho de match direto em Atividade isolada (`SELECT_ALTERNATIVE`/`ACCEPT_SUGGESTED`): **alteração necessária** — gap de código pré-existente, independente desta demanda (afeta hoje inclusive a herança de **equipe**, não só de responsável), que precisa ser corrigido para que a herança funcione no caso mais comum de uso do R6. Isso aumenta o escopo de trabalho do fluxo R6 em relação ao estimado na v1, que tratava o ponto inteiro como "só verificação de compatibilidade".

### 3.7 PATCH — estado final efetivo e atomicidade (item 4 da solicitação de ajuste)

**Estado final efetivo, hoje inexistente porque o 422 interrompe antes:**
- Como todo PATCH com `defaultResponsibleId` definido é rejeitado antes de qualquer gravação, a pergunta "o código considera `team_ids` já persistidos ao validar só o responsável" é hoje inaplicável na prática — o fluxo nunca chega lá.
- Tecnicamente, `existing` (carregado via `findNodeRowById`, que já inclui `team_ids` preenchido) **já está disponível em memória** dentro de `servicePatchNode` no ponto em que a validação seria executada — ou seja, calcular o "estado final efetivo" (`body.teamIds` se enviado, senão `existing.team_ids` já persistido) não exige nenhuma query adicional, é reaproveitamento direto do dado já carregado.
- **Requisito para a implementação (não presumir o oposto):** o endpoint não deve exigir reenvio de `teamIds` quando o usuário altera só `defaultResponsibleId` — a validação deve montar o conjunto de equipes vigente como `body.teamIds !== undefined ? body.teamIds : existing.team_ids`, e validar o responsável contra esse conjunto final.

**Atomicidade — confirmado como NÃO atômica hoje, e isso precisa ser corrigido como parte da implementação, não é um detalhe menor:**
- Em `servicePatchNode`, `updateNode(pool, id, patch)` roda **fora de transação**, direto no `pool` (`:402`). Só depois, se `teamIds` foi enviado, abre-se uma transação separada (`pool.connect(); BEGIN; replaceNodeTeamLinks; COMMIT`, `:405-415`). Se essa segunda transação falhar, a atualização dos campos do nó **permanece gravada** — não há rollback conjunto.
- Mesmo padrão em `serviceCreateNode`: `insertNode` roda fora de transação (`:268-287`); o vínculo de equipe é criado depois, em transação própria (`:291-301`). Se falhar, o nó `ACTIVITY` já foi criado sem equipe.
- Em contraste, os fluxos de **duplicação** (`serviceDuplicateItemAsNewRoot`, `serviceDuplicateSubtreeUnderSameParent`) já são atômicos de fato — todo o laço de inserção roda dentro de um único `BEGIN...COMMIT`.
- Não existe helper de transação compartilhado em `server/src/shared/` — cada função do módulo gerencia `BEGIN`/`COMMIT`/`ROLLBACK` manualmente.
- **Requisito para a implementação:** ao adicionar a validação/gravação de `defaultResponsibleId`, a atualização do nó, dos vínculos de equipe e a validação do responsável devem passar a ocorrer **dentro de uma única transação** (mesmo padrão já usado nos fluxos de duplicação), evitando o estado hoje possível de "nó atualizado, equipe/responsável não".

**Código HTTP e mensagem — padrão já estabelecido no módulo, a reaproveitar:**
- Violação de regra de negócio → `AppError(<mensagem>, 422, ErrorCodes.VALIDATION_ERROR)` — mesmo padrão usado hoje para a rejeição atual do campo e para "times inexistentes" (`'Um ou mais times vinculados não foram encontrados.'`).
- Entidade principal não encontrada → 404/NOT_FOUND (usado só para o próprio recurso, não para dados referenciados inválidos).
- **Recomendação de mensagem**, consistente com o padrão observado: 422/VALIDATION_ERROR com texto como *"O colaborador responsável deve ser um colaborador ativo e membro ativo da equipe informada."*, tanto em criação quanto em patch.

**Risco de concorrência (reafirmado da v1, agora ligado à atomicidade):** a composição da equipe pode mudar entre o carregamento do formulário e o submit. Mitigação: revalidar sempre no backend, dentro da mesma transação da escrita (nunca aceitar apenas o que o frontend enviou como pré-validado) — o mesmo padrão de `assertCollaboratorActiveForNewMembership`/`findCollaboratorEligibility` já usado em `teams.service.ts`.

### 3.8 Consumidores operacionais, permissões, testes existentes

Sem mudanças em relação à v1 — reconfirmado, nenhum novo achado nesta revisão:
- `my-work-queue-step-assignees.repository.ts` já faz dedupe colaborador-direto vs. membro-de-equipe do lado da Esteira.
- Fallback dormente em `conveyor-operational-plan.service.ts:328-355` (`stepDefaults.defaultResponsibleId`) continua condicionado a `conveyor_nodes.default_responsible_id` nunca ser preenchido — decisão consolidada de manter essa coluna sempre `null` neutraliza esse risco (ver seção 8).
- `operation_matrix.manage`/`teams.view`/`conveyors.manage_assignments` seguem suficientes; nenhuma permissão nova necessária.
- Nenhum teste de regressão existente cobre a rejeição 422 atual.

---

## 4. Arquitetura e fluxo atual relevante

```
Matriz (matrix_nodes: ITEM → TASK → SECTOR → ACTIVITY)
  ACTIVITY.team_ids            ── 1 equipe (imposto em aplicação, 2x redundante), usado
  ACTIVITY.default_responsible_id ── existe no schema, sempre NULL (rejeitado no service)
  ACTIVITY.metadata_json.supportIds ── "apoios" sem marcação de principal

        │ (conversão acontece no FRONTEND — 2 fluxos independentes)
        ▼
┌────────────────────────────┬──────────────────────────────────────┐
│ Fluxo manual                  │ Fluxo documento (R6)                   │
│ novaEsteiraDraftFromMatrix     │ matchOperationalItems.ts (backend, OK)  │
│ matrixToConveyorCreateInput    │ draftToCreateConveyorInput.ts (frontend)│
│ herda hoje: team_ids (só)      │  ├─ expansão de subárvore: OK (team+resp)│
│                                │  └─ match direto de ACTIVITY: NÃO herda │
│                                │      (nem team, nem responsável) — GAP  │
└────────────────────────────┴──────────────────────────────────────┘
        │
        ▼
POST /conveyors → materializeConveyorOptions (conveyors.service.ts)
  conveyor_nodes.default_responsible_id ── mantém-se sempre NULL (decisão consolidada)
  conveyor_node_assignees ── fonte de verdade (COLLABORATOR isPrimary=true + TEAM)
        │
        ▼
Consumidores: my-work-queue (dedupe via UNION, sem mudança),
production (sem mudança), conveyor-operational-plan (fallback permanece inativo)
```

Fluxo de catálogo (paralelo à criação/edição de Matriz):
```
Catálogo de tarefas
  │
  ├─ cloneCatalogTaskSubtreeForDraft.ts (client-side) ── preserva implicitamente
  │     └─ CriarMatrizCatalogOpcaoDraftEditor.tsx ── zera ao tocar seletor de equipe (bug a corrigir)
  │
  └─ cloneMatrixTaskSubtree.ts (via POST sequencial ao backend) ── sempre perde o campo (nunca envia)
```

---

## 5. Inventário de impactos por camada

| Camada | Impacto |
|---|---|
| Banco de dados | Nenhuma migration obrigatória. Campo já nulável, compatível com "opcional". |
| Backend — `operation-matrix` | Remover as duas rejeições 422; nova validação "responsável ativo + membro da equipe final efetiva"; corrigir zeramento incondicional em patch/duplicação para preservar quando aplicável; **tornar create/patch atômicos** (mudança adicional necessária, não só validação nova). |
| Backend — `teams` | Nenhuma alteração funcional; reaproveitar padrão de "colaborador ativo". |
| Backend — `conveyors` | Confirmar/manter `conveyor_nodes.default_responsible_id` sempre `null`; herança via `conveyor_node_assignees`. |
| Backend — `conveyor-operational-plan` | Nenhuma alteração necessária, dado que a coluna legada permanece `null`; teste de regressão recomendado mesmo assim. |
| Backend — `argos-integration` (R6) | **Alteração necessária** (não só verificação) no ramo de match direto de `draftToCreateConveyorInput.ts`, para ler `reusedStructure.collaboratorId`/`teamId` como já é feito no ramo de subárvore. Teste de regressão no ramo de subárvore, que já funciona. |
| Frontend — Matriz (2 telas) | Campo de responsável dependente de equipe em `CriarMatrizEstruturaManual.tsx` e `OperationMatrixEditorPage.tsx`. |
| Frontend — Catálogo | Corrigir zeramento incondicional em `CriarMatrizCatalogOpcaoDraftEditor.tsx`; incluir `defaultResponsibleId` no payload de `cloneMatrixTaskSubtree.ts`. |
| Frontend — Duplicação | Nenhuma alteração de frontend adicional além dos pontos de catálogo — os botões de duplicar já chamam a API existente; a mudança de comportamento (preservar responsável) é inteiramente do lado backend para os caminhos 1 e 2 da tabela da seção 3.5. |
| Frontend — Nova Esteira (manual e documento) | Herdar responsável junto com equipe nos dois conversores; no caso do documento, depende da correção do backend/frontend do R6 descrita acima. |
| Permissões | Nenhuma nova permissão necessária. |
| Consumidores operacionais | Sem alteração funcional esperada. |
| Testes | Cobertura nova nos módulos acima; ver matriz de testes na seção 16. |
| Documentação | Este arquivo; `CLAUDE.md` a atualizar ao final da implementação (fora desta Etapa 1). |

---

## 6. Tabela de arquivos afetados

| Arquivo | Alteração prevista |
|---|---|
| `server/src/modules/operation-matrix/operation-matrix.service.ts` | Remover rejeições 422; nova validação de pertencimento/ativo considerando estado final efetivo; preservar responsável em duplicação (não mais zerar incondicionalmente); tornar create/patch atômicos (envolver update do nó + vínculos de equipe + validação de responsável em uma única transação). |
| `server/src/modules/operation-matrix/operation-matrix.schemas.ts` | Revisar `superRefine` se necessário para o novo comportamento (não deve exigir `teamIds` quando só `defaultResponsibleId` é enviado). |
| `server/src/modules/operation-matrix/operation-matrix.repository.ts` | Nova query de validação (responsável ativo + membro da equipe final efetiva). |
| `server/src/modules/conveyors/conveyors.service.ts` | Confirmar manutenção de `conveyor_nodes.default_responsible_id` sempre `null`. |
| `server/src/modules/argos-integration/pipeline/matchOperationalItems.ts` | Nenhuma alteração necessária — já lê e transporta o dado corretamente. |
| `src/features/documentos/nova-esteira-documento/draftToCreateConveyorInput.ts` | **Alteração necessária**: nos ramos `SELECT_ALTERNATIVE`/`ACCEPT_SUGGESTED`, ler `m.reusedStructure.collaboratorId`/`teamId` e gravar `__reviewPrimaryCollaboratorId`/`__reviewPrimaryTeamId`, como já ocorre nos ramos de expansão de subárvore. |
| `src/domain/operation-matrix/operation-matrix.types.ts` | Já expõe `default_responsible_id`; revisar tipagem/uso. |
| `src/features/operation-matrix/criar-matriz/CriarMatrizEstruturaManual.tsx` | Filtro de colaborador dependente da equipe; enviar `defaultResponsibleId` real. |
| `src/features/operation-matrix/criar-matriz/createManualMatrixStructure.ts` | Incluir `defaultResponsibleId` no payload de criação. |
| `src/features/operation-matrix/OperationMatrixEditorPage.tsx` | Novo campo de responsável dependente de equipe na edição de matriz persistida. |
| `src/features/operation-matrix/operationMatrixPreviewPersist.ts` | Incluir `defaultResponsibleId` no diff de patch. |
| `src/features/operation-matrix/criar-matriz/CriarMatrizCatalogOpcaoDraftEditor.tsx` | Corrigir `applyEtapaToActivity` para zerar o responsável apenas quando a equipe muda de fato e o responsável deixa de pertencer a ela — não a cada edição de equipe. |
| `src/features/operation-matrix/criar-matriz/cloneMatrixTaskSubtree.ts` | Incluir `defaultResponsibleId` em `buildCreatePayload`, hoje ausente. |
| `src/features/esteiras/nova-esteira/novaEsteiraDraftFromMatrix.ts` | Herdar responsável junto com `matrixActivityPrimaryTeamId`. |
| `src/features/esteiras/nova-esteira/matrixToConveyorCreateInput.ts` | Herdar responsável no mapeamento de `assignees`. |
| `server/src/tests/operation-matrix.test.ts` (+ testes locais do módulo) | Ver matriz de testes (seção 16). |
| `server/src/tests/conveyor-operational-plan.*.test.ts` | Confirmar que o fallback dormente permanece inativo. |
| `src/features/esteiras/nova-esteira/novaEsteiraDraftFromMatrix.test.ts`, `matrixToConveyorCreateInput.test.ts` | Casos de herança de responsável. |
| `src/features/documentos/nova-esteira-documento/draftToCreateConveyorInput.test.ts` (localizar/criar) | Teste de regressão do ramo de subárvore + teste novo do ramo de match direto. |
| `src/features/operation-matrix/criar-matriz/createManualMatrixStructure.test.ts`, `criarMatrizManualDraft.test.ts`, `CriarMatrizCatalogOpcaoDraftEditor.test.ts` (se existir) | Atualizar/criar para cobrir envio real de `defaultResponsibleId` e correção do zeramento condicional. |
| `CLAUDE.md` | Atualização de inventário de features, ao final da implementação. |

---

## 7. Necessidade de migração e estratégia para dados legados

- **Não é necessária migration.** A coluna já existe, com índice, e já é nulável — compatível diretamente com "responsável opcional" da regra consolidada.
- Decisão consolidada: **sem `NOT NULL`, sem backfill, sem preenchimento retroativo automático.** Atividades antigas sem responsável continuam válidas indefinidamente.
- A integridade "responsável pertence à equipe" será garantida **somente na aplicação** (validação de service, revalidada a cada escrita), consistente com o fato de que o próprio limite de "1 equipe por atividade" já é hoje garantido apenas em aplicação, não em schema.

---

## 8. Regras e validações de backend necessárias

1. Remover as duas rejeições 422 atuais para `defaultResponsibleId` em `ACTIVITY`.
2. Nova validação: se `defaultResponsibleId` informado (em criação ou patch), verificar que o colaborador está ativo (reaproveitando o padrão de `teams.repository.findCollaboratorEligibility`) **e** que é membro ativo do **estado final efetivo de equipe da atividade** — `body.teamIds` se enviado no mesmo request, senão os `team_ids` já persistidos (`existing.team_ids`, já disponível em memória em `servicePatchNode` sem query adicional).
3. **Não exigir reenvio de `teamIds`** quando o usuário altera apenas `defaultResponsibleId` — é um requisito explícito da regra consolidada, não uma opção.
4. Quando `teamIds` é alterado e o responsável atual deixa de ser membro da nova equipe, limpar automaticamente o responsável (comportamento já existente hoje de forma incondicional; deve passar a ser condicional — só limpa se de fato deixou de pertencer).
5. **Tornar a operação atômica**: update do nó + `replaceNodeTeamLinks` + validação/gravação do responsável devem ocorrer dentro de uma única transação (`BEGIN...COMMIT`), tanto em `serviceCreateNode` quanto em `servicePatchNode` — hoje nenhum dos dois é atômico (ver seção 3.7); os fluxos de duplicação já são atômicos e servem de referência de padrão.
6. **Preservar equipe e responsável na duplicação** (item/subárvore) — mudança de comportamento em relação ao zeramento incondicional atual. Recomendação desta análise (decisão de produto a confirmar): revalidar o responsável copiado no momento da duplicação, já que a composição da equipe pode ter mudado desde a última gravação da atividade original; se inválido, zerar silenciosamente em vez de bloquear a duplicação.
7. Código HTTP e mensagem: manter o padrão do módulo — 422/VALIDATION_ERROR com mensagem de negócio clara (ex.: *"O colaborador responsável deve ser um colaborador ativo e membro ativo da equipe informada."*).
8. Backend continua como autoridade final: qualquer filtro de UI é cosmético.

---

## 9. Condição de corrida — composição da equipe entre consulta e gravação

Mitigação inalterada em relação à v1, agora explicitamente ligada ao requisito de atomicidade da seção 8: a validação de pertencimento e "ativo" deve ser **sempre reexecutada dentro da mesma transação do `POST`/`PATCH`**, contra o estado atual do banco, nunca aceitando apenas o que o frontend enviou como já validado.

---

## 10. Alterações de frontend e UX

- Seleção dependente Equipe → Responsável nas duas telas de Matriz (`CriarMatrizEstruturaManual.tsx`, `OperationMatrixEditorPage.tsx`), usando `GET /teams/:teamId/members`.
- **Novo, incorporado nesta revisão:** corrigir `CriarMatrizCatalogOpcaoDraftEditor.tsx` para não zerar o responsável a cada edição de equipe quando a equipe não muda de fato.
- Decisão consolidada: manter o modelo atual de "apoios" — responsável em `default_responsible_id`, demais colaboradores em `metadata_json.supportIds` — sem unificação dos dois conceitos nesta etapa.
- Estados de carregamento, ausência de membros elegíveis (equipe sem colaborador ativo) e mensagens de validação devem ser tratados explicitamente nas telas listadas.

---

## 11. Fluxo de herança Matriz → Esteira

- **Fluxo manual**: `novaEsteiraDraftFromMatrix.ts` deve herdar `default_responsible_id` junto com `team_ids`.
- **Fluxo documento (R6)**: depende da correção descrita na seção 3.6 — sem ela, a herança não funciona no caso de match direto de Atividade isolada (o mais comum), mesmo já existindo o dado no backend.
- Decisão consolidada: herança materializada **exclusivamente** em `conveyor_node_assignees` (`COLLABORATOR isPrimary=true` para o responsável, `TEAM` para a equipe), mantendo `conveyor_nodes.default_responsible_id` sempre `null`, salvo evidência técnica contrária — nenhuma evidência contrária foi encontrada nesta revisão.
- Em ambos os fluxos, a linha herdada permanece editável pelo usuário antes do submit.

---

## 12. Comprovação da independência Matriz × Esteira após a criação

Inalterado em relação à v1 — nenhum caminho de escrita da Esteira para a Matriz foi encontrado em nenhuma revisão. Prova recomendada em teste automatizado: criar Esteira a partir de Matriz com responsável X; alterar o responsável na Esteira para Y; reconsultar a Atividade da Matriz de origem e confirmar que `default_responsible_id` continua X; alterar o responsável na Matriz para Z e criar uma segunda Esteira, confirmando que a nova nasce com Z e a primeira permanece com Y.

---

## 13. Efeitos nos fluxos de criação, edição, preview, catálogo e duplicação

| Fluxo | Efeito (revisado) |
|---|---|
| Criação de Matriz (wizard manual) | Enviar `defaultResponsibleId` real; UI com filtro dependente. |
| Edição de Matriz persistida | Novo campo antes inexistente. |
| Preview/reconciliação de import | Incluir campo no diff calculado. |
| **Catálogo — criação/reutilização de opção** | Corrigir zeramento incondicional em `CriarMatrizCatalogOpcaoDraftEditor.tsx`. |
| **Catálogo — clonagem client-side** | Já preserva implicitamente; confirmar que isso é intencional e coberto por teste. |
| **Catálogo — clonagem via API (`cloneMatrixTaskSubtree.ts`)** | Incluir `defaultResponsibleId` no payload, hoje ausente. |
| Duplicação de item/subárvore (backend) | Mudar de "zera incondicionalmente" para "preserva, com revalidação". |
| Criação de Esteira (manual) | Herdar responsável junto com equipe. |
| Criação de Esteira (documento/R6) | Herdar apenas após correção do ramo de match direto em `draftToCreateConveyorInput.ts`. |
| Edição de Esteira já criada | Sem mudança — `conveyor_node_assignees` normalmente, sem escrita de volta à Matriz. |

---

## 14. Impactos nos consumidores operacionais

Inalterado em relação à v1: sem impacto funcional esperado em fila operacional, kiosk, produção ou dashboard, desde que a herança grave exclusivamente em `conveyor_node_assignees` (decisão consolidada da seção 11). O fallback dormente do Planejamento Semanal permanece inativo sob essa decisão.

---

## 15. Riscos, severidade e mitigação

| Risco | Severidade | Mitigação |
|---|---|---|
| Fluxo R6 — ramo de match direto de Atividade isolada não herda equipe nem responsável hoje, mesmo com o dado disponível no backend (gap pré-existente, exposto por esta demanda) | Alta | Corrigir `draftToCreateConveyorInput.ts` para ler `reusedStructure.collaboratorId`/`teamId` nos ramos `SELECT_ALTERNATIVE`/`ACCEPT_SUGGESTED`, com teste de regressão cobrindo os dois ramos (subárvore e direto) |
| `serviceCreateNode`/`servicePatchNode` não são atômicos hoje — risco de estado parcial (nó atualizado, equipe/responsável não) ao introduzir a nova validação | Média/Alta | Envolver update do nó + vínculos de equipe + validação de responsável em transação única, seguindo o padrão já usado nos fluxos de duplicação |
| Duplicação de matriz/atividade/subárvore precisa passar a preservar responsável, mas a composição da equipe pode ter mudado desde a gravação original | Média | Revalidar o responsável copiado no momento da duplicação; zerar silenciosamente se inválido, sem bloquear a operação |
| `cloneMatrixTaskSubtree.ts` nunca envia `defaultResponsibleId` — perda silenciosa e consistente no caminho catálogo → matriz persistida | Média | Incluir o campo no payload de `buildCreatePayload`, com a mesma validação de pertencimento aplicada no create direto |
| `CriarMatrizCatalogOpcaoDraftEditor.tsx` zera o responsável a cada edição de equipe, mesmo sem mudança real | Baixa/Média | Corrigir a condição para só zerar quando a equipe efetivamente muda e o responsável deixa de pertencer a ela |
| Corrida entre validação "responsável pertence à equipe" no carregamento do formulário e a composição real no momento do submit | Média | Revalidação obrigatória no backend, dentro da mesma transação da escrita |
| Ausência de teste de regressão cobrindo a rejeição 422 atual | Baixa/Média | Adicionar teste explícito do novo comportamento antes de remover a regra antiga |
| `matrix_node_assignment_teams` sem `UNIQUE` de banco para "1 equipe por atividade" — garantia hoje só de aplicação | Baixa | Não introduzido por esta demanda; registrar como pré-condição implícita a documentar, decisão de reforçar em schema fica em aberto |
| **Etapa 2 (fora do escopo desta análise)**: nada impede hoje excluir/inativar colaborador que seja responsável em Matriz ou Esteira aberta | A avaliar na Etapa 2 | Citada apenas como dependência futura, não incorporada à estimativa desta Etapa 1 |

---

## 16. Matriz de testes

### Automatizados — backend `operation-matrix`

| # | Caso | Resultado esperado |
|---|---|---|
| 1 | Responsável ativo, membro da equipe informada | Aceito (create/patch) |
| 2 | Colaborador ativo, mas não membro da equipe informada | Rejeitado — 422/VALIDATION_ERROR |
| 3 | Colaborador inativo (mesmo que membro da equipe) | Rejeitado — 422/VALIDATION_ERROR |
| 4 | Vínculo de equipe inativo (`team_members.is_active = false`) para o colaborador informado | Rejeitado — 422/VALIDATION_ERROR |
| 5 | Atividade sem responsável (campo omitido/`null`) | Aceito, sem erro — responsável é opcional |
| 6 | PATCH enviando só `defaultResponsibleId`, sem reenviar `teamIds` | Validado contra `team_ids` já persistidos; aceito se membro |
| 7 | PATCH enviando `teamIds` e `defaultResponsibleId` juntos | Validado de forma atômica contra o `teamIds` do próprio request |
| 8 | Troca de equipe que invalida o responsável atual (sem informar novo responsável) | Responsável limpo automaticamente |
| 9 | Troca de equipe que mantém o responsável atual válido | Responsável preservado (não deve zerar incondicionalmente) |
| 10 | Duplicação de Matriz (item raiz) com atividade que tem responsável válido | Responsável preservado na cópia |
| 11 | Duplicação/clonagem de atividade ou subárvore com responsável que não é mais válido para a equipe copiada | Responsável zerado silenciosamente na cópia, sem bloquear a duplicação |
| 12 | Falha simulada na etapa de vínculo de equipe durante um PATCH que também altera `defaultResponsibleId` | Nó não deve ficar parcialmente atualizado — rollback completo (teste de atomicidade) |

### Automatizados — criação/reutilização por catálogo

| # | Caso | Resultado esperado |
|---|---|---|
| 13 | Criar/reutilizar opção de catálogo trocando a equipe sem alterar o responsável de fato | Responsável não é zerado indevidamente |
| 14 | Clonar subárvore de catálogo para matriz nova/persistida via `cloneMatrixTaskSubtree.ts` | `defaultResponsibleId` incluído no payload e preservado no backend, quando válido |

### Automatizados — materialização Matriz → Esteira

| # | Caso | Resultado esperado |
|---|---|---|
| 15 | Materialização via fluxo manual, atividade com equipe e responsável configurados | `conveyor_node_assignees` recebe `TEAM` + `COLLABORATOR isPrimary=true` |
| 16 | Materialização via fluxo documento (R6), match por expansão de subárvore | Herança funciona (teste de regressão do comportamento já existente) |
| 17 | Materialização via fluxo documento (R6), match direto de Atividade isolada | Herança funciona **após a correção** — teste novo, hoje falharia |
| 18 | Colaborador responsável também é membro da equipe alocada no mesmo STEP | Sem duplicidade operacional — dedupe já existente do lado Esteira cobre o caso |
| 19 | Alterar responsável na Esteira após a criação | `matrix_nodes.default_responsible_id` da Matriz de origem permanece inalterado |
| 20 | Criar segunda Esteira após alterar o responsável na Matriz | Nova Esteira reflete o valor atualizado; Esteira anterior não é afetada |

### Manuais

- Repetir os cenários 15–20 na interface, incluindo o caminho de importação de documento (não só composição manual).
- Validar em `OperationMatrixEditorPage.tsx` (edição de matriz persistida), não só no assistente de criação.
- Validar em `CriarMatrizCatalogOpcaoDraftEditor.tsx` o comportamento corrigido de não zerar o responsável sem necessidade.
- Testar remoção do único membro elegível da equipe entre abertura do formulário e submit (corrida).
- Validar que Kiosk, Minha Fila e Modo Fábrica continuam funcionando sem regressão.

### Regressão para fluxos não diretamente alterados

- Criação de Esteira 100% manual, sem passar por Matriz.
- Apontamento por colaborador membro de equipe alocada, sem responsável direto.
- Pipeline R6 completo para matrizes/documentos sem nenhum candidato com responsável configurado.

---

## 17. Critérios de aceite sugeridos

1. `POST`/`PATCH` de `ACTIVITY` aceita `defaultResponsibleId` quando o colaborador é ativo e membro do estado final efetivo de equipe da atividade (persistido + submetido no mesmo request); rejeita com 422/VALIDATION_ERROR caso contrário.
2. PATCH de só `defaultResponsibleId`, sem reenviar `teamIds`, funciona corretamente contra a equipe já persistida.
3. Update do nó, vínculos de equipe e validação/gravação do responsável ocorrem em uma única transação atômica.
4. Trocar `teamIds` sem informar novo responsável compatível limpa o responsável anterior somente quando ele de fato deixa de pertencer à nova equipe.
5. `CriarMatrizEstruturaManual.tsx` e `OperationMatrixEditorPage.tsx` exigem equipe antes de habilitar o campo de responsável, e listam apenas membros elegíveis.
6. `CriarMatrizCatalogOpcaoDraftEditor.tsx` não zera o responsável quando a equipe selecionada não muda de fato.
7. `cloneMatrixTaskSubtree.ts` preserva `defaultResponsibleId` ao clonar subárvore de catálogo para matriz nova/persistida.
8. Duplicação de item/subárvore de Matriz preserva equipe e responsável, revalidando o responsável contra a equipe copiada.
9. Materialização de Esteira a partir de Matriz grava o responsável em `conveyor_node_assignees` como `COLLABORATOR isPrimary=true`, junto com a equipe como `TEAM`, tanto no fluxo manual quanto no fluxo documento (R6), incluindo o caminho de match direto de Atividade isolada.
10. Alterar o responsável de uma atividade em uma Esteira já criada não altera `matrix_nodes.default_responsible_id` da Matriz de origem.
11. Atividades de Matriz sem responsável continuam funcionando normalmente em todos os fluxos.
12. `conveyor-operational-plan.service.ts` não muda de comportamento (fallback dormente permanece inativo).

---

## 18. Plano de implementação em ordem segura (referência para a especificação — não implementado nesta entrega)

1. Backend `operation-matrix`: nova validação (estado final efetivo), atomicidade de create/patch, remoção das rejeições 422, comportamento de preservação em duplicação — com testes automatizados antes de remover a regra antiga.
2. Backend R6 (`draftToCreateConveyorInput.ts`): correção do ramo de match direto de Atividade isolada, com teste de regressão do ramo de subárvore em paralelo.
3. Frontend Matriz: `CriarMatrizEstruturaManual.tsx`, `OperationMatrixEditorPage.tsx`, `CriarMatrizCatalogOpcaoDraftEditor.tsx`, `cloneMatrixTaskSubtree.ts` — filtro dependente e correções de zeramento indevido.
4. Frontend Esteira: `novaEsteiraDraftFromMatrix.ts`/`matrixToConveyorCreateInput.ts` (fluxo manual) — herança para `conveyor_node_assignees`.
5. Testes de regressão nos consumidores operacionais e no pipeline R6 completo.
6. Atualização de `CLAUDE.md` ao final da implementação.
7. Etapa 2 (bloqueio de exclusão/inativação de colaborador referenciado) permanece item separado, fora desta sequência.

---

## 19. Estimativa revisada de esforço por camada e total

| Camada | Esforço estimado (revisado) | Justificativa |
|---|---|---|
| Banco de dados | Nenhum | Confirmado sem migration necessária |
| Backend `operation-matrix` (validação, atomicidade, duplicação) | Médio a Alto | Cresceu em relação à v1: além da validação nova, exige refatorar create/patch para atomicidade (gap pré-existente que precisa ser corrigido junto) |
| Backend R6 (`draftToCreateConveyorInput.ts`) | Médio | Cresceu em relação à v1: não é mais "só verificação", é correção de um gap de código real no ramo de match direto |
| Backend `conveyors`/`conveyor-operational-plan` | Baixo | Sem mudança de código, só teste de confirmação |
| Frontend Matriz (2 telas + catálogo) | Médio a Alto | Cresceu em relação à v1: inclui agora a correção de `CriarMatrizCatalogOpcaoDraftEditor.tsx` e `cloneMatrixTaskSubtree.ts`, além das 2 telas já previstas |
| Frontend Esteira (2 fluxos) | Médio | Fluxo manual é trabalho novo direto; fluxo R6 depende da correção de backend acima, mas o frontend do R6 em si (leitura do plano) é o que muda |
| Testes automatizados | Médio a Alto | Matriz de 20 casos novos (seção 16), nenhum coberto hoje |
| Testes manuais/validação operacional | Baixo a Médio | Checklist já delineado |
| **Total estimado (Etapa 1, revisado)** | **Médio a Alto** | Maior que a estimativa da v1: os achados de R6 (gap real, não só verificação) e de atomicidade (refatoração necessária, não só validação nova) aumentam o esforço de backend previsto |

---

## 20. Dependências, dúvidas ou decisões pendentes

As decisões abaixo já foram consolidadas nesta revisão e constam registradas ao longo do documento; seguem citadas aqui para referência única:

| Tema | Decisão consolidada | Onde está refletida |
|---|---|---|
| Obrigatoriedade | Responsável opcional; quando informado, deve ser colaborador ativo e membro ativo da equipe da atividade | Seções 2, 7, 8 |
| Dados existentes | Atividades antigas continuam válidas sem responsável; sem `NOT NULL`, backfill ou preenchimento automático | Seção 7 |
| Colaboradores de apoio | Manter modelo atual: responsável em `default_responsible_id`, demais em `supportIds` | Seção 10 |
| Materialização na Esteira | `conveyor_node_assignees` como `COLLABORATOR isPrimary=true` | Seção 11 |
| Campo legado da Esteira | `conveyor_nodes.default_responsible_id` permanece sempre `null` — nenhuma evidência técnica contrária encontrada | Seção 11 |
| Equipe na Esteira | Mantida a alocação `TEAM` já prevista no modelo | Seção 11 |
| Duplicação e cópia | Passa a preservar equipe e responsável, com revalidação | Seções 8, 13, 15 |
| Independência | Alterações na Esteira não atualizam a Matriz | Seção 12 |
| Auditoria específica | Fora desta etapa | — |
| Exclusão/inativação | Fora desta etapa (Etapa 2) | Seção 2, 15 |

Ainda em aberto, sem decisão registrada em nenhuma revisão:

1. **Motivo original da rejeição 422** (commit `5af13dcc`, 14/05/2026): não há registro de negócio no repositório. Não bloqueia a liberação desta revisão, dado que o enquadramento foi corrigido (adição, não reversão), mas continua recomendado confirmar informalmente com quem tomou a decisão, para não reintroduzir um problema operacional que a motivou.
2. **Modelo de "1 equipe por atividade"**: hoje é garantia só de aplicação (dupla, mas sem `CHECK`/`UNIQUE` de banco). Esta análise não decide se deve virar garantia de schema — fica registrado como ponto em aberto, sem bloquear a implementação da Etapa 1 (a validação de pertencimento funciona corretamente mesmo com a garantia atual sendo só de aplicação).
3. Confirmar em HML/PRD, fora do escopo desta análise (não executa queries), que nenhuma Atividade de Matriz tem hoje `default_responsible_id` preenchido — evidência de código é forte, mas não substitui confirmação em banco real antes do deploy.

---

## 21. Recomendação final

**LIBERAR COM RESSALVAS.**

A base técnica permanece sólida: nenhuma migration necessária, modelo de `conveyor_node_assignees` já adequado, e o enquadramento corrigido (adição opcional, não reversão de decisão de produto) remove o principal risco de governança levantado na v1.

As ressalvas para liberação são técnicas e específicas, não mais de produto:

1. O escopo de backend é maior do que estimado na v1 — inclui corrigir a falta de atomicidade em `serviceCreateNode`/`servicePatchNode`, hoje um gap pré-existente que fica mais arriscado ao se adicionar a nova validação.
2. O fluxo R6 precisa de correção de código real no ramo de match direto de Atividade isolada, não apenas de teste de regressão — sem essa correção, a herança de responsável (e de equipe) não funciona no caso mais comum de uso do R6.
3. O fluxo de catálogo tem dois pontos concretos a corrigir (`CriarMatrizCatalogOpcaoDraftEditor.tsx`, `cloneMatrixTaskSubtree.ts`) para que equipe e responsável não sejam perdidos silenciosamente.
4. A decisão de preservar responsável na duplicação exige revalidação no momento da cópia, não apenas copiar o valor.

Nenhum desses pontos é um bloqueio de arquitetura — todos têm caminho de implementação claro e evidenciado neste relatório. A especificação (próxima etapa) pode ser aberta com este relatório como base, desde que os itens 1–4 acima sejam incorporados ao escopo fechado da implementação, e não tratados como trabalho posterior "de ajuste fino".
