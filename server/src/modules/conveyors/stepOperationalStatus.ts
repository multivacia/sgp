/** Valores persistidos em `conveyor_nodes.operational_status` (apenas `node_type = 'STEP'`). */
export type ConveyorNodeStepOperationalStatusDb =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'REOPENED'

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
    return currentStatus === 'COMPLETED'
  }
  return false
}
