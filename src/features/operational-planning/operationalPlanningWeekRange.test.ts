import { describe, expect, it } from 'vitest'
import {
  fridayAfterMonday,
  isIsoDateInWeekdays,
  localTodayIsoDate,
  mondayOfWeekContainingLocal,
  shiftWeek,
} from './operationalPlanningWeekRange'

describe('operationalPlanningWeekRange', () => {
  it('segunda da semana local', () => {
    const d = new Date(2026, 4, 14, 12, 0, 0, 0)
    expect(mondayOfWeekContainingLocal(d)).toBe('2026-05-11')
  })

  it('sexta após segunda', () => {
    expect(fridayAfterMonday('2026-05-11')).toBe('2026-05-15')
  })

  it('shiftWeek', () => {
    expect(shiftWeek('2026-05-11', 1)).toBe('2026-05-18')
  })

  it('localTodayIsoDate no fuso local', () => {
    const d = new Date(2026, 4, 16, 15, 30, 0, 0)
    expect(localTodayIsoDate(d)).toBe('2026-05-16')
  })

  it('isIsoDateInWeekdays', () => {
    const weekdays = ['2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22']
    expect(isIsoDateInWeekdays('2026-05-20', weekdays)).toBe(true)
    expect(isIsoDateInWeekdays('2026-05-17', weekdays)).toBe(false)
  })
})
