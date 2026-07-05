import { describe, expect, it } from 'vitest'
import type { OperationalPlanningBacklogItem } from '../../domain/operational-planning/operational-planning.types'
import {
  type DraftPlanItem,
  recalculateOrders,
  removeDraftPlanItem,
} from './weeklyAgendaDraft'
import {
  applyBacklogToCellDrop,
  applyPlanReorderWithinCell,
  applyPlanToCellDrop,
  applyPlanToDayTabDrop,
  applyWeeklyAgendaDragEnd,
  cellGroupKey,
  dragBacklogId,
  dragCellId,
  dragDayTabId,
  dragPlanId,
  parseCellId,
  parseDayTabId,
} from './weeklyAgendaDnD'

const collaborators = [{ id: 'col-1', fullName: 'Carlos' }]

const backlogItem: OperationalPlanningBacklogItem = {
  conveyorId: 'conv-3',
  conveyorTitle: 'ET-003',
  clientName: null,
  vehicleDescription: null,
  licensePlate: null,
  taskTitle: 'Tapeçaria',
  sectorTitle: 'Montagem',
  activityNodeId: 'act-backlog',
  activityTitle: 'Cortar tecido',
  plannedMinutes: 90,
  realizedMinutes: 0,
  pendingMinutes: 90,
  assignedCollaborators: [],
  assignedTeams: [],
  isOutOfSequence: false,
  previousOpenCount: 0,
  isOverdue: false,
  hasAssignees: false,
}

function draft(partial: Partial<DraftPlanItem> & Pick<DraftPlanItem, 'localKey' | 'activityNodeId'>): DraftPlanItem {
  return {
    conveyorId: 'conv-1',
    conveyorTitle: 'ET-001',
    activityTitle: 'Atividade',
    taskTitle: 'Tarefa',
    sectorTitle: 'Setor',
    assignedCollaboratorId: 'col-1',
    assignedCollaboratorName: 'Carlos',
    plannedDate: '2026-06-29',
    plannedOrder: 0,
    plannedMinutes: 60,
    notes: null,
    ...partial,
  }
}

describe('weeklyAgendaDnD ids', () => {
  it('parses cell and day-tab ids', () => {
    expect(parseCellId(dragCellId('col-1', '2026-06-29'))).toEqual({
      collaboratorId: 'col-1',
      plannedDate: '2026-06-29',
    })
    expect(parseDayTabId(dragDayTabId('2026-06-30'))).toBe('2026-06-30')
  })
})

describe('applyBacklogToCellDrop', () => {
  it('creates draft item with max+1 order in target cell', () => {
    const existing = [
      draft({ localKey: 'a', activityNodeId: 'act-a', plannedOrder: 0 }),
      draft({
        localKey: 'b',
        activityNodeId: 'act-b',
        plannedDate: '2026-06-29',
        plannedOrder: 1,
      }),
    ]
    const next = applyBacklogToCellDrop({
      activityNodeId: 'act-backlog',
      cell: { collaboratorId: 'col-1', plannedDate: '2026-06-29' },
      draftItems: existing,
      backlogItems: [backlogItem],
      collaborators,
      plannedActivityIds: new Set(['act-a', 'act-b']),
    })
    expect(next).not.toBeNull()
    const created = next!.find((i) => i.activityNodeId === 'act-backlog')
    expect(created?.assignedCollaboratorId).toBe('col-1')
    expect(created?.plannedDate).toBe('2026-06-29')
    expect(created?.plannedOrder).toBe(2)
  })
})

