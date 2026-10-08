# Retorno — ajustes-tati-2026-10-07

- **TASK_ID:** `ajustes-tati-2026-10-07`
- **Prompt:** `docs/ai/prompts/ajustes-tati-2026-10-07.md`
- **Objetivo:** ajustes alinhados com a Tati — item 1 (Guias Práticos de Colaborador e Gestor) e itens 2 a 10 (ajustes funcionais).
- **Status consolidado:** as duas frentes foram desenvolvidas em paralelo, a partir da mesma base, e **integradas para validação** na branch `integration/ajustes-tati-2026-10-07` (cherry-pick, sem squash/rebase). **Não houve PR, merge em `develop`, deploy nem homologação.** A aceitação depende da validação com a Tati.
- **SHA base comum:** `ecb26da78c4a4dbfefcfab7f5de494a31445555d` (`origin/develop`, v1.9.9)

| Frente | Branch de origem | Commits (SHA original) |
|---|---|---|
| A — Ajustes funcionais (itens 2–10) | `origin/fix/ajustes-tati-2026-10-07` | `2c7e458ee952a1ab3ad5fb9e3eadb5199c88532d` (rodada 1), `f6f1d6a15de694f36cc49a957e19bfbf8032a6ab` (rodada 2) |
| B — Guias Práticos (item 1) | `origin/docs/ajustes-tati-2026-10-07-guias-praticos` | `f8eab69eafafd7cb801fc4b0d83c663e8081f185` |

- **Integração:** detalhes, SHAs resultantes, conflitos e validação em `docs/ai/returns/ajustes-tati-2026-10-07-integracao-retorno.md`.
- **Nota de leitura:** as seções abaixo preservam, sem reescrita, o registro original de cada frente. Menções a "commit local", "sem push" ou "SHA final = `git log -1`" descrevem o estado de cada frente no momento em que foi escrita; as duas branches de origem foram depois publicadas no `origin` com os SHAs da tabela acima. Os guias (frente B) foram escritos **antes** das correções da frente A, por isso registram os itens 7, 8 e 9 como ressalvas (`GUIA-COL-005/006`, `GUIA-GES-004/005`); atualizar os guias/capturas após a validação com a Tati.

---

## Frente A — Ajustes funcionais (itens 2 a 10)

- **TASK_ID:** `ajustes-tati-2026-10-07`
- **Data/hora:** 2026-10-07 23:20 UTC (rodada 1) · atualizado 2026-10-07 23:51 UTC (rodada 2: itens 2 revisto, 5 completo, 10 novo)
- **Prompt:** `docs/ai/prompts/ajustes-tati-2026-10-07.md`
- **Objetivo:** investigar, corrigir e validar os ajustes alinhados com a Tati (itens 2 a 10). O item 1 (Guias Práticos) ficou **fora do escopo** por instrução explícita do usuário nesta sessão.
- **Status final:** itens 2–10 implementados e validados localmente; **commits locais, sem push/PR** (aguardando autorização após a revisão).
- **Rodada 2 (revisão do usuário):** item 2 refeito conforme a especificação revisada (campo único com `&`); item 5 estava parcial (período limitado à semana exibida) e agora atravessa semanas; item 10 implementado.
- **Branch:** `fix/ajustes-tati-2026-10-07` (criada a partir de `origin/develop`)
- **SHA inicial (base):** `ecb26da78c4a4dbfefcfab7f5de494a31445555d` (`origin/develop`, v1.9.9)
- **SHA da rodada 1:** `2c7e458ee952a1ab3ad5fb9e3eadb5199c88532d`
- **SHA final:** o commit local da rodada 2 que contém esta versão do arquivo (informado na resposta da sessão; ver `git log -1`).
- **Remotos confirmados após `git fetch origin --prune`:**
  - `origin/main` = `c611d10feacf329bdc217fe391ebf47a90a6ea7a`
  - `origin/develop` = `ecb26da78c4a4dbfefcfab7f5de494a31445555d`
  - `origin/homol` = `6b768c852a18b7428e3dadf761bad7e35c1d61ef`

### Divergências de processo registradas

- O prompt pedia um **worktree novo**. O checkout da sessão estava **limpo** e sem commits próprios (na branch `ccr-3bb68699-brsrie`, apontando para `origin/main`), e o app da sessão só abre arquivos no diretório principal. Por isso a branch dedicada foi criada **no próprio checkout**, a partir do tip confirmado de `origin/develop`. Nenhuma outra branch foi alterada.
- A sessão designou a branch `ccr-3bb68699-brsrie` para push; o prompt proíbe publicar sem autorização. Prevaleceu a instrução explícita do usuário: **nada foi publicado**.

### Diagnóstico item a item

