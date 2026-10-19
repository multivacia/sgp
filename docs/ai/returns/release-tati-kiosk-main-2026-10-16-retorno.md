# Retorno — release-tati-kiosk-main-2026-10-16

- **TASK_ID:** `release-tati-kiosk-main-2026-10-16`
- **Data/hora:** 2026-10-16 19:15 UTC
- **Prompt:** `docs/ai/prompts/release-tati-kiosk-main-2026-10-16.md` (cópia literal do anexo)
- **Objetivo:** preparar e validar a release candidata para `main` com as dez solicitações da Tati (07/10) e a pesquisa `OS & Atividade` do Kiosk, sem a regra de apontamento somente em atividade planejada, e abrir a PR sem merge.
- **Status final:** **PRONTA PARA HOMOLOGAR** (não homologada; depende de aceite humano item a item).
- **Branch:** `release/tati-kiosk-main-2026-10-16`, criada a partir de `origin/main`, em worktree próprio.
- **SHA inicial:** `c611d10feacf329bdc217fe391ebf47a90a6ea7a` (`origin/main`, 1.9.8).
- **SHA final:** o do commit que contém este arquivo (`git log -1 origin/release/tati-kiosk-main-2026-10-16`).

## Resultado em uma frase

A candidata reúne os itens 1 a 10 da Tati e a pesquisa do Kiosk sobre a `main`, **sem** a regra `apontamento-somente-planejado`, com a fila do Kiosk sem cliente, veículo e placa. Ela passa no `verify:deploy` e não tem falha nova contra a `main` com banco real.

## Refs (antes = depois; nenhuma alterada)

| Ref | SHA |
|---|---|
| `origin/main` | `c611d10f` (1.9.8) |
| `origin/develop` | `247b6985` (1.9.9) |
| `origin/homol` | `6b768c85` |

`main`, `develop`, `homol`, produção, VPS, banco compartilhado e workflows **não foram tocados**.

## Commits da candidata (sobre `c611d10f`)

| Commit | Origem | Conteúdo |
|---|---|---|
| `84e5348b` | cherry-pick `-x` de `935dc943` | Tati itens 3, 4, 6, 7, 8, 9 e base do 2 (autoria preservada) |
| `5412d283` | cherry-pick `-x` de `438f8a00` | Tati itens 2 (`&`), 5 e 10 (autoria preservada) |
| `bab52efa` | cherry-pick `-x` de `f4d38a42` | Kiosk: `&` em "Outra atividade" |
| `be3d284d` | cherry-pick `-x` de `ba9adf06` | docs do retorno do Kiosk |
| `f639a564` | cherry-pick `-x` de `4a0bc0bf` | Kiosk: `&` na caixa "Buscar atividade…" |
| `682054ac` | novo | **gate de privacidade**: fila do Kiosk sem cliente/veículo/placa + contrato com lista não vazia |
| `6310e0ac` | novo | teste: "Outra atividade", duas OS com a mesma atividade, busca e apontamento |
| `1b8e77dd` | novo (subconjunto de `3d6f1a30`, `a4a3d5d6`, `0b19d7e2`, `c10301b2`, `437cffbd`) | item 1: Guias Práticos no menu "? Ajuda" |
| `7811a950` | trechos de teste de `437cffbd` | rótulos pt-BR em 2 testes de data |
| `2844996a` | novo | **proposta** de versão 1.10.0 (commit isolado, revertível) |
| `7e284080` | trechos de teste de `dfdaba7b` | mensagem "conta sem colaborador" em 2 testes |
| `e7414b76` | novo | teste de integração dos itens 7 e 8 |
| (este) | novo | prompt, retorno e checkpoint |

Os dois cherry-picks da Tati aplicaram com conflito só no `SESSION_CHECKPOINT.md`. **Prova:** `git diff c611d10f 5412d283 -- server src` é idêntico a `git diff ecb26da7 438f8a00 -- server src`. Os três do Kiosk aplicaram sem conflito: foram feitos sobre `a4a3d5d6`, **antes** da regra de planejadas. A mistura auditada só acontecia no merge `247b6985`.

## Diff `main` → candidata

- 153 arquivos, +7 299 / −1 456 (antes deste commit de docs). Destes, 47 são PNG dos guias.
- `server/migrations/`, `package.json`, `package-lock.json`, `server/package*.json` e `.github/`: **nenhuma alteração**.
- Para comparação, `main..develop` tinha 67 commits e 269 arquivos.

