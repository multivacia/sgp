# Retorno — manual-usuario-sgp-cap14-evolucao-esteiras

- **TASK_ID:** `manual-usuario-sgp-cap14-evolucao-esteiras`
- **Data/hora:** 2026-10-04 (UTC)
- **Repositório:** `multivacia/sgp`
- **Branch criada:** `docs/manual-usuario-sgp-cap14-evolucao-esteiras`
- **SHA base:** `8c8999fe2a8124a39317b4c343932c06633cb6a2` (tip de `origin/docs/manual-usuario-sgp-fix-cap05-prazo`, igual ao esperado `8c8999fe`)
- **SHA final:** ver `git rev-parse origin/docs/manual-usuario-sgp-cap14-evolucao-esteiras` — não pode constar dentro do próprio commit
- **Status final:** concluído e publicado; working tree limpa.

## Objetivo

Construir e publicar o **Capítulo 14 — Evolução das Esteiras** do Manual do Usuário SGP+, com auditoria funcional prévia no código atual como única fonte de verdade.

## Verificação da base (antes de qualquer alteração)

| Verificação | Resultado |
|---|---|
| `git fetch origin --prune` | executado |
| `origin/docs/manual-usuario-sgp-fix-cap05-prazo` existe | sim |
| Tip remoto | `8c8999fe2a8124a39317b4c343932c06633cb6a2` — **confere** |
| Cadeia documental anterior como ancestral | confirmada por `git merge-base --is-ancestor` para as 10 branches: `base-p0`, `cap05-painel-operacional`, `cap06-esteiras`, `cap07-apontamentos`, `cap08-planejamento-semanal`, `cap09-agenda-semana`, `cap10-minha-fila`, `cap11-minha-jornada`, `cap12-jornada-gerencial`, `cap13-modo-fabrica` — todas **ANCESTOR OK** |
| Branch criada a partir do tip exato | `git checkout -b docs/manual-usuario-sgp-cap14-evolucao-esteiras 8c8999fe2a81…` |

## Arquivos alterados

| Arquivo | Ação |
|---|---|
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | alterado — somente o intervalo do Capítulo 14 |
| `docs/ai/returns/manual-usuario-sgp-cap14-evolucao-esteiras-retorno.md` | criado |

Diff: **1 arquivo de manual, 286 inserções, 6 remoções**. As 6 remoções são exatamente as linhas do marcador pendente e os 5 tópicos do esqueleto.

Nenhum arquivo de código, teste, migration, configuração, CSS, asset, HTML ou PDF foi tocado.

## Principais arquivos de código auditados

**Frontend**

- `src/routes/AppRoutes.tsx` (rota e guard)
- `src/lib/shell/app-nav-config.ts` (item de menu)
- `src/routes/RequirePermission.tsx`
- `src/features/conveyor-progress/ConveyorProgressPage.tsx` (componente principal)
- `src/features/conveyor-progress/ConveyorProgressFilters.tsx`
- `src/features/conveyor-progress/ConveyorProgressTable.tsx`
- `src/features/conveyor-progress/ConveyorProgressSummary.tsx`
- `src/features/conveyor-progress/ConveyorProgressMetricsCells.tsx`
- `src/features/conveyor-progress/ConveyorProgressAnalyticalEntries.tsx`
- `src/features/conveyor-progress/ConveyorProgressPrintView.tsx`
- `src/features/conveyor-progress/useConveyorProgressPrint.ts`
- `src/domain/conveyor-progress/conveyorProgress.types.ts`
- `src/domain/conveyor-progress/conveyorProgressDisplay.ts`
- `src/domain/conveyor-progress/conveyorProgressMetrics.ts`
- `src/services/conveyor-progress/conveyorProgressApiService.ts`
- `src/domain/conveyors/conveyorOperationalStatus.ts`
- `src/features/operational-planning/planningExecutionHelpers.ts` (rótulos de situação da atividade)
- `src/features/operational-tickets/activityTicketProgressSource.ts`, `activityTicketPrintModel.ts`, `useActivityTicketPrint.ts`, `thermalTicketPrintSheets.ts`, `thermalTicketPrintQueue.ts`
- `src/domain/operational/workDate.ts`
- `src/lib/errors/sgpErrorContract.ts`, `src/lib/errors/SgpErrorPresentation.tsx`
- `src/lib/shell/transient-context.tsx`, `src/lib/shell/shell-function-context.tsx`, `src/components/shell/TransientLeaveConfirmDialog.tsx`, `src/components/AppSidebar.tsx`

