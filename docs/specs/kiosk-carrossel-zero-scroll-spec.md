# Especificação — Kiosk: carrossel de atividades sem scroll (zero-scroll)

> Spec gerada por `sgp-feature-spec-writer`, a partir do veredito **SEGUIR COM AJUSTES** do `sgp-impact-analyst`.
> Decisões de produto confirmadas pelo usuário em `2026-09-06`. Não reabrir.
> Aprovada para implementação por `sgp-implementer`.

## Demanda

Redesenhar a tela de atividades do Kiosk (SGP+ Produção / Modo Fábrica) em modo carrossel — sem alterar o modo lista — para eliminar scroll vertical em zoom 100% nas resoluções 1024×768, 1280×1024 e 1920×1080, movendo toda a interação de registro (presets, evolução, alertas bloqueantes, justificativa, conclusão e botão de registrar) para um bottom sheet.

## Decisões incorporadas (não reabrir)

| Tema | Definição |
|---|---|
| Escopo de zero-scroll | Somente modo carrossel (`viewMode === 'carousel'`). Modo lista fora de escopo. |
| Local dos bloqueantes | Alertas de fora-de-sequência, justificativa de tempo excedido e campo de justificativa ficam **dentro** do bottom sheet, junto ao botão "Registrar Apontamento". |
| Header a simplificar | Somente `KioskActivityCards.tsx` (linhas ~84–160). Não estender a `KioskCollaboratorGrid`/`KioskPinPad`/`KioskChangePin`. |
| Fonte do scroll atual | Wrapper por slide `<div className="h-full min-w-full overflow-y-auto">` em `KioskActivityCards.tsx:210`. |
| Reaproveitar sem duplicar | `ProgressRing` (`KioskActivityCard.tsx:47-92`), presets `[15,30,45,60]` (`:33`, `:422-438`), input customizado (`:439-453`), toggle concluir (`:518-534`), botão registrar (`:545-559`), estado de sucesso com `setTimeout(3000)` (`:206-211` da versão atual). |
| Lógica pura intocável | `src/domain/production/kioskActivityCardLogic.ts` e `src/domain/production/kioskWorkQueueUi.ts` — nenhuma função alterada, nenhuma nova função nesses arquivos. |
| Isolamento kiosk/produção | Proibido importar `src/features/shell/QuickTimeEntryDrawer.tsx` ou componentes de UI de `src/features/shell/`. O import de tipo/lógica pura já existente de `../shell/quickTimeEntryDrawerLogic` (`JustificationFieldValue`, `emptyJustificationValue`) é mantido como está — não expandir. |
| Sem componente genérico | Não criar bottom sheet/progress ring em `src/components/`; ficam locais a `src/features/kiosk/`. |
| Sem backend | Nenhuma mudança de contrato de API, service, migration ou teste de backend. |
| Padrão de teste | `renderToStaticMarkup` + Vitest (sem `@testing-library/react`), conforme `src/features/esteiras/ConveyorHealthAnalysisCard.test.ts`. |
| Zero-scroll real | Critério de aceite **manual** (não verificável por Vitest/`renderToStaticMarkup`, que não mede altura de viewport). |
| Touch target | Botões do grid 2x2 ≥ 50×50px. |

## Decisões técnicas fechadas nesta spec

