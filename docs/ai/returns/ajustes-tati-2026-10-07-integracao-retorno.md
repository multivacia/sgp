# Retorno — integração ajustes-tati-2026-10-07

- **TASK_ID:** `ajustes-tati-2026-10-07` (atividade de integração: `ajustes-tati-2026-10-07-integracao`)
- **Data/hora:** 2026-10-08 01:20 UTC (07/10 22:20 em São Paulo)
- **Objetivo:** unir, numa branch única de integração, os ajustes funcionais (itens 2–10) e os Guias Práticos (item 1), para validação local e revisão posterior. Sem novos requisitos.
- **Status final:** integração concluída e validada localmente; branch `integration/ajustes-tati-2026-10-07` publicada por push normal. **Sem PR, sem merge em `develop`, sem deploy, sem homologação, sem migration.** A aceitação depende da validação com a Tati.
- **Branch:** `integration/ajustes-tati-2026-10-07` (worktree novo, irmão do checkout: `/home/user/sgp-integration-ajustes-tati`)

## Refs (após `git fetch origin --prune`, antes e depois — nenhuma foi alterada)

| Ref | SHA |
|---|---|
| `origin/main` | `c611d10feacf329bdc217fe391ebf47a90a6ea7a` |
| `origin/develop` (base; gate confirmado) | `ecb26da78c4a4dbfefcfab7f5de494a31445555d` |
| `origin/homol` | `6b768c852a18b7428e3dadf761bad7e35c1d61ef` |
| `origin/fix/ajustes-tati-2026-10-07` | `f6f1d6a15de694f36cc49a957e19bfbf8032a6ab` |
| `origin/docs/ajustes-tati-2026-10-07-guias-praticos` | `f8eab69eafafd7cb801fc4b0d83c663e8081f185` |

Os três commits de origem descendem da base (`git merge-base --is-ancestor` = OK para `2c7e458e`, `f6f1d6a1`, `f8eab69e`). O checkout da sessão (`ccr-414dc463-c6rx8z` @ `c611d10f`) estava limpo e não foi usado para a integração.

## Commits (cherry-pick, autoria preservada, nesta ordem)

| Origem | Novo SHA na integração | Autor | Assunto |
|---|---|---|---|
| `2c7e458ee952a1ab3ad5fb9e3eadb5199c88532d` | `935dc94377e8f11be12bc92df2b71851c7dfecc3` | Gustavo Almeida | fix(ajustes-tati): filtros, períodos, PDF, Extra Esteira, justificativas e Dashboard |
| `f6f1d6a15de694f36cc49a957e19bfbf8032a6ab` | `438f8a006794415ca1d298cd86ebce1949590a3f` | Gustavo Almeida | feat(ajustes-tati): pesquisa "esteira & atividade", planejamento entre semanas e export para IA |
| `f8eab69eafafd7cb801fc4b0d83c663e8081f185` | `3d6f1a3011684ca003fa86e224d3fdc07e7d88bb` | Claude | docs(guias): reconstrói Guias Práticos de Colaborador e Gestor com capturas (com a resolução documental) |
| — | commit deste retorno | — | docs(ai): retorno da integração (somente este arquivo + checkpoint) |

Os dois primeiros aplicaram sem conflito. Não foi usado squash, rebase, cópia de arquivos nem patch manual.

## Conflitos reais e resolução

Somente no 3º cherry-pick (`f8eab69e`), e somente em arquivos de contexto/documentação:

| Arquivo | Tipo | Resolução |
|---|---|---|
| `docs/ai/context/SESSION_CHECKPOINT.md` | conteúdo | reescrito por conteúdo: registra a integração, as duas branches/SHAs, decisões (semânticas de período, guias canônicos, sem migration), pendências e próxima ação. |
| `docs/ai/returns/ajustes-tati-2026-10-07-retorno.md` | add/add | cabeçalho consolidado (base, frentes, SHAs, nota de que foram **integradas para validação**, sem PR/merge/deploy/homologação) + seções "Frente A" e "Frente B" preservando **integralmente** o texto de cada retorno original (só os níveis de título foram rebaixados). |
| `docs/ai/prompts/ajustes-tati-2026-10-07.md` | — | **sem conflito**: conteúdo idêntico nas duas branches (diff vazio), mantido como está. |

