import { filterPlanningDailyItemsByDay } from '../operational-planning/planningDailyBoard'
import type { PlanningDailySelectedDay, PlanningViewMode } from '../operational-planning/planningDailyBoard'
import type { ActivityTicketPlanningSource } from './activityTicketPlanningSource'

export function sortPlanningSourcesForTicketPrint(
  items: readonly ActivityTicketPlanningSource[],
): ActivityTicketPlanningSource[] {
  return [...items].sort((a, b) => {
    const dateCmp = a.plannedDate.localeCompare(b.plannedDate)
    if (dateCmp !== 0) return dateCmp
    const orderCmp = a.plannedOrder - b.plannedOrder
    if (orderCmp !== 0) return orderCmp
    return a.activityNodeId.localeCompare(b.activityNodeId)
  })
}

export function resolvePlanningItemsForTicketBatchPrint(
  visibleItems: readonly ActivityTicketPlanningSource[],
  options: {
    viewMode: PlanningViewMode
    dailySelectedDay: PlanningDailySelectedDay
  },
): ActivityTicketPlanningSource[] {
  const base =
    options.viewMode === 'daily'
      ? filterPlanningDailyItemsByDay(visibleItems, options.dailySelectedDay)
      : [...visibleItems]

  return sortPlanningSourcesForTicketPrint(base)
}
