# Retorno — `manual-usuario-sgp-cap05-painel-operacional`

- **TASK_ID:** `manual-usuario-sgp-cap05-painel-operacional`
- **Data/hora:** 2026-10-03 (UTC)
- **Status final:** concluída
- **Branch:** `docs/manual-usuario-sgp-cap05-painel-operacional`
- **SHA base:** `eee4788c9ba2f8142ce035a4b5c6df39a697adbf` — conferido contra `origin/docs/manual-usuario-sgp-base-p0`, **idêntico ao esperado**
- **SHA final:** ver seção "Commit e push"
- **Working tree ao encerrar:** limpo

## Arquivos alterados

| Arquivo | Ação |
|---|---|
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | alterado — capítulo 5 escrito, entrada nova no capítulo 21, cabeçalho de situação atualizado |
| `docs/ai/returns/manual-usuario-sgp-cap05-painel-operacional-retorno.md` | criado |

`docs/manual/source/MANUAL_FUNCIONAL_SGP.md` **não foi alterado.** A reconferência não encontrou nela nenhuma afirmação factual errada sobre o Painel operacional — a matriz simplesmente não documenta a taxonomia do painel (lacuna já registrada como `AUSENTE` na auditoria). Preencher essa lacuna é acréscimo, não correção, e está fora do escopo desta rodada.

## Resumo do capítulo entregue

Capítulo 5 — Painel operacional, com os seis blocos editoriais definidos no capítulo 2 do próprio manual:

- **Para que serve** — visão única das esteiras, tela de abertura da área de gestão.
- **Onde fica** — menu Gestão → Painel operacional; título exibido na tela.
- **Quem costuma ter acesso** — tabela ação × permissão exigida.
- **Como fazer** — ler os seis cartões; filtrar pelos cartões; filtrar pela faixa de filtros; combinar filtros; abrir uma esteira pelo menu de Ações; navegar pela lista.
- **O que esperar** — por que cartões e lista não respondem aos filtros do mesmo jeito; tabela recorte do painel × rótulo da coluna Situação; como o atraso é calculado, com precedência; o atalho Ativas; atualização da lista.
- **Quando algo é bloqueado** — estado vazio; roteiro de 6 passos para "não encontro uma esteira"; sem permissão; falha de carregamento; as cinco mensagens possíveis ao excluir.

Dois marcadores de imagem sugerida, ambos para coisas que o texto explica pior que uma figura: a divergência entre cartão selecionado e coluna Situação, e a migração de uma esteira para **Em atraso**.

## Evidências principais de código

Toda orientação do capítulo foi reconferida no código em `eee4788c`.

