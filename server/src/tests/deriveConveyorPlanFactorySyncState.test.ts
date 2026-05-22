import { describe, expect, it } from 'vitest'
import { deriveConveyorPlanFactorySyncState } from '../modules/conveyor-operational-plan/deriveConveyorPlanFactorySyncState.js'

const basePlan = {
  plannedDate: '2026-06-02',
  plannedMinutes: 120,
  plannedCollaboratorId: 'collab-a',
  plannedTeamId: null as string | null,
  status: 'PLANNED',
  reviewRequired: false,
  hasFactoryLink: true,
}

const baseFactory = {
  plannedDate: '2026-06-02',
  plannedMinutes: 120,
  assignedCollaboratorId: 'collab-a',
  assignedTeamId: null as string | null,
  status: 'PLANNED',
}

describe('deriveConveyorPlanFactorySyncState', () => {
  it('returns PENDING when there is no factory link', () => {
    const out = deriveConveyorPlanFactorySyncState({
      planItem: { ...basePlan, hasFactoryLink: false },
      factoryItem: baseFactory,
    })
    expect(out.syncStatus).toBe('PENDING')
    expect(out.differences).toHaveLength(0)
  })

  it('returns DIVERGED with FACTORY_ITEM_MISSING when linked but factory item absent', () => {
    const out = deriveConveyorPlanFactorySyncState({
      planItem: basePlan,
      factoryItem: null,
    })
    expect(out.syncStatus).toBe('DIVERGED')
    expect(out.differences.map((d) => d.code)).toContain('FACTORY_ITEM_MISSING')
  })

  it('returns DIVERGED when planned dates differ', () => {
    const out = deriveConveyorPlanFactorySyncState({
      planItem: basePlan,
      factoryItem: { ...baseFactory, plannedDate: '2026-06-03' },
    })
    expect(out.syncStatus).toBe('DIVERGED')
    expect(out.differences.map((d) => d.code)).toContain('PLANNED_DATE_CHANGED')
  })

  it('returns DIVERGED when planned minutes differ', () => {
    const out = deriveConveyorPlanFactorySyncState({
      planItem: basePlan,
      factoryItem: { ...baseFactory, plannedMinutes: 90 },
    })
    expect(out.syncStatus).toBe('DIVERGED')
    expect(out.differences.map((d) => d.code)).toContain('PLANNED_MINUTES_CHANGED')
  })

  it('returns DIVERGED when collaborators differ', () => {
    const out = deriveConveyorPlanFactorySyncState({
      planItem: basePlan,
      factoryItem: { ...baseFactory, assignedCollaboratorId: 'collab-b' },
    })
    expect(out.syncStatus).toBe('DIVERGED')
    expect(out.differences.map((d) => d.code)).toContain('ASSIGNEE_CHANGED')
  })

  it('returns DIVERGED when teams differ', () => {
    const out = deriveConveyorPlanFactorySyncState({
      planItem: { ...basePlan, plannedCollaboratorId: null, plannedTeamId: 'team-a' },
      factoryItem: {
        ...baseFactory,
        assignedCollaboratorId: null,
        assignedTeamId: 'team-b',
      },
    })
    expect(out.syncStatus).toBe('DIVERGED')
    expect(out.differences.map((d) => d.code)).toContain('TEAM_CHANGED')
  })

  it('returns DIVERGED when plan item is cancelled but factory item is active', () => {
    const out = deriveConveyorPlanFactorySyncState({
      planItem: { ...basePlan, status: 'CANCELLED' },
      factoryItem: baseFactory,
    })
    expect(out.syncStatus).toBe('DIVERGED')
    expect(out.differences.map((d) => d.code)).toContain('PLAN_ITEM_CANCELLED')
  })

  it('returns DIVERGED when plan item needs review', () => {
    const out = deriveConveyorPlanFactorySyncState({
      planItem: { ...basePlan, reviewRequired: true },
      factoryItem: baseFactory,
    })
    expect(out.syncStatus).toBe('DIVERGED')
    expect(out.differences.map((d) => d.code)).toContain('PLAN_ITEM_NEEDS_REVIEW')
  })

  it('returns SYNCED when all comparable fields match', () => {
    const out = deriveConveyorPlanFactorySyncState({
      planItem: basePlan,
      factoryItem: baseFactory,
    })
    expect(out.syncStatus).toBe('SYNCED')
    expect(out.differences).toHaveLength(0)
  })
})