| # | Tela / origem | Comportamento atual comprovado | Causa-raiz | Tipo |
|---|---|---|---|---|
| 2 | Drawer **Apontar horas** (`QuickTimeEntryDrawer`) → `GET /me/time-entry-candidates` | Campo único `q` com **OR** entre esteira, cliente, veículo, placa, setor e atividade; diferencia acentos. "Corolla Costura" → **0 resultados** (reproduzido via API). | O contrato tinha só um termo livre, sem forma de restringir a esteira **e**, dentro dela, a atividade. | Melhoria pequena |
| 3 | **Evolução das Esteiras** → `ConveyorProgressPrintView` + `window.print()` | Sem orientação; o relatório era renderizado **dentro do shell do app** (`h-dvh` + `overflow-hidden` + `main overflow-y-auto`). No teste local (Chromium headless, instantâneo do DOM no momento do `print()`), o código base gerou **PDF de 1 página em branco**. | Sem `@page`; relatório recortado pelos contêineres do shell; tabela herdava cor clara do tema escuro; colunas espremidas por texto longo. | Melhoria + correção |
| 4 | **Minha fila** → `GET /me/work-queue` | Só por dia (`date`) e atrasadas, com o plano publicado da semana daquele dia. | Não havia filtro de período. | Melhoria |
| 5 | **Planejamento** (`OperationalPlanningPage`) | Quadro semanal (uma semana por vez); filtros do quadro no frontend; sem atalho de data. Não havia como ver o planejado de várias semanas de uma vez. | Os dados só eram carregados por semana (`GET /operational-planning/week`). | Melhoria |
| 10 | **Planejamento** → exportações | Já existiam "Exportar Excel" (abas *Planejamento* e *Capacidade*, só a semana) e "Exportar visão semanal". Não havia backlog na planilha, nem recorte por período, nem instruções para IA. | Exportação limitada à semana e ao planejado. | Melhoria |
| 6 | **Minha jornada** → `GET /my-operational-journey` | O período já existia ("Intervalo personalizado"), mas ficava **recolhido** em "Período e filtros", exigia **as duas datas** e não validava início ≤ fim no cliente (só voltava erro genérico da API). | Descoberta difícil + pontas obrigatórias. | Melhoria pequena |
| 7 | Jornada (colaborador e gestor) → `operational-journey.repository` | (a) Minha jornada **não exibia** nada de Extra Esteira (a API já mandava o resumo). (b) Jornada gerencial mostrava só total e top descrições, **sem a lista**. (c) Todas as agregações faziam `INNER JOIN` com a descrição exigindo `d.deleted_at IS NULL`: **excluir uma descrição do catálogo apagava o histórico** dos totais e da exportação. Reproduzido: com a descrição "Treinamento interno" excluída, a regra antiga soma **183 min / 16** lançamentos; a correta é **223 min / 17**. | Renderização ausente + filtro de soft-delete indevido no histórico. | Correção |
| 8 | Lista de apontamentos (Minha jornada, Jornada gerencial, Apontamento gerencial, painel analítico da atividade, Evolução, exportação XLSX da jornada) | (a) Exceção e fora de sequência só apareciam como **tooltip** no selo (invisível em toque/tablet). (b) A **justificativa voluntária** (catálogo, em apontamento normal) é gravada **somente** em `standard_justification_label_snapshot`/`_complement` (migration 0048) e **nenhuma consulta lia essas colunas** — nunca aparecia em lugar nenhum (confirmado no banco). (c) "Apontamento gerencial" não mostrava justificativa nem observação. | Colunas de catálogo nunca selecionadas + exibição só por tooltip. | Correção |
| 9 | **Dashboard** (`DashboardPage`) | Ao apontar horas pelo botão global "Apontar horas" do cabeçalho com o Dashboard aberto, os cards **não mudavam** e não havia nova consulta (reproduzido: card parado em 72 h 49 min, **0** requisições a `/dashboard/operational` após salvar). | O drawer global não avisava a página aberta; o Dashboard só consultava ao montar ou no botão "Atualizar". Backend e agregações estavam corretos. | Correção |

### O que foi feito

#### Item 2 — pesquisa "Esteira & atividade" (rodada 2, especificação revisada)
- Um **único campo** de pesquisa, com placeholder `Esteira & atividade (ex.: 7070 & XPTO)` e uma dica curta abaixo.
- **Backend** (`my-activities.controller` + `shared/accentInsensitiveSearch.ts`): quando `q` contém `&`:
  - o termo da **esquerda** restringe a esteira/OS (nome, código/OS, cliente, veículo, placa);
  - o termo da **direita** restringe **somente o nome da atividade** dessa esteira (não casa tarefa nem setor);
  - a busca é parcial e ignora maiúsculas/minúsculas, acentos e espaços ao redor do `&`;
  - o filtro é aplicado no SQL das três fontes (alocação, plano publicado e "outras atividades").
- **Acentos:** a extensão `unaccent` não existe no banco e criá-la exigiria migration. Por isso a comparação usa `translate(lower(...))`, com o mesmo mapa aplicado ao termo em JS.
- **Sem `&`:** a pesquisa livre continua idêntica à de antes.
- **Kiosk/Modo Fábrica:** não foi alterado (o controller de produção não interpreta `&`).
- Os parâmetros `conveyorQ`/`activityQ` da rodada 1 continuam aceitos pela API (mesma semântica), mas a tela não os usa mais.

#### Item 3 — PDF retrato/paisagem
- O motor continua o mesmo (`window.print()` do navegador), sem dependência nova. Seletor **"Orientação do PDF"** (Retrato = padrão; Paisagem) gera `@page { size: portrait|landscape; margin: 10mm }`, só enquanto o relatório está montado (a impressão térmica não é afetada). O tamanho do papel continua o da impressora/diálogo.
- O relatório passou a ser renderizado via `createPortal(document.body)`, mesmo padrão de `ThermalActivityTicketsPrintArea`, para não ser recortado pelo shell. Também ganhou cabeçalho de tabela repetido por página, larguras de coluna fixas, cor de texto forçada para impressão, orientação no cabeçalho e justificativa nos apontamentos analíticos.

#### Item 4 — Minha fila por período
- **Semântica:** período sobre a **data planejada** do item no **plano semanal publicado**, porque a fila é derivada do plano publicado. Intervalo inclusivo, datas `YYYY-MM-DD` (America/Sao_Paulo).
- API: `from`/`to` opcionais em `GET /me/work-queue`. O período atravessa vários planos publicados (o vigente de cada semana). Só início → até +91 dias; só fim → desde −91 dias. Janela máxima de 92 dias; `from > to` ou janela maior → 400 com mensagem. Sem `from`/`to`, o modo diário fica idêntico ao atual (URLs `?date=` preservadas).
- No modo período, os totais do resumo valem para o período inteiro e "sobrecarga" (que é diária) não se aplica. "Hoje" de referência = dia civil em São Paulo.
- UI: alternância **Por dia / Por período** (`?mode=periodo&from=&to=`), validação início ≤ fim, feedback "Exibindo atividades com data planejada de … a …", rótulos de KPI e seções ajustados.

#### Item 5 — Planejamento por período (rodada 2: atravessa semanas)
- **Semântica:** **data planejada** do item, inclusiva, em **todas as semanas** do período.
  - Fonte por semana: o mesmo plano que o quadro mostra (rascunho/revisão em edição; sem rascunho, o publicado).
  - Pontas opcionais: com só uma data, a janela vai até 92 dias. Início > fim → aviso e 400 na API.