## Matriz de rastreabilidade (10 itens Tati + Kiosk)

| # | Entrega | Principais arquivos | Rotas | Testes automatizados | Limitações conhecidas |
|---|---|---|---|---|---|
| 1 | Guias Práticos de Colaborador e Gestor, acessíveis por "? Ajuda" | `docs/manual/colaborador.html`, `gestor-esteira.html`, `img/guia-*` (47 PNG), `HelpMenu.tsx`, `lib/help/*`, `vite-plugin-manual-usuario.ts`, `AppHeader.tsx` | estático `/manual/colaborador.html`, `/manual/gestor-esteira.html`, `/manual/img/...` | `HelpMenu.test.tsx` (6), `manual-help.test.ts` (7, inclui "guia não cita recurso ausente") | Sem Manual do Usuário integrado nem "Como usar esta tela" (ver Decisões). Validar que o servidor de produção entrega `/manual/*` em vez do fallback da SPA. |
| 2 | Apontar horas: `Esteira/OS & atividade` | `my-activities.*`, `time-entry-candidates.search.ts`, `shared/accentInsensitiveSearch.ts`, `QuickTimeEntryDrawer.tsx` | `GET /me/time-entry-candidates?q=` (+ `conveyorQ`, `activityQ`) | `time-entry-candidates-http.integration` (com banco), `accent-insensitive-search` | Sem `&`, a pesquisa livre continua sensível a acento (como antes). |
| 3 | Evolução das Esteiras: PDF Retrato/Paisagem | `ConveyorProgress*`, `conveyorProgressPdfOrientation.ts`, `useConveyorProgressPrint.ts` | — (`window.print`) | `conveyorProgressPage.test` | Orientação via `@page`; Firefox respeita parcialmente. **Testar no navegador da fábrica.** |
| 4 | Minha Fila por período (até 92 dias) | `my-work-queue.*`, `work-queue-period.ts`, `shared/operationalDateRange.ts`, `MyWorkQueuePage.tsx` | `GET /me/work-queue?from=&to=` | `my-work-queue-period.integration` (6), `work-queue-period`, `periodFilter` | Só planos publicados (regra existente). |
| 5 | Planejamento: pesquisa por período entre semanas | `operational-planning.range*.ts`, `PlanningPeriodSearchPanel.tsx`, `planningBoardFilters.ts` | `GET /operational-planning/period-items` (guard de Planejamento) | `operational-planning-range.integration`, `planningBoardFilters.test` | Painel somente leitura; o quadro continua semanal. |
| 6 | Minha Jornada: período com datas opcionais | `JornadaPage.tsx`, `periodFilter.ts` | `GET /my-operational-journey` (inalterado) | `periodFilter.test` | — |
| 7 | Extra Esteira na jornada + histórico após exclusão do catálogo | `operational-journey.repository/service/dto`, `JourneyExtraTimeEntriesSection.tsx` | `GET /my-operational-journey`, jornada gerencial | **novo** `journey-extra-time-justification-history.integration` (falha na `main`, passa aqui) | — |
| 8 | Justificativas e observações visíveis | `timeEntryJustificationDisplay.ts` (server e front), `TimeEntryJustificationNote.tsx`, `conveyorAssignments.*`, telas de jornada/apontamento | respostas existentes ganham `standardJustificationLabel/Complement` | **novo** teste de integração acima, `timeEntryJustificationDisplay.test` | Sem endpoint novo nem mudança de RBAC. |
| 9 | Dashboard atualiza após apontamento | `operationalDataEvents.ts`, `DashboardPage.tsx`, `QuickTimeEntryDrawer.tsx` | — | `operationalDataEvents.test` | Sem polling; reconsulta ao voltar à aba após 30 s. |
| 10 | Exportação Excel para IA (5 abas) | `operational-planning.ai-export.ts`, `operational-planning.export.ts`, `OperationalPlanningPage.tsx` | `GET /operational-planning/export-ai.xlsx?from=&to=` ou `?weekStart=` | `operational-planning-range.integration` (abas, cabeçalhos, filtro, congelamento, fórmula de saldo) | Itens só de equipe ficam fora da carga individual (documentado na aba de prompt). Backlog lido sem paginação. |
| K | Kiosk: `OS & atividade` em "Buscar atividade…" e "Outra atividade" | `kioskWorkQueueSearch.ts`, `KioskActivityCards.tsx`, `production-time-entry-candidates.controller.ts`, `production-work-queue.*` | `GET /production/me/work-queue` (+ `conveyorCode`), `GET /production/me/time-entry-candidates?q=` | `kioskWorkQueueSearch.test`, `KioskActivityCards.test`, `production-time-entry-candidates-search.test` (15), `production-unassigned…integration` (10), `production-work-queue.integration` (contrato com lista não vazia) | **Caixa principal não pesquisa cliente, veículo nem placa** (ver gate de privacidade). |

