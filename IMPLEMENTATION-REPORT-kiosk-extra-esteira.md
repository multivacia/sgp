# Relatório de Implementação — Kiosk: Apontamento de Atividade Extra Esteira

## Spec atendida
Adicionar ao Kiosk de produção (`/app/kiosk`) um modal de "atividade extra" fora
da esteira, com histórico das últimas 5 entradas do colaborador logado na
sessão ativa, reutilizando o catálogo/tabela já existente de
`operational_extra_time_entries` (hoje só acessível pelo fluxo web
`my-activities`), agora também gravável a partir do Modo Fábrica/Kiosk sem
depender de `app_users`.

## Alterações feitas

### Migration
- `server/migrations/0053_operational_extra_time_entries_production_origin.sql`
  (última migration existente na branch era `0051`, então a nova recebeu
  originalmente o número `0052`; renumerada para `0053` após integração em
  `develop`, pois outra entrega em paralelo — sugestão de colaboradores —
  também havia usado `0052_team_members_suggestion_order.sql`; conteúdo SQL
  inalterado, apenas o nome do arquivo mudou):
  - `created_by_user_id` passa a ser `NULL`-ável.
  - novo `created_by_collaborator_id uuid NULL REFERENCES collaborators(id) ON DELETE RESTRICT`.
  - novo `origin text NOT NULL DEFAULT 'WEB'` com `CHECK (origin IN ('WEB','PRODUCTION'))`.
  - `CHECK` XOR garantindo que ou é um registro WEB (`created_by_user_id` preenchido,
    `created_by_collaborator_id` nulo, `origin='WEB'`) ou é um registro PRODUCTION
    (`created_by_collaborator_id` preenchido, `created_by_user_id` nulo,
    `origin='PRODUCTION'`).
  - Sem backfill: linhas existentes já ficam `origin='WEB'` via `DEFAULT` e já têm
    `created_by_user_id` preenchido (não há linha antiga que viole o XOR).
  - Migration testada localmente (banco de desenvolvimento efêmero criado para
    esta tarefa) — aplicada com sucesso via `npm run migrate`, do zero até
    `0053`, sem erros. **Não foi aplicada em HML/PRD** (fora do escopo — regra do
    projeto é nunca rodar migração sem instrução explícita além do ambiente
    local de verificação).

### Backend (Modo Fábrica / Kiosk)
- `server/src/modules/production/production-extra-time-entries.schemas.ts` (novo)
  — reaproveita as mesmas regras de `minutes`/`entryDate`/`notes` do fluxo web
  (`my-activities/extra-time-entries.schemas.ts`) e adiciona bloqueio de
  `entryDate` futura (`superRefine`).
- `server/src/modules/production/production-extra-time-entries.repository.ts` (novo)
  — reexporta (sem duplicar) `listActiveExtraTimeEntryDescriptions`,
  `descriptionExistsActive` e `listRecentExtraTimeEntries` de
  `my-activities/extra-time-entries.repository.ts`: confirmei que essas três
  funções são puras (recebem `collaboratorId`/`id` diretamente, sem nenhuma
  dependência de `app_users`), portanto seguras para reúso direto no Modo
  Fábrica. Acrescenta `insertProductionExtraTimeEntry`, que grava
  `created_by_collaborator_id` + `origin='PRODUCTION'` (não inclui
  `created_by_user_id` no INSERT — fica `NULL` por ausência de valor).
- `server/src/modules/production/production-extra-time-entries.service.ts` (novo)
  — valida descrição ativa e delega ao repository; usa sempre
  `req.productionSession.collaboratorId` (nunca resolve via `app_users`).
- `server/src/modules/production/production-extra-time-entries.controller.ts` (novo)
  — 3 handlers: `getProductionExtraTimeEntryDescriptions`,
  `getProductionExtraTimeEntries`, `postProductionExtraTimeEntry`.