Nenhum conflito em código, HTML dos guias, imagens ou outros arquivos.

**Prova de equivalência:** para cada um dos 117 arquivos alterados contra `origin/develop`, o conteúdo na integração é idêntico ao da branch de origem que o alterou, exceto os dois arquivos acima (75 arquivos da frente A + 45 da frente B − 3 compartilhados = 117).

## Arquivos alterados contra `origin/develop`

`117 files changed, 5446 insertions(+), 1484 deletions(-)` antes deste retorno (+1 arquivo com ele). 40 PNG novos (`docs/manual/img/guia-colaborador/` 21, `docs/manual/img/guia-gestor/` 19) e:

- `M` `docs/ai/context/SESSION_CHECKPOINT.md`
- `A` `docs/ai/prompts/ajustes-tati-2026-10-07.md`
- `A` `docs/ai/returns/ajustes-tati-2026-10-07-retorno.md`
- `M` `docs/manual/colaborador.html`
- `M` `docs/manual/gestor-esteira.html`
- `M` `server/src/modules/conveyor-progress/conveyor-progress.dto.ts`
- `M` `server/src/modules/conveyor-progress/conveyor-progress.repository.ts`
- `M` `server/src/modules/conveyor-progress/conveyor-progress.service.ts`
- `M` `server/src/modules/conveyors/conveyorAssignments.dto.ts`
- `M` `server/src/modules/conveyors/conveyorAssignments.repository.ts`
- `M` `server/src/modules/my-activities/my-activities.controller.ts`
- `M` `server/src/modules/my-activities/my-activities.repository.ts`
- `M` `server/src/modules/my-activities/my-activities.schemas.ts`
- `M` `server/src/modules/my-activities/my-activities.service.ts`
- `M` `server/src/modules/my-work-queue/my-work-queue.controller.ts`
- `M` `server/src/modules/my-work-queue/my-work-queue.dto.ts`
- `M` `server/src/modules/my-work-queue/my-work-queue.repository.ts`
- `M` `server/src/modules/my-work-queue/my-work-queue.schemas.ts`
- `M` `server/src/modules/my-work-queue/my-work-queue.service.ts`
- `A` `server/src/modules/my-work-queue/work-queue-period.ts`
- `M` `server/src/modules/operational-journey/operational-journey.dto.ts`
- `M` `server/src/modules/operational-journey/operational-journey.repository.ts`
- `M` `server/src/modules/operational-journey/operational-journey.service.ts`
- `A` `server/src/modules/operational-planning/operational-planning.ai-export.ts`
- `M` `server/src/modules/operational-planning/operational-planning.export.ts`
- `A` `server/src/modules/operational-planning/operational-planning.range.controller.ts`
- `A` `server/src/modules/operational-planning/operational-planning.range.service.ts`
- `A` `server/src/modules/operational-planning/operational-planning.range.ts`
- `M` `server/src/modules/operational-planning/operational-planning.repository.ts`
- `M` `server/src/modules/operational-planning/operational-planning.routes.ts`
- `M` `server/src/modules/operational-planning/operational-planning.service.ts`
- `A` `server/src/shared/accentInsensitiveSearch.ts`
- `A` `server/src/shared/operationalDateRange.ts`
- `A` `server/src/shared/timeEntryJustificationDisplay.ts`
- `A` `server/src/tests/accent-insensitive-search.test.ts`
- `A` `server/src/tests/my-work-queue-period.integration.test.ts`
- `A` `server/src/tests/operational-planning-range.integration.test.ts`
- `M` `server/src/tests/time-entry-candidates-http.integration.test.ts`
- `A` `server/src/tests/work-queue-period.test.ts`
- `A` `src/components/operational/JourneyExtraTimeEntriesSection.tsx`
- `A` `src/components/operational/TimeEntryJustificationNote.tsx`
- `M` `src/domain/conveyor-progress/conveyorProgress.types.ts`
- `M` `src/domain/conveyors/conveyor-step-assignments.types.ts`
- `M` `src/domain/esteiras/step-analitico.types.ts`
- `M` `src/domain/my-work-queue/my-work-queue.types.ts`
- `M` `src/domain/operational-journey/operational-journey.types.ts`
- `M` `src/domain/operational-planning/operational-planning.types.ts`
- `A` `src/domain/operational/periodFilter.test.ts`
- `A` `src/domain/operational/periodFilter.ts`
- `A` `src/domain/operational/timeEntryJustificationDisplay.test.ts`
- `A` `src/domain/operational/timeEntryJustificationDisplay.ts`
- `M` `src/features/colaborador/JornadaPage.tsx`
- `M` `src/features/conveyor-progress/ConveyorProgressAnalyticalEntries.tsx`
- `M` `src/features/conveyor-progress/ConveyorProgressFilters.tsx`
- `M` `src/features/conveyor-progress/ConveyorProgressPage.tsx`
- `M` `src/features/conveyor-progress/ConveyorProgressPrintView.tsx`
- `M` `src/features/conveyor-progress/conveyorProgressPage.test.ts`
- `A` `src/features/conveyor-progress/conveyorProgressPdfOrientation.ts`
- `M` `src/features/conveyor-progress/useConveyorProgressPrint.ts`
- `M` `src/features/esteiras/StepAnaliticoPanel.tsx`
- `M` `src/features/esteiras/step-analitico/buildStepAnaliticoDetalheFromApi.ts`
- `M` `src/features/gestor/ApontamentoGestorPage.tsx`
- `M` `src/features/gestor/DashboardPage.tsx`
- `M` `src/features/gestor/JornadaColaboradorGestorPage.tsx`
- `M` `src/features/my-work-queue/MyWorkQueuePage.tsx`
- `M` `src/features/operational-planning/OperationalPlanningPage.tsx`
- `A` `src/features/operational-planning/PlanningPeriodSearchPanel.tsx`
- `M` `src/features/operational-planning/planningBoardFilters.test.ts`
- `M` `src/features/operational-planning/planningBoardFilters.ts`
- `M` `src/features/operational-planning/planningDeviationIndicators.ts`
- `M` `src/features/shell/QuickTimeEntryDrawer.tsx`
- `A` `src/lib/operational/operationalDataEvents.test.ts`
- `A` `src/lib/operational/operationalDataEvents.ts`
- `M` `src/services/my-activities/myActivitiesApiService.ts`
- `M` `src/services/my-work-queue/myWorkQueueApiService.ts`
- `M` `src/services/operational-planning/operationalPlanningApiService.test.ts`
- `M` `src/services/operational-planning/operationalPlanningApiService.ts`
- `A` `docs/ai/returns/ajustes-tati-2026-10-07-integracao-retorno.md` (este arquivo)

