# Retorno — dashboard-periodo-personalizado-ptbr

- **TASK_ID:** `dashboard-periodo-personalizado-ptbr`
- **Data/hora:** 2026-10-20, ~20:10 UTC
- **Prompt:** `docs/ai/prompts/dashboard-periodo-personalizado-ptbr.md`
- **Status final:** **IMPLEMENTADO e VALIDADO EM AMBIENTE ISOLADO** (Postgres local descartável e navegador local). **Não homologado.**
- **Branch:** `hotfix/listagem-atividades-tati`. As correções de listagem já publicadas foram preservadas e não houve mistura com outras branches.
- **SHA inicial:** `bc2393c4b4d110c2abb47420a314ed7cd90364d0` (local = remoto, working tree limpo, sem stash).
- **SHA final:** o do commit que contém este arquivo (`git log -1 origin/hotfix/listagem-atividades-tati`).

## O que mudou para o usuário

- **Um único filtro na barra superior do Dashboard**, junto a Operacional/Gerencial, Cards/Gráficos e Atualizar:
  - campos **Data inicial** e **Data final** e botão **Aplicar período**;
  - o mesmo período vale para as duas visões e para Cards e Gráficos.
- **Valor inicial** sem preferência salva: **01/10/2026 a 20/10/2026**.
  - É só a configuração inicial desta entrega (constante `DASHBOARD_DEFAULT_DATE_RANGE`), não uma regra de negócio.
  - O período aplicado fica salvo numa única chave (`sgp.dashboard.period`).
  - As preferências antigas (`sgp.dashboard.executiveWindowDays` e `sgp.dashboard.operationalRealizedPreset`) **não são mais lidas e não foram migradas**.
- **Edição e aplicação:**
  - editar as datas não consulta o servidor; só **Aplicar período** consulta;
  - enquanto o usuário edita, aparece "Novo período: dd/mm/aaaa a dd/mm/aaaa";
  - o botão fica desabilitado com intervalo inválido ou sem alteração.
- **Atualizar** e a atualização automática recarregam com o período aplicado (após apontamento ou ao voltar à aba depois de 30 s).
- Uma resposta de período antigo não sobrescreve a de um período mais recente (sequência de consultas).
- **Operacional:**
  - novo cartão **"Horas apontadas no período — 01/10/2026 a 20/10/2026"**;
  - acumulados e situação atual continuam como antes.
- **Gerencial:**
  - **"Esteiras concluídas — 01/10/2026 a 20/10/2026"**;
  - ativas, atraso e totais de tempo continuam sem filtro de período.
- **Detalhamento:**
  - o cartão ou segmento de concluídas abre o painel de esteiras com `situacao=finalizadas&completedFrom=…&completedTo=…`, o **mesmo período**, sem `days`;
  - o painel mostra o chip "Concluídas: 10/10/2026 a 20/10/2026" e uma explicação em português;
  - no teste, a contagem bateu: Dashboard 6 = painel 6 = banco 6.

## Contratos das APIs

| Endpoint | Antes | Depois |
|---|---|---|
| `GET /api/v1/dashboard/operational` | `?realizedPeriodPreset=7d\|15d\|30d\|month` (opcional); janela móvel até agora, "month" em SP | `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`. **As datas têm precedência** sobre `realizedPeriodPreset`, que continua aceito quando não há datas |
| resposta operacional | `plannedVsRealized.realizedPeriod = { from, to, preset }` | + `meta.period = { startDate, endDate, timezone, from, to }`; `realizedPeriod.preset = 'custom'` com `startDate`/`endDate` |
| `GET /api/v1/dashboard/executive` | `?days=1..365` (padrão 30), "últimos N dias até agora" | `?startDate=…&endDate=…`. **As datas têm precedência** sobre `days`. Sem nenhum dos dois, continua `days=30` (compatível) |
| resposta gerencial | `meta = { generatedAt, completedWithinDays, scope }` | + `meta.period`; `completedWithinDays` = dias civis do período; `scope` descreve o período |

**Validação no backend** (HTTP 400, código `VALIDATION_ERROR`):
- "Informe a data inicial."
- "Informe a data final."
- "Informe uma data válida." (formato diferente de `YYYY-MM-DD` ou data inexistente, como 30/02)
- "A data inicial não pode ser posterior à data final."

