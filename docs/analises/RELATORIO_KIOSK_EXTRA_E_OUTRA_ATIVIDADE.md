# Relatório — Kiosk Extra esteira / Outra atividade

STATUS_FINAL: CONCLUÍDO — PASSA COM RESSALVAS (revisão de teste independente)

BRANCH: `claude/kiosk-extra-esteira-outra-atividade-9qo8bn`

BASE_ORIGIN_MAIN: `6b768c852a18b7428e3dadf761bad7e35c1d61ef`

COMMIT_FINAL: `8e3488b`

PUSH_REALIZADO: SIM (`origin/claude/kiosk-extra-esteira-outra-atividade-9qo8bn`)

> Nota sobre nome de branch: a demanda sugeria criar `feature/kiosk-extra-esteira-outra-atividade`
> a partir de `origin/main`. A branch usada foi a designada pela plataforma para esta sessão
> (`claude/kiosk-extra-esteira-outra-atividade-9qo8bn`), que já estava exatamente no SHA de
> `origin/main` no início do trabalho (`6b768c8`), sem nenhum commit próprio anterior — ou
> seja, tecnicamente equivalente a partir limpo de `origin/main`, só com outro nome de branch.

## Implementação

### Extra esteira
- Botão `+ Extra esteira` no header de `KioskActivityCards.tsx`, entre o alternador
  Carrossel/Lista e o botão `Sair`. Abre direto `KioskExtraEsteiraFlow.tsx` (overlay
  fullscreen, `role="dialog"`), sem tela intermediária.
- Formulário: select de descrição (catálogo existente, `Selecione uma descrição...` sempre
  como primeira opção, nunca pré-selecionada), minutos (atalhos 15/30/45/60 + entrada manual,
  `>= 1` obrigatório), observação opcional (máx. 500, reaproveita o limite já usado no fluxo
  web).
- Revisão antes de gravar (colaborador, tipo, descrição, minutos, observação) com
  `Voltar`/`Confirmar apontamento`; botão desabilitado durante submissão (sem duplo envio).
- Sucesso: tela de confirmação inequívoca, depois retorna ao Kiosk sem logout, mantendo a
  sessão. Erro de persistência mantém o overlay aberto com banner `role="alert"`, nunca mostra
  a tela de sucesso.
- Grava em `operational_extra_time_entries` com `origin='PRODUCTION'`,
  `created_by_collaborator_id` = colaborador da sessão do Kiosk, `created_by_user_id = NULL`
  (verificado por teste de integração direto no banco).

### Outra atividade
- Botão `+ Outra atividade` no mesmo header. Abre direto `KioskOutraAtividadeFlow.tsx`
  (overlay fullscreen, `role="dialog"`).
- Busca por código/nome (mínimo 2 caracteres, debounce) reaproveitando o endpoint já existente
  de candidatos de apontamento (`GET /api/v1/me/time-entry-candidates`, exposto para o Kiosk
  via `GET /api/v1/production/me/time-entry-candidates`), com `includeUnassigned=true`.
- Seleção do candidato mostra atividade, código, esteira, tarefa e setor.
- Minutos obrigatórios (`>= 1`, mesmos atalhos 15/30/45/60).
- Justificativa: reaproveita integralmente `JustificationSelect` (`channel="production"`) e o
  catálogo/regra já existentes — exigida quando o colaborador não está alocado à atividade
  e/ou quando a atividade está fora da sequência recomendada; complemento exigido quando a
  justificativa escolhida do catálogo assim exigir. Nenhuma lógica de justificativa nova foi
  criada.
- Revisão antes de gravar (colaborador, atividade selecionada com contexto, minutos,
  justificativa(s)/complemento) com `Voltar`/`Confirmar apontamento`, sem duplo envio.
- Sucesso inequívoco, retorna ao Kiosk sem logout.
- **Não** altera responsável da atividade, planejamento, equipe, matriz ou estrutura da
  esteira — grava apenas em `conveyor_time_entries` com `entry_origin='UNASSIGNED_EXCEPTION'`
  quando o colaborador não tinha alocação (verificado por teste de integração: contagem de
  `conveyor_node_assignees` não muda antes/depois do apontamento).

## Backend

### Endpoints adicionados (todos sob `requireProductionAuth()`, a maioria também
`requireProductionPinChanged()` — mesmo padrão das rotas de produção já existentes; nenhum
permission code novo, nenhum rate-limit novo)
- `GET /api/v1/production/extra-time-entries/descriptions`
- `GET /api/v1/production/extra-time-entries`
- `POST /api/v1/production/extra-time-entries`
- `GET /api/v1/production/me/time-entry-candidates`
- `POST /api/v1/production/time-entries/unassigned-exception`