- `server/src/modules/production/production.routes.ts` (alterado) — 3 rotas novas:
  - `GET /production/extra-time-entries/descriptions` → `requireProductionAuth()`
  - `GET /production/extra-time-entries` → `requireProductionAuth()` + `requireProductionPinChanged()`
  - `POST /production/extra-time-entries` → `requireProductionAuth()` + `requireProductionPinChanged()`
  - Nenhum permission code novo, nenhum rate-limit novo.
- `server/src/tests/production-extra-time-entries.integration.test.ts` (novo) —
  15 testes de integração cobrindo: 401 sem sessão (GET descriptions, GET
  entries, POST), 200 com sessão válida, 403 `PRODUCTION_PIN_CHANGE_REQUIRED`
  com `must_change_pin=true` (GET e POST), isolamento de histórico entre dois
  colaboradores, `limit` respeitado, rejeição de `entryDate` futura, aceite de
  data retroativa, rejeição de `minutes<=0`, rejeição de `minutes` não inteiro,
  rejeição de `notes>500`, rejeição de `descriptionId` inativo/inexistente, e
  verificação direta no banco de que o registro criado grava
  `created_by_collaborator_id`, `created_by_user_id IS NULL`,
  `origin='PRODUCTION'`.

### Frontend
- `src/services/production/productionApiService.ts` (alterado) — 3 funções
  novas: `listProductionExtraTimeEntryDescriptions`,
  `listProductionExtraTimeEntries`, `createProductionExtraTimeEntry`, usando
  `productionRequestJson` (client isolado do Modo Fábrica) contra
  `/api/v1/production/extra-time-entries*`.
- `src/features/kiosk/kioskExtraActivityModalLogic.ts` (novo) — funções puras
  (`todayIsoDate`, `validateKioskExtraActivityForm`, `NOTES_MAX_LENGTH`)
  extraídas para arquivo próprio porque o ESLint (`react-refresh/only-export-components`)
  não permite que um arquivo de componente exporte também funções/constantes
  soltas — mesmo padrão já usado no projeto (`quickTimeEntryDrawerLogic.ts`
  separado de `QuickTimeEntryDrawer.tsx`).
- `src/features/kiosk/KioskExtraActivityModal.tsx` (novo) — modal com:
  select (tipo/descrição), `input[type=date]` (bloqueia futuro via `max` +
  validação), `input[type=number]` (minutos inteiro > 0), `textarea` de notas
  (opcional, máx. 500, trim). Carrega descrições + últimos 5 apontamentos ao
  abrir; reseta **todo** o estado (formulário e histórico) sempre que `open`
  muda (fechar ou reabrir), nunca reaproveitando dado de uma sessão anterior.
  Usa exclusivamente os tokens visuais já usados no Kiosk (`sgp-gold`,
  `sgp-navy`, `sgp-void`, `sgp-cta-primary`, mesma estrutura de dialog usada em
  `CapacityOverrideModal`).
- `src/features/kiosk/KioskActivityCards.tsx` (alterado) — botão "+ Extra" no
  header (ao lado do alternador de modo e do botão "Sair"), que abre o modal.
  Não foi necessário nenhum callback de reset por troca de colaborador: o
  `KioskPage` sempre desmonta `KioskActivityCards` ao fazer logout/trocar de
  colaborador (a máquina de estados só vai de `activities` para `grid` e depois
  para `pin`/`activities` de novo — nunca troca `collaborator` num componente
  já montado), então o estado do modal já não sobrevive a troca de sessão por
  construção do React (unmount real), sem necessidade de efeito extra
  (evitando também o lint `react-hooks/set-state-in-effect`, mais estrito na
  versão instalada de `eslint-plugin-react-hooks`).