- **API:** `GET /operational-planning/period-items?from=&to=`, com o mesmo guard das rotas de Planejamento (`conveyors.create`). Retorna itens, semanas abrangidas com a situação de cada plano e totais.
- **UI:**
  - Barra **"Pesquisa por período"** sempre visível no cabeçalho. Na rodada 1, o período ficava dentro dos filtros do quadro, que somem quando a semana está vazia, e era limitado à semana exibida.
  - Painel de resultados com todas as semanas do período: data, colaborador, esteira, atividade, tempo, situação da atividade e versão do plano. Mostra "X de Y itens · horas", chips das semanas com a situação do plano e o botão **"Ver semana"** em cada item.
  - Os demais filtros do quadro (colaborador, esteira, "sem responsável", busca) são aplicados com a mesma regra do quadro sobre esse conjunto completo. "Capacidade excedida" vale só para a semana do quadro, e o painel avisa isso.
  - O quadro semanal continua filtrando os dias da semana exibida.
  - O atalho **"Ir para a data"** foi mantido. O período não é mais limpo ao trocar de semana.
- **Exportação:** a nova exportação para IA (item 10) respeita o período. As exportações existentes ("Exportar Excel" e "Exportar visão semanal") continuam semanais, sem alteração.

#### Item 10 — Exportação Excel para IA (rodada 2)
- **Ponto de partida verificado:** já existiam `GET /operational-planning/week/export.xlsx` (abas *Planejamento* e *Capacidade*) e a visão semanal. Nenhuma das duas foi alterada.
  - O novo export **reutiliza** os estilos, cores e helpers de célula do export semanal (foi preciso só tornar os helpers exportados) e as regras canônicas `buildCapacityByCollaboratorDay`, `classifyCapacityRow` e `mapExportActivityStatusLabel`.
- **API:** `GET /operational-planning/export-ai.xlsx?from=&to=` (período) **ou** `?weekStart=` (semana), mesmo guard. Gerado no backend a partir do banco (não usa dados do navegador); o backlog é lido sem a paginação de 200 da tela.
- **Botão:** "Exportar para IA (período)" quando a pesquisa por período está ativa; senão, "Exportar para IA (semana)" com a semana exibida. Com alterações não salvas, salva o rascunho antes, como o "Exportar Excel".
- **Abas:**
  1. **Prompt para IA** — instruções:
     - não alterar o que já está planejado;
     - respeitar capacidade/saldo, dias úteis, datas/prazos, prioridade, sequência, equipe/responsável e duração;
     - não inventar dados.
     Inclui um formato de resposta sugerido e o dicionário das abas.
  2. **Backlog** — estoque atual elegível, independente do recorte. Duas origens:
     - "Backlog": atividades disponíveis no backlog canônico;
     - "Aguardando encaixe": itens do plano da esteira ainda não encaixados em nenhum plano semanal.
     Campos: IDs, código/OS, esteira, cliente, veículo, placa, prioridade, prazo (e se está vencido, destacado em vermelho), tarefa, setor, atividade, quantidade, tempos previsto/realizado/pendente, colaboradores e equipes alocados, fora de sequência, data/responsável sugeridos e situação.
  3. **Planejado** — itens do recorte. Campos: semana, situação do plano, data, dia, IDs, colaborador, equipe, esteira, prioridade, prazo, tarefa, setor, atividade, ordem, quantidade, tempo, situação da atividade e observações.
  4. **Carga dos colaboradores** — por colaborador (ativos + alocados): equipe(s), dias úteis do recorte, dias sem capacidade cadastrada, capacidade somada (configuração operacional; sem cadastro → "Capacidade não cadastrada", nada inventado), horas planejadas (= soma da aba Planejado), saldo e ocupação como **fórmulas** do Excel, e situação.
  5. **Carga por dia** — o mesmo detalhamento por colaborador e dia útil.
- **Formatação:**
  - cabeçalho `#1F2933` com texto branco, como no export atual;
  - filtros e primeira linha de dados congelada;
  - datas `dd/mm/aaaa`, tempos `[h]:mm`, saldo em minutos;
  - cores de situação (vermelho = sobrecarregado/prazo vencido, âmbar = no limite, verde = concluída) **sempre acompanhadas** de coluna de texto.
- **Limitação:** itens planejados só para equipe (sem colaborador) não entram na carga individual. Isso está documentado na aba de prompt.

#### Item 6 — Minha jornada por período
- **Semântica (inalterada):** data do apontamento (`entry_at`, dia civil de São Paulo). A carga de atividades continua sendo o retrato atual, sem período, como já era.
- "Período e filtros" agora vem **aberto** e mostra a janela no resumo. No intervalo personalizado, as datas são **opcionais** (sem fim = até hoje; sem início = desde o primeiro registro), com validação início ≤ fim no cliente e texto explicativo. A tela não tem exportação.

#### Item 7 — Extra Esteira
- Backend: removido o filtro `d.deleted_at IS NULL` das 5 agregações/listas Extra Esteira da jornada (inclusive a exportação), preservando o histórico. Nova lista `recentExtraTimeEntries` no período (até `limit`), com origem WEB/Modo Fábrica.
- UI: seção **"Extra Esteira no período"** em Minha jornada e na Jornada gerencial (com o nome do colaborador em seleção múltipla), mais o chip "Extra Esteira (período)" em Minha jornada. Lançamentos do Kiosk aparecem com o selo "Modo Fábrica".
- Extra Esteira **não** é somado aos minutos de esteira, o que mantém a regra existente.

