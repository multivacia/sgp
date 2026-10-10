# Retorno — manual-usuario-sgp-cap06-esteiras

- **TASK_ID:** `manual-usuario-sgp-cap06-esteiras`
- **Data/hora:** 2026-10-03 (UTC)
- **Repositório:** `multivacia/sgp`
- **Branch:** `docs/manual-usuario-sgp-cap06-esteiras`
- **SHA base:** `f5d179d94cfa3156ad7d57a180537b4383b5d114` (tip de `origin/docs/manual-usuario-sgp-cap12-jornada-gerencial`, **igual ao esperado pelo prompt** — sem divergência de base)
- **SHA final:** ver `git rev-parse origin/docs/manual-usuario-sgp-cap06-esteiras` (não pode constar dentro de si)
- **Objetivo:** enriquecer somente o capítulo 6 — Esteiras — de `docs/manual/source/MANUAL_USUARIO_SGP.md`, auditando o código atual, e atualizar a linha de situação do cabeçalho.
- **Status final:** concluído. Tarefa exclusivamente documental; nenhuma alteração de aplicação.

---

## 1. Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | capítulo 6 substituído (13 → 846 linhas); linha de situação do cabeçalho; capítulo 21 complementado e corrigido (191 → 289 linhas) |
| `docs/ai/returns/manual-usuario-sgp-cap06-esteiras-retorno.md` | criado (este arquivo) |

Nenhum outro arquivo criado, alterado ou removido. `MANUAL_FUNCIONAL_SGP.md` **não** foi alterado (ver §19). `SESSION_CHECKPOINT.md` não foi alterado: atividade concluída em sessão única, sem handoff.

Migrations envolvidas: nenhuma.

---

## 2. Observação de governança — branch designada

O ambiente desta sessão designou a branch `ccr-848fd45f-el8t0d`. O prompt da atividade, instrução humana explícita e mais específica, determinou base `f5d179d9…` e branch `docs/manual-usuario-sgp-cap06-esteiras`. Seguiu-se o prompt, conforme a hierarquia de fonte da verdade do `CLAUDE.md` (§2, item 2). `main`, `develop`, `homol` e toda a cadeia documental anterior foram preservadas; sem rebase, force-push ou exclusão de branches.

---

## 3. Referências principais de código auditadas

**Frontend**

- `src/routes/AppRoutes.tsx` — rotas e guardas
- `src/lib/shell/app-nav-config.ts` — itens de menu reais
- `src/pages/BacklogPage.tsx` — botões de criação no painel
- `src/features/esteiras/ConveyorCreateEditPage.tsx` — criação e alteração (tela única, 1398 linhas)
- `src/features/esteiras/NovaEsteiraPage.tsx`, `AlterarEsteiraPage.tsx` — invólucros
- `src/features/esteiras/nova-esteira/NovaEsteiraCreateTotemShell.tsx` — passos e campos reais
- `src/features/esteiras/nova-esteira/NovaEsteiraComposicaoManual.tsx` — estrutura, Qtd, Min/un., alocação
- `src/features/esteiras/nova-esteira/NovaEsteiraCatalogoPanel.tsx` — matrizes e extras
- `src/features/esteiras/nova-esteira/matrixToConveyorCreateInput.ts` — validações e mensagens
- `src/features/esteiras/nova-esteira/novaEsteiraDraftFromMatrix.ts` — cópia da matriz
- `src/features/esteiras/nova-esteira/novaEsteiraTotemUi.ts` — pendências, totais, trilho
- `src/features/esteiras/conveyorBasicDataExtras.ts` — prazo (Início/Fim previsto)
- `src/features/esteiras/conveyorEditSavePolicy.ts` — política de salvar e justificativa
- `src/features/esteiras/EsteiraDetalhePage.tsx` — detalhe (2182 linhas; ver §18)
- `src/features/esteiras/LateStructureAppendDrawer.tsx` — inclusão tardia
- `src/features/esteiras/AbortConveyorStepDialog.tsx`, `abortConveyorStepDialogLogic.ts` — dispensa
- `src/features/esteiras/ConveyorLifecycleReturnPanel.tsx`, `src/domain/conveyors/conveyorLifecycleActions.ts` — retrocessos
- `src/features/esteiras/ConveyorNodeWorkloadPanel.tsx`, `ConveyorOperationalEventsTimeline.tsx`, `ConveyorOperationalPlanCard.tsx`
- `src/domain/conveyors/conveyorOperationalStatus.ts`, `stepOperationalStatus.ts`, `operationalEventTaxonomy.ts`
- `src/domain/operational/activityOperationalQuantity.ts` — fórmula do previsto
- `src/components/backlog/BacklogTable.tsx`, `backlogRowActions.ts`, `BacklogDeleteConveyorDialog.tsx` — exclusão
- `src/features/documentos/ImportarOsPage.tsx`, `nova-esteira-documento/NovaEsteiraPorDocumentoPage.tsx`
- `src/features/operational-planning/PlanningPrincipalDeviationsPanel.tsx`, `PlanningWeekHistoryPanel.tsx`, `PlanningExecutionOutsidePlanPanel.tsx` — links quebrados
- `src/lib/operationalSemantics.ts` — rótulos do bloco de pendência

**Backend**

