import type { ProductionWorkQueueItem } from '../../domain/production/production.types'
import {
  OPERATIONAL_JUSTIFICATION_MESSAGES,
  resolvePreferredJustificationCategory,
  validateJustificationFieldValue,
} from '../../domain/operational/timeEntryJustificationField'
import type { JustificationFieldValue } from '../../domain/operational/timeEntryJustificationField'

export function productionTimeEntryNeedsJustification(
  item: Pick<ProductionWorkQueueItem, 'requiresOutOfSequenceJustification'>,
): boolean {
  return item.requiresOutOfSequenceJustification === true
}

export function productionTimeEntryPreferredCategory(
  item: Pick<
    ProductionWorkQueueItem,
    'hasPreviousPendingStep' | 'isOutOfSequence' | 'requiresOutOfSequenceJustification'
  >,
): string | null {
  if (!productionTimeEntryNeedsJustification(item)) return null
  return resolvePreferredJustificationCategory({
    hasPreviousPendingStep: item.hasPreviousPendingStep,
    isOutOfSequence: item.isOutOfSequence,
  })
}

export function validateProductionTimeEntryJustification(input: {
  item: ProductionWorkQueueItem
  justification: JustificationFieldValue
  useFallback: boolean
  requiresComplement: boolean
}): string | null {
  if (!productionTimeEntryNeedsJustification(input.item)) return null
  return validateJustificationFieldValue({
    value: input.justification,
    useFallback: input.useFallback,
    requiresComplement: input.requiresComplement,
  })
}

export function buildProductionTimeEntryJustificationPayload(
  item: ProductionWorkQueueItem,
  justification: JustificationFieldValue,
): {
  outOfSequenceJustification?: string
  justificationId?: string
  justificationComplement?: string
} {
  if (!productionTimeEntryNeedsJustification(item)) return {}
  const legacy = justification.legacyText.trim()
  if (!legacy) return {}
  return {
    outOfSequenceJustification: legacy,
    ...(justification.justificationId
      ? {
          justificationId: justification.justificationId,
          ...(justification.justificationComplement.trim()
            ? { justificationComplement: justification.justificationComplement.trim() }
            : {}),
        }
      : {}),
  }
}

export { OPERATIONAL_JUSTIFICATION_MESSAGES }