#### Item 8 — Justificativas
- Backend: as consultas de leitura passam a expor `standardJustificationLabel`/`standardJustificationComplement` (lista por atividade e jornada). A Evolução e a exportação da jornada usam a justificativa efetiva: exceção/fora de sequência ou, na ausência delas, a justificativa padronizada (`server/src/shared/timeEntryJustificationDisplay.ts`).
- UI: novo `TimeEntryJustificationNote` com a justificativa em **texto visível**, mais a "Observação" (texto livre), em Minha jornada, Jornada gerencial, Apontamento gerencial e painel analítico da atividade. Os selos/tooltip continuam.
- **Permissões:** nenhum endpoint novo e nenhuma mudança de RBAC. Os campos foram acrescentados a respostas que **já** devolviam as justificativas de exceção/fora de sequência ao mesmo público, então nenhum perfil passa a ver apontamentos que antes não via.

#### Item 9 — Dashboard
- Novo evento in-app `sgp:operational-data-changed` (`src/lib/operational/operationalDataEvents.ts`), disparado pelo drawer após apontamento, conclusão ou Extra Esteira. O Dashboard escuta e **reconsulta o backend**. Também reconsulta ao voltar para a aba depois de 30 s ou mais (ex.: alterações feitas na aba aberta pelo drill-down). Minha jornada também escuta.
- Sem polling. Nenhuma regra ou agregação foi movida para o frontend. Os agregados do backend não mudaram.
- **Observação (não alterada):** o card "Alocações em STEPs" conta alocações de etapas inativas/esteiras finalizadas, enquanto a carga por colaborador considera só etapas ativas. Mudar isso seria mudar a semântica canônica, então fica para decisão.

### Arquivos

**Criados:**
- `server/src/modules/my-work-queue/work-queue-period.ts`
- `server/src/shared/timeEntryJustificationDisplay.ts`
- `server/src/tests/my-work-queue-period.integration.test.ts`
- `server/src/tests/work-queue-period.test.ts`
- `src/components/operational/JourneyExtraTimeEntriesSection.tsx`
- `src/components/operational/TimeEntryJustificationNote.tsx`
- `src/domain/operational/periodFilter.ts` (+ `.test.ts`)
- `src/domain/operational/timeEntryJustificationDisplay.ts` (+ `.test.ts`)
- `src/features/conveyor-progress/conveyorProgressPdfOrientation.ts`
- `src/lib/operational/operationalDataEvents.ts` (+ `.test.ts`)
- `docs/ai/prompts/ajustes-tati-2026-10-07.md` (atualizado com o prompt revisado)
- este retorno

**Criados na rodada 2:**
- `server/src/shared/accentInsensitiveSearch.ts`
- `server/src/shared/operationalDateRange.ts`
- `server/src/modules/operational-planning/operational-planning.range.ts`
- `server/src/modules/operational-planning/operational-planning.range.service.ts`
- `server/src/modules/operational-planning/operational-planning.range.controller.ts`
- `server/src/modules/operational-planning/operational-planning.ai-export.ts`
- `server/src/tests/accent-insensitive-search.test.ts`
- `server/src/tests/operational-planning-range.integration.test.ts`
- `src/features/operational-planning/PlanningPeriodSearchPanel.tsx`

**Alterados na rodada 2:**
- `my-activities` (controller, repository, schemas, service)
- `my-work-queue/work-queue-period.ts` (passa a usar o resolvedor compartilhado)
- `operational-planning` (routes; repository — colunas adicionais de prioridade, quantidade e código/OS; service — campos aditivos no backlog; export — helpers passaram a ser exportados)
- `time-entry-candidates-http.integration.test.ts`
- `QuickTimeEntryDrawer`
- `myActivitiesApiService`
- `operationalPlanningApiService` (+ teste)
- tipos de Planejamento
- `OperationalPlanningPage`

**Alterados (backend):**
- `my-activities` (schemas, controller, service, repository)
- `my-work-queue` (schemas, controller, dto, service, repository)
- `operational-journey` (dto, service, repository)
- `conveyors/conveyorAssignments` (dto, repository)
- `conveyor-progress` (dto, repository, service)
- `server/src/tests/time-entry-candidates-http.integration.test.ts`

**Alterados (frontend):**
- `QuickTimeEntryDrawer`
- `MyWorkQueuePage`
- `JornadaPage`
- `JornadaColaboradorGestorPage`
- `ApontamentoGestorPage`
- `DashboardPage`
- `OperationalPlanningPage`, `planningBoardFilters` (+ teste), `planningDeviationIndicators`
- `ConveyorProgress*` (Page, Filters, PrintView, AnalyticalEntries, hook de impressão, teste)
- `StepAnaliticoPanel`, `buildStepAnaliticoDetalheFromApi`
- tipos de domínio e services de API correspondentes

**Removidos:** nenhum.

- **Migrations:** nenhuma. Os itens usam colunas existentes (0048, 0052). Nenhuma migration foi aplicada em ambiente compartilhado.
- **Versão, infra, auth, RBAC, Kiosk:** não alterados.

### Validação executada (resultados reais)

Ambiente local descartável: PostgreSQL 16 em `/var/tmp` (porta 55432), migrations `0001`–`0053` e seed oficial aplicados. Dados fictícios: esteiras "Civic Demo"/"Corolla Demo", planos publicados nas semanas de 05/10 e 12/10/2026.