## Dependências adicionais e o que ficou de fora

Incluídas além dos commits de Tati e Kiosk, cada uma justificada:

1. **Menu "? Ajuda" reduzido** (de `0b19d7e2`, `c10301b2`, `437cffbd`). É o fluxo oficial de acesso aos guias e traz a regra aprovada do guia do gestor por permissão. Só os dois guias. O plugin de Vite mantém o mesmo nome de arquivo e função da `develop` para facilitar a integração.
2. **Correção de rótulos em 4 testes** (trechos de `437cffbd` e `dfdaba7b`). A tela e as mensagens da `main` já estavam em pt-BR; só os testes estavam defasados. São as falhas que deixam o CI `Verify deploy readiness` **vermelho na `main` desde 01/10** (runs `36896088013`, `37053500569`).

**Não incluídos:**

- `apontamento-somente-planejado` (`61757c26`, `b080c047`, `13c9495c`, `71b9d12d`, `d3ecb3fa`, `bd88ccf8`, `54b23b5f`).
- Manual do Usuário e ajuda contextual (`0b19d7e2` completo, cerca de 40 commits `docs(manual)`, dependência `marked`).
- Textos pt-BR da PR #35 (`79f08bab`, `dfdaba7b`), exceto as 2 linhas de teste acima.
- Metadados 1.9.9 (`ecb26da7`).
- PRs pendentes #36, #27, #21, #7, #4 e branches não aprovadas.

### Prova de que a regra de apontamento só planejado não entrou

```text
grep -rnE "allOpenPlanned|TIME_ENTRY_NOT_PLANNED" server/src src   → nenhum resultado
server/src/modules/operational-planning/planned-activity.service.ts → não existe
isPlannedForCollaborator: já existia na main (production-work-queue.rules.ts), inalterado
git diff c611d10f HEAD -- server/src/modules/conveyors/conveyorAssignments.service.ts → vazio
```

## Gate de privacidade do Kiosk

- `GET /production/me/work-queue` **não envia** `clientName`, `vehicleDescription` nem `licensePlate`. Envia `conveyorCode` como identificador operacional mínimo. O mapeamento é campo a campo, sem espalhar o objeto.
- O teste original "não retorna campos sensíveis no item" **não foi alterado**. Foi criado um bloco com fixture própria e **lista não vazia**:
  - ausência dos campos, inclusive no JSON bruto;
  - isolamento: outro colaborador não recebe o item;
  - sessão inválida retorna 401.
- **Divergência para a homologação:** a caixa "Buscar atividade…" pesquisa atividade, setor, tarefa, nome e código da OS. Ela não pesquisa cliente, veículo nem placa. A busca no backend seria viável, mas exigiria endpoint ou parâmetro novo no Kiosk e consulta a cada tecla. Não era requisito do Kiosk e ficou fora.
- **Achado preexistente, não alterado:** `GET /production/me/time-entry-candidates` ("Outra atividade") já devolve `clientName`, `vehicleLabel` e `plate` na `main`, porque reutiliza o DTO da web. Esta release não muda esse contrato. **Decisão humana:** manter ou restringir em outra atividade.
- Código de OS não libera apontamento. Teste novo: achar a atividade por `OS & atividade` e apontar sem justificativa de exceção continua 422. Com justificativa, 201 para o colaborador da sessão e a OS correta.

## Validação executada

**Ambiente:**