**Backend**

- `server/src/modules/conveyor-progress/conveyor-progress.routes.ts`
- `server/src/modules/conveyor-progress/conveyor-progress.controller.ts`
- `server/src/modules/conveyor-progress/conveyor-progress.schemas.ts`
- `server/src/modules/conveyor-progress/conveyor-progress.dto.ts`
- `server/src/modules/conveyor-progress/conveyor-progress.service.ts`
- `server/src/modules/conveyor-progress/conveyor-progress.repository.ts`
- `server/src/shared/conveyorProgressMetrics.ts`
- `server/src/shared/activityOperationalQuantity.ts`
- `server/migrations/0013_app_permissions.sql`, `0006_conveyor_assignees_and_time_entries.sql`, `0023_conveyor_assignees_team_support.sql`

**Testes lidos como evidência (não executados — ver Validações)**

- `src/features/conveyor-progress/conveyorProgressPage.test.ts`
- `server/src/tests/conveyor-progress.service.test.ts`

## Rota, navegação e componente

| Item | Valor comprovado |
|---|---|
| Rota frontend | `/app/gestao/evolucao-esteiras` (`AppRoutes.tsx:123`) |
| Item de menu | **Evolução das Esteiras**, `navGroup: 'gestao'` → bloco **Gestão** (`app-nav-config.ts:100-106`) |
| Componente principal | `ConveyorProgressPage` (`src/features/conveyor-progress/ConveyorProgressPage.tsx:54`) |
| Guard de rota | `<RequirePermission permission="conveyors.create">` (`AppRoutes.tsx:125`) |
| Consulta de dados | `GET /api/v1/management/conveyor-progress` (`conveyorProgressApiService.ts:22`) |
| Rota backend | `conveyor-progress.routes.ts:10` — `requireAuth()` + `requirePermission('conveyors.create')` |
| Lista de colaboradores (filtro) | `GET /collaborators` — apenas `requireAuth()` (`collaborators.routes.ts:37`) |

Não há segunda rota nem rota oculta para esta tela. O título da página é `Evolução das Esteiras` com subtítulo fixo.

## Permissões encontradas

- Permissão única: **`conveyors.create`** — rótulo no banco `'Esteiras: criar'` (`0013_app_permissions.sql:43`).
- Concessão: **ADMIN** recebe todas as permissões; **GESTOR** recebe `conveyors.create` explicitamente (`0013_app_permissions.sql:53-75`). **COLABORADOR** não recebe linhas.
- Dupla verificação: guard de rota no frontend + `requirePermission` no servidor. Sem permissão o frontend exibe `Sem permissão para esta área`.
- No manual o acesso foi descrito **por permissão** ("quem pode criar esteiras") e não por nome de perfil, com menção de que na configuração padrão corresponde a administração e gestão.

## Campos exibidos

**Tabela (9 colunas, mesmas em todos os níveis):** Item, Status, Previsto, Realizado, Falta, Excedente, Evolução, Eficiência, Seleção.

**Linha Resumo geral:** contagem de esteiras, Previsto, Realizado, Falta, Excedente, Evolução média, Eficiência ponderada.

**Por nível:**

| Nível | Campos próprios |
|---|---|
| Esteira | código, nome, situação operacional, métricas, eficiência agregada, caixa de seleção |
| Tarefa | nome, métricas, eficiência agregada. Status sempre `—` |
| Setor | nome, métricas, eficiência agregada. Status sempre `—` |
| Atividade | nome, responsável principal (subtítulo), situação, métricas, eficiência individual, botão **Imprimir ticket** |
| Apontamento | data de realização, nome do colaborador, selo de forma de registro (`entryMode`), tempo, observação, quantidade executada (`Qtd`) |

