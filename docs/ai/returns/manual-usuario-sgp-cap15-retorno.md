# Retorno — manual-usuario-sgp-cap15

- **TASK_ID:** `manual-usuario-sgp-cap15`
- **Data/hora:** 2026-10-04 (UTC)
- **Objetivo:** construir integralmente o Capítulo 15 do Manual do Usuário SGP+, com base comprovada no código atual, e marcar o capítulo como concluído na linha **Situação**.
- **Status final:** CONCLUÍDO (rodada documental). Build, lint e testes da aplicação **não foram executados** (rodada puramente documental). Testes existentes foram lidos como evidência.
- **Branch criada/publicada:** `docs/manual-usuario-sgp-cap15`
- **SHA base (completo):** `25be481c7dda3d883ae2820e68d61e0d3d86e416` — tip de `origin/docs/manual-usuario-sgp-cap04` após `git fetch origin --prune`, igual ao esperado.
- **Ancestralidade:** as 18 branches documentais anteriores (`base-p0`, cap05–cap14, cap16, cap17, as cinco de correção e `fix-acesso-restauracao-sessao`) confirmadas como ancestrais da base.
- **SHA final:** é o commit único desta branch que contém este arquivo (`git log -1 origin/docs/manual-usuario-sgp-cap15`). Não é registrado aqui para evitar commit extra de ajuste.

## Título real do Capítulo 15

`# 15. Dashboard e indicadores` — preservado sem alteração.

Tópicos do marcador, todos cobertos: os dois recortes e quem vê cada um (Para que serve, Quem costuma ter acesso); o que cada indicador significa (15.2–15.8); o período de cada indicador (15.2, 15.7 e "Cada indicador tem o seu período"); da visão geral ao detalhe (15.9).

## Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | marcador pendente do Capítulo 15 substituído pelo capítulo completo (≈310 linhas, seis blocos padrão, seções 15.1–15.9); linha **Situação** |
| `docs/ai/returns/manual-usuario-sgp-cap15-retorno.md` | este retorno |

Migrations: nenhuma. Código-fonte, HTML gerado, matriz técnica, checkpoint, `docs/ai/reports/` e `docs/audits/`: não tocados.

## Funcionalidades comprovadas