- Windows 11, Node **22.22.0** (zip oficial de nodejs.org, SHA-256 conferido; mesmo major do CI).
- PostgreSQL **18.3** local e **descartável**: cluster novo com `initdb`, porta 55432, `127.0.0.1`, autenticação local.
- Bancos dedicados: `sgp_release_rc` (candidata), `sgp_release_main` (baseline) e `sgp_release_dev` (sonda da `develop`).
- Migrations 0001–0053 e seed oficial. Nenhuma credencial de produção. O serviço PostgreSQL do usuário não foi usado.
- Baseline: worktree destacado em `c611d10f`. Sonda: worktree destacado em `247b6985`, só servidor.

| Comando | Candidata | Baseline `main` |
|---|---|---|
| `npm ci` / `npm --prefix server ci` | 0 / 0 | 0 / 0 |
| `npm run verify:deploy` (receita do CI, sem banco) | **exit 0**: build ok; front 219 arquivos / **1438 ok**; server build ok; operational-planning 170 ok + 19 pulados; work-queue 13 ok; sequence 15 ok | não executado por inteiro; o frontend falha antes do servidor |
| `npx vitest run` (frontend) | 1438 ok / 0 falhas | 1382 ok / **5 falhas** (rótulos `Registar`) |
| `server: npx vitest run` **com banco** | 1280 ok / **6 falhas** / 17 pulados (166 arquivos; o teste novo dos itens 7 e 8 rodou à parte, 2/2) | 1238 ok / **8 falhas** / 17 pulados (161 arquivos) |
| `npx eslint .` (sem `dist/` e `server/dist/`) | 94 erros / 23 avisos | 94 erros / 23 avisos |
| ESLint por arquivo × regra | **0 aumentos** | — |
| `git diff --check c611d10f HEAD` | exit 2: só espaço final em `docs/ai/prompts/kiosk-busca-os-atividade.md` (quebra de linha Markdown do original) | — |
| build: `dist/manual/` | só `colaborador.html`, `gestor-esteira.html` e `img/`; guia byte a byte igual à fonte; **sem** `manual-usuario.html` | — |

### Falhas com banco: preexistentes × regressões

| Teste | Candidata | `main` | Classificação |
|---|---|---|---|
| `env.test` › fallback espera `1.9.4` | falha | falha | preexistente (teste fixo em 1.9.4) |
| `operational-planning.weekly-view.http` › fórmula `=SUM` | falha | falha | preexistente |
| `support-http.integration` ×4 | falha | falha | **ambiente**: `SUPPORT_TICKETS_ENABLED=0`; com `=1`, 5/5 passam nas duas |
| `my-activities-time-entry-candidates` › sem colaborador | passa | falha | corrigida (rótulo de teste) |
| `my-work-queue.service` › sem colaborador | passa | falha | corrigida (rótulo de teste) |

**Regressões introduzidas: nenhuma.**

### As duas falhas novas da auditoria: reproduzidas e resolvidas

1. **Contrato de campos sensíveis do Kiosk.**
   - Com o código de `f639a564`, os testes de contrato falham: o original, o novo de lista não vazia e o unitário de mapeamento (3 falhas, 12 ok).
   - Com `682054ac`: 15/15.
   - Na sonda da `develop`, num banco novo, o teste original **passa** porque a fila da Maria está vazia. Isso confirma que o teste antigo só detecta o problema com dados.
2. **Fixture do teste `&` de "Outra atividade".**
   - Na sonda da `develop` (`247b6985`, banco `sgp_release_dev`), falha com `expected [] to have a length of 1`.
   - Na candidata passa (10/10) **sem** item de plano publicado, porque a regra de planejadas não está incluída.
   - Pelo prompt, a fixture só precisa de `seedPublishedPlanItem` onde a regra existir. **Aplicar essa correção na `develop`** na integração posterior.

### Cobertura específica pedida

| Pedido | Evidência |
|---|---|
| Web: `7070`, `XPTO`, `7070 & XPTO`, `7070 &`, `& XPTO`, espaços, acentos, caixa, sem `&` | `time-entry-candidates-http.integration` e `accent-insensitive-search`, passando com banco |
| Kiosk caixa principal: os mesmos casos, mais outra OS com a mesma atividade | `kioskWorkQueueSearch.test` e `KioskActivityCards.test` |
| Kiosk "Outra atividade": os mesmos casos, outra OS com a mesma atividade, selecionar e apontar | `production-unassigned-time-entries.integration` (10/10) e `production-time-entry-candidates-search.test` (15) |
| Contrato com lista não vazia, sessão inválida, isolamento | `production-work-queue.integration` (bloco novo) |
| Datas em semanas distintas, limite de 92 dias | `my-work-queue-period.integration`, `operational-planning-range.integration` |
| XLSX: abas, fórmulas e cores | `operational-planning-range.integration` (abas, cabeçalho `1F2933`, filtro, congelamento, fórmula de saldo) |
| PDF Retrato/Paisagem multipágina | `conveyorProgressPage.test` (orientação); multipágina só com evidência manual de 07–08/10 sobre código idêntico |
| Histórico de Extra Esteira e justificativas | teste de integração novo (itens 7 e 8) |
| Dashboard após apontamento | `operationalDataEvents.test` (evento); a reconsulta real foi validada manualmente em 08/10 |

