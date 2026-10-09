# Retorno — kiosk-busca-os-atividade

- **TASK_ID:** `kiosk-busca-os-atividade`
- **Data/hora:** 2026-10-08 22:50 UTC (rodada 1) · 2026-10-09 15:55 UTC (rodada 2)
- **Objetivo:** no Kiosk, alinhar a pesquisa de atividades ao critério "Esteira/OS & atividade" já usado no apontamento (Apontar horas), sem alterar apresentação nem fluxo.
- **Status final:** CONCLUÍDO — as duas pesquisas do Kiosk alinhadas; testes automatizados e validação manual em navegador com API mockada. Validação com banco real fica para a homologação.
- **Branch:** `fix/kiosk-busca-os-atividade` (criada a partir de `origin/develop`)
- **SHA inicial (base):** `a4a3d5d636164dba020498397a65f6f2e66e280e` (tip de `origin/develop` após `git fetch --prune`; igual à base conhecida)
- **Commits:** `f4d38a42` (rodada 1 — "Outra atividade"), `ba9adf06` (docs), e o commit da rodada 2 (caixa "Buscar atividade…") imediatamente após `ba9adf06` — o hash final é informado na resposta da sessão (um arquivo não pode conter o hash do próprio commit).

## Governança lida

`AGENTS.md`, `CLAUDE.md`, `docs/ai/context/PROJECT_CONTEXT.md`, `docs/ai/context/SESSION_CHECKPOINT.md` — todos existentes.

## Referência (apontamento — "Apontar horas")

- UI: `src/features/shell/QuickTimeEntryDrawer.tsx` — campo único, placeholder "Esteira & atividade (ex.: 7070 & XPTO)" → `GET /api/v1/me/time-entry-candidates?q=…`.
- Regra (backend):
  - `server/src/shared/accentInsensitiveSearch.ts` → `parseConveyorActivitySearch` / `foldSearchText`: `q` com `&` → esquerda = esteira/OS, direita = nome da atividade; minúsculas, sem acentos, espaços colapsados; lados vazios ignorados.
  - `server/src/modules/my-activities/my-activities.repository.ts` → `scopedCandidateSearchSql`: termo da esteira casa nome, código, cliente, veículo e placa; termo da atividade casa só `step.name`; colunas dobradas com `sqlFold`.
  - Sem `&`: pesquisa livre `ILIKE` (sem diferenciar caixa; sensível a acento) em esteira (nome, código, cliente, veículo, placa), setor e atividade.

## Rodada 1 — "Outra atividade" (candidatos)

- **Diagnóstico:** `KioskOutraAtividadeFlow.tsx` → `GET /api/v1/production/me/time-entry-candidates`; o controller de produção chamava o mesmo serviço da referência, mas passava `q` cru (sem o parse do `&`). O commit `438f8a00` (que criou a pesquisa `&`) registra "Kiosk não alterado".
- **Correção:** `resolveCandidateSearchTerms` extraída sem alteração para `server/src/modules/my-activities/time-entry-candidates.search.ts` e usada pelos dois controllers. Produção passa a aceitar também `conveyorQ`/`activityQ` opcionais, como a referência.

## Rodada 2 — caixa "Buscar atividade…" da tela principal (decisão humana: "era nessa caixa também")

- **Diagnóstico:** `KioskActivityCards.tsx` filtrava a fila planejada no navegador só por atividade, setor e tarefa. A fila (`GET /production/me/work-queue`) não trazia código da OS; o serviço base (`my-work-queue`) já lia cliente/veículo/placa, mas a fila de produção os descartava.
- **Backend (aditivo, retrocompatível):**
  - `my-work-queue.repository.ts`: `cv.code AS conveyor_code` na consulta `listMyWorkQueueRows`;
  - `my-work-queue.dto.ts`/`.service.ts`: `conveyorCode` (opcional) no item;
  - `production-work-queue.dto.ts`/`.service.ts`: item de produção passa a expor `conveyorCode`, `clientName`, `vehicleDescription`, `licensePlate`.
- **Frontend:**
  - nova função pura `src/domain/production/kioskWorkQueueSearch.ts` (`filterKioskWorkQueueBySearch`, `parseKioskConveyorActivitySearch`) que espelha a regra do backend acima (mesmo parse do `&`, mesma dobra de acentos/caixa, mesmos campos). O backend e o frontend são pacotes separados, por isso a regra não pôde ser importada diretamente; a função cita as fontes e os testes reproduzem os mesmos exemplos do teste de integração da referência;
  - sem `&`: mantém exatamente o que já funcionava (atividade, setor, tarefa — sem diferenciar caixa) e acrescenta os campos da esteira da referência (nome, código, cliente, veículo, placa);
  - `KioskActivityCards.tsx`: só o `useMemo` do filtro passou a chamar a função. Markup, textos, cards, placeholder, ordem, seleção e navegação inalterados;
  - `production.types.ts`: campos novos opcionais no item da fila.
- **Divergência consciente:** a tarefa (`taskTitle`) segue pesquisável no modo livre, porque o critério de aceite exige que pesquisas por atividade continuem encontrando os mesmos itens de antes (a referência não pesquisa tarefa). No modo `&`, o comportamento é idêntico ao da referência.

