import type { PlanningCapacityCellRef } from './planningBoardFilters'
import { resolvePlanningCapacityState } from './planningBoardHelpers'
import { resolvePlanningItemExecutionSummary } from './planningExecutionHelpers'

/** Item mínimo para resumo operacional da semana. */
export type PlanningWeekOperationalSummaryItem = {
  plannedMinutes: number | null
  realizedMinutes?: number | null
  activityOperationalStatus?: string | null
  assignedCollaboratorId?: string
  plannedDate: string
  removed?: boolean
  cancelled?: boolean
}

export type BuildPlanningWeekOperationalSummaryOptions = {
  capacityByCollaboratorDay?: readonly PlanningCapacityCellRef[]
  /**
   * Itens completos da semana para células com capacidade excedida.
   * Quando omitido, usa `items` (adequado se já forem todos os itens ativos).
   */
  itemsForCapacityCells?: readonly PlanningWeekOperationalSummaryItem[]
}

export type PlanningWeekOperationalSummary = {
  totalItems: number
  totalPlannedMinutes: number
  totalRealizedMinutes: number
  completedItems: number
  inProgressItems: number
  notStartedItems: number
  withoutTimeEntryItems: number
  reachedPlannedItems: number
  overPlannedItems: number
  overCapacityCells: number
  attentionItems: number
}

const EMPTY_SUMMARY: PlanningWeekOperationalSummary = {
  totalItems: 0,
  totalPlannedMinutes: 0,
  totalRealizedMinutes: 0,
  completedItems: 0,
  inProgressItems: 0,
  notStartedItems: 0,
  withoutTimeEntryItems: 0,
  reachedPlannedItems: 0,
  overPlannedItems: 0,
  overCapacityCells: 0,
  attentionItems: 0,
}

function isActiveItem(item: PlanningWeekOperationalSummaryItem): boolean {
  return !item.removed && !item.cancelled
}

function itemPlannedMinutes(item: PlanningWeekOperationalSummaryItem): number {
  const raw = item.plannedMinutes
  if (raw == null || !Number.isFinite(raw)) return 0
  return Math.max(0, Math.floor(raw))
}

function itemRealizedForTotal(item: PlanningWeekOperationalSummaryItem): number {
  const raw = item.realizedMinutes
  if (raw == null || !Number.isFinite(raw)) return 0
  return Math.max(0, Math.floor(raw))
}

function assigneeId(item: PlanningWeekOperationalSummaryItem): string {
  return item.assignedCollaboratorId?.trim() || ''
}

function planningCellKey(collaboratorId: string, plannedDate: string): string {
  return `${collaboratorId}|${plannedDate}`
}

function buildOverCapacityCellKeys(
  items: readonly PlanningWeekOperationalSummaryItem[],
  capacityByCell: readonly PlanningCapacityCellRef[],
): Set<string> {
  const capacityMap = new Map<string, number | null | undefined>()
  for (const row of capacityByCell) {
    capacityMap.set(planningCellKey(row.collaboratorId, row.date), row.capacityMinutes)
  }

  const plannedByCell = new Map<string, number>()
  for (const item of items) {
    if (!isActiveItem(item) || !item.plannedDate) continue
    const key = planningCellKey(assigneeId(item), item.plannedDate)
    plannedByCell.set(key, (plannedByCell.get(key) ?? 0) + itemPlannedMinutes(item))
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

function itemNeedsAttention(
  item: PlanningWeekOperationalSummaryItem,
  executionState: ReturnType<typeof resolvePlanningItemExecutionSummary>['state'],
  operationalStatus: string | null,
  overCapacityCells: Set<string>,
): boolean {
  if (executionState === 'over_planned' || executionState === 'reached_planned') return true
  if (operationalStatus === 'BLOCKED') return true
  if (!assigneeId(item)) return true
  if (executionState === 'no_planned_minutes') return true
  if (item.plannedDate) {
    const key = planningCellKey(assigneeId(item), item.plannedDate)
    if (overCapacityCells.has(key)) return true
  }
  return false
}

export function buildPlanningWeekOperationalSummary(
  items: readonly PlanningWeekOperationalSummaryItem[],
  options?: BuildPlanningWeekOperationalSummaryOptions,
): PlanningWeekOperationalSummary {
  const capacityRows = options?.capacityByCollaboratorDay
  const capacitySource = options?.itemsForCapacityCells ?? items
  const overCapacityCells =
    capacityRows?.length && capacityRows.length > 0
      ? buildOverCapacityCellKeys(capacitySource, capacityRows)
      : new Set<string>()

  let totalItems = 0
  let totalPlannedMinutes = 0
  let totalRealizedMinutes = 0
  let completedItems = 0
  let inProgressItems = 0
  let notStartedItems = 0
  let withoutTimeEntryItems = 0
  let reachedPlannedItems = 0
  let overPlannedItems = 0
  let attentionItems = 0

  for (const item of items) {
    if (!isActiveItem(item)) continue

    totalItems += 1
    totalPlannedMinutes += itemPlannedMinutes(item)
    totalRealizedMinutes += itemRealizedForTotal(item)

    const operationalStatus = item.activityOperationalStatus?.trim() || null
    const execution = resolvePlanningItemExecutionSummary({
      plannedMinutes: item.plannedMinutes,
      realizedMinutes: item.realizedMinutes,
      operationalStatus: operationalStatus,
    })

    if (execution.isOperationallyCompleted) {
      completedItems += 1
    } else if (execution.state === 'in_progress') {
      inProgressItems += 1
    } else if (execution.state === 'not_started' || execution.state === 'unknown') {
      notStartedItems += 1
      withoutTimeEntryItems += 1
    }

    if (execution.state === 'reached_planned') {
      reachedPlannedItems += 1
    }
    if (execution.state === 'over_planned') {
      overPlannedItems += 1
    }

    if (itemNeedsAttention(item, execution.state, operationalStatus, overCapacityCells)) {
      attentionItems += 1
    }
  }

  return {
    totalItems,
    totalPlannedMinutes,
    totalRealizedMinutes,
    completedItems,
    inProgressItems,
    notStartedItems,
    withoutTimeEntryItems,
    reachedPlannedItems,
    overPlannedItems,
    overCapacityCells: overCapacityCells.size,
    attentionItems,
  }
}

export function emptyPlanningWeekOperationalSummary(): PlanningWeekOperationalSummary {
  return { ...EMPTY_SUMMARY }
}
