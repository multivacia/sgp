# Relatório de Implementação — SGP+ Web

## Spec atendida
Segundo ciclo de implementação na branch `cursor/time-efficiency-cd76` para alinhar produção web e kiosk ao pedido original do colaborador: remover `Pendente` como terceiro dado principal, exibir `Tempo excedido` somente quando houver excedente real sobre tempo planejado válido e retirar o destaque principal em percentual de cobertura do tempo previsto no kiosk.

## Alterações feitas
- Adicionado helper puro `resolveProductionExceededMinutes` em `src/domain/production/production.helpers.ts` para derivar excedente somente quando `plannedMinutes` é válido e `realizedMinutes` ultrapassa o planejado.
- Atualizada `src/features/production/ProductionWorkQueuePage.tsx` para exibir `Planejado`, `Apontado/Realizado` e `Tempo excedido` apenas quando aplicável, removendo `Pendente` do bloco principal.
- Atualizada `src/features/production/ProductionTimeEntryDialog.tsx` com a mesma lógica visual de `Planejado`, `Apontado/Realizado` e `Tempo excedido` condicional.
- Atualizada `src/features/kiosk/KioskActivityCard.tsx` para remover o anel/percentual grande de cobertura de tempo previsto e apresentar de forma simples `Realizado`, `Planejado` e `Tempo excedido` quando houver.
- Ajustada `src/domain/production/kioskActivityCardLogic.ts` para reutilizar o helper de excedente na regra de justificativa por excesso de tempo, preservando a regra operacional existente.
- Atualizados testes focados em `src/domain/production/production.helpers.test.ts` e `src/domain/production/kioskActivityCardLogic.test.ts`.
- Não houve alteração em backend, `server/src/modules/production/production-time-entries.service.ts`, permissões, schema, migrations, impressão, sequência operacional, justificativa de negócio ou publicação.

## Critérios de aceite
| Critério | Atendido? | Onde |
|---|---|---|
| Produção web não exibe mais `Pendente` como terceiro dado principal; usa `Tempo excedido` quando aplicável. | Sim | `src/features/production/ProductionWorkQueuePage.tsx`, `src/domain/production/production.helpers.ts` |
| Dialog de apontamento idem. | Sim | `src/features/production/ProductionTimeEntryDialog.tsx`, `src/domain/production/production.helpers.ts` |
| Kiosk não destaca percentual grande de tempo previsto e passa a mostrar `Tempo excedido` quando houver. | Sim | `src/features/kiosk/KioskActivityCard.tsx`, `src/domain/production/production.helpers.ts` |
| Produção/kiosk continuam sem eficiência percentual ao colaborador. | Sim | `src/features/kiosk/KioskActivityCard.tsx` (remoção do destaque percentual de cobertura); produção segue sem percentual de eficiência |
| Testes focados cobrindo a derivação de excedente passam. | Sim | `src/domain/production/production.helpers.test.ts`, `src/domain/production/kioskActivityCardLogic.test.ts` |

## Evidência reexecutável
> Saída real capturada nesta execução.

- `npm run test -- --run src/domain/production/production.helpers.test.ts src/domain/production/kioskActivityCardLogic.test.ts`: exit code 0
- `npx tsc -b`: exit code 0
- `npm run lint`: exit code 1

### Saída real — testes focados
```text

> sgp-argos@0.0.0 test
> vitest run --run src/domain/production/production.helpers.test.ts src/domain/production/kioskActivityCardLogic.test.ts


 RUN  v4.1.2 /workspace


 Test Files  2 passed (2)
      Tests  54 passed (54)
   Start at  22:42:58
   Duration  286ms (transform 149ms, setup 0ms, import 202ms, tests 22ms, environment 0ms)
```

### Saída real — `npx tsc -b`
```text
```

