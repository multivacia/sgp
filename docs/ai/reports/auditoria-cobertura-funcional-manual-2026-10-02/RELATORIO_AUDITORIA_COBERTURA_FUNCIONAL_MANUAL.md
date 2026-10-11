# Relatório de Auditoria de Cobertura Funcional — Manual do SGP+

- **TASK_ID:** `auditoria-cobertura-funcional-manual-sgp`
- **Data/hora:** 2026-10-03 (UTC)
- **Natureza:** auditoria de cobertura documental. Nenhum arquivo de aplicação, migration, teste ou o manual fonte foi alterado.
- **Fonte da verdade:** código atual do repositório.
- **Documento auditado:** `docs/manual/source/MANUAL_FUNCIONAL_SGP.md` (3.538 linhas, 50 seções)
- **Versão da aplicação:** `app-version.json` → `1.9.8` / `2026-10-02`

## Metadados de Git

| Item | Valor |
|---|---|
| Branch de trabalho | `docs/auditoria-cobertura-funcional-manual-sgp` |
| SHA base (`origin/develop` no início da auditoria) | `c611d10feacf329bdc217fe391ebf47a90a6ea7a` |
| SHA de `origin/main` no mesmo instante | `c611d10feacf329bdc217fe391ebf47a90a6ea7a` |
| Commit analisado declarado no manual | `8e9fd062c6edf350ffab095c6aba986dd9520860` |
| Commits em `develop` após a fotografia do manual | 16 (`git rev-list --count 8e9fd062..c611d10f`) |
| `git fetch origin --prune` | executado |

**Nota metodológica importante:** o manual declara ter sido escrito sobre `8e9fd062`. Esse commit **não é ancestral** do HEAD atual pela linha de `develop` (`git merge-base --is-ancestor 8e9fd062 b2a40f69` → falso em ambos os sentidos): o manual foi produzido em um branch paralelo (`docs/manual-funcional-sgp`, merge `ff7b444f`) e, **depois** desse merge, entrou em `develop` a entrega de Jornada multi-colaborador (`7eba08c0` ← `b2a40f69`, `b9360087`, `59924074`). Logo, há divergência estrutural conhecida e datada entre manual e código, concentrada em Jornada.

---

# A. Resumo executivo

## A.1 Conclusão central

O arquivo auditado **não é um manual de usuário**. Seu próprio título é *"Auditoria Funcional e Matriz Mestre de Documentação — SGP+"* e sua natureza declarada é *"fonte funcional viva derivada de auditoria reversa do código"* (linhas 1–7). Ele é um **documento-fonte técnico de excelente qualidade factual** e um **documento de usuário final inexistente**.

Isso muda o eixo desta auditoria. A pergunta "o manual está desatualizado?" tem resposta majoritariamente **não**: as regras conferidas batem com o código. A pergunta "o manual permite a um usuário operar o SGP+?" tem resposta **não** para quase todo o sistema, por três razões estruturais:

1. **Natureza do texto.** O conteúdo é escrito em linguagem de regra (`APO-001`, `CIC-004`, `ABORTED`, `lateAddToWeeklyBacklog = true`, `overwrite=true`), não em linguagem de tarefa ("como registrar o apontamento de ontem").
2. **Vocabulário divergente da tela.** O manual nomeia domínios com nomes internos que o usuário nunca vê. O caso mais grave: o manual tem capítulos "Kiosk" e "Produção Web", mas a interface chama ambos de **"Modo Fábrica"** — expressão que aparece **0 vezes** no manual.
3. **Ausência de instrução operacional.** Praticamente nenhuma seção contém passo-a-passo, ponto de entrada na navegação, ou o que fazer quando a ação é bloqueada.

A classificação de cobertura do próprio manual (coluna "Cobertura atual" da seção 2.1, e a seção 37) refere-se aos **HTML derivados** (`docs/manual/colaborador.html`, `docs/manual/gestor-esteira.html`), **não a ele mesmo**. Essa distinção não está explícita no documento e é uma fonte real de leitura errada: quem abrir o manual e ler "Planejamento Semanal — EXTREMAMENTE INSUFICIENTE" pode concluir que o próprio arquivo não cobre o tema, quando na verdade a seção 43 é a mais completa do documento.

## A.2 Nível geral de cobertura encontrado

Avaliado contra o código atual, por natureza do conteúdo:

| Camada | Situação |
|---|---|
| **Regras de negócio, estados, limites, mensagens** | Forte. Amostra de 19 mensagens literais do catálogo 8.1 verificada no código: **19/19 presentes**. Seções 32 (sessão), 42 (Plano Operacional), 44.1–44.10 (fila/PIN/sessão), 26 (EVO-006/007) conferem exatamente. |
| **Superfície navegável (rotas, menus, botões, modais)** | Fraca. Duas rotas inteiras sem qualquer cobertura; rótulos reais de menu não documentados; dois dos três exports de planilha inexistentes no texto. |
| **Instrução operacional para o usuário** | Praticamente ausente em todo o documento. |
| **Linguagem adequada ao usuário final** | Inadequada por construção. Contagens no arquivo: `STEP` 16×, `COMPLETED` 12×, `ABORTED` 11×, `DRAFT` 10×, `migration` 9×, `PUBLISHED` 7×, `BLOCKED` 6×, `PENDING` 4×, `REOPENED` 3×. |

**Não há percentual de cobertura neste relatório.** Não existe denominador contável e defensável: o sistema não possui um inventário canônico de "funcionalidades", e qualquer percentual seria arbitrário. A matriz da seção B é a medida; a contagem por classificação está na seção de fechamento.

## A.3 Principais lacunas

1. **Vocabulário "Modo Fábrica" ausente (P0).** O nome que o colaborador lê na tela não existe no manual.
2. **Painel operacional usa 7 categorias que não são os 7 status do ciclo de vida (P0).** `A_INICIAR` e `EM_ANDAMENTO` colapsam em "Em execução", e "Em atraso" **sobrepõe** o status real quando o prazo venceu. O manual documenta somente os status (CIC-001) e menciona "bucket" 4 vezes sem explicar nenhuma.
3. **Estados de atividade documentados não existem na prática (P0).** ATI-001 lista 6 estados "encontrados"; o backend só escreve 4 (`PENDING`, `COMPLETED`, `REOPENED`, `ABORTED`). `IN_PROGRESS` e `BLOCKED` não têm nenhum caminho de escrita.
4. **"Laboratório de Esteiras" (`/app/gestao/esteiras/laboratorio`) não existe no manual (P1)** — é um quarto caminho de criação de esteira, por composição de múltiplas matrizes.
5. **"Apontar horas" global não documentado como recurso transversal (P1).** O botão existe no cabeçalho de todas as telas autenticadas; o manual o menciona 1 vez, de passagem, dentro da Agenda.
6. **Duas das três planilhas do sistema não estão no manual (P1):** "Exportar visão semanal" (matriz colaborador × dia) e a impressão/PDF da Evolução das Esteiras.
7. **Vazamento de `STEP` na própria interface (P0 para o manual).** Enquanto a Jornada Gerencial foi limpa em `59924074`, telas de colaborador ainda exibem "Etapa (STEP)" e "Atividades (STEPs)". O manual perpetua o termo.

## A.4 Áreas com maior risco de divergência manual × sistema

| Risco | Por quê |
|---|---|
| **Jornada / Jornada Gerencial** | Única área com mudança de código comprovadamente posterior ao snapshot do manual (`7eba08c0`). O teto de 20 colaboradores por consulta e a seleção multi-colaborador na tela não existem no texto; 45.5 cita "STEPs alocados", redação que o produto já abandonou. |
| **Painel operacional / Backlog** | Taxonomia divergente (buckets vs. status) e cópia de tela que expõe parâmetros de URL e coluna de banco. |
| **Estados de atividade** | Enum documentado ≠ enum efetivamente escrito. |
| **Planejamento Semanal** | Área mais viva do produto (3 painéis, 2 exports, drawer de atenção, histórico). A seção 43 é boa, mas já fica atrás da superfície atual. |
| **Evolução das Esteiras** | Fórmulas corretas; operação da tela (seleção múltipla, impressão, filtros) ausente. |

## A.5 Áreas maduras — bastam revisão editorial e tradução

Estas conferem com o código e precisam só de reescrita em linguagem de usuário, sem nova investigação:

- Seção 8 / 8.1 — catálogo de mensagens (o melhor ativo do documento).
- Seção 32 — Configurações Sistêmicas (faixas 5–480 / 1–30, fallbacks 30 / 5, absoluto 8h: exatos).
- Seção 42 — Plano Operacional da Esteira (tabelas de estado e rótulos exatos).
- Seções 44.1–44.10 — fila, PIN, bloqueio, sessão de produção.
- Seção 26, EVO-006/EVO-007 — classificações e faixas de desvio.
- Seção 34 — Meu Trabalho (corretamente marcado como não entregue).
- Seções CIC-004 / CIC-005 — retornos de ciclo de vida (origens, destino e motivo 3–500 conferem).

---

# B. Matriz de cobertura funcional

Legenda: `OK` · `PARCIAL` · `DESATUALIZADO` · `AUSENTE` · `TECNICO_DEMAIS` · `NAO_CONFIRMADO`.

