import { describe, expect, it } from 'vitest'
import {
  assertMonday,
  fridayAfterMonday,
  isDateInWeekInclusive,
  mondayOfWeekContaining,
} from '../modules/operational-planning/operational-planning.week.js'

describe('operational-planning.week', () => {
  it('mondayOfWeekContaining normaliza para segunda', () => {
    expect(mondayOfWeekContaining('2026-05-13')).toBe('2026-05-11')
  })

  it('assertMonday aceita segunda', () => {
    expect(() => assertMonday('2026-05-11')).not.toThrow()
  })

  it('assertMonday rejeita terça', () => {
    expect(() => assertMonday('2026-05-12')).toThrow()
  })

  it('fridayAfterMonday', () => {
    expect(fridayAfterMonday('2026-05-11')).toBe('2026-05-15')
    expect(fridayAfterMonday('2026-06-29')).toBe('2026-07-03')
    expect(fridayAfterMonday('2026-06-29')).not.toBe('2026-07-05')
  })

  it('isDateInWeekInclusive', () => {
    expect(isDateInWeekInclusive('2026-05-13', '2026-05-11', '2026-05-15')).toBe(true)
    expect(isDateInWeekInclusive('2026-05-16', '2026-05-11', '2026-05-15')).toBe(false)
  })
})