- `server/src/modules/conveyors/conveyors.routes.ts` — rotas e permissões
- `server/src/modules/conveyors/conveyors.schemas.ts` — validações, situações, quantidade
- `server/src/modules/conveyors/conveyorOperationalStatus.ts` — ciclo de vida e mensagens
- `server/src/modules/conveyors/conveyor-lifecycle.service.ts` — retrocessos
- `server/src/modules/conveyors/conveyors.service.ts` — criação, situação, estrutura incremental, exclusão
- `server/src/modules/conveyors/conveyor-structure-diff.ts` — diff e remoção
- `server/src/modules/conveyors/conveyor-step-operational.service.ts` — concluir / reabrir
- `server/src/modules/conveyors/conveyor-step-abort.service.ts`, `stepAbortReasons.ts` — dispensar / restaurar
- `server/src/modules/conveyors/conveyor-structure-append.service.ts` — inclusão tardia
- `server/src/modules/conveyors/stepOperationalStatus.ts` — situações da atividade
- `server/src/modules/conveyors/conveyorActivitySequence.logic.ts` — sequência
- `server/src/modules/conveyors/conveyorNodeWorkload.{repository,service}.ts` — previsto no detalhe
- `server/src/modules/production/production-time-entries.service.ts`, `conveyorAssignments.service.ts` — avanço automático
- `server/src/modules/operation-matrix/operation-matrix.repository.ts` — quantidade na matriz
- `server/migrations/0051_conveyor_step_abort_reasons.sql` — catálogo de motivos

---

## 4. Hierarquia real — confirmada

```text
Esteira → Tarefa → Setor → Atividade
```

Rótulos visíveis atuais, reconferidos: **Tarefa** / **Setor** / **Atividade** no detalhe, no resumo operacional, no compositor de estrutura e nas colunas do bloco de pendência (`nodeWorkloadLabels.colunas`). Mínimos cobrados: ≥1 tarefa por esteira, ≥1 setor por tarefa, ≥1 atividade por setor (Zod `.min(1)` e `validateManualStructure`). Nome obrigatório nos quatro níveis.

A ordem estrutural **é** a sequência operacional recomendada (`linearizeConveyorActivities`). Atividade fechada para sequência = concluída **ou** dispensada.

---

## 5. Formas de localizar e consultar

Rota `/app/esteiras/:id` está apenas sob autenticação — **sem** guarda de permissão: qualquer usuário autenticado consulta o detalhe completo. As ações é que são filtradas.

Entradas verificadas: Painel operacional (menu Ações → Consultar / Editar), Dashboard (dois conjuntos de gráficos), Minha fila, Minhas Atividades (tela oculta), Minha jornada, Jornada por colaborador, tela de Apontamento, Planejamento (agrupamento por esteira e painel de divergências de sincronização), e o retorno da criação Por documento.

**Três entradas quebradas** — ver §17, item 6.

---

## 6. Formas de criação — classificação completa

| Forma | Classificação | Evidência |
|---|---|---|
| Montar manualmente | **exposta** | menu **Nova esteira** + botão **Nova Esteira Manual**; `+ Adicionar tarefa manual` |
| A partir de matriz (base e/ou extras) | **exposta** | mesma tela; **Usar esta base** / **Trocar base** / arraste de tarefa |
| Por documento | **exposta** | menu **Por documento** + botão do painel; rota `/app/importar-os` |
| **Laboratório de Esteiras** | **oculta** — rota implementada, **sem item de menu e sem nenhum link** | `AppRoutes.tsx` linha 64; busca por `esteiras/laboratorio` retorna só a própria feature, `AppRoutes.tsx` e `src/lib/page-meta.ts`. **Reconfirmado nesta rodada** |
| Assistente antigo de Nova esteira (`NovaEsteiraDadosIniciais`, `NovaEsteiraPreviewFinal`, `review/*`, `NovaEsteiraPontoPartida`, `NovaEsteiraOrigemCards`, `NovaEsteiraMesaMontagem`, `NovaEsteiraModoEscolha`, `NovaEsteiraBloco*`, `NovaEsteiraRodape`, `NovaEsteiraPersistenciaBar`, `NovaEsteiraMontagemZonas`, `NovaEsteiraLeituraMontagem`, `NovaEsteiraJornadaEtapa`) | **código morto** — referenciado apenas por si mesmo, por outros arquivos mortos e por `src/mocks/` | nenhuma rota alcança; `/app/nova-esteira` → `ConveyorCreateEditPage` → `NovaEsteiraCreateTotemShell` |
| `EsteiraDetalheMockPage` (segundo bloco de `EsteiraDetalhePage.tsx`) | **código morto** — exportado e nunca importado | ver §18 |
| `novaEsteiraCreationMode.ts` (`full_matrix` / `matrix_plus_extras` / `manual`) | **legado** — tipos e rótulos sem consumidor na tela ativa | — |

**Documentadas no capítulo como disponíveis: as três expostas.** O Laboratório permanece apenas no capítulo 21. O assistente morto **não** foi documentado — e é a origem da correção factual do §17, item 1.

---

## 7. Dados gerais e validações (tela ativa)

Campos reais de **Nova esteira** / **Alterar Esteira**: **Nome** (obrigatório), **Cliente**, **Veículo**, **Placa**, **Modelo / versão**, **Início previsto** (seletor de data), **Fim previsto** (seletor de data), **Responsável** (lista de colaboradores), **Prioridade** (Baixa/Média/Alta, padrão **Média**), **Tempo total previsto (min)** (somente leitura, calculado), **Observações**.

- **Não existe campo de código/OS.** `conveyors.service.ts`: `const code: string | null = null` — o código nasce sempre vazio. A linha de identificação do detalhe cai no nome. O exemplo do campo Nome (*"OS 12345 · Gol GTI"*) é o único caminho prático para a OS.
- **Não existe verificação de duplicidade** de esteira (nome, cliente, placa). Não há índice único nem checagem de serviço. O `dupHint` da tela refere-se apenas a repetir a mesma matriz/tarefa no rascunho de estrutura.
- Validação de placa: nenhuma (texto livre, exibido em maiúsculas).
- Responsável: só por seleção; o nome é derivado da opção escolhida.