describe('applyPlanToCellDrop', () => {
  it('moves item to another cell and recalculates orders in both cells', () => {
    const items = recalculateOrders([
      draft({ localKey: 'a', activityNodeId: 'act-a', plannedOrder: 0, plannedDate: '2026-06-29' }),
      draft({ localKey: 'b', activityNodeId: 'act-b', plannedOrder: 0, plannedDate: '2026-06-30' }),
      draft({ localKey: 'c', activityNodeId: 'act-c', plannedOrder: 1, plannedDate: '2026-06-30' }),
    ])
    const next = applyPlanToCellDrop({
      planLocalKey: 'a',
      cell: { collaboratorId: 'col-1', plannedDate: '2026-06-30' },
      draftItems: items,
      collaborators,
    })
    expect(next).not.toBeNull()
    const monday = next!.filter((i) => i.plannedDate === '2026-06-29')
    const tuesday = next!
      .filter((i) => i.plannedDate === '2026-06-30')
      .sort((a, b) => a.plannedOrder - b.plannedOrder)
    expect(monday).toHaveLength(0)
    expect(tuesday.map((i) => i.localKey)).toEqual(['b', 'c', 'a'])
    expect(tuesday.map((i) => i.plannedOrder)).toEqual([0, 1, 2])
  })
})

describe('applyPlanToDayTabDrop', () => {
  it('updates only plannedDate and keeps collaborator', () => {
    const items = recalculateOrders([
      draft({ localKey: 'a', activityNodeId: 'act-a', plannedDate: '2026-06-29', plannedOrder: 0 }),
    ])
    const next = applyPlanToDayTabDrop({
      planLocalKey: 'a',
      dayTabDate: '2026-07-01',
      draftItems: items,
    })
    const moved = next!.find((i) => i.localKey === 'a')
    expect(moved?.plannedDate).toBe('2026-07-01')
    expect(moved?.assignedCollaboratorId).toBe('col-1')
    expect(moved?.plannedOrder).toBe(0)
  })
})

describe('applyPlanReorderWithinCell', () => {
  it('reorders items 0..n-1 within the same cell', () => {
    const items = recalculateOrders([
      draft({ localKey: 'a', activityNodeId: 'act-a', plannedOrder: 0 }),
      draft({ localKey: 'b', activityNodeId: 'act-b', plannedOrder: 1 }),
    ])
    const next = applyPlanReorderWithinCell({
      planLocalKey: 'a',
      overPlanLocalKey: 'b',
      draftItems: items,
    })
    const cell = next!
      .filter((i) => cellGroupKey(i.assignedCollaboratorId, i.plannedDate) === 'col-1|2026-06-29')
      .sort((a, b) => a.plannedOrder - b.plannedOrder)
    expect(cell.map((i) => i.localKey)).toEqual(['b', 'a'])
    expect(cell.map((i) => i.plannedOrder)).toEqual([0, 1])
  })
})

describe('applyWeeklyAgendaDragEnd', () => {
  it('routes backlog drop through drag ids', () => {
    const next = applyWeeklyAgendaDragEnd({
      activeId: dragBacklogId('act-backlog'),
      overId: dragCellId('col-1', '2026-06-30'),
      draftItems: [],
      backlogItems: [backlogItem],
      collaborators,
      plannedActivityIds: new Set(),
    })
    expect(next?.some((i) => i.activityNodeId === 'act-backlog')).toBe(true)
  })

  it('routes plan drop on day tab', () => {
    const items = recalculateOrders([
      draft({ localKey: 'a', activityNodeId: 'act-a', plannedDate: '2026-06-29' }),
    ])
    const next = applyWeeklyAgendaDragEnd({
      activeId: dragPlanId('a'),
      overId: dragDayTabId('2026-06-30'),
      draftItems: items,
      backlogItems: [],
      collaborators,
      plannedActivityIds: new Set(['act-a']),
    })
    expect(next?.find((i) => i.localKey === 'a')?.plannedDate).toBe('2026-06-30')
  })
})

describe('removeDraftPlanItem', () => {
  it('removes item locally and compacts orders', () => {
    const items = recalculateOrders([
      draft({ localKey: 'a', activityNodeId: 'act-a', plannedOrder: 0 }),
      draft({ localKey: 'b', activityNodeId: 'act-b', plannedOrder: 1 }),
    ])
    const next = removeDraftPlanItem(items, 'a')
    expect(next).toHaveLength(1)
    expect(next[0]?.localKey).toBe('b')
    expect(next[0]?.plannedOrder).toBe(0)
  })
})