- `src/features/kiosk/KioskExtraActivityModal.test.tsx` (novo) — 7 testes de
  componente (Vitest + Testing Library) cobrindo: não renderiza quando
  `open=false`; carrega descrições e histórico ao abrir; fecha ao clicar em
  "Fechar"; reseta formulário e histórico completamente ao reabrir (preenche
  campos, fecha, reabre, confirma que nada sobrevive); submete com payload
  exato (`descriptionId`, `entryDate`, `minutes` number, `notes` trim);
  bloqueia data futura no frontend (botão desabilitado, serviço não chamado);
  exibe erro de backend em banner (`role="alert"`).

### Infraestrutura de teste (necessária para cumprir a spec)
O projeto **não tinha** ambiente de teste de componente React configurado:
`vitest.config.ts` só incluía `src/**/*.test.ts` (sem `.tsx`) com
`environment: 'node'`, e não havia `@testing-library/react` nem `jsdom`
instalados. Como a spec exige explicitamente um "teste de componente... Vitest
+ Testing Library" como entregável, adicionei o mínimo necessário:
- `package.json` / `package-lock.json`: `@testing-library/react` e `jsdom`
  como `devDependencies` (não usei `@testing-library/jest-dom`: o teste evita
  matchers customizados, checando propriedades DOM nativas como
  `.disabled`/`.value`, o que dispensa a dependência).
- `vitest.config.ts`: `include` passou a aceitar também `src/**/*.test.tsx`.
  O `environment` global continua `'node'` (zero risco às 1275 suites
  existentes); o novo teste ativa `jsdom` **apenas para si** via comentário
  `/** @vitest-environment jsdom */` no topo do arquivo.

## Critérios de aceite

| Critério | Atendido? | Onde |
|---|---|---|
| Migration nova com número real (`0053`) | Sim | `server/migrations/0053_operational_extra_time_entries_production_origin.sql` |
| `created_by_user_id` NULLABLE | Sim | mesma migration |
| `created_by_collaborator_id` novo, FK `collaborators(id)` | Sim | idem |
| `origin` novo, `CHECK IN ('WEB','PRODUCTION')`, default `'WEB'` | Sim | idem |
| `CHECK` XOR autor/origem | Sim | idem (`chk_operational_extra_time_entries_origin_author_xor`) |
| Sem backfill necessário | Sim | comentário na migration; verificado — não há UPDATE de dados |
| Fluxo web (`my-activities`) grava igual (sem alterar o módulo) | Sim | `extra-time-entries.repository.ts` do módulo web **não foi tocado**; seu `INSERT` lista colunas explicitamente sem `origin`/`created_by_collaborator_id`, então o `DEFAULT`/`NULL` cuidam disso automaticamente |
| `GET /descriptions`: 401 sem sessão, 200 com sessão | Sim | teste de integração + `requireProductionAuth()` na rota |
| `GET /extra-time-entries?limit=5`: últimos apontamentos do colaborador da sessão, isolado de outro colaborador, ordenado por `entry_date DESC, created_at DESC` | Sim | reaproveita `listRecentExtraTimeEntries` (já ordenada assim); teste de isolamento entre dois colaboradores |
| `GET`/`POST`: 403 `PRODUCTION_PIN_CHANGE_REQUIRED` com `must_change_pin=true` | Sim | `requireProductionPinChanged()` nas duas rotas + testes |
| `POST`: rejeita `entryDate` futura (422) | Sim | `production-extra-time-entries.schemas.ts` (`superRefine`) + teste |
| `POST`: aceita retroativa | Sim | teste `aceita data retroativa` |
| `POST`: rejeita `minutes<=0` / não inteiro | Sim | schema reaproveitado + testes |
| `POST`: rejeita `notes>500` (trim) | Sim | schema reaproveitado + teste |
| `POST`: grava `created_by_collaborator_id=session.collaboratorId`, `created_by_user_id=NULL`, `origin='PRODUCTION'` | Sim | `insertProductionExtraTimeEntry` + teste que lê direto do banco |
| Nenhuma UI/relatório fora de `src/features/kiosk/` exibe `origin` | Sim | `origin` não aparece em nenhum tipo/DTO/JSON de resposta (`toEntryJson` não inclui `origin`); nenhuma tela fora do Kiosk foi tocada |
| `KioskExtraActivityModal` reseta tudo ao reabrir | Sim | efeito único `useEffect(() => { resetForm(); if (open) {...} }, [open])` + teste dedicado |
| Botão só em `KioskActivityCards.tsx` | Sim | `KioskCollaboratorGrid.tsx`, `KioskPinPad.tsx`, `KioskChangePin.tsx` não foram tocados |
| Modal usa tema/tokens do Kiosk | Sim | `sgp-gold`, `sgp-navy`, `sgp-void`, `sgp-cta-primary`, mesma estrutura de outros modais do projeto |
| Não altera `conveyor-progress`/fila estruturada/bloqueio fora de sequência | Sim | nenhum arquivo desses módulos foi tocado (ver `git diff --stat`) |
| Nenhum permission code novo | Sim | gate é só `requireProductionAuth()`/`requireProductionPinChanged()` |
| Nenhum rate-limit novo | Sim | nada adicionado nesse sentido |

