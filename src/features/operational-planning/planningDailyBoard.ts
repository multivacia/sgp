import { resolvePlanningItemExecutionSummary } from './planningExecutionHelpers'

export type PlanningDailyColumnId = 'planned' | 'in_progress' | 'attention' | 'completed'

export type PlanningDailyBoardItem = {
  plannedMinutes: number | null
  realizedMinutes?: number | null
  activityOperationalStatus?: string | null
  assignedCollaboratorId?: string
  plannedDate: string
  removed?: boolean
  cancelled?: boolean
}

export type PlanningDailySelectedDay = string | 'week'

export type PlanningViewMode = 'week' | 'daily'

export type PlanningDailyBoardColumn<T extends PlanningDailyBoardItem = PlanningDailyBoardItem> = {
  id: PlanningDailyColumnId
  label: string
  items: T[]
  count: number
  plannedMinutes: number
  realizedMinutes: number
}

export type PlanningDailyBoardColumnsResult<T extends PlanningDailyBoardItem = PlanningDailyBoardItem> =
  {
    columns: PlanningDailyBoardColumn<T>[]
  }

const COLUMN_DEFS: ReadonlyArray<{ id: PlanningDailyColumnId; label: string }> = [
  { id: 'planned', label: 'Planejado / Não iniciado' },
  { id: 'in_progress', label: 'Em andamento' },
  { id: 'attention', label: 'Atenção' },
  { id: 'completed', label: 'Concluído' },
]

function isActiveItem(item: PlanningDailyBoardItem): boolean {
  return !item.removed && !item.cancelled
}

function itemPlannedMinutes(item: PlanningDailyBoardItem): number {
  const raw = item.plannedMinutes
  if (raw == null || !Number.isFinite(raw)) return 0
  return Math.max(0, Math.floor(raw))
}

function itemRealizedMinutes(item: PlanningDailyBoardItem): number {
  const raw = item.realizedMinutes
  if (raw == null || !Number.isFinite(raw)) return 0
  return Math.max(0, Math.floor(raw))
}

function assigneeId(item: PlanningDailyBoardItem): string {
  return item.assignedCollaboratorId?.trim() || ''
}

export function resolvePlanningDailyColumn(item: PlanningDailyBoardItem): PlanningDailyColumnId {
  const operationalStatus = item.activityOperationalStatus?.trim() || null

  if (operationalStatus === 'COMPLETED') {
    return 'completed'
  }

  if (operationalStatus === 'BLOCKED') {
    return 'attention'
  }

  if (!assigneeId(item)) {
    return 'attention'
  }

  const execution = resolvePlanningItemExecutionSummary({
    plannedMinutes: item.plannedMinutes,
    realizedMinutes: item.realizedMinutes,
    operationalStatus,
  })

  if (execution.state === 'no_planned_minutes') {
    return 'attention'
  }

  if (execution.state === 'reached_planned' || execution.state === 'over_planned') {
    return 'attention'
  }

  if (execution.state === 'in_progress') {
    return 'in_progress'
  }

  return 'planned'
}

export function filterPlanningDailyItemsByDay<T extends PlanningDailyBoardItem>(
  items: readonly T[],
  selectedDay: PlanningDailySelectedDay,
): T[] {
  if (selectedDay === 'week') {
    return items.filter((item) => isActiveItem(item))
  }
  return items.filter((item) => isActiveItem(item) && item.plannedDate === selectedDay)
}

export function resolveDefaultPlanningDailySelectedDay(
  weekdayDates: readonly string[],
  todayIso: string,
): PlanningDailySelectedDay {
  if (weekdayDates.includes(todayIso)) {
    return todayIso
  }
  return 'week'
}

export function resolvePlanningDailyBoardEmptyMessage(
  visibleItemsCount: number,
  dayFilteredItemsCount: number,
  filtersActive: boolean,
): string | null {
  if (dayFilteredItemsCount > 0) return null
  if (visibleItemsCount === 0 && filtersActive) {
    return 'Nenhuma atividade encontrada para os filtros atuais.'
  }
  return 'Nenhuma atividade planejada para este recorte.'
}

export function buildPlanningDailyBoardColumns<T extends PlanningDailyBoardItem>(
  items: readonly T[],
  options?: { selectedDay?: PlanningDailySelectedDay },
): PlanningDailyBoardColumnsResult<T> {
  const selectedDay = options?.selectedDay ?? 'week'
  const filtered = filterPlanningDailyItemsByDay(items, selectedDay)

  const buckets = new Map<PlanningDailyColumnId, T[]>()
  for (const def of COLUMN_DEFS) {
    buckets.set(def.id, [])
  }

  for (const item of filtered) {
    const columnId = resolvePlanningDailyColumn(item)
    buckets.get(columnId)!.push(item)
  }

  const columns: PlanningDailyBoardColumn<T>[] = COLUMN_DEFS.map((def) => {
    const columnItems = buckets.get(def.id) ?? []
    let plannedMinutes = 0
    let realizedMinutes = 0
    for (const item of columnItems) {
      plannedMinutes += itemPlannedMinutes(item)
      realizedMinutes += itemRealizedMinutes(item)
    }
    return {
      id: def.id,
      label: def.label,
      items: columnItems,
      count: columnItems.length,
      plannedMinutes,
      realizedMinutes,
    }
  })

  return { columns }
}
