import { describe, expect, it } from 'vitest'
import {
  canCompleteStep,
  canReopenStep,
  canShowCompleteButton,
  canShowReopenButton,
  isStepOperationallyCompleted,
  stepOperationalStatusLabel,
} from './stepOperationalStatus'

describe('stepOperationalStatus helpers', () => {
  it('isStepOperationallyCompleted', () => {
    expect(isStepOperationallyCompleted({ operationalStatus: 'COMPLETED' })).toBe(true)
    expect(isStepOperationallyCompleted({ operationalStatus: 'PENDING' })).toBe(false)
  })

  it('stepOperationalStatusLabel', () => {
    expect(stepOperationalStatusLabel('COMPLETED')).toBe('Concluída')
  })

  it('canShowCompleteButton', () => {
    expect(canShowCompleteButton({ operationalStatus: 'PENDING' })).toBe(true)
    expect(canShowCompleteButton({ operationalStatus: 'COMPLETED' })).toBe(false)
  })

  it('canCompleteStep', () => {
    expect(canCompleteStep({ operationalStatus: 'PENDING' }, true)).toBe(true)
    expect(canCompleteStep({ operationalStatus: 'PENDING' }, false)).toBe(false)
    expect(canCompleteStep({ operationalStatus: 'COMPLETED' }, true)).toBe(false)
  })

  it('canShowReopenButton e canReopenStep', () => {
    expect(canShowReopenButton({ operationalStatus: 'COMPLETED' })).toBe(true)
    expect(canShowReopenButton({ operationalStatus: 'PENDING' })).toBe(false)
    expect(canReopenStep({ operationalStatus: 'COMPLETED' }, true)).toBe(true)
    expect(canReopenStep({ operationalStatus: 'COMPLETED' }, false)).toBe(false)
    expect(canReopenStep({ operationalStatus: 'REOPENED' }, true)).toBe(false)
  })
})
