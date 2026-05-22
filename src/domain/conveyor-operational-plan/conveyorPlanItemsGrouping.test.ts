import { describe, expect, it } from 'vitest'
import {
  CONVEYOR_PLAN_UNDATED_GROUP_KEY,
  formatConveyorPlanPlannedDateLabel,
  groupItemsByPlannedDate,
} from './conveyorPlanItemsGrouping'
import type { ConveyorOperationalPlanItem } from './conveyor-operational-plan.types'

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
    plannedMinutes: null,
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

describe('groupItemsByPlannedDate', () => {
  it('groups by date, undated last, sorts dates and plannedOrder', () => {
    const input = [
      item({ id: 'b', plannedDate: '2026-05-21', plannedOrder: 2 }),
      item({ id: 'a', plannedDate: '2026-05-21', plannedOrder: 1 }),
      item({ id: 'c', plannedDate: '2026-05-20', plannedOrder: 0 }),
      item({ id: 'u', plannedOrder: 0 }),
    ]
    const groups = groupItemsByPlannedDate(input)
    expect(groups).toHaveLength(3)
    expect(groups[0].dateKey).toBe('2026-05-20')
    expect(groups[1].dateKey).toBe('2026-05-21')
    expect(groups[1].items.map((i) => i.id)).toEqual(['a', 'b'])
    expect(groups[2].dateKey).toBe(CONVEYOR_PLAN_UNDATED_GROUP_KEY)
    expect(groups[2].items[0].id).toBe('u')
  })

  it('does not mutate input array', () => {
    const input = [item({ id: '1', plannedDate: '2026-05-20' })]
    const copy = [...input]
    groupItemsByPlannedDate(input)
    expect(input).toEqual(copy)
  })

  it('hides cancelled by default', () => {
    const groups = groupItemsByPlannedDate([
      item({ id: 'x', status: 'CANCELLED', plannedDate: '2026-05-20' }),
      item({ id: 'y', plannedDate: '2026-05-20' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].items).toHaveLength(1)
    expect(groups[0].items[0].id).toBe('y')
  })

  it('shows cancelled when includeCancelled is true', () => {
    const groups = groupItemsByPlannedDate(
      [
        item({ id: 'x', status: 'CANCELLED', plannedDate: '2026-05-20' }),
        item({ id: 'y', plannedDate: '2026-05-20' }),
      ],
      { includeCancelled: true },
    )
    expect(groups[0].items).toHaveLength(2)
    expect(groups[0].items.map((i) => i.id).sort()).toEqual(['x', 'y'])
  })

  it('formats planned date label with weekday', () => {
    expect(formatConveyorPlanPlannedDateLabel('2026-05-20')).toBe('Quarta, 20/05/2026')
  })
})
