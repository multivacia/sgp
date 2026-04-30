export type ConveyorStepCompletionReason =
  | 'NOT_STEP'
  | 'NO_PLANNED_MINUTES'
  | 'NO_REALIZED_MINUTES'
  | 'REALIZED_BELOW_PLANNED'
  | 'PLANNED_TIME_REACHED'
  | 'PLANNED_TIME_EXCEEDED'
  | 'EXPLICITLY_COMPLETED'

export type ConveyorStepCompletionStateInput = {
  nodeType: string | null
  plannedMinutes: number | null
  realizedMinutes: number | null
  /** TODO Sprint futura: ligar ao status operacional explícito do STEP. */
  explicitlyCompleted?: boolean
}

export type ConveyorStepCompletionState = {
  isCompleted: boolean
  reason: ConveyorStepCompletionReason
}

export function calculateConveyorStepCompletionState(
  input: ConveyorStepCompletionStateInput,
): ConveyorStepCompletionState {
  // Consumo de tempo planejado não equivale a conclusão operacional.
  // A conclusão de STEP exige sinal explícito futuro.
  if ((input.nodeType ?? '').trim().toUpperCase() !== 'STEP') {
    return { isCompleted: false, reason: 'NOT_STEP' }
  }
  if (input.explicitlyCompleted === true) {
    return { isCompleted: true, reason: 'EXPLICITLY_COMPLETED' }
  }
  if (input.plannedMinutes == null || input.plannedMinutes <= 0) {
    return { isCompleted: false, reason: 'NO_PLANNED_MINUTES' }
  }
  if (input.realizedMinutes == null || input.realizedMinutes <= 0) {
    return { isCompleted: false, reason: 'NO_REALIZED_MINUTES' }
  }
  if (input.realizedMinutes < input.plannedMinutes) {
    return { isCompleted: false, reason: 'REALIZED_BELOW_PLANNED' }
  }
  if (input.realizedMinutes === input.plannedMinutes) {
    return { isCompleted: false, reason: 'PLANNED_TIME_REACHED' }
  }
  return { isCompleted: false, reason: 'PLANNED_TIME_EXCEEDED' }
}

