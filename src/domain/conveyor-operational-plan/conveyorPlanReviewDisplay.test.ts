import { describe, expect, it } from 'vitest'
import type { ConveyorOperationalPlanItem } from './conveyor-operational-plan.types'
import {
  buildConveyorPlanReviewSummary,
  canApproveConveyorOperationalPlan,
  formatConveyorPlanReviewReasons,
  labelConveyorPlanReviewReason,
  plannedMinutesNeedsReviewHighlight,
} from './conveyorPlanReviewDisplay'

function item(
  partial: Partial<ConveyorOperationalPlanItem> = {},
): ConveyorOperationalPlanItem {
  return {
    id: '1',
    planId: 'p',
    conveyorId: 'c',
    activityNodeId: 'a',
    taskTitle: 'T',
    sectorTitle: 'S',
    activityTitle: 'A',
    plannedDate: '2026-06-01',
    plannedOrder: 0,
    plannedMinutes: 60,
    plannedCollaboratorId: 'col',
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

describe('buildConveyorPlanReviewSummary', () => {
  it('aggregates totals and review counts', () => {
    const summary = buildConveyorPlanReviewSummary([
      item({ plannedMinutes: 60 }),
      item({
        id: '2',
        reviewRequired: true,
        reviewReasons: [{ code: 'ZERO_PLANNED_MINUTES', message: 'Tempo zerado.' }],
        plannedMinutes: 0,
      }),
    ])
    expect(summary.totalActive).toBe(2)
    expect(summary.reviewCount).toBe(1)
    expect(summary.readyCount).toBe(1)
    expect(summary.totalPlannedMinutes).toBe(60)
  })

  it('groups reason counts', () => {
    const summary = buildConveyorPlanReviewSummary([
      item({
        reviewRequired: true,
        reviewReasons: [{ code: 'MISSING_PLANNED_DATE', message: 'Sem data.' }],
        plannedDate: null,
      }),
      item({
        id: '2',
        reviewRequired: true,
        reviewReasons: [{ code: 'MISSING_PLANNED_DATE', message: 'Sem data.' }],
        plannedDate: null,
      }),
    ])
    expect(summary.reasonCounts).toEqual([
      { code: 'MISSING_PLANNED_DATE', label: 'sem data planejada', count: 2 },
    ])
  })
})

describe('canApproveConveyorOperationalPlan', () => {
  it('blocks when any active item needs review', () => {
    expect(
      canApproveConveyorOperationalPlan([
        item({ reviewRequired: true, reviewReasons: [{ code: 'X', message: 'x' }] }),
      ]),
    ).toBe(false)
  })

  it('allows when all active items are ready', () => {
    expect(canApproveConveyorOperationalPlan([item()])).toBe(true)
  })
})

describe('plannedMinutesNeedsReviewHighlight', () => {
  it('uses configured daily capacity instead of a fixed threshold', () => {
    expect(plannedMinutesNeedsReviewHighlight(500, 480)).toBe(true)
    expect(plannedMinutesNeedsReviewHighlight(500, 540)).toBe(false)
    expect(plannedMinutesNeedsReviewHighlight('', 540)).toBe(true)
    expect(plannedMinutesNeedsReviewHighlight(0, 540)).toBe(true)
  })
})

describe('review reason labels', () => {
  it('formats messages and labels', () => {
    expect(labelConveyorPlanReviewReason('OVER_DAILY_CAPACITY')).toBe(
      'acima da capacidade diária',
    )
    expect(
      formatConveyorPlanReviewReasons([
        { code: 'A', message: 'Primeiro' },
        { code: 'B', message: 'Segundo' },
      ]),
    ).toBe('Primeiro · Segundo')
  })
})
