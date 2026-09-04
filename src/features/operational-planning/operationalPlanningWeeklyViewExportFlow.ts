/**
 * Lógica pura do fluxo "Exportar visão semanal" / "Salvar e exportar visão semanal" —
 * paralela a `operationalPlanningExportFlow.ts` (não reaproveitada, propositalmente, para
 * isolamento total da primeira exportação), com `persistDraft` injetado como callback
 * compartilhado já existente em `OperationalPlanningPage.tsx`.
 */

export type OperationalPlanningWeeklyViewExportFlowSavedWeek = {
  week: { weekStartDate: string }
}

export type OperationalPlanningWeeklyViewExportFlowResult =
  | { exported: true; usedWeekStart: string }
  | { exported: false; usedWeekStart: null }

/**
 * Se `dirty`, salva o rascunho ANTES de exportar (via `persistDraft`) e usa o
 * `weekStartDate` retornado pelo servidor; se o salvamento falhar (`persistDraft` retorna
 * `null`), a exportação é abortada — nenhum download é iniciado.
 * Se não houver alterações locais, exporta direto usando `weekStartDate` (nunca os itens
 * filtrados exibidos na tela — filtros visuais não alteram o resultado).
 */
export async function runOperationalPlanningWeeklyViewExportFlow(input: {
  dirty: boolean
  weekStartDate: string
  persistDraft: () => Promise<OperationalPlanningWeeklyViewExportFlowSavedWeek | null>
  exportWeeklyView: (weekStart: string) => Promise<void>
}): Promise<OperationalPlanningWeeklyViewExportFlowResult> {
  let targetWeekStart = input.weekStartDate
  if (input.dirty) {
    const saved = await input.persistDraft()
    if (!saved) return { exported: false, usedWeekStart: null }
    targetWeekStart = saved.week.weekStartDate
  }
  await input.exportWeeklyView(targetWeekStart)
  return { exported: true, usedWeekStart: targetWeekStart }
}

/** `weekStartDate` resolvido para o export — do plano salvo, nunca dos itens filtrados exibidos. */
export function resolveOperationalPlanningWeeklyViewExportWeekStart(
  weekPayloadWeekStartDate: string | null | undefined,
  weekMonday: string,
): string {
  return weekPayloadWeekStartDate ?? weekMonday
}

/** Planejamento vazio mantém o botão desabilitado, independentemente de outros estados. */
export function isOperationalPlanningWeeklyViewExportActionDisabled(input: {
  draftItemsCount: number
  busy: boolean
}): boolean {
  return input.draftItemsCount === 0 || input.busy
}

export type OperationalPlanningWeeklyViewExportButtonState = 'idle' | 'dirty' | 'exporting'

/** Rótulo por estado — 'Exportar visão semanal' (idle), 'Salvar e exportar visão semanal' (dirty), 'Exportando visão semanal...' (exporting). */
export function resolveOperationalPlanningWeeklyViewExportButtonLabel(
  state: OperationalPlanningWeeklyViewExportButtonState,
): string {
  if (state === 'exporting') return 'Exportando visão semanal...'
  if (state === 'dirty') return 'Salvar e exportar visão semanal'
  return 'Exportar visão semanal'
}

/** Bloqueia clique duplo durante a exportação, além do `disabled` externo (ex.: sem itens, `busy`). */
export function isOperationalPlanningWeeklyViewExportButtonDisabled(input: {
  disabled: boolean
  state: OperationalPlanningWeeklyViewExportButtonState
}): boolean {
  return input.disabled || input.state === 'exporting'
}

export type OperationalPlanningExportMutualExclusionState = {
  originalBlockedByOther: boolean
  weeklyViewBlockedByOther: boolean
}

/**
 * Enquanto qualquer uma das duas exportações do planejamento semanal estiver em andamento, a
 * outra fica bloqueada — nunca rodam simultaneamente. Fonte única de verdade usada por
 * `OperationalPlanningPage.tsx` para compor o `disabled` dos dois botões de exportação.
 */
export function resolveOperationalPlanningExportMutualExclusion(input: {
  isExporting: boolean
  isExportingWeeklyView: boolean
}): OperationalPlanningExportMutualExclusionState {
  return {
    originalBlockedByOther: input.isExportingWeeklyView,
    weeklyViewBlockedByOther: input.isExporting,
  }
}
