# Retorno — ajustes-tati-2026-10-07

- **TASK_ID:** `ajustes-tati-2026-10-07`
- **Data/hora:** 2026-10-07 23:20 UTC (20:20 em São Paulo)
- **Prompt:** `docs/ai/prompts/ajustes-tati-2026-10-07.md`
- **Objetivo:** investigar, corrigir e validar os ajustes alinhados com a Tati (itens 2 a 9). O item 1 (Guia Prático e manuais) ficou **fora do escopo** por instrução explícita do usuário nesta sessão.
- **Status final:** itens 2–9 implementados e validados localmente; **commit local, sem push/PR** (aguardando autorização após a revisão).
- **Branch:** `fix/ajustes-tati-2026-10-07` (criada a partir de `origin/develop`)
- **SHA inicial (base):** `ecb26da78c4a4dbfefcfab7f5de494a31445555d` (`origin/develop`, v1.9.9)
- **SHA final:** o commit local que contém este arquivo (ver `git log -1` na branch; informado na resposta da sessão).
- **Remotos confirmados após `git fetch origin --prune`:**
  - `origin/main` = `c611d10feacf329bdc217fe391ebf47a90a6ea7a`
  - `origin/develop` = `ecb26da78c4a4dbfefcfab7f5de494a31445555d`
  - `origin/homol` = `6b768c852a18b7428e3dadf761bad7e35c1d61ef`

## Divergências de processo registradas

- O prompt pedia um **worktree novo**. O checkout da sessão estava **limpo** e sem commits próprios (na branch `ccr-3bb68699-brsrie`, apontando para `origin/main`), e o app da sessão só abre arquivos no diretório principal. Por isso a branch dedicada foi criada **no próprio checkout**, a partir do tip confirmado de `origin/develop`. Nenhuma outra branch foi alterada.
- A sessão designou a branch `ccr-3bb68699-brsrie` para push; o prompt proíbe publicar sem autorização. Prevaleceu a instrução explícita do usuário: **nada foi publicado**.

## Diagnóstico item a item

| # | Tela / origem | Comportamento atual comprovado | Causa-raiz | Tipo |
|---|---|---|---|---|
| 2 | Drawer **Apontar horas** (`QuickTimeEntryDrawer`) → `GET /me/time-entry-candidates` | Campo único `q` com **OR** entre esteira, cliente, veículo, placa, setor e atividade. "Corolla Costura" → **0 resultados** (reproduzido via API). | Contrato só tinha um termo livre; não havia como cruzar esteira **e** atividade. | Melhoria pequena |
| 3 | **Evolução das Esteiras** → `ConveyorProgressPrintView` + `window.print()` | Sem orientação; o relatório era renderizado **dentro do shell do app** (`h-dvh` + `overflow-hidden` + `main overflow-y-auto`). No teste local (Chromium headless, instantâneo do DOM no momento do `print()`), o código base gerou **PDF de 1 página em branco**. | Sem `@page`; relatório recortado pelos contêineres do shell; tabela herdava cor clara do tema escuro; colunas espremidas por texto longo. | Melhoria + correção |
| 4 | **Minha fila** → `GET /me/work-queue` | Só por dia (`date`) e atrasadas, com o plano publicado da semana daquele dia. | Não havia filtro de período. | Melhoria |
| 5 | **Planejamento** (`OperationalPlanningPage`) | Quadro semanal (uma semana por vez, carregada inteira, sem paginação); filtros do quadro no frontend; sem atalho de data. | Não havia filtro de período nem salto para uma data. | Melhoria pequena |
| 6 | **Minha jornada** → `GET /my-operational-journey` | O período já existia ("Intervalo personalizado"), mas ficava **recolhido** em "Período e filtros", exigia **as duas datas** e não validava início ≤ fim no cliente (só voltava erro genérico da API). | Descoberta difícil + pontas obrigatórias. | Melhoria pequena |
| 7 | Jornada (colaborador e gestor) → `operational-journey.repository` | (a) Minha jornada **não exibia** nada de Extra Esteira (a API já mandava o resumo). (b) Jornada gerencial mostrava só total e top descrições, **sem a lista**. (c) Todas as agregações faziam `INNER JOIN` com a descrição exigindo `d.deleted_at IS NULL`: **excluir uma descrição do catálogo apagava o histórico** dos totais e da exportação. Reproduzido: com a descrição "Treinamento interno" excluída, a regra antiga soma **183 min / 16** lançamentos; a correta é **223 min / 17**. | Renderização ausente + filtro de soft-delete indevido no histórico. | Correção |
| 8 | Lista de apontamentos (Minha jornada, Jornada gerencial, Apontamento gerencial, painel analítico da atividade, Evolução, exportação XLSX da jornada) | (a) Exceção e fora de sequência só apareciam como **tooltip** no selo (invisível em toque/tablet). (b) A **justificativa voluntária** (catálogo, em apontamento normal) é gravada **somente** em `standard_justification_label_snapshot`/`_complement` (migration 0048) e **nenhuma consulta lia essas colunas** — nunca aparecia em lugar nenhum (confirmado no banco). (c) "Apontamento gerencial" não mostrava justificativa nem observação. | Colunas de catálogo nunca selecionadas + exibição só por tooltip. | Correção |
| 9 | **Dashboard** (`DashboardPage`) | Ao apontar horas pelo botão global "Apontar horas" do cabeçalho com o Dashboard aberto, os cards **não mudavam** e não havia nova consulta (reproduzido: card parado em 72 h 49 min, **0** requisições a `/dashboard/operational` após salvar). | O drawer global não avisava a página aberta; o Dashboard só consultava ao montar ou no botão "Atualizar". Backend e agregações estavam corretos. | Correção |

