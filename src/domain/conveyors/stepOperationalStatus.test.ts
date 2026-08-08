import { describe, expect, it } from 'vitest'
import {
  canAbortStep,
  canCompleteStep,
  canReopenStep,
  canRestoreAbortedStep,
  canShowAbortButton,
  canShowCompleteButton,
  canShowReopenButton,
  canShowRestoreAbortedButton,
  isStepAborted,
  isStepClosedForSequence,
  isStepOperationallyCompleted,
  stepOperationalStatusLabel,
} from './stepOperationalStatus'

describe('stepOperationalStatus helpers', () => {
  it('isStepOperationallyCompleted', () => {
    expect(isStepOperationallyCompleted({ operationalStatus: 'COMPLETED' })).toBe(true)
    expect(isStepOperationallyCompleted({ operationalStatus: 'PENDING' })).toBe(false)
    expect(isStepOperationallyCompleted({ operationalStatus: 'ABORTED' })).toBe(false)
  })

  it('isStepAborted e isStepClosedForSequence', () => {
    expect(isStepAborted({ operationalStatus: 'ABORTED' })).toBe(true)
    expect(isStepClosedForSequence({ operationalStatus: 'ABORTED' })).toBe(true)
    expect(isStepClosedForSequence({ operationalStatus: 'COMPLETED' })).toBe(true)
    expect(isStepClosedForSequence({ operationalStatus: 'PENDING' })).toBe(false)
  })

  it('stepOperationalStatusLabel', () => {
    expect(stepOperationalStatusLabel('COMPLETED')).toBe('Concluída')
    expect(stepOperationalStatusLabel('ABORTED')).toBe('Dispensada')
  })

  it('canShowCompleteButton exclui ABORTED', () => {
    expect(canShowCompleteButton({ operationalStatus: 'PENDING' })).toBe(true)
    expect(canShowCompleteButton({ operationalStatus: 'COMPLETED' })).toBe(false)
    expect(canShowCompleteButton({ operationalStatus: 'ABORTED' })).toBe(false)
  })

  it('canCompleteStep', () => {
    expect(canCompleteStep({ operationalStatus: 'PENDING' }, true)).toBe(true)
    expect(canCompleteStep({ operationalStatus: 'PENDING' }, false)).toBe(false)
    expect(canCompleteStep({ operationalStatus: 'COMPLETED' }, true)).toBe(false)
    expect(canCompleteStep({ operationalStatus: 'ABORTED' }, true)).toBe(false)
  })

  it('canShowReopenButton e canReopenStep', () => {
    expect(canShowReopenButton({ operationalStatus: 'COMPLETED' })).toBe(true)
    expect(canShowReopenButton({ operationalStatus: 'PENDING' })).toBe(false)
    expect(canReopenStep({ operationalStatus: 'COMPLETED' }, true)).toBe(true)
    expect(canReopenStep({ operationalStatus: 'COMPLETED' }, false)).toBe(false)
    expect(canReopenStep({ operationalStatus: 'REOPENED' }, true)).toBe(false)
  })

  it('abort / restore buttons', () => {
    expect(canShowAbortButton({ operationalStatus: 'PENDING' })).toBe(true)
    expect(canShowAbortButton({ operationalStatus: 'COMPLETED' })).toBe(false)
    expect(canAbortStep({ operationalStatus: 'PENDING' }, true)).toBe(true)
    expect(canAbortStep({ operationalStatus: 'PENDING' }, false)).toBe(false)
    expect(canShowRestoreAbortedButton({ operationalStatus: 'ABORTED' })).toBe(true)
    expect(canRestoreAbortedStep({ operationalStatus: 'ABORTED' }, true)).toBe(true)
    expect(canRestoreAbortedStep({ operationalStatus: 'PENDING' }, true)).toBe(false)
  })
})
