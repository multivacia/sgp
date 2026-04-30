import { describe, expect, it } from 'vitest'
import { calculateConveyorStepCompletionState } from '../modules/conveyors/operational-events/conveyor-step-completion-state.js'

describe('calculateConveyorStepCompletionState', () => {
  it('NOT_STEP', () => {
    expect(
      calculateConveyorStepCompletionState({
        nodeType: 'AREA',
        plannedMinutes: 10,
        realizedMinutes: 10,
      }),
    ).toEqual({ isCompleted: false, reason: 'NOT_STEP' })
  })

  it('NO_PLANNED_MINUTES', () => {
    expect(
      calculateConveyorStepCompletionState({
        nodeType: 'STEP',
        plannedMinutes: 0,
        realizedMinutes: 10,
      }),
    ).toEqual({ isCompleted: false, reason: 'NO_PLANNED_MINUTES' })
  })

  it('NO_REALIZED_MINUTES', () => {
    expect(
      calculateConveyorStepCompletionState({
        nodeType: 'STEP',
        plannedMinutes: 10,
        realizedMinutes: 0,
      }),
    ).toEqual({ isCompleted: false, reason: 'NO_REALIZED_MINUTES' })
  })

  it('REALIZED_BELOW_PLANNED', () => {
    expect(
      calculateConveyorStepCompletionState({
        nodeType: 'STEP',
        plannedMinutes: 10,
        realizedMinutes: 9,
      }),
    ).toEqual({ isCompleted: false, reason: 'REALIZED_BELOW_PLANNED' })
  })

  it('PLANNED_TIME_REACHED', () => {
    expect(
      calculateConveyorStepCompletionState({
        nodeType: 'STEP',
        plannedMinutes: 120,
        realizedMinutes: 120,
      }),
    ).toEqual({ isCompleted: false, reason: 'PLANNED_TIME_REACHED' })
  })

  it('PLANNED_TIME_EXCEEDED', () => {
    expect(
      calculateConveyorStepCompletionState({
        nodeType: 'STEP',
        plannedMinutes: 120,
        realizedMinutes: 150,
      }),
    ).toEqual({ isCompleted: false, reason: 'PLANNED_TIME_EXCEEDED' })
  })
})

