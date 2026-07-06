import {
  canConveyorAcceptTimeEntry,
  isConveyorOperationalStatusDb,
} from '../conveyors/conveyorOperationalStatus.js'
import type { PreviousOpenActivitySummary } from '../conveyors/conveyorActivitySequence.logic.js'

export type SequenceWarningType = 'PREVIOUS_STEP_PENDING' | 'OUT_OF_SEQUENCE'

export type SequencePresentationFields = {
  hasPreviousPendingStep: boolean
  sequenceWarningType?: SequenceWarningType
  sequenceWarningLabel?: string
  requiresOutOfSequenceJustification: boolean
  canPointTime: boolean
  blockingReason?: string
}

export function resolveSequenceWarningLabel(
  hasPreviousPendingStep: boolean,
  allPreviousOpen: Pick<PreviousOpenActivitySummary, 'activityTitle'>[],
): Pick<SequencePresentationFields, 'sequenceWarningType' | 'sequenceWarningLabel'> {
  if (!hasPreviousPendingStep) {
    return {}
  }
  if (allPreviousOpen.length === 1) {
    return {
      sequenceWarningType: 'PREVIOUS_STEP_PENDING',
      sequenceWarningLabel: `Etapa anterior pendente: ${allPreviousOpen[0]!.activityTitle}`,
    }
  }
  return {
    sequenceWarningType: 'PREVIOUS_STEP_PENDING',
    sequenceWarningLabel: 'Atenção à sequência',
  }
}

export function resolveOutOfSequenceActionLabel(): string {
  return 'Fora de sequência'
}

/**
 * Apontamento permitido salvo bloqueios reais (esteira, conclusão, plano cancelado).
 * Pendência estrutural anterior não bloqueia — exige justificativa no POST.
 */
export function resolveWorkQueueCanPointTime(input: {
  isActivityCompleted: boolean
  conveyorOperationalStatus: string | null
  planItemStatus?: string | null
}): Pick<SequencePresentationFields, 'canPointTime' | 'blockingReason'> {
  if (input.isActivityCompleted) {
    return {
      canPointTime: false,
      blockingReason: 'Esta atividade já foi concluída.',
    }
  }

  if (input.planItemStatus === 'CANCELLED') {
    return {
      canPointTime: false,
      blockingReason: 'Este item do plano foi cancelado.',
    }
  }

  const status = input.conveyorOperationalStatus
  if (status === 'FINALIZADA') {
    return {
      canPointTime: false,
      blockingReason: 'A esteira está finalizada.',
    }
  }
  if (status === 'CANCELADA') {
    return {
      canPointTime: false,
      blockingReason: 'A esteira está cancelada.',
    }
  }

  if (
    status == null ||
    !isConveyorOperationalStatusDb(status) ||
    !canConveyorAcceptTimeEntry(status)
  ) {
    return {
      canPointTime: false,
      blockingReason: 'Apontamento indisponível: a esteira ainda não está liberada para produção.',
    }
  }

  return { canPointTime: true }
}

export function resolveSequencePresentation(input: {
  isActivityCompleted: boolean
  conveyorOperationalStatus: string | null
  planItemStatus?: string | null
  hasPreviousPendingStep: boolean
  allPreviousOpenActivities: Pick<PreviousOpenActivitySummary, 'activityTitle'>[]
}): SequencePresentationFields {
  const warning = resolveSequenceWarningLabel(
    input.hasPreviousPendingStep,
    input.allPreviousOpenActivities,
  )
  const access = resolveWorkQueueCanPointTime(input)

  return {
    hasPreviousPendingStep: input.hasPreviousPendingStep,
    ...warning,
    requiresOutOfSequenceJustification:
      !input.isActivityCompleted && input.hasPreviousPendingStep,
    ...access,
  }
}

/** Critério estrutural por item — independente da ordem/filtros da fila visual. */
export function resolveIsNextRecommended(input: {
  isActivityCompleted: boolean
  hasPreviousPendingStep: boolean
  canPointTime: boolean
}): boolean {
  return (
    !input.isActivityCompleted &&
    !input.hasPreviousPendingStep &&
    input.canPointTime
  )
}

/** @deprecated use resolveIsNextRecommended */
export function resolveIsStructurallyNextRecommended(input: {
  isActivityCompleted: boolean
  hasPreviousPendingStep: boolean
  conveyorOperationalStatus: string | null
}): boolean {
  if (input.isActivityCompleted || input.hasPreviousPendingStep) return false
  const status = input.conveyorOperationalStatus
  return (
    status != null &&
    isConveyorOperationalStatusDb(status) &&
    canConveyorAcceptTimeEntry(status)
  )
}