| Comportamento | Evidência |
|---|---|
| Item **Dashboard** visível com qualquer das duas permissões; rota com `RequireAnyPermission` | `src/lib/shell/app-nav-config.ts`; `src/routes/AppRoutes.tsx` |
| Abas Operacional/Gerencial só com as duas permissões; rótulo único com uma; abertura em Operacional | `src/features/gestor/DashboardPage.tsx` (`showOpTab`, `showExecTab`) |
| Permissões no servidor: Colaborador 403 no operacional; Gestor 403 no gerencial, 200 no operacional; `days` 1–365, padrão 30 | `server/src/modules/dashboard/dashboard.routes.ts`, `dashboard.schemas.ts`; `server/src/tests/dashboard.integration.test.ts` |
| Cards/Gráficos, período operacional e janela gerencial guardados no navegador; janela 7/15/30/60/90, padrão 30 | `DashboardPage.tsx` (localStorage), `src/lib/dashboard/executiveDashboardWindow.ts`, `ExecutiveWindowSelector.tsx`, `DashboardViewModeToggle.tsx` |
| Sem atualização automática; **Atualizar** busca as duas visões; "Atualizando painel gerencial…"; "Gerado em" | `DashboardPage.tsx` (`load`, `Promise.all`) |
| Contagens por situação com a mesma regra do Painel (atraso prevalece; prazo lido como data única) | `server/src/shared/operationalBucket.ts` (espelho de `src/lib/backlog/operationalBuckets.ts`) |
| Esteiras (total) = 7 recortes, inclusive canceladas | `dashboard.service.ts`, `DashboardPage.tsx` (`BUCKET_ORDER`) |
| Alocações totais incluem equipe (sempre apoio); carga por colaborador só alocação direta, inclui inativos, qualquer situação de esteira, ordem por nº de alocações e nome | `dashboard.repository.ts` (`countAssigneeRoles`, `listCollaboratorLoadAggregates`); `server/migrations/0023_conveyor_assignees_team_support.sql` (equipe não principal) |
| Minutos acumulados: todos os apontamentos de atividade não removidos, sem Extra Esteira; por colaborador inclui fora da alocação | `dashboard.repository.ts` (`sumRealizedMinutes`, `sumRealizedMinutesByCollaborator`, tabela só de apontamentos de esteira) |
| Período: 7/15/30 dias corridos a partir de agora; mês desde dia 1 em São Paulo; pela data do trabalho | `server/src/shared/operationalPeriod.ts`; `sumRealizedMinutesBetween`; `src/domain/operational/workDate.ts` |
| Previsto estrutural = tempo unitário × quantidade das atividades ativas, sem filtro de situação; total por esteira separado | `sumStepPlannedMinutes`, `sumConveyorPlannedMinutes` |
| Destaque em atraso até 12, gerencial até 8, ordem alfabética | `dashboard.service.ts` (`slice(0, 12)`, `slice(0, 8)`, `ORDER BY name`) |
| Últimos 12 apontamentos por data do trabalho; exclui esteiras excluídas | `listRecentTimeEntries` |
| Coluna de capacidade só com Configurações operacionais; capacidade efetiva de hoje; faixas 80%/100% | `DashboardPage.tsx`; `operationalCapacity.helpers.ts` (`ATTENTION_FROM = 0.8`); `operational-settings.service.ts` (data padrão = hoje) |
| Gráficos: top 12 (cards) e top 10 (gráficos); barras de minutos sem conversão | `DashboardPage.tsx`, `OperationalDashboardCharts.tsx`, `DashboardOperacionalBarList.tsx` |
| Participação de atraso = em atraso ÷ ativas; inteiro nos cards, 1 decimal nos gráficos | `dashboard.service.ts`; `DashboardPage.tsx`; `ExecutiveDashboardCharts.tsx` |
| Anel gerencial com segmentos sobrepostos | `ExecutiveDashboardCharts.tsx` (`execSlicesRaw`) |
| Destinos dos cliques e abertura em nova aba; Colaboradores na mesma aba no modo Cards | `src/lib/dashboard/dashboardNavigation.ts`; `DashboardPage.tsx` (`Link` sem `target`); gráficos com `target="_blank"` |
| Painel recebe `situacao`, `scope=ativas`, `days`; etiqueta "Janela: N dias"; troca de Situação descarta a janela | `src/pages/BacklogPage.tsx`; `src/lib/backlog/backlogCopy.ts` |
| Falha zera as duas visões; janela de aviso para falhas impeditivas, faixa para as demais | `DashboardPage.tsx`; `src/lib/errors/sgpErrorContract.ts` |
| Mensagens de vazio | `DashboardPage.tsx`, `OperationalDashboardCharts.tsx`, `ExecutiveDashboardCharts.tsx`, `DashboardOperacionalBarList.tsx` |

## Permissões identificadas

| Permissão | Efeito | Padrão |
|---|---|---|
| Dashboard operacional | aba Operacional e dados | Administrador, Gestor |
| Dashboard gerencial | aba Gerencial e dados | Administrador |
| Configurações operacionais | coluna Previsto vs capacidade diária | Administrador, Gestor |
| Colaboradores: consultar | destino do link Colaboradores | Administrador, Gestor |

## Fluxo funcional documentado

Abrir → escolher visão e modo (15.1) → Resumo e período (15.2) → situações e atraso (15.3) → previsto × apontado (15.4) → carga por colaborador (15.5) → últimos apontamentos (15.6) → Gerencial e janela (15.7) → Gráficos (15.8) → do número ao detalhe (15.9) → períodos por indicador → bloqueios.

## Inconsistências e limitações encontradas (não corrigidas)