| # | Área | Funcionalidade | Evidência no sistema | Seção do manual | Classificação | Problema encontrado | Ação recomendada |
|---|---|---|---|---|---|---|---|
| 1 | Navegação | Rótulos reais do menu lateral (17 itens de Gestão, 3 de Colaborador, 1 de Conta) | `src/lib/shell/app-nav-config.ts` (`GESTAO_NAV_ITEMS`, `COLABORADOR_NAV_ITEMS`, `CONTA_NAV_ITEMS`) | 40.2 (tabela de rotas/gates) | PARCIAL | A tabela 40.2 lista permissões, não os rótulos que o usuário lê. "Painel operacional" aparece como "Backlog/Painel de Esteiras"; "Por documento" como "Nova Esteira por Documento". | Criar seção de navegação com o rótulo exato do menu, o grupo do sidebar e a permissão. |
| 2 | Navegação | Agrupamento do sidebar em 5 blocos (Gestão, Cadastros operacionais, Estrutura e administração, Colaborador, Conta) | `SHELL_NAV_GROUP_LABEL` e `SIDEBAR_GROUP_ORDER` em `src/lib/shell/app-nav-config.ts` | — | AUSENTE | O manual não descreve como o menu é organizado; o leitor não sabe em que bloco procurar. | Documentar os 5 blocos e o que vive em cada um. |
| 3 | Navegação | Selo "Novo" em "Agenda da semana" | `showNovoBadge: true` em `app-nav-config.ts` | — | AUSENTE | Elemento visual sem explicação. | Mencionar no capítulo da Agenda (item de baixo custo). |
| 4 | Criação de Esteira | **Laboratório de Esteiras** — compor esteira a partir de várias matrizes (catálogo → configurar bloco → montar → revisar → criar) | `src/features/esteiras/laboratorio-esteiras/` (14 arquivos); rota `gestao/esteiras/laboratorio` em `src/routes/AppRoutes.tsx`; título em `src/lib/page-meta.ts:11` | — | AUSENTE | Quarto caminho de criação, com permissão `conveyors.create`, sem nenhuma linha no manual. Agravante: **não há item de menu nem link de entrada** — só URL direta. | Documentar o fluxo e **registrar explicitamente a ausência de ponto de entrada** antes de instruir o usuário a usá-lo. |
| 5 | Criação de Esteira | Caminhos de criação: manual, matriz, documento | `NovaEsteiraPage.tsx`, `ImportarOsPage.tsx`, `nova-esteira/`, `laboratorio-esteiras/` | CRT-001…CRT-006 | PARCIAL | Lista 3 caminhos onde há 4. CRT-003 ("Pode reutilizar estrutura existente") é uma linha para um fluxo inteiro. | Reescrever como "4 formas de criar uma esteira", com quando usar cada uma. |
| 6 | Painel operacional | 7 categorias de situação do painel (buckets) | `src/lib/backlog/operationalBuckets.ts` (`OperationalBucket`, `getOperationalBucket`, `OPERATIONAL_BUCKET_LABELS`) | CIC-001; "bucket" citado nas linhas 243, 1274, 2690, 2828 | AUSENTE | Taxonomia que o usuário realmente filtra não é documentada. `A_INICIAR`+`EM_ANDAMENTO` → "Em execução"; `finalizada`/`cancelada` têm precedência; "Em atraso" **substitui** o status quando o prazo venceu. | Seção dedicada: tabela bucket ↔ status, com a regra de precedência. **P0.** |
| 7 | Painel operacional | Filtro "Ativas" (recorte não encerradas) | `backlogFilterDetailAtivas` em `src/lib/backlog/backlogCopy.ts:20`; `BacklogSituacaoQuery` em `operationalBuckets.ts` | — | AUSENTE | Oitavo recorte, fora dos 7 buckets, não documentado. | Incluir na tabela do item 6. |
| 8 | Painel operacional | KPIs somam só a lista carregada, não o universo | `backlogKpiDeckIntro` / `backlogTotalsVsTableFiltered` em `backlogCopy.ts:15-18` | 45.3 (análogo, mas para Jornada) | PARCIAL | A armadilha está documentada para a Jornada e não para o painel, onde a cópia da tela já avisa. | Replicar o aviso de 45.3 no capítulo do painel. |
| 9 | Painel operacional | Cópia da tela expõe parâmetro de URL e coluna de banco | `backlogFilterDetailConcluidasWindow` ("…`completed_at`… Parâmetro: `days=`") e `backlogFiltersSituationLine` em `backlogCopy.ts:23-50` | — | NAO_CONFIRMADO | A própria interface mostra `completed_at`, `days=`, `scope=ativas` ao usuário. Não é possível decidir no escopo desta auditoria se o manual deve traduzir ou se a cópia deve mudar. | Decisão de produto antes de redigir (ver seção G). |
| 10 | Ciclo de Vida | 7 estados e transições oficiais | `server/src/modules/conveyors/conveyorOperationalStatus.ts` (`CONVEYOR_OPERATIONAL_STATUSES`, `ALLOWED_STATUS_TRANSITIONS`) | CIC-001, CIC-002 | TECNICO_DEMAIS | Conteúdo correto, apresentado por enum. O código já tem os rótulos de produto em `CONVEYOR_OPERATIONAL_STATUS_LABELS` (ex.: `EM_ELABORACAO` → "Rascunho / Em elaboração"), não usados no manual. | Usar os rótulos do código como termo principal; enum no máximo em anexo. |
| 11 | Ciclo de Vida | Cancelamento a partir de qualquer estado | `canTransitionConveyorStatus`: `if (to === 'CANCELADA') return true` | CIC-002 ("a partir dos estados permitidos pelo backend") | PARCIAL | Redação evasiva onde a regra é simples e ampla — inclusive a partir de `FINALIZADA`. | Afirmar: "pode ser cancelada em qualquer situação, inclusive finalizada". |
| 12 | Ciclo de Vida | Primeiro apontamento move `A_INICIAR` → `EM_ANDAMENTO` | `CONVEYOR_TIME_ENTRY_ALLOWED_STATUSES` em `conveyorOperationalStatus.ts` | CIC-003 | OK | Regra correta. | Reescrever em linguagem de usuário. |
| 13 | Ciclo de Vida | Voltar para backlog / para planejamento | `CONVEYOR_RETURN_TO_BACKLOG_SOURCE_STATUSES`, `CONVEYOR_RETURN_TO_PLANNING_SOURCE_STATUSES`, `CONVEYOR_RETURN_REASON_MIN/MAX` (3/500) | CIC-004, CIC-005 | OK | Origens, destino e limites do motivo conferem exatamente. | Apenas tradução editorial. |
| 14 | Ciclo de Vida | Finalizar exige gestor da fábrica | `CONVEYOR_FINISH_REQUIRES_MANAGER_MESSAGE` ("Somente o gestor da fábrica pode finalizar esta esteira.") | — | AUSENTE | Restrição de papel sobre a ação terminal mais importante; mensagem não está nem no catálogo 8.1. | Documentar e acrescentar ao catálogo de mensagens. |
| 15 | Atividades | Estados reais de atividade | `server/src/modules/conveyors/stepOperationalStatus.ts`; escritas em `conveyor-step-operational.service.ts` (só `COMPLETED`/`REOPENED`) e `conveyor-step-abort.service.ts` (`ABORTED`); `'IN_PROGRESS'` e `'BLOCKED'` sem nenhum escritor em `server/src` | ATI-001 | DESATUALIZADO | Manual lista 6 estados "encontrados". Só 4 ocorrem: `PENDING` (default, migration `0028`), `COMPLETED`, `REOPENED`, `ABORTED`. | Documentar 4 estados. Resolve VAL-006. **P0.** |
| 16 | Atividades | Vocabulário de estado na tela (6 rótulos, derivados) | `EsteiraDetalhePage.tsx:141-148` (`pendente`, `pronta`, `em_execucao`, `pausada`, `concluida`, `bloqueada`) | ATI-001 | DESATUALIZADO | Os rótulos que o usuário lê não são tradução do enum: "Pronta", "Pausada" e "Apontável" são derivados e inexistentes no banco; "Dispensada" não está nesse mapa. | Documentar o que o usuário vê, com a regra que produz cada rótulo. |
| 17 | Atividades | Contadores do detalhe da esteira (Tarefas, Atividades, Concluídas, Em execução, Pausadas, Pendentes, Prontas, Bloqueadas, Apontáveis) | `EsteiraDetalhePage.tsx:1867-1875` | — | AUSENTE | 9 indicadores sem definição em lugar algum. | Tabela indicador → como é calculado. |
| 18 | Atividades | Concluir / reabrir / dispensar / restaurar | `conveyor-step-operational.service.ts`, `conveyor-step-abort.service.ts`, `AbortConveyorStepDialog.tsx`, diálogo de reabertura em `EsteiraDetalhePage.tsx` | ATI-002…ATI-005 | PARCIAL | As 4 ações existem no manual em 1–3 linhas cada, sem passo-a-passo, sem o campo de observação da reabertura, sem o motivo obrigatório da dispensa. | Enriquecer com o fluxo de tela e os campos obrigatórios. |
| 19 | Atividades | Reabrir também vale para atividade dispensada | `canTransitionStepStatus`: `REOPENED` aceita origem `COMPLETED` **ou** `ABORTED` | ATI-003 / ATI-005 / MSG-ATI-005 | DESATUALIZADO | MSG-ATI-005 afirma "apenas `COMPLETED` pode reabrir"; o código aceita `ABORTED`. A restauração de dispensa usa a mesma transição. | Corrigir MSG-ATI-005 e unificar a explicação das duas ações. **P0.** |
| 20 | Atividades | Menu de gestão por atividade (alterar status, reatribuir, prioridade, bloquear, desbloquear, observação) | `src/features/esteiras/GestorAtividadeMenu.tsx`, renderizado só em `EsteiraDetalheMockPage` (`EsteiraDetalhePage.tsx:1649`), que **não é referenciada por nada**; `EsteiraDetalhePage` renderiza `EsteiraDetalheBasicoReal` | — | OK (por omissão deliberada) | Menu grava apenas em memória (`src/mocks/esteira-gestao-runtime.ts`), sem chamada de API, e está em código morto. **Não documentar.** | Registrar a decisão de não documentar, para impedir que uma revisão futura o inclua. |
| 21 | Atividades | Eventos `CONVEYOR_STEP_BLOCKED` / `UNBLOCKED` / `PAUSED` / `RESUMED` | Presentes **só** em `src/domain/conveyors/operationalEventTaxonomy.ts` e `formatConveyorOperationalEvent.ts`; **zero** ocorrências em `server/src` e em `server/migrations` | VAL-014 | NAO_CONFIRMADO → resolvido | Nenhum produtor existe: a linha do tempo sabe renderizar eventos que o sistema não gera. | Não documentar bloqueio/pausa de atividade. Resolve VAL-014. |
| 22 | Sequência | Ordem recomendada e exceção com justificativa | `conveyorActivitySequence.logic.ts`, `production.helpers.ts`, `work-queue-sequence-presentation.ts` | SEQ-001…SEQ-004, 44.13 | OK | Tratamento como exceção (não bloqueio) e cuidado com o rótulo "Fora de sequência" conferem. | Tradução editorial. |
| 23 | Apontamentos | Status de esteira que permitem apontar | `CONVEYOR_TIME_ENTRY_ALLOWED_STATUSES` = `['A_INICIAR','EM_ANDAMENTO']`; mensagens em `timeEntryBlockedMessage` | APO-001, MSG-001…MSG-004 | OK | Confere, com as 4 mensagens de bloqueio corretas. | Tradução editorial. |
| 24 | Apontamentos | Data de realização não futura | `src/domain/operational/workDate.ts:22` e `server/src/shared/operationalWorkDate.ts:25` | APO-004, MSG-005, MSG-APO-003 | OK | Mensagem idêntica nas duas camadas. | — |
| 25 | Apontamentos | **"Apontar horas" — gaveta global de apontamento rápido** | `src/components/AppHeader.tsx:160-166` (botão em todo o shell) + `src/features/shell/QuickTimeEntryDrawer.tsx`; também em `MyWorkQueuePage`, `OperationalPlanningPage`, `WeeklyAgendaPage` | linha 2374, dentro de 43.13 | PARCIAL | Recurso transversal (2 abas: esteira e Extra Esteira, busca de candidatas, data de trabalho, justificativa, justificativa de fora de sequência, "salvar e concluir") reduzido a um bullet dentro do capítulo da Agenda. | Capítulo próprio: é o caminho mais curto de apontamento do sistema. **P1.** |
| 26 | Apontamentos | Correção gerencial (editar / excluir / em nome de terceiro) | rota `gestao/apontamento/:stepNodeId` com `time_entries.create_on_behalf` ∪ `edit_any` ∪ `delete_any`; `ApontamentoGestorPage.tsx` | APO-GES-001…004, 40.6 | PARCIAL | Regras de concorrência e identificação estão boas; falta o fluxo de tela e como chegar à página. | Acrescentar o caminho de navegação e o passo-a-passo. |
| 27 | Minha Fila | Fila do dia a partir do plano publicado | `my-work-queue.service.ts`, `work-queue-prioritization.ts`; cópia em `MyWorkQueuePage.tsx:280-301` | FIL-001…004, 44.1…44.5 | OK | Fonte, agrupamento, ordenação, capacidade e mensagens conferem. | Tradução editorial. |
| 28 | Minha Fila | Aviso de planejamento acima da capacidade do dia | `MyWorkQueuePage.tsx:359` | 44.4 | PARCIAL | 44.4 descreve o indicador na resposta da API, não o aviso que o colaborador lê na tela. | Citar o texto do aviso e o que o colaborador deve fazer. |
| 29 | Minhas Atividades | Tela de atividades designadas | `src/features/colaborador/MinhasAtividadesPage.tsx`; rota `minhas-atividades` | MIA-001…003, VAL-015 | DESATUALIZADO | **Não há item de menu nem link in-app.** `COLABORADOR_NAV_ITEMS` tem só Minha fila, Chamados e Minha jornada; existe ícone em `AppSidebar.tsx:114` para uma rota que o menu não expõe. | Não instruir como se fosse acessível. Resolve VAL-015. **P0.** |
| 30 | Meu Trabalho | Placeholder | `src/features/cockpits/MeuTrabalhoCockpitPage.tsx` (3 blocos reservados, sem dados) | Seção 34 | OK | Corretamente marcado como não entregue. Também sem item de menu. | Acrescentar que não há entrada no menu. |
| 31 | Jornada (colaborador) | Períodos, previsto, cobertura, Extra Esteira, pendências | `operational-journey/*`, `JornadaPage.tsx` | JOR-001…003, 45.1…45.7 | PARCIAL | Semântica correta; falta instrução de uso e leitura da tela. | Enriquecer para uso autônomo. |
| 32 | Jornada Gerencial | Seleção de múltiplos colaboradores na tela (teto 20) | `MAX_JORNADA_COLABORADORES = 20` em `src/features/gestor/jornadaColaboradorScope.ts`; `MAX_JOURNEY_COLLABORATORS = 20` em `server/.../operational-journey.schemas.ts:77`; `CollaboratorMultiSelectStrip.tsx`; commits `b2a40f69`, `b9360087`, `7eba08c0` | JOG-002 ("A `develop` de referência inclui evolução para consulta de múltiplos colaboradores") | DESATUALIZADO | Entregue após o snapshot do manual. O texto trata como "evolução" prevista; hoje é a tela. Teto de 20 por consulta não documentado. | Documentar a seleção, os avatares e o teto de 20. **P1.** |
| 33 | Jornada Gerencial | Exportação XLSX aceita até 50 colaboradores | `OPERATIONAL_JOURNEY_EXPORT_MAX_COLLABORATORS = 50` em `operational-journey.schemas.ts:51` | 45.8 ("de 1 a 50") | PARCIAL | O 50 está certo **para a exportação**. Falta dizer que a consulta na tela para em 20 — dois tetos diferentes, fonte garantida de confusão. | Tabela explícita: consulta 20, exportação 50. |
| 34 | Jornada Gerencial | Visão por colaborador | `JornadaColaboradorGestorPage.tsx` (851 linhas) | JOG-001 ("Existe funcionalidade gerencial para analisar jornada de colaboradores.") | PARCIAL | Uma frase para a principal tela gerencial de pessoas. | Reescrever do zero com base na tela. **P1.** |
| 35 | Jornada Gerencial | Cópia da tela abandonou "STEP" | `59924074`: "soma STEPs" → "soma das alocações"; "STEPs alocados" → "alocações do escopo" | 45.5 (`realizado acumulado nos STEPs alocados ÷ …`) | DESATUALIZADO | O manual usa a redação que o produto removeu. | Alinhar a 45.4/45.5 ao vocabulário "alocação". **P0 de linguagem.** |
| 36 | Jornada | Rótulo "Mês atual (UTC)" com cálculo em São Paulo | `operational-journey.export.ts:77`, `src/lib/operationalSemantics.ts:63`, `DashboardPage.tsx:492`; cálculo: `operationalMonthStart` + `OPERATIONAL_TIMEZONE = 'America/Sao_Paulo'` | VAL-017 | PARCIAL | Divergência confirmada e ainda aberta. Porém VAL-017 a atribui só ao arquivo exportado: o rótulo também está no **seletor de período na tela** (Dashboard e Jornada). | Ampliar VAL-017 para os filtros de tela. **P0** (induz leitura errada do período). |
| 37 | Modo Fábrica | Nome do canal operacional na interface | `KioskCollaboratorGrid.tsx:72` ("SGP · Modo Fábrica"), `ProductionShellLayout.tsx`, `ColaboradoresPage.tsx:886,907,924` | Seções 14 "Kiosk" e 15 "Produção Web" | TECNICO_DEMAIS | "Modo Fábrica" aparece **0 vezes** no manual. O usuário não encontra no manual o nome que lê na tela. | Adotar "Modo Fábrica" como termo principal; Kiosk/Produção Web viram variantes de acesso. **P0.** |
| 38 | Modo Fábrica (Kiosk) | Entrada, PIN de 4 dígitos, fila, cartão, apontamento | `src/features/kiosk/` (`KioskPage`, `KioskPinPad`, `KioskCollaboratorGrid`, `KioskActivityCard(s)`) | KSK-001…008 | PARCIAL | 8 regras curtas para o canal de maior volume operacional; nenhuma instrução de uso. | Reescrever como guia de operação. **P1.** |
| 39 | Modo Fábrica (Kiosk) | KSK-003 "Há divergência entre Kiosk e Backend/Web" | `PIN_LENGTH = 4` em `KioskPinPad.tsx:21` e `KioskChangePin.tsx:15` vs. `PIN_REGEX = /^\d{4,8}$/` em `server/.../production.schemas.ts` | KSK-003, VAL-004 | TECNICO_DEMAIS | Frase indecifrável para o usuário. A divergência é real e permanece: Kiosk só aceita 4 dígitos; backend/Web aceitam 4 a 8. | Dizer ao usuário o que fazer: um PIN de 4 dígitos funciona nos dois canais. **P0.** |
| 40 | Modo Fábrica (Kiosk) | Troca de PIN pelo Kiosk | `src/features/kiosk/KioskChangePin.tsx` | 44.7 (1 linha) | PARCIAL | Fluxo próprio de 2 passos (novo PIN + confirmação) sem passo-a-passo. | Documentar o fluxo. |
| 41 | Modo Fábrica (Kiosk) | Extra Esteira e Outra Atividade | `KioskExtraEsteiraFlow.tsx`, `KioskOutraAtividadeFlow.tsx` (+ lógicas e testes) | KSK-007, KSK-008 | PARCIAL | O próprio manual anota "Funcionalidade não documentada" nos dois casos, com 3–5 linhas. | Dois fluxos completos a escrever. **P1.** |
| 42 | Modo Fábrica | PIN, bloqueio, tentativas, sessão | `production.schemas.ts` (4–8 dígitos, inicial `1234`), `env.ts:681-728` (`PRODUCTION_PIN_LOCKOUT_MINUTES` default 15, idle, absoluto) | 44.6, 44.8, 44.9, 44.10 | OK | Faixas, PIN inicial, 5 tentativas / 15 min, 30 min / 12 h e a ressalva de configurabilidade conferem. | Tradução editorial. |
| 43 | Produção Web | Fluxo colaborador → PIN → fila → apontamento | `src/routes/ProductionRoutes.tsx`, `src/features/production/` | PRD-001…004 | PARCIAL | PRD-004 admite não saber as diferenças de campo ("Não assumir equivalência"). Rotas reais (`pin/:collaboratorId`, `change-pin`, `app`) não documentadas. | Comparativo campo a campo Kiosk × Produção Web. |
| 44 | Colaboradores | Cadastro, status de credencial, reset de PIN, remoção lógica, restauração | `src/features/gestor/ColaboradoresPage.tsx` (ações nas linhas 569–632; status 840–859; reset 886–934) | COL-001…006 | PARCIAL | 6 bullets de uma linha. Faltam: "Remover (soft delete)", "Restaurar", os 4 estados de credencial ("Sem credencial", "Desabilitado", "Bloqueado", "Aguardando troca") e a exibição de capacidade ("Padrão global" / "Ajuste individual") dentro da própria tela. | Reescrever o capítulo a partir da tela. **P1.** |
| 45 | Colaboradores | Reset de PIN diz "nova senha" | `ColaboradoresPage.tsx:895` — "PIN redefinido. Próximo acesso exigirá nova senha." | COL-004, 47.5 | NAO_CONFIRMADO | A mensagem fala "senha" onde o fluxo é de PIN. Não é possível decidir aqui se o manual acompanha o texto atual ou se a cópia deve ser corrigida. | Decisão de produto (ver seção G). |
| 46 | Equipes | Cadastro, membros, referência, remoção semântica, alocação `TEAM` | `conveyorAssignments.schemas.ts:60` e `conveyors.schemas.ts:52` ("Assignee TEAM não pode ser principal.") | EQU-001…007 | TECNICO_DEMAIS | Regras corretas, mas EQU-006/EQU-007 falam em "alocação `TEAM`". Agravante: a própria mensagem de erro diz "Assignee TEAM". | Usar "alocação por equipe"; registrar a mensagem no catálogo com tradução. |
| 47 | Matrizes de Operação | Listar, criar, editar, duplicar, prévia editável, exportar, ativar/inativar | `src/features/operation-matrix/` (4 páginas em `AppRoutes.tsx`), `server/src/modules/operation-matrix/` | MAT-001…003; 46.1…46.9 | PARCIAL | A seção 18 é uma lista de 11 verbos sem instrução; a 46 detalha bem a hierarquia e os campos, mas não ensina a operar as 4 telas. | Unir 18 e 46 num capítulo operacional. |
| 48 | Estrutura da Esteira | Hierarquia, edição incremental, preservação de IDs, remoção híbrida | `conveyors.service.ts`, `conveyor-structure-diff.ts`, `conveyorEditSavePolicy.ts`; mensagem com `is_active=false` em `conveyorOperationalStatus.ts` | EST-001…008; 41.1…41.7 | TECNICO_DEMAIS | Conteúdo bom e correto; vocabulário de nó/patch/`is_active`. Mensagem do sistema expõe `is_active=false` ao usuário. | Traduzir para "a atividade deixa de aparecer, mas o histórico é preservado". |
| 49 | Estrutura da Esteira | **Inclusão tardia — 4 modos** | `src/features/esteiras/LateStructureAppendDrawer.tsx:64-81`: "Tarefa da Matriz", "Tarefa manual", "Setor em tarefa existente", "Atividade em setor existente" | EST-007 (1 frase); 43.6 | PARCIAL | Uma frase sobre o backlog para uma gaveta com 4 modos distintos de inclusão. | Capítulo com os 4 modos e o efeito no Planejamento Semanal. **P1.** |
| 50 | Estrutura da Esteira | Validações expõem tipos de nó ao usuário | `LateStructureAppendDrawer.tsx:194-198`: "Selecione a tarefa (OPTION) de destino.", "Selecione o setor (AREA) de destino." | — | NAO_CONFIRMADO | `OPTION` e `AREA` vazam para a tela; o manual não cobre essas mensagens. | Decisão de produto; depois, catalogar. |
| 51 | Estrutura da Esteira | Marcação de inclusão tardia para o backlog semanal | `lateAddToWeeklyBacklog`; `CONVEYOR_STRUCTURE_INCREMENTAL_LATE_ADD_REASON` | 43.6 ("Exceção de inclusão tardia") | TECNICO_DEMAIS | O manual expõe `lateAddToWeeklyBacklog = true` como se fosse um conceito de usuário. | Substituir por "marcar a nova atividade para entrar no backlog da semana". |
| 52 | Designações | Principal, apoio, equipe, duplicidade | `conveyorAssignments.schemas.ts`, `conveyors.schemas.ts` (`COLLABORATOR` \| `TEAM`) | DES-001…004 | PARCIAL | Regras corretas, sem instrução de tela. | Enriquecer com o fluxo de designação. |
| 53 | Plano Operacional | Estados do plano, sincronização, itens, origens, geração, aprovação, envio | `server/src/modules/conveyor-operational-plan/*`; rótulos em `src/domain/conveyor-operational-plan/conveyorOperationalPlanDisplay.ts:13-17` | POP-001…006; 42.1…42.13 | OK | Conferido estado por estado; rótulos idênticos aos do código. Melhor capítulo técnico do manual. | Só tradução editorial. |
| 54 | Plano Operacional | MSG-POP-004 expõe parâmetro de API | "O plano já possui itens. Envie overwrite=true para substituir a geração atual." em `conveyor-operational-plan.service.ts` | 8.1 / MSG-POP-004 | TECNICO_DEMAIS | `overwrite=true` é parâmetro de API apresentado ao usuário; o manual reproduz literalmente. | Catalogar com tradução ("confirme a substituição") e sinalizar a cópia. |
| 55 | Planejamento Semanal | Semana, elegibilidade, unicidade, revisão, publicação, capacidade, divergências, histórico | `server/src/modules/operational-planning/*`; `src/features/operational-planning/` (60+ arquivos) | PLS-001…010; 43.1…43.12 | PARCIAL | A área mais rica do manual, mas ainda atrás da tela: 3 painéis (`FactoryIntakePanel`, `PlanningSyncIssuesPanel`, `PlanningExecutionOutsidePlanPanel`), `PlanningWeekHistoryPanel`, `PlanningDailyKanbanView`, `PlanningCapacityExceededDialog` não aparecem como elementos de interface. | Mapear painel por painel. **P1.** |
| 56 | Planejamento Semanal | Exportação "Exportar Excel" (2 abas) | `operationalPlanningExportFlow.ts:56-62`; `operational-planning.export.ts` | 43.11, 43.12 | OK | Precedência DRAFT→PUBLISHED, duas abas, situações e classificação de capacidade conferem. | Tradução editorial. |
| 57 | Planejamento Semanal | **Exportação "Exportar visão semanal"** (matriz colaborador × dia, seg–sex) | `OperationalPlanningWeeklyViewExportButton.tsx`, `operationalPlanningWeeklyViewExportFlow.ts:58-64`, `server/.../operational-planning.weekly-view.export.ts` (bloco por colaborador, mescla vertical, `__unassigned__`) | — | AUSENTE | Segunda planilha do Planejamento, com formato totalmente diferente, sem nenhuma linha no manual. | Documentar as duas exportações lado a lado. **P1.** |
| 58 | Planejamento Semanal | Rótulo "Salvar e exportar" quando há alterações pendentes | `resolveOperationalPlanningExportButtonLabel` / `...WeeklyViewExportButtonLabel` (estado `dirty`) | — | AUSENTE | O botão muda de nome e salva antes de exportar — efeito colateral não documentado. | Explicar os 3 estados do botão. |
| 59 | Agenda da Semana | Arrastar, mover, lote, remover, salvar revisão, publicar, concluir, imprimir | `src/features/weekly-agenda/` (`WeeklyAgendaBoard`, `...Cell`, `...DayTabs`, `...BacklogDrawer`, `...BacklogFab`, `...BatchQueueOverlay`, `...PlacingBanner`, `...SummaryStrip`, `weeklyAgendaDnD.ts`) | AGS-001…003; 43.13, 43.14 | PARCIAL | A lista de 12 capacidades em 43.13 está certa, mas não há instrução para nenhuma delas, e os elementos de interface (abas de dia, gaveta de backlog, botão flutuante, faixa de resumo, overlay de lote) não são nomeados. | Capítulo operacional com passo-a-passo de arrastar e publicar. **P1.** |
| 60 | Agenda da Semana | Gaveta "Atenção" consolidando sincronização + execução fora do plano | `WeeklyAgendaAttentionDrawer.tsx` | 43.13 (2 bullets) | PARCIAL | O manual cita as duas visões, não a gaveta que as reúne nem como abri-la. | Nomear a gaveta e o caminho. |
| 61 | Capacidade | Padrão global, override individual, resolução, fallback 480 min | `operational-settings.service.ts:41` (`OPERATIONAL_DAILY_CAPACITY_FALLBACK_MINUTES = 480`), `:227`; `capacity/` (4 componentes) | CFG-CAP-001…004; CFG-003 ("Padrão e ajustes individuais.") | PARCIAL | 4 bullets sem um único número. Faltam: o fallback de 480 min, a vigência início/fim do override, e que o override vive em `Configurações operacionais` **e** aparece em Colaboradores. | Enriquecer com valores e efeitos. **P1.** |
| 62 | Evolução de Esteiras | Previsto, realizado, excedido, progresso, eficiência, classificações, faixas | `server/src/shared/conveyorProgressMetrics.ts:69-96`; rótulos em `src/domain/conveyor-progress/conveyorProgressDisplay.ts:25-44` | EVO-001…008 | OK | As 8 classificações e as faixas (≤10%, ≤30%, >30%) conferem; EVO-005 corrige corretamente a fórmula de eficiência. | Tradução editorial. |
| 63 | Evolução de Esteiras | Operação da tela: seleção múltipla, impressão/PDF, filtros | `ConveyorProgressPage.tsx:69,194-231`, `ConveyorProgressPrintView.tsx`, `useConveyorProgressPrint.ts`, `ConveyorProgressFilters.tsx` ("Hierarquia", "Somente com tempo excedido") | Seção 26 (só fórmulas) | AUSENTE | A tela tem seleção por esteira, mensagem "Selecione ao menos uma esteira.", impressão em PDF e filtros — nada documentado. | Acrescentar a operação ao capítulo. **P1.** |
| 64 | Dashboard | Visões operacional e executiva, janela temporal | `src/features/gestor/DashboardPage.tsx`, `server/src/modules/dashboard/*` | DSH-001…004; 45.9…45.12 | PARCIAL | DSH-002/003 são listas de "pode considerar / pode apresentar" — não dizem o que a tela mostra. O próprio DSH-004 reconhece a lacuna ("O manual deve informar explicitamente o universo de cada KPI"). | Tabela KPI → definição → janela temporal, a partir dos cards reais. **P1.** |
| 65 | Dashboard | Card "Alocações em STEPs" | `DashboardPage.tsx:517` | — | TECNICO_DEMAIS | Rótulo de KPI com `STEP` cru na tela gerencial. | Sinalizar a cópia e documentar como "alocações em atividades". **P0 de linguagem.** |
| 66 | Saúde Operacional | Base de cálculo, estados, sobrecarga, atenção, fallback, baixa ocupação | `server/src/modules/collaborators/collaborator-operational-health*.ts`, `src/domain/collaborator-health/*` | SAU-001…007 | PARCIAL | Limiares (100%, 200%, ~75%) presentes, mas os estados aparecem como `healthy`/`attention`/`critical`/`unknown` e não há leitura operacional ("o que eu faço com um colaborador crítico?"). | Traduzir estados e acrescentar ação recomendada por estado. |
| 67 | Configurações Operacionais | 6 abas | `OperationalSettingsPage.tsx:155-210` (Setores, Funções operacionais, Capacidade operacional, Descrições de apontamentos, Justificativas operacionais, Motivos de dispensa) | CFG-001…006 | PARCIAL | As 6 abas estão cobertas, mas CFG-003 e CFG-005 têm uma linha cada; nenhuma aba tem instrução de uso. | Enriquecer aba por aba. **P1.** |
| 68 | Configurações Operacionais | Catálogo de motivos de dispensa descrito por enum | `stepAbortReasons.ts`, `StepAbortReasonsTab.tsx` | CFG-006 ("Catálogo usado para `ABORTED`") | TECNICO_DEMAIS | `ABORTED` no lugar de "atividade dispensada". | Trocar o termo. |
| 69 | Justificativas | Categorias, catálogo, uso | `operational-settings/TimeEntryJustificationsTab.tsx`, `JustificationSelect.tsx`, `timeEntryJustificationField.ts`, migration `0048` | CFG-JUS-001…003 | PARCIAL | A seção 7 é razoável; falta o ponto de vista do colaborador (quando o campo aparece e como escolher). | Enriquecer pelo lado do uso. |
| 70 | Usuários | Criar, editar, ativar/inativar, vincular/desvincular, forçar troca, redefinir senha, remover lógico, restaurar | `UsersPage.tsx:639-728, 875-876` | USR-001, USR-002 | PARCIAL | USR-002 lista 6 conceitos genéricos; a tela tem 8+ ações. Faltam "Remover (soft delete)", "Restaurar" e "Desvincular colaborador". | Reescrever a partir da tela. **P1.** |
| 71 | Usuários | "Remover (soft delete)" na interface | `UsersPage.tsx:701`, `ColaboradoresPage.tsx:603` | — | TECNICO_DEMAIS | Termo de implementação no botão que o administrador clica. | Documentar como "remover preservando histórico" e sinalizar a cópia. |
| 72 | RBAC | Permissões por papel | `RbacRolePermissionsPage.tsx`, `rbac.manage_role_permissions` | RBAC-001, RBAC-002, 40.3, 40.4, VAL-010 | PARCIAL | Princípios e migrations estão bem descritos; a **tela** de edição de permissões por papel não é descrita. | Documentar a tela e o efeito de salvar. |
| 73 | Auditoria | 11 tipos de evento no filtro da Trilha administrativa | `AdminAuditTrailPage.tsx:22-32` | AUD-001; 47.3 (10 itens) | PARCIAL | 47.3 omite **"Permissões do papel atualizadas"** — justamente o registro de auditoria de mudança de RBAC. | Completar a lista para os 11 tipos. |
| 74 | Auditoria | Linha do tempo de eventos operacionais da esteira | `ConveyorOperationalEventsTimeline.tsx`; `operationalEventLimit` inicial 50 com "carregar mais" em `EsteiraDetalhePage.tsx:279` | AUD-002; 47.1 | PARCIAL | Os eventos estão catalogados; a linha do tempo como elemento de tela (limite de 50, carregar mais) não. | Documentar o componente e a paginação. |
| 75 | Config. Sistêmicas | Timeout de inatividade, aviso, timeout absoluto | `session-timeout.config.ts:4-14` (5–480 / fallback 30; 1–30 / fallback 5; absoluto 8 h) | SYS-001…003; MSG-SYS-001…003 | OK | Todos os valores conferem, inclusive a regra aviso < timeout. | Tradução editorial. |
| 76 | Chamados | Abertura por diálogo global + consulta dos próprios chamados | `AppHeader.tsx:120-127` ("Abrir chamado"), `OpenSupportTicketDialog`, `SupportTicketsPage.tsx`, `server/src/modules/support/*` | SUP-001…003; 47.6…47.13 | PARCIAL | A seção 47 cobre bem o fluxo; falta que o botão "Abrir chamado" vive no cabeçalho de todas as telas quando a flag está ativa. | Acrescentar o ponto de entrada. |
| 77 | Chamados | Disponibilidade por configuração de ambiente | `isSupportTicketsEnabled()` em `src/lib/api/env.ts:44-47` (desligado por omissão); `requiresSupportTickets` no menu | SUP-003 | OK | O condicionamento está corretamente registrado. | Deixar explícito que o padrão é desligado. |
| 78 | Impressão | Tickets térmicos por esteira e por semana, agente local, fallback, teste, progresso | `src/features/operational-tickets/` (40+ arquivos); cópia em `activityTicketPrintCopy.ts` | 43.15…43.20 | OK | Agrupamentos, ocultação de concluídas, estados do agente, fallback e mensagens conferem. | Tradução editorial. |
| 79 | Sessão e conta | Login, bloqueio temporário, usuário inativo, troca de senha, timeout | `server/src/modules/auth/*`, `ChangePasswordPage.tsx`, `RequirePasswordChangeCleared.tsx` | 40.7…40.10; MSG-AUT-001…007 | OK | As 7 mensagens de autenticação conferem. | Tradução editorial. |
| 80 | Preferências | **Seletor de tema (Argos Dark, Slate Dark, Light Executive)** | `AppHeader.tsx:230-252`; `src/lib/theme/theme-constants.ts:13-17` | — | AUSENTE | Preferência visível a todo usuário, no menu de perfil, sem nenhuma menção. | Capítulo curto de preferências da conta. |
| 81 | Interface | Elementos não funcionais visíveis: "Busca rápida…" (`readOnly`, `title="Busca visual (mock)"`) e "Alertas" (`title="Notificações (mock)"`) | `AppHeader.tsx:128-157` e `:254-278` | — | AUSENTE | Dois controles de aparência funcional que não fazem nada. Sem aviso, o usuário tenta usá-los e abre chamado. | Registrar explicitamente como "ainda não disponível". **P0.** |
| 82 | Documento (ARGOS) | Importação por PDF: ingestão, rascunho, revisão, decisões, criação | `src/features/documentos/nova-esteira-documento/*` (`accept=".pdf,application/pdf"` em `:459`); `server/src/modules/argos-integration/*` | CRT-004, CRT-005; 46.10…46.15 | TECNICO_DEMAIS | Factualmente correto (PDF, estados, issues, matching), mas escrito em `fatal_error` / `REUSE_EXISTING` / "antes do POST final". | Reescrever como guia de revisão humana. **P1.** |
| 83 | ARGOS Health | Análise da esteira, snapshot, resultado persistido, cartão, histórico | `server/src/modules/argos/*`, `server/src/modules/conveyors/health/*`, `ConveyorHealthAnalysisCard.tsx` | 45.13…45.18; VAL-016 | TECNICO_DEMAIS | A distinção entre as duas "saúdes" (45.13) é excelente e deve ser preservada; 45.15 expõe `analysisId` / `requestId`. | Manter 45.13; remover os campos internos. |
| 84 | Vocabulário | "Atividade" × "Etapa" × "STEP" na mesma interface | `ApontamentoPage.tsx:337` ("Etapa (STEP)"), `MinhasAtividadesPage.tsx:107,238`, `JornadaPage.tsx:523` ("Atividades (STEPs)"), `DashboardPage.tsx:517`; 40 ocorrências de "Etapa" em `src/**/*.tsx` e 33 de "etapa" em `server/src` | 1.2 (`ATI-*` Atividades/STEP), 2.1 | TECNICO_DEMAIS | Três termos para a mesma coisa, inclusive na tela do colaborador. O manual adota "Atividades/STEP" e perpetua a ambiguidade. | Fixar **"atividade"** como termo único no manual e sinalizar as telas a ajustar. **P0.** |
| 85 | Planejamento Semanal | Card de encaixe mostra status cru da atividade | `FactoryIntakeItemCard.tsx:18-28,51`: mapa cobre `NOT_STARTED`/`IN_PROGRESS`/`COMPLETED`/`BLOCKED`/`CANCELLED` com fallback `labels[status] ?? status`; o campo vem de `step.operational_status` (`operational-planning.repository.ts:776`), cujos valores são `PENDING`/`IN_PROGRESS`/`BLOCKED`/`COMPLETED`/`REOPENED`/`ABORTED` | — | NAO_CONFIRMADO | `PENDING` (o estado padrão), `REOPENED` e `ABORTED` não estão no mapa: a tela renderiza "STEP: PENDING", "STEP: REOPENED", "STEP: ABORTED". Documentar fielmente significaria ensinar enum ao gestor. | Tratar como correção de produto antes de documentar o painel (ver seção G). **P0.** |
| 86 | Estrutura do manual | A coluna "Cobertura atual" se refere aos HTML derivados, não ao próprio documento | Seções 2.1, 37; cabeçalho "Documentos atuais analisados: `docs/manual/colaborador.html`, `docs/manual/gestor-esteira.html`" | 1, 2.1, 36, 37 | NAO_CONFIRMADO | O referente da classificação não está explícito ao lado das tabelas; lido isoladamente, "AUSENTE" parece descrever o próprio arquivo. | Tornar o referente explícito em 2.1 e 37, ou separar documento-fonte de relatório de cobertura. **P0.** |
| 87 | Estrutura do manual | Snapshot de código declarado está defasado | Cabeçalho: `8e9fd062…`; HEAD: `c611d10f…`; 16 commits de diferença | Cabeçalho | DESATUALIZADO | O commit declarado não é ancestral do HEAD por `develop`; a entrega de Jornada multi-colaborador é posterior ao merge do manual. | Atualizar o cabeçalho e adotar a regra de reconferir o SHA a cada revisão. |

