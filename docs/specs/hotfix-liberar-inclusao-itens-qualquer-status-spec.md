# Especificação — Hotfix: liberar inclusão tardia de itens em qualquer status da esteira

> Spec escrita a partir de diretriz humana explícita e detalhada. Branch: `hotfix/liberar-inclusao-itens-qualquer-status`, criada a partir de `origin/main` (SHA `6c2834eeaca631788ed1029185893ba8168ce398`).
> Mapeamento de contexto verificado por `sgp-context-reader` com citação file:line — usar como fonte de verdade dos locais exatos a alterar.

## Demanda

Hoje, "Incluir novo item" (inclusão tardia de setor/atividade na estrutura de uma esteira já existente) só é permitido quando `conveyor.status === 'EM_ANDAMENTO'`. A regra deve mudar para que a operação fique disponível **independentemente do status da esteira**, reaproveitando 100% do fluxo já existente — sem novo endpoint, sem novo componente, sem migration.

## Achados verificados (não redescobrir)

### Dois gates independentes de status (ambos devem mudar)

1. **Frontend** — `src/features/esteiras/conveyorEditSavePolicy.ts:14-18`:
   ```ts
   export function canAppendLateStructureItem(status: ConveyorOperationalStatus): boolean {
     return status === 'EM_ANDAMENTO'
   }
   ```
   Consumida em `src/features/esteiras/ConveyorCreateEditPage.tsx:534-538` (`showLateAppendAction`), que controla a exibição do botão "Incluir novo item" (renderizado em `ConveyorCreateEditPage.tsx:1107-1121`).

2. **Backend** — `server/src/modules/conveyors/conveyor-structure-append.service.ts:874-880`:
   ```ts
   if (conveyor.operational_status !== 'EM_ANDAMENTO') {
     throw new AppError(
       'Inclusão tardia de item só é permitida em esteira em andamento.',
       422,
       ErrorCodes.VALIDATION_ERROR,
     )
   }
   ```

### Gate que NÃO deve ser tocado (flag geral de estrutura)

`canReplaceConveyorStructure` (`conveyorEditSavePolicy.ts:4-8`, permite só `EM_ELABORACAO`/`AGUARDANDO_PLANEJAMENTO`) controla `structureEditLocked` em `ConveyorCreateEditPage.tsx:533`, que protege substituição completa da estrutura (drag&drop, editar/remover setor/atividade, "Bases e extras" — linhas 1104-1191). É uma função **desacoplada** de `canAppendLateStructureItem` — confirmado por leitura, cada uma controla um botão/fluxo diferente. **Não alterar `canReplaceConveyorStructure` nem `structureEditLocked`.** O comentário inline em `conveyorEditSavePolicy.ts:10-13` ("Inclusão tardia... não libera PATCH /structure") documenta essa invariante — deve continuar verdadeira após a mudança (só o valor `EM_ANDAMENTO` sai da checagem de append; o desacoplamento em si permanece).

### Validações a preservar integralmente (todas em `conveyor-structure-append.service.ts`, fora do `if` de status)

- `requireAuth()` + `requirePermission('conveyors.create')` na rota, e `assertCanAppend` (linhas 154-163) revalidando a permissão dentro do service.
- `lockConveyorForUpdate` (linhas 165-257): esteira existe, não deletada, lock `FOR UPDATE`.
- Idempotência: `Idempotency-Key` obrigatório, replay via fingerprint (`assertEventMatchesAppend`, `assertReplayIdsForKind`), 409 em conflito.
- `loadAndAssertParentNode` (linhas 371-422): integridade do nó pai (OPTION para AREA; AREA para STEP).
- `assertUniqueOrderIndices`/`revalidateOption`/`revalidateArea` (linhas 47-76).
- `assertAssigneesValid` (linhas 761-785): colaborador/time ativos e existentes.
- `assertNoSyntheticRollupForAppend` (linhas 711-759).
- Motivo (`reason`): Zod, 3–500 caracteres (`conveyors.schemas.ts:298-306`).
- Transação `BEGIN`/`COMMIT`/`ROLLBACK` com lock.

