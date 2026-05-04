import { describe, expect, it } from 'vitest'
import { calculateConveyorStepCompletionState } from '../modules/conveyors/operational-events/conveyor-step-completion-state.js'

describe('calculateConveyorStepCompletionState', () => {
  it('NOT_STEP', () => {
    expect(
      calculateConveyorStepCompletionState({
        nodeType: 'AREA',
        plannedMinutes: 10,
        realizedMinutes: 10,
        operationalStatus: null,
      }),
    ).toEqual({ isCompleted: false, reason: 'NOT_STEP' })
  })

  it('STEP COMPLETED no DB → concluído', () => {
    expect(
      calculateConveyorStepCompletionState({
        nodeType: 'STEP',
        plannedMinutes: 10,
        realizedMinutes: 0,
        operationalStatus: 'COMPLETED',
      }),
    ).toEqual({ isCompleted: true, reason: 'EXPLICITLY_COMPLETED' })
  })

  it('tempo realizado/planejado sem COMPLETED não conclui', () => {
    expect(
      calculateConveyorStepCompletionState({
        nodeType: 'STEP',
        plannedMinutes: 10,
        realizedMinutes: 100,
        operationalStatus: 'PENDING',
      }),
    ).toEqual({ isCompleted: false, reason: 'NOT_OPERATIONALLY_COMPLETED' })
  })
})
