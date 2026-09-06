# Especificação — Consolidação Kiosk: zero-scroll + Outra Atividade

> Spec escrita a partir de diretriz humana explícita (não reabrir decisões de escopo/branch).
> Branch: `feature/kiosk-consolidacao-zero-scroll-outra-atividade`, criada a partir de `origin/develop` no SHA `5dd34f24c924709cf2174a13859813103556c3de`.
> Mapeamento de contexto verificado diretamente por leitura de código (não apenas relatório de subagente — houve uma correção de um erro factual do context-reader sobre divergência main/develop, verificado com `git diff`/`git show`).

## Decisão de branch (não reabrir)

- `main` **não** deve ser tocada. `main` está 15 commits atrás de `develop`, mas isso é intencional segundo diretriz humana — `main` representa uma base anterior.
- **Achado verificado (corrige suposição inicial):** `src/features/kiosk/KioskActivityCard.tsx` e `src/domain/production/kioskActivityCardLogic.ts` são **byte-idênticos** entre `main` e `develop`, e idênticos à base sobre a qual a PR #21 (`claude/kiosk-redesign-zero-scroll-j4jdyh`) foi construída. Ou seja: o redesign zero-scroll da PR #21 (transformação de `KioskActivityCard.tsx` em card compacto + `KioskRegisterSheet.tsx`) parte exatamente da mesma base que existe hoje em `develop` — pode ser reconstruído aqui com fidelidade alta ao que já foi validado na PR #21 (incluindo o fix do estado de sucesso em tela cheia via `createPortal`, já testado visualmente naquela PR).
- A **única** divergência real de kiosk entre `main`/PR#21 e `develop` está em `src/features/kiosk/KioskActivityCards.tsx` (59 linhas: botão "+ Extra", integração de toast) e nos arquivos novos `KioskExtraActivityModal.tsx` (322 linhas) + `kioskExtraActivityModalLogic.ts` (45 linhas) — 100% ausentes de `main`/PR#21.
- Portanto: **não fazer cherry-pick nem merge da PR #21** (ela não tem o "+Extra"/toast e seria regressão se aplicada por cima). Reconstruir manualmente o redesign sobre o `KioskActivityCards.tsx` ATUAL de `develop` (mostrado abaixo), preservando "+Extra"/toast intactos.

## Estado atual verificado de `develop` (não alterar exceto onde a spec pede)

### `src/features/kiosk/KioskActivityCards.tsx` (372 linhas, lido integralmente)