**Migrations:** nenhuma (última continua `0053`). **Versão, dependências, infra, RBAC, Kiosk:** não alterados.

## Validação (comandos reais, mesmo ambiente)

Ambiente: Node 22.22.0; `npm ci` na raiz e em `server/`; PostgreSQL 16 local descartável (`/var/tmp`, porta 55432) com `npm run migrate` + `npm run seed` em bancos separados: `sgp_int` (integração), `sgp_base` (baseline) e `sgp_func` (inspeção funcional). Baseline = worktree destacado em `origin/develop` (`/home/user/sgp-baseline-develop`), para separar falhas preexistentes.

| Comando | Integração | Baseline `develop` |
|---|---|---|
| `npm run build` (tsc -b + vite build) | exit 0 | exit 0 |
| `npm --prefix server run build` (tsc) | exit 0 | exit 0 |
| `npx eslint .` | exit 1 — 146 problemas (123 erros, 23 avisos) | exit 1 — 146 (123, 23) |
| comparação ESLint por arquivo × regra | **0 aumentos** | — |
| `npx vitest run` (frontend) | 1428 ok / **5 falhas** (218 arquivos) | 1408 ok / 5 falhas (215) |
| `npx vitest run` (servidor, com banco) | 1262 ok / 16 skip / **4 falhas** | 1243 ok / 16 skip / 4 falhas |
| `npm run manual:usuario:html:check` | exit 0 | exit 0 |
| `git diff --check origin/develop...HEAD` | exit 0 | — |
| testes focados (11 arquivos adicionados/alterados): frontend 6 arquivos | **58/58 ok** | — |
| testes focados: servidor 5 arquivos (inclui integração com banco) | **22/22 ok** | — |

Testes focados: `periodFilter`, `timeEntryJustificationDisplay`, `conveyorProgressPage`, `planningBoardFilters`, `operationalDataEvents`, `operationalPlanningApiService`; `accent-insensitive-search`, `my-work-queue-period.integration`, `operational-planning-range.integration`, `time-entry-candidates-http.integration`, `work-queue-period`.