## Evidência reexecutável

### `git status` / `git diff --stat` (apenas arquivos do escopo + infra de teste)
```
 package-lock.json                                                          | 687 +++++++++++++++++++++
 package.json                                                               |   2 +
 server/migrations/0052_operational_extra_time_entries_production_origin.sql|  69 +++
 server/src/modules/production/production-extra-time-entries.controller.ts | 79 +++
 server/src/modules/production/production-extra-time-entries.repository.ts | 93 +++
 server/src/modules/production/production-extra-time-entries.schemas.ts    | 50 ++
 server/src/modules/production/production-extra-time-entries.service.ts    | 50 ++
 server/src/modules/production/production.routes.ts                        | 22 +
 server/src/tests/production-extra-time-entries.integration.test.ts        | 260 ++++++++
 src/features/kiosk/KioskActivityCards.tsx                                 |  20 +
 src/features/kiosk/KioskExtraActivityModal.test.tsx                       | 204 ++++++
 src/features/kiosk/KioskExtraActivityModal.tsx                            | 322 ++++++++++
 src/features/kiosk/kioskExtraActivityModalLogic.ts                        |  40 ++
 src/services/production/productionApiService.ts                          |  76 +++
 vitest.config.ts                                                          |   2 +-
 15 files changed, 1975 insertions(+), 1 deletion(-)
```
(`git diff` completo disponível no commit desta entrega — `git show <hash>`.)

> Nota pós-merge: `server/migrations/0052_operational_extra_time_entries_production_origin.sql`
> (linha acima) foi renomeado para
> `server/migrations/0053_operational_extra_time_entries_production_origin.sql`
> após integração em `develop`, por conflito de numeração com
> `0052_team_members_suggestion_order.sql` (entrega paralela). O bloco acima é
> o registro histórico do diff no momento do commit original; mantido
> verbatim por fidelidade à evidência.

### `npm run lint` (raiz, cobre frontend + tipos)
```
EXIT CODE: 1
✖ 116 problems (93 errors, 23 warnings)
```
Os 93 erros/23 warnings são **idênticos em quantidade e conteúdo** aos da
branch antes desta implementação (confirmado com `git stash` + `npm run lint`
no código não alterado → mesmo `✖ 116 problems (93 errors, 23 warnings)`).
Nenhum arquivo criado/alterado nesta entrega aparece na saída do lint.

### `tsc -b` (raiz — frontend)
```
EXIT CODE: 0
(sem saída — build limpo)
```

### `tsc -p tsconfig.json --noEmit` (server)
```
EXIT CODE: 0
(sem saída — build limpo)
```

### `npm test` (frontend, Vitest)
```
EXIT CODE: 0
 Test Files  194 passed (194)
      Tests  1275 passed (1275)
```
Inclui os 7 testes novos de `KioskExtraActivityModal.test.tsx`.

