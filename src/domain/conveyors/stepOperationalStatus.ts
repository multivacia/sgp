import type { ConveyorNodeStepOperationalStatus, ConveyorStructureStep } from './conveyor.types'

export function isStepOperationallyCompleted(
  step: Pick<ConveyorStructureStep, 'operationalStatus'>,
): boolean {
  return step.operationalStatus === 'COMPLETED'
}

export function isStepAborted(
  step: Pick<ConveyorStructureStep, 'operationalStatus'>,
): boolean {
  return step.operationalStatus === 'ABORTED'
}

/** Fechado para sequência (COMPLETED ou ABORTED). */
export function isStepClosedForSequence(
  step: Pick<ConveyorStructureStep, 'operationalStatus'>,
): boolean {
  return step.operationalStatus === 'COMPLETED' || step.operationalStatus === 'ABORTED'
}

export function stepOperationalStatusLabel(
  s: ConveyorNodeStepOperationalStatus,
): string {
  const map: Record<ConveyorNodeStepOperationalStatus, string> = {
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em progresso',
    BLOCKED: 'Bloqueada',
    COMPLETED: 'Concluída',
    REOPENED: 'Reaberta',
    ABORTED: 'Dispensada',
  }
  return map[s] ?? s
}

export function canShowCompleteButton(
  step: Pick<ConveyorStructureStep, 'operationalStatus'>,
): boolean {
  return !isStepOperationallyCompleted(step) && !isStepAborted(step)
}

export function canCompleteStep(
  step: Pick<ConveyorStructureStep, 'operationalStatus'>,
  hasPermission: boolean,
): boolean {
  return hasPermission && canShowCompleteButton(step)
}

export function canShowReopenButton(
  step: Pick<ConveyorStructureStep, 'operationalStatus'>,
): boolean {
  return isStepOperationallyCompleted(step)
}

export function canReopenStep(
  step: Pick<ConveyorStructureStep, 'operationalStatus'>,
  hasPermission: boolean,
): boolean {
  return hasPermission && canShowReopenButton(step)
}

const ABORT_ORIGINS = new Set([
  'PENDING',
  'REOPENED',
  'IN_PROGRESS',
  'BLOCKED',
])

export function canShowAbortButton(
  step: Pick<ConveyorStructureStep, 'operationalStatus'>,
): boolean {
  return ABORT_ORIGINS.has(step.operationalStatus)
}

export function canAbortStep(
  step: Pick<ConveyorStructureStep, 'operationalStatus'>,
  hasPermission: boolean,
): boolean {
  return hasPermission && canShowAbortButton(step)
}

export function canShowRestoreAbortedButton(
  step: Pick<ConveyorStructureStep, 'operationalStatus'>,
): boolean {
  return isStepAborted(step)
}

export function canRestoreAbortedStep(
  step: Pick<ConveyorStructureStep, 'operationalStatus'>,
  hasPermission: boolean,
): boolean {
  return hasPermission && canShowRestoreAbortedButton(step)
}
