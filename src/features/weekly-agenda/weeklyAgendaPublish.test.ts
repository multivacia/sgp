import { describe, expect, it } from 'vitest'
import {
  canPublishWeeklyAgendaPlan,
  isWeeklyAgendaPublishDisabled,
} from './weeklyAgendaPublish'

describe('weeklyAgendaPublish', () => {
  const base = {
    busy: false,
    dirty: false,
    draftItemsCount: 2,
    hasPlan: true,
    planStatus: 'DRAFT' as const,
  }

  it('allows publish when plan saved, not dirty, with items', () => {
    expect(canPublishWeeklyAgendaPlan(base)).toBe(true)
    expect(isWeeklyAgendaPublishDisabled(base)).toBe(false)
  })

  it('blocks publish when dirty (same rule as OperationalPlanningPage)', () => {
    expect(canPublishWeeklyAgendaPlan({ ...base, dirty: true })).toBe(false)
  })

  it('blocks publish when busy', () => {
    expect(canPublishWeeklyAgendaPlan({ ...base, busy: true })).toBe(false)
  })

  it('blocks publish when no items', () => {
    expect(canPublishWeeklyAgendaPlan({ ...base, draftItemsCount: 0 })).toBe(false)
  })

  it('blocks publish when plan does not exist yet', () => {
    expect(canPublishWeeklyAgendaPlan({ ...base, hasPlan: false })).toBe(false)
  })

  it('blocks publish when already published without draft revision', () => {
    expect(
      canPublishWeeklyAgendaPlan({ ...base, planStatus: 'PUBLISHED' }),
    ).toBe(false)
  })
})
