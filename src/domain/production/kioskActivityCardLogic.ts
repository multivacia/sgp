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

export function canSubmitKioskProductionTimeEntry(input: {
  minutesValid: boolean
  requiresOutOfSequenceJustification: boolean
  justification: JustificationFieldValue
  useFallback: boolean
  requiresComplement: boolean
}): boolean {
  if (!input.minutesValid) return false
  if (input.requiresOutOfSequenceJustification) {
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
