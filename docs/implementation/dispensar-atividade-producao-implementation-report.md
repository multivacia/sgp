# Relatório de Implementação — Dispensar atividade (STEP ABORTED)

## Rodada 4 — 409 no reuso de evento, ordem da guarda de idempotência e testes HTTP

Escopo fechado decidido por humano: três itens. Sem alteração de contrato HTTP, controller,
rotas, schemas, catálogo de motivos, migration `0050` ou frontend.

Esta rodada é construída **em cima** da Rodada 3, que também continua **NÃO commitada**.

### Estado de publicação

| Campo | Valor |
|---|---|
| Branch | `feature/abortar-atividade-producao` |
| HEAD | `6ef77209` (publicado no PR [#11](https://github.com/multivacia/sgp/pull/11)) |
| Rodadas 3 e 4 | **NÃO commitadas e NÃO pushadas** — apenas na árvore de trabalho |

### Arquivos alterados nesta rodada

| Arquivo | Tipo |
|---|---|
| `server/src/modules/conveyors/conveyor-step-abort.service.ts` | modificado (Itens 1 e 2) |
| `server/src/tests/conveyor-step-abort.idempotency.unit.test.ts` | modificado (testes dos Itens 1 e 2) |
| `server/src/tests/conveyor-step-abort.integration.test.ts` | modificado (testes do Item 2) |
| `server/src/tests/conveyor-step-abort-http.integration.test.ts` | **novo** (Item 3) |
| `docs/implementation/dispensar-atividade-producao-implementation-report.md` | modificado (este relatório) |

`git status --short` e `git diff --name-only` no encerramento da rodada. Contadores de linha
dos relatórios não são fixados (são auto-referenciais); o conjunto de arquivos é a evidência:

```text
 M docs/implementation/dispensar-atividade-producao-implementation-report.md
 M docs/test/dispensar-atividade-producao-test-report.md
 M server/src/modules/conveyors/conveyor-step-abort.service.ts
 M server/src/tests/conveyor-step-abort.integration.test.ts
?? server/src/tests/conveyor-step-abort-http.integration.test.ts
?? server/src/tests/conveyor-step-abort.idempotency.unit.test.ts
```

`docs/test/dispensar-atividade-producao-test-report.md` aparece como modificado por ser
alteração do revisor herdada da Rodada 3; **não** foi tocado nesta rodada.

### Item 1 — `assertReusedEventMatchesOperation` passa a lançar `AppError` 409

**Antes.** O helper lançava `Error` puro. O `errorHandler` trataria isso como falha interna
(HTTP 500), sugerindo defeito do servidor quando na verdade é conflito de idempotência
previsto pela spec.

**Depois.** O helper emite `console.warn(JSON.stringify({ … }))` com o diagnóstico técnico
(`conveyor_step_abort_reused_event_mismatch`, com tipo/esteira/nó esperados e os do evento
reutilizado, além do `id` do evento) e lança
`AppError('Idempotency-Key já utilizada em outra operação.', 409, ErrorCodes.CONFLICT)`.
Mensagem HTTP genérica, igual à já usada por `resolveStepAbortIdempotencyReplay`; detalhe
só no log técnico. O `catch` das duas funções não mudou: continua fazendo `ROLLBACK` e
rethrow, o que os testes verificam explicitamente (`ROLLBACK` presente, `COMMIT` ausente).

### Item 2 — guarda de idempotência antes da checagem de esteira FINALIZADA/CANCELADA

**Decisão humana implementada:** replay legítimo continua devolvendo 200 mesmo que a esteira
tenha sido finalizada **depois** da operação original.

Ordem sob lock, agora idêntica em `serviceAbortConveyorStep` e
`serviceRestoreAbortedConveyorStep`:

1. `lockConveyorAndStepForUpdate` (inalterado);
2. ler `current` do STEP sob lock;
3. `resolveStepAbortIdempotencyReplay` — replay exato → 200 sem mutação; chave incompatível → 409;
4. no ramo **não-replay**: `assertConveyorAllowsAbort` (abort) / checagem `FINALIZADA`/`CANCELADA`
   (restore) → 409;
5. checagem de estado do STEP e transição;
6. mutação + evento + `COMMIT`.

A regra "não dispensar esteira finalizada" continua intacta: chave nova em esteira
`FINALIZADA`/`CANCELADA` recebe 409. Só o replay comprovado (mesma chave, mesmo tipo, mesma
esteira, mesmo nó, estado do STEP coerente com o fato já registado) devolve 200.

O teste de regressão `esteira FINALIZADA ou CANCELADA → abort rejeitado 409` usa chave
aleatória nova, portanto cai no ramo não-replay e continua passando (verificado).

### Item 3 — testes Supertest das rotas de abort/restore

Novo arquivo `server/src/tests/conveyor-step-abort-http.integration.test.ts`, seguindo o
padrão de `conveyor-assignments-http.integration.test.ts` (`loadDotenvFiles()`,
`describe.skipIf(!hasDb)`, `getPool` + `createApp` + `createLogger('silent')`,
`closePool()` no `afterAll`, cookie via `sessionCookieForUser`, esteira via
`serviceCreateConveyor(minimalConveyorBody(...))` + `firstNodeId`,
`setConveyorProductionStatusForIntegration`), com o fail-fast de migration `0050` copiado de
`conveyor-step-abort.integration.test.ts`.

Fail-fast adicional de RBAC no `beforeAll`: uma query agrega `app_role_permissions` e
verifica que o utilizador de governança **tem** `conveyors.create` e que o utilizador do caso
403 **não** tem. Confirmado por query no banco local antes de escrever o teste: o papel
`COLABORADOR` (Maria, `44444444-…`) tem **zero** permissões, enquanto `ADMIN` tem 35 incluindo
`conveyors.create`. Se o seed local mudar, o `beforeAll` falha em vez de gerar falso-positivo.

15 casos:

| Status | Caso |
|---|---|
| 200 | abort com sucesso (`meta.stepAbortIdempotent === false`) e replay da mesma chave (`true`), com exatamente 1 evento `CONVEYOR_STEP_ABORTED` |
| 200 | restore com sucesso (`meta.stepRestoreAbortedIdempotent === false`) e replay da mesma chave (`true`), com exatamente 1 evento `CONVEYOR_STEP_RESTORED` |
| 400 | abort sem `Idempotency-Key` |
| 400 | restore sem `Idempotency-Key` |
| 400 | abort com `Idempotency-Key` vazia e com >180 caracteres |
| 400 | restore com `Idempotency-Key` >180 caracteres |
| 400 | abort com corpo inválido (sem `reasonCode`) |
| 400 | abort com `reasonCode` fora do catálogo |
| 400 | abort com `reasonCode = 'OUTRO'` sem `reasonText` |
| 403 | abort e restore com utilizador autenticado sem `conveyors.create` |
| 404 | abort: esteira inexistente, STEP inexistente, nó `OPTION` |
| 404 | restore: esteira inexistente, STEP inexistente, nó `OPTION` |
| 409 | abort de STEP `COMPLETED` (transição inválida) |
| 409 | abort com `Idempotency-Key` já usada por outra esteira/nó |
| 409 | restore de STEP que não está `ABORTED` |

Todos os casos de erro asseveram também que o STEP não mudou de estado. O contrato HTTP
observado bateu com a spec: envelope `{ data, meta }`, meta `stepAbortIdempotent` /
`stepRestoreAbortedIdempotent`, `VALIDATION_ERROR` nos 400 e `CONFLICT` nos 409. **Nenhuma
divergência de contrato encontrada**, logo nada foi "consertado" no código de produção.

### Testes de integração de serviço adicionados (Item 2)

Em `server/src/tests/conveyor-step-abort.integration.test.ts` (+ helper local
`setConveyorOperationalStatus`):

| Caso | Assertivas |
|---|---|
| replay de abort com esteira `FINALIZADA` posterior | 2ª chamada com a mesma chave → `idempotent === true`; STEP segue `ABORTED`; exatamente 1 evento; chave **nova** em STEP irmão da mesma esteira finalizada → 409 e STEP irmão segue `PENDING` |
| replay de restore com esteira `FINALIZADA` posterior | 2ª chamada com a mesma chave → `idempotent === true`; STEP segue `REOPENED`; exatamente 1 evento `CONVEYOR_STEP_RESTORED` |
| restore com chave nova em esteira `FINALIZADA` | 409; STEP segue `ABORTED`; zero eventos `CONVEYOR_STEP_RESTORED` |

Em `server/src/tests/conveyor-step-abort.idempotency.unit.test.ts`: os dois casos de evento
reutilizado divergente passaram de `rejects.toThrow(/…/)` para
`toBeInstanceOf(AppError)` + `toMatchObject({ statusCode: 409, code: 'CONFLICT' })` + verificação
do log técnico; e foram acrescentados dois casos sem banco para o Item 2 (replay com esteira
`FINALIZADA` → idempotente sem mutação; chave nova com esteira `FINALIZADA` → 409 sem mutação).

### Evidência real de comandos (Rodada 4)

Shell: PowerShell no Windows; exit code lido de `$LASTEXITCODE`.

`cd server; npx tsc --noEmit -p tsconfig.json`

```text
EXIT=0
```

`cd server; npx vitest run src/tests/conveyor-step-abort.unit.test.ts src/tests/conveyor-step-abort.idempotency.unit.test.ts src/tests/conveyor-step-abort.integration.test.ts src/tests/conveyor-step-abort-http.integration.test.ts`

```text
 RUN  v4.1.2 C:/Users/gustavoalmeida/Documents/sgp-argos/server

 Test Files  4 passed (4)
      Tests  54 passed (54)
   Start at  13:22:59
   Duration  16.94s (transform 5.85s, setup 0ms, import 11.82s, tests 3.19s, environment 1ms)

EXIT=0
```

`cd server; npx vitest run src/tests/conveyor-step-abort-http.integration.test.ts --reporter=verbose` (prova de que o novo arquivo executou de verdade e não foi skipado)

```text
 Test Files  1 passed (1)
      Tests  15 passed (15)
   Start at  13:23:26
   Duration  10.42s (transform 4.28s, setup 0ms, import 9.06s, tests 941ms, environment 0ms)

EXIT=0
```

`cd server; npx vitest run src/tests/conveyor-assignments-http.integration.test.ts src/tests/conveyor-step-completion.integration.test.ts src/tests/conveyor-step-completion-state.test.ts`

```text
 Test Files  2 passed | 1 skipped (3)
      Tests  16 passed | 5 skipped (21)
   Start at  13:23:50
   Duration  11.11s (transform 4.25s, setup 0ms, import 8.69s, tests 1.20s, environment 1ms)

EXIT=0
```

`cd server; npx vitest run src/tests/conveyor-assignments.integration.test.ts src/tests/conveyor-assignments-schemas.test.ts src/tests/conveyor-operational-events.integration.test.ts src/tests/conveyor-lifecycle-return.integration.test.ts src/tests/conveyor-progress.integration.test.ts src/tests/conveyors-patch-structure.integration.test.ts src/tests/conveyorActivitySequence.logic.test.ts`

```text
 Test Files  6 passed | 1 skipped (7)
      Tests  50 passed | 3 skipped (53)
   Start at  13:24:20
   Duration  20.91s (transform 4.35s, setup 0ms, import 14.26s, tests 4.11s, environment 1ms)

EXIT=0
```

Confirmação nominal dos testes de concorrência (item 4 da validação) —
`cd server; npx vitest run src/tests/conveyor-step-abort.integration.test.ts --reporter=verbose --silent`, 20/20 passaram, incluindo:

```text
 ✓ … > concorrência real: apontamento × dispensa (dois vencedores de lock) 355ms
 ✓ … > concorrência real: conclusão × dispensa 306ms
 ✓ … > esteira FINALIZADA ou CANCELADA → abort rejeitado 409 13ms
 ✓ … > replay de abort continua 200 mesmo com esteira FINALIZADA após a operação 28ms
 ✓ … > replay de restore continua 200 mesmo com esteira FINALIZADA após a operação 30ms
 ✓ … > restore com chave nova em esteira FINALIZADA → 409 18ms

 Test Files  1 passed (1)
      Tests  20 passed (20)

EXIT=0
```

Suite completa do backend **não** foi reexecutada nesta rodada (as 3 falhas pré-existentes
fora do escopo — `conveyors.delete.test.ts` e 2 de `system-settings-http.integration.test.ts` —
seguem documentadas na Rodada 3). Typecheck e lint do frontend também não: nenhum arquivo de
`src/` foi tocado.

### Mapeamento item → alteração → teste

| Item | Alteração | Teste |
|---|---|---|
| 1 — reuso de evento vira 409 | `assertReusedEventMatchesOperation` em `conveyor-step-abort.service.ts` | `conveyor-step-abort.idempotency.unit.test.ts`: "abort/restore: evento reutilizado divergente após criação → 409, log técnico e ROLLBACK" |
| 1 — ROLLBACK preservado | `catch` inalterado nas duas funções | mesmos testes: `client.query:ROLLBACK` presente, `COMMIT` ausente |
| 2 — replay antes do status da esteira | guardas movidas para o ramo não-replay em abort e restore | unit: 2 casos `FINALIZADA`; integração: 3 casos (`replay abort`, `replay restore`, `restore chave nova`) |
| 2 — regressão preservada | — | `esteira FINALIZADA ou CANCELADA → abort rejeitado 409` continua verde |
| 3 — rotas HTTP | nenhuma (só teste) | `conveyor-step-abort-http.integration.test.ts`, 15 casos cobrindo 400/403/404/409/200 nos dois endpoints |

### Achados desta rodada

- `server/src/tests/conveyor-step-completion.integration.test.ts` usa
  `it.skipIf(!tablesAvailable)` com `tablesAvailable` atribuído dentro do `beforeAll`. Como
  `it.skipIf` é avaliado na coleção, **antes** do `beforeAll`, os 5 `it` desse arquivo são
  sempre skipados (é o que a saída acima mostra). É exatamente o anti-padrão que o fail-fast
  do arquivo de abort evita. Fora do escopo desta rodada; registrado para decisão humana.

### Governança desta rodada

- **Não** houve `git commit`, `push`, merge, deploy, `checkout`, `stash`, `reset`, `clean` ou `worktree`.
- **Não** houve execução, criação ou alteração de migration em nenhum banco.
- **Não** houve alteração de frontend (`src/`), migration `0050`, catálogo de motivos,
  contrato HTTP, controller, rotas ou schemas.
- `docs/test/dispensar-atividade-producao-test-report.md` **não** foi tocado (é do revisor).
- Rodadas 3 e 4 permanecem **não commitadas** na árvore de trabalho.

---

## Estado atual de publicação (Rodada 3)

| Campo | Valor |
|---|---|
| Repositório | `https://github.com/multivacia/sgp` |
| Branch | `feature/abortar-atividade-producao` |
| Commit anterior **publicado** | `6ef77209` — "feat: dispensar atividade STEP (ABORTED) com lock compartilhado" |
| Pull request | [#11](https://github.com/multivacia/sgp/pull/11) |
| Rodada 3 (correções abaixo) | **NÃO commitada e NÃO pushada** — permanece apenas na árvore de trabalho |

Correção de registro histórico: as seções antigas deste relatório afirmavam que
**não** havia commit/push/PR. Isso valia no momento em que foram escritas (Rodadas 1 e 2),
mas **deixou de valer**: o trabalho das Rodadas 1 e 2 foi commitado em `6ef77209`,
pushado para `origin` e publicado no PR #11. As seções "Identificação Git",
"`git status --short` atual (Rodada 2 …)", "`git diff --stat` (tracked)" e
"Confirmação explícita de governança" abaixo são **fotografia histórica anterior ao commit
`6ef77209`** e não descrevem o estado atual do repositório.

---

## Rodada 3 — correções de idempotência e de retenção de conexão

Escopo fechado: duas correções no backend, sem alteração de contrato HTTP,
catálogo de motivos, UX, frontend, migration `0050` ou regra de negócio da spec.

### Arquivos alterados nesta rodada

| Arquivo | Tipo |
|---|---|
| `server/src/modules/conveyors/conveyor-step-abort.service.ts` | modificado |
| `server/src/tests/conveyor-step-abort.integration.test.ts` | modificado (testes) |
| `server/src/tests/conveyor-step-abort.idempotency.unit.test.ts` | **novo** (testes unitários sem banco) |
| `docs/implementation/dispensar-atividade-producao-implementation-report.md` | modificado (este relatório) |

`git diff --stat` + `git status --short` medidos pelo implementador ao encerrar a
implementação, **antes** de o revisor escrever o relatório de teste. Os contadores deste
próprio relatório são um alvo móvel: ele ainda estava sendo escrito no momento da medição.

```text
 ...sar-atividade-producao-implementation-report.md | 265 +++++++++++++-
 .../conveyors/conveyor-step-abort.service.ts       | 392 +++++++++++++--------
 .../tests/conveyor-step-abort.integration.test.ts  | 305 +++++++++++++++-
 3 files changed, 815 insertions(+), 147 deletions(-)
 M docs/implementation/dispensar-atividade-producao-implementation-report.md
 M server/src/modules/conveyors/conveyor-step-abort.service.ts
 M server/src/tests/conveyor-step-abort.integration.test.ts
?? server/src/tests/conveyor-step-abort.idempotency.unit.test.ts
```

Snapshot autoritativo no gate final da Rodada 3, já incluindo o relatório de teste escrito
pelo revisor. O conjunto de arquivos (`git diff --name-only` + `git status --short`) é
estável e é a evidência que importa; os contadores de linha dos dois relatórios continuam
auto-referenciais e por isso **não** são fixados aqui:

```text
 M docs/implementation/dispensar-atividade-producao-implementation-report.md
 M docs/test/dispensar-atividade-producao-test-report.md
 M server/src/modules/conveyors/conveyor-step-abort.service.ts
 M server/src/tests/conveyor-step-abort.integration.test.ts
?? server/src/tests/conveyor-step-abort.idempotency.unit.test.ts
```

Contadores estáveis, dos arquivos de código e teste (não sofrem auto-referência):

```text
 .../conveyors/conveyor-step-abort.service.ts       | 392 +++++++++++++--------
 .../tests/conveyor-step-abort.integration.test.ts  | 305 +++++++++++++++-
```

Verificação de que o commit `6ef77209` é o que está publicado e que esta rodada **não** foi
pushada (`git ls-remote origin refs/heads/feature/abortar-atividade-producao`, exit 0):

```text
6ef7720914ae6e134f51b0ee17faf2ee0907eda2	refs/heads/feature/abortar-atividade-producao
```

### Correção 1 — validar `Idempotency-Key` antes de qualquer mutação

**Defeito.** A correspondência da chave com tipo/esteira/nó só era verificada dentro do
bloco `if (current === 'ABORTED')` (abort) e `if (current !== 'ABORTED')` (restore).
Com o STEP aberto (`PENDING`/`IN_PROGRESS`/`BLOCKED`/`REOPENED`) e a chave já usada por
outro evento, outra esteira ou outro nó, o fluxo mutava o STEP para `ABORTED`, cancelava
itens de plano, recebia do `serviceCreateConveyorOperationalEvent` o **evento antigo** com
`created: false`, marcava `idempotent = true` e dava `COMMIT` — STEP mutado e planos
cancelados **sem** `CONVEYOR_STEP_ABORTED` gravado.

**Correção.** Novo helper exportado `resolveStepAbortIdempotencyReplay(queryable, input)`
no mesmo arquivo, com semântica:

- chave inexistente → `{ replay: false }`;
- correspondência **exata** de `event_type` + `conveyor_id` + `node_id` e
  `currentStatus === expectedStatusAfterOperation` → `{ replay: true }`;
- correspondência exata mas estado atual incompatível com o fato registado →
  `console.warn` técnico (`conveyor_step_abort_idempotency_state_mismatch`, mesmo padrão de
  `operational-settings.service.ts`) + `AppError` 409 `CONFLICT`, sem mutação;
- qualquer outra combinação (outro tipo, outra esteira, outro nó) → `AppError` 409
  `CONFLICT`, sem mutação.

Chamado nas duas funções **depois** do lock e da checagem de esteira
`FINALIZADA`/`CANCELADA` (ordem preservada — há teste esperando 409 nesse caso) e **antes**
de qualquer mutação. `replay === true` → idempotente + `COMMIT`, sem evento novo e sem
cancelar planos. `replay === false` mantém os 409 já existentes
("Esta atividade já está dispensada." / "A atividade só pode ser restaurada quando estiver
dispensada.") e as mutações como antes.

**Defesa adicional.** Após `serviceCreateConveyorOperationalEvent`, se o resultado vier com
`created: false`, `assertReusedEventMatchesOperation` valida `event_type` + `conveyor_id` +
`node_id`; divergência lança erro e o `catch` existente faz `ROLLBACK`. Aplicado em abort e
restore. O índice único global de `idempotency_key` foi preservado e nenhuma chave nova é
gerada no servidor.

### Correção 2 — liberar o `PoolClient` antes de carregar o detalhe

**Defeito.** Nos caminhos de replay, `return { detail: await loadDetail(pool, …) }` estava
**dentro** do `try`: `loadDetail` pedia uma segunda conexão enquanto o `client` transacional
ainda estava retido, porque `finally { client.release() }` só roda depois de avaliar a
expressão do `return`. Com pool `max: 1` isso trava indefinidamente.

**Correção.** As duas funções passaram a ter **um único ponto de saída** após o `finally`:
transação no `try` (guardando `idempotent` em variável local) → `COMMIT` (ou `ROLLBACK` no
`catch`) → `client.release()` no `finally` → só então `loadDetail(pool, input.conveyorId)`
→ `return { detail, idempotent }`. Os `return` antecipados dos caminhos de replay foram
substituídos por um `if (idempotency.replay) { … } else { … }` com `COMMIT` em cada ramo.
Não sobrou nenhuma chamada ao `pool` dentro do bloco que retém o `client`.

### Testes desta rodada

Novo arquivo `server/src/tests/conveyor-step-abort.idempotency.unit.test.ts` (sem banco,
`vi.mock` + `vi.hoisted` no padrão de `conveyor-delay-events.service.test.ts` e
`operational-capacity.service.test.ts`) — 14 testes:

| Grupo | Cobertura |
|---|---|
| `resolveStepAbortIdempotencyReplay` | chave inexistente → `replay:false`; exata + estado coerente → `replay:true`; exata + estado incoerente → 409 + log; outro `event_type` → 409; outro `conveyor_id` → 409; outro `node_id` → 409; chave de abort usada em restore → 409 |
| Ordem de liberação do client | fake de `pg.Pool`/`PoolClient` com semântica `max: 1` (falha se `pool.query`/`connect` ocorrer com client retido) registrando a sequência; prova `client.release` **antes** da primeira consulta de `loadDetail` no caminho normal **e** no replay, para abort **e** restore |
| Sem mutação no 409 | chave de outro STEP com STEP aberto → 409, sem `updateConveyorNodeStepAborted`, sem criação de evento, com `ROLLBACK` e sem `COMMIT` |
| Defesa `created: false` | evento reutilizado divergente em abort e em restore → erro + `ROLLBACK`, sem `COMMIT` |

Testes de integração adicionados em `server/src/tests/conveyor-step-abort.integration.test.ts`
(mantendo `describe.skipIf(!hasDb)` e o fail-fast de migration `0050`) — 7 novos `it`:

| Caso | Assertivas |
|---|---|
| abort: chave de evento de **outro tipo** no mesmo STEP | 409; STEP segue `PENDING`; item de plano segue `PLANNED`; zero `CONVEYOR_STEP_ABORTED` |
| abort: chave de `CONVEYOR_STEP_ABORTED` de **outro STEP** da mesma esteira | 409; STEP irmão segue `PENDING`; plano `PLANNED`; exatamente 1 evento (o do primeiro STEP) |
| abort: chave de evento de **outra esteira** | 409; STEP da esteira B segue `PENDING`; plano `PLANNED`; zero eventos em B |
| restore: chave do abort reutilizada no restore | 409; STEP permanece `ABORTED`; zero `CONVEYOR_STEP_RESTORED` |
| restore: chave de restore de **outra esteira** | 409; STEP de B permanece `ABORTED`; zero `CONVEYOR_STEP_RESTORED` em B |
| restore: evento de restore existente com estado atual incoerente (`ABORTED`) | 409; STEP permanece `ABORTED`; exatamente 1 `CONVEYOR_STEP_RESTORED` |
| pool dedicado `max: 1` | replay de abort e replay de restore concluem sem timeout (`new pg.Pool({ ...env.pgPoolConfig, max: 1 })`), `idempotent === true`, 1 evento de cada tipo |

Além disso: replay de restore no teste existente passou a assertar **exatamente um**
`CONVEYOR_STEP_RESTORED` (antes só assertava `idempotent === true`).

O caso "abort: replay mesma chave/esteira/STEP com estado `ABORTED` → idempotente,
exatamente um evento" **já estava coberto** pelo `it` existente
"abort → ABORTED + evento + idempotência mesma key" (assere `idempotent:false` na 1ª
chamada, 1 evento, `idempotent:true` na 2ª e 1 evento depois). Não foi duplicado.

### Evidência real de comandos (Rodada 3)

Shell: PowerShell no Windows; exit code lido de `$LASTEXITCODE`.

`cd server; npx tsc --noEmit -p tsconfig.json`

```text
TSC_EXIT=0
```

`cd server; npx vitest run src/tests/conveyor-step-abort.unit.test.ts src/tests/conveyor-step-abort.idempotency.unit.test.ts`

```text
 RUN  v4.1.2 C:/Users/gustavoalmeida/Documents/sgp-argos/server

 Test Files  2 passed (2)
      Tests  17 passed (17)
   Start at  12:50:19
   Duration  2.52s (transform 925ms, setup 0ms, import 1.62s, tests 29ms, environment 0ms)

UNIT_EXIT=0
```

`cd server; npx vitest run src/tests/conveyor-step-abort.integration.test.ts`

```text
 RUN  v4.1.2 C:/Users/gustavoalmeida/Documents/sgp-argos/server

 Test Files  1 passed (1)
      Tests  17 passed (17)
   Start at  12:50:32
   Duration  4.38s (transform 1.19s, setup 0ms, import 1.94s, tests 1.99s, environment 0ms)

INTEG_EXIT=0
```

Reexecução dos três arquivos de abort **depois** da suite completa (confirma que não são
sensíveis a ordem nem ao estado deixado pelas outras suites) —
`cd server; npx vitest run src/tests/conveyor-step-abort.unit.test.ts src/tests/conveyor-step-abort.idempotency.unit.test.ts src/tests/conveyor-step-abort.integration.test.ts`

```text
 Test Files  3 passed (3)
      Tests  34 passed (34)
   Start at  12:55:06
   Duration  4.63s (transform 904ms, setup 0ms, import 1.76s, tests 1.80s, environment 0ms)

RECHECK_EXIT=0
```

Suite completa do backend (evidência extra, além do pedido) — `cd server; npx vitest run`:

```text
 Test Files  2 failed | 119 passed | 5 skipped (126)
      Tests  3 failed | 884 passed | 21 skipped (908)
   Start at  12:51:10
   Duration  186.04s (transform 14.78s, setup 0ms, import 100.61s, tests 34.21s, environment 23ms)

FULL_EXIT=1
```

As 3 falhas **não** são maquiadas e **não** pertencem ao escopo desta rodada. São falhas de
estado do banco local, não do código alterado:

| Falha | Causa | Relação com esta rodada |
|---|---|---|
| `conveyors.delete.test.ts > DELETE com item de planejamento semanal → 409` | `duplicar valor da chave viola a restrição de unicidade "uq_operational_work_plans_week_draft_active"`. O teste sorteia uma semana aleatória de 2026 e insere `operational_work_plans` com status `DRAFT`; `DRAFT` ativos deixados por execuções locais anteriores colidem. | Nenhuma. Os testes desta rodada não inserem em `operational_work_plans` (usam apenas `conveyor_operational_plans`). |
| `system-settings-http.integration.test.ts > ADMIN comum recebe 403 ao listar` | esperado 403, recebido 200 — estado de RBAC do banco local. | Nenhuma. O arquivo não referencia abort/restore. |
| `system-settings-http.integration.test.ts > ADMIN comum não altera SESSION_IDLE_TIMEOUT_MINUTES` | esperado 403, recebido 200 — mesmo estado de RBAC local. | Nenhuma. |

Nenhuma dessas 3 falhas foi corrigida nesta rodada: estão fora do escopo fechado e a
correção exigiria mexer em seed/RBAC local ou em limpeza de dados de teste alheios.

Typecheck do frontend **não** executado: nenhum tipo compartilhado foi afetado
(as alterações são um serviço de backend e dois arquivos de teste de backend).

### Limitação de ambiente — divergência em relação ao esperado

A instrução desta rodada previa que o banco local (`sgp` em `localhost`) **não** tivesse a
migration `0050` aplicada e que o teste de integração falhasse no fail-fast do `beforeAll`.
**Isso não se materializou**: os 17 testes de integração executaram e passaram, o que prova
que `conveyor_nodes.aborted_at` existe no banco local (o fail-fast do `beforeAll` só deixa
passar se a coluna estiver presente). Isso é consistente com o registro histórico da Rodada 1
("Aplicada localmente? Sim — PostgreSQL local descartável").

Nesta rodada **nenhuma** migration foi executada, criada ou alterada, e nenhum banco foi
criado, dropado ou alterado estruturalmente. A execução dos testes de integração escreve
dados de teste no banco local descartável, como já era o comportamento das rodadas
anteriores.

### O que ficou não verificado

- **HML e PRD**: migration `0050` continua **não aplicada**; nada foi verificado nesses
  ambientes.
- **Camada HTTP**: as correções foram validadas no nível de serviço (unit + integração).
  Não há teste Supertest das rotas `POST …/abort` e `POST …/restore-aborted`; o mapeamento
  409 → resposta HTTP segue coberto apenas pelo `errorHandler` genérico.
- **Prova "vermelha" pré-correção**: os novos testes não foram executados contra o código
  de `6ef77209` (isso exigiria checkout/stash, não autorizados nesta rodada). A relação de
  cada teste com o defeito está descrita acima; em particular, o caso "chave de evento de
  outro tipo no mesmo STEP" percorre exatamente o caminho que antes mutava sem auditoria,
  e o fake de pool `max: 1` falha se `loadDetail` rodar com o client retido.
- **Deadlock real com `pg` e `max: 1`** está coberto por pool dedicado na integração e por
  fake de pool no unitário; não foi medido em ambiente com concorrência real de carga.

### Governança desta rodada

- **Não** houve `git commit`, `git push`, `git checkout`, `git stash`, `git reset` ou `git clean`.
- **Não** houve merge nem deploy.
- **Não** houve execução de migration em nenhum banco.
- **Não** houve alteração de contrato HTTP, catálogo de motivos, UX, frontend, migration
  `0050` ou regra de negócio da spec.
- `docs/test/dispensar-atividade-producao-test-report.md` **não** foi alterado (é do revisor).

---

## Fotografia histórica — Rodadas 1 e 2 (anterior ao commit `6ef77209`)

> As seções a seguir descrevem o estado da árvore de trabalho **antes** do commit
> `6ef77209`. Foram preservadas para rastreabilidade e **não** refletem o estado atual:
> naquele momento ainda não havia commit, push nem PR; hoje há commit `6ef77209`, push na
> branch `feature/abortar-atividade-producao` e o PR #11.

## Spec atendida

`docs/specs/dispensar-atividade-producao-spec.md` — dispensar/restaurar atividade `STEP` em esteira liberada (`ABORTED` / rótulo **Dispensada**), com lock compartilhado, sync de planos, UI só no detalhe da esteira.

## Identificação Git

| Campo | Valor |
|---|---|
| Branch | `feature/abortar-atividade-producao` |
| Remoto `origin` | `https://github.com/multivacia/sgp` |
| SHA-base (`origin/main`) | `34679fd90b5270dc3e8f56c4f9b6f32bedf8815b` |
| HEAD (sem commit desta implementação) | `276a92ffae2fec58b87c3f646382f83cbf6006b6` |

### `git status --short` atual (Rodada 2 — pós-correção REPROVA)

```text
 M docs/specs/dispensar-atividade-producao-spec.md
 M server/src/modules/conveyor-progress/conveyor-progress.service.ts
 M server/src/modules/conveyors/conveyor-step-operational.service.ts
 M server/src/modules/conveyors/conveyorActivitySequence.logic.ts
 M server/src/modules/conveyors/conveyorAssignments.controller.ts
 M server/src/modules/conveyors/conveyorAssignments.routes.ts
 M server/src/modules/conveyors/conveyorAssignments.schemas.ts
 M server/src/modules/conveyors/conveyorAssignments.service.ts
 M server/src/modules/conveyors/conveyors.dto.ts
 M server/src/modules/conveyors/conveyors.repository.ts
 M server/src/modules/conveyors/conveyors.service.ts
 M server/src/modules/conveyors/operational-events/conveyor-operational-events.types.ts
 M server/src/modules/conveyors/stepOperationalStatus.ts
 M server/src/modules/my-activities/my-activities.repository.ts
 M server/src/modules/my-work-queue/my-work-queue.repository.ts
 M server/src/modules/my-work-queue/my-work-queue.service.ts
 M server/src/modules/production/production-time-entries.service.ts
 M server/src/modules/production/production-work-queue.rules.ts
 M server/src/modules/production/production-work-queue.service.ts
 M server/src/tests/conveyor-progress.service.test.ts
 M server/src/tests/conveyorActivitySequence.logic.test.ts
 M server/src/tests/stepOperationalStatus.test.ts
 M src/domain/conveyors/conveyor.types.ts
 M src/domain/conveyors/formatConveyorOperationalEvent.ts
 M src/domain/conveyors/operationalEventTaxonomy.ts
 M src/domain/conveyors/stepOperationalStatus.test.ts
 M src/domain/conveyors/stepOperationalStatus.ts
 M src/domain/production/production.helpers.ts
 M src/features/esteiras/EsteiraDetalhePage.tsx
 M src/features/operational-planning/planningCardActions.test.ts
 M src/features/operational-planning/planningCardActions.ts
 M src/features/operational-planning/planningExecutionHelpers.test.ts
 M src/features/operational-planning/planningExecutionHelpers.ts
 M src/features/operational-tickets/activityTicketConveyorSource.ts
 M src/features/operational-tickets/activityTicketPlanningSource.ts
 M src/features/operational-tickets/buildConveyorActivityTicketPrintModels.test.ts
 M src/features/operational-tickets/filterPlanningActivityTicketSources.test.ts
 M src/services/conveyors/conveyorsApiService.ts
?? docs/implementation/
?? server/migrations/0050_conveyor_nodes_step_aborted.sql
?? server/src/modules/conveyors/conveyor-step-abort.service.ts
?? server/src/modules/conveyors/lockConveyorAndStepForUpdate.ts
?? server/src/modules/conveyors/stepAbortReasons.ts
?? server/src/tests/conveyor-step-abort.integration.test.ts
?? server/src/tests/conveyor-step-abort.unit.test.ts
?? src/domain/conveyors/stepAbortReasons.ts
```

### `git diff --stat` (tracked)

```text
 38 files changed, 1041 insertions(+), 83 deletions(-)
```

## Alterações feitas

1. **Migration `0050_conveyor_nodes_step_aborted.sql`**: amplia CHECK com `ABORTED`; colunas `aborted_at`, `aborted_by`, `abort_reason_code`, `abort_reason_text`. Event types sem CHECK de enum no banco.
2. **Domínio BE/FE**: `ABORTED`, predicados (`isStepAborted`, `isStepClosedForSequence`), transições, catálogo de motivos, label **Dispensada**.
3. **Lock compartilhado** `lockConveyorAndStepForUpdate` (esteira → STEP); adaptado em conclusão/reabertura, time entries web/on-behalf e produção, além de abort/restore.
4. **HTTP**: `POST …/abort` e `POST …/restore-aborted` com `Idempotency-Key`, permissão `conveyors.create`, meta idempotente, sync de planos na TX.
5. **Consumidores**: sequência, progresso (previsto efetivo exclui ABORTED), filas, tickets, bloqueio de novos apontamentos.
6. **UI**: apenas `EsteiraDetalhePage` (Dispensar / Restaurar + modal de motivo + badge).
7. **Testes**: unitários + integração (idempotência, 409, restore, sync, concorrência real).

## Rodada 2 — correções pós-REPROVA (sgp-test-reviewer)

Somente lacunas de teste/documentação; sem mudança de contrato HTTP.

| Lacuna | Correção |
|---|---|
| 1. Integração fail-fast | `describe.skipIf(!hasDb)`; se DB ok mas migration 0050 ausente → `throw` no `beforeAll` (não `return` silencioso). Documentado no cabeçalho do arquivo. |
| 2. Esteira FINALIZADA/CANCELADA → 409 | Novo `it` na integração cobrindo ambos os status. |
| 3. Tickets ABORTED | Caso em `filterPlanningActivityTicketSources.test.ts` + filtro conveyor em `buildConveyorActivityTicketPrintModels.test.ts`. |
| 4. Sync `operational_work_plan_items` | Novo `it` assertando `CANCELLED` no item semanal além do plano da esteira. |
| 5. Progresso previsto efetivo | Novo unitário em `conveyor-progress.service.test.ts` (ABORTED ≠ completed; agregado exclui previsto). |
| 6. Idempotency-Key ausente → 400 | Unitário `conveyor-step-abort.unit.test.ts` via `parseIdempotencyKeyHeader`. |

## Migrations

| Item | Valor |
|---|---|
| Arquivo | `server/migrations/0050_conveyor_nodes_step_aborted.sql` |
| Aplicada em HML/PRD? | **Não** |
| Aplicada localmente? | **Sim**, somente em PostgreSQL local descartável da sessão de testes (`PGDATABASE=sgp` local) |

## Critérios de aceite

| Critério | Atendido? | Onde |
|---|---|---|
| Migration CHECK aceita `ABORTED` + colunas abort | Sim | `0050_…sql`; teste integração (fail-fast se ausente) |
| Tipos BE/FE + label Dispensada | Sim | `stepOperationalStatus.ts` (BE/FE); testes unitários |
| Transição só de PENDING/REOPENED/IN_PROGRESS/BLOCKED | Sim | `canTransitionStepStatus`; testes |
| COMPLETED→ABORTED → 409 | Sim | serviço abort; integração |
| Esteira FINALIZADA/CANCELADA → 409 | Sim | `assertConveyorAllowsAbort` + **teste integração Rodada 2** |
| `isStepClosedForSequence` inclui ABORTED | Sim | sequência + progresso |
| Progresso: ABORTED ≠ completed; previsto efetivo exclui | Sim | `conveyor-progress.service.ts` + **teste unitário Rodada 2** |
| POST abort / restore-aborted + Idempotency-Key | Sim | routes/controller/service |
| 400 motivo/key; 403 perm; 404; 409 conflitos | Sim | serviço + **unitário key ausente Rodada 2** |
| Replay mesma key idempotente; key divergente 409 | Sim | integração |
| Lock compartilhado + ordem esteira→STEP→demais | Sim | `lockConveyorAndStepForUpdate` + TXs adaptadas |
| Concorrência apontamento×dispensa e conclusão×dispensa | Sim | integração (2 conexões) |
| Sync planos CANCELLED + cancellation_reason | Sim | abort service; integração + **sync work_plan_items Rodada 2** |
| Time entries preservadas; sem fictício; block novos | Sim | integração |
| Filas/tickets excluem ou não apontam ABORTED | Sim | my-work-queue, production rules + **testes ticket Rodada 2** |
| UI só detalhe; restore limpa abort_* + evento RESTORED; não reativa planos | Sim | EsteiraDetalhePage + serviço |
| Regressão COMPLETE/REOPEN | Sim | integração |

## Evidência reexecutável (Rodada 2)

### Typecheck

| Comando | Exit code |
|---|---|
| `npx tsc -b` (frontend, raiz) | **0** |
| `cd server && npx tsc -p tsconfig.json` | **0** |

### Testes reexecutados nesta rodada

| Comando | Exit code | Resultado |
|---|---|---|
| `npm --prefix server test -- --run src/tests/conveyor-step-abort.unit.test.ts src/tests/conveyor-step-abort.integration.test.ts src/tests/conveyor-progress.service.test.ts` | **0** | 3 files / **15 passed** |
| `npm test -- --run src/features/operational-tickets/filterPlanningActivityTicketSources.test.ts src/features/operational-tickets/buildConveyorActivityTicketPrintModels.test.ts` | **0** | 2 files / **19 passed** |

Saída resumida server (Rodada 2):

```text
 Test Files  3 passed (3)
      Tests  15 passed (15)
```

Inclui integração: FINALIZADA/CANCELADA→409, sync `operational_work_plan_items`, fail-fast migration 0050; unitários: Idempotency-Key ausente, progresso ABORTED.

Saída resumida frontend tickets (Rodada 2):

```text
 Test Files  2 passed (2)
      Tests  19 passed (19)
```

### Evidência histórica (Rodada 1 — ainda válida para demais suites)

| Comando | Exit code |
|---|---|
| `npx vite build` | **0** |
| `npm run server:build` | **0** |
| `npm --prefix server test -- --run src/tests/stepOperationalStatus.test.ts` + integração abort (antes) | **0** |
| `npm --prefix server test -- --run src/tests/conveyorActivitySequence.logic.test.ts` | **0** |
| `npm test -- --run src/domain/conveyors/stepOperationalStatus.test.ts` (+ tickets) | **0** |
| `npm run lint` | **1** (dívidas pré-existentes fora do escopo; scoped feature → 0 errors) |

## Testes não executados / motivo

- Suite completa frontend (`npm test` sem filtro) e suite completa server (`npm run server:test` sem filtro): não rodadas por tempo/ruído; subset obrigatório da spec + lacunas da REPROVA executado com exit 0.
- Testes HTTP end-to-end via Supertest de rotas abort (além do serviço): não adicionados; cobertura via serviço + permissão na rota + unitário de header.

## Riscos residuais

- Deploy precisa ser **atômico** (migration 0050 + app); código que lê `aborted_*` quebra se migration não aplicada. Integração agora **falha** (não passa) se 0050 ausente com DB presente.
- `npm run lint` continua vermelho por dívidas pré-existentes fora do escopo.
- Writers raros de `IN_PROGRESS`/`BLOCKED` permanecem; origens de aborto continuam válidas.
- Envelope HTTP do projeto é `{ data, meta }` (sem `ok: true`); alinhado à conclusão explícita existente.
- Banco local de teste da sessão recebeu migrate+seed; **não** usar esse `.env`/banco fora do isolamento local.

## Confirmação explícita de governança (histórica — válida só até `6ef77209`)

> **Obsoleta.** Valia no fim da Rodada 2. Depois disso o trabalho foi commitado em
> `6ef77209`, pushado e publicado no PR #11. Para o estado atual, ver
> "Governança desta rodada" na seção da Rodada 3.

- **Não** houve `git commit`. *(deixou de valer — commit `6ef77209`)*
- **Não** houve `git push`. *(deixou de valer — branch `feature/abortar-atividade-producao` pushada)*
- **Não** houve criação/atualização de PR. *(deixou de valer — PR #11)*
- **Não** houve merge. *(continua válido)*
- **Não** houve deploy. *(continua válido)*
- Migration **não** aplicada em HML/PRD (apenas Postgres local descartável para testes). *(continua válido)*
