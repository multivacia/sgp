import { describe, expect, it } from 'vitest'
import {
  canTransitionStepStatus,
  isStepAbortedStatus,
  isStepClosedForSequence,
  isStepOperationallyCompletedStatus,
} from '../modules/conveyors/stepOperationalStatus.js'
import { resolveStepAbortReason } from '../modules/conveyors/stepAbortReasons.js'

describe('canTransitionStepStatus (ABORTED)', () => {
  it('permite origens abertas → ABORTED', () => {
    expect(canTransitionStepStatus('PENDING', 'ABORTED')).toBe(true)
    expect(canTransitionStepStatus('REOPENED', 'ABORTED')).toBe(true)
    expect(canTransitionStepStatus('IN_PROGRESS', 'ABORTED')).toBe(true)
    expect(canTransitionStepStatus('BLOCKED', 'ABORTED')).toBe(true)
  })

  it('rejeita COMPLETED → ABORTED', () => {
    expect(canTransitionStepStatus('COMPLETED', 'ABORTED')).toBe(false)
  })

  it('permite ABORTED → REOPENED (restore)', () => {
    expect(canTransitionStepStatus('ABORTED', 'REOPENED')).toBe(true)
  })

  it('ABORTED → ABORTED idempotente', () => {
    expect(canTransitionStepStatus('ABORTED', 'ABORTED')).toBe(true)
  })

  it('rejeita ABORTED → COMPLETED', () => {
    expect(canTransitionStepStatus('ABORTED', 'COMPLETED')).toBe(false)
  })
})

describe('predicados STEP', () => {
  it('isStepOperationallyCompletedStatus só COMPLETED', () => {
    expect(isStepOperationallyCompletedStatus('COMPLETED')).toBe(true)
    expect(isStepOperationallyCompletedStatus('ABORTED')).toBe(false)
  })

  it('isStepAbortedStatus', () => {
    expect(isStepAbortedStatus('ABORTED')).toBe(true)
    expect(isStepAbortedStatus('COMPLETED')).toBe(false)
  })

  it('isStepClosedForSequence inclui ABORTED', () => {
    expect(isStepClosedForSequence('COMPLETED')).toBe(true)
    expect(isStepClosedForSequence('ABORTED')).toBe(true)
    expect(isStepClosedForSequence('PENDING')).toBe(false)
  })
})

describe('resolveStepAbortReason', () => {
  it('aceita catálogo sem texto', () => {
    const r = resolveStepAbortReason({ reasonCode: 'NAO_MAIS_NECESSARIA' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.reasonCode).toBe('NAO_MAIS_NECESSARIA')
      expect(r.value.reasonText).toBeNull()
    }
  })

  it('OUTRO exige texto', () => {
    expect(resolveStepAbortReason({ reasonCode: 'OUTRO', reasonText: '  ' }).ok).toBe(false)
    const r = resolveStepAbortReason({ reasonCode: 'OUTRO', reasonText: ' Cliente pediu ' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.reasonText).toBe('Cliente pediu')
  })

  it('rejeita código fora do catálogo', () => {
    expect(resolveStepAbortReason({ reasonCode: 'XYZ' }).ok).toBe(false)
  })
})
