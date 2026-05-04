export type ConveyorStepCompletionReason =
  | 'NOT_STEP'
  | 'NOT_OPERATIONALLY_COMPLETED'
  | 'EXPLICITLY_COMPLETED'

export type ConveyorStepCompletionStateInput = {
  nodeType: string | null
  plannedMinutes: number | null
  realizedMinutes: number | null
  /** Persistido em `conveyor_nodes.operational_status` (apenas STEP). */
  operationalStatus: string | null
}

export type ConveyorStepCompletionState = {
  isCompleted: boolean
  reason: ConveyorStepCompletionReason
}

/**
 * Conclusão operacional de STEP vem apenas de `operational_status = COMPLETED`.
 * Tempo realizado / planejado não conclui a etapa.
 */
export function calculateConveyorStepCompletionState(
  input: ConveyorStepCompletionStateInput,
): ConveyorStepCompletionState {
  if ((input.nodeType ?? '').trim().toUpperCase() !== 'STEP') {
    return { isCompleted: false, reason: 'NOT_STEP' }
  }
  const op = (input.operationalStatus ?? '').trim().toUpperCase()
  if (op === 'COMPLETED') {
    return { isCompleted: true, reason: 'EXPLICITLY_COMPLETED' }
  }
  return { isCompleted: false, reason: 'NOT_OPERATIONALLY_COMPLETED' }
}