### Falhas preexistentes (reproduzidas em `origin/develop`, lista idêntica)

Frontend:
- `src/features/colaborador/ApontamentoPage.test.tsx` — "data de realização": `"Ontem" envia meio-dia de SP de ontem`, `data futura bloqueia o botão`, `padrão hoje envia o instante atual`.
- `src/features/gestor/ApontamentoGestorPage.test.tsx` — `data futura desabilita o envio`, `envia a data escolhida (ontem) e mostra na confirmação…`.

Servidor:
- `src/tests/env.test.ts` — `resolveAppVersionMetadata › usa fallback seguro quando metadados não são informados`.
- `src/tests/my-activities-time-entry-candidates.test.ts` — `retorna indisponível quando usuário não possui collaboratorId`.
- `src/tests/my-work-queue.service.test.ts` — `retorna fila vazia controlada quando usuário não possui collaboratorId`.
- `src/tests/operational-planning.weekly-view.http.test.ts` — `fluxo completo: rascunho → publicado → revisão não publicada…`.

ESLint nos arquivos alterados pela integração: 6 problemas (`conveyor-progress.service.ts` no-unused-vars; `ConveyorProgressFilters.tsx` react-refresh ×2; `OperationalPlanningPage.tsx` exhaustive-deps ×3), todos já presentes na baseline (comparação arquivo × regra sem aumento). Nenhum teste foi alterado.

## Inspeção funcional local (dados fictícios)

API real (`tsx src/server.ts`) + Vite (`VITE_DATA_MODE=real`) + Chromium/Playwright (`pt-BR`, `America/Sao_Paulo`). Dados: esteiras "Gol GTI Demo" (OS `7070`; atividades *corte do tecido XPTO*, *Costura do tecido XPTO*, *Revestir banco com tecido XPTO*, *Revestir banco do couro*, *Lixar estrutura*) e "Corolla Demo" (OS `7171`); colaboradores do seed + "Bruno Fictício"; "Equipe Bancos Demo"; planos publicados nas semanas de 05/10 e 12/10/2026, incluindo um item **só de equipe** (45 min, sem colaborador). Capturas, PDFs e planilhas ficaram fora do repositório.

| Ponto | Resultado |
|---|---|
| Busca `7070 & XPTO` (API e drawer *Apontar horas*) | as 3 atividades XPTO da OS 7070 ✅ |
| Busca `7070 & banco` / `7070&BANCÓ` | as 2 atividades com "banco" ✅ |
| Busca sem `&` (`XPTO`, `banco`, `Gol`, `7171`, `Tapeçaria`, `tapecaria`, cliente, placa, vazio) | resposta **byte a byte idêntica** à API da baseline `develop` sobre o mesmo banco ✅ |
| Minha Fila *Por período* 05–16/10 | 4 atividades em 2 semanas, feedback "Exibindo atividades com data planejada…"; 12–16/10 → só a 2ª semana; datas invertidas → mensagem/400; modo *Por dia* preservado ✅ |
| Planejamento *Pesquisa por período* 06–15/10 | "6 de 6 itens · 6 h 45 min", chips 05/10 e 12/10 *Publicado*, itens de 13/10 e 15/10 (fora da semana exibida), "Ver semana"; invertido → mensagem; colaborador → 403 ✅ |
| Minha Jornada | período com "Intervalo personalizado"; seção "Extra Esteira no período" ✅ |
| Export IA (período e semana) | abas **Prompt para IA, Backlog, Planejado, Carga dos colaboradores, Carga por dia** ✅; cabeçalho `FF1F2933`, filtro e congelamento; período: Planejado 405 min (inclui 45 min só de equipe) × Carga 360 min (Maria 300 + Bruno 60) = **item só de equipe fora da carga individual** ✅; semana: 315 × 270 ✅; prompt documenta a limitação ✅ |
| Extra Esteira | 45 min "Treinamento interno" continua na jornada **após excluir a descrição do catálogo** (baseline: 0 min) ✅; visível em Minha Jornada e Jornada por colaborador ✅ |
| Justificativas | catálogo ("Atividade anterior pendente de outro colaborador — Aguardando peça"), fora de sequência ("… — Peça chegou antes") e "Observação: Ajuste no ponto" visíveis em Minha Jornada, Jornada por colaborador, Apontamento gerencial e PDF da Evolução ✅ |
| Dashboard | "Minutos apontados (acumulado)" 55 min → **1 h 35 min** após apontar 40 min pelo botão do cabeçalho, com 1 reconsulta; **0 reconsultas em 8 s ocioso** (sem polling) ✅ |
| PDF da Evolução (2 esteiras) | Retrato 612×792 pt, 1 pág.; Paisagem 792×612 pt, 1 pág.; legível, sem corte ✅ |
| PDF da Evolução (11 esteiras) | Retrato 5 págs., Paisagem 9 págs.; **nenhuma página em branco** (todas com texto), cabeçalho de tabela repetido, sem corte ✅ |
| Guias Práticos | 21 + 19 = **40 imagens** referenciadas e existentes, 0 âncoras quebradas, 0 recursos externos; render em 390 px e 1280 px: 0 imagens quebradas, 0 rolagem horizontal ✅ |

