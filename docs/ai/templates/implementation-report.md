# Relatório de Implementação — SGP+ Web

## Spec atendida
Alinhamento fechado do contrato e do cálculo de eficiência de tempo em `conveyor-progress`, refletindo o contrato no frontend da evolução das esteiras sem introduzir eficiência percentual na produção/kiosk.

## Alterações feitas
- Removido o campo semântico duplicado `classification` do contrato compartilhado de `timeEfficiency`, mantendo `status` como fonte única de classificação em `server/src/shared/conveyorProgressMetrics.ts`.
- Alinhados o DTO backend e os tipos de domínio do frontend para o mesmo contrato em `server/src/modules/conveyor-progress/conveyor-progress.dto.ts` e `src/domain/conveyor-progress/conveyorProgress.types.ts`.
- Ajustados helpers/defaults da tela de evolução para consumir apenas `timeEfficiency.status`, `efficiencyPct`, `deviationMinutes`, `deviationPct` e contadores retornados pela API em `src/domain/conveyor-progress/conveyorProgressDisplay.ts` e `src/features/conveyor-progress/ConveyorProgressPage.tsx`.
- Atualizados testes de backend e frontend para validar o contrato sem `classification` e para explicitar a separação entre status operacional e status de eficiência.
- Não houve alteração em produção web, kiosk, permissões, schema, migrations, impressão/ticket, regras de apontamento/conclusão/sequência/justificativa/publicação.

## Critérios de aceite
| Critério | Atendido? | Onde |
|---|---|---|
| O contrato de `timeEfficiency` retornado por `conveyor-progress` fica alinhado entre shared, DTO backend e tipos de domínio do frontend, sem campos semânticos divergentes entre camadas. | Sim | `server/src/shared/conveyorProgressMetrics.ts`, `server/src/modules/conveyor-progress/conveyor-progress.dto.ts`, `src/domain/conveyor-progress/conveyorProgress.types.ts` |
| O cálculo ponderado no backend considera apenas itens `includedInCalculation = true`, preservando contadores de itens parciais, não iniciados, sem tempo previsto e concluídos sem apontamento. | Sim | `server/src/shared/conveyorProgressMetrics.ts`, `server/src/tests/conveyor-progress-metrics.test.ts`, `server/src/tests/conveyor-progress.service.test.ts` |
| Na tela de evolução, quando `timeEfficiency.efficiencyPct` vier preenchido, a UI exibe percentual, status e desvios coerentes com os valores retornados pela API; quando vier null, a UI não inventa percentual. | Sim | `src/domain/conveyor-progress/conveyorProgressDisplay.ts`, `src/features/conveyor-progress/ConveyorProgressTable.tsx`, `src/features/conveyor-progress/ConveyorProgressSummary.tsx`, `src/features/conveyor-progress/conveyorProgressPage.test.ts` |
| Na tela de evolução, o status da esteira continua vindo de `operationalStatus`, o status da atividade de `status` e o status de eficiência de `timeEfficiency.status`. | Sim | `src/features/conveyor-progress/ConveyorProgressTable.tsx`, `src/features/conveyor-progress/conveyorProgressPage.test.ts` |
| A implementação não adiciona eficiência percentual, classificação de eficiência ou badge de eficiência em produção web/kiosk. | Sim | Nenhum arquivo de produção/kiosk foi alterado; comportamento permaneceu inalterado fora de `conveyor-progress`. |
| Se produção/kiosk exibirem algo novo, limitar a tempo excedido quando aplicável. | Sim | Sem mudança em produção/kiosk. |
| Nenhum arquivo de impressão/PDF/ticket térmico entra no diff. | Sim | `git diff` final não altera arquivos de impressão/PDF/ticket térmico. |
| Nenhuma alteração de permissões, migrations/schema ou regras de apontamento/conclusão/sequência/justificativa/publicação entra no diff. | Sim | `git diff` final restrito a shared/DTO/tipos/helpers/testes de `conveyor-progress` e um teste de ticket que só acompanha o tipo removido. |

