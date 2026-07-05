import { arrayMove } from '@dnd-kit/sortable'
import type { OperationalPlanningBacklogItem } from '../../domain/operational-planning/operational-planning.types'
import { type DraftPlanItem, newLocalKey, recalculateOrders } from './weeklyAgendaDraft'

export const BACKLOG_DRAG_PREFIX = 'bl|'
export const CELL_DRAG_PREFIX = 'cell|'
export const PLAN_DRAG_PREFIX = 'plan|'
export const DAY_TAB_DRAG_PREFIX = 'day-tab|'

export function dragBacklogId(activityNodeId: string): string {
  return `${BACKLOG_DRAG_PREFIX}${activityNodeId}`
}

export function dragCellId(collaboratorId: string, plannedDate: string): string {
  return `${CELL_DRAG_PREFIX}${collaboratorId}|${plannedDate}`
}

export function dragPlanId(localKey: string): string {
  return `${PLAN_DRAG_PREFIX}${localKey}`
}

export function dragDayTabId(isoDate: string): string {
  return `${DAY_TAB_DRAG_PREFIX}${isoDate}`
}

export function parseCellId(id: string): { collaboratorId: string; plannedDate: string } | null {
  if (!id.startsWith(CELL_DRAG_PREFIX)) return null
  const rest = id.slice(CELL_DRAG_PREFIX.length)
  const last = rest.lastIndexOf('|')
  if (last <= 0) return null
  return {
    collaboratorId: rest.slice(0, last),
    plannedDate: rest.slice(last + 1),
  }
}

export function parseDayTabId(id: string): string | null {
  if (!id.startsWith(DAY_TAB_DRAG_PREFIX)) return null
  const date = id.slice(DAY_TAB_DRAG_PREFIX.length)
  return date || null
}

export function parsePlanLocalKey(id: string): string | null {
  if (!id.startsWith(PLAN_DRAG_PREFIX)) return null
  const key = id.slice(PLAN_DRAG_PREFIX.length)
  return key || null
}

export function parseBacklogActivityNodeId(id: string): string | null {
  if (!id.startsWith(BACKLOG_DRAG_PREFIX)) return null
  const nodeId = id.slice(BACKLOG_DRAG_PREFIX.length)
  return nodeId || null
}

export function cellGroupKey(collaboratorId: string, plannedDate: string): string {
  return `${collaboratorId}|${plannedDate}`
}

export function nextOrderInCell(
  items: readonly DraftPlanItem[],
  collaboratorId: string,
  plannedDate: string,
  excludeLocalKey?: string,
): number {
  const cellItems = items.filter(
    (d) =>
      d.assignedCollaboratorId === collaboratorId &&
      d.plannedDate === plannedDate &&
      d.localKey !== excludeLocalKey,
  )
  return cellItems.length === 0 ? 0 : Math.max(...cellItems.map((c) => c.plannedOrder)) + 1
}

export function createDraftFromBacklogDrop(input: {
  backlogItem: OperationalPlanningBacklogItem
  collaboratorId: string
  collaboratorName: string | null
  plannedDate: string
  existingItems: readonly DraftPlanItem[]
}): DraftPlanItem {
  const { backlogItem, collaboratorId, collaboratorName, plannedDate, existingItems } = input
  return {
    localKey: newLocalKey(),
    conveyorId: backlogItem.conveyorId,
    activityNodeId: backlogItem.activityNodeId,
    conveyorTitle: backlogItem.conveyorTitle,
    activityTitle: backlogItem.activityTitle,
    taskTitle: backlogItem.taskTitle,
    sectorTitle: backlogItem.sectorTitle,
    assignedCollaboratorId: collaboratorId,
    assignedCollaboratorName: collaboratorName,
    plannedDate,
    plannedOrder: nextOrderInCell(existingItems, collaboratorId, plannedDate),
    plannedMinutes: Math.max(1, backlogItem.pendingMinutes || backlogItem.plannedMinutes || 60),
    notes: null,
    isOutOfSequence: backlogItem.isOutOfSequence,
    realizedMinutes: backlogItem.realizedMinutes,
  }
}

export function applyBacklogToCellDrop(input: {
  activityNodeId: string
  cell: { collaboratorId: string; plannedDate: string }
  draftItems: DraftPlanItem[]
  backlogItems: readonly OperationalPlanningBacklogItem[]
  collaborators: readonly { id: string; fullName: string }[]
  plannedActivityIds: ReadonlySet<string>
}): DraftPlanItem[] | null {
  const { activityNodeId, cell, draftItems, backlogItems, collaborators, plannedActivityIds } = input
  if (plannedActivityIds.has(activityNodeId)) return null
  const bl = backlogItems.find((b) => b.activityNodeId === activityNodeId)
  if (!bl) return null
  const name = collaborators.find((c) => c.id === cell.collaboratorId)?.fullName ?? null
  const next = createDraftFromBacklogDrop({
    backlogItem: bl,
    collaboratorId: cell.collaboratorId,
    collaboratorName: name,
    plannedDate: cell.plannedDate,
    existingItems: draftItems,
  })
  return recalculateOrders([...draftItems, next])
}

export function applyPlanToDayTabDrop(input: {
  planLocalKey: string
  dayTabDate: string
  draftItems: DraftPlanItem[]
}): DraftPlanItem[] | null {
  const { planLocalKey, dayTabDate, draftItems } = input
  const activeItem = draftItems.find((d) => d.localKey === planLocalKey)
  if (!activeItem || activeItem.plannedDate === dayTabDate) return null
  const next = draftItems.map((d) =>
    d.localKey === planLocalKey
      ? {
          ...d,
          plannedDate: dayTabDate,
          plannedOrder: nextOrderInCell(draftItems, d.assignedCollaboratorId, dayTabDate, planLocalKey),
        }
      : d,
  )
  return recalculateOrders(next)
}