1. **Portal obrigatório para o sheet.** O track do carrossel usa `transform: translateX(...)`, o que cria um novo *containing block* para descendentes `position: fixed`. O bottom sheet deve ser montado via `createPortal(..., document.body)`, chamado no ponto de uso dentro de `KioskActivityCard.tsx` — nunca dentro do próprio componente do sheet.
2. **Testabilidade do portal.** `KioskRegisterSheet.tsx` deve ser puramente apresentacional e **não** chamar `createPortal` internamente (limitação de SSR do React com portais). A chamada `createPortal` fica isolada em `KioskActivityCard.tsx`, condicionada a `sheetOpen`.
3. **Navegação do carrossel travada com sheet aberto.** Enquanto qualquer sheet estiver aberto, `prev`/`next` (setas, dots, swipe touch) ficam desabilitados/no-op. `KioskActivityCard` recebe `onSheetOpenChange?: (open: boolean) => void`; `KioskActivityCards` guarda `isAnySheetOpen` local. Estado de formulário (`preset`, `minutesCustom`, `sessionPct`, `markAsDone`, justificativa, `submitting`, `error`, `success`, `confirmLowPct`) permanece 100% local a cada `KioskActivityCard`.
4. **`confirmLowPct`** migra junto para dentro do `KioskRegisterSheet` (overlay sobre a área do sheet, não sobre a tela inteira).
5. **Sem hook de responsividade novo.** As 3 resoluções-alvo são atendidas com Flexbox/CSS já usados no projeto. Não criar `useKioskResponsive`.
6. **Header de `KioskActivityCards.tsx` em linha única** nas 3 resoluções-alvo (reduzir paddings/fonte/avatar/busca), sem remover nenhum controle (avatar, nome, contagem, busca, alternador carrossel/lista, "Sair"); remover `flex-wrap` do container do header.
7. **Wrapper por slide mantém `overflow-y-auto`** como rede de segurança estrutural (não trocar por `overflow-hidden`, que cortaria conteúdo silenciosamente). A correção real é o redesenho do card caber nas 3 resoluções sem a barra aparecer — validado manualmente.
8. **CTA do card ≠ CTA de submit.** O card em repouso mostra um único botão que abre o sheet; o botão de submit real migra para dentro do `KioskRegisterSheet`, mantendo `disabled={submitting || !canSubmit}`.
9. **Badges/alertas curtos (uma linha) permanecem no card:** `sequenceBadge`, `plannedTimeHint`, aviso `!canTrackTime`, `sequenceHint`. **Migram para o sheet** os blocos de alerta com múltiplas linhas/lista: excesso de tempo e fora de sequência com lista de atividades pendentes.

## Comportamento esperado

1. `KioskActivityCards.tsx`: header reorganizado para caber em uma linha, sem remover controles existentes.
2. `KioskActivityCards.tsx`: lógica de filtragem/particionamento (`kioskWorkQueueUi.ts`) intocada.
3. `KioskActivityCards.tsx`: ganha controle de "sheet aberto" para desabilitar navegação de slide.
4. `KioskActivityCard.tsx`: quando `item.canTrackTime` é falso, mantém bloco atual inalterado — sem CTA, sem sheet.
5. `KioskActivityCard.tsx`: quando `item.canTrackTime` é verdadeiro, renderiza card compacto (badges curtos + `ProgressRing` redimensionado + metadados) e **um** CTA que abre `KioskRegisterSheet` via `createPortal`.
6. `KioskRegisterSheet.tsx` (novo): recebe via props todo o estado/handlers existentes em `KioskActivityCard` — renderiza header (título + fechar), grid 2x2 de presets + input "outro", slider de `sessionPct`, alertas bloqueantes migrados, `JustificationSelect` condicional, toggle "Concluir atividade ao registrar", erro inline, CTA de submit, diálogo `confirmLowPct`.
7. Grid de presets: `grid grid-cols-2 gap-2` fixo, 4 botões com altura/largura ≥ 50px (corrigir `min-h-12` = 48px para ≥ 50px).
8. Fechar o sheet (X ou backdrop) **não** reseta campos preenchidos — só submit bem-sucedido reseta via `resetTimeEntryFields()` existente.
9. Estado de sucesso (`setTimeout` 3000ms) permanece como `return` antecipado de `KioskActivityCard`, fechando visualmente o sheet ao deixar de montar o portal. Timing inalterado.
10. Nenhuma função de `kioskActivityCardLogic.ts`/`kioskWorkQueueUi.ts` é criada, removida ou alterada.

## Critérios de aceite

### Testáveis via Vitest / `renderToStaticMarkup`