## Evidência reexecutável
> Saída real capturada nesta execução.

- `git diff`: anexado na entrega final.
- `npm run lint`: exit code 1
- `npx tsc -b`: exit code 0
- `npx tsc -p tsconfig.json` (server): exit code 0
- `npm test -- --run src/features/conveyor-progress/conveyorProgressPage.test.ts src/features/conveyor-progress/conveyorProgressTablePrint.test.tsx src/features/operational-tickets/activityTicketProgressSource.test.ts`: exit code 0
- `npm run test -- --run src/tests/conveyor-progress-metrics.test.ts src/tests/conveyor-progress.service.test.ts src/tests/conveyor-progress.integration.test.ts` (server): exit code 0

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

/workspace/server/src/modules/argos-integration/pipeline/parseBravoBasicFields.ts
   65:45  error  Unnecessary escape character: \-  no-useless-escape
   70:23  error  Unnecessary escape character: \-  no-useless-escape
  149:22  error  Unnecessary escape character: \-  no-useless-escape
  155:43  error  Unnecessary escape character: \.  no-useless-escape
  161:39  error  Unnecessary escape character: \.  no-useless-escape

/workspace/server/src/modules/conveyors/conveyorNodeWorkload.service.ts
  112:21  error  '_optionOrder' is defined but never used  @typescript-eslint/no-unused-vars
  112:46  error  '_areaOrder' is defined but never used    @typescript-eslint/no-unused-vars
  112:69  error  '_stepOrder' is defined but never used    @typescript-eslint/no-unused-vars
  146:20  error  '_optionOrder' is defined but never used  @typescript-eslint/no-unused-vars
  147:18  error  '_areaOrder' is defined but never used    @typescript-eslint/no-unused-vars

/workspace/server/src/shared/errors/errorHandler.ts
  31:5  error  '_next' is defined but never used  @typescript-eslint/no-unused-vars

/workspace/server/src/tests/conveyors.delete.test.ts
  17:10  error  'AppError' is defined but never used  @typescript-eslint/no-unused-vars

/workspace/server/src/tests/production-time-entries.integration.test.ts
  199:7  error  'unassignedStepId' is assigned a value but never used  @typescript-eslint/no-unused-vars

/workspace/sgp-print-agent/src/http/app.ts
  152:72  error  '_next' is defined but never used  @typescript-eslint/no-unused-vars

/workspace/sgp-print-agent/src/printing/escpos.ts
  33:14  error  Unexpected control character(s) in regular expression: \x00  no-control-regex

/workspace/src/components/AppSidebar.tsx
  316:5  warning  React Hook useMemo has an unnecessary dependency: 'user.permissions'. Either exclude it or remove the dependency array  react-hooks/exhaustive-deps

/workspace/src/components/backlog/StatusBadge.tsx
  34:17  error  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/workspace/src/components/dashboard/charts/ExecutiveDashboardCharts.tsx
  47:61  warning  React Hook useMemo has an unnecessary dependency: 'themeId'. Either exclude it or remove the dependency array  react-hooks/exhaustive-deps

/workspace/src/components/dashboard/charts/OperationalDashboardCharts.tsx
  52:61  warning  React Hook useMemo has an unnecessary dependency: 'themeId'. Either exclude it or remove the dependency array  react-hooks/exhaustive-deps

/workspace/src/components/operational/JustificationSelect.tsx
  227:17  error  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/workspace/src/components/session/SessionIdleWarningHost.tsx
  13:7  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