### Prazo estimado — ponto crítico reconferido

- A tela ativa **não tem** campo "Prazo estimado". Tem **dois seletores de data**: `type="date"`.
- `buildDadosParaApi` compõe o texto `"Início previsto: AAAA-MM-DD · Fim previsto: AAAA-MM-DD"` e grava nesse único campo de texto livre.
- `parseWizardPrazoForDisplay` devolve as duas datas no detalhe; prazo em formato antigo cai na linha **Prazo estimado** exibida como está.
- A criação **Por documento** mantém um campo único de texto **Prazo estimado**, sem validação nem placeholder, somente leitura quando a importação é do tipo Bravo v1.1.
- O campo que **pedia número de dias** (`prazoEstimadoFormatoAceito`, em `src/mocks/nova-esteira-dados-validacao.ts`) pertence ao assistente morto.
- Nenhuma correção de aplicação foi feita. O capítulo ensina apenas como a tela pede. Ressalva do capítulo 21 mantida e **corrigida na causa**.

---

## 8. Criação manual — passo a passo confirmado

Trilho de três passos (`deriveJornadaStepperSteps`): **Dados básicos → Estrutura → Revisão**, navegáveis livremente. `Continuar para estrutura` libera com nome preenchido.

Estrutura: `+ Adicionar tarefa manual` cria "Tarefa N" com um setor e uma atividade em branco (atividade nova nasce com **60 min/un.** e **1 un.**); `+ Setor nesta tarefa`; `+ Atividade neste setor`; setas ↑/↓ por nível; `Remover tarefa` / `Remover setor` / `Remover atividade` — os botões de remover e reordenar só aparecem quando há mais de um irmão.

**Preview/revisão:** não existe tela de preview separada. A revisão é o cartão **Antes de criar**, com Base / Tarefas / Setores / Atividades / Minutos (estrutura) e a lista de **Pendências** (*"Nada a corrigir para criar."* quando vazia). `Criar esteira` também está no cabeçalho, nos três passos.

---

## 9. Criação a partir de matriz

- Seleção: coluna **Bases e extras** → **Escolher base**, busca `Buscar base…`; cada matriz mostra `N tarefa(s) · N min estim.`.
- **Usar esta base** acrescenta todas as tarefas; **Trocar base** substitui as tarefas vindas de matriz e **preserva** as manuais (`swapMatrixBase`); **Extras** permite arrastar tarefa avulsa.
- Copiado: nomes, ordem (`order_index + 1`), `planned_minutes`, responsável padrão da atividade como **principal**, equipe padrão como apoio (nunca principal).
- **Não copiado: a quantidade prevista.** `emptyStepFromActivity` e `mapMatrixTreeToConveyorOptionsWithOrigin` fixam `plannedQuantity: 1`, embora `matrix_nodes.planned_quantity` exista e venha na árvore (`listSubtreeFromNode`, `operation-matrix.dto.ts`). **Divergência nova — §17, item 2.**
- Editável antes de criar (tela de criação) e depois (Alterar Esteira).
- **Independência:** a estrutura é materializada em nós próprios da esteira. A esteira guarda só snapshots de referência da matriz. Alterar a matriz depois **não** afeta esteiras criadas, e vice-versa. Confirmado — não inferido.

---

## 10. Criação por documento — visão geral

Item de menu **Por documento** → `/app/importar-os` → `NovaEsteiraPorDocumentoPage` (título **Nova esteira por documento**), sob a mesma permissão de criar esteiras. Aceita **somente PDF** (`accept=".pdf,application/pdf"`). O sistema devolve rascunho com **Dados sugeridos (editáveis)** e **Itens / etapas inferidos**; a confirmação é **Criar esteira no SGP+** e navega para o detalhe. Capítulo 6 documenta entrada e resultado e remete explicitamente ao **capítulo 17**.

---

## 11. Estrutura, responsável, equipe e alocação

Campos por atividade na estrutura: nome, **Qtd**, **Min/un.**, mais a faixa de alocação. Tarefa e setor têm apenas nome e ordem. Não há campo de dependência explícita: a dependência é a própria ordem. `required` existe no contrato e não é editável na tela. Tickets não fazem parte da estrutura (ver §16).

Distinções reais:

| Conceito | Onde | Papel |
|---|---|---|
| **Responsável** da esteira | Dados básicos | gestão e busca; **não** executa |
| **Colaborador alocado** | por atividade | executor estrutural |
| **Responsável principal** | por atividade | o colaborador com anel dourado; exatamente um quando há colaboradores |
| **Equipe** | por atividade | apoio; **nunca** principal |

- Primeiro colaborador alocado vira principal automaticamente (`assignCollaboratorToStep`); remover re-normaliza (`normalizePrimaryRows`).
- Equipe alocada **não** é expandida em membros.
- Alocar é **opcional** (`if (rows.length === 0) continue`).
- Troca de equipe e responsável da esteira são independentes.
- Integridade: colaborador inexistente/inativo e equipe inativa são recusados no servidor (`assertAssigneesValid`, `collaboratorActiveForOperations`).
- Alocação estrutural ≠ item planejado: a fila só recebe plano **publicado**. Mantido em nível conceitual, com remissão aos capítulos 8, 9, 10 e 13.

---

## 12. Tempo por unidade, quantidade prevista, total previsto