### `npm run server:test` (server, Vitest — integração real com PostgreSQL local)
Rodado contra um banco de desenvolvimento local dedicado (`sgp_dev`, PostgreSQL
16, criado só para esta verificação — nunca aponta para HML/PRD), com todas as
migrations aplicadas via `npm run migrate` (`0001` → `0052`, numeração no
momento desta verificação; a migration desta feature foi renumerada para
`0053` após integração em `develop` — ver nota na seção "Migration").

Isolado, o teste novo é **100% determinístico** (rodado 3× seguidas, sempre
15/15):
```
 Test Files  1 passed (1)
      Tests  15 passed (15)
```

Rodando a suíte completa do servidor (1139 testes), o resultado varia entre
`exit 0` e `exit 1` **por instabilidade pré-existente e não relacionada a esta
entrega**, confirmada também na branch original sem nenhuma das minhas
alterações (mesmo comando, mesmo banco recém-migrado do zero, código
`git stash`):
- Baseline (código sem esta feature), banco zerado, 2 execuções seguidas:
  1ª execução → `10 failed | 1093 passed` (falhas em `admin-password-governance`,
    `operational-planning.weekly-view`, `support-http`)
  2ª execução → `6 failed | 1097 passed` (falhas parcialmente diferentes:
    `operational-planning.weekly-view`, `production-auth` — ordenação
    `localeCompare('pt-BR')` vs colação do Postgres —, `support-http`)
- Com esta feature aplicada, banco zerado, mesma sequência de execuções:
  execuções variaram entre `1 failed` e `2 failed`, sempre nos mesmos dois
  suspeitos pré-existentes (`operational-planning.weekly-view.http.test.ts` —
  asserção de fórmula do ExcelJS — e `production-auth.integration.test.ts` —
  comparação de ordenação `localeCompare('pt-BR')` que diverge da colação usada
  pelo Postgres quando há muitos nomes de teste com sufixo aleatório
  acumulados). **Nenhuma falha nova, e nunca um teste do módulo desta entrega
  (`production-extra-time-entries.integration.test.ts`) falhou em nenhuma das
  execuções.**

Uma execução representativa completa (com `SUPPORT_TICKETS_ENABLED=1` no
`.env` local, para não confundir com o 404 esperado quando a flag está
desligada):
```
EXIT CODE: 1
 Test Files  1 failed | 141 passed | 5 skipped (147)
      Tests  1 failed | 1117 passed | 21 skipped (1139)
```
(A única falha nessa execução: `operational-planning.weekly-view.http.test.ts`
— comparação de fórmula `'=SUM(A1:A9)` gerada pelo ExcelJS, sem qualquer
relação com apontamento extra esteira ou Modo Fábrica.)

**Bloqueio documentado (ambiente, não é regra de negócio inventada):** a
suíte de integração do server, quando rodada localmente contra um Postgres
efêmero criado para esta tarefa, apresenta flakiness pré-existente em pelo
menos dois testes não relacionados a esta feature
(`operational-planning.weekly-view.http.test.ts` e
`production-auth.integration.test.ts`), reproduzida também no código-base sem
nenhuma alteração minha. Não tentei "corrigir" esses testes — estão fora do
escopo aprovado desta spec.

## Migrations
- Nova: `server/migrations/0053_operational_extra_time_entries_production_origin.sql`
  (renumerada de `0052` após integração em `develop` — ver nota acima).
- Aplicada apenas no banco de desenvolvimento local efêmero criado para esta
  tarefa (`sgp_dev`), para permitir rodar `tsc`/testes de integração reais.
  **Não foi aplicada em HML nem PRD** — isso deve seguir o fluxo normal do
  projeto (`server/migrations/` numeradas, aplicação manual/pipeline
  específica de HML/PRD, fora do escopo desta tarefa).

## Roteiro de teste manual E2E (kiosk físico / tablet)

1. Abrir `/app/kiosk` no tablet, selecionar o avatar de um colaborador com
   Modo Fábrica habilitado e PIN já trocado (`must_change_pin=false`).
