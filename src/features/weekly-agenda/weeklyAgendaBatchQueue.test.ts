import { describe, expect, it } from 'vitest'
import type { OperationalPlanningBacklogItem } from '../../domain/operational-planning/operational-planning.types'
import type { DraftPlanItem } from './weeklyAgendaDraft'
import {
  applyBatchQueueAssignment,
  BATCH_QUEUE_MIN_ITEMS,
  buildCollaboratorFreeMinutesList,
  DEFAULT_WORKDAY_CAPACITY_MINUTES,
  findBestBatchQueueSuggestion,
  freeMinutesInCell,
  resolveCellCapacityMinutes,
  skipBatchQueueItem,
  weeklyFreeMinutesForCollaborator,
} from './weeklyAgendaBatchQueue'
import { applyBacklogToCellDrop } from './weeklyAgendaDnD'

const weekdayDates = ['2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03']

const collaborators = [
  { id: 'col-1', fullName: 'Carlos' },
  { id: 'col-2', fullName: 'Ana' },
]

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
    plannedDate: weekdayDates[0],
    plannedOrder: 0,
    plannedMinutes: 60,
    notes: null,
    ...partial,
  }
}

describe('resolveCellCapacityMinutes', () => {
  it('uses 480min fallback when no capacity row exists', () => {
    expect(resolveCellCapacityMinutes([], 'col-99', weekdayDates[0])).toBe(
      DEFAULT_WORKDAY_CAPACITY_MINUTES,
    )
  })

  it('uses row capacity when present', () => {
    expect(
      resolveCellCapacityMinutes(
        [{ collaboratorId: 'col-1', date: weekdayDates[0], capacityMinutes: 420, plannedMinutes: 0 }],
        'col-1',
        weekdayDates[0],
      ),
    ).toBe(420)
  })
})

describe('weekly free minutes', () => {
  it('ranks collaborator with more folga first', () => {
    const capacityRows = [
      { collaboratorId: 'col-1', date: weekdayDates[0], capacityMinutes: 480, plannedMinutes: 400 },
      { collaboratorId: 'col-2', date: weekdayDates[0], capacityMinutes: 480, plannedMinutes: 100 },
    ]
    const draftItems = [
      draft({ localKey: 'a', activityNodeId: 'act-a', assignedCollaboratorId: 'col-1', plannedMinutes: 400 }),
      draft({
        localKey: 'b',
        activityNodeId: 'act-b',
        assignedCollaboratorId: 'col-2',
        plannedMinutes: 100,
      }),
    ]

    const ranked = buildCollaboratorFreeMinutesList({
      collaborators: collaborators.map((c) => ({ ...c, status: 'active' as const })),
      weekdayDates,
      draftItems,
      capacityRows,
    })

    expect(ranked[0]?.collaboratorId).toBe('col-2')
    expect(ranked[0]?.weeklyFreeMinutes).toBeGreaterThan(ranked[1]?.weeklyFreeMinutes ?? 0)
  })

  it('applies 480min/day fallback across weekdays without rows', () => {
    const free = weeklyFreeMinutesForCollaborator({
      collaboratorId: 'col-1',
      weekdayDates,
      draftItems: [],
      capacityRows: [],
    })
    expect(free).toBe(DEFAULT_WORKDAY_CAPACITY_MINUTES * weekdayDates.length)
  })

  it('subtracts planned minutes in cell from capacity', () => {
    const free = freeMinutesInCell({
      collaboratorId: 'col-1',
      plannedDate: weekdayDates[0],
      draftItems: [draft({ localKey: 'a', activityNodeId: 'act-a', plannedMinutes: 120 })],
      capacityRows: [
        { collaboratorId: 'col-1', date: weekdayDates[0], capacityMinutes: 480, plannedMinutes: 0 },
      ],
    })
    expect(free).toBe(360)
  })
})