| Comando | Resultado |
|---|---|
| `npm run build` (tsc -b + vite build) | **OK** (exit 0) |
| `npm --prefix server` `tsc -p tsconfig.json` | **OK** (exit 0) |
| `npx eslint .` | 117 problemas (94 erros, 23 avisos) — **idêntico à baseline de `develop`** (comparado arquivo a arquivo; nenhum novo) |
| `npx vitest run` (frontend) | 1426 ok / **5 falhas preexistentes** (`ApontamentoPage.test.tsx` ×3, `ApontamentoGestorPage.test.tsx` ×2 — falham igualmente sem as alterações: botão "Registar apontamento" não encontrado) |
| `npx vitest run` (servidor, com banco) | 1253 ok / 16 skip / **5 falhas, todas fora do escopo**: 4 preexistentes (versão `1.9.9` vs `1.9.4` esperada; texto "colaborador operacional vinculado" ×2; fórmula `=SUM` no XLSX semanal), confirmadas com `git stash` sobre o código base. A 5ª (`production-auth` "ordenada por nome") é do **ambiente local**: o banco novo usa collation `C` e os testes rodaram 3× acumulando nomes ("Pri C HTTP…" vs "Pri C bb…"), o que diverge do `localeCompare('pt-BR')` do teste. Não tem relação com as alterações. |
| Rodada 2 — testes completos | Frontend: build OK; lint 117 problemas (94 erros), **nenhum novo** vs. baseline; vitest 1428 ok / as mesmas 5 falhas preexistentes. Servidor: tsc OK; vitest 1261 ok / 16 skip / as mesmas 5 falhas fora do escopo listadas acima. |
| Rodada 2 — testes novos | `time-entry-candidates-http.integration` (exemplos obrigatórios `7070 & XPTO` → 3 atividades, `7070 & banco` → 2, acentos/maiúsculas/espaços, termo direito não casa a tarefa, sem `&` inalterado); `accent-insensitive-search`; `operational-planning-range.integration` (período atravessa semana publicada + rascunho, 400/403, `.xlsx` lido com ExcelJS: abas, cabeçalhos, filtro, congelamento, fórmula de saldo, Planejado × Carga, backlog com prioridade/tempo; export por semana); `operationalPlanningApiService` (URLs) — **todos passando** |
| Testes novos/alterados (rodada 1) | `time-entry-candidates-http.integration` (filtro AND), `my-work-queue-period.integration` (6 casos: modo diário, várias semanas, pontas abertas, 400s), `work-queue-period`, `periodFilter`, `timeEntryJustificationDisplay`, `operationalDataEvents`, `planningBoardFilters` (período), `conveyorProgressPage` (orientação) — **todos passando** |

Validação manual local (API + Vite + Chromium/Playwright; capturas e PDFs guardados fora do repositório):

- **Item 2 (rodada 2):** esteira fictícia "Gol GTI Demo", OS `7070`:
  - `7070 & XPTO` → corte do tecido XPTO, Costura do tecido XPTO, Revestir banco com tecido XPTO;
  - `7070 & banco` → Revestir banco com tecido XPTO, Revestir banco do couro;
  - `7070&BANCÓ` → as mesmas duas;
  - o placeholder aparece no drawer.
  Esteiras de teste com código iniciado por 7070 também aparecem, o que está correto para busca parcial.
- **Item 3:** PDF Retrato = 612×792 pt, 5 páginas; Paisagem = 792×612 pt, 6 páginas. Título, cabeçalho de colunas e justificativas presentes (`pdftotext`). Código base, mesmo método: 1 página em branco.
- **Item 4:** 05–16/10 → 5 atividades, KPIs "no período", feedback correto; 12–16/10 → só a semana seguinte; início > fim → mensagem; `?date=2026-10-07` → modo diário inalterado.
- **Item 5 (rodada 2):** 06–15/10 → painel com "5 de 5 itens · 5 h" em duas semanas (05/10 e 12/10, publicadas), incluindo itens de 13/10 e 15/10, fora da semana exibida; início > fim → mensagem.
- **Item 10 (rodada 2):** download pela tela de `planejamento-ia-periodo-2026-10-06-a-2026-10-15.xlsx` e `planejamento-ia-semana-2026-10-05-a-2026-10-09.xlsx`, abertos com openpyxl:
  - 5 abas; cabeçalho `FF1F2933`/branco; filtro e congelamento `A4` em todas;
  - período: Planejado = 5 itens/300 min, carga da Maria = 8 dias úteis, capacidade 3840 min, planejado 300 min, fórmulas `=(F-G)*1440` e `=G/F`;
  - semana: 3 itens/180 min, 5 dias úteis;
  - Planejado × Carga consistentes nos dois arquivos.
- **Item 6:** só data inicial → carrega com "Janela"; início > fim → mensagem.
- **Item 7:** seção Extra Esteira com "Treinamento interno" mesmo após excluir a descrição do catálogo; origem Modo Fábrica exibida.
- **Item 8:** "Justificativa: Atividade anterior pendente de outro colaborador — Aguardando peça" (voluntária), "Justificativa (fora de sequência): …" e "Observação: Ajuste no ponto" visíveis.
- **Item 9:** base → card parado (72 h 49 min) e 0 reconsultas; branch → 70 h 44 min → 72 h 49 min (+125 min apontados) com 1 reconsulta automática, sem clicar em "Atualizar".

Não houve regressão observada em permissões (nenhuma rota/guard alterada), paginação (as telas alteradas não paginam; filtros novos de API são aplicados no SQL), totais existentes ou Kiosk (rotas `/production` intocadas; único efeito: campo extra `period: null` na resposta da fila de produção).

### Pendências, riscos e ressalvas

1. **Item 1 (Guia Prático/manuais)** não foi feito, por instrução do usuário. Os capítulos 7, 10, 11, 12, 14 e 15 do manual descrevem comportamentos que mudaram e devem ser atualizados depois.
2. **PDF:** a validação usou Chromium headless. A orientação via `@page size` é respeitada pelo Chrome/Edge (o diálogo trava a orientação); o Firefox respeita parcialmente. Validar com a Tati no navegador usado na fábrica.
3. **Planejamento:** o quadro de arrastar e soltar continua semanal; a visão entre semanas é o painel de pesquisa (somente leitura). "Exportar Excel" e "Exportar visão semanal" continuam semanais; o período é aplicado na exportação para IA.
7. **Exportação para IA:** a coluna "Prazo vencido" usa a regra existente do backlog (`isDeadlineOverdue`); prazos em texto livre (ex.: "15 dias") não são interpretados como data. A planilha não envia nada a serviços de IA; é só um arquivo para uso posterior.
4. **Minha fila:** janela máxima de 92 dias e "Por período" mostra só planos **publicados** (regra existente da fila).
5. Card "Alocações em STEPs" (ver item 9): possível inconsistência semântica preexistente, não alterada.
6. A suíte de testes de integração altera dados do banco onde roda. Nunca rodá-la contra banco compartilhado.