### Endpoints reutilizados sem alteração
- `GET /api/v1/production/time-entry-justifications` (catálogo de justificativas, já existia).

### Services/repositories
- `production-extra-time-entries.{schemas,repository,service,controller}.ts` (novos) —
  o repository **reexporta** (não duplica SQL) `listActiveExtraTimeEntryDescriptions`,
  `descriptionExistsActive`, `listRecentExtraTimeEntries` de
  `my-activities/extra-time-entries.repository.ts` (já eram funções puras, recebendo
  `collaboratorId` direto, sem depender de `app_users`); adiciona só
  `insertProductionExtraTimeEntry`.
- `production-unassigned-time-entries.{service,controller}.ts` (novos) — reaproveita
  `assertNodeIsStepForConveyor`, `serviceAnalyzeConveyorActivitySequence`,
  `findAssigneeIdForStepAndCollaborator` e, principalmente,
  `serviceCreateConveyorTimeEntry` (todos de `conveyors/conveyorAssignments.service.ts`, já
  usados pelo fluxo web) — toda a regra de justificativa/sequência é resolvida lá dentro, sem
  duplicação. Nunca chama `resolveProductionStepAssigneeId` nem cria alocação.
- `production-time-entry-candidates.controller.ts` (novo) — wrapper fino sobre
  `serviceListTimeEntryCandidates` (`my-activities.service.ts`, já existente), resolvendo o
  colaborador direto da sessão de produção em vez de `app_users`.
- `production-time-entries.schemas.ts` — apenas **adicionado**
  `productionUnassignedTimeEntryBodySchema` (schema do apontamento normal já existente não foi
  tocado).
- `production-time-entries.service.ts` (apontamento normal, já existente) — **não alterado**,
  confirmado por revisão independente.
- `production.routes.ts` — 5 rotas novas adicionadas ao final da função `productionRouter`,
  mesmo padrão das existentes.

Em todos os endpoints novos, o colaborador vem exclusivamente de
`req.productionSession.collaboratorId` — nenhum aceita `collaboratorId` do body (confirmado
por revisão independente).

## Banco

MIGRATION_NECESSARIA: SIM

- `server/migrations/0052_operational_extra_time_entries_production_origin.sql` — única
  migration desta entrega. Necessária porque `operational_extra_time_entries.created_by_user_id`
  era `NOT NULL REFERENCES app_users(id)` (migration `0031`) e o Kiosk não tem `app_users`, só
  `collaboratorId` de sessão de produção — sem essa alteração de schema é impossível gravar um
  apontamento extra esteira originado do Kiosk. A migration:
  - torna `created_by_user_id` opcional (`DROP NOT NULL`);
  - adiciona `created_by_collaborator_id uuid NULL REFERENCES collaborators(id)`;
  - adiciona `origin text NOT NULL DEFAULT 'WEB' CHECK (origin IN ('WEB','PRODUCTION'))`;
  - adiciona `CHECK` de XOR garantindo que todo registro é ou `WEB` (com `created_by_user_id`
    preenchido) ou `PRODUCTION` (com `created_by_collaborator_id` preenchido), nunca os dois
    nem nenhum.
  - Sem backfill necessário: linhas existentes já ficam `origin='WEB'` via `DEFAULT` e já têm
    `created_by_user_id` preenchido.
- Aplicada apenas em bancos de desenvolvimento locais efêmeros (usados para rodar os testes de
  integração desta tarefa). **Não aplicada em HML nem PRD** — deve seguir o fluxo normal de
  deploy de migrations do projeto.
- O fluxo web (`my-activities/extra-time-entries.*`) não foi alterado e continua gravando
  `origin='WEB'` normalmente (via `DEFAULT`).

## Testes mantidos

Frontend:
- `src/features/kiosk/KioskActivityCards.test.tsx` (novo) — 6 testes: os dois botões aparecem
  no Kiosk autenticado; clicar em `+ Extra esteira` abre o fluxo correspondente; clicar em
  `+ Outra atividade` abre o fluxo correspondente; sucesso do Extra Esteira fecha o overlay e
  retorna ao Kiosk; sucesso do Outra Atividade (caminho completo: busca → seleção → minutos →
  revisão → confirmar) fecha o overlay e retorna ao Kiosk; erro de persistência nunca mostra
  falso sucesso.
- `src/features/kiosk/kioskExtraEsteiraFlowLogic.test.ts` (novo) — validação de minutos e
  regra de submissão do formulário (lógica pura, sem jsdom).