## O que foi feito

### Item 2 — filtro Esteira + Atividade (AND)
- API: novos parâmetros opcionais `conveyorQ` (nome, código, cliente, veículo, placa) e `activityQ` (atividade, setor, tarefa) em `GET /me/time-entry-candidates`, aplicados **no SQL** nas três fontes (alocação, plano publicado e "outras atividades"), combinados por **AND** entre si e com o `q` legado (mantido por compatibilidade). O Kiosk (`/production/...`) não mudou.
- UI: o campo único "Pesquisar" virou dois campos independentes, **Esteira** e **Atividade**. Limpar um não apaga o outro e dispara nova consulta ao backend. Há um aviso visível quando os dois estão preenchidos. "Buscar outras atividades" passa a aceitar 2+ caracteres em qualquer um dos filtros.

### Item 3 — PDF retrato/paisagem
- O motor continua o mesmo (`window.print()` do navegador), sem dependência nova. Seletor **"Orientação do PDF"** (Retrato = padrão; Paisagem) gera `@page { size: portrait|landscape; margin: 10mm }`, só enquanto o relatório está montado (a impressão térmica não é afetada). O tamanho do papel continua o da impressora/diálogo.
- O relatório passou a ser renderizado via `createPortal(document.body)`, mesmo padrão de `ThermalActivityTicketsPrintArea`, para não ser recortado pelo shell. Também ganhou cabeçalho de tabela repetido por página, larguras de coluna fixas, cor de texto forçada para impressão, orientação no cabeçalho e justificativa nos apontamentos analíticos.

### Item 4 — Minha fila por período
- **Semântica:** período sobre a **data planejada** do item no **plano semanal publicado**, porque a fila é derivada do plano publicado. Intervalo inclusivo, datas `YYYY-MM-DD` (America/Sao_Paulo).
- API: `from`/`to` opcionais em `GET /me/work-queue`. O período atravessa vários planos publicados (o vigente de cada semana). Só início → até +91 dias; só fim → desde −91 dias. Janela máxima de 92 dias; `from > to` ou janela maior → 400 com mensagem. Sem `from`/`to`, o modo diário fica idêntico ao atual (URLs `?date=` preservadas).
- No modo período, os totais do resumo valem para o período inteiro e "sobrecarga" (que é diária) não se aplica. "Hoje" de referência = dia civil em São Paulo.
- UI: alternância **Por dia / Por período** (`?mode=periodo&from=&to=`), validação início ≤ fim, feedback "Exibindo atividades com data planejada de … a …", rótulos de KPI e seções ajustados.

### Item 5 — Planejamento por período
- **Semântica:** **data planejada** do item, dentro da **semana exibida**. O quadro é semanal e carrega a semana inteira, sem paginação, e os filtros do quadro já são aplicados no cliente sobre esse conjunto completo, com totais da visão filtrada. O novo filtro segue exatamente esse padrão canônico e não esconde registros.
- UI: filtro "Período (data planejada)" com De/Até (pontas opcionais, limitadas à semana), validação, feedback, contagem "Exibindo X de Y". O período é limpo ao trocar de semana; os demais filtros são preservados. Novo atalho **"Ir para a data"** para saltar à semana de qualquer data. "Fora do plano" respeita o período pela data do apontamento.
- **Limitação / decisão de produto:** uma visão consolidada de **várias semanas** no quadro exige redesenho e **não foi feita**. As exportações (Excel / visão semanal) continuam exportando a **semana inteira**, como já acontecia com os demais filtros do quadro.

### Item 6 — Minha jornada por período
- **Semântica (inalterada):** data do apontamento (`entry_at`, dia civil de São Paulo). A carga de atividades continua sendo o retrato atual, sem período, como já era.
- "Período e filtros" agora vem **aberto** e mostra a janela no resumo. No intervalo personalizado, as datas são **opcionais** (sem fim = até hoje; sem início = desde o primeiro registro), com validação início ≤ fim no cliente e texto explicativo. A tela não tem exportação.