Um parâmetro de período com mais de 64 caracteres recebe 422 do Zod, como nos demais parâmetros.

**Sem limite de extensão.** Os indicadores filtrados são uma soma e uma contagem únicas com predicado de intervalo, e o custo não cresce com o número de dias. Datas futuras são aceitas: o resultado depende dos dados.

## Regra de datas e fuso

- O período é formado por **dias civis completos de `America/Sao_Paulo`**.
- A consulta usa `instante >= 00:00 da Data inicial (SP)` e `instante < 00:00 do dia seguinte à Data final (SP)`. O limite superior é exclusivo, então inclui todo o último dia sem depender de 23:59:59.999.
- **Funções reaproveitadas:**
  - `operationalDayStart`, `operationalDayEnd` e `isValidDateOnly` de `server/src/shared/operationalWorkDate.ts` (esta passou a ser exportada);
  - `shiftIsoDate` e `inclusiveDaySpan` de `server/src/shared/operationalDateRange.ts`.
- **`resolveOperationalPeriod` (custom) não foi usado:** só repassa limites recebidos (com `to` inclusivo). Ele continua atendendo os presets legados.
- **Operacional:** `conveyor_time_entries.entry_at` (data de realização). Um apontamento retroativo conta no dia informado, mesmo gravado depois (testado com `created_at` posterior). Isso é coerente com `parseEntryAtInput`: data pura vira 12:00 de SP.
- **Gerencial:** `conveyors.completed_at` com `operational_status = 'FINALIZADA'`.
- **No Backlog:** filtro no cliente pelo dia civil de SP de `completedAt` (`completedAtWithinPeriod`).
- O offset de São Paulo é fixo em −03:00, como no código existente (o Brasil não tem horário de verão desde 2019).

## Indicadores

| Afetados pelo período | Preservados (sem filtro de período) |
|---|---|
| Horas apontadas no período (Operacional) | Esteiras por situação, total de esteiras, em atraso, alocações |
| Esteiras concluídas (Gerencial) | Total de horas apontadas, tempo previsto das atividades, total por esteira (OS) |
| | Esteiras ativas, participação de atraso, carga por colaborador, últimos apontamentos |

Os testes de integração comparam os indicadores globais com e sem período: são idênticos.

## Textos corrigidos (exemplos)

| Antes | Depois |
|---|---|
| Alocações em STEPs | Alocações em atividades |
| Pressão de atraso (esteiras) / Bucket operacional em atraso… | Esteiras em atraso / Prazo estimado vencido (situação atual)… |
| Esteiras por bucket operacional · …ao premir uma barra | Esteiras por situação operacional · Clique em uma barra… |
| Snapshot atual na base… / rodapé "· snapshot_atual" | Situação atual de todas as esteiras… / rodapé sem o identificador |
| Minutos apontados (acumulado) | Total de horas apontadas |
| Minutos apontados (período) · "Janela 7d (UTC)" | Horas apontadas no período — 01/10/2026 a 20/10/2026 |
| Previsto estrutural (referência — STEPs) / (STEPS) | Tempo previsto das atividades |
| Concluídas (30d) / Janela (30 dias) / Janela temporal / últimos 30 dias | Esteiras concluídas — 01/10/2026 a 20/10/2026 / Período de análise (…) |
| …âmbito ativas… | …somente as esteiras ativas… |
| Sem apontamentos registados. | Nenhum apontamento registrado. |
| Razão entre esteiras no bucket em_atraso… | Proporção de esteiras em atraso em relação às esteiras ativas… |
| Notas da API com STEPs, `total_planned_minutes`, `conveyor_time_entries`, `entry_at`, preset | Texto único em português, sem nomes de colunas |
| Visão executiva (agregados operacionais) | Visão gerencial: totais da operação e esteiras concluídas no período. |

**Unidades:** os valores continuam em minutos no contrato e aparecem em h/min (`formatHumanMinutes`). Os eixos dos gráficos passaram de "6h"/"30m" para "6 h"/"30 min".

**Fora do escopo, sem alteração:**
- `operationalLabels` (compartilhado com as telas de Jornada);
- textos do painel de esteiras (Backlog), que ainda dizem "bucket" (ver Pendências).

## Arquivos