---

# C. Funcionalidades existentes no sistema e ausentes no manual (`AUSENTE`)

| # | Item | Evidência | Por que importa |
|---|---|---|---|
| C1 | **Laboratório de Esteiras** — composição de esteira a partir de várias matrizes | `src/features/esteiras/laboratorio-esteiras/` (14 arquivos); rota em `AppRoutes.tsx`; `page-meta.ts:11` | Quarto caminho de criação de esteira, sob `conveyors.create`. Sem item de menu nem link: só URL direta. |
| C2 | **Exportação "Exportar visão semanal"** (matriz colaborador × dia, seg–sex) | `OperationalPlanningWeeklyViewExportButton.tsx`; `server/.../operational-planning.weekly-view.export.ts` | Segunda planilha do Planejamento, formato distinto da documentada em 43.11. |
| C3 | **Operação da tela de Evolução das Esteiras**: seleção múltipla, impressão/PDF, filtros | `ConveyorProgressPage.tsx:69,194-231`; `ConveyorProgressPrintView.tsx`; `ConveyorProgressFilters.tsx` | O manual só traz fórmulas; nada sobre usar a tela. |
| C4 | **Taxonomia de buckets do Painel operacional** (7 categorias + "Ativas") | `src/lib/backlog/operationalBuckets.ts` | É a taxonomia que o usuário filtra. Divergente dos status documentados. |
| C5 | **Seletor de tema** (3 temas) | `AppHeader.tsx:230-252`; `theme-constants.ts:13-17` | Preferência disponível a todos os usuários. |
| C6 | **"Busca rápida" e "Alertas" não funcionais** | `AppHeader.tsx:128-157` e `:254-278` (`readOnly`, `title="…(mock)"`) | Controles que parecem funcionar e não funcionam. |
| C7 | **Agrupamento do menu lateral em 5 blocos** | `SHELL_NAV_GROUP_LABEL`, `SIDEBAR_GROUP_ORDER` | Sem isso o usuário não sabe onde procurar cada tela. |
| C8 | **Finalizar esteira exige gestor da fábrica** | `CONVEYOR_FINISH_REQUIRES_MANAGER_MESSAGE` | Restrição de papel sobre a ação terminal; ausente também do catálogo 8.1. |
| C9 | **Contadores do detalhe da esteira** (9 indicadores) | `EsteiraDetalhePage.tsx:1867-1875` | Números visíveis sem definição. |
| C10 | **Rótulo "Salvar e exportar"** (estado `dirty` dos botões de exportação) | `operationalPlanningExportFlow.ts:56-62`; `...WeeklyViewExportFlow.ts:58-64` | O botão salva antes de exportar — efeito colateral não anunciado. |
| C11 | **Selo "Novo" em Agenda da semana** | `showNovoBadge: true` | Elemento visual sem explicação. |
| C12 | **Filtro "Ativas"** (recorte "não encerradas", fora dos 7 buckets) | `backlogFilterDetailAtivas` em `backlogCopy.ts:20`; `BacklogSituacaoQuery` em `operationalBuckets.ts` | Oitavo recorte do painel, sem cobertura. |