Método do PDF: `window.print` interceptado e o DOM capturado no instante da chamada; o PDF foi gerado no Chromium headless com `preferCSSPageSize` (mesmo método do retorno da frente A). **Não** substitui o teste no navegador da fábrica.

Observação (não é defeito novo): em Paisagem, um bloco de esteira que não cabe no restante da página vai para a página seguinte, deixando espaço livre — por isso 9 páginas contra 5 em Retrato.

## Pendências e ressalvas

1. **Validação com a Tati** (não feita aqui; o navegador da fábrica não foi usado, conforme a instrução). Inclui o PDF Retrato/Paisagem no navegador real.
2. Os Guias foram escritos **antes** das correções da frente A: `GUIA-COL-005/006` e `GUIA-GES-004/005` (itens 7, 8, 9) descrevem como ressalva o que agora está corrigido; texto e capturas precisam ser atualizados após o aceite.
3. `GUIA-GES-001` (`time_entries.create_on_behalf` ausente nas migrations) e o card "Alocações em STEPs" continuam como decisões de produto.
4. A suíte de integração do servidor altera dados: nunca rodar contra banco compartilhado.
5. Worktrees criados nesta atividade e mantidos (nada foi excluído): `/home/user/sgp-integration-ajustes-tati` e `/home/user/sgp-baseline-develop` (destacado, só para a baseline).

## Roteiro de validação com a Tati

1. **Apontar horas:** `<OS real> & XPTO`, `<OS real> & banco` e uma pesquisa sem `&`.
2. **Minha Fila → Por período:** atravessar duas semanas; datas invertidas; voltar para *Por dia*.
3. **Planejamento → Pesquisa por período:** duas ou mais semanas; "Ver semana"; filtro de colaborador; datas invertidas.
4. **Planejamento → Exportar para IA** (período e semana): conferir as 5 abas; um item só de equipe aparece em Planejado e não soma na carga individual.
5. **Minha Jornada:** intervalo personalizado só com a data inicial; seção Extra Esteira.
6. **Extra Esteira e justificativas:** lançar Extra Esteira e apontamentos com justificativa (catálogo e fora de sequência); conferir Minha Jornada, Jornada por colaborador, Apontamento gerencial e painel da atividade.
7. **Dashboard:** anotar o card, apontar pelo cabeçalho sem sair da tela, ver o card atualizar sozinho.
8. **Evolução → Gerar PDF** em Retrato e Paisagem com 3+ esteiras, **no navegador da fábrica**.
9. **Guias Práticos:** abrir `docs/manual/colaborador.html` e `docs/manual/gestor-esteira.html` (inclusive no celular) e decidir os itens dos capítulos de divergências.

## Próximo passo recomendado

Após o aceite da Tati: decisão humana sobre abrir PR de `integration/ajustes-tati-2026-10-07` para `develop`; depois, atualizar os guias (pendência 2).

## Estado final

- **Branch/HEAD:** `integration/ajustes-tati-2026-10-07` — SHA final informado na resposta da sessão (commit que contém este arquivo; `git log -1`).
- **`git status --short`:** limpo após o commit.
- **Push:** normal, somente `integration/ajustes-tati-2026-10-07`. **PR: não aberto.** `main`, `develop`, `homol` e as duas branches de origem: inalteradas.
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.
