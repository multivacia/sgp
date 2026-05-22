import { describe, expect, it } from 'vitest'
import { summarizeConveyorOperationalPlan } from './conveyorPlanSummary'
import type {
  ConveyorOperationalPlan,
  ConveyorOperationalPlanItem,
} from './conveyor-operational-plan.types'

function plan(partial: Partial<ConveyorOperationalPlan> = {}): ConveyorOperationalPlan {
  return {
    id: 'p1',
    conveyorId: 'c1',
    status: 'DRAFT',
    plannedStartDate: null,
    plannedEndDate: null,
    version: 1,
    generatedAt: null,
    generatedBy: null,
    approvedAt: null,
    approvedBy: null,
    factoryPlanningStatus: null,
    notes: null,
    createdAt: '',
    updatedAt: '',
    ...partial,
  }
}

function item(partial: Partial<ConveyorOperationalPlanItem> = {}): ConveyorOperationalPlanItem {
  return {
    id: 'i1',
    planId: 'p1',
    conveyorId: 'c1',
    activityNodeId: 'a1',
    taskTitle: 'T',
    sectorTitle: 'S',
    activityTitle: 'A',
    plannedDate: null,
    plannedOrder: 0,
    plannedMinutes: 60,
    plannedCollaboratorId: null,
    plannedCollaboratorName: null,
    plannedTeamId: null,
    plannedTeamName: null,
    status: 'PLANNED',
    sourceKind: 'GENERATED',
    originWorkPlanItemId: null,
    syncStatus: null,
    reviewRequired: false,
    reviewReasons: [],
    cancellationReason: null,
    notes: null,
    realizedMinutes: 0,
    activityOperationalStatus: null,
    createdAt: '',
    updatedAt: '',
    ...partial,
  }
}

describe('summarizeConveyorOperationalPlan', () => {
  it('counts active items, review and minutes', () => {
    const items = [
      item({ id: '1', plannedMinutes: 30, reviewRequired: true }),
      item({ id: '2', plannedMinutes: 45, sourceKind: 'MANUAL' }),
      item({ id: '3', status: 'CANCELLED', plannedMinutes: 999 }),
    ]
    const summary = summarizeConveyorOperationalPlan(plan(), items)
    expect(summary.activeItemsCount).toBe(2)
    expect(summary.reviewRequiredItemsCount).toBe(1)
    expect(summary.readyItemsCount).toBe(1)
    expect(summary.totalPlannedMinutes).toBe(75)
    expect(summary.manualItemsCount).toBe(1)
    expect(summary.generatedItemsCount).toBe(1)
    expect(summary.cancelledItemsCount).toBe(1)
  })

  it('computes first and last planned dates from active items', () => {
    const items = [
      item({ id: '1', plannedDate: '2026-05-22' }),
      item({ id: '2', plannedDate: '2026-05-20' }),
    ]
    const summary = summarizeConveyorOperationalPlan(plan(), items)
    expect(summary.firstPlannedDate).toBe('2026-05-20')
    expect(summary.lastPlannedDate).toBe('2026-05-22')
  })
})