1. **Limitação de prazo do Capítulo 5 vale no Dashboard** (mesma leitura de prazo): atraso subestimado. Mencionado no capítulo com remissão ao 5.
2. **Coluna Previsto vs capacidade diária** compara o previsto acumulado de todas as alocações (inclusive esteiras encerradas) com a capacidade de um dia — classificação quase sem valor; tratada no capítulo como alerta.
3. **Carga por colaborador** ignora alocações por equipe e omite quem aponta sem alocação direta; inclui alocações em esteiras finalizadas/canceladas.
4. **Gráfico "Minutos apontados"** segue a ordem por alocações, não por minutos; mostra minutos crus.
5. **Previsto estrutural e alocações** somam todas as esteiras, de todas as situações — não é carteira aberta.
6. **Anel gerencial** com segmentos sobrepostos (em atraso ⊂ ativas).
7. **Arredondamento diferente** da participação de atraso entre Cards (inteiro) e Gráficos (1 decimal).
8. **Listas de atraso** em ordem alfabética (amostras de 12 e 8), não por gravidade.
9. **Uma falha zera as duas visões** (busca conjunta).
10. **Link Colaboradores** abre na mesma aba no modo Cards e em nova aba no modo Gráficos.
11. **Termos técnicos na tela:** "Alocações em STEPs", "STEPs/STEPS/etapas", "bucket", "Total por esteira (OS)", "snapshot_atual", "(query)", "Janela 7d (UTC).", "backlog" nas dicas; textos explicativos com nomes de tabela/campo (`total_planned_minutes`, `conveyor_time_entries`, `entry_at`, `America/Sao_Paulo`); dica do seletor de janela cita `completed_at`; detalhe da janela no Painel cita `completed_at` e `days=`; "registados" (português de Portugal). Reproduzidos no capítulo **só para reconhecimento**, em tabela própria; candidatos ao capítulo 21.3 em rodada futura (capítulo 21 não alterado).
12. **"Mês atual (UTC)"** — mesmo rótulo incorreto já registrado no 21.3 (VAL-017).
13. **Seção ARGOS — Saúde das Esteiras** existe no código, mas está desligada por sinalizador fixo (`SHOW_ARGOS_HEALTH_UI = false`); não documentada.
14. **Fuso do "hoje"** no cálculo de atraso é o do servidor no Dashboard e o do navegador no Painel; pode haver diferença na virada do dia — por isso o capítulo diz que os números "tendem a coincidir".
15. **Capacidade "de hoje"** resolvida pela data UTC no servidor.

Pendências anteriores (VAL-010, VAL-011, reaplicação de permissões, acentos corrompidos, gerir alocações, termos técnicos, Capítulo 13, data de revisão): não tocadas.

## Pontos não comprovados — por isso não documentados

1. Se apontamentos e alocações de **esteiras excluídas** entram nos totais acumulados (as consultas não filtram pela esteira; depende de a exclusão marcar também esses registros).
2. Se o Painel operacional carrega exatamente o mesmo conjunto de esteiras do Dashboard em todos os casos.
3. Conteúdo da seção ARGOS (desligada).
4. Comportamento visual exato dos gráficos (cores, dicas) além dos textos lidos no código.

## Validações realizadas

| Validação | Resultado |
|---|---|
| `git fetch origin --prune`; tip da base | `25be481c7dda3d883ae2820e68d61e0d3d86e416` (OK) |
| Ancestralidade | 18/18 OK |
| `git status --short` antes do commit | `M docs/manual/source/MANUAL_USUARIO_SGP.md`; `?? docs/ai/returns/manual-usuario-sgp-cap15-retorno.md` |
| `git diff --check` | sem saída (OK) |
| Linhas removidas | somente a linha **Situação** e o marcador + 4 tópicos do Capítulo 15 |
| Capítulos 1–14 | idênticos, exceto a linha 6 (Situação) — conferido por script |
| Capítulos 16–21 | byte a byte idênticos — conferido por script |
| Marcador PENDENTE no Capítulo 15 | ausente |
| Busca de termos técnicos | só ocorrências intencionais: rótulos de tela citados para reconhecimento ("Alocações em STEPs", tabela "Rótulos técnicos que aparecem na tela") |
| Confronto com código/testes | ver "Funcionalidades comprovadas" |
| Consistência | capítulos 4 (permissões), 5 (recortes, atraso, Ativas), 7 (data do trabalho), 8/9 (capacidade diária), 12 (jornada, exportação), 14 (evolução), 16 (capacidade efetiva), 21.3 (Mês atual UTC) — remissões em vez de repetição |
| Build / lint / testes | **não executados** — rodada documental |

## Linha "Situação"

- Antes: "capítulos 1 a 14, 16, 17, 20 e 21 com conteúdo final. Os capítulos 15, 18 e 19 seguem marcados como pendentes…"
- Depois: "capítulos 1 a 17, 20 e 21 com conteúdo final. Os capítulos 18 e 19 seguem marcados como pendentes…"

## Metadado "Revisão deste manual"

Mantido em `2026-10-03`, conhecido como desatualizado, conforme instrução.

## Git

- Um único commit documental em `docs/manual-usuario-sgp-cap15`, publicado com `git push -u origin docs/manual-usuario-sgp-cap15`.
- **Sem** PR, merge, rebase ou force-push. `main`, `develop`, `homol` e branches documentais anteriores não alteradas.
- Estado final esperado do `git status`: limpo.

## Próximo passo recomendado

Decisão humana sobre os itens 2, 3, 6 e 11 (produto/texto de tela). Não iniciar o Capítulo 18 automaticamente.

## Uso de contexto / sessão

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
