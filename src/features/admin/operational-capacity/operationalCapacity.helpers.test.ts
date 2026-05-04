import { describe, expect, it } from 'vitest'
import {
  buildCapacityStatus,
  formatCapacityLabel,
  hoursToMinutes,
  minutesToDecimalHours,
  minutesToHoursLabel,
  resolveEffectiveCapacity,
} from './operationalCapacity.helpers'

describe('operationalCapacity.helpers', () => {
  it('minutesToDecimalHours', () => {
    expect(minutesToDecimalHours(60)).toBe(1)
    expect(minutesToDecimalHours(90)).toBe(1.5)
  })

  it('hoursToMinutes', () => {
    expect(hoursToMinutes(8)).toBe(480)
    expect(hoursToMinutes(7.5)).toBe(450)
  })

  it('minutesToHoursLabel', () => {
    expect(minutesToHoursLabel(480)).toBe('8h')
    expect(minutesToHoursLabel(450)).toBe('7h30')
  })

  it('formatCapacityLabel', () => {
    expect(formatCapacityLabel(480)).toBe('8h/dia')
    expect(formatCapacityLabel(null)).toBe('—')
  })

  it('resolveEffectiveCapacity prefere override', () => {
    expect(resolveEffectiveCapacity(480, 300)).toBe(300)
    expect(resolveEffectiveCapacity(480, null)).toBe(480)
    expect(resolveEffectiveCapacity(null, null)).toBe(null)
  })

  it('buildCapacityStatus — thresholds 80% / 100%', () => {
    expect(buildCapacityStatus({ allocatedMinutes: 400, capacityMinutes: 500 }).kind).toBe(
      'within',
    )
    expect(buildCapacityStatus({ allocatedMinutes: 410, capacityMinutes: 500 }).kind).toBe(
      'attention',
    )
    expect(buildCapacityStatus({ allocatedMinutes: 501, capacityMinutes: 500 }).kind).toBe(
      'over',
    )
    expect(buildCapacityStatus({ allocatedMinutes: null, capacityMinutes: 500 }).kind).toBe(
      'no_data',
    )
  })
})