### Roteiro objetivo de validação com a Tati (08/10, 09:00–09:30)

1. **Apontar horas** (cabeçalho): pesquisar `7070 & XPTO` (trocar 7070 por uma OS real) → só as atividades daquela OS com "XPTO" no nome. Testar `7070 & banco` e uma pesquisa sem `&` (inalterada).
2. **Evolução das Esteiras:** selecionar 3+ esteiras → *Orientação do PDF* = Retrato → *Gerar PDF*; repetir com Paisagem. Conferir título, colunas e páginas seguintes.
3. **Minha fila** → *Por período* → De/Até atravessando duas semanas; testar datas invertidas (mensagem); voltar em *Por dia*.
4. **Planejamento** → *Pesquisa por período* atravessando duas ou mais semanas → painel com os itens de todas as semanas, "Ver semana", e combinação com o filtro de colaborador. Testar datas invertidas (mensagem).
4b. **Planejamento** → *Exportar para IA (período)* e, sem período, *Exportar para IA (semana)* → abrir o Excel e conferir as abas Prompt, Backlog, Planejado e Carga (o saldo bate com capacidade − planejado).
5. **Minha jornada** → "Período e filtros" (já aberto) → *Intervalo personalizado* só com a data inicial.
6. **Extra Esteira:** lançar um Extra Esteira (web e/ou Modo Fábrica) → conferir a seção "Extra Esteira no período" (Minha jornada e Jornada por colaborador).
7. **Justificativas:** apontar com justificativa do catálogo (normal e fora de sequência) → conferir o texto visível em Minha jornada, Jornada por colaborador, Apontamento gerencial e painel da atividade.
8. **Dashboard:** anotar "Minutos apontados (acumulado)" → *Apontar horas* pelo cabeçalho sem sair do Dashboard → o card atualiza sozinho.

### Próximo passo recomendado

Revisar o diff das duas rodadas. Se aprovado, autorizar o push da branch `fix/ajustes-tati-2026-10-07` e a abertura de PR para `develop`. Depois da validação com a Tati, atualizar o manual (item 1).

### Estado final

- **Commits:** locais (rodada 1 `2c7e458e` + rodada 2) na branch `fix/ajustes-tati-2026-10-07`. **Sem push, sem PR, sem merge/deploy.**
- **`git status` após o commit:** limpo (artefatos de validação mantidos fora do repositório; `server/dist` removido).
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.

---

## Frente B — Guias Práticos (item 1)

- **TASK_ID:** `ajustes-tati-2026-10-07`
- **Data/hora:** 2026-10-07 23:59 UTC (20:59 em São Paulo)
- **Prompt:** `docs/ai/prompts/ajustes-tati-2026-10-07.md`
- **Escopo desta rodada (instrução humana):** **somente o item 1** — revisar e reconstruir os Guias Práticos de Colaborador e Gestor, com capturas. Itens 2 a 10 **não** foram implementados.
- **Status final:** item 1 concluído; commit local; **não publicado** (sem push, sem PR).

### Git

| Item | Valor |
|---|---|
| Branch | `ccr-8b9d5816-zloyfa` (branch designada pela sessão) |
| SHA inicial da sessão | `c611d10feacf329bdc217fe391ebf47a90a6ea7a` (= `origin/main`) |
| Base de trabalho | `ecb26da78c4a4dbfefcfab7f5de494a31445555d` (= tip de `origin/develop`, avanço fast-forward) |
| `origin/main` | `c611d10feacf329bdc217fe391ebf47a90a6ea7a` |
| `origin/develop` | `ecb26da78c4a4dbfefcfab7f5de494a31445555d` |
| `origin/homol` | `6b768c852a18b7428e3dadf761bad7e35c1d61ef` |
| SHA final | ver o commit local que contém este arquivo (`git log -1`) |

**Divergência de processo:** o prompt pede um worktree novo e uma branch como `fix/ajustes-tati-2026-10-07`. A sessão remota só permite trabalhar na branch `ccr-8b9d5816-zloyfa`. O checkout estava limpo. A branch foi avançada por fast-forward até o tip de `origin/develop`, sem rebase nem force. `main`, `develop` e `homol` não foram alterados.

### O que foi feito

1. Localizei os dois guias canônicos: `docs/manual/colaborador.html` e `docs/manual/gestor-esteira.html`. Eles são escritos à mão e não são gerados (ver `docs/manual/source/README.md`). Não criei uma terceira fonte e não alterei o manual completo.
2. Montei um ambiente local descartável: PostgreSQL 16 local, migrations `0001`–`0053`, seed oficial e um seed complementar com **dados 100% fictícios** via API: colaboradores "Ana Exemplo", "Bruno Fictício", "Carla Modelo", "Diego Teste" e "Gabriela Gestora"; esteiras OS 7070 a 7073; plano semanal publicado; apontamentos e Extra Esteira. Também rodei o backend real e o frontend em modo `real`.
3. Rodei cada jornada com Playwright (Chromium local, `pt-BR`, `America/Sao_Paulo`) nos perfis padrão **COLABORADOR** e **GESTOR**, além do totem (`/app/kiosk`) e do navegador da fábrica (`/app/producao`). Gerei **40 capturas** (21 do Colaborador e 19 do Gestor). Depois otimizei as imagens para PNG de 256 cores: de 8,7 MB para 3,4 MB.
4. Conferi cada orientação contra o código e contra a execução. Reescrevi os dois guias em jornadas curtas (o que fazer, onde clicar, o que deve acontecer, bloqueios e recuperação), com índice, âncoras e uma captura por passo importante.
5. Criei em cada guia o capítulo final **"Divergências, ressalvas e decisões pendentes"**, com IDs estáveis: `GUIA-COL-001…010` e `GUIA-GES-001…010`. Cada item traz tela, perfil, evidência, comportamento observado, impacto, risco e decisão necessária. Os itens são referenciados nas seções do guia.
6. Validei a renderização dos HTML em 1280px e 390px: nenhuma imagem quebrada e nenhuma rolagem horizontal.