O código dos itens 2 a 10 é **idêntico** ao da branch `integration/ajustes-tati-2026-10-07`, validada manualmente em 07–08/10 (ver `ajustes-tati-2026-10-07-integracao-retorno.md`). Nesta rodada não houve teste manual em navegador.

## Contratos `main` → candidata

| Endpoint | Mudança | Compatível |
|---|---|---|
| `GET /me/time-entry-candidates` | `q` com `&` passa a ser esteira/OS × atividade; novos `conveyorQ` e `activityQ` | sim; sem `&`, idêntico |
| `GET /production/me/time-entry-candidates` | mesma regra do `&` | sim |
| `GET /me/work-queue` | `from` e `to` opcionais; resposta ganha `period` e `conveyorCode` no item | sim |
| `GET /production/me/work-queue` | item ganha `conveyorCode` | sim, aditivo, sem dado sensível |
| `GET /operational-planning/period-items` | **novo**, guard de Planejamento | — |
| `GET /operational-planning/export-ai.xlsx` | **novo**, guard de Planejamento | — |
| `GET /my-operational-journey` e jornada gerencial | `recentExtraTimeEntries`; histórico Extra Esteira sem filtro de catálogo excluído | sim |
| Respostas de apontamento por atividade e jornada | `standardJustificationLabel` e `standardJustificationComplement` | sim, aditivo, mesmo público |
| Estático `/manual/*` | **novo**: guias e capturas | — |

### Alertas de performance

- **Período multissemanal:** janela máxima de 92 dias na fila e no planejamento. A fila por período consulta em paralelo cada plano publicado do intervalo e depois cada esteira envolvida. Medir com dados reais.
- **Export IA:** lê o backlog **sem paginação**. Em base grande, medir tempo e memória na homologação.
- **Pesquisa `&`:** usa `translate(lower(...))` nas colunas, o que impede índice. O escopo continua limitado aos candidatos do colaborador. Medir com dados reais.

## Versionamento

- **Proposta, commit isolado `2844996a`:** `1.10.0`, "Ajustes da Tati, Guias Práticos e pesquisa OS & atividade no Kiosk".
- **Critério:** o pacote difere da 1.9.9 da `develop`, e reusar o número criaria dois pacotes diferentes com a mesma versão. Funcionalidade nova compatível justifica subir a versão menor.
- `releaseDate` = 16/10. Ajustar se a publicação for em outro dia.
- Pode ser revertida sem efeito no resto. `env.test` continua esperando `1.9.4` (preexistente, não alterado).

## Plano de homologação (ambiente isolado; nunca banco compartilhado)

Preparação:

- backend e frontend da candidata;
- banco de homologação com cópia anonimizada ou dados reais autorizados;
- perfis **Admin**, **Gestor** e **Colaborador**;
- totem ou navegador da fábrica.

| Perfil | Roteiro |
|---|---|
| Colaborador | **Item 1:** "? Ajuda" mostra só o guia do colaborador, e ele abre com o tema certo. **Item 2:** Apontar horas com `<OS real> & XPTO`, `& XPTO`, `<OS> &` e sem `&`. **Item 4:** Minha fila por período atravessando semanas, com datas invertidas. **Item 6:** Minha jornada só com a data inicial. **Itens 7 e 8:** Extra Esteira e justificativas na jornada. |
| Gestor | **Item 1:** os dois guias. **Item 3:** Evolução, **Gerar PDF Retrato e Paisagem com 3+ esteiras no navegador da fábrica**. **Item 5:** Planejamento por período. **Item 10:** exportar para IA (período e semana) e abrir a **planilha real** no Excel, conferindo 5 abas, fórmulas e cores. **Item 8:** Jornada por colaborador e Apontamento gerencial. **Item 9:** Dashboard atualiza após apontar pelo cabeçalho. |
| Admin | Tudo do gestor e permissões por papel inalteradas. |
| Kiosk | **Comparação web × Kiosk:** caixa "Buscar atividade…" com OS, atividade, `OS & atividade`, acentos e caixa; selecionar e apontar. "Outra atividade" com os mesmos casos e apontamento com justificativa. **Confirmar que cliente, veículo e placa não aparecem** e que buscar por eles na caixa principal não traz resultado. |
| Infra | `GET /manual/colaborador.html` em produção retorna o guia, e não a SPA. Checar no Nginx ou Express estático. |