### Item 7 — Extra Esteira
- Backend: removido o filtro `d.deleted_at IS NULL` das 5 agregações/listas Extra Esteira da jornada (inclusive a exportação), preservando o histórico. Nova lista `recentExtraTimeEntries` no período (até `limit`), com origem WEB/Modo Fábrica.
- UI: seção **"Extra Esteira no período"** em Minha jornada e na Jornada gerencial (com o nome do colaborador em seleção múltipla), mais o chip "Extra Esteira (período)" em Minha jornada. Lançamentos do Kiosk aparecem com o selo "Modo Fábrica".
- Extra Esteira **não** é somado aos minutos de esteira, o que mantém a regra existente.

### Item 8 — Justificativas
- Backend: as consultas de leitura passam a expor `standardJustificationLabel`/`standardJustificationComplement` (lista por atividade e jornada). A Evolução e a exportação da jornada usam a justificativa efetiva: exceção/fora de sequência ou, na ausência delas, a justificativa padronizada (`server/src/shared/timeEntryJustificationDisplay.ts`).
- UI: novo `TimeEntryJustificationNote` com a justificativa em **texto visível**, mais a "Observação" (texto livre), em Minha jornada, Jornada gerencial, Apontamento gerencial e painel analítico da atividade. Os selos/tooltip continuam.
- **Permissões:** nenhum endpoint novo e nenhuma mudança de RBAC. Os campos foram acrescentados a respostas que **já** devolviam as justificativas de exceção/fora de sequência ao mesmo público, então nenhum perfil passa a ver apontamentos que antes não via.

### Item 9 — Dashboard
- Novo evento in-app `sgp:operational-data-changed` (`src/lib/operational/operationalDataEvents.ts`), disparado pelo drawer após apontamento, conclusão ou Extra Esteira. O Dashboard escuta e **reconsulta o backend**. Também reconsulta ao voltar para a aba depois de 30 s ou mais (ex.: alterações feitas na aba aberta pelo drill-down). Minha jornada também escuta.
- Sem polling. Nenhuma regra ou agregação foi movida para o frontend. Os agregados do backend não mudaram.
- **Observação (não alterada):** o card "Alocações em STEPs" conta alocações de etapas inativas/esteiras finalizadas, enquanto a carga por colaborador considera só etapas ativas. Mudar isso seria mudar a semântica canônica, então fica para decisão.

## Arquivos

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
- `docs/ai/prompts/ajustes-tati-2026-10-07.md`
- este retorno

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

## Validação executada (resultados reais)

Ambiente local descartável: PostgreSQL 16 em `/var/tmp` (porta 55432), migrations `0001`–`0053` e seed oficial aplicados. Dados fictícios: esteiras "Civic Demo"/"Corolla Demo", planos publicados nas semanas de 05/10 e 12/10/2026.

| Comando | Resultado |
|---|---|
| `npm run build` (tsc -b + vite build) | **OK** (exit 0) |
| `npm --prefix server` `tsc -p tsconfig.json` | **OK** (exit 0) |
| `npx eslint .` | 117 problemas (94 erros, 23 avisos) — **idêntico à baseline de `develop`** (comparado arquivo a arquivo; nenhum novo) |
| `npx vitest run` (frontend) | 1426 ok / **5 falhas preexistentes** (`ApontamentoPage.test.tsx` ×3, `ApontamentoGestorPage.test.tsx` ×2 — falham igualmente sem as alterações: botão "Registar apontamento" não encontrado) |
| `npx vitest run` (servidor, com banco) | 1253 ok / 16 skip / **5 falhas, todas fora do escopo**: 4 preexistentes (versão `1.9.9` vs `1.9.4` esperada; texto "colaborador operacional vinculado" ×2; fórmula `=SUM` no XLSX semanal), confirmadas com `git stash` sobre o código base. A 5ª (`production-auth` "ordenada por nome") é do **ambiente local**: o banco novo usa collation `C` e os testes rodaram 3× acumulando nomes ("Pri C HTTP…" vs "Pri C bb…"), o que diverge do `localeCompare('pt-BR')` do teste. Não tem relação com as alterações. |
| Testes novos/alterados | `time-entry-candidates-http.integration` (filtro AND), `my-work-queue-period.integration` (6 casos: modo diário, várias semanas, pontas abertas, 400s), `work-queue-period`, `periodFilter`, `timeEntryJustificationDisplay`, `operationalDataEvents`, `planningBoardFilters` (período), `conveyorProgressPage` (orientação) — **todos passando** |

Validação manual local (API + Vite + Chromium/Playwright; capturas e PDFs guardados fora do repositório):