**Não exibidos:** quantidade prevista em coluna própria (entra embutida no previsto); equipes e alocações secundárias; total de pendências; ordem estrutural numerada.

## Cálculos e consolidações identificados

### Previsto da atividade

`resolveActivityPlannedTotalMinutes(planned_minutes, planned_quantity)` = **tempo unitário × quantidade prevista**; quantidade ausente/inválida → **1** (`activityOperationalQuantity.ts:48-55`). Confirmado pelo teste *"previsto da evolução é unitário × quantidade; quantidade ausente permanece × 1"*.

> **Nota comparativa:** aqui o previsto **considera** corretamente a quantidade prevista. Este é o comportamento correto, diferente do defeito aberto registrado nos capítulos 12 e 21 (jornada por colaborador, que assume 1 unidade).

### Métricas base (`computeConveyorProgressMetrics`)

```text
remainingMinutes  = max(previsto − realizado, 0)
exceededMinutes   = max(realizado − previsto, 0)
progressPercent   = previsto > 0 ? round(realizado / previsto × 100) : 0
```

`progressPercent` **não é limitado a 100** (o teste usa 264%); apenas a barra visual é truncada em 100%.

### Consolidação hierárquica

- Setor: previsto = soma do **previsto efetivo** das atividades; realizado = soma do realizado das atividades.
- Tarefa: soma dos setores. Esteira: soma das tarefas.
- **Previsto efetivo:** `effectivePlannedMinutesForAggregate` → **0 se a atividade está `ABORTED` (Dispensada)**; caso contrário, o previsto original (`conveyor-progress.service.ts:39-44`).
- O item da atividade **preserva o previsto original** na sua própria linha (comentário explícito em `service.ts:155`; teste confirma `aborted.plannedMinutes === 40` com `conveyor.plannedMinutes === 60`).

### Eficiência individual (`computeTimeEfficiencyMetrics`)

```text
efficiencyPct   = previsto / realizado × 100      (arredondado a 1 decimal)
deviationMinutes = realizado − previsto
deviationPct     = (deviationMinutes / previsto) × 100   (arredondado a 1 decimal)
```

Faixas (`classifyTimeEfficiency`, `conveyorProgressMetrics.ts:70-80`):

| Classificação | Regra |
|---|---|
| `MAIS_RAPIDO` → "Mais rápido que previsto" | realizado **<** previsto |
| `DENTRO_DO_PREVISTO` → "Dentro do previsto" | realizado **=** previsto |
| `LEVE_DESVIO` → "Leve desvio" | `deviationPct <= 10` |
| `ATENCAO` → "Atenção" | `deviationPct <= 30` |
| `CRITICO` → "Crítico" | `deviationPct > 30` |

Estados **sem base de cálculo** (`includedInCalculation: false`):

| Estado | Condição |
|---|---|
| `SEM_TEMPO_PREVISTO` → "Sem tempo previsto" | previsto nulo ou `<= 0` |
| `NAO_INICIADA` → "Não iniciada" | previsto > 0, realizado = 0, não concluída |
| `CONCLUIDA_SEM_APONTAMENTO` → "Concluída sem apontamento" | previsto > 0, realizado = 0, concluída |

`isCompleted` só é verdadeiro para `COMPLETED` (`isCompletedStepStatus`). Atividade `REOPENED` com apontamento entra como **parcial**.

### Eficiência ponderada (`consolidateWeightedTimeEfficiency`)

Soma previsto e realizado **apenas das atividades com `includedInCalculation: true`**, depois aplica as mesmas faixas. Devolve tudo nulo quando `includedInCalculationCount === 0` **ou** `totalPlanned <= 0` **ou** `totalRealized <= 0`. Contadores sempre devolvidos: `notStartedCount`, `withoutPlannedTimeCount`, `completedWithoutTimeCount`, `partialCount`, `includedInCalculationCount` — exibidos como linha de apoio ("`4 no cálculo · 1 parcial · 2 não iniciadas`").

Para a atividade dispensada, `buildActivityEfficiencyInput` força `plannedMinutes: null` e `isCompleted: false`, retirando-a da base.

### Resumo geral — dois cálculos de origens diferentes