- [ ] `KioskRegisterSheet` renderiza, quando `needsExcessTimeJustification=true`, o alerta de tempo acima do previsto.
- [ ] `KioskRegisterSheet` renderiza, quando `needsOosJustification=true`, o alerta de fora de sequência e a lista de atividades pendentes.
- [ ] `KioskRegisterSheet` renderiza `JustificationSelect` somente quando `needsOperationalJustification=true`.
- [ ] `KioskRegisterSheet` renderiza o toggle "Concluir atividade ao registrar" somente quando `item.canCompleteStep=true`.
- [ ] `KioskRegisterSheet` renderiza o botão de submit com `disabled` presente quando `submitting || !canSubmit`.
- [ ] `KioskRegisterSheet` contém grid com exatamente 4 botões de preset em 2 colunas, nenhum com altura conhecida < 50px.
- [ ] `KioskActivityCard` com `item.canTrackTime=true` contém `ProgressRing` e metadados, e não contém mais os alertas grandes/presets/slider no HTML estático do próprio card.
- [ ] `KioskActivityCard` com `item.canTrackTime=false` mantém inalterado o bloco "Apontamento não disponível" e não renderiza CTA de sheet.
- [ ] `KioskActivityCards`: header não usa `flex-wrap`.
- [ ] Estado de sucesso do card continua exibindo "Apontamento registrado!" inalterado.
- [ ] Diff não altera `kioskActivityCardLogic.ts` nem `kioskWorkQueueUi.ts`.

### Validação manual obrigatória

- [ ] Em 1024×768, 1280×1024 e 1920×1080, zoom 100%, modo carrossel, sheet fechado: sem scroll vertical em nenhum cenário (item sem avisos, item fora de sequência com lista, item com hint de tempo, título longo).
- [ ] Header em uma única linha nas 3 resoluções.
- [ ] Nenhum conteúdo cortado.
- [ ] 4 botões do grid medem ≥ 50×50px na prática.
- [ ] Sheet abre corretamente ancorado ao viewport (não deslocado pelo `transform` do carrossel).
- [ ] Com sheet aberto, swipe/setas não trocam de atividade; fechar restaura navegação.
- [ ] Fluxo completo (bloqueio fora de sequência, justificativa obrigatória, `ProgressRing`, avanço automático pós-sucesso, `confirmLowPct`) continua funcionando.

## Testes a adicionar/manter

- **Novo:** `src/features/kiosk/KioskRegisterSheet.test.ts`
- **Novo:** `src/features/kiosk/KioskActivityCard.test.ts`
- **Opcional:** `src/features/kiosk/KioskActivityCards.test.ts`
- **Manter inalterados:** `src/domain/production/kioskActivityCardLogic.test.ts`, `src/domain/production/kioskWorkQueueUi.test.ts`.
- Nenhum teste de backend.

## Fora de escopo

- Modo lista do kiosk.
- `KioskCollaboratorGrid.tsx`, `KioskPinPad.tsx`, `KioskChangePin.tsx`, `KioskPage.tsx`.
- Qualquer mudança de contrato de API/backend/migrations.
- `src/features/shell/QuickTimeEntryDrawer.tsx` ou telas do app principal.
- Alterar `kioskActivityCardLogic.ts` / `kioskWorkQueueUi.ts`.
- Hook de responsividade dedicado.
- Componente de bottom sheet/progress ring genérico em `src/components/`.
- Timing de 3000ms do estado de sucesso.
- Tamanho de toque dos botões ← → e "Sair" (pré-existentes, fora do requisito explícito).

## Arquivos a modificar/criar

- `src/features/kiosk/KioskActivityCards.tsx` — MODIFICAR
- `src/features/kiosk/KioskActivityCard.tsx` — MODIFICAR
- `src/features/kiosk/KioskRegisterSheet.tsx` — CRIAR
- `src/features/kiosk/KioskActivityCard.test.ts` — CRIAR
- `src/features/kiosk/KioskRegisterSheet.test.ts` — CRIAR
- `src/features/kiosk/KioskActivityCards.test.ts` — CRIAR (opcional)

## Impacto por perfil

- **Admin/Gestor/Colaborador (app web):** sem impacto.
- **Kiosk:** impacto direto e único, conforme descrito acima.

## Riscos e limites de escopo

- Posicionamento incorreto do sheet sem portal — mitigado por critério de aceite manual dedicado.
- Navegação do carrossel não travada com sheet aberto — mitigado por critério de aceite manual dedicado.
- Conteúdo cortado por `overflow-hidden` — mitigado por manter `overflow-y-auto` como rede de segurança.
- Regressão em lógica pura — mitigada por checagem de diff.
- Interações reais (clique/toque) não são verificáveis por `renderToStaticMarkup` — tratadas como validação manual.
