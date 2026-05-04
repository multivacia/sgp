import type { ConveyorNodeStepOperationalStatus, ConveyorStructureStep } from './conveyor.types'

export function isStepOperationallyCompleted(
  step: Pick<ConveyorStructureStep, 'operationalStatus'>,
): boolean {
  return step.operationalStatus === 'COMPLETED'
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
  }
  return map[s] ?? s
}

export function canShowCompleteButton(
  step: Pick<ConveyorStructureStep, 'operationalStatus'>,
): boolean {
  return !isStepOperationallyCompleted(step)
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