Nenhuma dessas depende de `operational_status`. **Não tocar.**

### `FINALIZADA`/`CANCELADA`

Confirmado: dentro de `conveyor-structure-append.service.ts` não existe nenhuma trava adicional específica para esses dois status além do `if` genérico de `EM_ANDAMENTO` — hoje eles já são bloqueados só por não serem `EM_ANDAMENTO`, sem lógica diferenciada. Ao remover a dependência de status, `FINALIZADA`/`CANCELADA` passam a aceitar inclusão tardia — **isso é exatamente o pedido explícito do usuário** ("não manter bloqueio automático apenas porque a esteira está FINALIZADA ou CANCELADA"), decisão já tomada, não reabrir.

Outros fluxos que tratam `FINALIZADA`/`CANCELADA` como terminais (`timeEntryBlockedMessage`, `canConveyorAcceptTimeEntry`, mensagens de exclusão/finalização) são **funções completamente separadas**, não tocadas por esta hotfix — apontamento de horas, exclusão e finalização continuam com suas regras próprias intactas.

### Status válidos confirmados (nenhum outro existe no domínio runtime atual)

`EM_ELABORACAO`, `AGUARDANDO_PLANEJAMENTO`, `EM_PLANEJAMENTO`, `A_INICIAR`, `EM_ANDAMENTO`, `FINALIZADA`, `CANCELADA` — fonte: `src/domain/conveyors/conveyor.types.ts:123-130` (frontend) e `server/src/modules/conveyors/conveyorOperationalStatus.ts:6-14` (backend, com CHECK constraint no banco). Status legados (`NO_BACKLOG`, `EM_REVISAO`, `PRONTA_LIBERAR`, `EM_PRODUCAO`, `CONCLUIDA`) só existem para mapeamento de migração de dados antigos, irrelevantes em runtime.

### Componentes que NÃO fazem checagem de status (confirmado, não precisam mudar)

- `LateStructureAppendDrawer.tsx` — não checa status, só valida motivo/seleção/estrutura/alocações.
- `handleOpenLateAppend`/`handleConfirmLateAppend` (`ConveyorCreateEditPage.tsx:686-730`) — não checam status.
- `conveyors.structure-append.controller.ts` — só parse de param/body/header, sem checagem de negócio.
- `postConveyorStructureItemBodySchema` (`conveyors.schemas.ts:340-354`) — sem campo de status.

## Mudança a implementar (diff mínimo)

1. **`src/features/esteiras/conveyorEditSavePolicy.ts`**: remover a dependência de status de `canAppendLateStructureItem`. Preferir remover a checagem de status inteiramente (não enumerar múltiplos status manualmente) — avaliar se a função deve ser removida (e `showLateAppendAction` simplificado para `mode === 'edit' && canAlterConveyor`) ou mantida sempre retornando `true`, decidindo pelo que produzir o diff mais limpo sem quebrar imports/assinatura usada em outros lugares. Atualizar o comentário inline (linhas 10-13) para refletir a nova regra, mantendo explícito que isso **não** libera `canReplaceConveyorStructure`/PATCH `/structure`.
2. **`server/src/modules/conveyors/conveyor-structure-append.service.ts`**: remover o bloco `if (conveyor.operational_status !== 'EM_ANDAMENTO') { throw ... }` (linhas 874-880). Não substituir por outra checagem de status.
3. **Não alterar** `LateStructureAppendDrawer.tsx`, `conveyors.structure-append.controller.ts`, `postConveyorStructureItemBodySchema`, `canReplaceConveyorStructure`, `structureEditLocked`, nem qualquer lógica de apontamento/finalização/exclusão.

## Testes a ajustar

### Backend — `server/src/tests/conveyors-structure-append.integration.test.ts`