## Integração posterior com a `develop` (sem perder o que já existe lá)

- Os cherry-picks usaram `-x`. O `git cherry` vai reconhecer os patches de Tati e Kiosk.
- Conflitos esperados e resolução:
  - `HelpMenu.tsx`, `manual-help.ts`, `manual-paths.ts` e `vite-plugin-manual-usuario.ts`: **ficar com a versão da `develop`**, que é um superconjunto.
  - Guias: ficar com a `develop`, ou reaplicar o texto se o manual integrado continuar fora.
  - `production-work-queue.dto/service`, `production.types.ts`, `kioskWorkQueueSearch*`: **ficar com a candidata** (gate de privacidade) e reaplicar `allOpenPlanned` da `develop` no serviço.
  - `production-unassigned…integration`: na `develop`, adicionar `seedPublishedPlanItem` ao caso `&` (regra de planejadas).
  - `app-version.json`: a `develop` deve ir para uma versão maior que 1.10.0.

## Decisões pendentes (humanas)

1. Aceite item a item dos 10 itens da Tati e da pesquisa do Kiosk sobre **esta** candidata. O aceite na `develop` não vale para esta combinação.
2. Aceitar a divergência: Kiosk sem pesquisa por cliente, veículo e placa na caixa principal.
3. Manter ou restringir os dados de cliente, veículo e placa em "Outra atividade" (preexistente).
4. Aprovar ou ajustar a versão 1.10.0.
5. Guias sem Manual do Usuário integrado: confirmar.
6. Gate futuro do prompt, seção 8: política `homol`, backup restaurável, schema de `sgp_prod`, rollback e nova instrução de liberação com PR e SHA.
7. O CI `verify` da `main` estava vermelho e o deploy rodou mesmo assim. Avaliar exigir o `verify` antes do deploy.

## Arquivos desta atividade (além dos cherry-picks)

- Criados:
  - `docs/ai/prompts/release-tati-kiosk-main-2026-10-16.md`;
  - este retorno;
  - `src/components/shell/HelpMenu.tsx` e `.test.tsx`;
  - `src/lib/help/manual-help.ts`, `.test.ts` e `manual-paths.ts`;
  - `vite-plugin-manual-usuario.ts`;
  - `server/src/tests/journey-extra-time-justification-history.integration.test.ts`;
  - 47 PNG em `docs/manual/img/`.
- Alterados:
  - `docs/manual/colaborador.html` e `gestor-esteira.html`;
  - `AppHeader.tsx`, `vite.config.ts`, `tsconfig.node.json`, `app-version.json`;
  - `production-work-queue.dto.ts` e `.service.ts`, `production.types.ts`, `kioskWorkQueueSearch.ts` e `.test.ts`;
  - 6 arquivos de teste;
  - `docs/ai/context/SESSION_CHECKPOINT.md`.
- Removidos: nenhum.
- **Migrations:** nenhuma. Nenhuma aplicada em ambiente compartilhado.

## Git

- Push normal só de `release/tati-kiosk-main-2026-10-16`. PR com base `main`, **aberta e não mergeada**. Sem force-push.
- Worktrees temporários (`sgp-argos-baseline-main-rtk`, `sgp-argos-develop-probe-rtk`), o cluster PostgreSQL descartável e o Node portátil (`sgp-argos-release-tati-kiosk-pgtmp`) são removidos ao final.
- O worktree da candidata (`sgp-argos-release-tati-kiosk`) fica para a homologação.
- Checkout principal (`sgp-argos`, em `develop`, com alterações locais do usuário): **não tocado**.

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