### Arquivos

- **Alterados:** `docs/manual/colaborador.html`, `docs/manual/gestor-esteira.html`. Ambos foram reescritos e o CSS é embutido, sem CDN de fontes.
- **Criados:** `docs/manual/img/guia-colaborador/*.png` (21), `docs/manual/img/guia-gestor/*.png` (19), `docs/ai/prompts/ajustes-tati-2026-10-07.md` e este retorno.
- **Removidos:** nenhum.
- **Não alterados:** `src/`, `server/`, migrations, testes, `package.json`, `app-version.json`, `docs/manual/manual-usuario.html` e `docs/manual/source/*`.
- **Migrations envolvidas:** nenhuma.

### Principais divergências encontradas (guia anterior × sistema)

| Guia anterior dizia | Sistema real (código/execução) |
|---|---|
| Menu "Minhas Atividades" é a tela principal | fora do menu; o colaborador usa **Minha fila** e **Minha jornada** (`GUIA-COL-001`) |
| Kiosk aceita "PIN 4+ dígitos"; Produção web "similar ao Kiosk" | totem exige exatamente 4 dígitos; o navegador aceita de 4 a 8 e não conclui atividade nem lança Extra Esteira (`GUIA-COL-008`) |
| Jornada com filtros "Hoje / Esta semana / Este mês" | 7/15/30 dias, Mês atual (UTC) e Intervalo personalizado |
| Justificativa aparece na tela de apontamento "quando necessário" | a página `/app/apontamento/:id` não tem justificativa nem conclusão (`GUIA-COL-007`) |
| Designar pelo "+" na aba Estrutura do detalhe; "Ver carga de trabalho" | o detalhe só lê as alocações; alocação é feita em Nova esteira ou Alterar esta esteira (`GUIA-GES-002`) |
| Criar apontamento em nome do colaborador com `time_entries.create_on_behalf` | a permissão não é criada por nenhuma migration; em base limpa, ninguém lança em nome de outro (`GUIA-GES-001`) |
| Toda transição de status exige motivo | Cancelar e Finalizar não pedem confirmação nem motivo (`GUIA-GES-006`) |
| PIN: Resetar, Desbloquear, Ativar/Inativar acesso | só existe **Redefinir PIN**, com PIN provisório fixo 1234 (`GUIA-GES-008`) |
| Plano operacional: "Gerar plano / Aprovar" | a tela mostra "Criar plano operacional"; o fluxo não foi auditado e o texto foi retirado (`GUIA-GES-007`) |
| Evolução: "Imprimir" e "Imprimir Fichas" | **Gerar PDF** por seleção de esteiras e **Imprimir ticket** por atividade (`GUIA-GES-009`) |

Inconsistências observadas na execução e registradas sem correção (fora do escopo desta rodada):

- `GUIA-COL-002` / `GUIA-GES-003`: o previsto aparece por unidade em umas telas e pelo total em outras.
- `GUIA-COL-003`: o papel aparece como "Apoio" para a responsável principal quando a gaveta é aberta pela fila.
- `GUIA-COL-004`: a Minha jornada agrupa pela situação da esteira e mostra o rótulo "Concluída" de forma indevida.
- `GUIA-COL-005`: Extra Esteira não aparece na Minha jornada (item 7 da lista).
- `GUIA-COL-006` / `GUIA-GES-004`: as justificativas não são exibidas (item 8).
- `GUIA-GES-005`: cards do Dashboard não reproduzidos (item 9).

### Tabela de cobertura