- `src/features/kiosk/kioskOutraAtividadeFlowLogic.test.ts` (novo) — validação de minutos,
  formatação de contexto do candidato, e regra de quando exigir justificativa de
  exceção/fora-de-sequência (lógica pura, sem jsdom).

Backend:
- `server/src/tests/production-extra-time-entries.integration.test.ts` (novo) — sessão
  obrigatória, persistência correta, colaborador vindo da sessão, rejeição de payload
  inválido, verificação direta no banco de `origin`/`created_by_collaborator_id`/
  `created_by_user_id`.
- `server/src/tests/production-unassigned-time-entries.integration.test.ts` (novo) — sessão
  obrigatória, busca de candidatos, apontamento assinalado vs. por exceção, exigência de
  justificativa quando sem alocação, rejeição sem justificativa (422), verificação de que
  `conveyor_node_assignees` não é alterado.
- `server/src/tests/production-time-entries.integration.test.ts` (já existente, fluxo normal
  de apontamento) — roda integralmente verde, sem regressão.

Infraestrutura de teste adicionada (mínima, isolada, necessária para os critérios de aceite de
interação da spec): `@testing-library/react` + `jsdom` como devDependencies;
`vitest.config.ts` passou a aceitar também `src/**/*.test.tsx` no `include`; `environment`
global continua `'node'` — `jsdom` é ativado só nos arquivos de teste novos via
`/** @vitest-environment jsdom */`. Como efeito colateral (não planejado, mas correto), dois
arquivos `.test.tsx` órfãos que já existiam no repositório e nunca eram executados
(`StatusBadge.test.tsx`, `conveyorProgressTablePrint.test.tsx`) passaram a rodar — ambos
passam.

## Testes descartados

Nenhum teste exploratório/redundante foi mantido no commit final. Não foram criados testes de
CSS, ícones, texto decorativo, ordem interna de elementos ou detalhes triviais de markup.

## Validação

### Testes relacionados
- `npx vitest run src/features/kiosk/` → 3 arquivos, 16 testes, todos passando (exit 0).
- `server/src/tests/production-extra-time-entries.integration.test.ts` +
  `production-unassigned-time-entries.integration.test.ts` +
  `production-time-entries.integration.test.ts` → 44 testes passando isolados (exit 0).

### Suíte completa
- `npm test` (frontend, raiz): 196 arquivos / 1282 testes, todos passando (exit 0).
- `npm run server:test`: 1119 passed / 2 failed / 20 skipped. As 2 falhas
  (`operational-planning.weekly-view.http.test.ts` e `production-auth.integration.test.ts`)
  estão em arquivos **fora do diff desta entrega** (confirmado via `git show 1d4ba01 --stat`)
  e foram reproduzidas de forma idêntica comparando com o commit-pai — atribuídas a diferenças
  de ambiente local (formatação de fórmula ExcelJS e collation `pt-BR` vs. Postgres local),
  não a regressão desta feature.

### Typecheck
- `npx tsc -b` (raiz): exit 0, sem saída.
- `npx tsc -p tsconfig.json --noEmit` (server): exit 0, sem saída.

### Build
- `npm run build`: concluído com sucesso (exit 0).

### Lint
- `npm run lint` (raiz): exit 1, `93 erros / 23 warnings` — **idênticos em quantidade e
  conteúdo** à baseline (`origin/main` antes desta entrega), confirmado comparando a saída com
  as mudanças da feature removidas (`git stash`/worktree limpo). Nenhum arquivo criado ou
  alterado por esta entrega aparece com problema novo no lint.

### Revisão independente
Um segundo agente (`sgp-test-reviewer`), sem acesso ao relatório do implementador, reexecutou
toda a suíte de forma independente e verificou por leitura de código (não só por prosa) os
pontos críticos de segurança/regra de negócio: `production-time-entries.service.ts` intocado;
nenhum endpoint aceita `collaboratorId` do body; `Outra Atividade` nunca cria alocação; a
migration é coerente com o schema anterior; o fluxo web de extra esteira está intocado.
Veredito inicial: **PASSA COM RESSALVAS**, apontando como única lacuna real a ausência de um
teste de caminho feliz específico para `Outra Atividade` em `KioskActivityCards.test.tsx`
(havia apenas para Extra Esteira). Essa lacuna foi corrigida em commit posterior
(`8e3488b`) antes do fechamento desta entrega.

### Validação manual
Não realizada nesta sessão (ambiente sem tablet físico/dispositivo touch real e sem acesso a
banco de homologação). Pendente — ver seção "Pendências".

## Layout

