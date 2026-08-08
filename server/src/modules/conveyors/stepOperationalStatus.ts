/** Valores persistidos em `conveyor_nodes.operational_status` (apenas `node_type = 'STEP'`). */
export type ConveyorNodeStepOperationalStatusDb =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'REOPENED'
  | 'ABORTED'

export const STEP_ABORT_ALLOWED_ORIGINS: readonly ConveyorNodeStepOperationalStatusDb[] = [
  'PENDING',
  'REOPENED',
  'IN_PROGRESS',
  'BLOCKED',
] as const

export function isStepOperationallyCompletedStatus(
  status: ConveyorNodeStepOperationalStatusDb | null | undefined,
): boolean {
  return status === 'COMPLETED'
}

export function isStepAbortedStatus(
  status: ConveyorNodeStepOperationalStatusDb | null | undefined,
): boolean {
  return status === 'ABORTED'
}

/** Fechado para sequência operacional (não bloqueia sucessoras). */
export function isStepClosedForSequence(
  status: ConveyorNodeStepOperationalStatusDb | null | undefined,
): boolean {
  return status === 'COMPLETED' || status === 'ABORTED'
}

export function canTransitionStepStatus(
  currentStatus: ConveyorNodeStepOperationalStatusDb,
  nextStatus: ConveyorNodeStepOperationalStatusDb,
): boolean {
  if (currentStatus === nextStatus) return true
  if (nextStatus === 'COMPLETED') {
    return (
      currentStatus === 'PENDING' ||
      currentStatus === 'IN_PROGRESS' ||
      currentStatus === 'REOPENED' ||
      currentStatus === 'BLOCKED'
    )
  }
  if (nextStatus === 'REOPENED') {
    return currentStatus === 'COMPLETED' || currentStatus === 'ABORTED'
  }
  if (nextStatus === 'ABORTED') {
    return (
      currentStatus === 'PENDING' ||
      currentStatus === 'REOPENED' ||
      currentStatus === 'IN_PROGRESS' ||
      currentStatus === 'BLOCKED'
    )
  }
  return false
}