/workspace/src/components/session/SessionIdleWarningHost.tsx:13:7
  11 |   useEffect(() => {
  12 |     if (!user || !sessionIdle) {
> 13 |       setOpen(false)
     |       ^^^^^^^ Avoid calling setState() directly within an effect
  14 |       return
  15 |     }
  16 |  react-hooks/set-state-in-effect

/workspace/src/components/shell/BravoSidebarBrand.tsx
   5:17  error  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components
  15:17  error  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components
  20:17  error  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/workspace/src/components/shell/FineGridOverlay.tsx
  20:6  warning  React Hook useMemo has an unnecessary dependency: 'themeId'. Either exclude it or remove the dependency array  react-hooks/exhaustive-deps

/workspace/src/components/shell/SgpContextActionsMenu.tsx
  101:7  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

/workspace/src/components/shell/SgpContextActionsMenu.tsx:101:7
   99 |   useLayoutEffect(() => {
  100 |     if (!open) {
> 101 |       setMenuFixedStyle(null)
      |       ^^^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  102 |       return
  103 |     }
  104 |     updateMenuPosition()  react-hooks/set-state-in-effect

/workspace/src/features/colaborador/ApontamentoPage.tsx
  109:6  warning  React Hook useCallback has missing dependencies: 'pathname' and 'presentBlocking'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

/workspace/src/features/conveyor-progress/ConveyorProgressFilters.tsx
   14:14  error  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components
  204:17  error  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/workspace/src/features/conveyor-progress/ConveyorProgressMetricsCells.tsx
  121:17  error  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/workspace/src/features/esteiras/EsteiraDetalhePage.tsx
   509:6  warning  React Hook useCallback has missing dependencies: 'location.pathname' and 'presentBlocking'. Either include them or remove the dependency array  react-hooks/exhaustive-deps
   551:6  warning  React Hook useEffect has missing dependencies: 'location.pathname' and 'presentBlocking'. Either include them or remove the dependency array    react-hooks/exhaustive-deps
  1468:5  warning  React Hook useMemo has an unnecessary dependency: 'operacaoV'. Either exclude it or remove the dependency array                                 react-hooks/exhaustive-deps

/workspace/src/features/esteiras/GestorAtividadeMenu.tsx
  78:7  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

/workspace/src/features/esteiras/GestorAtividadeMenu.tsx:78:7
  76 |   useEffect(() => {
  77 |     if (acao === 'observacao') {
> 78 |       setObsTexto(atividade.observacaoGestor ?? '')
     |       ^^^^^^^^^^^ Avoid calling setState() directly within an effect
  79 |     }
  80 |   }, [acao, atividade.observacaoGestor])
  81 |  react-hooks/set-state-in-effect

/workspace/src/features/esteiras/laboratorio-esteiras/ConfigureMatrixModal.tsx
  43:5  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

/workspace/src/features/esteiras/laboratorio-esteiras/ConfigureMatrixModal.tsx:43:5
  41 |   useEffect(() => {
  42 |     if (!open || !tree) return
> 43 |     setSelectedIds(
     |     ^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  44 |       initialSelectedIds?.length
  45 |         ? new Set(initialSelectedIds)
  46 |         : defaultSelectedActivityIds(tree),  react-hooks/set-state-in-effect

/workspace/src/features/esteiras/nova-esteira/NovaEsteiraComposicaoManual.tsx
  33:17  error  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/workspace/src/features/esteiras/nova-esteira/useNovaEsteiraResponsaveisOptions.ts
  85:6   warning  React Hook useCallback has an unnecessary dependency: 'mockStoreVersion'. Either exclude it or remove the dependency array                                                                                                                                                                                                                                                                            react-hooks/exhaustive-deps
  88:10  error    Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

/workspace/src/features/esteiras/nova-esteira/useNovaEsteiraResponsaveisOptions.ts:88:10
  86 |
  87 |   useEffect(() => {
> 88 |     void load()
     |          ^^^^ Avoid calling setState() directly within an effect
  89 |   }, [load])
  90 |
  91 |   return useMemo(  react-hooks/set-state-in-effect

/workspace/src/features/gestor/ColaboradoresPage.tsx
  999:5  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

/workspace/src/features/gestor/ColaboradoresPage.tsx:999:5
   997 |   useEffect(() => {
   998 |     let cancelled = false
>  999 |     setLoading(true)
       |     ^^^^^^^^^^ Avoid calling setState() directly within an effect
  1000 |     void getCollaboratorCapacityResolved(collaboratorId)
  1001 |       .then((r) => {
  1002 |         if (!cancelled) setData(r)  react-hooks/set-state-in-effect
  1089:5  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

/workspace/src/features/gestor/ColaboradoresPage.tsx:1089:5
  1087 |
  1088 |   useEffect(() => {
> 1089 |     setFormError(null)
       |     ^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  1090 |   }, [fullName, statusOp, sectorId, roleId, avatarUrl, notes])
  1091 |
  1092 |   const sectorOrphan =                                                  react-hooks/set-state-in-effect

/workspace/src/features/gestor/operational-settings/capacity/CapacityOverrideModal.tsx
  52:5  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

/workspace/src/features/gestor/operational-settings/capacity/CapacityOverrideModal.tsx:52:5
  50 |   useEffect(() => {
  51 |     const latest = resolved?.overrides?.[0]
> 52 |     setFrom(latest?.effectiveFrom?.trim() ? latest.effectiveFrom.slice(0, 10) : '')
     |     ^^^^^^^ Avoid calling setState() directly within an effect
  53 |     setTo(latest?.effectiveTo?.trim() ? latest.effectiveTo.slice(0, 10) : '')
  54 |   }, [resolved])
  55 |  react-hooks/set-state-in-effect

/workspace/src/features/gestor/operational-settings/capacity/DefaultCapacityCard.tsx
  37:5  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

/workspace/src/features/gestor/operational-settings/capacity/DefaultCapacityCard.tsx:37:5
  35 |     if (!settings) return
  36 |     const h = minutesToDecimalHours(settings.defaultDailyMinutes)
> 37 |     setHoursStr(String(h).replace('.', ','))
     |     ^^^^^^^^^^^ Avoid calling setState() directly within an effect
  38 |   }, [settings])
  39 |
  40 |   return (  react-hooks/set-state-in-effect

/workspace/src/features/kiosk/KioskActivityCard.tsx
  123:6  warning  React Hook useEffect has a missing dependency: 'item'. Either include it or remove the dependency array. If 'setSessionPct' needs the current value of 'item', you can also switch to useReducer instead of useState and read 'item' in the reducer  react-hooks/exhaustive-deps

/workspace/src/features/kiosk/KioskActivityCards.tsx
  47:5  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

/workspace/src/features/kiosk/KioskActivityCards.tsx:47:5
  45 |   // Ao filtrar ou recarregar, reposiciona no item recomendado visível
  46 |   useEffect(() => {
> 47 |     setCurrentIndex(findInitialKioskCarouselIndex(filtered))
     |     ^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  48 |   }, [search, filtered])
  49 |
  50 |   const safeIndex = Math.min(currentIndex, Math.max(0, filtered.length - 1))  react-hooks/set-state-in-effect

/workspace/src/features/kiosk/KioskPinPad.tsx
  29:5  error    Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `onMustChangePin`, but the source dependencies were [collaborator.id, onSuccess]. Inferred different dependency than source.

/workspace/src/features/kiosk/KioskPinPad.tsx:29:5
  27 |
  28 |   const submit = useCallback(
> 29 |     async (digits: string) => {
     |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 30 |       setLoading(true)
     | ^^^^^^^^^^^^^^^^^^^^^^
> 31 |       setError(null)
     …
     | ^^^^^^^^^^^^^^^^^^^^^^
> 48 |       }
     | ^^^^^^^^^^^^^^^^^^^^^^
> 49 |     },
     | ^^^^^^ Could not preserve existing manual memoization
  50 |     [collaborator.id, onSuccess],
  51 |   )
  52 |  react-hooks/preserve-manual-memoization
  50:5  warning  React Hook useCallback has a missing dependency: 'onMustChangePin'. Either include it or remove the dependency array. If 'onMustChangePin' changes too often, find the parent component that defines it and wrap that definition in useCallback                                                                                                                                                                                                                            react-hooks/exhaustive-deps

/workspace/src/features/operation-matrix/MacroPreviewInlineNameSaveContext.tsx
  20:17  error  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/workspace/src/features/operation-matrix/MacroPreviewInlineNodeName.tsx
   55:3  error    Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

/workspace/src/features/operation-matrix/MacroPreviewInlineNodeName.tsx:55:3
  53 |   const [error, setError] = useState<string | null>(null)
  54 |
> 55 |   draftRef.current = draft
     |   ^^^^^^^^^^^^^^^^ Cannot update ref during render
  56 |   committedNameRef.current = name
  57 |
  58 |   const setEditingState = (next: boolean) => {  react-hooks/refs
   56:3  error    Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

/workspace/src/features/operation-matrix/MacroPreviewInlineNodeName.tsx:56:3
  54 |
  55 |   draftRef.current = draft
> 56 |   committedNameRef.current = name
     |   ^^^^^^^^^^^^^^^^^^^^^^^^ Cannot update ref during render
  57 |
  58 |   const setEditingState = (next: boolean) => {
  59 |     setEditing(next)                               react-hooks/refs
   76:6  warning  React Hook useEffect has a missing dependency: 'setEditingState'. Either include it or remove the dependency array                                                                                                                                                                                                                                                                          react-hooks/exhaustive-deps
  137:5  warning  React Hook useMemo has a missing dependency: 'setEditingState'. Either include it or remove the dependency array                                                                                                                                                                                                                                                                            react-hooks/exhaustive-deps

/workspace/src/features/operation-matrix/OperationMatrixTaskGrid.tsx
  2:1  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/refs')

/workspace/src/features/operation-matrix/useOperationMatrixPreview.ts
  226:3  error  Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

/workspace/src/features/operation-matrix/useOperationMatrixPreview.ts:226:3
  224 |   }, [workingTree, baselineActivitySig, baselineNamesSig, readyTree])
  225 |
> 226 |   workingTreeRef.current = workingTree
      |   ^^^^^^^^^^^^^^^^^^^^^^ Cannot update ref during render
  227 |
  228 |   const model: OperationMatrixMacroPreviewModel | null = useMemo(() => {
  229 |     if (!workingTree || treeState.status !== 'ready') return null  react-hooks/refs

/workspace/src/features/operational-planning/OperationalPlanningPage.tsx
  1217:9  warning  The 'executionOutsidePlanSummary' logical expression could make the dependencies of useMemo Hook (at line 1308) change on every render. To fix this, wrap the initialization of 'executionOutsidePlanSummary' in its own useMemo() Hook  react-hooks/exhaustive-deps
  1223:9  warning  The 'executionOutsidePlanEntries' logical expression could make the dependencies of useMemo Hook (at line 1308) change on every render. To fix this, wrap the initialization of 'executionOutsidePlanEntries' in its own useMemo() Hook  react-hooks/exhaustive-deps
  1223:9  warning  The 'executionOutsidePlanEntries' logical expression could make the dependencies of useMemo Hook (at line 1323) change on every render. To fix this, wrap the initialization of 'executionOutsidePlanEntries' in its own useMemo() Hook  react-hooks/exhaustive-deps

/workspace/src/features/operational-tickets/buildPlanningGroupedTicketPrintItems.test.ts
  107:55  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/workspace/src/features/operational-tickets/thermalTicketPrintDomGuards.test.ts
   22:8   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   27:75  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   33:82  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   37:10  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   46:8   error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   63:28  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   83:28  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  103:28  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  123:28  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  143:28  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/workspace/src/features/production/ProductionTimeEntryDialog.tsx
  52:5  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

/workspace/src/features/production/ProductionTimeEntryDialog.tsx:52:5
  50 |
  51 |   useEffect(() => {
> 52 |     setJustification(emptyJustificationValue())
     |     ^^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  53 |   }, [item.workPlanItemId])
  54 |
  55 |   const minutesValue = parseInt(minutes, 10)  react-hooks/set-state-in-effect

/workspace/src/features/production/ProductionWorkQueuePage.tsx
  46:10  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

/workspace/src/features/production/ProductionWorkQueuePage.tsx:46:10
  44 |
  45 |   useEffect(() => {
> 46 |     void load()
     |          ^^^^ Avoid calling setState() directly within an effect
  47 |   }, [load])
  48 |
  49 |   const handleTimeEntrySuccess = useCallback(() => {  react-hooks/set-state-in-effect

/workspace/src/features/production/RequireProductionSession.tsx
  20:3  error  Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

/workspace/src/features/production/RequireProductionSession.tsx:20:3
  18 |   const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  19 |   const logoutRef = useRef(logout)
> 20 |   logoutRef.current = logout
     |   ^^^^^^^^^^^^^^^^^ Cannot update ref during render
  21 |
  22 |   useEffect(() => {
  23 |     if (!isAuthenticated) return  react-hooks/refs

/workspace/src/features/support/SupportTicketReadonlyDialog.tsx
  26:7  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

/workspace/src/features/support/SupportTicketReadonlyDialog.tsx:26:7
  24 |   useEffect(() => {
  25 |     if (!open || !ticketId) {
> 26 |       setTicket(null)
     |       ^^^^^^^^^ Avoid calling setState() directly within an effect
  27 |       setError(null)
  28 |       return
  29 |     }  react-hooks/set-state-in-effect

/workspace/src/features/weekly-agenda/components/WeeklyAgendaBacklogCard.tsx
  1:1  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/refs')

/workspace/src/features/weekly-agenda/components/WeeklyAgendaBatchQueueOverlay.tsx
  55:5  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

/workspace/src/features/weekly-agenda/components/WeeklyAgendaBatchQueueOverlay.tsx:55:5
  53 |
  54 |   useEffect(() => {
> 55 |     setQueueIds(items.map((i) => i.activityNodeId))
     |     ^^^^^^^^^^^ Avoid calling setState() directly within an effect
  56 |     setCompletedCount(0)
  57 |     setAltOpen(false)
  58 |     setSelectedCollaboratorId(null)  react-hooks/set-state-in-effect

/workspace/src/features/weekly-agenda/components/WeeklyAgendaCell.tsx
  1:1  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/refs')

/workspace/src/features/weekly-agenda/components/WeeklyAgendaDayTabs.tsx
  1:1  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/refs')

/workspace/src/features/weekly-agenda/components/WeeklyAgendaPlanCard.tsx
  1:1  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/refs')

/workspace/src/features/weekly-agenda/weeklyAgendaBatchQueue.test.ts
  177:31  error  '_lk' is defined but never used  @typescript-eslint/no-unused-vars

/workspace/src/lib/errors/SgpErrorPresentation.tsx
  201:17  error  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components
  210:17  error  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

/workspace/src/lib/errors/sgpClientLog.ts
  39:3  warning  Unused eslint-disable directive (no problems were reported from 'no-console')

/workspace/src/lib/shell/shell-function-context.tsx
   21:17  error  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components                                                                                                                                                                                                                                                                react-refresh/only-export-components
  167:22  error  Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

/workspace/src/lib/shell/shell-function-context.tsx:167:22
  165 |     <ShellFunctionContext.Provider value={value}>
  166 |       {children}
> 167 |       {confirmDialog({
      |                      ^
> 168 |         open: confirmOpen,
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^
> 169 |         target: pendingTarget,
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^
> 170 |         onConfirm: handleConfirm,
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^
> 171 |         onCancel: handleCancel,
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^
> 172 |       })}
      | ^^^^^^^^ Cannot access ref value during render
  173 |       <TransientLeaveConfirmDialog
  174 |         open={pathConfirmOpen}
  175 |         onConfirm={handlePathConfirm}  react-hooks/refs
  182:17  error  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components                                                                                                                                                                                                                                                                react-refresh/only-export-components

/workspace/src/lib/shell/transient-context.tsx
  68:17  error  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components                                                                                                                                                                                                            react-refresh/only-export-components
  80:17  error  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components                                                                                                                                                                                                            react-refresh/only-export-components
  88:3   error  Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

/workspace/src/lib/shell/transient-context.tsx:88:3
  86 |   const isDirtyRef = useRef(opts.isDirty)
  87 |   const onResetRef = useRef(opts.onReset)
> 88 |   isDirtyRef.current = opts.isDirty
     |   ^^^^^^^^^^^^^^^^^^ Cannot update ref during render
  89 |   onResetRef.current = opts.onReset
  90 |
  91 |   useEffect(() => {  react-hooks/refs
  89:3   error  Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

/workspace/src/lib/shell/transient-context.tsx:89:3
  87 |   const onResetRef = useRef(opts.onReset)
  88 |   isDirtyRef.current = opts.isDirty
> 89 |   onResetRef.current = opts.onReset
     |   ^^^^^^^^^^^^^^^^^^ Cannot update ref during render
  90 |
  91 |   useEffect(() => {
  92 |     const id = opts.id                     react-hooks/refs

/workspace/src/mocks/nova-esteira-composicao.ts
  179:7  error  'pendencias' is never reassigned. Use 'const' instead  prefer-const

/workspace/src/pages/BacklogPage.tsx
  272:6  warning  React Hook useCallback has missing dependencies: 'location.pathname', 'location.search', and 'presentBlocking'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

✖ 137 problems (114 errors, 23 warnings)
  2 errors and 6 warnings potentially fixable with the `--fix` option.
```

### Saída real — `npx tsc -b`
```text
```

### Saída real — `npx tsc -p tsconfig.json` (server)
```text
```

### Saída real — frontend focado
```text

> sgp-argos@0.0.0 test
> vitest run --run src/features/conveyor-progress/conveyorProgressPage.test.ts src/features/conveyor-progress/conveyorProgressTablePrint.test.tsx src/features/operational-tickets/activityTicketProgressSource.test.ts


 RUN  v4.1.2 /workspace


 Test Files  2 passed (2)
      Tests  10 passed (10)
   Start at  22:34:27
   Duration  695ms (transform 330ms, setup 0ms, import 507ms, tests 165ms, environment 0ms)
```

### Saída real — server focado
```text

> sgp-server@0.0.1 test
> vitest run --run src/tests/conveyor-progress-metrics.test.ts src/tests/conveyor-progress.service.test.ts src/tests/conveyor-progress.integration.test.ts


 RUN  v4.1.2 /workspace/server


 Test Files  2 passed | 1 skipped (3)
      Tests  14 passed | 3 skipped (17)
   Start at  22:34:27
   Duration  3.74s (transform 2.39s, setup 0ms, import 3.23s, tests 22ms, environment 0ms)
```

## Migrations
Nenhuma. Não houve execução de migration, alteração de schema ou seed.

## Riscos residuais
- `npm run lint` falha no estado atual do repositório por problemas preexistentes fora do escopo desta spec, inclusive em `server/dist`, `server/src`, `sgp-print-agent` e múltiplas features do frontend/produção/kiosk.
- O contrato novo remove `classification`; qualquer consumidor externo fora deste repositório que dependesse desse campo precisará se alinhar ao contrato atual baseado em `timeEfficiency.status`.