| Afirmação do capítulo | Evidência |
|---|---|
| Rota do painel, sem exigência de permissão | `src/routes/AppRoutes.tsx` — `<Route path="backlog" element={<BacklogPage />} />`, sem `RequirePermission`; `index` de `/app` redireciona para `/app/backlog` |
| Rótulo do menu | `src/lib/shell/app-nav-config.ts` — `GESTAO_NAV_ITEMS`, `label: 'Painel operacional'`, `navGroup: 'gestao'` |
| Título exibido na tela | `src/pages/BacklogPage.tsx` — `<h1>Painel Operacional de Esteiras</h1>` |
| Seis cartões e seus rótulos | `src/components/backlog/BacklogKpiCards.tsx` — array `items()` com `Rascunho`, `Aguard. planejamento`, `Em planejamento`, `Em execução`, `Em atraso`, `Finalizadas` |
| Não existe cartão de canceladas | mesmo array — não há entrada `canceladas`, embora `computeOperationalPanelKpis` calcule o valor e `OPERATIONAL_BUCKET_LABELS` tenha o rótulo |
| Cada esteira entra em um único cartão | `src/lib/backlog/operationalBuckets.ts` — `getOperationalBucket` retorna um único valor; `computeOperationalPanelKpis` incrementa um contador por linha |
| Clicar no cartão filtra, rola e destaca | `BacklogPage.tsx` — `handleKpiBucketClick` chama `handleStatusFilterChange` + `scrollToListSection`; `BacklogKpiCards` aplica `aria-pressed` e anel no cartão ativo |
| Cartões ignoram os filtros; a lista os respeita | `BacklogPage.tsx` — `kpis = computeBacklogKpis(allRows)` versus `pagedRows` derivado de `filtered`; textos em `src/lib/backlog/backlogCopy.ts` (`backlogKpiDeckIntro`, `backlogTotalsVsTableFiltered`) |
| A lista carregada é o universo completo | `BacklogPage.tsx` chama `listConveyors()` sem argumentos ("Fonte global do painel: sem recortes de filtros de tabela"); `server/src/modules/conveyors/conveyors.repository.ts` → `listConveyors` sem `LIMIT`, única condição fixa `deleted_at IS NULL` |
| Ordenação da mais recente para a mais antiga | mesma consulta — `ORDER BY created_at DESC`; não há reordenação no cliente |
| Nove opções do filtro Situação | `src/components/backlog/BacklogFilters.tsx` — `<option>` Todas, Ativas, Rascunho / Em elaboração, Aguardando planejamento, Em planejamento, Em execução, Em atraso, Finalizadas, Canceladas |
| A coluna Situação mostra rótulos diferentes dos cartões | `src/components/backlog/StatusBadge.tsx` + `src/lib/sgp-semantica-labels.ts` — `BACKLOG_STATUS_LABELS` inclui **A iniciar** e **Em andamento** e não inclui "Em execução" nem "Em atraso" |
| "Em execução" agrupa A iniciar + Em andamento | `operationalBuckets.ts` — `if (row.status === 'a_iniciar' \|\| row.status === 'em_andamento') return 'em_execucao'` |
| Precedência do atraso | `operationalBuckets.ts` — ordem em `getOperationalBucket`: `finalizadas` → `canceladas` → `em_atraso` → situação formal |
| Finalizada e cancelada nunca contam como atraso | `isEsteiraOverdueVersusToday` — `if (row.status === 'finalizada' \|\| row.status === 'cancelada') return false` |
| Sem prazo, nunca há atraso | mesma função — `if (dl === null) return false` |
| Comparação por dia inteiro | mesma função — `startOfLocalDay(now) > startOfLocalDay(dl)` |
| Recorte Ativas exclui finalizadas e canceladas | `BacklogPage.tsx` — `applySituationAndWindow`, ramo `'ativas'`; cópia em `backlogCopy.ts` (`backlogFilterDetailAtivas`) |
| Busca cobre OS, nome, cliente e responsável | `BacklogPage.tsx` — `matchesSearch` testa `ref`, `name`, `responsible`, `clientName` |
| Busca responde durante a digitação | `BacklogPage.tsx` — debounce de 320 ms sobre `qDraft` |
| Opções de responsável vêm das esteiras existentes | `BacklogPage.tsx` — `responsibleOptions` derivado de `allRows`, descartando vazio e `'—'` |
| 25 / 50 / 100 por página | `src/lib/admin/collaboratorsListUrlState.ts` — `COLABS_PAGE_SIZE_OPTIONS = [25, 50, 100]`, default 25 |
| Mudar filtro volta para a primeira página | `BacklogPage.tsx` — cada handler faz `next.delete('page')` |
| Etiquetas de filtro ativo | `BacklogPage.tsx` — bloco `hasTableFilters`; funções `backlogChip*` em `backlogCopy.ts` |
| "Mais filtros (em breve)" desligado | `BacklogFilters.tsx` — `<button disabled title="Funcionalidade em desenvolvimento">` |
| Colunas visíveis da lista | `src/components/backlog/BacklogTable.tsx` — `<th>` Esteira / OS, Responsável, Prioridade, Situação, Entrada, Ações; Origem, Atividades e ARGOS atrás de flags |
| Colunas e painel ARGOS desligados | `src/lib/backlog/backlogUiFlags.ts` — as quatro flags em `false`; `BacklogArgosPanel` faz `if (!SHOW_ARGOS_PANEL_FILTERS) return null` |
| Abrir esteira só pelo menu de Ações | `BacklogTable.tsx` — `menuItems` com `Consultar` / `Editar` / `Excluir`; a `<tr>` não tem handler de clique |
| Editar exige permissão | `BacklogTable.tsx` — `canEditEsteira = can('conveyors.create')` |
| Excluir exige permissão e situação elegível | `src/components/backlog/backlogRowActions.ts` — `DELETE_ELIGIBLE_STATUSES` = em_elaboracao, aguardando_planejamento, em_planejamento, a_iniciar |
| Contadores e paginação | `BacklogPage.tsx` — "N registro(s) · página X de Y", "A mostrar a–b de N", botões **Anterior** / **Seguinte** |
| Estado vazio | `BacklogTable.tsx` — "Nenhum resultado com estes filtros" + texto de orientação |
| Recarrega ao voltar o foco | `BacklogPage.tsx` — `window.addEventListener('focus', onFocus)` chamando `loadConveyors` |
| "Carregando esteiras…" e faixa de erro | `BacklogPage.tsx` — `apiLoading` e bloco `apiError` com `role="alert"` |
| Texto do diálogo de exclusão | `src/components/backlog/BacklogDeleteConveyorDialog.tsx` — "Excluir esteira?" / "…Só é permitido excluir esteiras que ainda estão no backlog." / Cancelar / Excluir esteira |
| Mensagens de exclusão | `BacklogTable.tsx` — `deleteConveyorErrorMessage`; `BacklogPage.tsx` — "Esteira excluída com sucesso."; `server/src/modules/conveyors/conveyorOperationalStatus.ts` e `conveyors.service.ts` — mensagens de apontamentos e movimentações |
| "Sem permissão para esta área" | `src/routes/RequirePermission.tsx` — texto exato de `RequirePermission` e `RequireAnyPermission` |

