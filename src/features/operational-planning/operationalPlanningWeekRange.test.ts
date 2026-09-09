import { describe, expect, it } from 'vitest'
import {
  fridayAfterMonday,
  isCanonicalOperationalWeekEnd,
  isIsoDateInWeekdays,
  localTodayIsoDate,
  mondayOfWeekContainingLocal,
  resolveDefaultNewPlanItemDay,
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

  describe('resolveDefaultNewPlanItemDay', () => {
    const weekSep7 = [
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
    ] as const
    const weekSep14 = [
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
    ] as const
    const weekAug31 = [
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
    ] as const

    it('hoje no meio da semana → todayIso', () => {
      expect(
        resolveDefaultNewPlanItemDay({
          weekdayDates: weekSep7,
          todayIso: '2026-09-09',
          weekMondayFallback: '2026-09-07',
        }),
      ).toBe('2026-09-09')
    })

    it('hoje = segunda da semana → todayIso', () => {
      expect(
        resolveDefaultNewPlanItemDay({
          weekdayDates: weekSep7,
          todayIso: '2026-09-07',
          weekMondayFallback: '2026-09-07',
        }),
      ).toBe('2026-09-07')
    })

    it('hoje = sexta da semana → todayIso', () => {
      expect(
        resolveDefaultNewPlanItemDay({
          weekdayDates: weekSep7,
          todayIso: '2026-09-11',
          weekMondayFallback: '2026-09-07',
        }),
      ).toBe('2026-09-11')
    })

    it('semana futura → primeiro dia útil', () => {
      expect(
        resolveDefaultNewPlanItemDay({
          weekdayDates: weekSep14,
          todayIso: '2026-09-09',
          weekMondayFallback: '2026-09-14',
        }),
      ).toBe('2026-09-14')
    })

    it('semana passada → primeiro dia útil', () => {
      expect(
        resolveDefaultNewPlanItemDay({
          weekdayDates: weekAug31,
          todayIso: '2026-09-09',
          weekMondayFallback: '2026-08-31',
        }),
      ).toBe('2026-08-31')
    })

    it('preferredDay na semana prevalece sobre todayIso', () => {
      expect(
        resolveDefaultNewPlanItemDay({
          weekdayDates: weekSep7,
          todayIso: '2026-09-09',
          preferredDay: '2026-09-10',
          weekMondayFallback: '2026-09-07',
        }),
      ).toBe('2026-09-10')
    })

    it('preferredDay fora da semana → today-in-week', () => {
      expect(
        resolveDefaultNewPlanItemDay({
          weekdayDates: weekSep7,
          todayIso: '2026-09-09',
          preferredDay: '2026-09-14',
          weekMondayFallback: '2026-09-07',
        }),
      ).toBe('2026-09-09')
    })

    it('preferredDay fora da semana e today fora → fallback', () => {
      expect(
        resolveDefaultNewPlanItemDay({
          weekdayDates: weekSep14,
          todayIso: '2026-09-09',
          preferredDay: '2026-09-10',
          weekMondayFallback: '2026-09-14',
        }),
      ).toBe('2026-09-14')
    })
  })
})