- **Previsto / Realizado / Falta / Excedente / Evolução média:** calculados **no frontend** por `computeConveyorProgressSummary` sobre `items`.
- **Eficiência ponderada:** vem **do backend** (`data.summary.timeEfficiency`), consolidada sobre todas as atividades dos itens devolvidos.
- **Falta e Excedente do resumo são líquidos:** `max(somaPrevisto − somaRealizado, 0)` e `max(somaRealizado − somaPrevisto, 0)`. Esteira adiantada compensa esteira atrasada.
- **Evolução média** = `round(média dos progressPercent das esteiras com previsto > 0)` — **não** é realizado total ÷ previsto total.

## Filtros

| Filtro | Campo | Onde atua | Comprovação |
|---|---|---|---|
| Período | duas datas (`timeEntryFrom` / `timeEntryTo`) | **apenas nos apontamentos** (`te.entry_at`) — não restringe esteiras nem previsto | `repository.ts:172-179` |
| Esteira | texto livre | `c.name ILIKE` **OR** `c.code ILIKE` | `repository.ts:58-61` |
| Status | lista das 7 situações operacionais | `c.operational_status =` | `repository.ts:62-65` |
| Agrupar por | `select` **desabilitado**, valor fixo `hierarchy` | nenhum efeito | `ConveyorProgressFilters.tsx:109` |
| Colaborador (avançado) | lista de colaboradores **ativos** | duas camadas: restringe esteiras (apontamento **ou** alocação da pessoa) e restringe os apontamentos exibidos | `repository.ts:242-268`; `service.ts:278-289` |
| Somente com tempo excedido (avançado) | checkbox | filtra **no nível da esteira**: `item.exceededMinutes > 0` | `service.ts:299-301` |

- Debounce de **350 ms**; a consulta é refeita automaticamente (`ConveyorProgressPage.tsx:90-93`).
- Validação no servidor: `search` ≤ 200 caracteres, `operationalStatus` restrito à lista, datas em formato de instante com offset, `collaboratorId` em formato de identificador.

## Ordenações (fixas, sem controle na interface)

| Nível | Ordem |
|---|---|
| Esteiras | `c.created_at DESC` — mais recentes primeiro |
| Tarefas | ordem estrutural (`option_order`) |
| Setores | ordem estrutural (`area_order`) |
| Atividades | ordem estrutural (`step_order`) |
| Apontamentos | `te.entry_at DESC` — mais recentes primeiro |

## Indicadores visuais

- Barra de progresso na coluna Evolução; âmbar quando há excedente, dourado caso contrário; largura truncada em 100%.
- Excedente em âmbar com prefixo `+`; `—` quando zero.
- Selo de classificação: verde (`MAIS_RAPIDO`), azul (`DENTRO_DO_PREVISTO`), vermelho (`CRITICO`), âmbar (restantes).
- Selos de situação por heurística de texto (`statusBadgeVariant`): contém "andamento"/"iniciar" → azul; "aberta"/"pend" → verde; "conclu"/"finaliz" → neutro.
- Formato de duração: `02h30`, `0h45` (`formatConveyorProgressDuration`).

## Ações disponíveis

| Ação | Nível | Observação |
|---|---|---|
| Expandir / recolher | esteira, tarefa, setor, atividade | seta só aparece com conteúdo abaixo |
| Selecionar | **apenas esteira** | caixa por linha + caixa do cabeçalho (seleciona a página atual, com estado indeterminado) |
| **Gerar PDF** | seleção de esteiras | `window.print()` — abre a janela de impressão do navegador |
| **Imprimir ticket** | **apenas atividade** | ticket térmico individual |
| Paginar | tabela | 10 / 25 / 50 linhas; padrão 25 |
| **Tentar novamente** | erro não impeditivo | recarrega a consulta |

A seleção sobrevive a troca de filtro e de página; itens que saem do resultado são removidos da seleção (`ConveyorProgressPage.tsx:127-133`).

## Regras de bloqueio