- **Item 2:** placa `AAA1A11` + "costura" → só "Costura banco"; "corolla" + "corte" → só "Corte espuma"; `q` legado "Corolla Costura" → vazio (defeito reproduzido); limpar "Atividade" mantém "Esteira" e reconsulta.
- **Item 3:** PDF Retrato = 612×792 pt, 5 páginas; Paisagem = 792×612 pt, 6 páginas. Título, cabeçalho de colunas e justificativas presentes (`pdftotext`). Código base, mesmo método: 1 página em branco.
- **Item 4:** 05–16/10 → 5 atividades, KPIs "no período", feedback correto; 12–16/10 → só a semana seguinte; início > fim → mensagem; `?date=2026-10-07` → modo diário inalterado.
- **Item 5:** 07–08/10 → "Exibindo 2 de 3"; início > fim → mensagem; "Ir para a data" 14/10 → semana 2026-10-12 e período limpo.
- **Item 6:** só data inicial → carrega com "Janela"; início > fim → mensagem.
- **Item 7:** seção Extra Esteira com "Treinamento interno" mesmo após excluir a descrição do catálogo; origem Modo Fábrica exibida.
- **Item 8:** "Justificativa: Atividade anterior pendente de outro colaborador — Aguardando peça" (voluntária), "Justificativa (fora de sequência): …" e "Observação: Ajuste no ponto" visíveis.
- **Item 9:** base → card parado (72 h 49 min) e 0 reconsultas; branch → 70 h 44 min → 72 h 49 min (+125 min apontados) com 1 reconsulta automática, sem clicar em "Atualizar".

Não houve regressão observada em permissões (nenhuma rota/guard alterada), paginação (as telas alteradas não paginam; filtros novos de API são aplicados no SQL), totais existentes ou Kiosk (rotas `/production` intocadas; único efeito: campo extra `period: null` na resposta da fila de produção).

## Pendências, riscos e ressalvas

1. **Item 1 (Guia Prático/manuais)** não foi feito, por instrução do usuário. Os capítulos 7, 10, 11, 12, 14 e 15 do manual descrevem comportamentos que mudaram e devem ser atualizados depois.
2. **PDF:** a validação usou Chromium headless. A orientação via `@page size` é respeitada pelo Chrome/Edge (o diálogo trava a orientação); o Firefox respeita parcialmente. Validar com a Tati no navegador usado na fábrica.
3. **Planejamento multi-semana** e **período nas exportações do Planejamento** exigem decisão de produto (hoje exportam a semana inteira, como os demais filtros do quadro).
4. **Minha fila:** janela máxima de 92 dias e "Por período" mostra só planos **publicados** (regra existente da fila).
5. Card "Alocações em STEPs" (ver item 9): possível inconsistência semântica preexistente, não alterada.
6. A suíte de testes de integração altera dados do banco onde roda. Nunca rodá-la contra banco compartilhado.

## Roteiro objetivo de validação com a Tati (08/10, 09:00–09:30)

1. **Apontar horas** (cabeçalho): preencher *Esteira* = placa ou nome e *Atividade* = "costura" → só a interseção; apagar *Atividade* → volta a lista da esteira.
2. **Evolução das Esteiras:** selecionar 3+ esteiras → *Orientação do PDF* = Retrato → *Gerar PDF*; repetir com Paisagem. Conferir título, colunas e páginas seguintes.
3. **Minha fila** → *Por período* → De/Até atravessando duas semanas; testar datas invertidas (mensagem); voltar em *Por dia*.
4. **Planejamento** → *Ir para a data*; nos filtros do quadro, *Período (data planejada)* com dois dias → contagem "Exibindo X de Y".
5. **Minha jornada** → "Período e filtros" (já aberto) → *Intervalo personalizado* só com a data inicial.
6. **Extra Esteira:** lançar um Extra Esteira (web e/ou Modo Fábrica) → conferir a seção "Extra Esteira no período" (Minha jornada e Jornada por colaborador).
7. **Justificativas:** apontar com justificativa do catálogo (normal e fora de sequência) → conferir o texto visível em Minha jornada, Jornada por colaborador, Apontamento gerencial e painel da atividade.
8. **Dashboard:** anotar "Minutos apontados (acumulado)" → *Apontar horas* pelo cabeçalho sem sair do Dashboard → o card atualiza sozinho.

## Próximo passo recomendado

Revisar o diff. Se aprovado, autorizar o push da branch `fix/ajustes-tati-2026-10-07` e a abertura de PR para `develop`. Depois da validação com a Tati, atualizar o manual (item 1).

## Estado final

- **Commit:** local, único, na branch `fix/ajustes-tati-2026-10-07`. **Sem push, sem PR, sem merge/deploy.**
- **`git status` após o commit:** limpo (artefatos de validação mantidos fora do repositório; `server/dist` removido).
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.