2. Na tela de atividades, confirmar que o botão **"+ Extra"** aparece no
   header, entre o alternador carrossel/lista e o botão **"Sair"**.
3. Tocar em **"+ Extra"** → o modal deve abrir sobre a tela, com:
   - select "Tipo de atividade" carregado com as descrições ativas
     (cadastradas em Configurações Operacionais → Descrições de apontamento
     extra esteira);
   - campo "Data" pré-preenchido com a data de hoje;
   - campo "Tempo (minutos)" vazio;
   - campo "Observação" vazio;
   - seção "Últimos apontamentos" mostrando até 5 registros mais recentes
     **do colaborador logado** (vazio se for a primeira vez).
4. Tentar selecionar uma data futura no campo "Data" → o seletor nativo já
   deve impedir (atributo `max`); mesmo se for possível digitar/forçar uma
   data futura, o botão "Registrar apontamento" deve ficar desabilitado.
5. Preencher tipo, manter data de hoje, informar minutos (ex.: `30`), deixar
   observação vazia, tocar em **"Registrar apontamento"** → o modal deve
   fechar automaticamente; reabrir o modal e confirmar que o novo
   apontamento aparece no topo de "Últimos apontamentos".
6. Repetir com minutos `0` ou negativo → botão deve permanecer desabilitado
   (validação no frontend evita a chamada ao backend).
7. Preencher observação com mais de 500 caracteres → botão deve ficar
   desabilitado.
8. Fechar o modal (botão "Fechar" ou tocar fora) sem salvar, reabrir → todos
   os campos devem voltar ao estado inicial (nenhum dado da tentativa
   anterior deve reaparecer).
9. Tocar em **"Sair"** (logout do Kiosk) e entrar com **outro** colaborador →
   abrir o modal "+ Extra" deste segundo colaborador e confirmar que a lista
   de "Últimos apontamentos" mostra **somente** os apontamentos deste
   segundo colaborador (nunca os do primeiro).
10. Repetir o passo 3–5 com um colaborador cujo `must_change_pin=true` (se
    aplicável ao ambiente de teste): deve ser impedido de acessar a fila e,
    ao chamar a API de apontamento extra, o backend deve responder 403
    (`PRODUCTION_PIN_CHANGE_REQUIRED`) — validar via rede/logs, já que a
    troca de PIN obrigatória normalmente intercepta a navegação antes mesmo
    de chegar à tela de atividades.
11. Confirmar no fluxo web (`/app` → Minhas Atividades → apontamento extra
    esteira) que nada mudou: criar um apontamento extra pelo fluxo web e
    verificar que ele **não aparece** misturado incorretamente com os do
    Kiosk (ambos ficam na mesma tabela, mas com `origin` diferente — não há
    UI que exiba isso, é só para auditoria/banco).

## Riscos residuais
- A suíte de integração do servidor tem testes com flakiness pré-existente
  (comparação de ordenação `localeCompare('pt-BR')` vs colação do Postgres em
  `production-auth.integration.test.ts`, e uma asserção de fórmula do ExcelJS
  em `operational-planning.weekly-view.http.test.ts`) — não foram tocados,
  mas quem rodar a suíte completa localmente pode ver essas falhas
  ocasionais, sem relação com esta entrega.
- Testes de componente React (Vitest + Testing Library) eram inexistentes no
  projeto antes desta entrega; a infraestrutura mínima adicionada
  (`jsdom`, `@testing-library/react`, ajuste de `include` no
  `vitest.config.ts`) é intencionalmente pequena e isolada (ambiente `jsdom`
  só no arquivo novo, via `/** @vitest-environment jsdom */`), mas é a
  primeira vez que esse padrão é usado no repositório — outros times que
  quiserem testar componentes React devem seguir esse mesmo padrão.
- Migration `0053` (renumerada de `0052`) não foi aplicada em HML/PRD (fora do
  escopo desta tarefa, conforme regra do projeto).
