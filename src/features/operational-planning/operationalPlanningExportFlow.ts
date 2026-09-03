/**
 * Lógica pura do fluxo "Exportar Excel" / "Salvar e exportar" — extraída de
 * `OperationalPlanningPage.tsx` para ser testável sem harness de renderização.
 */

export type OperationalPlanningExportFlowSavedWeek = {
  week: { weekStartDate: string }
}

export type OperationalPlanningExportFlowResult =
  | { exported: true; usedWeekStart: string }
  | { exported: false; usedWeekStart: null }

/**
 * Se `dirty`, salva o rascunho ANTES de exportar (via `persistDraft`) e usa o
 * `weekStartDate` retornado pelo servidor; se o salvamento falhar (`persistDraft` retorna
 * `null`), a exportação é abortada — nenhum download é iniciado.
 * Se não houver alterações locais, exporta direto usando `weekStartDate` (nunca os
 * itens filtrados exibidos na tela — filtros visuais não alteram o resultado).
 */
export async function runOperationalPlanningExportFlow(input: {
  dirty: boolean
  weekStartDate: string
  persistDraft: () => Promise<OperationalPlanningExportFlowSavedWeek | null>
  exportWeek: (weekStart: string) => Promise<void>
}): Promise<OperationalPlanningExportFlowResult> {
  let targetWeekStart = input.weekStartDate
  if (input.dirty) {
    const saved = await input.persistDraft()
    if (!saved) return { exported: false, usedWeekStart: null }
    targetWeekStart = saved.week.weekStartDate
  }
  await input.exportWeek(targetWeekStart)
  return { exported: true, usedWeekStart: targetWeekStart }
}

/** `weekStartDate` resolvido para o export — do plano salvo, nunca dos itens filtrados exibidos. */
export function resolveOperationalPlanningExportWeekStart(
  weekPayloadWeekStartDate: string | null | undefined,
  weekMonday: string,
): string {
  return weekPayloadWeekStartDate ?? weekMonday
}

/** Planejamento vazio mantém o botão desabilitado, independentemente de outros estados. */
export function isOperationalPlanningExportActionDisabled(input: {
  draftItemsCount: number
  busy: boolean
}): boolean {
  return input.draftItemsCount === 0 || input.busy
}

export type OperationalPlanningExportButtonState = 'idle' | 'dirty' | 'exporting'

/** Rótulo por estado — 'Exportar Excel' (idle), 'Salvar e exportar' (dirty), 'Exportando...' (exporting). */
export function resolveOperationalPlanningExportButtonLabel(
  state: OperationalPlanningExportButtonState,
): string {
  if (state === 'exporting') return 'Exportando...'
  if (state === 'dirty') return 'Salvar e exportar'
  return 'Exportar Excel'
}

/** Bloqueia clique duplo durante a exportação, além do `disabled` externo (ex.: sem itens, `busy`). */
export function isOperationalPlanningExportButtonDisabled(input: {
  disabled: boolean
  state: OperationalPlanningExportButtonState
}): boolean {
  return input.disabled || input.state === 'exporting'
}
