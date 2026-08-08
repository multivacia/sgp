# Relatório de Teste — Dispensar atividade (STEP ABORTED)

> Documento acumulativo. A seção **Rodada 3** descreve o estado atual.
> As seções marcadas como **fotografia histórica** descrevem rodadas anteriores e
> **não** refletem o repositório de hoje. Nada foi apagado.

---

# Rodada 3 — revisão independente das correções de idempotência e de conexão

Revisor: `sgp-test-reviewer`. Reexecução independente; o relatório do implementador
**não** foi aceito como prova.

## Identificação Git (estado real no momento desta revisão)

| Campo | Valor |
|---|---|
| Repositório | `https://github.com/multivacia/sgp` |
| Branch | `feature/abortar-atividade-producao` |
| HEAD | `6ef77209` — "feat: dispensar atividade STEP (ABORTED) com lock compartilhado" |
| Estado do commit `6ef77209` | **JÁ PUBLICADO**: commitado, pushado e presente no PR [#11](https://github.com/multivacia/sgp/pull/11) |
| Rodada 3 (correções revisadas aqui) | **NÃO commitada, NÃO pushada, NÃO no PR** — existe apenas na árvore de trabalho suja |

`git status --short` (exit **0**) — delimita exatamente o escopo desta rodada:

```text
 M docs/implementation/dispensar-atividade-producao-implementation-report.md
 M server/src/modules/conveyors/conveyor-step-abort.service.ts
 M server/src/tests/conveyor-step-abort.integration.test.ts
?? server/src/tests/conveyor-step-abort.idempotency.unit.test.ts
```

`git diff --stat` (exit **0**):

```text
 ...sar-atividade-producao-implementation-report.md | 270 +++++++++++++-
 .../conveyors/conveyor-step-abort.service.ts       | 392 +++++++++++++--------
 .../tests/conveyor-step-abort.integration.test.ts  | 305 +++++++++++++++-
 3 files changed, 820 insertions(+), 147 deletions(-)
```

Confirmações negativas verificadas por `git status --short` / `git diff` (não por prosa):

- **Nada** em `src/` (frontend) foi alterado.
- **Nenhuma** migration alterada — `server/migrations/0050_conveyor_nodes_step_aborted.sql` **intacto**.
- `conveyorAssignments.routes.ts` e `conveyorAssignments.controller.ts` **intactos**.
- `operational-events/conveyor-operational-events.service.ts` e `.repository.ts` **intactos**.
- `lockConveyorAndStepForUpdate.ts` **intacto**.
- `conveyor-step-abort.unit.test.ts` **intacto** (3 testes).

## Escopo revisado

- Spec normativa: `docs/specs/dispensar-atividade-producao-spec.md`
- Implementation report: `docs/implementation/dispensar-atividade-producao-implementation-report.md` (Rodada 3)
- Duas correções de escopo fechado sobre `6ef77209`:
  1. validar `Idempotency-Key` **antes** de mutar;
  2. liberar o `PoolClient` **antes** de `loadDetail(pool, …)`.

## Execução da suíte — comandos que EU executei

Ambiente: PowerShell/Windows; exit code lido de `$LASTEXITCODE`. Banco local `sgp` em
`localhost`, `NODE_ENV=development`, migration `0050` já aplicada pelo utilizador →
a suíte de integração **executa de verdade** (não entra em `describe.skipIf`).

| # | Comando | Exit code | Saída resumida |
|---|---|---|---|
| 1 | `git status --short` / `git log --oneline -5` / `git branch --show-current` | **0** | 4 arquivos no escopo; HEAD `6ef77209`; branch `feature/abortar-atividade-producao` |
| 2 | `git diff --stat` + `git diff` dos 3 arquivos tracked | **0** | 820 inserções / 147 remoções em 3 arquivos |
| 3 | `cd server; npx tsc --noEmit -p tsconfig.json` | **0** | sem saída de erro |
| 4 | `cd server; npx vitest run src/tests/conveyor-step-abort.unit.test.ts src/tests/conveyor-step-abort.idempotency.unit.test.ts src/tests/conveyor-step-abort.integration.test.ts` | **0** | `Test Files 3 passed (3)` / `Tests 34 passed (34)` |
| 5 | `cd server; npx vitest run src/tests/conveyor-step-abort.integration.test.ts --reporter=verbose` | **0** | `Test Files 1 passed (1)` / `Tests 17 passed (17)` — todos os `it` listados individualmente |
| 6 | `cd server; npx vitest run` (suíte completa do backend) | **1** | `Test Files 2 failed \| 119 passed \| 5 skipped (126)` / `Tests 3 failed \| 884 passed \| 21 skipped (908)` |
| 7 | `npm run lint` (raiz, `eslint .`) | **1** | `✖ 141 problems (118 errors, 23 warnings)` — **zero** ocorrências em `conveyor-step-abort*` |

Distribuição dos 34 testes do comando 4: `conveyor-step-abort.unit.test.ts` **3** (inalterado)
+ `conveyor-step-abort.idempotency.unit.test.ts` **14** (novo) + `conveyor-step-abort.integration.test.ts` **17** (10 antigos + 7 novos).

### Por que o comando 5 existe

O `describe.skipIf(!hasDb)` da integração poderia mascarar um verde falso. O `--reporter=verbose`
prova execução real: cada `it` aparece com duração própria, os casos de concorrência levam
384 ms e 386 ms (contenção real entre duas conexões), o teste de pool `max: 1` leva 197 ms, e
o `stderr` mostra o log técnico com UUIDs reais gerados pelo banco:

```text
✓ … concorrência real: apontamento × dispensa (dois vencedores de lock) 384ms
✓ … concorrência real: conclusão × dispensa 386ms
✓ … replay de abort e de restore concluem com pool dedicado max: 1 197ms
stderr | … restore: evento de restore existente com estado atual incoerente → 409
{"event":"conveyor_step_abort_idempotency_state_mismatch","expectedEventType":"CONVEYOR_STEP_RESTORED",
 "conveyorId":"7536bf78-…","stepNodeId":"7b287077-…","existingEventId":"0b8ebcf4-…",
 "currentStatus":"ABORTED","expectedStatusAfterOperation":"REOPENED"}
```

### Falhas do comando 6 (suíte completa) — confirmadas como pré-existentes e fora do escopo

Reexecutei a suíte completa e reproduzi **exatamente** os números relatados pelo implementador.
As 3 falhas foram verificadas por leitura e **não** têm relação com abort/restore:

| Falha | Causa verificada | Relação com esta rodada |
|---|---|---|
| `conveyors.delete.test.ts > DELETE com item de planejamento semanal → 409` | `duplicar valor da chave viola a restrição de unicidade "uq_operational_work_plans_week_draft_active"` em `conveyors.delete.test.ts:277`. O teste sorteia semana aleatória de 2026 (`Math.floor(Math.random() * 8) + 1`) e colide com `operational_work_plans` `DRAFT` residuais do banco local. | **Nenhuma.** `grep -i` por `abort\|ABORTED\|restore` no arquivo: **0 ocorrências**. |
| `system-settings-http.integration.test.ts > ADMIN comum recebe 403 ao listar` | `expected 200 to be 403` — estado de RBAC do banco local dá permissão ao `ADMIN_USER_ID`. | **Nenhuma.** `grep -i` por `abort\|ABORTED\|restore\|conveyor_step`: **0 ocorrências**. |
| `system-settings-http.integration.test.ts > ADMIN comum não altera SESSION_IDLE_TIMEOUT_MINUTES` | idem (`expected 200 to be 403`). | **Nenhuma.** |

Ambas as falhas dependem de **estado do banco local**, não do código alterado. Não maquiadas:
a suíte completa do backend **está vermelha (exit 1)** e permanece vermelha.

### Lint (comando 7)

`eslint .` na raiz cobre `server/src/**` (config: `files: ['**/*.{ts,tsx}']`, ignora só `dist`).
Exit **1** com 141 problemas, todos **pré-existentes**: nenhum incide em
`conveyor-step-abort.service.ts`, `conveyor-step-abort.idempotency.unit.test.ts` ou
`conveyor-step-abort.integration.test.ts` (`grep conveyor-step-abort` na saída: **0 ocorrências**).
Boa parte do ruído vem de `server/dist/**` (artefato de build sendo lintado).

## Prova vermelha × verde

### Verde — reexecutado por mim

Comandos 3, 4 e 5 acima: `tsc` exit **0**; 3 arquivos / **34 testes passando**, exit **0**;
integração isolada 17/17, exit **0**.

### Vermelho — prova pré-correção

**Declaração de honestidade: eu NÃO reproduzi a prova vermelha.** Reproduzi-la exigiria
`git worktree` / `checkout` / `stash`, todos **proibidos** para este papel nesta rodada.
A prova vermelha abaixo foi produzida pelo **orquestrador** em worktree isolado e descartável
em `%TEMP%` (checkout detached de `6ef77209` + testes novos copiados; worktree removido e
`git worktree prune` executado; a árvore de trabalho nunca foi tocada). Registro como
**evidência de terceiro**, não como evidência própria:

```text
npx vitest run src/tests/conveyor-step-abort.idempotency.unit.test.ts \
               src/tests/conveyor-step-abort.integration.test.ts
→ 2 files failed, 19 failed | 12 passed (31), exit 1
```

Classificação das 19 falhas, separando prova forte de prova fraca:

| Classe | Qtd. | Falhas | Força probatória |
|---|---|---|---|
| **Comportamental — defeito 1** | 6 (integração) + 2 (unit) | 5 casos de chave incompatível (outro tipo no mesmo STEP; `CONVEYOR_STEP_ABORTED` de outro STEP; evento de outra esteira; chave de abort reusada no restore; chave de restore de outra esteira) + `restore: estado atual incoerente`, todos com `AssertionError: promise resolved "{ detail: {…}, idempotent: true }" instead of rejecting`; unit `chave de outro STEP → 409 antes de qualquer mutação` e `evento reutilizado divergente → erro e ROLLBACK` | **Forte.** O código antigo mutava e devolvia `idempotent: true` em vez de 409. |
| **Comportamental — defeito 2** | 1 (integração) + 2 (unit) | `replay de abort e de restore concluem com pool dedicado max: 1` → `Error: Test timed out in 30000ms.`; unit `abort replay` / `restore replay: release antes da primeira consulta de loadDetail` → `FAKE_POOL_EXHAUSTED: pool.query com client retido (max: 1)` | **Forte.** Timeout é o deadlock literal. |
| **Import / símbolo ausente** | 7 (unit) | `TypeError: resolveStepAbortIdempotencyReplay is not a function` | **Fraca.** Só prova que o helper não existia em `6ef77209`. **Não** contadas como prova de comportamento. |

### Prova estática independente que EU produzi

Independentemente da execução acima, o `git diff` do serviço é prova direta de que os dois
defeitos existiam em `6ef77209`:

- **Defeito 1:** o bloco removido mostra `getConveyorOperationalEventByIdempotencyKey` chamado
  **apenas dentro** de `if (current === 'ABORTED')` (abort) e `if (current !== 'ABORTED')`
  (restore). Com STEP aberto, o fluxo caía direto em `updateConveyorNodeStepAborted` +
  `cancelLinkedPlanItemsForAbortedStep` + `serviceCreateConveyorOperationalEvent`; este último
  (`conveyor-operational-events.service.ts:23-31`) devolve `{ created: false, event: existing }`
  quando a chave já existe, o antigo `idempotent = !ev.created` virava `true` e seguia para
  `COMMIT` — STEP mutado e planos cancelados **sem** `CONVEYOR_STEP_ABORTED`. Auditoria violada.
- **Defeito 2:** as linhas removidas são literalmente
  `return { detail: await loadDetail(pool, input.conveyorId), idempotent }` **dentro** do `try`.
  O `finally { client.release() }` só executa após avaliar a expressão do `return`, logo
  `loadDetail` pedia uma 2ª conexão com a 1ª retida. Com `max: 1`, deadlock.

## Mapeamento critério de aceite → evidência

| # | Critério de aceite (desta rodada) | Atendido | Evidência (arquivo + teste específico) |
|---|---|---|---|
| 1 | `Idempotency-Key` existente é validada **antes** de mutações | **Sim** | `conveyor-step-abort.service.ts:280-287` e `:415-422` — `resolveStepAbortIdempotencyReplay` roda logo após o lock e a guarda de esteira, antes de `updateConveyorNodeStep*`. Testes: `…idempotency.unit.test.ts` → `abort: chave de outro STEP → 409 antes de qualquer mutação` (assere `updateConveyorNodeStepAborted` **não** chamado, `createEvent` **não** chamado, `ROLLBACK` presente, `COMMIT` ausente). Integração: `abort: chave já usada por evento de OUTRO TIPO no mesmo STEP → 409 sem mutação`. |
| 2 | Replay exige correspondência exata de tipo + esteira + STEP + estado coerente | **Sim** | `eventMatchesOperation` (`:147-160`) + checagem `currentStatus === expectedStatusAfterOperation` (`:189-191`). Testes: `…idempotency.unit.test.ts` → `correspondência exata + estado coerente → replay true`, `outro event_type → 409`, `outro conveyor_id → 409`, `outro node_id → 409`, `correspondência exata + estado incoerente → 409 e log técnico`, `restore: evento de abort com a mesma chave → 409`. |
| 3 | Reutilização incompatível da chave retorna 409 **sem** alterar nó, planos ou eventos | **Sim** | `AppError(…, 409, ErrorCodes.CONFLICT)` (`:181-187`, `:204-208`) → `errorHandler.ts:63-64` mapeia `err.statusCode` para o HTTP. Integração (5 testes) assere os **três** invariantes: `readStepStatus` inalterado, `readPlanItemStatus` = `PLANNED`, `countEvents` = 0 (ou 1, o legítimo). |
| 4 | Resultado `created: false` incompatível provoca ROLLBACK | **Sim** | `assertReusedEventMatchesOperation` (`:215-229`) chamado em `:357-363` e `:483-489`; erro cai no `catch` que emite `ROLLBACK`. Testes: `…idempotency.unit.test.ts` → `abort: evento reutilizado divergente após criação → erro e ROLLBACK` e o equivalente de restore (ambos asserem `ROLLBACK` presente e `COMMIT` ausente). |
| 5 | Abort e restore **não** chamam `loadDetail(pool)` retendo o client | **Sim** | `conveyor-step-abort.service.ts:379-381` e `:505-507` — `loadDetail` fora do `try/finally`, após `client.release()`. Auditei o serviço inteiro: dentro do bloco que retém o client só há `client.*`; `assertCanAbortOrRestore(pool, …)` roda **antes** de `pool.connect()`. Testes: fake de pool `max: 1` em `…idempotency.unit.test.ts` (`createFakePool` lança se `pool.query`/`connect` ocorrer com client retido) + `assertReleaseBeforePoolQuery` nos 4 caminhos (abort normal, abort replay, restore normal, restore replay). |
| 6 | Replay de abort funciona com pool `max: 1` | **Sim** | Integração → `replay de abort e de restore concluem com pool dedicado max: 1` (`new pg.Pool({ …env.pgPoolConfig, max: 1 })`), assere `abortReplay.idempotent === true` e exatamente 1 `CONVEYOR_STEP_ABORTED`. Executado em 197 ms (antes: timeout de 30 s). |
| 7 | Replay de restore funciona com pool `max: 1` | **Sim** | Mesmo teste: `restoreReplay.idempotent === true` e exatamente 1 `CONVEYOR_STEP_RESTORED`. |
| 8 | Testes de locks e concorrência continuam passando | **Sim** | `lockConveyorAndStepForUpdate.ts` **inalterado** (`git status`). Integração → `concorrência real: apontamento × dispensa (dois vencedores de lock)` (384 ms) e `concorrência real: conclusão × dispensa` (386 ms), ambos verdes no comando 5. Ordem de locks (esteira → STEP → itens por `id ASC`) preservada em `cancelLinkedPlanItemsForAbortedStep`. |
| 9 | Nenhuma alteração de contrato HTTP ou UX | **Sim** | `git status --short`: nada em `src/`, nada em rotas/controller. `conveyorAssignments.routes.ts:28-39` mantém `POST …/abort` e `POST …/restore-aborted` com `requirePermission('conveyors.create')`; `conveyorAssignments.controller.ts:273` e `:295` mantêm `res.status(200).json(ok(out.detail, { stepAbortIdempotent … }))` / `{ stepRestoreAbortedIdempotent … }`, idênticos ao contrato da spec (§Contrato HTTP). Assinatura do serviço (`{ detail, idempotent }`) preservada. |
| 10 | Relatórios refletem `6ef77209` e esta nova rodada | **Sim** | `docs/implementation/…-implementation-report.md` abre com "Estado atual de publicação (Rodada 3)" registrando commit `6ef77209`, PR #11 e "NÃO commitada e NÃO pushada", e rebaixa as seções antigas a "Fotografia histórica". Este relatório faz o mesmo. |

Nenhum critério da spec normativa foi extrapolado: as correções não tocam catálogo de motivos,
migration `0050`, ciclo de vida da esteira, kiosk/produção nem frontend.

## Julgamento crítico dos pontos de atenção

### `console.warn(JSON.stringify(…))` para o log técnico — **aceitável, com ressalva menor**

Precedente confirmado por leitura: `operational-settings.service.ts:257` (`console.warn`) e
`document-draft.controller.ts:96` (`console.warn(JSON.stringify(payload))` — **idioma idêntico**).
Adotar o padrão existente está alinhado a `AGENTS.md` ("não criar padrão novo quando já existir
padrão equivalente"). **Ressalva:** o log não passa pelo Pino, então fica sem nível, sem
correlação de request e fora do pipeline estruturado de logs. Não bloqueia; vale como dívida
registrada para uma futura padronização de logging (que seria refatoração fora deste escopo).

### Mensagem 409 genérica — **adequada**

A spec fecha **409** para conflito (§Códigos de erro) e não exige discriminar sub-causas.
A mensagem única cobre dois casos distintos (chave pertence a outra operação × chave
corresponde mas o estado é incoerente), o que reduz a diagnosticabilidade pelo cliente, mas
**evita vazar** a qual esteira/nó a chave pertence — um leak de informação real, já que a
`idempotency_key` é única global. O detalhe fica no log técnico, que é o lugar certo.
Sugestão não bloqueante: um `details` estruturado no `AppError` diferenciando as sub-causas.

### Ordem `assertConveyorAllowsAbort` → guarda de idempotência — **correta, com um edge documentado**

A ordem escolhida preserva o teste existente `esteira FINALIZADA ou CANCELADA → abort rejeitado 409`
e mantém a guarda mais barata e mais restritiva primeiro. **Edge real:** se o STEP for abortado
com sucesso e a esteira for finalizada/cancelada **depois**, um replay legítimo da mesma
`Idempotency-Key` recebe **409** em vez do **200 idempotente** que a spec promete
(§Idempotência, item 3). As duas regras da spec colidem nesse cenário e a implementação escolheu
a guarda da esteira. Julgo a escolha **defensável**: a janela é estreita (retry de rede após
finalização da esteira), o resultado é *fail-safe* (nenhuma mutação, nenhum evento) e inverter a
ordem quebraria o critério "esteira FINALIZADA/CANCELADA → 409". Registro como ressalva, não como
critério não atendido. Vale idêntico para a guarda inline do `serviceRestoreAbortedConveyorStep`
(`:405-411`).

### Sobrou algum caminho chamando `pool` com o client retido? — **Não**

Auditoria linha a linha das duas funções: dentro do bloco `try/finally` só existem chamadas que
recebem `client` (`lockConveyorAndStepForUpdate`, `resolveStepAbortIdempotencyReplay`,
`updateConveyorNodeStep*`, `cancelLinkedPlanItemsForAbortedStep`,
`serviceCreateConveyorOperationalEvent`). `assertCanAbortOrRestore(pool, …)` executa **antes** de
`pool.connect()`. `loadDetail(pool, …)` executa **depois** do `finally`. A assinatura
`resolveStepAbortIdempotencyReplay(queryable: pg.PoolClient, …)` impede por tipo que alguém passe
o `pool` — `tsc` exit 0 confirma.

### Criterio 8 está de fato coberto? — **Sim**

Não é cobertura por prosa: os dois testes concorrentes obrigatórios da spec executaram com
contenção real entre duas conexões (384 ms e 386 ms no reporter verbose) e o helper de lock não
foi tocado. Permanece a ressalva herdada da Rodada 2: o caso "dispensa primeiro" combina UPDATE
sob lock com o serviço de apontamento e assere a rejeição, em vez de executar dois serviços
completos em paralelo.

### Lacunas reais de cobertura — **sim, e a principal é a camada HTTP**

Ver seção seguinte.

## Ressalvas e o que permanece NÃO verificado

1. **Camada HTTP sem Supertest.** Busca por `steps/.*/(abort|restore-aborted)` em
   `server/src/tests/`: **0 arquivos**. Não existe teste HTTP para `POST …/abort` nem
   `POST …/restore-aborted`. Consequência: o mapeamento 409/400/403/404 → status HTTP nessas duas
   rotas é verificado apenas por **leitura** (`errorHandler.ts:63-64` + `requirePermission` nas
   rotas), nunca por execução. É a maior lacuna desta entrega.
2. **`assertReusedEventMatchesOperation` lança `Error` puro, não `AppError`** — se disparar,
   o cliente recebe **500**, não 409. Só é alcançável numa corrida em que outra TX insira a mesma
   chave em outro nó/esteira entre a guarda e o insert (o lock do STEP alvo não protege isso).
   A integridade está preservada (ROLLBACK garantido, sem mutação parcial), mas o código HTTP
   seria inconsistente com a spec nesse caminho. Defesa em profundidade, não caminho normal.
3. **Prova vermelha não reproduzida por mim** (worktree/checkout/stash proibidos neste papel).
   Aceita como evidência do orquestrador + prova estática própria via `git diff`.
4. **Suíte completa do backend vermelha** (exit **1**, 3 falhas). Verifiquei que são
   pré-existentes e sem relação com abort/restore, mas o repositório **não** tem suíte verde
   ponta a ponta neste banco local.
5. **Lint global vermelho** (exit **1**, 141 problemas), todos pré-existentes; zero nos arquivos
   desta rodada. Inclui `server/dist/**` sendo lintado, o que é ruído evitável.
6. **HML e PRD**: migration `0050` continua **não aplicada**; nada foi verificado nesses
   ambientes. O código de `6ef77209` já está no PR #11 e depende de `0050` para funcionar.
7. **Frontend não reexecutado** (`npm test` / `tsc -b` da raiz). Justificativa: `git status`
   prova que **nada** em `src/` mudou nesta rodada. Risco residual: nulo para esta rodada,
   não-nulo para o conteúdo já publicado em `6ef77209` (coberto pela Rodada 2).
8. **Sem E2E/UI** do modal Dispensar/Restaurar (herdado da Rodada 2).
9. **Log técnico fora do Pino** (ver julgamento acima).
10. **Edge replay × esteira FINALIZADA/CANCELADA** devolve 409 em vez de 200 idempotente
    (ver julgamento acima).
11. **Nit de rastreabilidade:** o implementation report cola `815 insertions` no bloco de
    `git diff --stat`, mas o valor real medido agora é `820 insertions` — o relatório foi
    editado depois de gerar o stat. Não altera nenhuma conclusão.

## Validação manual necessária

- Fluxo do gestor no detalhe da esteira (motivo do catálogo + `OUTRO`, badge **Dispensada**, restore).
- Filas produção/kiosk após dispensa com dados reais.
- Deploy atômico da migration `0050` + app em HML antes de qualquer merge do PR #11.
- Exercitar `POST …/abort` e `POST …/restore-aborted` via HTTP real (curl/Insomnia) conferindo
  400 sem `Idempotency-Key`, 403 sem `conveyors.create`, 404 em STEP inexistente, 409 em chave
  reutilizada e 200 + `meta.stepAbortIdempotent: true` no replay — hoje isso não tem teste.

## Ciclo

Ciclo de correção desta rodada: **1** de 2 (rodada nova, sobre defeitos encontrados após o
commit publicado `6ef77209`).

## Veredito

**PASSA COM RESSALVAS**

### Justificativa

Os **10 critérios de aceite desta rodada estão atendidos**, cada um com evidência executável e
exit code real: `tsc` **0**, 34 testes dirigidos **0**, integração verbosa 17/17 **0**, com prova
de que a integração realmente tocou o banco. As duas correções fazem o que prometem: a guarda de
idempotência roda antes de qualquer mutação e o `PoolClient` é liberado antes de `loadDetail`,
com teste que falha por construção se a ordem regredir. Contrato HTTP, frontend e migration `0050`
comprovadamente intactos.

Não é `PASSA` pleno porque: não existe teste da camada HTTP para as duas rotas desta feature
(ressalva 1); o caminho de defesa `created: false` divergente responderia 500 em vez de 409
(ressalva 2); a suíte completa do backend e o lint global permanecem **vermelhos** por dívidas
pré-existentes (ressalvas 4 e 5); e HML/PRD seguem sem a migration `0050` (ressalva 6).

Não é `REPROVA`: nenhuma falha observada tem relação causal com o código desta rodada, e nenhum
critério de aceite ficou descoberto.

### Governança confirmada nesta revisão

- Revisor não alterou **nenhum** arquivo em `server/src/` ou `src/`.
- Único arquivo escrito: este relatório.
- **Não** houve commit, push, merge, deploy, checkout, stash, reset, clean, worktree.
- **Nenhuma** migration executada em nenhum banco.
- A rodada de correção permanece **não commitada** e **fora** do PR #11.

---
---

# Fotografia histórica — Rodada 2 (anterior ao commit `6ef77209`)

> **Obsoleta.** O conteúdo abaixo foi escrito quando ainda **não** havia commit, push nem PR.
> Hoje existe o commit `6ef77209`, pushado na branch `feature/abortar-atividade-producao` e
> publicado no PR [#11](https://github.com/multivacia/sgp/pull/11). Preservado integralmente
> para rastreabilidade; **não** descreve o estado atual do repositório.

## Escopo revisado

- Spec: `docs/specs/dispensar-atividade-producao-spec.md` (APROVADA PARA IMPLEMENTAÇÃO)
- Inventário: `docs/inventory/abortar-atividade-producao-inventario.md`
- Implementation report: `docs/implementation/dispensar-atividade-producao-implementation-report.md`
- Branch: `feature/abortar-atividade-producao`
- HEAD tip (sem commit da implementação): `276a92ffae2fec58b87c3f646382f83cbf6006b6`
- SHA-base `origin/main`: `34679fd90b5270dc3e8f56c4f9b6f32bedf8815b`
- Ciclo de correção: **2** de 2 (após REPROVA inicial → rodada 2 do `sgp-implementer`)

## Execução da suíte

Reexecução **independente** pelo orquestrador após a rodada 2 (exit codes reais):

| Comando | Exit code | Observação |
|---|---|---|
| `npx tsc -b` (FE) | **0** | |
| `cd server && npx tsc -p tsconfig.json` | **0** | |
| `cd server && npm test -- --run` abort unit + integração + progress + stepOperationalStatus + sequence | **0** | 5 files, **41 passed** |
| `npm test -- --run` stepOperationalStatus FE + filtros tickets planning/conveyor | **0** | 3 files, **26 passed** |
| `npm run lint` (repo inteiro) | não reexecutado nesta rodada | Implementador reportou exit 1 por dívidas pré-existentes; 0 errors nos arquivos da feature |
| `npm test` / `npm run server:test` suíte completa | **não executada** | Subset da spec com evidência; risco residual |

Integração abort usa `describe.skipIf(!hasDb)` e **fail-fast** (`throw`) se `hasDb` e migration `0050` (`aborted_at`) ausente — corrige o early-return silencioso da rodada 1.

## Cobertura dos critérios de aceite

| Critério de aceite | Coberto por teste? | Arquivo do teste |
|---|---|---|
| Migration CHECK + colunas abort | Sim (aplicação local + fail-fast se ausente) | `0050_…sql`; integração |
| Tipos BE/FE + label Dispensada | Sim | `stepOperationalStatus.test.ts` (BE/FE) |
| Transições → ABORTED só origens permitidas | Sim | BE unit |
| COMPLETED → ABORTED → 409 | Sim | integração |
| Esteira FINALIZADA/CANCELADA → 409 | Sim (rodada 2) | integração |
| `isStepClosedForSequence` inclui ABORTED | Sim | sequence + domain |
| Progresso: ABORTED ≠ completed; previsto efetivo exclui | Sim (rodada 2) | `conveyor-progress.service.test.ts` |
| POST abort/restore + Idempotency-Key | Sim (serviço; rotas presentes) | serviço + unit key ausente |
| Key ausente → 400 | Sim (rodada 2) | `conveyor-step-abort.unit.test.ts` |
| Replay mesma key idempotente; key divergente → 409 | Sim | integração |
| Lock compartilhado + concorrência apontamento×dispensa | Sim | integração (2 conexões) |
| Concorrência conclusão×dispensa | Sim | integração |
| Sync plano esteira + work plan → CANCELLED | Sim (rodada 2) | integração |
| Time entries preservadas; block novos | Sim | integração |
| Tickets excluem ABORTED | Sim (rodada 2) | `filterPlanningActivityTicketSources.test.ts` + conveyor print models |
| Restore sem reativar planos | Sim | integração |
| UI só detalhe | Parcial (grep/código; sem E2E) | `EsteiraDetalhePage.tsx` |
| 403 HTTP / 404 HTTP dedicados | Parcial | rotas com `requirePermission`; sem Supertest dedicado |
| Suites completas FE/BE | Não | não executadas |

## Lacunas e regressão não testada

- Suíte completa `npm test` / `npm run server:test` não rodada ponta a ponta.
- Lint global com dívidas pré-existentes (não bloqueante da feature se arquivos novos limpos).
- Sem E2E/UI automatizado do modal Dispensar/Restaurar.
- Sem Supertest HTTP para 403/404 de rota (cobertura no serviço + guards de rota).
- Caso “dispensa primeiro” na concorrência ainda combina UPDATE sob lock + serviço de apontamento (asserta rejeição); caminho feliz abort completo é coberto noutros testes.

## Validação manual necessária

- Fluxo gestor no detalhe da esteira (motivo catálogo + OUTRO, badge, restore).
- Conferir filas produção/kiosk após dispensa em dados reais.
- Deploy atômico migration `0050` + app em HML (fora desta autorização).

## Ciclo

Ciclo atual de correção: **2** de 2.

## Veredito

**PASSA COM RESSALVAS**

### Por quê não PASSA pleno

Suites completas e lint global não foram reexecutados integralmente; cobertura HTTP 403/404 e E2E UI permanecem parciais. Critérios críticos da spec (domínio, lock, concorrência, sync dos dois planos, tickets ABORTED, progresso, fail-fast) estão cobertos com exit code **0** na reexecução independente.

### Governança

- Branch permanece `feature/abortar-atividade-producao`
- Implementação **não commitada** / **não pushada** / sem atualização de PR nesta autorização
- Migration `0050` só em banco local de teste

---
---

# Rodada 4 — fechamento das 3 ressalvas da Rodada 3

> **Nota de leitura sobre a ordem do arquivo.** Esta seção está no **fim** do documento por
> instrução explícita de preservar as rodadas anteriores byte a byte, mas é a **mais recente**
> e **supersede** a Rodada 3 nos pontos que trata. O cabeçalho do topo ("a seção Rodada 3
> descreve o estado atual") ficou desatualizado por esse mesmo motivo; foi mantido intacto
> deliberadamente e não deve ser lido como estado atual.

Revisor: `sgp-test-reviewer`, independente. Relatório do implementador **não** aceito como prova.
Escopo: os **3 itens de decisão humana** derivados do `PASSA COM RESSALVAS` da Rodada 3.

## Identificação Git (verificada por mim)

| Campo | Valor |
|---|---|
| Branch | `feature/abortar-atividade-producao` (`git branch --show-current`) |
| HEAD | `6ef77209` — "feat: dispensar atividade STEP (ABORTED) com lock compartilhado" |
| Estado de `6ef77209` | **JÁ PUBLICADO** no PR [#11](https://github.com/multivacia/sgp/pull/11) |
| Rodadas 3 + 4 | **NÃO commitadas, NÃO pushadas, fora do PR** — apenas na árvore de trabalho |

`git status --short` (exit **0**), executado por mim no início desta revisão:

```text
 M docs/implementation/dispensar-atividade-producao-implementation-report.md
 M docs/test/dispensar-atividade-producao-test-report.md
 M server/src/modules/conveyors/conveyor-step-abort.service.ts
 M server/src/tests/conveyor-step-abort.integration.test.ts
?? server/src/tests/conveyor-step-abort-http.integration.test.ts
?? server/src/tests/conveyor-step-abort.idempotency.unit.test.ts
```

`git diff --name-only` (exit **0**) devolve apenas os 4 arquivos rastreados acima.

### Confirmações negativas (item 6 do pedido) — provadas por `git status`/`git diff`, não por prosa

O conjunto acima é **exaustivo**: um arquivo não listado não foi tocado. Logo, comprovadamente
intactos nesta rodada:

- **`src/` (frontend)** — zero arquivos.
- **`server/migrations/`** — zero arquivos; `0050_conveyor_nodes_step_aborted.sql` intacto.
- **Controller / rotas / schemas** — `conveyorAssignments.controller.ts`,
  `conveyorAssignments.routes.ts`, `conveyors.schemas.ts` intactos. O contrato HTTP desta feature
  **não** mudou na Rodada 4; os testes novos exercitam o contrato já publicado em `6ef77209`.
- `lockConveyorAndStepForUpdate.ts`, `operational-events/*`, `stepAbortReasons.ts`,
  `stepOperationalStatus.ts` — intactos.
- `conveyor-step-abort.unit.test.ts` — intacto (3 testes).

Ou seja: o **único** arquivo de produção alterado na Rodada 4 é
`server/src/modules/conveyors/conveyor-step-abort.service.ts`.

## Comandos que EU executei (exit code real, lido de `$LASTEXITCODE`)

Ambiente: PowerShell/Windows, banco local `sgp` em `localhost` com migration `0050` aplicada.
Rodada deliberadamente enxuta (2 chamadas de shell), com o restante da verificação feita por
**leitura de código** — conforme o pedido.

| # | Comando | Exit code | Saída |
|---|---|---|---|
| 1 | `git status --short; git diff --name-only; git log --oneline -1; git branch --show-current` | **0** | 6 arquivos no escopo (4 M + 2 `??`); HEAD `6ef77209`; branch `feature/abortar-atividade-producao` |
| 2a | `cd server; npx tsc --noEmit -p tsconfig.json` | **0** | sem saída de erro |
| 2b | `cd server; npx vitest run src/tests/conveyor-step-abort.unit.test.ts src/tests/conveyor-step-abort.idempotency.unit.test.ts src/tests/conveyor-step-abort.integration.test.ts src/tests/conveyor-step-abort-http.integration.test.ts --reporter=verbose` | **0** | `Test Files  4 passed (4)` / `Tests  54 passed (54)` / `Duration 15.99s` |

Distribuição real dos 54 (contada no reporter verbose, não estimada): `…unit.test.ts` **3** +
`…idempotency.unit.test.ts` **16** + `…integration.test.ts` **20** + `…-http.integration.test.ts`
**15**.

O `--reporter=verbose` foi usado de propósito: os quatro arquivos usam `describe.skipIf(!hasDb)` ou
guardas equivalentes, e um verde global não distinguiria "passou" de "pulou". A saída lista cada
`it` com duração própria — os dois testes concorrentes obrigatórios da spec aparecem com **333 ms**
e **326 ms** (contenção real entre duas conexões), o teste de pool `max: 1` com **697 ms**, os 15
casos HTTP com IDs de esteira reais criados no banco a cada caso, e o `stderr` mostra o log técnico
`conveyor_step_abort_idempotency_state_mismatch` com UUIDs vindos do Postgres. Execução real
comprovada.

**Não reexecutei** a suíte completa do backend nem o lint global nesta rodada (limite de comandos
acordado). Aceito como válidas as medições do orquestrador e da Rodada 3 e as registro abaixo como
**dívida pré-existente ainda vermelha** — não como verde.

## Mapeamento item → evidência

### Item 1 — `assertReusedEventMatchesOperation` passa a lançar `AppError` 409

| Aspecto | Verificação |
|---|---|
| Tipo do erro | `conveyor-step-abort.service.ts:240-244` — `throw new AppError('Idempotency-Key já utilizada em outra operação.', 409, ErrorCodes.CONFLICT)`. O `Error` puro da Rodada 3 não existe mais no arquivo. |
| Log técnico preservado | `:228-239` — `console.warn(JSON.stringify({ event: 'conveyor_step_abort_reused_event_mismatch', reusedEventId, reusedEventType, reusedConveyorId, reusedNodeId, … }))`, emitido **antes** do throw. Diagnóstico fica no log; a mensagem HTTP continua genérica (não vaza a qual esteira/nó a chave pertence). |
| **ROLLBACK preservado** (item 2 do julgamento pedido) | **Sim, por construção.** As duas chamadas ficam **dentro** do `try` da TX (`:376-380` no abort, `:506-510` no restore). `AppError` estende `Error`, logo é capturada pelo `catch (e)` de `:386-392` / `:516-522`, que executa `client.query('ROLLBACK')` e **re-lança** `e`. O `finally` libera o client. Não há `catch` intermediário que engula o erro entre o throw e esse `catch`. |
| Teste que prova o tipo **e** o rollback | `conveyor-step-abort.idempotency.unit.test.ts:434` `abort: evento reutilizado divergente após criação → 409, log técnico e ROLLBACK` e `:461` idem para restore. Ambos asserem os quatro invariantes: `expect(err).toBeInstanceOf(AppError)`, `toMatchObject({ statusCode: 409, code: 'CONFLICT' })`, `sequence` **contém** `client.query:ROLLBACK` e **não contém** `client.query:COMMIT`. |
| 409 chega ao HTTP | `errorHandler.ts:63-64` — `if (err instanceof AppError) res.status(err.statusCode)`. Com `Error` puro caía no ramo genérico 500; com `AppError` responde 409. |

**Fechado.** Ressalva 2 da Rodada 3 deixa de existir.

### Item 2 — replay legítimo continua 200 mesmo com esteira finalizada depois

Ordem verificada **linha a linha nas duas funções** (era o ponto de maior risco de regressão):

| Função | Sob o lock, a ordem real é |
|---|---|
| `serviceAbortConveyorStep` | `lockConveyorAndStepForUpdate` (`:286`) → lê `current` (`:292`) → **`resolveStepAbortIdempotencyReplay`** (`:296`) → `if (idempotency.replay)` → `COMMIT` sem mutação (`:305-307`) → **`else`**: `assertConveyorAllowsAbort(conveyor.operational_status)` (`:309`) → `ABORTED` duplicado → `canTransitionStepStatus` → `updateConveyorNodeStepAborted` (`:328`) |
| `serviceRestoreAbortedConveyorStep` | lock (`:417`) → `current` (`:423`) → **`resolveStepAbortIdempotencyReplay`** (`:426`) → `if (replay)` → `COMMIT` sem mutação (`:435-437`) → **`else`**: guarda `FINALIZADA`/`CANCELADA` (`:439-448`) → `current !== 'ABORTED'` → transição → `updateConveyorNodeStepRestoreAborted` (`:474`) |

A ordem pedida está **exata nas duas**: consulta da chave → replay 200 → chave incompatível 409
(dentro de `resolveStepAbortIdempotencyReplay`, `:181-187` e `:204-208`) → só no ramo de chave
inexistente/nova a esteira é validada → só depois há mutação.

Ponto crítico que examinei: **a regra de negócio não foi afrouxada.** `assertConveyorAllowsAbort`
não foi removida nem enfraquecida; foi **movida para dentro do `else`**, que é exatamente o ramo
"chave nova". Chave nova em esteira `FINALIZADA`/`CANCELADA` continua 409.

Testes que sustentam cada metade da regra:

| Cenário | Teste | Arquivo |
|---|---|---|
| Replay de abort após finalizar → 200, sem novo efeito | `replay de abort continua 200 mesmo com esteira FINALIZADA após a operação` (`:318`) — assere `replay.idempotent === true`, status ainda `ABORTED`, `countEvents(CONVEYOR_STEP_ABORTED) === 1` | `conveyor-step-abort.integration.test.ts` |
| **Regra preservada** no mesmo teste | mesmo `it`, `:344-355` — insere um **STEP irmão** na esteira já finalizada e assere `rejects.toMatchObject({ statusCode: 409 })` + irmão continua `PENDING`. Este é o assert que impede afrouxamento: prova que a esteira finalizada continua bloqueando operação nova **na mesma TX/esteira** onde o replay foi aceito | idem |
| Replay de restore após finalizar → 200 | `replay de restore continua 200 mesmo com esteira FINALIZADA após a operação` (`:358`) — `REOPENED` mantido, 1 evento `CONVEYOR_STEP_RESTORED` | idem |
| **Regra preservada** no restore | `restore com chave nova em esteira FINALIZADA → 409` (`:390`) — assere 409, STEP segue `ABORTED` e `countEvents(CONVEYOR_STEP_RESTORED) === 0` | idem |
| Teste original **não** foi enfraquecido | `esteira FINALIZADA ou CANCELADA → abort rejeitado 409` (`:297`) continua no arquivo, itera os **dois** status e ainda assere `operational_status === 'PENDING'` depois | idem |
| Mesma regra em unit isolada (sem depender do banco) | `abort replay: esteira FINALIZADA não bloqueia repetição da mesma chave` (`:487`, assere `updateConveyorNodeStepAborted` e `createEvent` **não chamados**) e `abort chave nova: esteira FINALIZADA continua rejeitando 409` (`:518`) | `conveyor-step-abort.idempotency.unit.test.ts` |

**Fechado.** Ressalva 10 da Rodada 3 (edge replay × esteira finalizada) deixa de existir.

### Item 3 — Supertest para `POST …/abort` e `POST …/restore-aborted`

Arquivo novo `server/src/tests/conveyor-step-abort-http.integration.test.ts`, **15 casos**, todos
executados de verdade (aparecem individualmente no reporter verbose do comando 2b):

| HTTP | Caso (`it` real) | Assere que o STEP não mudou? |
|---|---|---|
| 200 | `abort 200: envelope com meta stepAbortIdempotent=false e replay=true` | n/a — assere `ABORTED`, `data.id`, e **1 único** `CONVEYOR_STEP_ABORTED` após o replay |
| 200 | `restore 200: envelope com meta stepRestoreAbortedIdempotent=false e replay=true` | n/a — assere `REOPENED` e **1 único** `CONVEYOR_STEP_RESTORED` |
| 400 | `abort 400: Idempotency-Key ausente` | **Sim** — `PENDING` |
| 400 | `restore 400: Idempotency-Key ausente` | **Sim** — `ABORTED` |
| 400 | `abort 400: Idempotency-Key vazia ou acima de 180 caracteres` (2 requisições) | **Sim** — `PENDING` |
| 400 | `restore 400: Idempotency-Key acima de 180 caracteres` | **Sim** — `ABORTED` |
| 400 | `abort 400: corpo inválido (sem reasonCode)` | **Sim** — `PENDING` |
| 400 | `abort 400: reasonCode fora do catálogo` | **Sim** — `PENDING` |
| 400 | `abort 400: reasonCode OUTRO sem reasonText` | **Sim** — `PENDING` |
| 403 | `abort e restore 403: utilizador autenticado sem conveyors.create` (cobre **as duas** rotas) | **Sim** — `PENDING` |
| 404 | `abort 404: esteira inexistente, STEP inexistente e nó que não é STEP` (3 requisições) | n/a |
| 404 | `restore 404: esteira inexistente, STEP inexistente e nó que não é STEP` (3 requisições) | n/a |
| 409 | `abort 409: transição inválida a partir de COMPLETED` | **Sim** — `COMPLETED` |
| 409 | `abort 409: Idempotency-Key já usada em outra esteira/nó` | **Sim** — `PENDING` no STEP B |
| 409 | `restore 409: STEP que não está ABORTED` | **Sim** — `PENDING` |

Julgamento dos quatro pontos que o pedido levantou sobre a qualidade destes testes:

1. **Casos de erro asseveram não-mutação?** **Sim, em todos onde existe estado a conferir.** Todos
   os 400/403/409 chamam `readStepStatus(...)` no fim e comparam com o valor esperado. Os dois
   casos 404 são a exceção legítima: a esteira/STEP não existe (nada a ler) e o nó `OPTION` não
   carrega `operational_status` de STEP. Além do status, todos os 400/409 asseveram
   `res.body.error.code` (`VALIDATION_ERROR` / `CONFLICT`), o que impede que um 400 acidental de
   outra origem (roteamento, parser) seja lido como sucesso do teste.
2. **O 403 usa utilizador realmente sem `conveyors.create`?** **Sim, e com fail-fast explícito no
   `beforeAll`** — confirmado por leitura (`:129-147`). O `beforeAll` faz um `SELECT` real em
   `app_users`/`app_role_permissions`/`app_permissions` para os **dois** utilizadores e lança se
   (a) o utilizador de governança **não** tiver `conveyors.create`, ou (b) o utilizador do caso 403
   **tiver**, com a mensagem "o teste de negação seria falso-positivo". Isto é exatamente a defesa
   que faltava: sem ela, um RBAC local frouxo transformaria o 403 em teste vazio — que é, aliás, a
   causa raiz das 2 falhas pré-existentes de `system-settings-http.integration.test.ts`. Há também
   fail-fast da migration `0050` (`:96-112`), no mesmo espírito.
3. **O replay é distinguido por `meta.*Idempotent`?** **Sim.** Os dois testes 200 fazem a chamada
   real, asseveram `meta.stepAbortIdempotent === false` / `meta.stepRestoreAbortedIdempotent ===
   false`, repetem com a **mesma** key, asseveram `=== true` e depois contam os eventos no banco
   (`count(*) === 1`). Não é só o flag: a contagem prova que o efeito não foi reaplicado.
4. **A execução é real?** Sim — cada `it` cria uma esteira nova via `serviceCreateConveyor` e a
   coloca em produção; o log `conveyor.create.persisted_nodes` com UUIDs distintos aparece no
   stdout de cada caso.

**Fechado.** Ressalva 1 da Rodada 3 (a mais grave) deixa de existir.

## Verificação das correções da Rodada 3 (não regrediram)

Pedido explícito de checar se a reordenação do item 2 quebrou o que a Rodada 3 consertou:

- **Guarda antes de qualquer mutação:** preservada e, na prática, **reforçada**.
  `resolveStepAbortIdempotencyReplay` continua sendo a **primeira** operação após o lock e a
  leitura de `current`, agora até antes da guarda de esteira. Nenhuma chamada a
  `updateConveyorNodeStep*` ou `cancelLinkedPlanItemsForAbortedStep` ocorre antes dela em nenhum
  dos dois serviços. Coberto por `abort: chave de outro STEP → 409 antes de qualquer mutação`
  (assere `updateConveyorNodeStepAborted` **não chamado** e `createEvent` **não chamado**).
- **Nenhum caminho chama `pool` com o client retido:** auditei as duas funções inteiras de novo.
  Dentro do bloco `try/finally` só há chamadas que recebem `client`
  (`lockConveyorAndStepForUpdate`, `resolveStepAbortIdempotencyReplay`,
  `updateConveyorNodeStep*`, `cancelLinkedPlanItemsForAbortedStep`,
  `serviceCreateConveyorOperationalEvent`). `assertCanAbortOrRestore(pool, …)` roda **antes** de
  `pool.connect()` (`:271` e `:411`); `loadDetail(pool, …)` roda **depois** do `finally` (`:398` e
  `:528`), com comentário explicando o porquê. A assinatura
  `resolveStepAbortIdempotencyReplay(queryable: pg.PoolClient, …)` impede por tipo passar o `pool`
  — `tsc` exit **0**. O novo ramo de replay também fecha com `COMMIT` antes de sair do `try`, então
  não há caminho que retorne com transação aberta.
- **Teste de regressão do deadlock intacto e verde:** `replay de abort e de restore concluem com
  pool dedicado max: 1` (697 ms) + os 4 casos `release antes da primeira consulta de loadDetail`,
  todos passando.
- **Testes concorrentes obrigatórios da spec intactos e verdes:** 333 ms e 326 ms.
  `lockConveyorAndStepForUpdate.ts` não foi tocado (`git status`).

## Algum teste foi ajustado para "fazer passar"?

**Não encontrei nenhum.** Verificação concreta:

- O teste que poderia ter sido enfraquecido para acomodar o item 2 é
  `esteira FINALIZADA ou CANCELADA → abort rejeitado 409`. Ele **continua no arquivo**, ainda itera
  `['FINALIZADA', 'CANCELADA']` e ainda assere `operational_status === 'PENDING'` após a rejeição.
  Nenhum `expect` foi relaxado, nenhum `it` virou `it.skip`.
- Os testes da Rodada 4 são **adições** que apertam a malha (asserção de STEP irmão, contagem de
  eventos, `toBeInstanceOf(AppError)`, fail-fast de RBAC), não relaxamentos.
- Não há `it.skip`, `it.only`, `expect.soft` nem `try/catch` engolindo asserção nos arquivos desta
  rodada.
- Contraexemplo de como um teste **pode** morrer silenciosamente neste repositório está registrado
  em "Achados fora de escopo" abaixo — e os arquivos desta feature **não** têm esse defeito, porque
  usam `describe.skipIf(!hasDb)` (avaliado na coleção com valor já definido no topo do módulo) e
  não `it.skipIf` sobre variável preenchida no `beforeAll`.

## Confronto com a spec (`docs/specs/dispensar-atividade-producao-spec.md`)

A decisão do item 2 **toca uma ambiguidade real da spec**, e é honesto registrar isso:

- §Idempotência, item 3: "**Mesma key** após sucesso → replay idempotente `200` + meta
  `*Idempotent: true`, sem reaplicar efeitos." — **incondicional**, sem ressalva sobre o estado da
  esteira.
- §Comportamento esperado, item 6 e critério de aceite "Dispensa em esteira `FINALIZADA` ou
  `CANCELADA` rejeitada com **409**".

As duas regras colidem **apenas** na janela "abortou com sucesso → esteira foi finalizada → cliente
repete a mesma key por retry de rede". A Rodada 3 resolveu a favor do 409 e registrou como ressalva
10; a Rodada 4 resolve a favor do 200 idempotente.

**Não considero contradição à letra da spec**, e sim escolha entre duas leituras: um replay não
executa dispensa alguma (nenhuma mutação, nenhum evento, nenhum plano cancelado), logo não é "uma
dispensa em esteira finalizada". A leitura oposta também cabia. O que **seria** violação — permitir
dispensa nova em esteira finalizada — está explicitamente barrado e testado nos dois serviços.

Registro formal: **foi decisão humana explícita** desta rodada. **Recomendo atualizar a spec** com
uma linha em §Idempotência do tipo "replay comprovado da mesma key é resolvido **antes** da
validação de `FINALIZADA`/`CANCELADA`; chave **nova** em esteira finalizada permanece 409", para
que a próxima revisão não reabra o mesmo debate nem trate o comportamento atual como desvio.
Enquanto a spec não for atualizada, isto fica como **ressalva de documentação** (ver abaixo).

## Ressalvas da Rodada 3: fechadas × remanescentes

| # (Rodada 3) | Ressalva | Situação após a Rodada 4 |
|---|---|---|
| 1 | Camada HTTP sem Supertest para `…/abort` e `…/restore-aborted` | **FECHADA** — 15 casos cobrindo 400/403/404/409/200 + replays, verdes no comando 2b |
| 2 | `assertReusedEventMatchesOperation` lança `Error` puro → 500 | **FECHADA** — `AppError` 409 `CONFLICT`, ROLLBACK provado em 2 testes unitários |
| 10 | Replay legítimo recebe 409 se a esteira for finalizada depois | **FECHADA** — 200 idempotente, com a regra de negócio preservada e testada |
| 3 | Prova vermelha não reproduzida pelo revisor | **PERMANECE** — worktree/checkout/stash proibidos neste papel; nesta rodada nem prova de terceiro foi produzida |
| 4 | Suíte completa do backend vermelha (3 falhas pré-existentes) | **PERMANECE** — não reexecutada por mim nesta rodada; segue vermelha |
| 5 | Lint global vermelho (141 problemas pré-existentes) | **PERMANECE** — não reexecutado por mim nesta rodada; zero problemas em `conveyor-step-abort*` |
| 6 | HML e PRD sem migration `0050` | **PERMANECE** — nada verificado nesses ambientes |
| 7 | Frontend não reexecutado | **PERMANECE** — justificado: `git status` prova zero alterações em `src/` |
| 8 | Sem E2E/UI do modal Dispensar/Restaurar | **PERMANECE** |
| 9 | Log técnico fora do Pino (`console.warn`) | **PERMANECE** — o item 1 manteve o idioma `console.warn(JSON.stringify(…))`, coerente com o precedente do projeto (`document-draft.controller.ts:96`); dívida de padronização, não bloqueio |
| 11 | Nit: `815` vs `820 insertions` no implementation report | **PERMANECE** (irrelevante para conclusões) |

## Ressalvas novas ou específicas da Rodada 4

1. **Spec desatualizada em relação ao comportamento implementado** (§Idempotência × esteira
   finalizada). Decisão humana registrada aqui, mas a spec normativa ainda não a reflete. Risco:
   uma revisão futura ler o 200 como desvio.
2. **Cobertura HTTP não inclui o cenário `FINALIZADA`.** Os 15 casos Supertest cobrem
   400/403/404/409/200, mas o par "replay 200 em esteira finalizada" / "chave nova 409 em esteira
   finalizada" é testado **só na camada de serviço**. Não é lacuna grave (é a mesma pilha de erro
   já exercitada pelos outros 409 via HTTP), mas o caminho ponta a ponta do item 2 não tem
   asserção HTTP.
3. **Falso-replay benigno, por desenho.** Se o STEP for abortado com a key `K`, restaurado, e
   abortado de novo com `K2`, um retry tardio de `K` encontra `currentStatus = ABORTED` + evento
   compatível e devolve **200 idempotente**, embora o `ABORTED` atual seja obra de `K2`. Nenhuma
   mutação ocorre e a operação original de `K` de fato aconteceu, então é *fail-safe*. Registro
   como comportamento conhecido, não como defeito.
4. **Reordenação muda a mensagem, não o código, em um caso.** Numa esteira finalizada, uma
   requisição com chave pertencente a **outra** operação agora responde "Idempotency-Key já
   utilizada em outra operação" em vez de "esteira finalizada". HTTP continua **409** nos dois
   casos; a spec fecha o código, não o texto. Sem impacto contratual.
5. **Suíte completa e lint não reexecutados por mim nesta rodada** (limite de comandos acordado).
   Sustento o verde apenas dos 4 arquivos da feature + `tsc`.

## O que segue NÃO verificado

- **HML e PRD**: migration `0050` continua **não aplicada**; nada testado nesses ambientes. O
  código já publicado em `6ef77209` **depende** de `0050` — merge do PR [#11](https://github.com/multivacia/sgp/pull/11) sem deploy atômico da migration quebra o
  ambiente.
- Suíte completa do backend e lint global nesta rodada (permanecem vermelhos por dívidas
  pré-existentes segundo a Rodada 3).
- Frontend: `npm test` / `tsc -b` da raiz não executados (zero alterações em `src/` nesta rodada).
- E2E/UI do modal Dispensar/Restaurar; filas produção/kiosk com dados reais.
- Comportamento sob concorrência **entre processos** (só há concorrência entre conexões no mesmo
  processo de teste).

## Achados fora de escopo (não são regressão desta entrega)

1. **Cobertura morta em `server/src/tests/conveyor-step-completion.integration.test.ts`** — o mais
   relevante. `tablesAvailable` é inicializado como `false` no escopo do módulo e só recebe valor
   dentro do `beforeAll`, mas `it.skipIf(!tablesAvailable)` é avaliado na **fase de coleção**, antes
   do `beforeAll`. Resultado: os **5 testes desse arquivo nunca executam** e ainda assim contam como
   "skipped" numa suíte verde. Pré-existente, fora do escopo desta rodada, mas merece ticket próprio:
   é cobertura de conclusão de STEP — vizinha direta desta feature — que está apenas aparentando
   existir. Os arquivos desta feature **não** têm o defeito (usam `describe.skipIf` com valor já
   resolvido no topo do módulo).
2. **3 falhas pré-existentes na suíte completa** (`conveyors.delete.test.ts` por colisão de `DRAFT`
   em `operational_work_plans` com semana sorteada aleatoriamente; 2 de
   `system-settings-http.integration.test.ts` por RBAC do banco local dar permissão ao ADMIN comum).
   Dependem de estado do banco local, não do código desta feature. Nota: o fail-fast de RBAC do novo
   teste HTTP é justamente o antídoto para a classe de problema (2).
3. **`npm run lint` global vermelho**, incluindo `server/dist/**` sendo lintado — ruído evitável.

## Validação manual necessária

- Fluxo do gestor no detalhe da esteira: motivo do catálogo e `OUTRO` com texto, badge
  **Dispensada** com autor/data, restauração.
- Filas produção/kiosk/my-work-queue após dispensa, com dados reais.
- Deploy **atômico** da migration `0050` + aplicação em HML **antes** de qualquer merge do PR #11.
- Não é mais necessário exercitar `…/abort` e `…/restore-aborted` manualmente via curl para os
  códigos 400/403/404/409/200: isso passou a ter teste automatizado (item 3).

## Ciclo

Ciclo de correção: **2** de 2 na linha aberta após `6ef77209` (Rodada 3 = defeitos de
idempotência/conexão; Rodada 4 = fechamento das ressalvas da Rodada 3).

## Veredito

**PASSA COM RESSALVAS**

### Justificativa

Os **3 itens da Rodada 4 estão implementados e provados**, cada um com teste nomeado e exit code
real: `tsc --noEmit` exit **0**; 4 arquivos / **54 testes** passando, exit **0**, com reporter
verbose provando execução real contra o banco (concorrência em 333/326 ms, pool `max: 1` em 697 ms,
15 casos HTTP criando esteiras próprias). As **três ressalvas da Rodada 3 que originaram esta
rodada estão fechadas**: existe teste HTTP para as duas rotas; o `Error` puro virou `AppError` 409
com ROLLBACK provado; e o replay legítimo devolve 200 mesmo com a esteira finalizada depois — **sem**
afrouxar a regra "não dispensar esteira finalizada", que continua 409 e continua testada nos dois
serviços, inclusive com um STEP irmão na mesma esteira já finalizada.

As correções da Rodada 3 **não regrediram**: a guarda de idempotência continua antes de qualquer
mutação (agora até antes da guarda de esteira) e nenhum caminho chama `pool` com o `PoolClient`
retido. Frontend, migrations, controller, rotas e schemas **comprovadamente intactos** por
`git status --short` / `git diff --name-only`.

Não é `PASSA` pleno porque, pelo critério do próprio papel ("suíte verde e todos os critérios
cobertos"), a suíte completa do backend e o lint global **permanecem vermelhos** por dívidas
pré-existentes e **não foram reexecutados por mim nesta rodada**; a migration `0050` segue ausente
em HML/PRD com o código já no PR #11; a spec normativa ainda não reflete a decisão do item 2; e o
cenário `FINALIZADA` do item 2 não tem asserção na camada HTTP.

Não é `REPROVA`: nenhuma falha observada tem relação causal com o código desta rodada, nenhum
critério de aceite ficou descoberto e nenhum teste foi enfraquecido para produzir verde.

### Governança confirmada nesta revisão

- Revisor **não** alterou nenhum arquivo em `server/src/` ou `src/`.
- Único arquivo escrito: **esta seção** deste relatório.
- **Não** houve commit, push, merge, deploy, checkout, stash, reset, clean, worktree.
- **Nenhuma** migration executada em nenhum banco.
- Rodadas 3 e 4 permanecem **não commitadas** e **fora** do PR #11.
