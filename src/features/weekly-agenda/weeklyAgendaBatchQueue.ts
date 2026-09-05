import type { Collaborator } from '../../domain/collaborators/collaborator.types'
import type {
  OperationalPlanningBacklogItem,
  OperationalPlanningWeekPayload,
} from '../../domain/operational-planning/operational-planning.types'
import {
  resolvePlanningCollaboratorSuggestion,
  type PlanningCollaboratorSuggestionResult,
} from '../../domain/operational-planning/planningCollaboratorSuggestion'
import { formatPlanningMinutes } from '../operational-planning/planningBoardHelpers'
import type { DraftPlanItem } from './weeklyAgendaDraft'
import { applyBacklogToCellDrop } from './weeklyAgendaDnD'

/** Capacidade diária padrão por dia útil quando não há linha em capacityByCollaboratorDay (SDD §8.2). */
export const DEFAULT_WORKDAY_CAPACITY_MINUTES = 480

export const BATCH_QUEUE_MIN_ITEMS = 3

export type CapacityRow = NonNullable<
  OperationalPlanningWeekPayload['capacityByCollaboratorDay']
>[number]

export type BatchQueueSuggestion = {
  collaboratorId: string
  collaboratorName: string
  plannedDate: string
  weeklyFreeMinutes: number
  result: PlanningCollaboratorSuggestionResult
}

export function resolveCellCapacityMinutes(
  capacityRows: readonly CapacityRow[],
  collaboratorId: string,
  date: string,
): number {
  const row = capacityRows.find((r) => r.collaboratorId === collaboratorId && r.date === date)
  if (row?.capacityMinutes != null && Number.isFinite(row.capacityMinutes)) {
    return Math.max(0, Math.floor(row.capacityMinutes))
  }
  return DEFAULT_WORKDAY_CAPACITY_MINUTES
}

export function plannedMinutesInCell(
  draftItems: readonly DraftPlanItem[],
  collaboratorId: string,
  plannedDate: string,
): number {
  return draftItems
    .filter((d) => d.assignedCollaboratorId === collaboratorId && d.plannedDate === plannedDate)
    .reduce((sum, d) => sum + Math.max(0, Math.floor(d.plannedMinutes ?? 0)), 0)
}

export function freeMinutesInCell(input: {
  collaboratorId: string
  plannedDate: string
  draftItems: readonly DraftPlanItem[]
  capacityRows: readonly CapacityRow[]
}): number {
  const capacity = resolveCellCapacityMinutes(
    input.capacityRows,
    input.collaboratorId,
    input.plannedDate,
  )
  const planned = plannedMinutesInCell(
    input.draftItems,
    input.collaboratorId,
    input.plannedDate,
  )
  return Math.max(0, capacity - planned)
}

export function weeklyFreeMinutesForCollaborator(input: {
  collaboratorId: string
  weekdayDates: readonly string[]
  draftItems: readonly DraftPlanItem[]
  capacityRows: readonly CapacityRow[]
}): number {
  return input.weekdayDates.reduce(
    (sum, date) =>
      sum +
      freeMinutesInCell({
        collaboratorId: input.collaboratorId,
        plannedDate: date,
        draftItems: input.draftItems,
        capacityRows: input.capacityRows,
      }),
    0,
  )
}

export function buildCollaboratorFreeMinutesList(input: {
  collaborators: readonly Collaborator[]
  weekdayDates: readonly string[]
  draftItems: readonly DraftPlanItem[]
  capacityRows: readonly CapacityRow[]
}): Array<{ collaboratorId: string; collaboratorName: string; weeklyFreeMinutes: number }> {
  return input.collaborators
    .map((c) => ({
      collaboratorId: c.id,
      collaboratorName: c.fullName,
      weeklyFreeMinutes: weeklyFreeMinutesForCollaborator({
        collaboratorId: c.id,
        weekdayDates: input.weekdayDates,
        draftItems: input.draftItems,
        capacityRows: input.capacityRows,
      }),
    }))
    .sort((a, b) => {
      if (b.weeklyFreeMinutes !== a.weeklyFreeMinutes) {
        return b.weeklyFreeMinutes - a.weeklyFreeMinutes
      }
      if (a.collaboratorId < b.collaboratorId) return -1
      if (a.collaboratorId > b.collaboratorId) return 1
      return 0
    })
}

export function findBestBatchQueueSuggestion(input: {
  item: OperationalPlanningBacklogItem | null | undefined
  weekdayDates: readonly string[]
  draftItems: readonly DraftPlanItem[]
  capacityRows: readonly CapacityRow[]
  defaultPlannedDate: string
  neededMinutes?: number
}): BatchQueueSuggestion | null {
  if (input.weekdayDates.length === 0) return null
  const selectedDay = input.weekdayDates.includes(input.defaultPlannedDate)
    ? input.defaultPlannedDate
    : input.weekdayDates[0]
  const neededMinutes = Math.max(
    1,
    input.neededMinutes ??
      input.item?.pendingMinutes ??
      input.item?.plannedMinutes ??
      60,
  )
  const result = resolvePlanningCollaboratorSuggestion({
    context: input.item?.suggestionContext,
    selectedDay,
    weekdayDates: input.weekdayDates,
    neededMinutes,
    capacityRows: input.capacityRows,
    draftItems: input.draftItems,
  })
  const option = result.primary ?? result.alternatives[0]
  if (!option) return null
  return {
    collaboratorId: option.collaboratorId,
    collaboratorName: option.collaboratorFullName,
    plannedDate: option.day,
    weeklyFreeMinutes: option.availableMinutes ?? 0,
    result,
  }
}

export function formatWeeklyFreeMinutesLabel(minutes: number): string {
  return `${formatPlanningMinutes(minutes)} livres`
}

export function skipBatchQueueItem(queue: readonly string[], index: number): string[] {
  if (index < 0 || index >= queue.length) return [...queue]
  const next = [...queue]
  const [item] = next.splice(index, 1)
  next.push(item)
  return next
}

export function batchQueueProgress(input: {
  completedCount: number
  totalCount: number
}): { label: string; percent: number } {
  const total = Math.max(0, input.totalCount)
  const completed = Math.max(0, Math.min(input.completedCount, total))
  const percent = total === 0 ? 100 : Math.round((completed / total) * 100)
  return {
    label: `Item ${Math.min(completed + 1, total || 1)} de ${total}`,
    percent,
  }
}

/** Mesma mutação que bl|* → cell|* no DnD do PR-4. */
export function applyBatchQueueAssignment(input: {
  activityNodeId: string
  collaboratorId: string
  plannedDate: string
  draftItems: DraftPlanItem[]
  backlogItems: readonly import('../../domain/operational-planning/operational-planning.types').OperationalPlanningBacklogItem[]
  collaborators: readonly { id: string; fullName: string }[]
  plannedActivityIds: ReadonlySet<string>
}): DraftPlanItem[] | null {
  return applyBacklogToCellDrop({
    activityNodeId: input.activityNodeId,
    cell: { collaboratorId: input.collaboratorId, plannedDate: input.plannedDate },
    draftItems: input.draftItems,
    backlogItems: input.backlogItems,
    collaborators: input.collaborators,
    plannedActivityIds: input.plannedActivityIds,
  })
}
