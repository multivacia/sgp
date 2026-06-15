import {
  CONVEYOR_TIME_ENTRY_ALLOWED_STATUSES,
  type ConveyorOperationalStatusDb,
  isConveyorOperationalStatusDb,
} from '../conveyors/conveyorOperationalStatus.js'

export type ProductionCanTrackTimeInput = {
  isActivityCompleted: boolean
  isOutOfSequence: boolean
  planItemStatus: string
  conveyorOperationalStatus: string | null
  /** Itens da fila de produção já vêm filtrados por `assigned_collaborator_id`. */
  isPlannedForCollaborator: boolean
}

function conveyorAllowsProductionTracking(
  conveyorOperationalStatus: string | null,
): boolean {
  const conveyorStatus = conveyorOperationalStatus
  return (
    conveyorStatus != null &&
    isConveyorOperationalStatusDb(conveyorStatus) &&
    (CONVEYOR_TIME_ENTRY_ALLOWED_STATUSES as readonly string[]).includes(
      conveyorStatus,
    )
  )
}

/**
 * Modo Produção: apontar com esteira liberada e item do plano.
 * Fora de sequência continua apontável — exige justificativa no POST.
 */
export function resolveProductionCanTrackTime(input: ProductionCanTrackTimeInput): boolean {
  if (input.isActivityCompleted) return false
  if (input.planItemStatus === 'CANCELLED') return false
  if (!input.isPlannedForCollaborator) return false
  return conveyorAllowsProductionTracking(input.conveyorOperationalStatus)
}

export function resolveProductionRequiresOutOfSequenceJustification(
  input: Pick<ProductionCanTrackTimeInput, 'isActivityCompleted' | 'isOutOfSequence'>,
): boolean {
  return !input.isActivityCompleted && input.isOutOfSequence
}

/** Colaborador pode marcar conclusão ao registrar apontamento (markAsDone). */
export function resolveProductionCanCompleteStep(
  input: ProductionCanTrackTimeInput,
): boolean {
  return resolveProductionCanTrackTime(input)
}

export function isConveyorStatusAllowedForProductionTimeEntry(
  status: string | null,
): status is ConveyorOperationalStatusDb {
  return (
    status != null &&
    isConveyorOperationalStatusDb(status) &&
    (CONVEYOR_TIME_ENTRY_ALLOWED_STATUSES as readonly string[]).includes(status)
  )
}