---

# D. Conteúdo desatualizado ou divergente (`DESATUALIZADO`)

| # | Seção do manual | O que o manual afirma | O que o código faz | Evidência |
|---|---|---|---|---|
| D1 | ATI-001 | "Estados encontrados: `PENDING`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`, `REOPENED`, `ABORTED`" | Só 4 estados ocorrem. `conveyor-step-operational.service.ts` escreve `COMPLETED` e `REOPENED`; `conveyor-step-abort.service.ts` escreve `ABORTED`; `PENDING` é o default da migration `0028`. `'IN_PROGRESS'` e `'BLOCKED'` não têm **nenhum** escritor em `server/src` (busca por `'IN_PROGRESS'` só retorna declarações de tipo, Chamados e Plano Operacional). | `stepOperationalStatus.ts`; `server/migrations/0028_conveyor_nodes_step_operational.sql` |
| D2 | ATI-001 / detalhe da esteira | Enum como vocabulário de estado | A tela usa 6 rótulos derivados — `pendente`, `pronta`, `em_execucao`, `pausada`, `concluida`, `bloqueada` — que **não** são tradução do enum: "Pronta", "Pausada" e "Apontável" não existem no banco, e "Dispensada" não está nesse mapa. | `EsteiraDetalhePage.tsx:141-148` |
| D3 | MSG-ATI-005 | "A etapa só pode ser reaberta quando estiver concluída" / "apenas `COMPLETED` pode reabrir" | `canTransitionStepStatus` aceita `REOPENED` a partir de `COMPLETED` **ou** `ABORTED`. A restauração de dispensa (ATI-005) é a mesma transição. | `stepOperationalStatus.ts` (`if (nextStatus === 'REOPENED') return currentStatus === 'COMPLETED' \|\| currentStatus === 'ABORTED'`) |
| D4 | JOG-002 | "A `develop` de referência inclui evolução para consulta de múltiplos colaboradores" | Já é a tela: seleção multi-colaborador com avatares, endpoint consolidado e teto de **20** por consulta. Entregue **depois** do merge do manual. | `jornadaColaboradorScope.ts` (`MAX_JORNADA_COLABORADORES = 20`); `operational-journey.schemas.ts:77`; `CollaboratorMultiSelectStrip.tsx`; commits `b2a40f69`, `b9360087`, `7eba08c0` vs. `ff7b444f` |
| D5 | 45.5 | "realizado acumulado nos **STEPs alocados** ÷ previsto estrutural do mesmo conjunto de **STEPs**" | A cópia da tela foi trocada para "soma das alocações" / "alocações do escopo" — o produto abandonou o termo e o manual o mantém. | `git show 59924074 -- src/features/gestor/JornadaColaboradorGestorPage.tsx` |
| D6 | MIA-001…003 / VAL-015 | Trata "Minhas Atividades" como tela disponível e discute apenas a "descoberta" | Não há item de menu nem link in-app: `COLABORADOR_NAV_ITEMS` tem só Minha fila, Chamados e Minha jornada. Há ícone definido para a rota, mas nenhuma entrada que o use. | `app-nav-config.ts` (`COLABORADOR_NAV_ITEMS`); `AppSidebar.tsx:114` |
| D7 (ver nota) | 40.2 | Rotas nomeadas como "Backlog/Painel de Esteiras" e "Nova Esteira por Documento" | Rótulos reais do menu: "Painel operacional" e "Por documento". Rota `gestao/esteiras/laboratorio` ausente da tabela. | `app-nav-config.ts`; `AppRoutes.tsx` |
| D8 | Cabeçalho | "Commit analisado: `8e9fd062…`" | HEAD de `develop` é `c611d10f…`, 16 commits adiante; `8e9fd062` não é ancestral do HEAD pela linha de `develop`. | `git rev-list --count 8e9fd062..c611d10f`; `git merge-base --is-ancestor` |