## Os sete recortes confirmados no código

Confirmados em `src/lib/backlog/operationalBuckets.ts` (`OperationalBucket`, `OPERATIONAL_SITUACAO_QUERY_VALUES`) e no seletor de `BacklogFilters.tsx`:

| # | Recorte | Rótulo na interface | Tem cartão? |
|---|---|---|---|
| 1 | em_elaboracao | Rascunho / Em elaboração (cartão: **Rascunho**) | sim |
| 2 | aguardando_planejamento | Aguardando planejamento (cartão: **Aguard. planejamento**) | sim |
| 3 | em_planejamento | Em planejamento | sim |
| 4 | em_execucao | Em execução | sim |
| 5 | em_atraso | Em atraso | sim |
| 6 | finalizadas | Finalizadas | sim |
| 7 | canceladas | Canceladas | **não** |

Mais o atalho **Ativas**, que não é um recorte de etapa, e **Todas**.

**Correção de precisão em relação ao enunciado desta tarefa e à auditoria anterior:** há **sete recortes no filtro**, mas **seis cartões**. O enunciado fala em "sete recortes/situações realmente usados pelo painel", o que é correto para o filtro e incorreto para os cartões. A auditoria histórica também sugeriu imagem com "os 7 cards de situação" (seção I do relatório) — eram seis. O capítulo documenta seis cartões e sete recortes, com a ausência do cartão de canceladas explicitada.

## Filtros confirmados

| Filtro | Opções / comportamento |
|---|---|
| **Buscar** | texto livre; procura em OS/código, nome, cliente e responsável; responde durante a digitação (debounce 320 ms) |
| **Situação** | Todas · Ativas · Rascunho / Em elaboração · Aguardando planejamento · Em planejamento · Em execução · Em atraso · Finalizadas · Canceladas |
| **Prioridade** | Todas · Alta · Média · Baixa |
| **Responsável** | Todos + responsáveis presentes nas esteiras existentes |
| **Por página** | 25 · 50 · 100 (padrão 25) |
| **Mais filtros (em breve)** | botão desabilitado, sem função |

Não documentado no capítulo, por não estar exposto na interface: a janela de dias aplicável a **Finalizadas**, que existe apenas por endereço e é normalizada quando incoerente.

Não documentado por estar desligado: painel e filtro ARGOS, colunas Origem, Atividades e ARGOS.

## Regra confirmada de atraso e precedência

Em `src/lib/backlog/operationalBuckets.ts`:

```
getOperationalBucket:
  finalizada            -> finalizadas
  cancelada             -> canceladas
  atrasada vs hoje      -> em_atraso
  situação formal       -> recorte correspondente
```

`isEsteiraOverdueVersusToday` exige, cumulativamente: situação diferente de finalizada e cancelada; prazo estimado reconhecido como data; e `startOfLocalDay(hoje) > startOfLocalDay(prazo)` — ou seja, comparação por dia inteiro, com atraso a partir do dia seguinte ao prazo.

Consequência documentada no capítulo: o atraso **substitui** a situação de origem, inclusive em rascunho e aguardando planejamento.

## DIVERGÊNCIA NOVA E RELEVANTE — cálculo de atraso

Descoberta nesta rodada, não registrada em nenhuma rodada anterior. Impacto direto na confiabilidade do cartão **Em atraso**.