| Bloqueio | Comportamento real |
|---|---|
| Sem `conveyors.create` | item ausente do menu; rota exibe "Sem permissão para esta área"; servidor responde 403 |
| **Gerar PDF** sem seleção | botão `disabled`; dica "Selecione ao menos uma esteira." |
| **Gerar PDF** durante geração | botão `disabled`, rótulo "Gerando PDF…" |
| **Imprimir ticket** sem dados mínimos | botão `disabled`, título "Dados insuficientes para montar o ticket" — guarda defensiva: `isProgressActivityPrintable` exige apenas identificador da esteira, identificador e nome da atividade, sempre presentes na prática |
| **Agrupar por** | `select` desabilitado — sem alternativa |
| Sem botão Atualizar | só filtro ou recarga de página |
| Sair com seleção ativa | diálogo "Sair desta página?" / "O contexto atual (filtros, seleções ou alterações ainda não guardadas) pode ser descartado." / **Cancelar** · **Sair e continuar** |

Nenhum bloqueio depende da situação da esteira ou da atividade: a tela é somente de leitura e **não** reutiliza `canConveyorAcceptTimeEntry` nem qualquer outra regra de ciclo de vida.

## Estados / situações considerados

**Esteira** — nenhuma situação é excluída. Único recorte: `c.deleted_at IS NULL`. Aparecem `EM_ELABORACAO`, `AGUARDANDO_PLANEJAMENTO`, `EM_PLANEJAMENTO`, `A_INICIAR`, `EM_ANDAMENTO`, `FINALIZADA`, `CANCELADA` — rótulos: Rascunho / Em elaboração, Aguardando planejamento, Em planejamento, A iniciar, Em andamento, Finalizada, Cancelada.

**Atividade** — `PENDING` Aberta, `IN_PROGRESS` Em andamento, `COMPLETED` Concluída, `REOPENED` Reaberta, `BLOCKED` Bloqueada, `ABORTED` Dispensada. Recorte: `node_type = 'STEP'` e `deleted_at IS NULL`, com tarefa e setor também não removidos.

**Apontamentos** — `te.deleted_at IS NULL`; colaborador obtido por junção obrigatória.

**Responsáveis** — somente `is_primary = TRUE`, `assignment_type = 'COLLABORATOR'`, não removido. Índice único garante **no máximo um** responsável principal por atividade (`0023_…:50-53`); alocações de equipe não podem ser principais (`chk_conveyor_node_assignees_team_not_primary`).

## Mensagens relevantes

| Mensagem | Origem |
|---|---|
| "Carregando evolução das esteiras…" | carregamento |
| "Nenhuma esteira encontrada com os filtros atuais." | lista vazia |
| "Nenhum apontamento analítico registrado." | atividade sem apontamentos |
| "Nenhum registro" | rodapé sem linhas |
| "Selecione ao menos uma esteira." | dica de seleção |
| "Gerando PDF…" | botão em execução |
| "Não foi possível abrir a impressão. Tente novamente." | falha de `window.print()` — exibida no lugar da dica de seleção |
| "Não foi possível carregar a evolução das esteiras" + "Ocorreu um problema ao obter os dados. Tente novamente em instantes ou confirme a sua sessão." + **Entendi** | falha impeditiva (modal) |
| mensagem do catálogo + **Tentar novamente** | falha não impeditiva (painel vermelho) |
| "Sem permissão para esta área" | guard de rota |
| "Sair desta página?" | diálogo de saída com seleção ativa |

Severidades impeditivas: rede (`critico`), sessão, permissão, operacional/500 (`impeditivo`). Relevantes (painel): validação, conflito, desconhecido.

## Estados vazios

- **Sem esteiras no filtro:** "Nenhuma esteira encontrada com os filtros atuais."
- **Esteira sem estrutura:** aparece na tabela, sem seta, `Previsto` e `Evolução` em `—`, eficiência "Sem base calculável".
- **Atividade sem apontamentos:** "Nenhum apontamento analítico registrado."
- **Eficiência sem base:** `—` no resumo; "Sem base calculável" na tabela quando não há nem rótulo de estado.

## Divergências entre frontend e backend

