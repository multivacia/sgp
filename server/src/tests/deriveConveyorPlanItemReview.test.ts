import { describe, expect, it } from 'vitest'
import { deriveConveyorPlanItemReview } from '../modules/conveyor-operational-plan/deriveConveyorPlanItemReview.js'

const DEFAULT_TEST_CAPACITY = 480

const base = {
  plannedDate: '2026-06-01',
  plannedCollaboratorId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  plannedTeamId: null as string | null,
  stepTeamIds: [] as string[],
  dailyCapacityMinutes: DEFAULT_TEST_CAPACITY,
}

describe('deriveConveyorPlanItemReview', () => {
  it('flags MISSING_PLANNED_MINUTES when plannedMinutes is null', () => {
    const out = deriveConveyorPlanItemReview({ ...base, plannedMinutes: null })
    expect(out.reviewRequired).toBe(true)
    expect(out.reviewReasons.map((r) => r.code)).toContain('MISSING_PLANNED_MINUTES')
  })

  it('flags ZERO_PLANNED_MINUTES when plannedMinutes is 0', () => {
    const out = deriveConveyorPlanItemReview({ ...base, plannedMinutes: 0 })
    expect(out.reviewReasons.map((r) => r.code)).toContain('ZERO_PLANNED_MINUTES')
  })

  it('flags OVER_DAILY_CAPACITY when plannedMinutes exceeds resolved capacity', () => {
    const out = deriveConveyorPlanItemReview({ ...base, plannedMinutes: 500 })
    expect(out.reviewReasons.map((r) => r.code)).toContain('OVER_DAILY_CAPACITY')
  })

  it('does not flag OVER_DAILY_CAPACITY when capacity is 540 and minutes are 500', () => {
    const out = deriveConveyorPlanItemReview({
      ...base,
      plannedMinutes: 500,
      dailyCapacityMinutes: 540,
    })
    expect(out.reviewReasons.map((r) => r.code)).not.toContain('OVER_DAILY_CAPACITY')
  })

  it('includes configured capacity in OVER_DAILY_CAPACITY message', () => {
    const out = deriveConveyorPlanItemReview({
      ...base,
      plannedMinutes: 600,
      dailyCapacityMinutes: 540,
    })
    const reason = out.reviewReasons.find((r) => r.code === 'OVER_DAILY_CAPACITY')
    expect(reason?.message).toContain('capacidade diária configurada')
    expect(reason?.message).toContain('540')
  })

  it('throws when dailyCapacityMinutes is not positive', () => {
    expect(() =>
      deriveConveyorPlanItemReview({
        ...base,
        plannedMinutes: 60,
        dailyCapacityMinutes: 0,
      }),
    ).toThrow(/dailyCapacityMinutes/)
  })

  it('flags MISSING_PLANNED_DATE when date is empty', () => {
    const out = deriveConveyorPlanItemReview({
      ...base,
      plannedMinutes: 60,
      plannedDate: null,
    })
    expect(out.reviewReasons.map((r) => r.code)).toContain('MISSING_PLANNED_DATE')
  })

  it('flags MULTIPLE_TEAMS when step has multiple teams and no plannedTeamId', () => {
    const out = deriveConveyorPlanItemReview({
      ...base,
      plannedMinutes: 60,
      plannedCollaboratorId: null,
      plannedTeamId: null,
      stepTeamIds: ['t1', 't2'],
    })
    expect(out.reviewReasons.map((r) => r.code)).toContain('MULTIPLE_TEAMS')
  })

  it('clears MULTIPLE_TEAMS when plannedTeamId is set', () => {
    const out = deriveConveyorPlanItemReview({
      ...base,
      plannedMinutes: 60,
      plannedTeamId: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
      stepTeamIds: ['t1', 't2'],
    })
    expect(out.reviewReasons.map((r) => r.code)).not.toContain('MULTIPLE_TEAMS')
  })

  it('flags MISSING_ASSIGNEE when no collaborator nor team', () => {
    const out = deriveConveyorPlanItemReview({
      ...base,
      plannedMinutes: 60,
      plannedCollaboratorId: null,
      plannedTeamId: null,
    })
    expect(out.reviewReasons.map((r) => r.code)).toContain('MISSING_ASSIGNEE')
  })

  it('does not flag MISSING_ASSIGNEE when plannedCollaboratorId is set', () => {
    const out = deriveConveyorPlanItemReview({
      ...base,
      plannedMinutes: 60,
      plannedCollaboratorId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      plannedTeamId: null,
    })
    expect(out.reviewReasons.map((r) => r.code)).not.toContain('MISSING_ASSIGNEE')
    expect(out.reviewRequired).toBe(false)
  })

  it('does not flag MISSING_ASSIGNEE when plannedTeamId is set', () => {
    const out = deriveConveyorPlanItemReview({
      ...base,
      plannedMinutes: 60,
      plannedCollaboratorId: null,
      plannedTeamId: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
    })
    expect(out.reviewReasons.map((r) => r.code)).not.toContain('MISSING_ASSIGNEE')
    expect(out.reviewRequired).toBe(false)
  })

  it('returns PLANNED when all checks pass', () => {
    const out = deriveConveyorPlanItemReview({
      ...base,
      plannedMinutes: 120,
      plannedTeamId: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
    })
    expect(out.reviewRequired).toBe(false)
    expect(out.status).toBe('PLANNED')
    expect(out.reviewReasons).toEqual([])
  })

  it('returns NEEDS_REVIEW when any reason remains', () => {
    const out = deriveConveyorPlanItemReview({ ...base, plannedMinutes: null })
    expect(out.status).toBe('NEEDS_REVIEW')
  })
})
