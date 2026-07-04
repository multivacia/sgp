import { describe, expect, it } from 'vitest'
import { weeklyAgendaDayColumnClass } from './weeklyAgendaDayColumnVisibility'

describe('weeklyAgendaDayColumnClass', () => {
  it('shows only the selected day below lg via hidden + table-cell', () => {
    expect(weeklyAgendaDayColumnClass('2026-02-18', '2026-02-18')).toBe('table-cell')
    expect(weeklyAgendaDayColumnClass('2026-02-18', '2026-02-17')).toBe('hidden lg:table-cell')
  })
})