1. **Previsto da atividade dispensada tem dois significados simultâneos.** O backend devolve, no mesmo objeto, o previsto **original** no campo da atividade e usa o previsto **efetivo (0)** para somar nos níveis acima (canal lateral `_effectivePlanned`, `service.ts:188-191`). O frontend exibe os dois sem sinalizar a diferença: a linha mostra previsto preenchido e o pai não o contabiliza. Documentado no manual de forma explícita.
2. **Resumo com duas origens.** Previsto/Realizado/Falta/Excedente/Evolução média são recalculados no frontend; Eficiência ponderada vem do backend. Coexistem na mesma linha visual sem distinção.
3. **`progressPercent` da esteira × Evolução média do resumo.** Universos diferentes: razão de totais × média aritmética de percentuais. Os números não são comparáveis.
4. **PDF sem a eficiência consolidada.** `ConveyorProgressPrintView` recebe `computeConveyorProgressSummary(printPayload.items)` **sem** o segundo argumento (`ConveyorProgressPage.tsx:272`), logo a eficiência agregada chega toda nula. Sem efeito visível porque o documento não tem coluna de eficiência — mas o contrato é preenchido com valores vazios.
5. **Fuso do filtro de período × fuso da data exibida.** `filtersToApiParams` converte as datas pelo fuso do dispositivo (`new Date('AAAA-MM-DDT00:00:00').toISOString()`, `ConveyorProgressFilters.tsx:205-208`), enquanto a data de realização é exibida pelo dia civil de **São Paulo** (`formatWorkDateFromEntryAt`). O projeto já possui `operationalDayRangeIso` para limites em São Paulo, **não utilizado aqui**.

## Inconsistências e defeitos encontrados (não corrigidos nesta rodada)

| # | Inconsistência | Evidência | Efeito para o usuário |
|---|---|---|---|
| EVO-001 | **Atividade dispensada com apontamento infla o excedente do conjunto.** O previsto é retirado dos agregados, mas o realizado dela continua somando (`sector.activities.map(a => a.realizedMinutes)`, `service.ts:207`) | `service.ts:39-44` × `207`, `224-225`, `238-239` | Esteira pode apresentar excedente ou eficiência pior por tempo registrado em algo que deixou de ser previsto |
| EVO-002 | **Atividade dispensada é rotulada "Sem tempo previsto"** mesmo tendo tempo previsto, porque `buildActivityEfficiencyInput` força `plannedMinutes: null` | `service.ts:46-53`; teste "STEP ABORTED…" espera `status === 'SEM_TEMPO_PREVISTO'` | Rótulo contradiz a coluna Previsto, que mostra valor preenchido na mesma linha |
| EVO-003 | **Após falha impeditiva, a tela exibe estado vazio.** `presentBlocking(...)` seguido de `return` deixa `loadError` nulo e `items` vazio; o `finally` encerra o carregamento | `ConveyorProgressPage.tsx:140-151`, `249-252` | Depois de "Entendi", a tela diz "Nenhuma esteira encontrada com os filtros atuais." e **não** oferece "Tentar novamente" — sugere ausência de dados onde houve falha |
| EVO-004 | **Mensagem de erro específica é descartada.** A página sobrescreve `modalTitle` e `userMessage` com texto fixo | `ConveyorProgressPage.tsx:141-145` | Sessão expirada, falta de permissão e serviço indisponível produzem a mesma mensagem genérica |
| EVO-005 | **"Agrupar por" é elemento sem funcionamento** — `select` `disabled` com opção única | `ConveyorProgressFilters.tsx:109-112` | Sugere alternativa de agrupamento que não existe |
| EVO-006 | **Linha de filtros do PDF usa formato interno.** Situação impressa como chave bruta (ex. `EM_ANDAMENTO`), datas em `AAAA-MM-DD`, colaborador como "Colaborador filtrado" sem o nome | `ConveyorProgressPrintView.tsx:222-231` | Documento impresso não registra com clareza o recorte usado |
| EVO-007 | **Aviso de recurso à impressão do navegador não é exibido nesta tela.** `agentStatus` e `agentFallbackNotice` são produzidos por `useActivityTicketPrint` mas **não são consumidos** pela página | `ConveyorProgressPage.tsx:77-82` | Usuário não é informado quando o ticket deixa de sair na impressora térmica |
| EVO-008 | **Sobreposição de impressão nunca aparece nesta tela.** Só é exibida quando `progress.total > 1`, e a página imprime sempre um ticket por vez | `ConveyorProgressPage.tsx:277-282`; `thermalTicketPrintQueue.ts:40-42`; `thermalTicketPrintSheets.ts:21-25` | Botão de cancelar impressão é inalcançável a partir desta tela |
| EVO-009 | **Linhas de apontamento com `colSpan` insuficiente.** A tabela tem 9 colunas; as linhas de apontamento rendem 8 células e o cabeçalho usa `colSpan={8}` | `ConveyorProgressAnalyticalEntries.tsx:16`, `31`, `54-85` | Desalinhamento visual da última coluna no bloco de apontamentos |
| EVO-010 | **Consulta sem limite de volume.** `listConveyorsForProgress` não tem `LIMIT`; toda a árvore (esteiras, atividades e apontamentos) é montada em memória e enviada de uma vez; a paginação é apenas visual | `repository.ts:67-79`; `ConveyorProgressTable.tsx:60-65` | Risco de lentidão com base grande, sem indicação ao usuário |
| EVO-011 | **Selo de situação "Reaberta" recebe cor de "Aberta"** — a heurística casa a subcadeia "aberta" | `ConveyorProgressMetricsCells.tsx:127` | Cor não distingue atividade reaberta de atividade aberta |
| EVO-012 | **Código técnico impresso no ticket.** O código curto é gerado com prefixo `STEP-` (`buildShortStepCode`), contrariando a convenção do projeto de não expor esse termo ao usuário final | `activityTicketPrintModel.ts:91-95` | Termo técnico visível em documento operacional. No manual foi descrito como "um código curto de identificação da atividade" |