**Backend:**
- `server/src/modules/dashboard/dashboard.period.ts` (novo);
- `dashboard.{controller,schemas,service,repository,dto}.ts`, com as consultas novas `sumRealizedMinutesInRange` e `countCompletedInRange`;
- `server/src/shared/operationalWorkDate.ts` (export de `isValidDateOnly`).

**Frontend:**
- `src/lib/dashboard/dashboardDateRange.ts` (novo);
- `src/components/dashboard/DashboardDateRangeFilter.tsx` (novo);
- `src/features/gestor/DashboardPage.tsx`;
- `src/components/dashboard/charts/{Executive,Operational}DashboardCharts.tsx`;
- `src/components/dashboard/DashboardOperacionalBarList.tsx`;
- `src/lib/operationalSemantics.ts` (`dashboardLabels`; `executiveDashboardCopy` e `dashboardHints` reescritos);
- `src/lib/dashboard/dashboardNavigation.ts`;
- `src/services/dashboard/dashboardApiService.ts`;
- `src/domain/dashboard/dashboard.types.ts`;
- painel de esteiras: `src/lib/backlog/{backlogUrlParams,backlogCopy}.ts` e `src/pages/BacklogPage.tsx`.

**Removidos:** `src/components/dashboard/ExecutiveWindowSelector.tsx` e `src/lib/dashboard/executiveDashboardWindow.ts`, sem outros usos.

**Testes:**
- backend: `server/src/tests/dashboard-period.test.ts` e `dashboard-period.integration.test.ts`;
- frontend: `src/lib/dashboard/{dashboardDateRange,dashboardNavigation}.test.ts`, `src/components/dashboard/DashboardDateRangeFilter.test.tsx` e `src/features/gestor/DashboardPage.period.test.tsx`;
- acréscimos em `src/lib/backlog/backlogUrlParams.test.ts`; `src/lib/executiveDashboardCopy.test.ts` reescrito.

**Migrations:** nenhuma. Sem alteração em `package*.json`, `.github/` ou secrets.

## Testes e validação (comandos reais)

O banco usado foi o Postgres 16 local da sessão (porta 55432), com migrations `0001`–`0053` aplicadas só nele.

| Comando | Resultado |
|---|---|
| `npx vitest run src/tests/dashboard-period.test.ts src/tests/dashboard-period.integration.test.ts src/tests/dashboard.integration.test.ts` (server) | exit 0, **20/20** |
| `npx tsc -p tsconfig.json --noEmit` (server) | exit 0 |
| `npx vitest run` (server, suíte completa) | exit 1: **só as 2 falhas preexistentes**, idênticas na `main` (`env.test`, `operational-planning.weekly-view.http`); 1330 passam e 17 são ignorados |
| `npx tsc -b` (frontend) | exit 0 |
| `npx vitest run` (frontend, completo) | exit 0, **227 arquivos / 1485 testes** |
| `npm run build` (frontend) | exit 0 (só o aviso de chunk > 500 kB, preexistente) |
| `npm run lint` | exit 1, **117 problemas (94 erros, 23 avisos), iguais aos da base**, mesmo conjunto de arquivos; nenhum novo |

**Cobertura do item 12, backend** (`dashboard-period.integration.test.ts`, com instantes em 2033 para isolar os dados):
1. um dia;
2. 01/10 a 20/10;
3. início exato da Data inicial;
4. último instante (23:59:59.999) da Data final;
5. dia seguinte excluído;
6. datas inválidas (400, nas duas rotas);
7. Data inicial maior que a final;
8. retroativo (`created_at` posterior, contado pelo `entry_at`);
9. virada de mês e de ano (31/12 23:30 SP = 01/01 UTC conta em 31/12);
10. indicadores globais idênticos;
11. concluídas dentro e fora do período;
12. compatibilidade `days`/`realizedPeriodPreset` e precedência das datas.

**Cobertura do item 12, frontend** (`DashboardPage.period.test.tsx`, `DashboardDateRangeFilter.test.tsx` e `dashboardDateRange.test.ts`):
1. dois campos rotulados;
2. aplicação;
3. e 4. Operacional ↔ Gerencial com o mesmo período e sem nova consulta;
5. Cards ↔ Gráficos;
6. persistência ao recarregar, ignorando as chaves antigas;
7. validações;
8. formato dd/mm/aaaa;
9. nenhum termo técnico em texto, `title` ou `aria-label` nas duas visões e nos dois modos;
10. detalhamento com `completedFrom`/`completedTo`;
11. telas pequenas: verificação visual (abaixo);
12. Atualizar e a atualização automática reconsultam com o período aplicado.