- Header (linhas 114-201): avatar+nome+contador (`{filtered.length} atividade(s)`), busca (`input type="search"`, `w-36 sm:w-48`), alternador carrossel/lista, **botão "+ Extra"** (linhas 182-190, abre `KioskExtraActivityModal`), botão "Sair".
- Toast: `ToastState = {id, message, variant} | null` (linha 29), `pushToast`/`dismissToast` (linhas 46-51), renderizado condicionalmente (linhas 361-369) via `<SgpToast fixed .../>`.
- `handleExtraActivitySuccess` (linhas 96-98): **só** dispara toast (`KIOSK_ACTIVITY_TOAST.extraEntrySaved`), **não recarrega a fila** — comportamento testado explicitamente em `KioskActivityCards.test.tsx` (`expect(getProductionWorkQueue).not.toHaveBeenCalled()`). Isso é correto para "+Extra" (não afeta assignments/fila) e **não deve ser copiado** para "Outra Atividade" (que aponta em step real e deve recarregar a fila — ver seção "Outra Atividade" abaixo).
- `reloadQueue`/`handleCardSuccess` (linhas 80-94): usados pelo apontamento normal do `KioskActivityCard`.
- Modo carrossel (linhas 212-310): track com `translateX`, cada slide `<div className="h-full min-w-full overflow-y-auto">` (linha 249-252) renderizando `KioskActivityCard` inteiro (fonte do scroll a eliminar), navegação com setas/dots (linhas 262-309), swipe (linhas 100-108).
- Modo lista (linhas 311-353): **fora de escopo do zero-scroll** (mesma decisão já tomada na PR #21 — não tem o mesmo sintoma de scroll por item).
- `KioskExtraActivityModal` (linhas 355-359) e `SgpToast` (linhas 361-369) renderizados como irmãos do conteúdo principal, dentro do container raiz `<div className="flex flex-1 flex-col overflow-hidden">`.

### `src/features/kiosk/KioskActivityCard.tsx` (idêntico entre main/develop/base da PR#21)

Já validado e redesenhado na PR #21. Reaproveitar a mesma transformação:
- `ProgressRing` (r=28, viewBox 72, compacto) — igual ao que a PR #21 já fez.
- Presets `[15,30,45,60]` em grid 2x2 dentro do sheet (não mais `flex flex-wrap` no card).
- Slider `sessionPct`, `JustificationSelect`, toggle "Concluir atividade ao registrar", diálogo `confirmLowPct`, alertas de fora-de-sequência/tempo-excedido — todos migram para dentro de `KioskRegisterSheet.tsx` (novo), exatamente como na PR #21.
- Estado de sucesso: **usar a versão já corrigida da PR #21** (commit `d9032b6`) — `createPortal` de overlay `fixed inset-0 z-40 bg-black/80 backdrop-blur-sm` cobrindo a tela inteira, não a versão pré-fix que ficava presa no card compacto. Não repetir o bug que já foi encontrado e corrigido.
- Sheet montado via `createPortal(<KioskRegisterSheet .../>, document.body)` a partir de `KioskActivityCard.tsx`, nunca de dentro do próprio `KioskRegisterSheet` (mesma decisão técnica da PR #21, por causa do `transform: translateX(...)` do track do carrossel criar um novo containing block para `position: fixed`).
- `KioskActivityCard` ganha prop `onSheetOpenChange?: (open: boolean) => void` para permitir que `KioskActivityCards` trave a navegação enquanto o sheet estiver aberto.

## Escopo desta consolidação

### 1. Redesign zero-scroll (card compacto + `KioskRegisterSheet`)

Idêntico em espírito à PR #21, adaptado ao `KioskActivityCards.tsx` atual (com +Extra/toast preservados):

- **CRIAR** `src/features/kiosk/KioskRegisterSheet.tsx` — componente apresentacional puro (sem `createPortal` interno, para permanecer testável via `renderToStaticMarkup`), com o mesmo conteúdo que a PR #21 já validou: header do sheet, grid 2x2 de presets (`grid grid-cols-2 gap-2`, botões ≥50px — usar `min-h-[52px]`, não `min-h-12`=48px), input customizado, slider de evolução, alertas de fora-de-sequência/tempo-excedido, `JustificationSelect` condicional, toggle de conclusão, erro inline, botão de submit, overlay `confirmLowPct`.
- **MODIFICAR** `src/features/kiosk/KioskActivityCard.tsx` — compactar o card (badges curtos + `ProgressRing` + metadados ficam visíveis; presets/slider/alertas grandes/justificativa/toggle/submit migram para o sheet), um único CTA que abre o sheet, `createPortal` do sheet e do estado de sucesso (full-screen, já com o fix da PR #21 aplicado desde o início).
- **MODIFICAR** `src/features/kiosk/KioskActivityCards.tsx`:
  - Header: reorganizar para caber em uma linha nas resoluções 1024×768 / 1280×1024 / 1920×1080, **preservando todos os controles atuais, incluindo "+ Extra"** — e adicionando o novo botão "+ Outra" (ver seção 2).
  - Wrapper do slide do carrossel (linha 251) mantém `overflow-y-auto` como rede de segurança (não trocar por `overflow-hidden` cego).
  - Adicionar estado `isAnySheetOpen` (recebido via `onSheetOpenChange` de `KioskActivityCard`, usado **apenas no modo carrossel**) que desabilita `prev`/`next`/dots/swipe enquanto qualquer sheet estiver aberto.
  - **Não tocar** no modo lista, nem no fluxo `KioskExtraActivityModal`/toast do "+Extra" além do necessário para acomodar o novo botão "+ Outra" ao lado dele.
- **CRIAR** testes `src/features/kiosk/KioskActivityCard.test.ts` e `src/features/kiosk/KioskRegisterSheet.test.ts` (padrão `renderToStaticMarkup`, sem `@testing-library/react` — ver `src/features/esteiras/ConveyorHealthAnalysisCard.test.ts` como referência de padrão do projeto), cobrindo os mesmos critérios já usados na PR #21 (alertas condicionais, disabled do submit, grid 2x2, ausência de alertas/presets no card compacto, texto do estado de sucesso preservado).
- **NÃO alterar** `src/domain/production/kioskActivityCardLogic.ts` nem `src/domain/production/kioskWorkQueueUi.ts`.
- **NÃO alterar** `src/features/kiosk/KioskExtraActivityModal.tsx`, `kioskExtraActivityModalLogic.ts`, nem seus testes — devem continuar passando sem modificação.
- **NÃO tocar** `src/features/shell/QuickTimeEntryDrawer.tsx` ou outros componentes de UI de `src/features/shell/` (o import de tipo/lógica pura de `../shell/quickTimeEntryDrawerLogic` já existente pode continuar).

### 2. Feature nova: "Outra Atividade"

Referência principal: patch `KIOSK_CONSOLIDACAO_001ab531.patch` (Codex), em `/tmp/claude-0/-home-user-sgp/ee59ed87-414a-583e-bd51-aa277194f924/scratchpad/codex-consolidacao.patch` — usar como **referência de abordagem**, não aplicar via `git apply` (o patch foi feito contra um `KioskActivityCards.tsx` sem o redesign zero-scroll desta spec; vai conflitar). Reimplementar manualmente adaptando ao código final desta consolidação.

**Distinção importante:** "Outra Atividade" é uma feature **diferente** de "+ Extra" (que é apontamento avulso contra um catálogo de descrições genéricas, sem vínculo com esteira/step — módulo `production-extra-time-entries.*`, não tocar). "Outra Atividade" é apontar tempo numa atividade (esteira/step) **real e existente**, mas fora da alocação atual do colaborador — precisa de busca, seleção, e justificativa obrigatória.

#### Frontend

- **CRIAR** `src/features/kiosk/KioskOutraAtividadeFlow.tsx` — fluxo full-screen (`fixed inset-0 z-[100]`, mesma camada de empilhamento que `KioskExtraActivityModal`), fases `form → confirm → success`:
  - Busca por nome/código a partir de **2 caracteres**, debounce (~300ms), listando **apenas** atividades fora da alocação atual (`isAssignedToMe === false`).
  - Seleção de candidato → minutos (presets + custom) → `JustificationSelect` (obrigatória) → complemento quando aplicável (mesmo padrão de `needsOperationalJustification`/`validateJustificationSelectValue` já usado no projeto) → tela de revisão/confirmação antes do envio → submit → tela de sucesso (~3s) → fecha.
  - Se o candidato estiver fora de sequência (`candidateNeedsOutOfSequenceJustification`), reaproveitar a mesma justificativa informada para cobrir a exceção de sequência (mesmo padrão do patch de referência) — não pedir duas justificativas separadas.
  - Reaproveitar `buildTimeEntryPayload`, `candidateNeedsOutOfSequenceJustification`, `emptyJustificationValue`, `JustificationFieldValue` de `src/features/shell/quickTimeEntryDrawerLogic.ts` (já usados por `KioskActivityCard.tsx`, dependência cross-feature pré-existente e aceita — não expandir para outros componentes de UI de `shell/`).
  - Tipo `TimeEntryCandidateItem` de `src/domain/my-activities/my-activities.types.ts` (já existe, confirmado com todos os campos necessários).
- **MODIFICAR** `src/features/kiosk/KioskActivityCards.tsx`:
  - Adicionar botão "+ Outra" ao lado de "+ Extra" no header (ação separada, rótulo/título distintos — ex. `title="Registrar atividade fora da sua alocação"`).
  - Novo estado `otherActivityOpen`, renderizar `<KioskOutraAtividadeFlow collaborator={...} onClose={...} onSuccess={...} />` como irmão de `KioskExtraActivityModal`.
  - **Diferente do "+Extra"**: o `onSuccess` de "Outra Atividade" deve **recarregar a fila** (`reloadQueue()`) além de mostrar o toast — porque, ao contrário do "+Extra" (catálogo genérico sem vínculo), "Outra Atividade" aponta tempo real num step existente e pode alterar o estado/workload desse step. Usar uma nova entrada em `KIOSK_ACTIVITY_TOAST` (ou constante equivalente) com texto próprio (ex. "Apontamento em outra atividade registrado com sucesso.") — não reaproveitar `extraEntrySaved` (mensagens diferentes, para não confundir o operador sobre qual ação disparou o toast).
- **MODIFICAR** `src/services/production/productionApiService.ts` — adicionar `listProductionTimeEntryCandidates(options)` e `createProductionUnassignedTimeEntry(payload)`, análogos ao que o patch de referência propõe, apontando para as rotas novas (seção backend abaixo).
- **MODIFICAR** `src/domain/production/production.types.ts` — adicionar `ProductionUnassignedTimeEntryPayload` (mesmos campos do patch de referência).
- **CRIAR/AMPLIAR** testes cobrindo: `productionApiService` (novas funções), `KioskOutraAtividadeFlow` (estrutura via `renderToStaticMarkup` quando possível; funções de validação isoladas testáveis diretamente), e `KioskActivityCards` (novo botão presente, toast com texto próprio, reload de fila é chamado — ao contrário do "+Extra").

#### Backend

**Achado crítico já verificado (não redescobrir):** `entry_origin = 'UNASSIGNED_EXCEPTION'` **já existe** no schema do banco (`server/migrations/0032_conveyor_time_entry_exception_origin.sql`, `CHECK (entry_origin IN ('ASSIGNED', 'UNASSIGNED_EXCEPTION'))`) e no tipo TypeScript de `conveyorAssignments.service.ts` (`CreateTimeEntryInput.entryOrigin`). **Não é necessária nenhuma migration nova para esta feature.** Se durante a implementação surgir qualquer necessidade de alterar schema/migration, **parar e reportar antes de prosseguir** (diretriz explícita do usuário) — não criar migration nesta entrega.

- **CRIAR** `server/src/modules/production/production-time-entry-candidates.controller.ts` — endpoint `GET /production/me/time-entry-candidates`, autenticado via `requireProductionAuth()` + `requireProductionPinChanged()` (não o padrão JWT de `my-activities`). Pode reaproveitar diretamente `timeEntryCandidatesQuerySchema` e `serviceListTimeEntryCandidates` de `server/src/modules/my-activities/` (já existem, já suportam `collaboratorId` como parâmetro direto e `includeUnassigned`) — só resolvendo `collaboratorId` a partir de `req.productionSession!.collaboratorId` em vez de `req.authUser`. Ver patch de referência para o formato do controller (é praticamente reuso direto).
- **CRIAR** `server/src/modules/production/production-unassigned-time-entries.controller.ts` + `.service.ts` — endpoint `POST /production/time-entries/unassigned-exception`, mesma auth. O serviço deve:
  - Validar que o node é um step da esteira (`assertNodeIsStepForConveyor`).
  - Analisar sequência (`serviceAnalyzeConveyorActivitySequence`) e exigir justificativa de fora-de-sequência quando aplicável (`resolveTimeEntryJustification`, já usado no projeto).
  - Tentar resolver um `assigneeId` existente para o colaborador nesse step (`findAssigneeIdForStepAndCollaborator`); se encontrado, registrar como `entryOrigin: 'ASSIGNED'` (via `serviceCreateConveyorTimeEntry`); se não encontrado, exigir justificativa de exceção (obrigatória, catálogo padronizado) e registrar como `entryOrigin: 'UNASSIGNED_EXCEPTION'`.
  - **Decisão de implementação a verificar pelo implementador:** o patch de referência inclui um branch que delega para `serviceCreateConveyorTimeEntryForAppUser` quando existe `appUserId` vinculado ao colaborador. O módulo `production` (kiosk/PIN) hoje opera diretamente sobre `collaboratorId` de sessão, sem esse desvio (ver `production-time-entries.service.ts` existente, que não checa `appUserId`). Avaliar se esse branch é necessário para este fluxo; se não houver justificativa clara de negócio para ele, **omitir** e seguir direto pelo caminho `collaboratorId`-based, por consistência com o resto do módulo `production`. Se optar por mantê-lo, documentar o motivo no relatório final.
  - Body validado por novo schema `productionUnassignedTimeEntryBodySchema` em `server/src/modules/production/production-time-entries.schemas.ts` (adicionar, não substituir o schema existente `productionTimeEntryBodySchema`).
- **MODIFICAR** `server/src/modules/production/production.routes.ts` — registrar as duas rotas novas, **sem alterar nem remover nenhuma rota existente** (incluindo as de "+Extra": `GET/POST /production/extra-time-entries*`).
- **CRIAR/AMPLIAR** testes backend: schema (`production-time-entries.schemas.test.ts` — adicionar casos, não remover os existentes), e testes de integração para os dois novos endpoints (candidatos e apontamento não-alocado), cobrindo: sucesso com `assigneeId` resolvido (`ASSIGNED`), sucesso sem `assigneeId` com justificativa (`UNASSIGNED_EXCEPTION`), rejeição sem justificativa, rejeição de node que não é step da esteira, rejeição de minutos ≤ 0.

## Critérios de aceite

### Testáveis via Vitest (frontend) / testes de integração (backend)

- [ ] Todos os testes já existentes continuam passando sem modificação de asserção: `KioskActivityCards.test.tsx` (toast do "+Extra", sem reload, timing 4200ms), `KioskExtraActivityModal.test.tsx`, `kioskActivityCardLogic.test.ts`, `kioskWorkQueueUi.test.ts`, `production-extra-time-entries.*`, `my-activities-time-entry-candidates.test.ts`, `conveyor-assignments-http.integration.test.ts`.
- [ ] Novo: `KioskRegisterSheet.test.ts` — mesmos critérios da PR #21 (alertas condicionais, `JustificationSelect` condicional, toggle condicional, disabled do submit, grid 2x2 com botões ≥50px).
- [ ] Novo: `KioskActivityCard.test.ts` — card compacto sem alertas/presets/slider quando `canTrackTime=true`; bloco inalterado quando `canTrackTime=false`; texto do estado de sucesso preservado.
- [ ] Novo: testes de `productionApiService` para `listProductionTimeEntryCandidates`/`createProductionUnassignedTimeEntry` (rota e payload corretos).
- [ ] Novo: testes de schema backend para `productionUnassignedTimeEntryBodySchema` (aceita com justificativa, rejeita minutos ≤ 0, rejeita sem justificativa quando exigida).
- [ ] Novo: teste de integração backend cobrindo os dois caminhos (`ASSIGNED` e `UNASSIGNED_EXCEPTION`) do novo endpoint de apontamento.
- [ ] Diff não altera `kioskActivityCardLogic.ts`, `kioskWorkQueueUi.ts`, `KioskExtraActivityModal.tsx`, `kioskExtraActivityModalLogic.ts`.
- [ ] `git diff` não contém nenhuma migration nova em `server/migrations/`.

### Validação manual (fora do alcance de Vitest, registrar como pendente)

- [ ] Zero-scroll real em 1024×768 / 1280×1024 / 1920×1080 no modo carrossel, com "+Extra" e "+Outra" ambos visíveis no header em uma linha só.
- [ ] Sheet ancorado corretamente ao viewport (não deslocado pelo `transform` do carrossel).
- [ ] Navegação do carrossel travada com qualquer sheet/modal aberto (redesign sheet, "+Extra", "+Outra").
- [ ] Fluxo "Outra Atividade" ponta a ponta: busca ≥2 caracteres, seleção, minutos, justificativa obrigatória, revisão, confirmação, toast de sucesso com texto próprio, fila recarregada.
- [ ] Fluxo "+Extra" continua idêntico ao atual (toast próprio, sem reload).

## Fora de escopo

- Modo lista do kiosk.
- `KioskCollaboratorGrid.tsx`, `KioskPinPad.tsx`, `KioskChangePin.tsx`, `KioskPage.tsx`.
- Qualquer migration de banco (parar e reportar se necessidade surgir).
- Merge/push para `main`, `develop` ou `homol`.
- Fechar ou alterar a PR #21 (permanece aberta e intocada).
- Alterar rotas/endpoints existentes de "+Extra" ou apontamento normal de produção.

## Gates obrigatórios antes de reportar conclusão

1. Testes direcionados de kiosk (frontend).
2. Testes direcionados de produção (backend).
3. `npm run verify:frontend`.
4. `npm run verify:server`.
5. `npm run build`.
6. `git diff --check` (sem espaços em branco/conflitos residuais).
7. Lint — separar explicitamente falhas pré-existentes (baseline) de regressões novas introduzidas por esta mudança.

Nenhum merge em `develop`/`main`/`homol` até validação funcional humana.
