# Análise de Impacto — Responsável na Atividade da Matriz

## 0. Metadados da análise

| Campo | Valor |
|---|---|
| Data da análise (v1) | 2026-08-08 |
| Data da revisão v2 | 2026-08-08 |
| Data da revisão v3 (esta versão) | 2026-08-08 |
| **Branch** | `docs/analise-responsavel-atividade-matriz` (vinculada ao PR #12) |
| **Hash completo do commit-base analisado** (v1, v2 e v3 — inalterado nas três revisões) | `34679fd90b5270dc3e8f56c4f9b6f32bedf8815b` (10/07/2026) |
| Escopo desta entrega | Somente análise de impacto (Etapa 1), revisão v3. Nenhum código, migration ou teste funcional foi alterado ou implementado. |
| Autor | Claude Code, atuando como `sgp-impact-analyst`, com mapeamento de contexto via `sgp-context-reader` |

### 0.1 Histórico de revisões

| Versão | Motivo | Principais mudanças |
|---|---|---|
| v1 | Entrega inicial (PR #12) | Primeira análise completa. |
| v2 | Correção após 1ª revisão do time | Reenquadramento como adição (não reversão); fluxo de catálogo incluído; achado inicial de gap no R6; estratégia de PATCH revisada para estado final efetivo e atomicidade. |
| v3 (esta versão) | Correção após 2ª revisão do time | `SELECT_ALTERNATIVE` remapeado com investigação ponta a ponta (gap estrutural, distinto de `ACCEPT_SUGGESTED`); duplicação com responsável inválido redefinida como sucesso sem responsável **com aviso explícito** (nunca descarte silencioso); proteção de integridade Equipes/Colaboradores formalizada como Etapa 2; `draftToCreateConveyorInput.ts` classificado corretamente como **frontend** em todo o documento; estimativa revisada para 3–5 dias úteis, decomposta. |

---

## 1. Resumo executivo

A infraestrutura de dados para "colaborador responsável por Atividade da Matriz" já existe no schema (`matrix_nodes.default_responsible_id`, desde a migration original) e não requer migration. O backend hoje **rejeita ativamente** esse campo (HTTP 422) em todo caminho de escrita de uma `ACTIVITY`.

**Esta evolução não reverte a decisão anterior de usar Equipe.** A Equipe permanece vinculada à Atividade da Matriz exatamente como hoje. O Colaborador responsável é acrescentado como **configuração inicial adicional e opcional**, para evitar que o usuário precise reselecionar manualmente a mesma pessoa toda vez que uma nova Esteira for criada a partir da Matriz.

Esta revisão (v3) aprofunda três pontos que as revisões anteriores tratavam de forma imprecisa ou incompleta:

1. **`ACCEPT_SUGGESTED` e `SELECT_ALTERNATIVE` no fluxo R6 não são equivalentes.** Para atividade isolada (não subárvore): `ACCEPT_SUGGESTED` tem um gap **raso** — o dado (`teamId`/`collaboratorId`) já chega até `draftToCreateConveyorInput.ts` via `m.reusedStructure`, só falta um trecho de código no **frontend** para gravá-lo. `SELECT_ALTERNATIVE` tem um gap **estrutural** — o próprio candidato alternativo de atividade isolada (`ArgosAlternativeMatrixCandidateV11`, tipo/schema/query de backend) nunca carrega `teamId`/`collaboratorId` por design; a correção exige mudança em pelo menos três camadas de backend antes de o frontend conseguir ler qualquer coisa. Para candidatos de subárvore (TASK/SECTOR), ambos os ramos já funcionam ponta a ponta hoje — é teste de regressão, não implementação nova.
2. **Duplicação com responsável inválido**: a decisão de produto aprovada nesta revisão é que a duplicação **nunca falha nem descarta o responsável em silêncio** — ela conclui com sucesso, preserva a equipe, deixa a cópia sem responsável quando ele não é mais válido, e retorna um **aviso explícito** identificando a atividade afetada. O projeto já tem um padrão reaproveitável para "sucesso com aviso" (usado no próprio pipeline R6 e no Planejamento Semanal), evitando desenhar um mecanismo novo do zero.
3. **A proteção contra remoção/inativação de um membro de equipe que seja responsável de uma Atividade da Matriz é risco conhecido e fica formalmente na Etapa 2** — não é analisada em profundidade nem estimada nesta entrega, apenas registrada como dependência futura.

**Parecer final desta revisão: LIBERAR COM RESSALVAS** (seção 15). As ressalvas continuam sendo técnicas — escopo maior de backend no R6 (`SELECT_ALTERNATIVE`), atomicidade do PATCH/POST de nó, e o novo mecanismo de aviso pós-duplicação — nenhuma delas é bloqueio de arquitetura.

---

## 2. Objetivo e regra de negócio consolidada

### 2.1 Regra de negócio — Etapa 1

1. Cada Atividade da Matriz continua associada à sua Equipe.
2. A atividade pode ter também um Colaborador responsável.
3. O responsável é **opcional**.
4. Quando informado, o responsável deve ser um colaborador **ativo** e **membro ativo** da equipe associada à atividade.
5. Ao criar uma Esteira baseada na Matriz, cada atividade herda a Equipe e o Colaborador responsável configurados na Atividade da Matriz.
6. Equipe e responsável são copiados **somente como valores iniciais** da nova Esteira.
7. Alterações realizadas durante ou após a criação da Esteira **não** atualizam a Matriz de origem.
8. Atividades antigas sem responsável continuam válidas.
9. Não há `NOT NULL`, backfill ou preenchimento automático do responsável.
10. Modelo de colaboradores de apoio preservado: responsável principal em `matrix_nodes.default_responsible_id`; demais colaboradores em `metadata_json.supportIds`; na Esteira, responsável materializado em `conveyor_node_assignees` como `COLLABORATOR isPrimary=true`; alocação `TEAM` mantida; `conveyor_nodes.default_responsible_id` mantido nulo (nenhuma evidência técnica contrária encontrada em nenhuma das três revisões).

### 2.2 Decisões finais de produto desta revisão (aprovadas — não reapresentadas como perguntas em aberto)

| Tema | Decisão aprovada |
|---|---|
| R6 `SELECT_ALTERNATIVE` | Análise ajustada para cobrir contrato, backend de matching, conversor frontend e testes necessários para transportar equipe e responsável — ver seção 7. |
| Remoção de membro da equipe | Trava de integridade implementada na **Etapa 2**, fora desta entrega — ver seção 10. |
| Duplicação com responsável inválido | Duplicar sem responsável e avisar explicitamente o usuário. **Nunca** falhar a duplicação inteira nem remover o responsável silenciosamente — ver seção 9. |
| Documentação | Relatório, descrição do PR e comentário final devem ficar coerentes entre si, sem classificações obsoletas. |

### 2.3 Fora do escopo desta análise (Etapa 2)

Bloquear exclusão física, exclusão lógica, inativação de colaborador, e remoção/inativação do vínculo com a equipe, quando o colaborador estiver referenciado como responsável em Atividade de Matriz ou responsável por atividade de Esteira em aberto. Citada apenas como dependência futura e risco conhecido (seção 10), sem entrar no esforço ou no plano de implementação desta Etapa 1.

---

## 3. Inventário de arquivos e fluxos inspecionados

### Backend
- `server/migrations/0003_matrix_nodes.sql`, `0021_matrix_node_assignment_teams.sql`, `0016_teams_and_permissions.sql`, `0005_conveyors_and_nodes.sql`, `0006_conveyor_assignees_and_time_entries.sql`, `0023_conveyor_assignees_team_support.sql`
- `server/src/modules/operation-matrix/operation-matrix.service.ts`, `.schemas.ts`, `.repository.ts`, `.controller.ts`, `.dto.ts`
- `server/src/modules/teams/teams.service.ts`, `.repository.ts`, `.routes.ts`
- `server/src/modules/conveyors/conveyors.service.ts`, `.schemas.ts`
- `server/src/modules/conveyor-operational-plan/conveyor-operational-plan.service.ts`, `.dto.ts`
- `server/src/modules/argos-integration/pipeline/matchOperationalItems.ts` (leitura integral dos trechos relevantes: candidato principal, candidatos alternativos, subárvore)
- `server/src/modules/argos-integration/document-draft.schemas.ts`
- `server/src/modules/my-work-queue/my-work-queue-step-assignees.repository.ts`
- `server/src/shared/http/ok.ts`

### Frontend
- `src/domain/operation-matrix/operation-matrix.types.ts`
- `src/domain/argos/draft-v1.types.ts`, `src/domain/argos/ingest-response.types.ts`, `src/domain/argos/warnings-taxonomy.types.ts`
- `src/features/operation-matrix/criar-matriz/CriarMatrizEstruturaManual.tsx`, `createManualMatrixStructure.ts`, `criarMatrizManualDraft.ts`, `CriarMatrizCatalogOpcaoDraftEditor.tsx`, `cloneCatalogTaskSubtreeForDraft.ts`, `cloneMatrixTaskSubtree.ts`, `matrixActivityCollaboratorsMeta.ts`
- `src/features/operation-matrix/OperationMatrixEditorPage.tsx`, `OperationMatrixListPage.tsx`, `OperationMatrixNewPage.tsx`, `operationMatrixPreviewPersist.ts`, `matrixTreeAggregates.ts`
- `src/features/esteiras/nova-esteira/novaEsteiraDraftFromMatrix.ts`, `matrixToConveyorCreateInput.ts`
- `src/features/documentos/nova-esteira-documento/draftToCreateConveyorInput.ts`, `argosIssues.ts`
- `src/features/esteiras/conveyor-operational-plan/ConveyorOperationalPlanGenerationPreviewPanel.tsx`
- `src/components/ui/SgpToast.tsx`

### Fluxos exercitados por leitura
Criação/edição/duplicação de Matriz; criação/reutilização por catálogo; materialização Matriz→Esteira (manual e via documento/R6, ramos `ACCEPT_SUGGESTED`/`SELECT_ALTERNATIVE`/expansão de subárvore); consumo operacional (fila, planejamento).

---

## 4. Comportamento atual comprovado

### 4.1 Banco de dados

| Item | Situação | Evidência |
|---|---|---|
| `matrix_nodes.default_responsible_id` | Existe, UUID, FK `collaborators`, `ON DELETE SET NULL`, nulável, com índice. Nasceu na migration original. | `server/migrations/0003_matrix_nodes.sql:18,51` |
| Necessidade de migration | **Nenhuma.** Coluna já nulável — compatível com "responsável opcional" sem qualquer alteração de schema. | — |
| Regra "responsável ativo pertence à equipe ativa" | Só pode ser garantida **na aplicação** hoje — não há `CHECK`/`UNIQUE` de banco cruzando `matrix_nodes.default_responsible_id` com `team_members`. | — |
| Modelo de equipe por atividade | Imposto a **no máximo 1** equipe ativa, mas só em aplicação (dupla imposição: `service.ts` corta a lista para 1 elemento antes do repository; `repository.ts` também interrompe o loop após a primeira). Sem `UNIQUE`/`CHECK` de banco equivalente — o índice existente só impede duplicar o mesmo `team_id` no mesmo nó. | `operation-matrix.repository.ts:302-330` (`replaceNodeTeamLinks`); `server/migrations/0021_matrix_node_assignment_teams.sql:10-12` |
| Backfill/`NOT NULL` | **Confirmado que não haverá** — decisão de produto (seção 2.1, item 9). | — |

### 4.2 Backend — `operation-matrix` (rejeição ativa, reconfirmado sem mudanças desde a v2)

- Contrato Zod já aceita `defaultResponsibleId` em `ACTIVITY` (`operation-matrix.schemas.ts:33,98`).
- Service rejeita com 422/VALIDATION_ERROR em criação (`operation-matrix.service.ts:253-262`) e patch (`:329-334,352-358`).
- `servicePatchNode` zera `default_responsible_id` sempre que `teamIds` muda (`:386-401`).
- Duplicação (`serviceDuplicateItemAsNewRoot:511-512`, `serviceDuplicateSubtreeUnderSameParent:617-618`) zera `default_responsible_id` para `ACTIVITY` **incondicionalmente e silenciosamente** — nenhuma estrutura de retorno hoje comunica isso ao usuário (ver seção 9).

### 4.3 Fluxo de catálogo (reconfirmado desde a v2, sem mudanças)

- `CriarMatrizCatalogOpcaoDraftEditor.tsx`: `applyEtapaToActivity` zera `default_responsible_id` a cada edição do `<select>` de equipe, mesmo sem mudança real de valor.
- `cloneMatrixTaskSubtree.ts` (`cloneTaskSubtreeUnderItem`): nunca inclui `defaultResponsibleId` no payload de `POST /operation-matrix/nodes` — perda consistente e silenciosa.
- `cloneCatalogTaskSubtreeForDraft.ts` (`cloneTaskSubtreeWithNewIds`): clone client-side, preserva o campo implicitamente por spread.
- Nenhum caminho adicional de duplicação/clonagem foi encontrado além dos já mapeados (backend: duplicar item/nó; frontend: os três acima).

### 4.4 PATCH — estado final efetivo e atomicidade (reconfirmado desde a v2, sem mudanças)

- `existing` (com `team_ids` já persistidos) já está disponível em memória em `servicePatchNode` no momento em que a validação seria executada — calcular o estado final efetivo (`body.teamIds` se enviado, senão `existing.team_ids`) não exige query adicional.
- **`serviceCreateNode`/`servicePatchNode` não são atômicos hoje**: `updateNode`/`insertNode` rodam fora de transação; o vínculo de equipe é gravado depois, em uma transação separada. Se essa segunda transação falhar, a gravação dos campos do nó permanece. Os fluxos de duplicação, em contraste, já são atômicos (todo o laço roda em um único `BEGIN...COMMIT`).
- Padrão de erro do módulo: `AppError(<mensagem>, 422, ErrorCodes.VALIDATION_ERROR)` para violação de regra de negócio; 404/NOT_FOUND só para o recurso principal ausente.

### 4.5 `ACCEPT_SUGGESTED` — comportamento comprovado (reinvestigado nesta revisão)

Bloco de atividade isolada (`m.reusedStructure?.kind !== 'MATRIX_SUBTREE'`), `draftToCreateConveyorInput.ts:658-676`:

```
} else if (dec === 'ACCEPT_SUGGESTED') {
  if (m.reusedStructure?.kind !== 'MATRIX_SUBTREE') {
    if (m.reusedStructure?.plannedMinutes != null) { nextStep.plannedMinutes = ... }
    if (m.reusedStructure?.activity?.trim()) { nextStep.title = ... }
  }
  simpleSteps.push(withReviewStepMeta(nextStep, {
    __reviewSourceOrigin: 'reaproveitada',
    __reviewFinalAction: 'ACCEPT_SUGGESTED',
    // nunca grava __reviewPrimaryCollaboratorId / __reviewPrimaryTeamId aqui
  }))
}
```

- Este bloco lê `m.reusedStructure.plannedMinutes`/`.activity`, mas **nunca** `.collaboratorId`/`.teamId` — apesar de o tipo `ArgosMatchingPlanItemV11.reusedStructure` (`src/domain/argos/draft-v1.types.ts:202-215`) declarar `teamId`, `teamName`, `collaboratorId`, `collaboratorName` explicitamente.
- O dado **já chega até este ponto do código**: o backend popula esses 4 campos em `matchOperationalItems.ts:1885-1896` (`teamId: best!.candidate.teamId ?? undefined`, `collaboratorId: best!.candidate.collaboratorId ?? undefined`, etc.), e o schema Zod `reusedStructure` (`document-draft.schemas.ts:184-198`) também os define — nada é descartado na validação backend.
- **Classificação**: gap **raso**, e localizado inteiramente no **frontend** (`draftToCreateConveyorInput.ts`) — falta só gravar `__reviewPrimaryCollaboratorId`/`__reviewPrimaryTeamId` a partir de dado já disponível em `m`.
- O caminho de subárvore de `ACCEPT_SUGGESTED` (`m.reusedStructure.kind === 'MATRIX_SUBTREE'`, tratado em `draftToCreateConveyorInput.ts:561-632`, linhas 592-593/622-623) **já lê e grava corretamente** `defaultResponsibleId`/`teamId` por atividade da subárvore — já funciona ponta a ponta.

### 4.6 `SELECT_ALTERNATIVE` — comportamento comprovado (investigação ponta a ponta nesta revisão)

Bloco de atividade isolada, `draftToCreateConveyorInput.ts:635-657`:

```
if (dec === 'SELECT_ALTERNATIVE') {
  const altId = accEntry?.selectedAlternativeMatrixNodeId
  const alt = m.alternativeCandidates?.find((c) => c.matrixNodeId === altId)
  if (alt) {
    if (alt.kind !== 'MATRIX_SUBTREE') {
      if (typeof alt.plannedMinutes === 'number') { nextStep.plannedMinutes = ... }
      if (alt.activity?.trim()) { nextStep.title = ... }
    }
    simpleSteps.push(withReviewStepMeta(nextStep, {
      __reviewFinalAction: 'SELECT_ALTERNATIVE',
      // nunca grava __reviewPrimaryCollaboratorId / __reviewPrimaryTeamId aqui
    }))
  }
}
```

Diferente de `ACCEPT_SUGGESTED`, aqui o problema **não é só de leitura no frontend — o dado nunca chega até este ponto**, para candidato alternativo de atividade isolada (`kind: 'MATRIX_ACTIVITY'`). Cadeia rastreada ponta a ponta:

1. **Query SQL** (`matchOperationalItems.ts:642,696,740,800`) — lê `default_responsible_id`/equipe corretamente em `MatrixMatchCandidate` (tipo com `collaboratorId`, `collaboratorName`, `teamId`, `teamName`, `teamAssignments`, linhas 279-284).
2. **`buildAlternativeCandidates`** (`matchOperationalItems.ts:1648-1679`, usado no caminho de match forte, chamado em `:1861`) e **`collectCreateNewAlternatives`** (`:1682-1717`, usado no caminho `CREATE_NEW` fraco) — **descartam** `collaboratorId`/`teamId` ao montar o literal de objeto do candidato alternativo, mesmo esses campos estando disponíveis em `r.candidate` nesse exato ponto do código.
3. **Tipo TS interno backend** `AlternativeMatrixCandidate` (`matchOperationalItems.ts:601-612`) — já nasce **sem** `teamId`/`collaboratorId`/nomes; não é possível nem atribuir esses campos sem alterar o tipo.
4. **Schema Zod** `alternativeMatrixCandidateSchema` (`document-draft.schemas.ts:161-172`) — **não define** `teamId`/`teamName`/`collaboratorId`/`collaboratorName`, e não tem `.passthrough()` (diferente de `matchingPlanItemSchema`), então qualquer campo extra seria descartado na serialização mesmo que adicionado ao objeto JS.
5. **Tipo de domínio frontend** `ArgosAlternativeMatrixCandidateV11` (`src/domain/argos/draft-v1.types.ts:178-191`) — tem `teamName`/`collaboratorName` (só nomes, sem utilidade para vincular registro), mas **não tem `teamId`/`collaboratorId`**. Há inconsistência entre o tipo de domínio do frontend (que já antecipa os nomes) e o schema real do backend (que nem os nomes emite).
6. **`draftToCreateConveyorInput.ts`** (frontend) — mesmo corrigido para ler `alt.teamId`/`alt.collaboratorId`, **o dado nunca chegaria**, porque foi descartado nas etapas 2–4.

**Exceção confirmada**: quando o candidato alternativo é de subárvore (`kind: 'MATRIX_SUBTREE'`, TASK/SECTOR), `buildAlternativeCandidates`/`collectCreateNewAlternatives` anexam `matrixSubtree` via `buildMatrixSubtreeV11FromPool` (`:449-583`), que **preenche corretamente** `defaultResponsibleId`/`teamId` por atividade dentro da subárvore (linhas 556-564) — schema Zod `matrixSubtreeActivitySchema` (`document-draft.schemas.ts:129-139`) já define esses campos, e o frontend já lê esse caminho (mesmo bloco compartilhado de expansão de subárvore usado por `ACCEPT_SUGGESTED`, linhas 561-632/592-593/622-623). **Não há gap para candidato alternativo de subárvore.**

### 4.7 Padrão existente de "sucesso com aviso não bloqueante" (levantado nesta revisão)

Confirmado — não é necessário desenhar um mecanismo novo do zero. Precedentes diretos:

- **Pipeline R6**: `ArgosDocumentIngestResult.status: 'completed' | 'partial' | 'failed'` (`src/domain/argos/ingest-response.types.ts:14-17,70`) — `'partial'` já modela "sucesso parcial". `warnings: ArgosIssue[]` (`:81`) com taxonomia de severidade (`src/domain/argos/warnings-taxonomy.types.ts`), particionado em fatais/não-fatais por `partitionArgosIssues` (`src/features/documentos/nova-esteira-documento/argosIssues.ts:3-14`). `ConveyorDraftV11.warnings` + `humanReviewRequired: true` (`draft-v1.types.ts:231-239`) — o próprio R6 já é desenhado como "sucesso + itens para revisão humana".
- **Planejamento Semanal** (`conveyor-operational-plan`): `ConveyorOperationalPlanItemApi.reviewRequired: boolean` + `reviewReasons: { code, message }[]` (`conveyor-operational-plan.dto.ts:70-71,46-49`); status `'NEEDS_REVIEW'`/`'REVIEW_REQUIRED'` (`:23,16`); `ConveyorOperationalPlanGenerationPreviewApi.warnings: { code, message }[]` (`:87-90,106`) — já renderizado no frontend em `ConveyorOperationalPlanGenerationPreviewPanel.tsx:27,55-57` como lista de alertas.
- **Envelope HTTP genérico**: `ok()` (`server/src/shared/http/ok.ts:1-3`) já aceita um segundo parâmetro `meta: Record<string, unknown>` — hoje não usado pelas rotas de duplicação de matriz, mas disponível sem alteração de contrato de baixo nível.
- **UI genérica**: `SgpToast`/`SgpInlineBanner` (`src/components/ui/SgpToast.tsx`) têm variantes `success`/`error`/`neutral` (sem `warning` dedicada) e são de mensagem única — o padrão de **lista** de avisos usado no Planejamento Semanal é o precedente mais próximo do caso de duplicação com múltiplas atividades afetadas.

### 4.8 Duplicação de matriz — retorno atual (levantado nesta revisão)

- `serviceDuplicateItemAsNewRoot`/`serviceDuplicateSubtreeUnderSameParent` retornam hoje só `MatrixNodeTreeApi` — nenhuma estrutura de contadores/avisos.
- `postMatrixItemDuplicate` (controller) retorna só `{ id, name, is_active }`; `postMatrixNodeDuplicate` retorna a árvore inteira — nenhum dos dois passa `meta` ao helper `ok()`, embora o helper já suporte.
- Conclusão: o zeramento silencioso do responsável na duplicação hoje não é comunicado em nenhuma camada — nem service, nem controller, nem contrato de resposta.

---

## 5. Alterações necessárias por camada

| Camada | Alteração |
|---|---|
| Banco de dados | Nenhuma migration. |
| Backend `operation-matrix` | Remover as duas rejeições 422; validação de estado final efetivo (seção 8); tornar create/patch atômicos; duplicação passa a preservar responsável válido e retornar aviso quando inválido (seção 9), usando o parâmetro `meta` já suportado por `ok()`. |
| Backend `argos-integration` — `matchOperationalItems.ts` | **Alteração necessária apenas para `SELECT_ALTERNATIVE` de atividade isolada**: incluir `collaboratorId`/`collaboratorName`/`teamId`/`teamName` em `AlternativeMatrixCandidate` (tipo interno), em `buildAlternativeCandidates` e `collectCreateNewAlternatives` (literal de objeto). Nenhuma alteração necessária para `ACCEPT_SUGGESTED` (dado já chega) nem para candidatos de subárvore (já funciona). |
| Backend `argos-integration` — `document-draft.schemas.ts` | **Alteração necessária**: ampliar `alternativeMatrixCandidateSchema` com `teamId`/`teamName`/`collaboratorId`/`collaboratorName` opcionais. |
| Frontend `src/domain/argos/draft-v1.types.ts` | **Alteração necessária**: ampliar `ArgosAlternativeMatrixCandidateV11` com `teamId`/`collaboratorId` (hoje só tem os nomes). |
| Frontend `draftToCreateConveyorInput.ts` | **Classificado corretamente como frontend.** Alteração necessária em dois pontos independentes: (a) ramo `ACCEPT_SUGGESTED` de atividade isolada — gravar `__reviewPrimaryCollaboratorId`/`__reviewPrimaryTeamId` a partir de `m.reusedStructure` já disponível; (b) ramo `SELECT_ALTERNATIVE` de atividade isolada — mesma gravação, mas só possível **depois** das alterações de backend acima chegarem ao contrato. Nenhuma alteração nos ramos de subárvore de nenhum dos dois `dec`, que já funcionam (teste de regressão). |
| Frontend — Matriz (2 telas) | Campo de responsável dependente de equipe em `CriarMatrizEstruturaManual.tsx` e `OperationMatrixEditorPage.tsx`. |
| Frontend — Catálogo | Corrigir zeramento incondicional em `CriarMatrizCatalogOpcaoDraftEditor.tsx`; incluir `defaultResponsibleId` no payload de `cloneMatrixTaskSubtree.ts`. |
| Frontend — Duplicação | Exibir o(s) aviso(s) retornado(s) pelo backend após duplicar (lista, não mensagem única — seguir o padrão já usado em `ConveyorOperationalPlanGenerationPreviewPanel.tsx`). |
| Frontend — Nova Esteira (manual) | Herdar responsável junto com equipe em `novaEsteiraDraftFromMatrix.ts`/`matrixToConveyorCreateInput.ts`. |
| Permissões | Nenhuma nova permissão necessária. |
| Consumidores operacionais | Sem alteração funcional esperada, condicionado a `conveyor_nodes.default_responsible_id` permanecer sempre `null`. |

---

## 6. (referência cruzada — ver seções 7 a 9 para os itens que exigem tratamento dedicado)

As alterações de banco, backend e frontend por camada estão consolidadas na seção 5. As três áreas que exigiram remapeamento nesta revisão têm seção própria a seguir, conforme exigido pela forma do relatório.

---

## 7. Comparação explícita — `ACCEPT_SUGGESTED` × `SELECT_ALTERNATIVE`

| Aspecto | `ACCEPT_SUGGESTED` (atividade isolada) | `SELECT_ALTERNATIVE` (atividade isolada) | Ambos (candidato de subárvore) |
|---|---|---|---|
| Dado já disponível no candidato de backend? | Sim — `reusedStructure.collaboratorId`/`.teamId` populados em `matchOperationalItems.ts:1891-1894` | **Não** — descartado em `buildAlternativeCandidates`/`collectCreateNewAlternatives` (`:1648-1717`) | Sim — `matrixSubtree.activities[].defaultResponsibleId`/`teamId` (`:556-564`) |
| Presente no tipo TS interno de backend? | Sim (`reusedStructure` no plano de matching) | **Não** — `AlternativeMatrixCandidate` (`:601-612`) não tem os campos | Sim — `MatrixSubtreeBuiltActivity` |
| Presente no schema Zod de contrato? | Sim — `reusedStructure` (`document-draft.schemas.ts:184-198`) | **Não** — `alternativeMatrixCandidateSchema` (`:161-172`), sem `.passthrough()` | Sim — `matrixSubtreeActivitySchema` (`:129-139`) |
| Presente no tipo de domínio frontend? | Sim — `ArgosMatchingPlanItemV11.reusedStructure` (`draft-v1.types.ts:202-215`) | Parcial — `ArgosAlternativeMatrixCandidateV11` (`:178-191`) só tem os **nomes**, não os ids | Sim |
| `draftToCreateConveyorInput.ts` já lê o campo? | Não (mas poderia, dado já chega) | Não (e não poderia, dado não chega) | Sim, já lê (`:592-593,622-623`) |
| Classificação correta | **Alteração necessária — só frontend** (dado já disponível ponta a ponta) | **Alteração necessária — backend em 3 camadas + frontend**, nessa ordem (schema/tipo de backend precisam mudar antes de o frontend ter o que ler) | **Teste de regressão** — já funciona hoje |
| Esforço relativo | Baixo | Médio (mudança de contrato coordenada backend↔frontend) | Nenhum (validar com teste) |

**Conclusão da comparação:** tratar os dois ramos como equivalentes (como fez a v2) subestimou `SELECT_ALTERNATIVE`. São dois problemas de natureza diferente: um é omissão de leitura (frontend), o outro é ausência de transporte de dado desde a origem (contrato de backend). A implementação da Etapa 1 precisa sequenciar isso corretamente — o ajuste de `SELECT_ALTERNATIVE` depende de mudança de schema/tipo de backend antes que qualquer trabalho de frontend nesse ramo específico faça sentido.

---

## 8. Estratégia de validação e atomicidade do PATCH

1. **Estado final efetivo**: a validação deve considerar `body.teamIds` se enviado no request, senão os `team_ids` já persistidos (`existing.team_ids`, já carregado em memória em `servicePatchNode` sem custo de query adicional). O endpoint **não** deve exigir reenvio de `teamIds` quando o usuário altera só `defaultResponsibleId`.
2. **Validação do responsável**: colaborador ativo (reaproveitar padrão de `teams.repository.findCollaboratorEligibility`) **e** membro ativo do conjunto de equipe final efetivo calculado no item 1.
3. **Troca de equipe que invalida o responsável atual**: limpar automaticamente o responsável **somente quando ele de fato deixa de pertencer** à nova equipe (hoje o zeramento é incondicional a cada troca de `teamIds`, precisa virar condicional).
4. **Atomicidade — requisito obrigatório, não opcional**: update do nó, `replaceNodeTeamLinks` e validação/gravação do responsável devem ocorrer dentro de uma única transação (`BEGIN...COMMIT`), tanto em `serviceCreateNode` quanto em `servicePatchNode`. Hoje nenhum dos dois é atômico (seção 4.4); os fluxos de duplicação já seguem esse padrão e servem de referência direta de implementação.
5. **Código HTTP e mensagem**: manter o padrão já estabelecido no módulo — 422/VALIDATION_ERROR, com mensagem de negócio (ex.: *"O colaborador responsável deve ser um colaborador ativo e membro ativo da equipe informada."*) reservada para violações realmente impeditivas (responsável inválido em `POST`/`PATCH` direto). Duplicação **não** usa esse caminho de erro — ver seção 9.
6. **Corrida entre carregamento do formulário e submit**: mitigada pela revalidação obrigatória dentro da mesma transação da escrita (item 4), nunca aceitando como pré-validado o que o frontend enviou.

---

## 9. Comportamento de duplicação com responsável inválido (redefinido nesta revisão)

**Decisão aprovada — substitui o "zerar silenciosamente" descrito na v2:**

1. A duplicação **conclui com sucesso**.
2. A equipe aplicável é preservada normalmente.
3. Se o responsável da atividade de origem estiver inválido no momento da duplicação (colaborador inativo, vínculo de equipe inativo, ou colaborador que não pertence mais à equipe copiada), a cópia é criada **sem responsável**.
4. A resposta inclui um **aviso explícito**, não uma mensagem de erro.
5. O aviso identifica a atividade afetada e orienta o usuário a revisar e selecionar um responsável válido.
6. Se várias atividades forem afetadas na mesma duplicação (subárvore ou item completo), o aviso cobre **todas elas**, não só a primeira.

**Onde a validade é verificada**: dentro do mesmo laço/transação que já percorre a subárvore em `serviceDuplicateItemAsNewRoot`/`serviceDuplicateSubtreeUnderSameParent` — para cada linha `ACTIVITY` copiada, checar se `r.default_responsible_id` (quando não nulo) ainda é colaborador ativo e membro ativo de alguma das `team_ids` que serão copiadas para essa mesma linha. Isso reaproveita a mesma validação de "colaborador ativo + membro da equipe" descrita na seção 8, aplicada durante a cópia em vez de bloquear o fluxo.

**Como a operação permanece atômica**: os dois métodos de duplicação já rodam dentro de um único `BEGIN...COMMIT` (seção 4.8) — a checagem de validade do responsável entra nesse mesmo laço, sem introduzir uma segunda transação. O que muda é o campo `default_responsible_id` sendo condicional (preservado se válido, `null` se inválido) em vez de sempre `null`; a operação de escrita continua atômica como já é hoje.

**Como o backend comunica o aviso sem tratar a duplicação como erro total**: reaproveitar o parâmetro `meta` já suportado por `ok()` (`server/src/shared/http/ok.ts`), hoje não utilizado pelas rotas de duplicação — `ok(tree, { warnings: [...] })`. Não é necessário criar um mecanismo de baixo nível novo. A estrutura de cada aviso pode seguir o padrão já usado em `ConveyorOperationalPlanGenerationPreviewApi.warnings`/`reviewReasons` (`{ code, message }`), possivelmente acrescida de um identificador da atividade afetada (`{ code, message, matrixNodeId, activityName }`) — esta é a menor evolução contratual coerente com o padrão existente; a definição exata do formato fica para a especificação de implementação, não para esta análise.

**Como o frontend exibirá o aviso**: seguir o precedente já em produção de `ConveyorOperationalPlanGenerationPreviewPanel.tsx` — lista de avisos (`<ul>`), não um toast de mensagem única, já que pode haver múltiplas atividades afetadas na mesma duplicação. Deve ser visível imediatamente após a duplicação (não exigir navegação adicional) e acionável (indicar qual atividade revisar).

**Duplicidade operacional (responsável também membro da equipe)**: não é um problema introduzido por esta regra — a Esteira já resolve esse caso hoje via dedupe em `my-work-queue-step-assignees.repository.ts` (`UNION` entre assignee direto e membro de equipe). Nenhum tratamento adicional necessário na duplicação de Matriz em si.

**Mensagem de negócio de referência** (adaptável ao padrão textual do sistema): *"A atividade foi duplicada sem responsável porque o colaborador configurado não pertence mais à equipe ou está inativo. Revise a atividade e selecione um responsável válido."*

**O que esta seção não decide**: o formato exato do payload de `warnings` (novo tipo compartilhado vs. reaproveitar um tipo existente do Planejamento Semanal) é decisão de especificação/implementação, não desta análise — fica registrado como ponto a resolver na próxima etapa, sem bloquear a liberação.

---

## 10. Dependências futuras — Etapa 2

**Risco conhecido, não implementado nesta etapa nem incluído no esforço/estimativa:** o serviço de Equipes (`teams.service.ts`) hoje **permite** remover ou inativar o vínculo de um membro (`team_members`) mesmo que esse colaborador esteja configurado como `default_responsible_id` de uma ou mais Atividades da Matriz, ou como responsável (`conveyor_node_assignees`, `assignment_type='COLLABORATOR', is_primary=true`) de uma atividade de Esteira em aberto. Nenhuma validação cruzada existe hoje entre `teams`/`team_members` e `matrix_nodes`/`conveyor_node_assignees`.

**Escopo que a Etapa 2 deverá cobrir** (apenas apontado aqui para orientar a manutenção posterior, não analisado em profundidade):
- Exclusão física e exclusão lógica de colaborador.
- Inativação de colaborador.
- Remoção/inativação do vínculo colaborador↔equipe (`team_members`), quando esse colaborador for referenciado como responsável.
- Bloqueio quando o colaborador estiver referenciado como responsável em Atividade de Matriz, **ou** responsável por atividade de uma Esteira **em aberto**.
- Definição de "Esteira em aberto" para fins da análise futura: qualquer status diferente de `FINALIZADA` e `CANCELADA` (consistente com o conjunto de status documentado no ciclo de vida de Esteiras: `EM_ELABORACAO`, `AGUARDANDO_PLANEJAMENTO`, `EM_PLANEJAMENTO`, `A_INICIAR`, `EM_ANDAMENTO`, `FINALIZADA`, `CANCELADA`) — a ser confirmado/ajustado na análise da Etapa 2 caso haja divergência no domínio.

**Serviços/fluxos apontados como afetados** (só para referência futura, sem estimativa): `teams.service.ts` (`serviceRemoveMember`/equivalente, não lido em profundidade nesta análise por estar fora de escopo), `operation-matrix` (leitura de `default_responsible_id`), `conveyors`/`conveyorAssignments` (leitura de assignees ativos por Esteira em aberto).

**Por que não bloqueia a liberação da Etapa 1**: o risco é transitório e já existe hoje de forma equivalente para qualquer alocação direta de colaborador na Esteira (`conveyor_node_assignees`) — introduzir o responsável na Matriz amplia a superfície do mesmo risco já aceito, não cria uma categoria de risco nova.

---

## 11. Matriz de riscos e mitigações

| Risco | Severidade | Probabilidade | Mitigação |
|---|---|---|---|
| `SELECT_ALTERNATIVE` de atividade isolada não transporta equipe/responsável — gap estrutural em 3 camadas de backend, maior que o estimado na v2 | Alta | Alta (é o comportamento atual confirmado, não hipotético) | Sequenciar a implementação: schema/tipo de backend primeiro, frontend depois (seção 7) |
| `serviceCreateNode`/`servicePatchNode` não atômicos — risco de estado parcial ao introduzir a nova validação | Média/Alta | Média | Envolver update do nó + vínculos de equipe + validação de responsável em transação única (seção 8), seguindo o padrão já usado nos fluxos de duplicação |
| Duplicação com responsável inválido, se implementada como zeramento silencioso (comportamento antigo da v2) | Alta | — (decisão já corrigida nesta revisão) | Aviso explícito obrigatório, nunca silencioso (seção 9) — risco eliminado pela decisão de produto, registrado aqui para rastreabilidade da correção |
| `cloneMatrixTaskSubtree.ts` nunca envia `defaultResponsibleId` | Média | Alta (confirmado, não hipotético) | Incluir o campo no payload de `buildCreatePayload` |
| `CriarMatrizCatalogOpcaoDraftEditor.tsx` zera responsável a cada edição de equipe, mesmo sem mudança | Baixa/Média | Alta (confirmado) | Corrigir condição para só zerar quando a equipe efetivamente muda |
| Corrida entre validação de pertencimento no formulário e composição real da equipe no submit | Média | Baixa | Revalidação obrigatória no backend, dentro da mesma transação da escrita |
| Ausência de teste de regressão cobrindo a rejeição 422 atual | Baixa/Média | — | Teste explícito do novo comportamento antes de remover a regra antiga |
| Modelo de "1 equipe por atividade" garantido só em aplicação, sem constraint de banco | Baixa | Baixa | Não introduzido por esta demanda; registrar como pré-condição implícita, decisão de reforçar em schema fica em aberto |
| **Etapa 2 (risco transitório, fora desta entrega)**: nada impede hoje remover/inativar um membro de equipe que seja responsável em Matriz ou Esteira aberta | Média (transitório, já aceito hoje para alocação direta na Esteira) | Baixa a média (depende de rotatividade de equipe) | Endereçado na Etapa 2 — não incorporado ao esforço/plano desta Etapa 1 (seção 10) |

---

## 12. Matriz de testes

### Backend `operation-matrix`

| # | Caso | Resultado esperado |
|---|---|---|
| 1 | Responsável ativo, membro da equipe informada | Aceito |
| 2 | Colaborador ativo, não membro da equipe informada | Rejeitado — 422/VALIDATION_ERROR |
| 3 | Colaborador inativo | Rejeitado — 422/VALIDATION_ERROR |
| 4 | Vínculo de equipe inativo para o colaborador informado | Rejeitado — 422/VALIDATION_ERROR |
| 5 | Atividade sem responsável | Aceito — campo opcional |
| 6 | PATCH só de `defaultResponsibleId`, sem reenvio de `teamIds` | Validado contra `team_ids` já persistidos |
| 7 | PATCH conjunto de `teamIds` + `defaultResponsibleId` | Validado atomicamente contra o `teamIds` do próprio request |
| 8 | Troca de equipe que invalida o responsável atual | Responsável limpo automaticamente |
| 9 | Troca de equipe que mantém o responsável atual válido | Responsável preservado |
| 10 | Falha simulada na etapa de vínculo de equipe durante PATCH que também altera responsável | Rollback completo — nó não fica parcialmente atualizado |

### Duplicação

| # | Caso | Resultado esperado |
|---|---|---|
| 11 | Duplicação com responsável válido | Preservado na cópia |
| 12 | Duplicação com responsável inválido (uma atividade) | Duplicação concluída, cópia sem responsável, aviso explícito identificando a atividade |
| 13 | Duplicação com múltiplas atividades com responsável inválido | Duplicação concluída, aviso cobre todas as atividades afetadas, não só a primeira |

### Catálogo

| # | Caso | Resultado esperado |
|---|---|---|
| 14 | Criar/reutilizar opção de catálogo trocando equipe sem alterar responsável de fato | Responsável não é zerado indevidamente |
| 15 | Clonar subárvore de catálogo via `cloneMatrixTaskSubtree.ts` | `defaultResponsibleId` incluído no payload e preservado quando válido |

### R6 — materialização Matriz → Esteira via documento

| # | Caso | Resultado esperado |
|---|---|---|
| 16 | `ACCEPT_SUGGESTED`, atividade isolada, com equipe e responsável | Herda ambos (após correção de frontend) |
| 17 | `ACCEPT_SUGGESTED`, subárvore | Herda ambos — **teste de regressão**, já funciona hoje |
| 18 | `SELECT_ALTERNATIVE`, atividade isolada, com equipe e responsável | Herda ambos (após correção de backend em 3 camadas + frontend) |
| 19 | `SELECT_ALTERNATIVE`, subárvore | Herda ambos — **teste de regressão**, já funciona hoje |
| 20 | Candidato alternativo sem responsável configurado na Matriz | Esteira criada sem responsável, sem erro |
| 21 | Criação nova (`CREATE_NEW`) dentro do fluxo R6, sem candidato de matriz | Sem herança — comportamento inalterado |

### Materialização e independência Matriz × Esteira

| # | Caso | Resultado esperado |
|---|---|---|
| 22 | Colaborador responsável também é membro da equipe alocada no mesmo STEP | Sem duplicidade operacional — dedupe já existente do lado Esteira cobre o caso |
| 23 | Alterar responsável na Esteira após a criação | `matrix_nodes.default_responsible_id` de origem permanece inalterado |
| 24 | Criar segunda Esteira após alterar responsável na Matriz | Nova Esteira reflete valor atualizado; Esteira anterior não é afetada |
| 25 | Matriz legada sem responsável, materializada em Esteira | Funciona normalmente, sem erro, sem responsável herdado |

### Manuais

- Repetir os cenários 16–21 na interface real, ambos os caminhos (`ACCEPT_SUGGESTED`/`SELECT_ALTERNATIVE`) × (atividade isolada/subárvore).
- Validar em `OperationMatrixEditorPage.tsx`, não só no assistente de criação.
- Validar em `CriarMatrizCatalogOpcaoDraftEditor.tsx` a correção do zeramento indevido.
- Executar duplicação com responsável inválido na interface e confirmar que o aviso aparece de forma visível e identificável.
- Testar remoção do único membro elegível da equipe entre abertura do formulário e submit (corrida).
- Validar que Kiosk, Minha Fila e Modo Fábrica continuam funcionando sem regressão.

### Regressão para fluxos não diretamente alterados

- Criação de Esteira 100% manual, sem passar por Matriz.
- Apontamento por colaborador membro de equipe alocada, sem responsável direto.
- Pipeline R6 completo para matrizes/documentos sem nenhum candidato com responsável configurado.

---

## 13. Estratégia de implantação e rollback

**Implantação — ordem recomendada** (sequenciamento é o ponto crítico desta feature, dado o achado da seção 7):

1. Backend `operation-matrix`: validação de estado final efetivo, atomicidade, remoção das rejeições 422, comportamento de duplicação com aviso — com testes cobrindo antes de remover a regra antiga.
2. Backend R6, camadas de contrato: `AlternativeMatrixCandidate` (tipo), `buildAlternativeCandidates`/`collectCreateNewAlternatives` (literal de objeto), `alternativeMatrixCandidateSchema` (Zod) — **precede** qualquer trabalho de frontend no ramo `SELECT_ALTERNATIVE`.
3. Frontend: `ArgosAlternativeMatrixCandidateV11` (tipo de domínio), `draftToCreateConveyorInput.ts` (ambos os ramos, `ACCEPT_SUGGESTED` e `SELECT_ALTERNATIVE`, atividade isolada).
4. Frontend Matriz: 2 telas + catálogo (`CriarMatrizEstruturaManual.tsx`, `OperationMatrixEditorPage.tsx`, `CriarMatrizCatalogOpcaoDraftEditor.tsx`, `cloneMatrixTaskSubtree.ts`).
5. Frontend Esteira manual: `novaEsteiraDraftFromMatrix.ts`/`matrixToConveyorCreateInput.ts`.
6. Frontend — exibição de avisos de duplicação.
7. Testes de regressão completos (matriz da seção 12) e validação manual em HML antes de PRD.

**Compatibilidade com dados existentes**: total — nenhuma atividade de matriz hoje tem responsável (confirmado por leitura de todo caminho de escrita nas três revisões), e o campo é opcional; não há dado a migrar ou reconciliar.

**Rollback por camada**:
- Backend `operation-matrix`: reverter para a rejeição 422 é uma reversão de código simples (sem estado a desfazer, já que nenhum dado novo dependeria disso além de eventuais responsáveis já configurados, que voltariam a ficar "invisíveis" mas não seriam perdidos — a coluna permanece).
- Backend R6: reverter as 3 camadas de contrato é seguro, pois é aditivo (campos opcionais novos) — não quebra consumidores existentes se revertido.
- Frontend: reversão padrão de deploy (build anterior), sem migração de estado do cliente.
- Nenhuma migration é aplicada, então não há rollback de banco a considerar.

---

## 14. Estimativa revisada e decomposta

A estimativa da v2 (2–3 dias) ficou apertada após os achados de catálogo, atomicidade e, principalmente, o gap estrutural de `SELECT_ALTERNATIVE`. Referência revisada: **3 a 5 dias úteis**, decomposta:

| Frente | Estimativa | Justificativa |
|---|---|---|
| Backend `operation-matrix` (validação, atomicidade, duplicação com aviso) | 1 a 1,5 dia | Validação nova + refatoração de atomicidade (create e patch) + lógica de aviso na duplicação, reaproveitando `meta` de `ok()` |
| Backend R6 — contratos (`AlternativeMatrixCandidate`, `buildAlternativeCandidates`, `collectCreateNewAlternatives`, schema Zod) | 0,5 a 1 dia | Mudança em 3 pontos coordenados; risco de quebrar `.passthrough()`/validação se mal sequenciado |
| Frontend R6 (`draftToCreateConveyorInput.ts`, `ArgosAlternativeMatrixCandidateV11`) | 0,5 dia | Dois ramos a corrigir, um deles bloqueado até o backend acima estar pronto |
| Frontend Matriz (2 telas + catálogo, filtro dependente equipe→responsável) | 1 a 1,5 dia | 4 arquivos de frontend distintos (`CriarMatrizEstruturaManual.tsx`, `OperationMatrixEditorPage.tsx`, `CriarMatrizCatalogOpcaoDraftEditor.tsx`, `cloneMatrixTaskSubtree.ts`) |
| Frontend Esteira (herança manual) + exibição de avisos de duplicação | 0,5 dia | Reaproveita padrão já existente de lista de avisos |
| Testes automatizados (25 casos da matriz da seção 12) | 1 a 1,5 dia | Nenhum caso coberto hoje; inclui testes de atomicidade e de ambos os ramos R6 |
| Testes manuais/validação em HML | 0,5 dia | Checklist da seção 12 |
| **Total** | **3 a 5 dias úteis** | Concentrado em backend (validação + atomicidade + contratos R6) e na correção coordenada backend→frontend do `SELECT_ALTERNATIVE` |

---

## 15. Parecer final

**LIBERAR COM RESSALVAS.**

A base técnica permanece sólida: nenhuma migration necessária, modelo de `conveyor_node_assignees` adequado, enquadramento como adição opcional (não reversão de decisão de produto), e um padrão de "sucesso com aviso" já existente no projeto para modelar a duplicação com responsável inválido sem precisar inventar um mecanismo novo.

As ressalvas para liberação, todas técnicas e com caminho de implementação evidenciado nesta análise:

1. `SELECT_ALTERNATIVE` de atividade isolada exige mudança coordenada em 3 camadas de backend antes de qualquer trabalho de frontend nesse ramo específico — precisa ser sequenciado corretamente na implementação (seção 13), não pode ser tratado como um ajuste pontual de frontend.
2. `serviceCreateNode`/`servicePatchNode` precisam se tornar atômicos como parte desta implementação, não como melhoria posterior — o risco de estado parcial existe desde que a nova validação for introduzida.
3. O mecanismo de aviso pós-duplicação precisa de uma decisão de formato de contrato na especificação (reaproveitar o padrão de `{ code, message }` do Planejamento Semanal, acrescido de identificação da atividade) — a análise recomenda a direção, mas não fecha o payload exato.
4. Dois pontos concretos do fluxo de catálogo (`CriarMatrizCatalogOpcaoDraftEditor.tsx`, `cloneMatrixTaskSubtree.ts`) precisam de correção para que equipe e responsável não sejam perdidos silenciosamente.

Nenhum desses pontos é bloqueio de arquitetura. A Etapa 2 (integridade de Equipes/Colaboradores) está corretamente separada como risco conhecido e transitório, sem incorporar esforço a esta entrega. A especificação de implementação pode ser aberta com este relatório como base, incorporando os itens 1–4 acima ao escopo fechado — em particular respeitando a ordem de implementação da seção 13, já que o item 1 tem dependência direta de sequenciamento entre backend e frontend.