**O que acontece.** O painel lê `estimatedDeadline` como **data** (`parseFlexibleDeadlineToDate`: tenta `Date.parse`, depois o padrão `dd/mm/aaaa`). Mas o campo **Prazo estimado** do cadastro de Nova esteira valida **número de dias**: `PRAZO_ESTIMADO_NUMERICO = /^\d+([.,]\d+)?$/` em `src/mocks/nova-esteira-dados-validacao.ts`, com placeholder `"Ex.: 10 (dias) — apenas número ou deixe em branco"` em `src/features/esteiras/nova-esteira/NovaEsteiraDadosIniciais.tsx`. O valor é persistido como texto em `estimated_deadline VARCHAR(128)` (`server/migrations/0005_conveyors_and_nodes.sql`), via `normalizePrazoEstimadoForPersistence` em `server/src/modules/conveyors/conveyors.service.ts`.

**Comportamento verificado** (execução direta do parser em Node, mesmo motor do navegador Chrome/Edge):

| Valor persistido | Resultado da leitura | Efeito no painel |
|---|---|---|
| `"30"`, `"15"`, `"10"` | `Date.parse` → NaN; padrão `dd/mm/aaaa` não casa | prazo não reconhecido; **nunca** entra em Em atraso |
| `"7"` | `Date.parse("7")` → 2001-07-01 | data no passado; **sempre** em Em atraso, desde a criação |
| `"Início previsto: 2026-10-01T00:00:01 · Fim previsto: 2026-10-20T23:59:59"` | NaN; padrão não casa | prazo não reconhecido; nunca entra em Em atraso |
| `"2026-10-20"` | lido corretamente | funciona |
| `"25/12/2026"` | `Date.parse` → NaN, cai no padrão `dd/mm/aaaa` | funciona |
| `"01/02/2026"` | `Date.parse` → 2026-01-02 (lido como mês/dia) | **dia e mês invertidos**; atraso deslocado |

Ou seja: para esteiras criadas pelo caminho principal, **o cartão Em atraso não funciona** — fica em zero, ou dispara indevidamente para prazos de um dígito. Datas em `dd/mm/aaaa` com dia até 12 são lidas no padrão americano.

**Tratamento nesta rodada.** O capítulo 5 ensina a regra correta e inclui um aviso explícito de limitação, orientando a não usar o cartão **Em atraso** como fonte única e a conferir o prazo na esteira. O capítulo 21 recebeu a entrada **"Cálculo de atraso no Painel operacional"** com a tabela de efeitos. **Nenhuma correção de aplicação foi feita**, conforme a restrição da tarefa.

## Outras divergências encontradas (registradas, não corrigidas)

| Divergência | Evidência | Tratamento |
|---|---|---|
| **Três nomes para a mesma tela:** menu "Painel operacional", título na tela "Painel Operacional de Esteiras", título do shell "Backlog Operacional" | `app-nav-config.ts`, `BacklogPage.tsx`, `src/lib/page-meta.ts` | capítulo cita o rótulo do menu e o título da tela; não ampliei o capítulo 21, por ser divergência de rótulo já coberta genericamente na auditoria |
| **Busca faz mais do que o campo anuncia:** placeholder diz "OS, nome ou cliente…" mas `matchesSearch` também cobre responsável | `BacklogFilters.tsx`, `BacklogPage.tsx` | capítulo informa o comportamento real e nota a diferença; divergência benigna (a busca encontra mais, não menos), por isso não foi para o capítulo 21 |
| **Botões de criação não respeitam permissão na exibição:** "Nova Esteira Manual" e "Nova esteira por documento" são links simples, sem verificação | `BacklogPage.tsx` — `<Link>` sem `RequirePermission` | capítulo avisa que o botão aparece para todos e que o bloqueio ocorre na tela de destino, com a mensagem exata |
| **`listConveyorsQueryFromBacklogUrl` não é usada pelo painel** — existe a função que montaria filtro no servidor, mas a tela carrega tudo e filtra no navegador | `backlogUrlParams.ts` versus `BacklogPage.tsx` | sem efeito para o usuário; registrado aqui como observação técnica |
| **Enunciado e auditoria falam em sete cartões** — são seis | ver seção dos sete recortes | corrigido no capítulo; auditoria histórica não foi editada |

Nenhuma dessas divergências exigiu alterar a matriz técnica.

## Pendências de produto identificadas

