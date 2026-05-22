import {
  resolvePlanningCapacityState,
  type PlanningSummaryItemRef,
} from './planningBoardHelpers'

/** Item mínimo para filtros do quadro semanal. */
export type PlanningFilterableItem = PlanningSummaryItemRef & {
  conveyorId: string
  conveyorTitle?: string
  activityTitle?: string
  taskTitle?: string
  sectorTitle?: string
}

export const PLANNING_COLLABORATOR_ALL = ''
export const PLANNING_COLLABORATOR_UNASSIGNED = '__unassigned__'
export const PLANNING_CONVEYOR_ALL = ''

export type PlanningFilterState = 'all' | 'no_assignee' | 'over_capacity'

export type PlanningBoardFilters = {
  collaboratorId: string
  conveyorId: string
  state: PlanningFilterState
  q: string
}

export const DEFAULT_PLANNING_BOARD_FILTERS: PlanningBoardFilters = {
  collaboratorId: PLANNING_COLLABORATOR_ALL,
  conveyorId: PLANNING_CONVEYOR_ALL,
  state: 'all',
  q: '',
}

export type PlanningCollaboratorOption = {
  id: string
  label: string
}

export type PlanningConveyorOption = {
  id: string
  label: string
}

export type PlanningFilterOptions = {
  collaborators: PlanningCollaboratorOption[]
  hasUnassigned: boolean
  conveyors: PlanningConveyorOption[]
  states: PlanningFilterState[]
}

export type PlanningCapacityCellRef = {
  collaboratorId: string
  date: string
  capacityMinutes: number | null | undefined
}

function isActivePlanningFilterItem(item: PlanningFilterableItem): boolean {
  return !item.removed && !item.cancelled
}

function itemMinutes(item: PlanningFilterableItem): number {
  const raw = item.plannedMinutes
  if (raw == null || !Number.isFinite(raw)) return 0
  return Math.max(0, Math.floor(raw))
}

function assigneeId(item: PlanningFilterableItem): string {
  return item.assignedCollaboratorId?.trim() || ''
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function planningCellKey(collaboratorId: string, plannedDate: string): string {
  return `${collaboratorId}|${plannedDate}`
}

export function isPlanningBoardFiltersActive(filters: PlanningBoardFilters): boolean {
  return (
    filters.collaboratorId !== PLANNING_COLLABORATOR_ALL ||
    filters.conveyorId !== PLANNING_CONVEYOR_ALL ||
    filters.state !== 'all' ||
    filters.q.trim() !== ''
  )
}

export function matchesPlanningTextSearch(
  item: PlanningFilterableItem,
  query: string,
): boolean {
  const q = normalizeSearchText(query)
  if (!q) return true
  const haystack = normalizeSearchText(
    [
      item.conveyorTitle,
      item.activityTitle,
      item.taskTitle,
      item.sectorTitle,
      item.assignedCollaboratorName,
    ]
      .filter((v): v is string => Boolean(v?.trim()))
      .join(' '),
  )
  return haystack.includes(q)
}

function buildOverCapacityCellKeys(
  items: readonly PlanningFilterableItem[],
  capacityByCell: readonly PlanningCapacityCellRef[],
): Set<string> {
  const capacityMap = new Map<string, number | null | undefined>()
  for (const row of capacityByCell) {
    capacityMap.set(planningCellKey(row.collaboratorId, row.date), row.capacityMinutes)
  }

  const plannedByCell = new Map<string, number>()
  for (const item of items) {
    if (!isActivePlanningFilterItem(item) || !item.plannedDate) continue
    const key = planningCellKey(assigneeId(item), item.plannedDate)
    plannedByCell.set(key, (plannedByCell.get(key) ?? 0) + itemMinutes(item))
  }

  const over = new Set<string>()
  for (const [key, planned] of plannedByCell) {
    const capacity = capacityMap.get(key)
    if (resolvePlanningCapacityState(planned, capacity) === 'over_capacity') {
      over.add(key)
    }
  }
  return over
}

export function buildPlanningFilterOptions(
  items: readonly PlanningFilterableItem[],
  options?: { includeOverCapacityState?: boolean },
): PlanningFilterOptions {
  const collaboratorById = new Map<string, string>()
  const conveyorById = new Map<string, string>()
  let hasUnassigned = false

  for (const item of items) {
    if (!isActivePlanningFilterItem(item)) continue
    const collabId = assigneeId(item)
    if (!collabId) {
      hasUnassigned = true
    } else {
      const label =
        item.assignedCollaboratorName?.trim() ||
        collaboratorById.get(collabId) ||
        collabId
      collaboratorById.set(collabId, label)
    }
    if (item.conveyorId) {
      const title = item.conveyorTitle?.trim() || conveyorById.get(item.conveyorId) || item.conveyorId
      conveyorById.set(item.conveyorId, title)
    }
  }

  const collaborators = [...collaboratorById.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))

  const conveyors = [...conveyorById.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))

  const states: PlanningFilterState[] = ['all', 'no_assignee']
  if (options?.includeOverCapacityState) {
    states.push('over_capacity')
  }

  return { collaborators, hasUnassigned, conveyors, states }
}

export function filterPlanningDraftItems<T extends PlanningFilterableItem>(
  items: readonly T[],
  filters: PlanningBoardFilters,
  capacityByCell?: readonly PlanningCapacityCellRef[],
): T[] {
  const overCapacityCells =
    filters.state === 'over_capacity' && capacityByCell?.length
      ? buildOverCapacityCellKeys(items, capacityByCell)
      : null

  return items.filter((item) => {
    if (!isActivePlanningFilterItem(item)) return false

    if (filters.collaboratorId === PLANNING_COLLABORATOR_UNASSIGNED) {
      if (assigneeId(item)) return false
    } else if (
      filters.collaboratorId &&
      filters.collaboratorId !== PLANNING_COLLABORATOR_ALL &&
      assigneeId(item) !== filters.collaboratorId
    ) {
      return false
    }

    if (
      filters.conveyorId &&
      filters.conveyorId !== PLANNING_CONVEYOR_ALL &&
      item.conveyorId !== filters.conveyorId
    ) {
      return false
    }

    if (filters.state === 'no_assignee' && assigneeId(item)) {
      return false
    }

    if (filters.state === 'over_capacity') {
      if (!overCapacityCells || !item.plannedDate) return false
      const key = planningCellKey(assigneeId(item), item.plannedDate)
      if (!overCapacityCells.has(key)) return false
    }

    if (!matchesPlanningTextSearch(item, filters.q)) {
      return false
    }

    return true
  })
}