> **Nota sobre D7:** a classificação principal desse item na matriz é `PARCIAL` (linha #1), com o problema de linguagem registrado em F.1. Ele aparece aqui porque a divergência de nomenclatura entre manual e tela é factual, não apenas de profundidade.

---

# E. Conteúdo superficial (`PARCIAL`) a enriquecer

Pontos que existem no manual mas não permitem usar o sistema sem apoio técnico. Ordenados por impacto no usuário.

| # | Seção | Estado atual | O que falta |
|---|---|---|---|
| E1 | JOG-001 | Uma frase: "Existe funcionalidade gerencial para analisar jornada de colaboradores." | Tela de 851 linhas: seleção de colaboradores, períodos, previsto, cobertura, Extra Esteira, pendências, exportação. |
| E2 | KSK-001…008 | 8 regras curtas | Guia de operação do Modo Fábrica: entrar, escolher atividade, apontar, concluir, justificar, Outra Atividade, Extra Esteira. |
| E3 | COL-001…006 | 6 bullets de uma linha | Remoção lógica e restauração, 4 estados de credencial, capacidade por colaborador na própria tela, reset de PIN. |
| E4 | USR-002 | 6 conceitos genéricos | "Remover (soft delete)", "Restaurar", "Desvincular colaborador", senha inicial mínima de 8 caracteres, papel operacional obrigatório. |
| E5 | CFG-CAP-001…004 / CFG-003 | 4 bullets, nenhum número | Fallback de 480 min, vigência início/fim do override, onde se edita, o que muda em planejamento e saúde operacional. |
| E6 | DSH-001…004 | "Pode considerar / pode apresentar" | Tabela KPI → definição → janela temporal, a partir dos cards reais. O próprio DSH-004 pede isso. |
| E7 | EST-007 | Uma frase sobre o backlog | Os 4 modos da gaveta de inclusão tardia e o efeito em cada um. |
| E8 | 43.13 / AGS-001…003 | Lista de 12 capacidades | Passo-a-passo de arrastar, lote, publicar; nomes dos elementos (abas de dia, gaveta de backlog, botão flutuante, faixa de resumo, overlay de lote, gaveta "Atenção"). |
| E9 | Seção 25 (apontamento rápido) | 1 bullet dentro de 43.13 | Capítulo próprio da gaveta global "Apontar horas": 2 abas, busca, data de trabalho, justificativas, "salvar e concluir". |
| E10 | CFG-001…006 | 6 catálogos em bullets | Instrução de uso por aba, com consequências (ex.: CFG-001 avisa que excluir setor deixa colaboradores sem setor — falta dizer o que fazer). |
| E11 | SAU-001…007 | Limiares sem leitura operacional | Tradução dos 4 estados e ação recomendada para cada um. |
| E12 | 45.8 | "A exportação aceita de 1 a 50 colaboradores" | Que a **consulta na tela** para em 20 — dois tetos diferentes. |
| E13 | PRD-004 | "Não assumir equivalência de campos" | Comparativo campo a campo Kiosk × Produção Web. |
| E14 | 47.3 | 10 tipos de evento | O 11º: "Permissões do papel atualizadas". |
| E15 | RBAC-001/002 | Princípios e migrations | A tela de edição de permissões por papel e o efeito de salvar. |
| E16 | MAT-002 | Lista de 11 verbos | Operação das 4 telas de Matrizes. |
| E17 | 44.4 | Indicador na resposta da API | O aviso de sobrecarga que o colaborador lê na fila e o que fazer. |
| E18 | 45.3 (análogo) | Armadilha documentada só na Jornada | O mesmo aviso para os KPIs do Painel operacional. |

---

# F. Linguagem inadequada ao usuário final (`TECNICO_DEMAIS`)

Nenhum texto foi reescrito nesta tarefa. Abaixo, o termo encontrado e o conceito funcional que deveria substituí-lo.

## F.1 Nomes de domínio divergentes da tela

| No manual | Na tela | Conceito a adotar | Evidência |
|---|---|---|---|
| "Kiosk" (seção 14), "Produção Web" (seção 15) | **"Modo Fábrica"** | **Modo Fábrica**, com Kiosk e navegador como formas de acesso | `KioskCollaboratorGrid.tsx:72`; `ProductionShellLayout.tsx`; `ColaboradoresPage.tsx:886,907,924`. "Modo Fábrica": **0 ocorrências** no manual |
| "Backlog/Painel de Esteiras" (40.2) | "Painel operacional" | Painel operacional | `app-nav-config.ts` |
| "Nova Esteira por Documento" (40.2) | "Por documento" | Nova esteira por documento (rótulo de menu: "Por documento") | `app-nav-config.ts` |
| "Atividades/STEP" (1.2, 2.1) | "Atividade", "Etapa", "STEP" | **Atividade** como termo único | `ApontamentoPage.tsx:337`; `JornadaPage.tsx:523`; `MinhasAtividadesPage.tsx:107,238` |

## F.2 Enums e códigos internos no manual

| Termo | Ocorrências | Onde | Conceito funcional |
|---|---|---|---|
| `STEP` / `STEPs` | 16 | 1.2, 2.1, 557, 815, 1742, 1974-1975, 2215, 2257, 2643, 2716, 3023, 3447-3450 | atividade |
| `COMPLETED` | 12 | MSG-008, ATI, EVO, 43.6, 44.2 | concluída |
| `ABORTED` | 11 | ATI-004, CFG-006, EVO-008, 44.2, 43.6 | dispensada |
| `DRAFT` / `PUBLISHED` | 10 / 7 | PLS, 42.2, 43.11, MSG-011 | rascunho / publicado |
| `BLOCKED` | 6 | ATI-001, VAL-006 | (não documentar — ver D1) |
| `PENDING` / `REOPENED` | 4 / 3 | ATI-001 | pendente / reaberta |
| `migration` | 9 | 40.3, 40.4, 48 | não mencionar ao usuário |
| `plannedMinutes × plannedQuantity` | 1216 | EVO-001 | minutos por unidade × quantidade prevista |
| `lateAddToWeeklyBacklog = true` | 2259 | 43.6 | "marcada para entrar no backlog da semana" |
| `analysisId`, `requestId` | 2779-2780 | 45.15 | identificador da análise |
| `plannedQuantity` | 3222 | VAL-001 | quantidade prevista |
| `ITEM → TASK → SECTOR → ACTIVITY` | 2851, 582 | 46.1, MSG-MAT-001 | item → tarefa → setor → atividade |
| `fatal_error`, `revisable_warning`, `missing_field`, `low_confidence_field` | 46.12 | 46.12 | erro que impede, aviso revisável, campo faltante, campo de baixa confiança |
| `REUSE_EXISTING`, `REVIEW_SIMILAR`, `CREATE_NEW`, `IGNORE` | 46.13 | 46.13 | reaproveitar, revisar semelhante, criar novo, ignorar |
| "antes do POST final" | 46.14 | 46.14 | "antes de criar a esteira" |
| `healthy`, `attention`, `critical`, `unknown` | SAU-002 | SAU-002 | saudável, atenção, crítico, sem informação |
| `TEAM` ("alocação `TEAM`") | EQU-006/007 | EQU-006, EQU-007 | alocação por equipe |
| `NOT_SCHEDULED`, `DIVERGED`, `REVIEW_REQUIRED` etc. | 42.3, 42.4, 42.5 | 42.3-42.5 | manter só a coluna de rótulo; mover códigos para anexo |
| `is_active=false` | 41.4 (mensagem citada) | 41.4 | "deixa de aparecer, histórico preservado" |
| `overwrite=true` | MSG-POP-004 | 8.1 | "confirme a substituição" |
| `conveyors.create` como sinônimo de capacidade do usuário | 43.14, MSG-ATI-001 | 43.14 | "quem pode planejar/criar esteiras" |

## F.3 Termos técnicos vazando na própria interface

Não são defeitos do manual, mas o manual **não pode documentá-los fielmente sem ensinar vocabulário interno**. Precisam de decisão de produto (seção G) antes da redação.

| Local | Texto na tela | Evidência |
|---|---|---|
| Apontamento do colaborador | "Etapa (STEP)" | `ApontamentoPage.tsx:337` |
| Minhas Atividades | "Alocações reais em etapas (STEP) das suas esteiras"; "equipe por STEP" | `MinhasAtividadesPage.tsx:107,238` |
| Minha jornada | "Atividades (STEPs)" | `JornadaPage.tsx:523` |
| Dashboard | KPI "Alocações em STEPs" | `DashboardPage.tsx:517` |
| Planejamento — encaixe da fábrica | "STEP: PENDING" / "REOPENED" / "ABORTED" (enum cru) | `FactoryIntakeItemCard.tsx:18-28,51` |
| Painel operacional — filtros | "…`completed_at`… Parâmetro: `days=`"; "Parâmetro de URL preferido: `scope=ativas`" | `backlogCopy.ts:20-50` |
| Inclusão tardia | "Selecione a tarefa (OPTION) de destino."; "Selecione o setor (AREA) de destino." | `LateStructureAppendDrawer.tsx:194-198` |
| Designação por equipe | "Assignee TEAM não pode ser principal." | `conveyorAssignments.schemas.ts:60`; `conveyors.schemas.ts:52` |
| Usuários / Colaboradores | Botão "Remover (soft delete)" | `UsersPage.tsx:701`; `ColaboradoresPage.tsx:603` |
| Conclusão de atividade | "Transição de estado da etapa não permitida (PENDING → COMPLETED)." | `conveyor-step-operational.service.ts:76` |
| Plano Operacional | "Envie overwrite=true para substituir a geração atual." | `conveyor-operational-plan.service.ts` |
| Dashboard / Jornada | Opção de período "Mês atual (UTC)" com cálculo em São Paulo | `operationalSemantics.ts:63`; `DashboardPage.tsx:492`; `operational-journey.export.ts:77` |

---

# G. Pontos não confirmados (`NAO_CONFIRMADO`)

| # | Ponto | O que impediu a conclusão | Como resolver |
|---|---|---|---|
| G1 | Como o manual deve tratar o enum cru no card de encaixe da fábrica | `formatStepStatus` (`FactoryIntakeItemCard.tsx:18-28`) cobre `NOT_STARTED`/`IN_PROGRESS`/`COMPLETED`/`BLOCKED`/`CANCELLED`, mas o campo vem de `step.operational_status` (`PENDING`/`IN_PROGRESS`/`BLOCKED`/`COMPLETED`/`REOPENED`/`ABORTED`). Com fallback `labels[status] ?? status`, a tela mostra "STEP: PENDING". Não é possível decidir no escopo documental se se documenta o comportamento atual ou se aguarda correção. | Decisão de produto: corrigir o mapa (e o rótulo "STEP:") antes de documentar o painel. |
| G2 | Se o manual deve explicar parâmetros de URL expostos na tela do Painel operacional | A cópia mostra `completed_at`, `days=`, `scope=ativas` ao usuário (`backlogCopy.ts:20-50`). Documentar fielmente ensina vocabulário interno; omitir deixa o usuário sem explicação para o que lê. | Decisão de produto sobre a cópia; depois redigir. |
| G3 | Mensagem de reset de PIN fala "nova senha" | `ColaboradoresPage.tsx:895`: "PIN redefinido. Próximo acesso exigirá nova senha." O fluxo é de PIN (`KioskChangePin`, `ProductionChangePinPage`). Pode ser erro de cópia ou termo deliberado. | Confirmar com produto; se for erro, corrigir antes de catalogar em 8.1. |
| G4 | "Laboratório de Esteiras" deve ser documentado agora? | A rota existe e está protegida por `conveyors.create`, mas **não há item de menu nem link** (`grep` por `esteiras/laboratorio` só retorna a própria feature, `AppRoutes.tsx` e `page-meta.ts`). Não foi possível determinar se é entrega pendente de exposição ou recurso intencionalmente oculto. | Confirmar com produto; se oculto por decisão, aplicar a regra da seção 34 ("não apresentar como funcionalidade pronta"). |
| G5 | Permanência de "Minhas Atividades" e "Meu Trabalho" sem menu | Confirmado que nenhuma das duas rotas tem entrada de navegação, embora `AppSidebar.tsx` defina ícones para ambas (linhas 114 e 136) — indício de intenção revertida ou pendente. | Decisão de produto antes de instruir o usuário a acessá-las. |
| G6 | Referente da coluna "Cobertura atual" | Cabeçalho e seção 36 indicam que a classificação se refere aos HTML derivados, mas as tabelas 2.1 e 37 não repetem o referente. Lido isoladamente, "AUSENTE" parece descrever o próprio documento. | Explicitar o referente nas tabelas, ou separar fonte funcional de relatório de cobertura. |
| G7 | VAL-001 (quantidade prevista após apontamentos), VAL-002, VAL-003, VAL-007 a VAL-013 | São decisões **funcionais** pendentes, não lacunas de leitura de código. Esta auditoria não tem mandato para decidi-las. | Mantêm-se abertas na seção 49 do manual, para decisão humana. |
| G8 | Comportamento verificado por leitura de código, sem execução | Nenhum ambiente foi executado; não houve verificação visual de telas, nem validação de banco. Conclusões derivam de código, migrations e testes do repositório. | Conferência visual na etapa de produção das imagens (seção I). |

### VAL resolvidos por esta auditoria

| VAL | Situação | Evidência |
|---|---|---|
| **VAL-004** (regra de PIN) | Divergência **confirmada e ainda aberta**: Kiosk aceita exatamente 4 dígitos; backend/Web aceitam 4 a 8. | `KioskPinPad.tsx:21`; `KioskChangePin.tsx:15`; `production.schemas.ts` (`PIN_REGEX`) |
| **VAL-006** (status `BLOCKED`) | **Resolvido:** nenhum caminho escreve `BLOCKED`. Não documentar. | Busca por `'BLOCKED'` em `server/src` retorna apenas declarações de tipo |
| **VAL-014** (eventos `BLOCKED`/`PAUSED`) | **Resolvido:** os 4 tipos existem só na camada de apresentação (`src/domain/conveyors/`); zero produtores em `server/src` e em `server/migrations`. | `operationalEventTaxonomy.ts`; `formatConveyorOperationalEvent.ts` |
| **VAL-015** (descoberta de "Minhas Atividades") | **Resolvido:** não há ponto de entrada algum. | `app-nav-config.ts`; `AppSidebar.tsx:114` |
| **VAL-017** (rótulo "Mês atual (UTC)") | **Confirmado e ampliado:** o rótulo está também nos filtros de tela, não só na exportação. | `operationalSemantics.ts:63`; `DashboardPage.tsx:492`; `operational-journey.export.ts:77`; cálculo em `operationalPeriod.ts` + `OPERATIONAL_TIMEZONE` |
| **Menu de gestão por atividade** | **Resolvido:** código morto (`EsteiraDetalheMockPage` não é referenciada) e sem persistência. Não documentar. | `EsteiraDetalhePage.tsx:1649, 2179-2182`; `src/mocks/esteira-gestao-runtime.ts` |

---

# H. Prioridade para enriquecimento do manual

Prioridade por **impacto no manual do usuário**, não por qualidade de código.

## P0 — erro ou ausência que pode orientar o usuário de forma incorreta

| # | Item | Referência |
|---|---|---|
| P0-1 | Adotar **"Modo Fábrica"** como termo do canal operacional (hoje: 0 ocorrências) | F.1, matriz #37 |
| P0-2 | Corrigir ATI-001 para os **4 estados** que realmente ocorrem | D1, matriz #15 |
| P0-3 | Corrigir MSG-ATI-005: reabertura também aceita atividade **dispensada** | D3, matriz #19 |
| P0-4 | Documentar a **taxonomia de buckets** do Painel operacional e a precedência de "Em atraso" | C4, matriz #6 |
| P0-5 | Explicitar que **"Minhas Atividades" e "Meu Trabalho" não têm entrada no menu** | D6, matriz #29, #30 |
| P0-6 | Ampliar VAL-017: o rótulo "Mês atual (UTC)" está também nos **filtros de tela** | matriz #36 |
| P0-7 | Fixar **"atividade"** como termo único e remover `STEP` do manual | F.1, F.2, matriz #84 |
| P0-8 | Alinhar 45.4/45.5 ao vocabulário "alocação" já adotado pelo produto | D5, matriz #35 |
| P0-9 | Registrar os controles **não funcionais** ("Busca rápida", "Alertas") | C6, matriz #81 |
| P0-10 | Tornar explícito que a coluna "Cobertura atual" se refere aos **HTML derivados** | G6, matriz #86 |
| P0-11 | Traduzir KSK-003 ("Há divergência entre Kiosk e Backend/Web") em orientação acionável sobre o PIN | matriz #39 |
| P0-12 | Decidir o tratamento do enum cru em "STEP: PENDING" antes de documentar o encaixe da fábrica | G1, matriz #85 |

## P1 — funcionalidade relevante não documentada ou muito superficial

| # | Item | Referência |
|---|---|---|
| P1-1 | Capítulo do **Modo Fábrica** (Kiosk + Produção Web), incluindo Outra Atividade e Extra Esteira | E2, matriz #38, #41, #43 |
| P1-2 | Capítulo da gaveta global **"Apontar horas"** | E9, matriz #25 |
| P1-3 | **Jornada Gerencial** reescrita: seleção multi-colaborador, teto 20 vs. exportação 50 | E1, E12, matriz #32-34 |
| P1-4 | **Planejamento Semanal**: mapear painel por painel | E8, matriz #55 |
| P1-5 | **Exportação "visão semanal"** documentada ao lado da planilha existente | C2, matriz #57 |
| P1-6 | **Laboratório de Esteiras** (condicionado a G4) | C1, matriz #4 |
| P1-7 | **Colaboradores** e **Usuários** reescritos a partir das telas | E3, E4, matriz #44, #70 |
| P1-8 | **Capacidade operacional** com valores e efeitos | E5, matriz #61 |
| P1-9 | **Dashboard**: tabela KPI → definição → janela | E6, matriz #64 |
| P1-10 | **Inclusão tardia**: os 4 modos | E7, matriz #49 |
| P1-11 | **Agenda da Semana**: passo-a-passo de arrastar e publicar | E8, matriz #59, #60 |
| P1-12 | **Evolução das Esteiras**: operação da tela (seleção, impressão, filtros) | C3, matriz #63 |
| P1-13 | **Configurações Operacionais**: instrução por aba | E10, matriz #67 |
| P1-14 | **Importação por documento** reescrita em linguagem de revisão humana | matriz #82 |
| P1-15 | Completar 47.3 com o 11º tipo de evento de auditoria | E14, matriz #73 |

## P2 — melhoria de clareza, linguagem ou organização

| # | Item | Referência |
|---|---|---|
| P2-1 | Separar **documento-fonte técnico** de **manual de usuário** (dois artefatos distintos) | A.1 |
| P2-2 | Mover enums e códigos das seções 42.2-42.5, 46.11-46.13 e SAU-002 para anexo | F.2 |
| P2-3 | Documentar o **agrupamento do menu** em 5 blocos | C7, matriz #2 |
| P2-4 | Capítulo curto de **preferências da conta** (tema, alterar senha) | C5, matriz #80 |
| P2-5 | Documentar os **contadores do detalhe da esteira** | C9, matriz #17 |
| P2-6 | Replicar o aviso de 45.3 para os KPIs do Painel operacional | E18, matriz #8 |
| P2-7 | Traduzir os estados de **Saúde Operacional** e acrescentar ação por estado | E11, matriz #66 |
| P2-8 | Explicar os 3 estados dos botões de exportação ("Salvar e exportar") | C10, matriz #58 |
| P2-9 | Acrescentar "Finalizar exige gestor da fábrica" ao catálogo 8.1 | C8, matriz #14 |
| P2-10 | Atualizar o cabeçalho do manual com o SHA corrente e fixar a regra de reconferência | D8, matriz #87 |
| P2-11 | Trocar "alocação `TEAM`" por "alocação por equipe" em EQU-006/007 | matriz #46 |
| P2-12 | Mencionar o selo "Novo" da Agenda da semana | C11, matriz #3 |
| P2-13 | Registrar a **decisão de não documentar** o menu de gestão por atividade (código morto) | matriz #20 |

---

# I. Imagens provavelmente necessárias

Apenas telas onde o texto sozinho não resolve. Telas triviais (login, alterar senha, listagens simples) foram deliberadamente omitidas.

**Painel operacional e ciclo de vida**
- `[IMAGEM SUGERIDA: Painel operacional — os 7 cards de situação com o recorte "Ativas", mostrando um item que migrou para "Em atraso"]`
- `[IMAGEM SUGERIDA: Detalhe da esteira — faixa de contadores (Tarefas, Atividades, Concluídas, Prontas, Apontáveis) com os rótulos de estado nas linhas]`
- `[IMAGEM SUGERIDA: Painel de retorno de ciclo de vida — campo de motivo obrigatório (3 a 500 caracteres)]`

**Planejamento e Agenda**
- `[IMAGEM SUGERIDA: Planejamento semanal — seleção de colaboradores e capacidade, com um dia em sobrecarga]`
- `[IMAGEM SUGERIDA: Planejamento semanal — painel de encaixe da fábrica, painel de sincronização e painel de execução fora do plano lado a lado]`
- `[IMAGEM SUGERIDA: Agenda da semana — arrastar um item do backlog para a célula colaborador × dia]`
- `[IMAGEM SUGERIDA: Agenda da semana — gaveta "Atenção" com problemas de sincronização e execução fora do plano]`
- `[IMAGEM SUGERIDA: Diálogo de capacidade excedida no Planejamento]`
- `[IMAGEM SUGERIDA: Comparação das duas planilhas — "Exportar Excel" (2 abas) e "Exportar visão semanal" (colaborador × dia)]`

**Apontamento**
- `[IMAGEM SUGERIDA: Gaveta "Apontar horas" — aba de esteira, com busca de atividade e campo de data de trabalho]`
- `[IMAGEM SUGERIDA: Gaveta "Apontar horas" — aba Extra Esteira com o catálogo de descrições]`
- `[IMAGEM SUGERIDA: Apontamento com justificativa de fora de sequência, mostrando o aviso de etapa anterior pendente]`

**Modo Fábrica**
- `[IMAGEM SUGERIDA: Modo Fábrica — grade de seleção de colaborador]`
- `[IMAGEM SUGERIDA: Modo Fábrica — teclado de PIN de 4 dígitos]`
- `[IMAGEM SUGERIDA: Modo Fábrica — cartão de atividade com cobertura de tempo e o aviso "Tempo previsto atingido"]`
- `[IMAGEM SUGERIDA: Modo Fábrica — fluxo "Outra Atividade" localizando atividade fora da fila]`
- `[IMAGEM SUGERIDA: Modo Fábrica — fluxo "Extra Esteira"]`
- `[IMAGEM SUGERIDA: Modo Fábrica — criação do PIN no primeiro acesso]`

**Estrutura e criação**
- `[IMAGEM SUGERIDA: Gaveta de inclusão tardia — os 4 modos de inclusão]`
- `[IMAGEM SUGERIDA: Importação por documento — painel de revisão do rascunho com as decisões humanas]`
- `[IMAGEM SUGERIDA: Laboratório de Esteiras — catálogo de matrizes e estrutura montada]` (condicionado a G4)

**Gestão e indicadores**
- `[IMAGEM SUGERIDA: Jornada por colaborador — seleção de múltiplos colaboradores (avatares) e escopo consolidado]`
- `[IMAGEM SUGERIDA: Evolução das Esteiras — seleção de esteiras e classificações de desvio]`
- `[IMAGEM SUGERIDA: Dashboard — cards do recorte operacional com o seletor de período]`
- `[IMAGEM SUGERIDA: Saúde operacional — colaborador em estado crítico com os sinais que o motivaram]`
- `[IMAGEM SUGERIDA: Colaboradores — coluna de credencial do Modo Fábrica nos 4 estados]`
- `[IMAGEM SUGERIDA: Configurações operacionais — as 6 abas]`
- `[IMAGEM SUGERIDA: Impressão de tickets — opções de agrupamento e estados do agente local]`

---

# J. Próxima etapa recomendada

Sequência de seções a enriquecer, derivada das evidências acima. A ordem privilegia primeiro o que pode **orientar errado**, depois o que o usuário usa com mais frequência.

**Etapa 0 — decisões antes de escrever** (bloqueia parte da redação)
1. Resolver G1 (enum cru no encaixe da fábrica), G2 (parâmetros de URL na tela), G3 (mensagem de PIN), G4 (Laboratório) e G5 (rotas sem menu). São decisões de produto, não de redação.
2. Decidir P2-1: separar o documento-fonte técnico do manual de usuário. Toda a redação seguinte depende dessa escolha.

**Etapa 1 — correções factuais no documento-fonte** (barato, elimina risco de orientação errada)
3. ATI-001 → 4 estados (P0-2); MSG-ATI-005 (P0-3); VAL-017 ampliado (P0-6); 45.4/45.5 em linguagem de alocação (P0-8); cabeçalho com SHA corrente (P2-10); 47.3 completo (P1-15).
4. Fixar o glossário: "atividade" único, "Modo Fábrica" para o canal operacional (P0-1, P0-7).

**Etapa 2 — navegação e taxonomia** (pré-requisito de qualquer guia de usuário)
5. Capítulo de navegação com rótulos reais e os 5 blocos do menu (matriz #1, #2).
6. Capítulo da taxonomia do Painel operacional: buckets, precedência de "Em atraso", recorte "Ativas", aviso de KPI por lista carregada (P0-4, P2-6).
7. Nota sobre rotas sem ponto de entrada e sobre controles não funcionais (P0-5, P0-9).

**Etapa 3 — jornada do colaborador** (maior volume de usuários)
8. Modo Fábrica completo, incluindo PIN, Outra Atividade e Extra Esteira (P1-1).
9. Gaveta global "Apontar horas" (P1-2).
10. Minha Fila e Minha Jornada reescritas em linguagem de tarefa (matriz #27, #31).

**Etapa 4 — jornada do gestor** (maior complexidade)
11. Planejamento Semanal painel por painel, com as duas exportações (P1-4, P1-5).
12. Agenda da Semana com passo-a-passo (P1-11).
13. Estrutura da esteira e inclusão tardia (P1-10).
14. Jornada Gerencial (P1-3); Evolução das Esteiras (P1-12); Dashboard (P1-9).

**Etapa 5 — administração e cadastros**
15. Colaboradores e Usuários (P1-7); Capacidade (P1-8); Configurações Operacionais (P1-13); RBAC e Auditoria (E15, E14).
16. Importação por documento em linguagem de revisão humana (P1-14).

**Etapa 6 — acabamento**
17. Produzir as imagens da seção I, aproveitando a conferência visual para fechar G8.
18. Mover enums para anexo (P2-2); preferências da conta (P2-4); demais itens P2.

---

# Contagem por classificação

Base: as 87 linhas da matriz da seção B. Cada linha recebeu **uma** classificação principal; problemas secundários ficaram nas colunas de observação e nas seções D a G.

| Classificação | Itens | Observação |
|---|---|---|
| `PARCIAL` | 33 | Maior grupo: o tema existe no manual, mas não permite operar o sistema. |
| `OK` | 16 | Inclui 1 item classificado como "OK por omissão deliberada" (menu de gestão por atividade — código morto, não deve ser documentado). |
| `TECNICO_DEMAIS` | 13 | Conteúdo correto em linguagem imprópria para o usuário final. |
| `AUSENTE` | 12 | Funcionalidade existe no sistema e não tem cobertura alguma. |
| `DESATUALIZADO` | 7 | Divergência factual com o código atual. |
| `NAO_CONFIRMADO` | 6 | Inclui 1 item resolvido nesta auditoria (eventos `BLOCKED`/`PAUSED`, VAL-014). |
| **Total** | **87** | |

Leitura: `OK` concentra-se em regras de negócio, mensagens, limites e estados — o manual é factualmente confiável. `PARCIAL` + `TECNICO_DEMAIS` + `AUSENTE` somam **58 de 87 itens (dois terços)** e concentram-se em superfície de interface, instrução de uso e vocabulário — exatamente o que um manual de usuário precisa entregar e este documento, por ser uma auditoria técnica, não entrega.

---

# Validação executada

| Comando | Resultado real |
|---|---|
| `git fetch origin --prune` | OK; `origin/develop` e `origin/main` em `c611d10f` |
| `git rev-list --count 8e9fd062..c611d10f` | `16` |
| `git merge-base --is-ancestor 8e9fd062 b2a40f69` | exit ≠ 0 (não é ancestral) |
| `git merge-base --is-ancestor b2a40f69 8e9fd062` | exit ≠ 0 (não é ancestral) |
| `git diff --name-only 8e9fd062 c611d10f \| grep -v '^docs/'` | 21 arquivos, concentrados em `operational-journey`, `JornadaColaboradorGestorPage` e tema |
| `git checkout -b docs/auditoria-cobertura-funcional-manual-sgp origin/develop` | branch criada a partir de `c611d10f` |
| Verificação literal de 19 mensagens do catálogo 8.1 contra `src/` e `server/src/` | **19/19 encontradas** |
| `grep -c "Modo Fábrica" docs/manual/source/MANUAL_FUNCIONAL_SGP.md` | `0` |
| Busca de produtores de `CONVEYOR_STEP_BLOCKED/PAUSED/UNBLOCKED/RESUMED` em `server/src` e `server/migrations` | `0` ocorrências |
| Busca de escritores de `'BLOCKED'` / `'IN_PROGRESS'` em status de atividade em `server/src` | nenhum escritor (só declarações de tipo) |
| Busca de referências a `EsteiraDetalheMockPage` | apenas a própria declaração (`EsteiraDetalhePage.tsx:1649`) |
| Busca de links para `/app/minhas-atividades` e `/app/meu-trabalho` | apenas ícones em `AppSidebar.tsx:114,136`; nenhum item de menu |

**Build, lint e testes:** não executados. Esta atividade não alterou nenhum arquivo de aplicação, migration ou teste — o único arquivo criado é este relatório Markdown, fora de qualquer pipeline de build, lint ou teste. Nenhum resultado de build/lint/teste é alegado neste relatório.

**Limitações da auditoria:**
1. Auditoria por leitura de código, migrations e testes. **Nenhuma tela foi executada ou observada visualmente**; nenhum banco foi consultado.
2. Cobertura por amostragem direcionada, não varredura exaustiva: 87 itens de matriz cobrindo todas as áreas do escopo, com profundidade desigual — priorizou-se onde o risco de orientação errada era maior.
3. A verificação do catálogo de mensagens (seção 8.1) é amostral: 19 das ~80 mensagens catalogadas. Todas conferiram, o que sustenta a avaliação de qualidade, mas não equivale a verificação integral.
4. Permissões foram lidas de `AppRoutes.tsx`, `app-nav-config.ts` e migrations; **não foi verificado o estado efetivo de RBAC em banco**. VAL-010 e VAL-011 (provisionamento de `rbac.manage_role_permissions` e `time_entries.create_on_behalf`) permanecem abertos por isso.
5. Decisões funcionais pendentes (VAL-001 a VAL-003, VAL-005, VAL-007 a VAL-013, VAL-016) não foram decididas: exigem decisão humana, fora do mandato desta tarefa.
6. `docs/manual/colaborador.html` e `docs/manual/gestor-esteira.html` **não** foram auditados — o escopo instruído é o manual fonte. Isso é relevante porque a coluna "Cobertura atual" do manual se refere justamente a esses HTML.