- **Min/un.**: inteiro ≥ 0 (`plannedMinutes: z.number().int().min(0)`); padrão 60 em atividade nova.
- **Qtd**: inteiro **≥ 1** (`plannedQuantity: z.number().int().min(1).optional().default(1)`); padrão 1. **Zero não é permitido; decimal não é permitido** (`parsePlannedQuantityInput` só aceita `^\d+$`).
- **Fórmula:** `total = tempo por unidade × quantidade` (`resolveActivityPlannedTotalMinutes`). Idêntica no servidor (`computeTotalsForOptions`) e no cliente.
- Exibição: `formatUnitAndTotalMinutes` → com qtd 1 mostra só o tempo; com qtd > 1 mostra `N un. × X min = Y min`.
- Mensagem real: *"A quantidade prevista deve ser um número inteiro maior ou igual a 1."*
- **O detalhe da esteira usa a quantidade corretamente** — `conveyorNodeWorkload.service.ts` chama `resolveActivityPlannedTotalMinutes`. **Reconferido por exigência do prompt (§8):** o defeito das jornadas **não** afeta o detalhe da esteira. A afirmação do capítulo 21 continua correta e não foi alterada.

### Regra atual de edição de quantidade — auditada sem usar decisão histórica

| Pergunta | Comportamento atual no código |
|---|---|
| quando a quantidade pode ser alterada? | **sempre**, em qualquer situação da esteira |
| a situação da esteira bloqueia? | **não**. `canReplaceConveyorStructure` retorna `true` incondicionalmente; `structureEditLocked = false` |
| justificativa é exigida fora de elaboração? | **sim** — `requiresEditReason`: modo edição + situação ≠ elaboração; motivo de 3 a 500 caracteres |
| e se a atividade já tem apontamentos? | **a alteração é aceita.** Não existe guarda por apontamento em nenhum ponto do caminho (`conveyor-structure-diff.ts`, `updateConveyorNodeStructureFields`). `hasTimeEntries` só é consultado na exclusão da esteira inteira |
| e se a atividade está concluída ou dispensada? | **aceita** |
| impacto | recalcula previsto da atividade, total da esteira e pendência de tempo; propaga para telas derivadas |
| inconsistência | **sim** — contraria `PROJECT_CONTEXT.md`: *"Quantidade prevista pode ser alterada quando a atividade ainda não possui apontamentos"*. **Divergência nova — §17, item 3.** Comportamento real documentado; nada "corrigido" por texto |

Constantes mortas confirmadas (nunca lançadas): `CONVEYOR_STRUCTURE_REPLACE_STATUS_MESSAGE`, `CONVEYOR_STRUCTURE_REPLACE_HAS_DEPENDENCIES_MESSAGE`, `STRUCTURE_TAB_BLOCKED_UX_MESSAGE`.

---

## 13. Situações da esteira — sete, confirmadas

Persistidas: `EM_ELABORACAO`, `AGUARDANDO_PLANEJAMENTO`, `EM_PLANEJAMENTO`, `A_INICIAR`, `EM_ANDAMENTO`, `FINALIZADA`, `CANCELADA`. Padrão de criação: `EM_ELABORACAO`.

Rótulos de usuário (idênticos no cliente e no servidor): **Rascunho / Em elaboração**, **Aguardando planejamento**, **Em planejamento**, **A iniciar**, **Em andamento**, **Finalizada**, **Cancelada**.

Legado mapeado somente em migração de dados: `NO_BACKLOG`, `EM_REVISAO`, `PRONTA_LIBERAR`, `EM_PRODUCAO`, `CONCLUIDA`.

Apontamento permitido apenas em **A iniciar** e **Em andamento**. Oculta para produção: **Rascunho / Em elaboração**.

### Matriz de transições

| De | Para | Como | Motivo? |
|---|---|---|---|
| Em elaboração | Aguardando planejamento | **Enviar para planejamento** | não |
| Aguardando planejamento | Em planejamento | **Aceitar e iniciar planejamento** | não |
| Em planejamento | A iniciar | **Liberar para produção** | não |
| A iniciar | Em andamento | **automática**, no primeiro apontamento (`shouldAutoStartLocked`, em `production-time-entries.service.ts` e `conveyorAssignments.service.ts`) | não |
| Em andamento | Finalizada | **Finalizar esteira** | não |
| qualquer aberta | Cancelada | **Cancelar esteira** | **não** — sem confirmação e sem motivo |
| Em planejamento / A iniciar / Em andamento | Aguardando planejamento | **Voltar para backlog** | **sim**, 3–500 |
| A iniciar / Em andamento | Em planejamento | **Voltar para planejamento** | **sim**, 3–500 |

- **Sem salto de etapa:** `ALLOWED_STATUS_TRANSITIONS` tem só os quatro pares diretos. Mensagem: *"Não é permitido mudar de X para Y."*; destino igual: *"Não é permitido alterar para o mesmo status."*
- **Nenhuma pré-condição de conteúdo** para avançar: não se exige estrutura mínima, responsável, prazo nem plano publicado. Finalizar **não** exige atividades concluídas.
- Publicar planejamento **não** avança a esteira, e avançar **não** publica planejamento.
- `CONVEYOR_FINISH_REQUIRES_MANAGER_MESSAGE` é inalcançável por esta rota: o controlador passa sempre `canEditStatus: true` e a rota já exige a permissão de situação. Documentado como "quem tem a permissão de situação".
- **Retrocessos:** destinos distintos — "backlog" leva a **Aguardando planejamento** (não a Em elaboração). Motivo é texto livre, **sem catálogo**. Apontamentos, histórico e estrutura preservados; itens já publicados permanecem no plano, mas a esteira sai das situações apontáveis.
- **Cancelamento de FINALIZADA:** `canTransitionConveyorStatus` aceitaria (`if (to === 'CANCELADA') return true`), mas `CONVEYOR_STATUS_TRANSITION_ACTIONS.FINALIZADA = []` e o detalhe só renderiza os botões dessa lista. **Pela interface, finalizada é terminal.** Documentado o que o usuário vê; divergência interface × servidor registrada em §17, item 7.

