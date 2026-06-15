import type { ActivityProgressItem } from './conveyorProgress.types'
import { computeConveyorProgressMetrics, sumMinutes } from './conveyorProgressMetrics'
import type { ConveyorProgressItem } from './conveyorProgress.types'

export type ConveyorProgressSummaryMetrics = {
  conveyorCount: number
  plannedMinutes: number
  realizedMinutes: number
  remainingMinutes: number
  exceededMinutes: number
  averageProgressPercent: number
}

export function computeConveyorProgressSummary(
  items: readonly ConveyorProgressItem[],
): ConveyorProgressSummaryMetrics {
  if (items.length === 0) {
    return {
      conveyorCount: 0,
      plannedMinutes: 0,
      realizedMinutes: 0,
      remainingMinutes: 0,
      exceededMinutes: 0,
      averageProgressPercent: 0,
    }
  }

  const plannedMinutes = sumMinutes(items.map((i) => i.plannedMinutes))
  const realizedMinutes = sumMinutes(items.map((i) => i.realizedMinutes))
  const totals = computeConveyorProgressMetrics(plannedMinutes, realizedMinutes)

  const withPlanned = items.filter((i) => i.plannedMinutes > 0)
  const averageProgressPercent =
    withPlanned.length > 0
      ? Math.round(
          withPlanned.reduce((acc, i) => acc + i.progressPercent, 0) / withPlanned.length,
        )
      : 0

  return {
    conveyorCount: items.length,
    plannedMinutes: totals.plannedMinutes,
    realizedMinutes: totals.realizedMinutes,
    remainingMinutes: totals.remainingMinutes,
    exceededMinutes: totals.exceededMinutes,
    averageProgressPercent,
  }
}

export function aggregateStatusFromActivities(
  activities: readonly ActivityProgressItem[],
): string | null {
  if (activities.length === 0) return null
  if (activities.every((a) => a.status === 'COMPLETED')) return 'Concluída'
  if (activities.some((a) => a.status === 'IN_PROGRESS')) return 'Em andamento'
  if (activities.some((a) => a.status === 'PENDING')) return 'Aberta'
  return null
}

export function collectActivitiesFromTask(
  task: ConveyorProgressItem['tasks'][number],
): ActivityProgressItem[] {
  return task.sectors.flatMap((s) => s.activities)
}
