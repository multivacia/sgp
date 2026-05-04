import { describe, expect, it } from 'vitest'
import { canTransitionStepStatus } from '../modules/conveyors/stepOperationalStatus.js'

describe('canTransitionStepStatus', () => {
  it('permite PENDING → COMPLETED', () => {
    expect(canTransitionStepStatus('PENDING', 'COMPLETED')).toBe(true)
  })
  it('permite IN_PROGRESS → COMPLETED', () => {
    expect(canTransitionStepStatus('IN_PROGRESS', 'COMPLETED')).toBe(true)
  })
  it('permite REOPENED → COMPLETED', () => {
    expect(canTransitionStepStatus('REOPENED', 'COMPLETED')).toBe(true)
  })
  it('permite BLOCKED → COMPLETED', () => {
    expect(canTransitionStepStatus('BLOCKED', 'COMPLETED')).toBe(true)
  })
  it('COMPLETED → COMPLETED idempotente', () => {
    expect(canTransitionStepStatus('COMPLETED', 'COMPLETED')).toBe(true)
  })
  it('permite COMPLETED → REOPENED', () => {
    expect(canTransitionStepStatus('COMPLETED', 'REOPENED')).toBe(true)
  })
  it('não permite PENDING → REOPENED', () => {
    expect(canTransitionStepStatus('PENDING', 'REOPENED')).toBe(false)
  })
  it('REOPENED → REOPENED idempotente', () => {
    expect(canTransitionStepStatus('REOPENED', 'REOPENED')).toBe(true)
  })
})
