import type { OperationalPlanningWeekActivityItem } from '../../domain/operational-planning/operational-planning.types'
import { formatPlanningMinutes } from './planningBoardHelpers'

export type PlanningWeekActivityKindFilter =
  | 'all'
  | 'TIME_ENTRY'
  | 'STEP_COMPLETED'
  | 'STEP_REOPENED'

export type PlanningWeekActivityFilters = {
  q: string
  kind: PlanningWeekActivityKindFilter
  outsidePlanOnly: boolean
}

export const DEFAULT_PLANNING_WEEK_ACTIVITY_FILTERS: PlanningWeekActivityFilters = {
  q: '',
  kind: 'all',
  outsidePlanOnly: false,
}

export function formatPlanningActivityKind(
  kind: OperationalPlanningWeekActivityItem['kind'],
): string {
  switch (kind) {
    case 'TIME_ENTRY':
      return 'Apontamento'
    case 'STEP_COMPLETED':
      return 'Conclusão'
    case 'STEP_REOPENED':
      return 'Reabertura'
    default:
      return 'Evento'
  }
}

export function buildPlanningWeekActivityDescription(
  item: OperationalPlanningWeekActivityItem,
): string {
  if (item.description?.trim()) return item.description.trim()

  const activity = item.activityName?.trim() || 'Atividade'
  switch (item.kind) {
    case 'TIME_ENTRY': {
      const who = item.collaboratorName?.trim() || 'Colaborador'
      const mins = item.minutes != null ? formatPlanningMinutes(item.minutes) : '—'
      return `${who} apontou ${mins} em ${activity}`
    }
    case 'STEP_COMPLETED': {
      const who = item.actorName?.trim() || 'Operador'
      return `${who} concluiu ${activity}`
    }
    case 'STEP_REOPENED': {
      const who = item.actorName?.trim() || 'Operador'
      return `${who} reabriu ${activity}`
    }
    default:
      return activity
  }
}

function matchesSearch(item: OperationalPlanningWeekActivityItem, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  const hay = [
    item.conveyorName,
    item.activityName,
    item.taskName,
    item.areaName,
    item.collaboratorName,
    item.actorName,
    item.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(needle)
}

export function filterPlanningWeekActivityItems(
  items: readonly OperationalPlanningWeekActivityItem[],
  filters: PlanningWeekActivityFilters,
): OperationalPlanningWeekActivityItem[] {
  return items.filter((item) => {
    if (filters.outsidePlanOnly && item.outsidePlan !== true) return false
    if (filters.kind !== 'all' && item.kind !== filters.kind) return false
    if (!matchesSearch(item, filters.q)) return false
    return true
  })
}

export function formatPlanningWeekActivityDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