- Inverter o teste em torno da linha 306-314 (`'status inválido (não EM_ANDAMENTO) → 422'`): esteira em `EM_ELABORACAO` (status default) deve agora esperar `200`/sucesso, não `422`.
- Adicionar (preferencialmente parametrizado, dado que a suíte já usa um helper `setConveyorProductionStatusForIntegration`) cobertura para: `EM_ANDAMENTO` (regressão — continua funcionando), pelo menos um status anterior (`EM_ELABORACAO` ou `A_INICIAR`), `FINALIZADA`, `CANCELADA`. Reaproveitar os demais testes existentes (idempotência, 403 sem permissão, 400 sem Idempotency-Key, 400 motivo inválido, 409 conflito de payload) sem alterar suas asserções — eles continuam válidos e não dependem de status.

### Frontend — `src/features/esteiras/conveyorEditSavePolicy.test.ts`

- Inverter/ajustar os testes em torno das linhas 135-149: `'permite inclusão tardia só em EM_ANDAMENTO'` e `'bloqueia inclusão tardia fora de EM_ANDAMENTO'` devem refletir a nova regra (permitido em todos os status). Manter/reforçar o teste de que `canReplaceConveyorStructure`/append liberado não são a mesma coisa (linha 146-149) — usar um status onde append=true e replace continua false (ex.: `EM_ANDAMENTO` ou `FINALIZADA`) para provar o desacoplamento continua íntegro.

Não alterar `LateStructureAppendDrawer.test.ts` (não testa status, sem necessidade de mudança).

## Critérios de aceite

- [ ] Backend: inclusão em `EM_ANDAMENTO` continua funcionando (regressão).
- [ ] Backend: inclusão em pelo menos um status anterior a `EM_ANDAMENTO` (`EM_ELABORACAO` ou `A_INICIAR`) funciona.
- [ ] Backend: inclusão em `FINALIZADA` funciona.
- [ ] Backend: inclusão em `CANCELADA` funciona.
- [ ] Backend: validações não relacionadas a status continuam rejeitando corretamente (permissão, idempotência, nó pai inválido, motivo inválido, alocação inválida).
- [ ] Frontend: botão "Incluir novo item" habilitado/exibido independentemente do status (dado `canAlterConveyor` verdadeiro).
- [ ] Frontend: `structureEditLocked`/substituição de estrutura continuam bloqueados nos mesmos status de hoje (`EM_ELABORACAO`/`AGUARDANDO_PLANEJAMENTO` apenas) — sem liberação por efeito colateral.
- [ ] Diff restrito aos dois arquivos de produção citados + testes. Sem novo endpoint, sem novo componente, sem migration.

## Fora de escopo

- Qualquer alteração em `canReplaceConveyorStructure`/`structureEditLocked`.
- Qualquer alteração em apontamento de horas, planejamento, matriz, responsáveis, Kiosk.
- Qualquer alteração de comportamento dos itens após incluídos (encaixe automático, planejamento automático, novo status intermediário).
- Migration (não há necessidade — nenhum campo de schema de banco precisa mudar; a checagem removida é lógica de aplicação, não constraint de banco).
- Merge em `main`, `develop` ou `homol`; deploy; alteração de versão da aplicação.

## Gates obrigatórios

1. Testes direcionados: `conveyors-structure-append.integration.test.ts`, `conveyorEditSavePolicy.test.ts`, `LateStructureAppendDrawer.test.ts`.
2. Suítes relacionadas a esteira/estrutura/detalhe (ex.: `ConveyorCreateEditPage` se houver teste, `conveyors.*`).
3. Typecheck (`tsc -b` frontend, `tsc -p` backend).
4. `npm run build` (frontend) se disponível.
5. Lint — separar explicitamente baseline pré-existente de regressão nova.

Nenhum merge/push além da publicação da branch para revisão, salvo autorização humana posterior.