---

## 14. Situações da atividade — quatro reais

Tipo declara seis (`PENDING`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`, `REOPENED`, `ABORTED`). **Com caminho de escrita existem quatro:**

| Persistida | Rótulo | Escrita por |
|---|---|---|
| `PENDING` | **Pendente** | padrão de criação |
| `COMPLETED` | **Concluída** | `completeConveyorStepOnClient`, `serviceCompleteStep` |
| `REOPENED` | **Reaberta** | `serviceReopenStep` **e** restauração de dispensa |
| `ABORTED` | **Dispensada** | `serviceAbortConveyorStep` |

`IN_PROGRESS` e `BLOCKED` **não têm nenhum caminho de escrita** — nenhum serviço os grava. Não foram ensinados como estados.

Rótulos derivados de apresentação, não situações: selos **Atividade concluída** e **Dispensada** no detalhe; **Pendente** e **Reaberta** ficam **sem selo** (§17, item 5). Prontidão pela sequência é eixo separado.

Sequência: fechada = concluída **ou** dispensada (`isStepClosedForSequence`).

### Ações

| Ação | Pré-condição | Permissão | Confirmação / motivo |
|---|---|---|---|
| **Concluir atividade** | não concluída e não dispensada | criar esteiras (gestor) — **sem checar situação da esteira**; colaborador comum exige A iniciar/Em andamento **e** alocação | `window.confirm` simples; justificativa **obrigatória** se houver anterior em aberto |
| **Reabrir atividade** | **somente concluída** (`lockedStatus !== 'COMPLETED'` → recusa) | criar esteiras | janela com **Observação da reabertura** *(opcional)* |
| **Dispensar** | pendente/reaberta; esteira **não** finalizada nem cancelada | criar esteiras | janela com **Motivo** de catálogo + **Complemento obrigatório** quando exigido |
| **Restaurar** | **somente dispensada**; esteira **não** finalizada nem cancelada | criar esteiras | **nenhuma** — ação imediata |

- **Concluir sem apontamento é permitido** e idempotente (repetição não gera erro nem evento duplicado). **Não há toast de sucesso** na conclusão — a tela só recarrega.
- Reabrir limpa data/autor da conclusão no nó e preserva apontamentos; destino **Reaberta**.
- Dispensar **cancela os itens de plano vinculados** (`conveyor_operational_plan_items` e `operational_work_plan_items` → `CANCELLED`). Catálogo padrão (migration 0051, editável em Configurações operacionais): Não é mais necessária; Substituída por outra atividade; Erro de planejamento / escopo; Solicitação do cliente; **Outro** (exige complemento).
- Restaurar leva a **Reaberta** e **não reativa os planos** (`plansNotReactivated: true`). Replanejar e **publicar** é obrigatório para voltar à execução — relacionado ao defeito já documentado no capítulo 21 (dispensada indevidamente planejável), tratado como pendência, não como comportamento desejado.
- **O botão Dispensar existe só no detalhe.** No compositor de estrutura ele está condicionado a `readOnly`, que é sempre `false` na tela de alteração — portanto nunca renderiza ali. Não foi ensinado como disponível na tela de alteração.

---

## 15. Exclusão estrutural × dispensa

**Remoção estrutural** (Alterar Esteira → Estrutura → Remover… → Salvar):

- permitida em **qualquer** situação, inclusive com apontamentos; sem mensagem de recusa;
- o último item de cada nível não é removível (mínimos do contrato);
- `partitionRemovalSubtrees` + `findNodeIdsWithStructureDeps`: subárvore **sem** dependências → **exclusão física**; **com** dependências (apontamento, plano, evento, atividade concluída/dispensada) → **desativação silenciosa**, preservando histórico. A tela não informa qual dos dois ocorreu;
- totais recalculados; evento **Estrutura da esteira atualizada**.

**Exclusão da esteira inteira** — no Painel operacional (capítulo 5), menu Ações → Excluir; visível até **A iniciar** (`DELETE_ELIGIBLE_STATUSES`); exclusão física bloqueada por apontamento (*"Esta esteira já possui apontamentos e não pode ser excluída. Cancele ou finalize para preservar o histórico."*) ou por plano/itens (*"Esta esteira já possui movimentações e não pode ser excluída."*).

A distinção foi documentada em tabela comparativa no capítulo 6, com a orientação: dispensar quando o trabalho existia e não será feito; remover só erro de cadastro.

---

## 16. Inclusão tardia — quatro modos, comprovados

`INTENT_OPTIONS` em `LateStructureAppendDrawer.tsx` e `appendKind` em `conveyors.schemas.ts`:

| Modo | Rótulo | `appendKind` | Destino |
|---|---|---|---|
| 1 | **Tarefa da Matriz** | `OPTION` | nova tarefa no fim da esteira |
| 2 | **Tarefa manual** | `OPTION` | nova tarefa no fim da esteira |
| 3 | **Setor em tarefa existente** | `AREA` | fim da tarefa escolhida |
| 4 | **Atividade em setor existente** | `STEP` | fim do setor escolhido |

- Janela **Incluir novo item**; aviso: *"A estrutura existente permanece intacta. Itens novos entram no Backlog do Planejamento Semanal quando geram atividades."*
- **Motivo da inclusão obrigatório**, 3–500, com contador. Mesmas regras de Qtd/Min/un. e de alocação.
- Append-only: `nextSiblingOrderIndex`; nenhuma renumeração, nenhum apontamento afetado. Operação idempotente por chave.
- Mensagem de sucesso: *"Novo item incluído. As novas atividades estão disponíveis no Backlog do Planejamento Semanal."*; evento **Item incluído na esteira** com o motivo.
- Gravação **imediata** no confirmar — não depende de **Salvar alterações**.

### Disponibilidade por situação — hotfix reconferido

| Camada | Comportamento |
|---|---|
| Interface | `showLateAppendAction = mode === 'edit' && canAlterConveyor` — **sem condição de situação** |
| Servidor | `serviceAppendConveyorStructureItem` chama apenas `assertCanAppend` (permissão). **Nenhuma verificação de situação em nenhum ponto** |

**É literalmente "qualquer status", incluindo Finalizada e Cancelada** — interface e servidor concordam. Não há divergência entre as camadas, e **não há sinalização de risco na tela**. Conforme o prompt, o risco operacional foi apresentado no capítulo 6 como critério de uso (não como aviso inexistente da interface) e registrado no capítulo 21. Contraste relevante: dispensa e restauração **são** bloqueadas em esteira finalizada/cancelada; a inclusão é a exceção.

### Efeito no planejamento

Metadados do item novo: `lateAddToWeeklyBacklog: true`. Não entra no plano da semana; fica no **Backlog operacional**; não chega à fila sem **publicação**. Sequência documentada: incluir → planejar → publicar, com remissão aos capítulos 8 e 9. Alocação estrutural no item novo não o coloca em fila alguma.

### Tickets

**Existe no detalhe da esteira** e é relevante ao capítulo: botão **Imprimir tickets** → janela **Imprimir tickets da esteira**, com agrupamento **Estrutura da esteira** / **Tarefa** / **Responsável** e a opção **Incluir atividades concluídas** (desligada por padrão). Desabilitado sem atividades elegíveis. **Não** fazem parte da estrutura da esteira. A impressão de ticket isolado por item de plano foi remetida aos capítulos 8 e 9, sem duplicação.

### Histórico visível

Bloco **Eventos operacionais**: *"Histórico de mudanças relevantes da esteira."*, agrupado por data, filtros **Todos / Atrasos / Conclusões / Reaberturas / Bloqueios / Paradas / Observações / Outros** com contagem, e **Carregar mais** (teto 200). Registra conclusão, reabertura, dispensa, restauração, inclusão tardia, edição de estrutura, atraso e os dois retrocessos (com motivo). **Não registra avanços de situação nem cancelamento** — §17, item 4.

---

## 17. Divergências novas comprovadas nesta rodada

1. **Causa do defeito de prazo estava errada na documentação.** O capítulo 21 (e o capítulo 5) afirmavam que o campo **Prazo estimado** da Nova esteira "pede um número de dias". A tela ativa **não tem esse campo**: tem **Início previsto** e **Fim previsto** (seletores de data), que gravam o texto `"Início previsto … · Fim previsto …"`. O campo numérico pertence ao assistente morto (`NovaEsteiraDadosIniciais` + `src/mocks/nova-esteira-dados-validacao.ts`). O campo de texto livre **Prazo estimado** sobrevive só em **Por documento** e na exibição de prazos antigos. **A falha de leitura de atraso permanece** — e, na prática, esteira criada pela tela atual tende a **nunca** ser contada como atrasada. **Capítulo 21 corrigido nesta rodada; o texto equivalente do capítulo 5 ficou pendente** (capítulo 5 deve permanecer intacto por regra desta atividade).
2. **Criação a partir de matriz descarta a quantidade prevista.** `plannedQuantity: 1` fixo em `novaEsteiraDraftFromMatrix.ts:55` e `matrixToConveyorCreateInput.ts`, apesar de `matrix_nodes.planned_quantity` existir e vir na árvore. Subestima o previsto desde a criação. Registrado no capítulo 21 e alertado no capítulo 6.
3. **Quantidade prevista editável sem bloqueio por apontamento** — contraria `PROJECT_CONTEXT.md`. Única barreira: justificativa fora de elaboração. Registrado no capítulo 21.
4. **Histórico não registra avanço de situação nem cancelamento.** `conveyorOperationalEventTypeValues` não tem tipo de mudança de situação; `servicePatchConveyorStatus` não cria evento. Agravado por **Cancelar/Finalizar sem confirmação e sem motivo**. Os filtros **Bloqueios** e **Paradas** ficam sempre em zero (esses tipos nem existem no servidor). Registrado no capítulo 21.
5. **Atividade reaberta não tem selo** — visualmente idêntica a pendente; o mesmo vale para dispensa restaurada. Registrado no capítulo 21.
6. **Três links de esteira quebrados no Planejamento semanal.** `PlanningPrincipalDeviationsPanel.tsx:128`, `PlanningWeekHistoryPanel.tsx:193` e `PlanningExecutionOutsidePlanPanel.tsx:62` usam `/esteiras/:id` sem o prefixo `/app`; a rota não existe e o catch-all (`AppRoutes.tsx:275`) redireciona para a tela inicial. Rótulos: **Abrir esteira** / **Ver esteira**. Registrado no capítulo 21.
7. **Cancelamento de esteira finalizada: interface × servidor.** O servidor aceitaria `FINALIZADA → CANCELADA`; a interface não oferece ação. Capítulo 6 documenta o que o usuário vê (terminal). Não levado ao capítulo 21 por não produzir efeito observável pelo usuário — fica registrado aqui para decisão de produto.
8. **Aviso de permissão expõe nome interno** no detalhe e na tela Alterar Esteira quando falta a permissão de situação. Acrescentado à tabela de ajustes de texto do capítulo 21.
9. **`CONVEYOR_STEP_OUT_OF_SEQUENCE_TIME_ENTRY` sem rótulo no cliente** — cai em *"Evento operacional"* / categoria **Outros** no histórico. Impacto baixo; não levado ao capítulo 21.
10. **`EsteiraDetalheMockPage` é código morto** dentro de `EsteiraDetalhePage.tsx` (ver §18). Confirma — e não contradiz — o capítulo 21: menu de gestão por atividade, "Ver histórico" por atividade e os estados bloqueada/pausada **não** são acessíveis.

### Confirmações que **não** geraram divergência

- **Laboratório de Esteiras** segue sem item de menu e sem link. Capítulo 21 inalterado nesse ponto.
- **O detalhe da esteira usa a quantidade prevista corretamente.** O defeito das jornadas (capítulos 11 e 12) **não** se estende ao detalhe. Reconferido por exigência do prompt; o capítulo 21 já afirmava isso e continua correto.
- Bloquear e pausar atividade continuam inexistentes.
- Catálogo de motivos de dispensa continua com as cinco entradas da migration 0051.

---

## 18. Código morto relevante à leitura do capítulo

`src/features/esteiras/EsteiraDetalhePage.tsx` tem **dois** blocos de renderização. O exportado (`EsteiraDetalhePage`) usa `EsteiraDetalheBasicoReal` — o detalhe real. `EsteiraDetalheMockPage`, baseado em mocks, é exportado e **nunca importado**: dele vêm o `GestorAtividadeMenu`, o botão "Ver histórico" por atividade, o botão "Apontar" por atividade e os rótulos "Bloqueada"/"Pausada". **Nada disso foi documentado**, pois nada disso é alcançável.

---

## 19. Matriz técnica (`MANUAL_FUNCIONAL_SGP.md`)

Reconferida nos pontos tocados por esta rodada. Dois registros existentes foram confirmados como corretos:

- linha 1072: quarto caminho de criação via Laboratório, sob a permissão de criar esteiras — correto;
- linha 3643: Laboratório sem item de menu e sem nenhum link de entrada — correto.

Nenhum erro factual objetivo foi encontrado nos trechos auditados. **Arquivo não alterado**, conforme a regra de só alterar com erro comprovado. As divergências novas do §17 são de produto/código, não erros da matriz; a matriz poderá incorporá-las em rodada própria.

---

## 20. Alterações no capítulo 21

| Alteração | Natureza |
|---|---|
| Causa do defeito de prazo reescrita, com tabela por tela e nota de correção datada | **correção factual** (item 1 do §17) |
| "Criação a partir de matriz descarta a quantidade prevista" | bloco novo |
| "Quantidade prevista pode ser alterada mesmo com horas já apontadas" | bloco novo |
| "Incluir novo item é aceito em esteira finalizada ou cancelada" | bloco novo |
| "O histórico da esteira não registra o avanço de situação nem o cancelamento" | bloco novo |
| "Atividade reaberta não se distingue de atividade pendente" | bloco novo |
| "Links de esteira quebrados no Planejamento semanal" | bloco novo |
| Linha sobre o aviso de permissão com nome interno, na tabela 21.3 | linha nova |

Tabelas e blocos anteriores do capítulo 21 preservados.

---

## 21. Estrutura editorial do capítulo 6

Seis blocos principais confirmados, nesta ordem: **Para que serve**, **Onde fica**, **Quem costuma ter acesso**, **Como fazer**, **O que esperar**, **Quando algo é bloqueado**.

23 subseções em "Como fazer" (6.1 a 6.23). 846 linhas. **6 marcadores de imagem**, no teto permitido, cobrindo: detalhe da esteira; estrutura tarefa → setor → atividade; passo Estrutura da criação; cabeçalho com situação e ações; dispensa × reabertura; janela Incluir novo item.

Fronteiras respeitadas: planejamento semanal remetido aos capítulos 8 e 9 (sem repetir o passo a passo); formulário de apontamento remetido ao capítulo 7; importação por documento remetida ao capítulo 17 (apenas entrada e resultado); recortes do painel e cálculo de atraso remetidos ao capítulo 5; fila e Modo Fábrica remetidos aos capítulos 10 e 13; Laboratório mantido só no capítulo 21.

**Pendência editorial registrada:** o bloco **Plano Operacional da Esteira** (regras `POP-*` da matriz técnica) vive no detalhe da esteira e **não tem capítulo** no manual do usuário. O capítulo 6 reconhece o bloco, diz para que serve e declara explicitamente que o passo a passo não é coberto nesta revisão. Não foi inventado fluxo.

---

## 22. Validações executadas

### Git

```
$ git status --short
 M docs/manual/source/MANUAL_USUARIO_SGP.md     (antes de criar este retorno)

$ git diff --check
(sem saída — nenhum problema de whitespace)

$ git diff --name-only f5d179d94cfa3156ad7d57a180537b4383b5d114
docs/manual/source/MANUAL_USUARIO_SGP.md
```

### Escopo do manual — verificação programática

Comparação capítulo a capítulo entre a base `f5d179d9` e o estado atual:

```
cap  1: INTACTO     cap  2: INTACTO     cap  3: INTACTO     cap  4: INTACTO
cap  5: INTACTO     cap  7: INTACTO     cap  8: INTACTO     cap  9: INTACTO
cap 10: INTACTO     cap 11: INTACTO     cap 12: INTACTO     cap 13: INTACTO
cap 14: INTACTO     cap 15: INTACTO     cap 16: INTACTO     cap 17: INTACTO
cap 18: INTACTO     cap 19: INTACTO     cap 20: INTACTO
cap  6: alterado (esperado) — 13 -> 846 linhas
cap 21: alterado (esperado) — 191 -> 289 linhas
```

**Nenhuma referência cruzada foi inserida em capítulo alheio** — as remissões estão todas dentro do capítulo 6. Capítulos 4 e 14–19 confirmados ainda com o marcador `PENDENTE DE ENRIQUECIMENTO`; capítulo 6 sem o marcador.

### Cabeçalho

Antes: *"capítulos 1 a 3, 5, 7 a 13, 20 e 21 com conteúdo final. Os capítulos 4, 6 e 14 a 19 seguem marcados como pendentes"*
Depois: *"capítulos 1 a 3, 5 a 13, 20 e 21 com conteúdo final. Os capítulos 4 e 14 a 19 seguem marcados como pendentes"*

Concluídos: 1 a 3, 5 a 13, 20 e 21. Pendentes: 4, 14 a 19. **Confere com o estado esperado.** Redação do cabeçalho preservada; nenhum outro metadado alterado.

### Linguagem técnica no capítulo 6

Varredura por palavra, com e sem distinção de maiúsculas, de: STEP, endpoint, backend, migration, schema, repository, query, UUID, payload, enum, API, URL, conveyor(s), nomes de tabela, nomes de função, códigos internos de situação e nomes técnicos de permissão.

**Resultado: nenhuma ocorrência.** Varredura adicional por tokens em caixa alta (`[A-Z][A-Z_]{3,}`) retornou apenas `IMAGEM` e `SUGERIDA`, dos marcadores de imagem. **Nenhuma ocorrência literal inevitável a justificar.** As permissões são citadas por função ("permissão de criar esteiras", "permissão de mudar situação"), nunca por código.

### Aplicação

Build, lint e testes **não foram executados**: tarefa exclusivamente documental, sem alteração de `src/`, `server/`, migrations, testes, CSS, assets, `package.json`, `app-version.json` ou HTML/PDF. Conforme §15 do prompt, não são obrigatórios — **e não se alega execução que não houve**.

### Execução visual

**Não houve.** A auditoria foi feita integralmente por leitura de código no tip confirmado. Rótulos, mensagens e textos de tela citados no capítulo foram extraídos literalmente dos arquivos-fonte, não de observação em tela.

---

## 23. Branches preservadas

`main`, `develop`, `homol` e todas as branches documentais anteriores (`docs/manual-usuario-sgp-base-p0`, `cap05`, `cap07` a `cap13`, `docs/auditoria-cobertura-funcional-manual-sgp`) **intactas**. Sem rebase, sem force-push, sem exclusão de branches, sem PR e sem merge.

---

## 24. Pendências, riscos e ressalvas

1. **Capítulo 5 tem a mesma afirmação incorreta sobre o campo Prazo estimado** (callout "Limitação atual — leia antes de confiar no cartão Em atraso"). Não foi corrigido porque esta atividade exige o capítulo 5 textualmente intacto. **Precisa de rodada própria.**
2. Decisão humana pendente sobre a cópia da quantidade prevista a partir da matriz (§17, item 2).
3. Decisão humana pendente sobre bloquear a edição de quantidade em atividade com apontamentos (§17, item 3).
4. Decisão humana pendente sobre registrar avanço de situação e cancelamento no histórico, e sobre exigir confirmação/motivo no cancelamento (§17, item 4).
5. Decisão humana pendente sobre restringir a inclusão tardia em esteira finalizada/cancelada (§16).
6. Decisão humana pendente sobre o selo da atividade reaberta (§17, item 5).
7. Correção dos três links quebrados do Planejamento semanal (§17, item 6).
8. O **Plano Operacional da Esteira** segue sem capítulo no manual do usuário (§21).
9. Defeitos herdados e ainda abertos, já documentados: quantidade ignorada nas jornadas; atividade dispensada indevidamente planejável; rótulo "Mês atual (UTC)".

---

## 25. Próximo passo recomendado

Não iniciar outro capítulo automaticamente. Conforme §19 do prompt, os próximos prioritários são **Capítulo 14 — Evolução das Esteiras** e **Capítulo 17 — Importação por documento**.

Achado desta rodada relevante à ordenação: o capítulo 6 já estabeleceu a entrada e o resultado da criação **Por documento** e remete ao capítulo 17 em dois pontos. A remissão fica pendente de destino real até que o capítulo 17 seja escrito — o que favorece **priorizar o 17 antes do 14**.

Sugere-se, antes ou junto do próximo capítulo, uma rodada curta de correção do callout do capítulo 5 (item 1 de §24).

---

## 26. Estado final

- **Branch:** `docs/manual-usuario-sgp-cap06-esteiras`
- **SHA base:** `f5d179d94cfa3156ad7d57a180537b4383b5d114`
- **SHA final:** obtido por `git rev-parse origin/docs/manual-usuario-sgp-cap06-esteiras`
- **Working tree após commit:** limpo
- **Commit/push:** commit documental único, push para a branch acima. Sem PR, sem merge, sem rebase, sem force-push, sem exclusão de branches.
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.
