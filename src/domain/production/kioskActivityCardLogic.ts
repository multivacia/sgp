import type { ProductionWorkQueueItem } from './production.types'
import type { JustificationFieldValue } from '../../features/shell/quickTimeEntryDrawerLogic'
import { validateJustificationFieldValue } from '../operational/timeEntryJustificationField'

export const PRODUCTION_OUT_OF_SEQUENCE_JUSTIFICATION_MIN = 3
export const PRODUCTION_OUT_OF_SEQUENCE_JUSTIFICATION_MAX = 500

export function normalizeProductionOutOfSequenceJustification(
  value: string,
): string {
  return value.trim()
}

export function isProductionOutOfSequenceJustificationValid(value: string): boolean {
  const t = normalizeProductionOutOfSequenceJustification(value)
  return (
    t.length >= PRODUCTION_OUT_OF_SEQUENCE_JUSTIFICATION_MIN &&
    t.length <= PRODUCTION_OUT_OF_SEQUENCE_JUSTIFICATION_MAX
  )
}

export function productionOutOfSequenceJustificationError(input: {
  justification: JustificationFieldValue
  useFallback: boolean
  requiresComplement: boolean
}): string | null {
  const catalogError = validateJustificationFieldValue({
    value: input.justification,
    useFallback: input.useFallback,
    requiresComplement: input.requiresComplement,
  })
  if (catalogError) return catalogError

  const t = normalizeProductionOutOfSequenceJustification(input.justification.legacyText)
  if (t.length < PRODUCTION_OUT_OF_SEQUENCE_JUSTIFICATION_MIN) {
    return `A justificativa deve ter pelo menos ${PRODUCTION_OUT_OF_SEQUENCE_JUSTIFICATION_MIN} caracteres.`
  }
  if (t.length > PRODUCTION_OUT_OF_SEQUENCE_JUSTIFICATION_MAX) {
    return `A justificativa não pode exceder ${PRODUCTION_OUT_OF_SEQUENCE_JUSTIFICATION_MAX} caracteres.`
  }
  return null
}

/** Percentual do tempo previsto já apontado (não é status operacional). */
export function productionTimePlannedCoveragePct(
  item: Pick<ProductionWorkQueueItem, 'plannedMinutes' | 'realizedMinutes'>,
): number {
  if (!item.plannedMinutes || item.plannedMinutes <= 0) return 0
  return Math.min(100, Math.round((item.realizedMinutes / item.plannedMinutes) * 100))
}

export function productionTimePlannedCoverageLabel(pct: number): string {
  if (pct <= 0) return 'Tempo previsto: 0%'
  return `Tempo previsto: ${pct}%`
}

export function productionPlannedTimeReachedHint(
  item: Pick<
    ProductionWorkQueueItem,
    'plannedMinutes' | 'realizedMinutes' | 'isActivityCompleted'
  >,
): string | null {
  if (item.isActivityCompleted) return null
  if (!item.plannedMinutes || item.plannedMinutes <= 0) return null
  if (item.realizedMinutes < item.plannedMinutes) return null
  return 'Tempo previsto atingido. Marque como concluída para liberar a próxima atividade.'
}

/** Evolução operacional conhecida da atividade (último % registrado na fila). */
export function resolveKioskInitialSessionCompletionPct(
  item: Pick<ProductionWorkQueueItem, 'lastSessionCompletionPct'>,
): number {
  const pct = item.lastSessionCompletionPct
  if (typeof pct !== 'number' || !Number.isFinite(pct)) return 0
  return Math.max(0, Math.min(100, Math.round(pct)))
}

/** Exige justificativa quando o novo apontamento ultrapassa o tempo previsto. */
export function kioskRequiresExcessTimeJustification(
  item: Pick<ProductionWorkQueueItem, 'plannedMinutes' | 'realizedMinutes'>,
  minutesNovo: number,
): boolean {
  if (!Number.isInteger(minutesNovo) || minutesNovo <= 0) return false
  const planned = item.plannedMinutes
  if (planned == null || !Number.isFinite(planned) || planned <= 0) return false
  return item.realizedMinutes + minutesNovo > planned
}

export function kioskRequiresOperationalJustification(
  item: Pick<
    ProductionWorkQueueItem,
    'plannedMinutes' | 'realizedMinutes' | 'requiresOutOfSequenceJustification'
  >,
  minutesNovo: number,
): boolean {
  return (
    item.requiresOutOfSequenceJustification ||
    kioskRequiresExcessTimeJustification(item, minutesNovo)
  )
}

export function canSubmitKioskProductionTimeEntry(input: {
  markAsDone: boolean
  minutes: number
  sessionPct: number
  requiresOperationalJustification: boolean
  justification: JustificationFieldValue
  useFallback: boolean
  requiresComplement: boolean
}): boolean {
  if (!Number.isInteger(input.minutes) || input.minutes < 0) return false
  if (input.sessionPct < 0 || input.sessionPct > 100) return false

  const isEmptySubmit =
    !input.markAsDone && input.minutes === 0 && input.sessionPct === 0
  if (isEmptySubmit) return false

  if (input.requiresOperationalJustification) {
    return (
      productionOutOfSequenceJustificationError({
        justification: input.justification,
        useFallback: input.useFallback,
        requiresComplement: input.requiresComplement,
      }) === null
    )
  }
  return true
}