## Arquivos

Rodada 1:
- Criado: `server/src/modules/my-activities/time-entry-candidates.search.ts`
- Alterado: `server/src/modules/my-activities/my-activities.controller.ts` (só move a função)
- Alterado: `server/src/modules/production/production-time-entry-candidates.controller.ts`
- Criado: `server/src/tests/production-time-entry-candidates-search.test.ts`
- Alterado: `server/src/tests/production-unassigned-time-entries.integration.test.ts` (caso `&`, requer banco)

Rodada 2:
- Alterado: `server/src/modules/my-work-queue/my-work-queue.repository.ts`, `my-work-queue.dto.ts`, `my-work-queue.service.ts`
- Alterado: `server/src/modules/production/production-work-queue.dto.ts`, `production-work-queue.service.ts`
- Alterado: `server/src/tests/production-work-queue.vigente.test.ts` (novo caso de mapeamento)
- Criado: `src/domain/production/kioskWorkQueueSearch.ts`, `src/domain/production/kioskWorkQueueSearch.test.ts`
- Alterado: `src/domain/production/production.types.ts`, `src/features/kiosk/KioskActivityCards.tsx`, `src/features/kiosk/KioskActivityCards.test.tsx`

Docs: `docs/ai/prompts/kiosk-busca-os-atividade.md`, este retorno.

## Migrations

Nenhuma. Sem alteração de schema, seed, `.env`. Nenhum endpoint novo; dois endpoints recebem campos novos na resposta (aditivos).

## Validação executada

| Comando | Resultado |
|---|---|
| `server: npx vitest run src/tests/production-time-entry-candidates-search.test.ts` | 15/15 (rodada 1; com o controller antigo: 9 falham — todos os casos com `&` —, 6 passam) |
| `server: npx vitest run src/tests/production-work-queue.vigente.test.ts` | 2/2 |
| `server: npx tsc -p tsconfig.json --noEmit` | exit 0 |
| `server: npm test` | 854 passaram, 442 pulados (sem banco), **3 falharam** — as mesmas 3 falham na base sem alterações (`env.test.ts`, `my-activities-time-entry-candidates.test.ts`, `my-work-queue.service.test.ts`) |
| `npx vitest run src/domain/production/kioskWorkQueueSearch.test.ts` | 14/14 |
| `npx vitest run src/features/kiosk/KioskActivityCards.test.tsx` | 15/15; com o filtro antigo: os 2 casos de OS falham, o de atividade passa |
| `npx vitest run` (frontend completo) | 1445 passaram, **5 falharam** — as mesmas 5 falham na base sem alterações (`ApontamentoPage.test.tsx`, `ApontamentoGestorPage.test.tsx`, casos de "data de realização") |
| `npx eslint` nos arquivos alterados | exit 0 |
| `npm run build` (tsc -b + vite) | exit 0 |

### Validação manual (Chromium + Playwright, API interceptada, sem banco)

Vite em `VITE_DATA_MODE=real`; respostas de `/production/*` mockadas no formato do backend novo; fila com 4 itens: OS 7070 ("Costura do tecido XPTO", "Revestir banco do couro") e OS 9090 ("Costura do tecido XPTO", "Lixar estrutura"); tarefa "Bancos dianteiros", setor "Tapeçaria".

| Pesquisa na caixa | Resultado |
|---|---|
| `costura` | 2 (as duas "Costura…") |
| `Lixar` | 1 |
| `7070` / `9090` / `cliente alfa` | 2 / 2 / 2 |
| `7070 & XPTO` | 1 (Costura… da 7070) |
| `  7070   &   xptó  ` | 1 |
| `7070&BANCO` | 1 (Revestir banco do couro) |
| `7070 &` | 2 |
| `& costura` | 2 |
| `7070 & dianteiros` | 0 — "Nenhuma atividade encontrada para essa busca." |
| `tapecaria` (sem `&`) | 0 (sensível a acento, como antes) |

Seleção + apontamento: com `9090 & lixar`, 15 min → `POST /production/time-entries` com `conveyorId: cv-9090`, `stepNodeId: step-4`, `minutes: 15`. Os cards ficaram visualmente iguais (capturas conferidas; nenhum dado novo é exibido).

## Ressalvas / pendências

- Validação com banco real não executada (o prompt proíbe rodar migrations nesta sessão). Testes de integração novos ficam `skipIf(!hasDb)`; rodar na homologação.
- Se o frontend novo for publicado antes do backend, a busca por OS na caixa principal só encontra pelo nome da esteira até o backend subir (sem erro).
- 3 falhas pré-existentes no servidor e 5 no frontend (acima), não relacionadas.

## Próximo passo recomendado

Homologar localmente/no ambiente de homologação conforme o roteiro: caixa "Buscar atividade…" e "Outra atividade" com `OS`, `atividade` e `OS & atividade`, comparando com "Apontar horas"; depois apontar uma atividade filtrada.

## Git

- Push normal para `origin/fix/kiosk-busca-os-atividade`. Sem PR, sem merge em `develop`.
- `git status` final: limpo após o commit.

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