1. **Prazo estimado × cálculo de atraso** (nova, acima): alinhar o que o cadastro pede com o que o painel lê, e corrigir a leitura de datas `dd/mm/aaaa` com dia até 12. Até então o cartão **Em atraso** não é confiável.
2. **Cartão de canceladas ausente** enquanto o filtro existe: decidir se o cartão deve ser incluído ou se a ausência é deliberada.
3. **Placeholder da busca incompleto**: mencionar responsável, ou restringir a busca ao que o campo anuncia.
4. **Nome da tela em três variantes**: padronizar menu, título da tela e título do shell.
5. **Botões de criação sem verificação de permissão na exibição**: ocultar para quem não pode criar, em vez de levar a uma tela de bloqueio.

Pendências anteriores seguem abertas, sem alteração nesta rodada.

## Validações executadas e resultados reais

| Validação | Resultado |
|---|---|
| `git fetch origin --prune` | OK |
| SHA base conferido | `eee4788c…` idêntico ao esperado |
| `git status --short` | apenas `docs/manual/source/MANUAL_USUARIO_SGP.md` modificado, antes de criar este retorno |
| `git diff --check` | **sem avisos** (exit 0) |
| `git diff --name-only eee4788c..HEAD` após o commit | somente os 2 arquivos permitidos, ambos em `docs/` |
| Nenhuma alteração fora de `docs/` | confirmado |
| Marcador pendente no capítulo 5 | **ausente** |
| Marcadores pendentes preservados | 16 ocorrências — capítulos 4 e 6 a 19, mais a citação do próprio marcador na seção 2.6 |
| Varredura de linguagem técnica **no capítulo 5** | `bucket` 0 · `endpoint` 0 · `migration` 0 · `completed_at` 0 · `scope=ativas` 0 · `days=` 0 · `A_INICIAR` 0 · `EM_ANDAMENTO` 0 · `DRAFT` 0 · `PUBLISHED` 0 · `STEP` 0 · `PENDING` 0 · `ABORTED` 0 · `query` 0 · `enum` 0 · `backend` 0 · `API` 0 · `URL` 0 |
| Seis blocos editoriais no capítulo 5 | todos presentes |
| Marcadores de imagem no capítulo 5 | 2 (limite respeitado) |
| Varredura no arquivo inteiro | `STEP` permanece em 2 linhas declaradas (nota do capítulo 20 e tabela de tradução do capítulo 21); nenhum outro termo proibido |
| Verificação do parser de prazo | executada em Node sobre os mesmos valores que o painel recebe; resultados na tabela da seção de divergência |

**Nenhuma tela foi executada ou observada visualmente.** Toda a análise foi feita por leitura de código, migrations e testes do repositório, mais a execução isolada do parser de datas em Node para comprovar o comportamento do cálculo de atraso. Nenhum banco foi consultado.

**Build, lint e testes da aplicação: não executados.** Tarefa documental; nenhum arquivo sob build, lint ou teste foi tocado. Nenhum resultado de pipeline é alegado.

## Confirmação de não alteração

Verificado por `git diff --name-only` contra a base: **não** foram alterados `src/`, `server/`, migrations, testes, `package.json`, `app-version.json`, CSS, assets, `docs/manual/colaborador.html`, `docs/manual/gestor-esteira.html`, o relatório histórico da auditoria nem `docs/manual/source/MANUAL_FUNCIONAL_SGP.md`. Nenhum defeito de interface foi corrigido — apenas registrado. Nenhum screenshot, HTML ou PDF foi gerado.

Branches intactas, conferidas após o push:

| Branch | SHA |
|---|---|
| `origin/main` | `c611d10feacf329bdc217fe391ebf47a90a6ea7a` |
| `origin/develop` | `c611d10feacf329bdc217fe391ebf47a90a6ea7a` |
| `origin/homol` | `6b768c852a18b7428e3dadf761bad7e35c1d61ef` |
| `origin/docs/auditoria-cobertura-funcional-manual-sgp` | `1a951e4e5f65a958bbf22fec64c79e915164c4ed` |
| `origin/docs/manual-usuario-sgp-base-p0` | `eee4788c9ba2f8142ce035a4b5c6df39a697adbf` |

## Commit e push

- Commit: `docs(manual): escreve capítulo 5 — Painel operacional`
- Branch remota: `origin/docs/manual-usuario-sgp-cap05-painel-operacional`
- PR: não criado. Merge: não realizado. Force-push: não realizado. Nenhuma branch excluída.
- SHA final: `<preenchido no commit de registro>`

## Uso de contexto / sessão

`Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.`

`SESSION_CHECKPOINT.md` não foi atualizado: não houve handoff, não há métrica confiável de consumo de contexto e a atividade foi concluída nesta sessão.
