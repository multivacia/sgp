import type {
  ConveyorOperationalPlan,
  ConveyorOperationalPlanItem,
} from './conveyor-operational-plan.types'

export type ConveyorOperationalPlanSummary = {
  activeItemsCount: number
  reviewRequiredItemsCount: number
  readyItemsCount: number
  generatedItemsCount: number
  manualItemsCount: number
  importedItemsCount: number
  totalPlannedMinutes: number
  firstPlannedDate: string | null
  lastPlannedDate: string | null
  completedItemsCount: number
  inProgressItemsCount: number
  cancelledItemsCount: number
}

export function summarizeConveyorOperationalPlan(
  _plan: ConveyorOperationalPlan,
  items: ConveyorOperationalPlanItem[],
): ConveyorOperationalPlanSummary {
  const active = items.filter((i) => i.status !== 'CANCELLED')
  const reviewRequiredItemsCount = active.filter((i) => i.reviewRequired).length
  const totalPlannedMinutes = active.reduce((sum, i) => sum + (i.plannedMinutes ?? 0), 0)
  const dates = active
    .map((i) => i.plannedDate)
    .filter((d): d is string => Boolean(d))
    .sort()

  return {
    activeItemsCount: active.length,
    reviewRequiredItemsCount,
    readyItemsCount: active.length - reviewRequiredItemsCount,
    generatedItemsCount: active.filter((i) => i.sourceKind === 'GENERATED').length,
    manualItemsCount: active.filter((i) => i.sourceKind === 'MANUAL').length,
    importedItemsCount: active.filter((i) => i.sourceKind === 'IMPORTED').length,
    totalPlannedMinutes,
    firstPlannedDate: dates[0] ?? null,
    lastPlannedDate: dates[dates.length - 1] ?? null,
    completedItemsCount: items.filter((i) => i.status === 'COMPLETED').length,
    inProgressItemsCount: items.filter((i) => i.status === 'IN_PROGRESS').length,
    cancelledItemsCount: items.filter((i) => i.status === 'CANCELLED').length,
  }
}