describe('findBestBatchQueueSuggestion', () => {
  it('does not pick the collaborator with the most weekly free minutes by name', () => {
    const suggestion = findBestBatchQueueSuggestion({
      item: {
        ...backlogItem,
        suggestionContext: {
          responsibleCollaboratorId: 'col-1',
          responsibleCollaboratorCode: 'C1',
          responsibleCollaboratorFullName: 'Carlos',
          effectiveTeamId: 'team-1',
          effectiveTeamName: 'Time',
          multipleTeamsAssigned: false,
          members: [
            {
              id: 'col-1',
              code: 'C1',
              fullName: 'Carlos',
              isPrimary: true,
              suggestionOrder: 1,
            },
            {
              id: 'col-2',
              code: 'A1',
              fullName: 'Ana',
              isPrimary: false,
              suggestionOrder: 1,
            },
          ],
        },
      },
      weekdayDates,
      draftItems: [
        draft({ localKey: 'a', activityNodeId: 'act-a', assignedCollaboratorId: 'col-1', plannedMinutes: 450 }),
      ],
      capacityRows: [
        { collaboratorId: 'col-1', date: weekdayDates[0], capacityMinutes: 480, plannedMinutes: 450 },
        { collaboratorId: 'col-1', date: weekdayDates[1], capacityMinutes: 480, plannedMinutes: 0 },
        { collaboratorId: 'col-2', date: weekdayDates[0], capacityMinutes: 480, plannedMinutes: 0 },
        { collaboratorId: 'col-2', date: weekdayDates[1], capacityMinutes: 480, plannedMinutes: 0 },
      ],
      defaultPlannedDate: weekdayDates[0],
      neededMinutes: 90,
    })
    expect(suggestion?.collaboratorId).not.toBe('col-2')
    expect(suggestion?.collaboratorId).toBe('col-1')
    expect(suggestion?.plannedDate).toBe(weekdayDates[1])
  })

  it('returns null without inventing a candidate when there is no suggestion context', () => {
    const suggestion = findBestBatchQueueSuggestion({
      item: backlogItem,
      weekdayDates,
      draftItems: [],
      capacityRows: [
        { collaboratorId: 'col-2', date: weekdayDates[0], capacityMinutes: 480, plannedMinutes: 0 },
      ],
      defaultPlannedDate: weekdayDates[1],
    })
    expect(suggestion).toBeNull()
  })
})

describe('skipBatchQueueItem', () => {
  it('moves current item to end of local queue', () => {
    expect(skipBatchQueueItem(['a', 'b', 'c'], 0)).toEqual(['b', 'c', 'a'])
    expect(skipBatchQueueItem(['a', 'b', 'c'], 1)).toEqual(['a', 'c', 'b'])
  })
})

describe('applyBatchQueueAssignment', () => {
  it('produces same payload as applyBacklogToCellDrop for identical input', () => {
    const input = {
      activityNodeId: backlogItem.activityNodeId,
      collaboratorId: 'col-1',
      plannedDate: weekdayDates[2],
      draftItems: [draft({ localKey: 'x', activityNodeId: 'act-x', plannedOrder: 0 })],
      backlogItems: [backlogItem],
      collaborators,
      plannedActivityIds: new Set<string>(),
    }
    const fromQueue = applyBatchQueueAssignment(input)
    const fromDnD = applyBacklogToCellDrop({
      activityNodeId: input.activityNodeId,
      cell: { collaboratorId: input.collaboratorId, plannedDate: input.plannedDate },
      draftItems: input.draftItems,
      backlogItems: input.backlogItems,
      collaborators: input.collaborators,
      plannedActivityIds: input.plannedActivityIds,
    })
    const pickComparable = (items: DraftPlanItem[] | null) =>
      items?.map((item) => {
        const { localKey, ...rest } = item
        void localKey
        return rest
      }) ?? null
    expect(pickComparable(fromQueue)).toEqual(pickComparable(fromDnD))
    const placed = fromQueue?.find((d) => d.activityNodeId === backlogItem.activityNodeId)
    expect(placed?.plannedOrder).toBe(0)
    expect(placed?.plannedDate).toBe(weekdayDates[2])
  })
})

describe('BATCH_QUEUE_MIN_ITEMS', () => {
  it('requires at least 3 backlog items for invite', () => {
    expect(BATCH_QUEUE_MIN_ITEMS).toBe(3)
  })
})
