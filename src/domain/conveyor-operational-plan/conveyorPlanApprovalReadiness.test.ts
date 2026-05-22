import { describe, expect, it, vi } from 'vitest'
import { summarizeConveyorOperationalPlanApprovalReadiness } from './conveyorPlanApprovalReadiness'
import type {
  ConveyorOperationalPlan,
  ConveyorOperationalPlanItem,
} from './conveyor-operational-plan.types'

function plan(partial: Partial<ConveyorOperationalPlan> = {}): ConveyorOperationalPlan {
  return {
    id: 'p1',
    conveyorId: 'c1',
    status: 'DRAFT',
    plannedStartDate: '2026-06-01',
    plannedEndDate: null,
    version: 1,
    generatedAt: '2026-05-01T10:00:00.000Z',
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
    plannedDate: '2026-06-02',
    plannedOrder: 0,
    plannedMinutes: 60,
    plannedCollaboratorId: 'col-1',
    plannedCollaboratorName: 'Colab',
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
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
    ...partial,
  }
}

describe('summarizeConveyorOperationalPlanApprovalReadiness', () => {
  it('blocks when no active items', () => {
    const r = summarizeConveyorOperationalPlanApprovalReadiness(plan(), [], 480)
    expect(r.canApprove).toBe(false)
    expect(r.blockers.some((b) => b.includes('itens ativos'))).toBe(true)
  })

  it('blocks when item needs review', () => {
    const r = summarizeConveyorOperationalPlanApprovalReadiness(
      plan(),
      [item({ reviewRequired: true, status: 'NEEDS_REVIEW' })],
      480,
    )
    expect(r.canApprove).toBe(false)
    expect(r.blockers.some((b) => b.includes('revisão'))).toBe(true)
  })

  it('blocks when item has no planned date', () => {
    const r = summarizeConveyorOperationalPlanApprovalReadiness(
      plan(),
      [
        item({
          plannedDate: null,
          reviewRequired: true,
          reviewReasons: [{ code: 'MISSING_PLANNED_DATE', message: 'sem data' }],
        }),
      ],
      480,
    )
    expect(r.canApprove).toBe(false)
    expect(r.checklist.find((c) => c.id === 'planned-date')?.level).toBe('blocker')
  })

  it('blocks when item has no minutes', () => {
    const r = summarizeConveyorOperationalPlanApprovalReadiness(
      plan(),
      [
        item({
          plannedMinutes: null,
          reviewRequired: true,
          reviewReasons: [{ code: 'MISSING_PLANNED_MINUTES', message: 'sem tempo' }],
        }),
      ],
      480,
    )
    expect(r.canApprove).toBe(false)
    expect(r.checklist.find((c) => c.id === 'planned-minutes')?.level).toBe('blocker')
  })

  it('blocks when item has no assignee', () => {
    const r = summarizeConveyorOperationalPlanApprovalReadiness(
      plan(),
      [
        item({
          plannedCollaboratorId: null,
          reviewRequired: true,
          reviewReasons: [{ code: 'MISSING_ASSIGNEE', message: 'sem resp' }],
        }),
      ],
      480,
    )
    expect(r.canApprove).toBe(false)
    expect(r.checklist.find((c) => c.id === 'assignee')?.level).toBe('blocker')
  })

  it('warns on cancelled items without blocking', () => {
    const r = summarizeConveyorOperationalPlanApprovalReadiness(
      plan(),
      [item(), item({ id: 'c1', status: 'CANCELLED' })],
      480,
    )
    expect(r.canApprove).toBe(true)
    expect(r.warnings.some((w) => w.includes('cancelado'))).toBe(true)
    expect(r.checklist.find((c) => c.id === 'cancelled')?.level).toBe('warning')
  })

  it('warns on manually adjusted generated items', () => {
    const r = summarizeConveyorOperationalPlanApprovalReadiness(
      plan({ generatedAt: '2026-05-01T10:00:00.000Z' }),
      [
        item({
          sourceKind: 'GENERATED',
          updatedAt: '2026-05-10T10:00:00.000Z',
        }),
      ],
      480,
    )
    expect(r.canApprove).toBe(true)
    expect(r.checklist.find((c) => c.id === 'manual-adjustment')?.level).toBe('warning')
  })

  it('allows approve on clean plan', () => {
    const r = summarizeConveyorOperationalPlanApprovalReadiness(plan(), [item()], 480)
    expect(r.canApprove).toBe(true)
    expect(r.blockers).toHaveLength(0)
  })

  it('warns when plan period start is missing', () => {
    const r = summarizeConveyorOperationalPlanApprovalReadiness(
      plan({ plannedStartDate: null }),
      [item()],
      480,
    )
    expect(r.canApprove).toBe(true)
    expect(r.checklist.find((c) => c.id === 'plan-period')?.level).toBe('warning')
  })

  it('warns when generation is stale', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T12:00:00.000Z'))
    const r = summarizeConveyorOperationalPlanApprovalReadiness(
      plan({ generatedAt: '2026-05-01T10:00:00.000Z' }),
      [item()],
      480,
    )
    expect(r.checklist.find((c) => c.id === 'stale-generation')?.level).toBe('warning')
    vi.useRealTimers()
  })
})
