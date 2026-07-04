import { describe, expect, it } from 'vitest'
import {
  fridayAfterMonday,
  isCanonicalOperationalWeekEnd,
  isIsoDateInWeekdays,
  localTodayIsoDate,
  mondayOfWeekContainingLocal,
  resolveOperationalWeekRange,
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

  it('sexta após segunda 2026-06-29 (não domingo)', () => {
    expect(fridayAfterMonday('2026-06-29')).toBe('2026-07-03')
    expect(fridayAfterMonday('2026-06-29')).not.toBe('2026-07-05')
  })

  it('resolveOperationalWeekRange mantém segunda–sexta', () => {
    expect(resolveOperationalWeekRange('2026-06-29')).toEqual({
      weekStartDate: '2026-06-29',
      weekEndDate: '2026-07-03',
    })
  })

  it('isCanonicalOperationalWeekEnd rejeita domingo como fim de semana', () => {
    expect(isCanonicalOperationalWeekEnd('2026-06-29', '2026-07-03')).toBe(true)
    expect(isCanonicalOperationalWeekEnd('2026-06-29', '2026-07-05')).toBe(false)
  })

  it('shiftWeek preserva segunda–sexta ao navegar', () => {
    const nextMonday = shiftWeek('2026-06-29', 1)
    expect(resolveOperationalWeekRange(nextMonday)).toEqual({
      weekStartDate: '2026-07-06',
      weekEndDate: '2026-07-10',
    })
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
