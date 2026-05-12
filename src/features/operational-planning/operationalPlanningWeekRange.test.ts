import { describe, expect, it } from 'vitest'
import { fridayAfterMonday, mondayOfWeekContainingLocal, shiftWeek } from './operationalPlanningWeekRange'

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
})