Também cobertos: corrida (resposta antiga descartada) e mensagem de erro padrão.

**Verificação visual** (Chromium com Playwright, API e Vite locais, notebook 1366×768 e celular 390×844):
- período inicial 01/10/2026 a 20/10/2026;
- nenhuma requisição durante a edição;
- erro "A data inicial não pode ser posterior à data final." com o botão desabilitado;
- ao aplicar, as duas rotas são chamadas com as mesmas datas;
- alternar visões e modos não faz nova consulta;
- recarregar mantém o período;
- o detalhamento abre o painel com o mesmo período;
- nenhum termo técnico nas quatro combinações;
- sem rolagem horizontal no celular.

**Observação sobre o formato do campo nativo de data:**
- Com o navegador em português (`--lang=pt-BR`), o campo aparece como **01/10/2026**.
- Em navegador configurado em inglês, o campo nativo aparece como mm/dd/aaaa. Isso é comportamento do navegador e do padrão `type="date"`, usado em 24 telas do projeto.
- Por isso o filtro mostra sempre o "Período aplicado" e o "Novo período" em dd/mm/aaaa.

Na carga inicial em desenvolvimento, cada rota é chamada duas vezes por causa do `StrictMode` do React. Isso é preexistente e não acontece no build de produção.

## Limitações, riscos e pendências

1. **Painel de esteiras (Backlog):** os textos antigos ainda citam "bucket", "completed_at" e "days=" (`backlogCopy.ts`). Está fora do Dashboard; o pedido limitava a revisão de textos ao Dashboard. Os textos novos do período estão em português. **Pendência sugerida:** padronizar a linguagem do Backlog em atividade própria.
2. **Telas de Jornada** continuam com "Minutos apontados (acumulado/período)" (`operationalLabels` compartilhado), sem alteração por estarem fora do escopo.
3. O link antigo com `days=` (de outras origens) continua funcionando no Backlog. Quando há `completedFrom`/`completedTo`, as datas prevalecem.
4. **O filtro do Backlog é feito no cliente,** sobre a lista carregada, como já era com `days`. A consistência foi verificada só com o volume local.
5. **Não houve homologação com dados reais.**

## Roteiro de homologação (Gustavo e Tati)

1. Abrir **Gestão → Dashboard** sem preferência salva (ou em janela anônima). Esperado: Data inicial 01/10/2026 e Data final 20/10/2026 na barra superior.
2. **Operacional (Cards):**
   - conferir "Horas apontadas no período — 01/10/2026 a 20/10/2026";
   - conferir que "Total de horas apontadas" não muda ao trocar o período.
3. Alterar para 10/10/2026 a 20/10/2026 sem clicar em Aplicar: nada muda. Clicar em **Aplicar período**: os números do período mudam.
4. Mudar para **Gerencial:** as datas continuam as mesmas; o cartão "Esteiras concluídas — 10/10/2026 a 20/10/2026" aparece.
   - Clicar no cartão: o painel de esteiras abre com "Concluídas: 10/10/2026 a 20/10/2026" e a mesma quantidade.
5. Alternar **Cards/Gráficos** e **Operacional/Gerencial:** o período não muda.
6. Tentar Data inicial posterior à final: aparece a mensagem de erro e o botão fica desabilitado.
7. Recarregar a página (F5): o último período aplicado continua.
8. Apontar horas pelo cabeçalho com data de realização dentro do período: o Dashboard atualiza sozinho e as horas do período aumentam.
9. Ler os textos das duas visões: não devem aparecer STEP, bucket, snapshot, preset, janela ou UTC.
10. Repetir no celular.

## Git

- Commit e push normal **somente** em `hotfix/listagem-atividades-tati`. Sem PR, merge, deploy, migration ou force-push.
- `main`, `develop` e `homol` não foram alteradas (conferido no fim).
- **Próximo passo:** homologação humana; depois, decidir a PR e a reconciliação com a `develop`.

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