Validação visual em navegador real (1920×1080, 1366×768, 1024×768, zoom 100%) **não foi
realizada nesta sessão** (sem acesso a navegador interativo neste ambiente de execução). O que
foi verificado por leitura de código/diff:
- O diff em `KioskActivityCards.tsx` é mínimo e pontual: inserção dos dois botões dentro do
  mesmo container `flex flex-wrap items-center gap-3` já existente, e renderização condicional
  dos dois overlays fora do fluxo normal do header — nenhuma classe de layout/scroll pré-existente
  (`flex-1`, `min-h-0`, `overflow-hidden`, `overflow-y-auto`) foi alterada ou removida.
  Herdando o `flex-wrap` já existente no header, os botões novos devem quebrar linha em telas
  estreitas sem sobrepor Busca, Carrossel/Lista ou Sair — mas isso precisa de confirmação
  visual real (ver Pendências).
- Os dois overlays (`KioskExtraEsteiraFlow`, `KioskOutraAtividadeFlow`) seguem o mesmo padrão
  visual já usado em `ProductionTimeEntryDialog.tsx` (`role="dialog"`, `aria-modal="true"`,
  fullscreen com scroll interno), reaproveitando os tokens do design system do Kiosk.

## Arquivos alterados

Backend:
- `server/migrations/0052_operational_extra_time_entries_production_origin.sql` (novo)
- `server/src/modules/production/production-extra-time-entries.controller.ts` (novo)
- `server/src/modules/production/production-extra-time-entries.repository.ts` (novo)
- `server/src/modules/production/production-extra-time-entries.schemas.ts` (novo)
- `server/src/modules/production/production-extra-time-entries.service.ts` (novo)
- `server/src/modules/production/production-time-entry-candidates.controller.ts` (novo)
- `server/src/modules/production/production-unassigned-time-entries.controller.ts` (novo)
- `server/src/modules/production/production-unassigned-time-entries.service.ts` (novo)
- `server/src/modules/production/production-time-entries.schemas.ts` (alterado — só adição)
- `server/src/modules/production/production.routes.ts` (alterado — 5 rotas novas)
- `server/src/tests/production-extra-time-entries.integration.test.ts` (novo)
- `server/src/tests/production-unassigned-time-entries.integration.test.ts` (novo)

Frontend:
- `src/domain/production/production.types.ts` (alterado — só adição de tipos)
- `src/lib/production/productionApiClient.ts` (alterado — `productionRequestJsonEnvelope`)
- `src/services/production/productionApiService.ts` (alterado — 5 funções novas)
- `src/features/kiosk/KioskActivityCards.tsx` (alterado — 2 botões + render condicional)
- `src/features/kiosk/KioskExtraEsteiraFlow.tsx` (novo)
- `src/features/kiosk/KioskOutraAtividadeFlow.tsx` (novo)
- `src/features/kiosk/kioskExtraEsteiraFlowLogic.ts` (novo)
- `src/features/kiosk/kioskOutraAtividadeFlowLogic.ts` (novo)
- `src/features/kiosk/kioskExtraEsteiraFlowLogic.test.ts` (novo)
- `src/features/kiosk/kioskOutraAtividadeFlowLogic.test.ts` (novo)
- `src/features/kiosk/KioskActivityCards.test.tsx` (novo)

Infraestrutura de teste:
- `vitest.config.ts` (alterado — `include` também aceita `.test.tsx`)
- `package.json` / `package-lock.json` (alterado — `@testing-library/react`, `jsdom` como
  devDependencies)

Governança da sessão (não relacionado à feature):
- `.gitignore` (alterado — ignora `.claude/worktrees/`, diretório efêmero usado pelos agentes
  desta sessão para isolar o trabalho de implementação)

## Pendências

- Migrations `0052` não aplicada em HML/PRD (fora do escopo desta tarefa — deve seguir o fluxo
  normal de deploy já documentado no `CLAUDE.md`).
- Validação visual real em 1920×1080 / 1366×768 / 1024×768 / zoom 100% não realizada (sem
  navegador interativo neste ambiente) — recomenda-se validar antes de promover para HML,
  especialmente o comportamento de `flex-wrap` do header em 1024×768.
- Validação manual em tablet touch físico (swipe, PIN pad, teclado virtual, scroll dos dois
  overlays) não realizada — pendente conforme já esperado pela própria demanda original.
- As 2 falhas pré-existentes da suíte de integração do server
  (`operational-planning.weekly-view.http.test.ts`, `production-auth.integration.test.ts`)
  permanecem sem correção — fora do escopo desta entrega, não são regressão introduzida por
  ela (arquivos fora do diff, comportamento idêntico ao commit-pai).
- Nenhuma pendência de código conhecida dentro do escopo aprovado desta spec.