export function applyPlanReorderWithinCell(input: {
  planLocalKey: string
  overPlanLocalKey: string
  draftItems: DraftPlanItem[]
}): DraftPlanItem[] | null {
  const { planLocalKey, overPlanLocalKey, draftItems } = input
  const activeItem = draftItems.find((d) => d.localKey === planLocalKey)
  const overItem = draftItems.find((d) => d.localKey === overPlanLocalKey)
  if (!activeItem || !overItem) return null

  const activeCell = cellGroupKey(activeItem.assignedCollaboratorId, activeItem.plannedDate)
  const overCell = cellGroupKey(overItem.assignedCollaboratorId, overItem.plannedDate)
  if (activeCell !== overCell) return null

  const cellItems = draftItems
    .filter((d) => cellGroupKey(d.assignedCollaboratorId, d.plannedDate) === activeCell)
    .sort((a, b) => a.plannedOrder - b.plannedOrder)
  const oldIndex = cellItems.findIndex((d) => d.localKey === planLocalKey)
  const newIndex = cellItems.findIndex((d) => d.localKey === overPlanLocalKey)
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return null

  const reordered = arrayMove(cellItems, oldIndex, newIndex).map((it, idx) => ({
    ...it,
    plannedOrder: idx,
  }))
  const otherItems = draftItems.filter(
    (d) => cellGroupKey(d.assignedCollaboratorId, d.plannedDate) !== activeCell,
  )
  return recalculateOrders([...otherItems, ...reordered])
}

export function applyPlanToCellDrop(input: {
  planLocalKey: string
  cell: { collaboratorId: string; plannedDate: string }
  draftItems: DraftPlanItem[]
  collaborators: readonly { id: string; fullName: string }[]
  insertBeforeLocalKey?: string | null
}): DraftPlanItem[] | null {
  const { planLocalKey, cell, draftItems, collaborators, insertBeforeLocalKey } = input
  const activeItem = draftItems.find((d) => d.localKey === planLocalKey)
  if (!activeItem) return null

  const activeCell = cellGroupKey(activeItem.assignedCollaboratorId, activeItem.plannedDate)
  const targetCell = cellGroupKey(cell.collaboratorId, cell.plannedDate)
  const name = collaborators.find((c) => c.id === cell.collaboratorId)?.fullName ?? null

  if (activeCell === targetCell && !insertBeforeLocalKey) return null

  const withoutActive = draftItems.filter((d) => d.localKey !== planLocalKey)
  const movedItem: DraftPlanItem = {
    ...activeItem,
    assignedCollaboratorId: cell.collaboratorId,
    assignedCollaboratorName: name,
    plannedDate: cell.plannedDate,
  }

  let targetCellItems = withoutActive
    .filter((d) => cellGroupKey(d.assignedCollaboratorId, d.plannedDate) === targetCell)
    .sort((a, b) => a.plannedOrder - b.plannedOrder)

  if (insertBeforeLocalKey) {
    const insertIndex = targetCellItems.findIndex((d) => d.localKey === insertBeforeLocalKey)
    targetCellItems.splice(insertIndex >= 0 ? insertIndex : targetCellItems.length, 0, movedItem)
  } else {
    targetCellItems = [...targetCellItems, movedItem]
  }

  const targetWithOrders = targetCellItems.map((it, idx) => ({ ...it, plannedOrder: idx }))
  const otherItems = withoutActive.filter(
    (d) => cellGroupKey(d.assignedCollaboratorId, d.plannedDate) !== targetCell,
  )
  return recalculateOrders([...otherItems, ...targetWithOrders])
}

export function applyWeeklyAgendaDragEnd(input: {
  activeId: string
  overId: string
  draftItems: DraftPlanItem[]
  backlogItems: readonly OperationalPlanningBacklogItem[]
  collaborators: readonly { id: string; fullName: string }[]
  plannedActivityIds: ReadonlySet<string>
}): DraftPlanItem[] | null {
  const { activeId, overId, draftItems, backlogItems, collaborators, plannedActivityIds } = input
  if (!overId) return null

  const backlogActivityId = parseBacklogActivityNodeId(activeId)
  if (backlogActivityId) {
    const cell = parseCellId(overId)
    if (!cell) return null
    return applyBacklogToCellDrop({
      activityNodeId: backlogActivityId,
      cell,
      draftItems,
      backlogItems,
      collaborators,
      plannedActivityIds,
    })
  }

  const planLocalKey = parsePlanLocalKey(activeId)
  if (!planLocalKey) return null

  const dayTabDate = parseDayTabId(overId)
  if (dayTabDate) {
    return applyPlanToDayTabDrop({ planLocalKey, dayTabDate, draftItems })
  }

  const overPlanKey = parsePlanLocalKey(overId)
  if (overPlanKey) {
    const reordered = applyPlanReorderWithinCell({
      planLocalKey,
      overPlanLocalKey: overPlanKey,
      draftItems,
    })
    if (reordered) return reordered

    const overItem = draftItems.find((d) => d.localKey === overPlanKey)
    if (!overItem) return null
    return applyPlanToCellDrop({
      planLocalKey,
      cell: {
        collaboratorId: overItem.assignedCollaboratorId,
        plannedDate: overItem.plannedDate,
      },
      draftItems,
      collaborators,
      insertBeforeLocalKey: overPlanKey,
    })
  }

  const cell = parseCellId(overId)
  if (cell) {
    return applyPlanToCellDrop({
      planLocalKey,
      cell,
      draftItems,
      collaborators,
    })
  }

  return null
}