Nenhuma dessas ocorrências foi corrigida: esta rodada é exclusivamente documental.

## Pendências fora do escopo

1. **`Situação` do cabeçalho do manual está desatualizada.** A linha 6 de `MANUAL_USUARIO_SGP.md` ainda declara: *"capítulos 1 a 3, 5 a 13, 20 e 21 com conteúdo final. Os capítulos 4 e 14 a 19 seguem marcados como pendentes"*. Com esta rodada, o capítulo 14 passa a ter conteúdo final e os pendentes passam a ser **4 e 15 a 19**. **A correção não foi feita** porque a linha está fora do intervalo do Capítulo 14 e o escopo desta atividade proíbe alteração fora dele. **Requer decisão humana e rodada própria.**
2. **Capítulo 21** não recebeu os itens EVO-001 a EVO-012. O anexo de pendências conhecidas deveria registrar, no mínimo, EVO-003 (estado vazio após falha), EVO-005 (elemento sem funcionamento) e EVO-001/EVO-002 (leitura de atividade dispensada). Fora do escopo desta rodada.
3. **Capítulo 21** — cenário de apenas uma data preenchida no prazo: lacuna conhecida, excluída por instrução expressa desta atividade.
4. **Matriz técnica `MANUAL_FUNCIONAL_SGP.md`** não foi alterada nem reconferida contra o Capítulo 14. Avaliar em rodada própria se os itens EVO-001 a EVO-012 devem ser registrados lá.
5. **Decisões técnicas pendentes de rodadas anteriores** permanecem abertas: defeito de quantidade prevista na jornada por colaborador, VAL-017 e retorno do Apontamento gerencial.

Nenhum erro factual foi encontrado nos capítulos anteriores quanto a esta tela: as referências cruzadas existentes (linhas 138, 191, 1495, 1610, 3489) conferem com o código auditado.

## Proteção dos capítulos anteriores

Intervalo do Capítulo 14 identificado antes da alteração: **linhas 3616 a 3624** (cabeçalho, marcador pendente e 5 tópicos), com o separador `---` em 3614 e 3626 fora do intervalo editado.

Verificações **programáticas** após a alteração:

| Verificação | Resultado |
|---|---|
| `diff` das linhas 1–3615 (base × novo) | **IDENTICAL** |
| `diff` de todo o conteúdo a partir do separador do cap. 14 (base linha 3625 × novo linha 3905) | **IDENTICAL** |
| Comparação de hash MD5 **capítulo a capítulo** (21 capítulos) | **IGUAL** em 1–13 e 15–21; **ALTERADO** somente em `# 14. Evolução das Esteiras` |
| Remoções no `git diff` | exatamente 6 linhas — o marcador pendente e os 5 tópicos do esqueleto |
| Arquivos no `git status --short` | somente os dois autorizados |

Script de comparação por capítulo e cópia da base guardados fora do repositório (diretório de trabalho temporário da sessão).

## Validações executadas

| Validação | Resultado |
|---|---|
| `git fetch origin --prune` | executado |
| Conferência do tip da base | `8c8999fe2a81…` — confere com o esperado |
| `git merge-base --is-ancestor` para as 10 branches documentais | todas ancestrais |
| `git status --short` | `M docs/manual/source/MANUAL_USUARIO_SGP.md` (antes do retorno) |
| `git diff --check` | sem erros de espaço em branco |
| Revisão do `git diff` | feita integralmente |
| Apenas os dois arquivos autorizados alterados | confirmado |
| Marcador pendente do Capítulo 14 removido | confirmado — 0 ocorrências no intervalo |
| Marcadores pendentes restantes | 6 — capítulos 4, 15, 16, 17, 18, 19 (+ a menção explicativa na seção 2.6) |
| Nenhum outro capítulo alterado | confirmado por hash capítulo a capítulo |
| Busca de termos técnicos inadequados no capítulo | 0 ocorrências de STEP, endpoint, payload, repository, service, enum, DTO, hook, query, mutation, ABORTED, COMPLETED, PENDING, conveyor, uuid, SQL, middleware, RBAC |
| Cada afirmação funcional com evidência no código | sim — mapeada nas seções acima, com arquivo e linha |
| Cobertura dos 5 tópicos do esqueleto original | todos cobertos (previsto/realizado/excedido por atividade; classificações e faixas; filtros; seleção e impressão; efeito da atividade dispensada) |

### Execução visual

**Não houve execução visual.** A tela não foi aberta, renderizada nem fotografada. Toda a descrição vem de leitura de código, incluindo textos literais de interface. Os 2 marcadores `[IMAGEM SUGERIDA: …]` do capítulo descrevem capturas a produzir, não capturas existentes.

### Build, lint e testes

**Não executados.** O repositório está **sem dependências instaladas** (`node_modules` e `server/node_modules` vazios). A tentativa de rodar a suíte focada falhou na carga de configuração:

```text
$ npx vitest run src/features/conveyor-progress src/domain/conveyor-progress
failed to load config from /home/user/sgp/vitest.config.ts
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@tailwindcss/vite'
```

Falha registrada como falha. Conforme a instrução da atividade, build, lint e testes não eram obrigatórios para esta tarefa documental. Os dois arquivos de teste relevantes foram **lidos** e usados como evidência de comportamento esperado, sem execução.

## Confirmação das branches protegidas

| Branch | Situação |
|---|---|
| `main` | **não alterada** |
| `develop` | **não alterada** |
| `homol` | **não alterada** |
| Branches documentais anteriores (`base-p0`, `cap05`…`cap13`, `fix-cap05-prazo`) | **não alteradas** |

Nenhum PR, merge, rebase, force-push ou exclusão de branch foi realizado. A única branch escrita é `docs/manual-usuario-sgp-cap14-evolucao-esteiras`, criada a partir do tip confirmado.

## Próximo passo recomendado

1. **Atualizar a linha `Situação` do cabeçalho do manual** em rodada própria (pendência 1) — é a única divergência factual criada por esta entrega.
2. Registrar EVO-001 a EVO-012 no Capítulo 21, em rodada própria.
3. Decisão humana sobre a correção de EVO-001/EVO-002 (leitura da atividade dispensada) e EVO-003 (estado vazio após falha impeditiva) no código.
4. Seguir para o próximo capítulo pendente a partir desta branch publicada.

## Estado final

- **Branch:** `docs/manual-usuario-sgp-cap14-evolucao-esteiras`
- **Working tree:** limpa após o commit
- **`git status`:** sem alterações pendentes
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.