| Jornada do guia | Perfil | Tela / captura | Regra comprovada no código | Divergência corrigida | Ressalva |
|---|---|---|---|---|---|
| Entrar no SGP+ | Colaborador | Login / `col 01` | `server/src/modules/auth/*.schemas.ts` (senha mín. 8) | — | — |
| Conhecer a tela / alterar senha | Colaborador | Menu do usuário, Alterar senha / `col 12, 13` | `src/lib/shell/app-nav-config.ts`; `AppHeader.tsx` | menu "Minhas Atividades" → Minha fila | GUIA-COL-001, 009 |
| Ver o trabalho do dia | Colaborador | Minha fila / `col 02, 03` | fila nasce do plano publicado (`my-work-queue`) | caminho e botões ("Apontar horas", não ícone de relógio) | — |
| Apontar pela fila | Colaborador | Registrar tempo / `col 04, 05` | `postTimeEntryBodySchema` (min ≥ 1, qtd ≥ 0, data não futura) | campos e nomes reais | GUIA-COL-002, 003 |
| Justificativa | Colaborador | Fora de sequência / `col 06` | `conveyorAssignments.schemas.ts` (out-of-sequence/exception) | web não exige justificativa por tempo excedido | — |
| Concluir | Colaborador | gaveta (texto) | `markAsDone`; `Concluir atividade` só para alocado | — | — |
| Fora da fila / fora da alocação | Colaborador | Apontar horas / `col 07, 08` | `listTimeEntryUnassignedOpenStepsForCollaborator` | — | — |
| Extra Esteira | Colaborador | aba Extra esteira / `col 09` | `/me/extra-time-entries` | — | GUIA-COL-005 |
| Minha jornada | Colaborador | Jornada / `col 10, 11` | `JornadaPage.tsx` (bucket da esteira; 20 registros) | períodos reais (não Hoje/Esta semana) | GUIA-COL-004, 006, 007 |
| Totem | Colaborador | Kiosk / `col 14–20` | `KioskPinPad.tsx` (`PIN_LENGTH = 4`); justificativa por tempo excedido | PIN de 4 dígitos; fluxo de criação de PIN | GUIA-COL-008 |
| Navegador da fábrica | Colaborador | SGP+ Produção / `col 21` | `production.schemas.ts` (PIN 4–8) | Concluir etapa desativado | GUIA-COL-008 |
| Correção pelo colaborador | Colaborador | (texto) | rota gerencial exige `edit_any`/`delete_any`/`create_on_behalf` | "fale com o gestor" mantido, com evidência | GUIA-COL-010 |
| Menu e permissões | Gestor | (texto) | `app_role_permissions` do perfil GESTOR | nomes atuais do menu | GUIA-GES-009 |
| Painel operacional | Gestor | Painel / `ges 01` | cartões não respondem aos filtros | "Backlog" → Painel operacional | — |
| Criar esteira | Gestor | Nova esteira / `ges 02, 02b` | `postConveyorStepSchema` (Qtd ≥ 1, um principal) | alocação na criação/alteração | GUIA-GES-002 |
| Ciclo de vida | Gestor | Detalhe / `ges 03, 06` | `conveyorOperationalStatus.ts` (transições) | volta exige motivo; cancelar/finalizar não | GUIA-GES-006 |
| Ações de atividade | Gestor | Estrutura operacional / `ges 05` | `EsteiraDetalhePage.tsx` (confirmações) | — | GUIA-GES-003 |
| Planejamento | Gestor | Planejamento / `ges 07, 07b` | `saveOperationalWeekPlanBodySchema` (seg–sex) | salvar ≠ publicar | GUIA-GES-010 |
| Agenda da semana | Gestor | Agenda / `ges 08` | mesmo plano semanal | — | GUIA-GES-010 |
| Evolução das Esteiras | Gestor | Evolução / `ges 09` | botão Gerar PDF | "Imprimir/Imprimir Fichas" removidos | GUIA-GES-009 |
| Dashboard | Gestor | Dashboard / `ges 10` | `dashboard.view_operational` | visão Gerencial só para ADMIN | GUIA-GES-005 |
| Jornada por colaborador | Gestor | Jornada gestão / `ges 11` | exibe Extra Esteira | — | GUIA-GES-003 |
| Corrigir apontamento | Gestor | Apontamento gerencial / `ges 12, 12b` | `patchTimeEntryBodySchema` (um campo por vez) | lançamento em nome de outro indisponível | GUIA-GES-001, 004 |
| PIN do Modo Fábrica | Gestor | Colaboradores / `ges 13, 13c` | `ColaboradoresPage.tsx` (Redefinir PIN, 1234) | ações inexistentes removidas | GUIA-GES-008 |
| Equipes | Gestor | Nova equipe / `ges 14` | equipe = alocação de apoio | — | — |
| Saúde operacional | Gestor | Saúde / `ges 15` | — | — | — |
| Configurações operacionais | Gestor | Descrições / `ges 16` | catálogos de Extra Esteira, justificativas e dispensa | — | — |
| Plano operacional da esteira | Gestor | não capturado | `ConveyorOperationalPlanEmptyState.tsx` | texto antigo retirado | GUIA-GES-007 |

### Validação (execução real)

| Comando | Resultado |
|---|---|
| `npm run manual:usuario:html:check` | exit 0 (manual integral intacto) |
| `npx vitest run src/lib/help` | 1 arquivo, 19 testes passando |
| `npm run build` | exit 0 (só avisos de tamanho de chunk, preexistentes) |
| `npx eslint .` | **exit 1 — 94 erros e 23 avisos, todos preexistentes**, em `src/features`, `server/src`, `src/components`, `src/lib`, `sgp-print-agent`, `src/pages` e `src/mocks`. Nenhum arquivo desta entrega é analisado pelo ESLint (só HTML/PNG/MD) |
| Renderização dos guias (Playwright, 1280px e 390px) | 0 imagens quebradas; 0 elementos com rolagem horizontal |
| Checagem de âncoras e imagens referenciadas | 0 âncoras quebradas; 0 imagens ausentes; 0 imagens sem uso |

Não foram executados testes de backend nem typecheck do servidor, porque nenhum código foi alterado.

### Pendências, riscos e ressalvas

- **Itens 2 a 10 do prompt não foram feitos**, por instrução desta rodada. As divergências que se relacionam a eles (7, 8 e 9) estão registradas nos guias como ressalvas, não como entregas.
- `GUIA-GES-001` exigiria uma migration de permissão. Pelo prompt, isso depende de autorização humana. Antes de decidir, confirmar se o ambiente real já tem `time_entries.create_on_behalf` cadastrada à mão.
- O logotipo exibido no menu lateral das capturas faz parte da interface do produto (asset do app), não de dados de cliente. Todos os demais dados nas imagens são fictícios.
- As capturas refletem a configuração **padrão** dos perfis GESTOR e COLABORADOR. Ambientes com permissões ajustadas em "Permissões por papel" podem mostrar outros itens de menu.
- O Plano Operacional da Esteira e a Importação por documento não foram reauditados nesta rodada.
- Os guias continuam fora do app: não há link no menu **? Ajuda**. A abertura é pelo arquivo, como antes.
- Os scripts de seed e captura ficaram fora do repositório (scratchpad da sessão). Para atualizar as capturas depois das correções dos itens 2 a 10, será preciso refazer o roteiro descrito na seção "O que foi feito".

### Roteiro objetivo de validação com a Tati (08/10, 09:00–09:30)

1. Abrir `docs/manual/colaborador.html` e percorrer as seções 3 a 9, comparando cada captura com a tela real em homologação.
2. Abrir `docs/manual/gestor-esteira.html` e percorrer as seções 3, 4, 6 e 9.
3. Ler os dois capítulos de divergências e decidir, item por item: corrigir no sistema, aceitar como regra ou ajustar o texto.
4. Confirmar se `time_entries.create_on_behalf` existe em produção (`GUIA-GES-001`).

### Próximo passo recomendado

Com a autorização para publicar, enviar a branch e abrir PR para `develop`. Em seguida, iniciar o item 2 (pesquisa `esteira & atividade`) em uma nova rodada.

### Estado final

- `git status`: limpo após o commit local. Ficam apenas os arquivos ignorados `.env.local`, `server/.env` e `dist/`, usados na execução local e não versionados.
- Commit: local na branch `ccr-8b9d5816-zloyfa`. **Push: não realizado** (o prompt exige autorização explícita após a revisão). **PR: não aberto.**
- Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
