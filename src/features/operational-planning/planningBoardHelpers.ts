/** Item mínimo para sumarização do quadro semanal. */
export type PlanningSummaryItemRef = {
  plannedDate: string
  plannedMinutes: number | null
  assignedCollaboratorId?: string
  assignedCollaboratorName?: string | null
  removed?: boolean
  cancelled?: boolean
}

export type PlanningDaySummary = {
  totalMinutes: number
  itemsCount: number
}

export type PlanningAssigneeSummary = {
  assigneeId: string
  displayName: string
  totalMinutes: number
  itemsCount: number
}

export type PlanningCapacityState = 'normal' | 'over_capacity' | 'unknown'

const UNASSIGNED_ASSIGNEE_ID = ''

function isActivePlanningItem(item: PlanningSummaryItemRef): boolean {
  return !item.removed && !item.cancelled
}

function itemMinutes(item: PlanningSummaryItemRef): number {
  const raw = item.plannedMinutes
  if (raw == null || !Number.isFinite(raw)) return 0
  return Math.max(0, Math.floor(raw))
}

/** Formata minutos para leitura no quadro (ex.: 0h, 45min, 1h30, 2h15). */
export function formatPlanningMinutes(minutes: number): string {
  const m = Math.max(0, Math.floor(Number.isFinite(minutes) ? minutes : 0))
  if (m === 0) return '0h'
  const h = Math.floor(m / 60)
  const rem = m % 60
  if (h === 0) return `${rem}min`
  if (rem === 0) return `${h}h`
  return `${h}h${rem}`
}

export function buildPlanningDaySummaries<T extends PlanningSummaryItemRef>(
  items: readonly T[],
): Record<string, PlanningDaySummary> {
  const out: Record<string, PlanningDaySummary> = {}
  for (const item of items) {
    if (!isActivePlanningItem(item)) continue
    const date = item.plannedDate
    if (!date) continue
    const minutes = itemMinutes(item)
    const cur = out[date] ?? { totalMinutes: 0, itemsCount: 0 }
    out[date] = {
      totalMinutes: cur.totalMinutes + minutes,
      itemsCount: cur.itemsCount + 1,
    }
  }
  return out
}

export function buildPlanningAssigneeSummaries<T extends PlanningSummaryItemRef>(
  items: readonly T[],
): PlanningAssigneeSummary[] {
  const byId = new Map<string, PlanningAssigneeSummary>()
  for (const item of items) {
    if (!isActivePlanningItem(item)) continue
    const id = item.assignedCollaboratorId?.trim() || UNASSIGNED_ASSIGNEE_ID
    const name =
      item.assignedCollaboratorName?.trim() ||
      (id === UNASSIGNED_ASSIGNEE_ID ? 'Sem responsável' : id)
    const minutes = itemMinutes(item)
    const cur = byId.get(id) ?? {
      assigneeId: id,
      displayName: name,
      totalMinutes: 0,
      itemsCount: 0,
    }
    byId.set(id, {
      assigneeId: id,
      displayName: cur.displayName || name,
      totalMinutes: cur.totalMinutes + minutes,
      itemsCount: cur.itemsCount + 1,
    })
  }
  return [...byId.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'))
}

export function resolvePlanningCapacityState(
  plannedMinutes: number,
  capacityMinutes: number | null | undefined,
): PlanningCapacityState {
  const planned = Math.max(0, Math.floor(Number.isFinite(plannedMinutes) ? plannedMinutes : 0))
  if (capacityMinutes == null || !Number.isFinite(capacityMinutes)) {
    return 'unknown'
  }
  const capacity = Math.max(0, Math.floor(capacityMinutes))
  if (capacity === 0) {
    return planned > 0 ? 'over_capacity' : 'normal'
  }
  return planned > capacity ? 'over_capacity' : 'normal'
}

export function formatPlanningCapacityExceededMessage(
  plannedMinutes: number,
  capacityMinutes: number,
): string {
  const planned = Math.max(0, Math.floor(Number.isFinite(plannedMinutes) ? plannedMinutes : 0))
  const capacity = Math.max(0, Math.floor(Number.isFinite(capacityMinutes) ? capacityMinutes : 0))
  const excess = Math.max(0, planned - capacity)
  if (excess <= 0) return 'Planejado acima da capacidade diária'
  return `Capacidade excedida em ${formatPlanningMinutes(excess)}`
}

export function sumPlanningItemMinutes<T extends PlanningSummaryItemRef>(
  items: readonly T[],
): number {
  let total = 0
  for (const item of items) {
    if (!isActivePlanningItem(item)) continue
    total += itemMinutes(item)
  }
  return total
}