### Saída real — `npm run lint`
```text

> sgp-argos@0.0.0 lint
> eslint .


/workspace/server/dist/modules/argos-integration/document-draft.multer.d.ts
  3:143  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  3:148  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  3:191  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/workspace/server/dist/modules/auth/auth.middleware.d.ts
  5:127  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  5:132  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  5:175  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/workspace/server/dist/modules/operational-planning/operational-planning.schemas.d.ts
  49:15  error  'applyConveyorPlanSyncFieldSchema' is defined but only used as a type  @typescript-eslint/no-unused-vars
  59:15  error  'planItemInputSchema' is defined but only used as a type               @typescript-eslint/no-unused-vars

/workspace/server/dist/modules/permissions/permissions.middleware.d.ts
  5:155  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  5:160  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  5:203  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  9:164  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  9:169  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  9:212  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/workspace/server/dist/modules/production/production-auth.middleware.d.ts
   6:137  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   6:142  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   6:185  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  11:143  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  11:148  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  11:191  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/workspace/server/dist/modules/production/production-kiosk.middleware.d.ts
  12:133  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  12:138  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  12:181  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/workspace/server/src/modules/admin-collaborators/admin-collaborators.schemas.ts
  3:7  error  'deletedScope' is assigned a value but only used as a type  @typescript-eslint/no-unused-vars
  4:7  error  'linkedScope' is assigned a value but only used as a type   @typescript-eslint/no-unused-vars

/workspace/server/src/modules/argos-integration/pipeline/bravoCandidateDebugLines.ts
  32:13  error  Unnecessary escape character: \.  no-useless-escape
  58:17  error  Unnecessary escape character: \.  no-useless-escape

/workspace/server/src/modules/argos-integration/pipeline/bravoDebugSanitize.ts
  20:45  error  Unnecessary escape character: \-  no-useless-escape

/workspace/server/src/modules/argos-integration/pipeline/bravoOperationalSanitize.ts
   94:26  error  Unnecessary escape character: \)  no-useless-escape
   94:28  error  Unnecessary escape character: \.  no-useless-escape
  122:15  error  Unnecessary escape character: \.  no-useless-escape
  123:15  error  Unnecessary escape character: \.  no-useless-escape

/workspace/server/src/modules/argos-integration/pipeline/buildDocumentDraftResult.ts
  80:46  error  Unnecessary escape character: \/  no-useless-escape
  80:58  error  Unnecessary escape character: \/  no-useless-escape

/workspace/server/src/modules/argos-integration/pipeline/classifyDocumentLine.ts
  46:13  error  Unnecessary escape character: \)  no-useless-escape
  46:16  error  Unnecessary escape character: \-  no-useless-escape
  74:24  error  Unnecessary escape character: \)  no-useless-escape

/workspace/server/src/modules/argos-integration/pipeline/documentFieldPlausibilityBr.ts
  40:39  error  Unnecessary escape character: \-  no-useless-escape

/workspace/server/src/modules/argos-integration/pipeline/extractDocumentText.ts
  20:7   error  Unexpected control character(s) in regular expression: \x00, \x08, \x0b, \x0c, \x0e, \x1f  no-control-regex
  68:18  error  Unexpected control character(s) in regular expression: \x00, \x08, \x0b, \x0c, \x0e, \x1f  no-control-regex

/workspace/server/src/modules/argos-integration/pipeline/interpretBravoDeterministic.ts
   29:27  error  Unnecessary escape character: \/                    no-useless-escape
   29:37  error  Unnecessary escape character: \/                    no-useless-escape
  144:15  error  Unnecessary escape character: \)                    no-useless-escape
  207:7   error  'entryAt' is never reassigned. Use 'const' instead  prefer-const
  256:52  error  Unnecessary escape character: \/                    no-useless-escape

/workspace/server/src/modules/argos-integration/pipeline/interpretHeuristicBr.ts
  68:44  error  Unnecessary escape character: \-  no-useless-escape
  69:52  error  Unnecessary escape character: \-  no-useless-escape
  70:52  error  Unnecessary escape character: \-  no-useless-escape

... (saída truncada pela captura da ferramenta)
```

## Migrations
Nenhuma. Não houve execução de migration, alteração de schema ou seed.

## Riscos residuais
- `npm run lint` falha no estado atual do repositório por problemas preexistentes fora do escopo desta implementação, inclusive em `server/dist`, `server/src`, `sgp-print-agent` e múltiplas features do frontend.
- Não foram executados testes de backend porque este ciclo não alterou backend nem contrato de API; a validação realizada foi focada no frontend/domínio alterado.
