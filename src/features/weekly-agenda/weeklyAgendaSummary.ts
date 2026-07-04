import type {
  OperationalPlanningPlanItem,
  OperationalPlanningWeekPayload,
} from '../../domain/operational-planning/operational-planning.types'
import { countPlanningSyncDivergences } from '../../domain/operational-planning/planningSyncIssues'
import { buildPlanningWeekOperationalSummary } from '../operational-planning/planningWeekOperationalSummary'

export type WeeklyAgendaSummaryStripModel = {
  plannedMinutes: number
  realizedMinutes: number
  collaboratorsCount: number
  attentionCount: number
  syncDivergenceCount: number
  outsidePlanEntriesCount: number
}

function toSummaryItems(items: readonly OperationalPlanningPlanItem[]) {
  return items.map((item) => ({
    plannedMinutes: item.plannedMinutes,
    realizedMinutes: item.realizedMinutes,
    activityOperationalStatus: item.activityOperationalStatus,
    assignedCollaboratorId: item.assignedCollaboratorId ?? undefined,
    plannedDate: item.plannedDate,
  }))
}

export function buildWeeklyAgendaSummaryStrip(
  weekPayload: OperationalPlanningWeekPayload | null,
): WeeklyAgendaSummaryStripModel {
  const planItems = weekPayload?.plan?.items ?? []
  const operational = buildPlanningWeekOperationalSummary(toSummaryItems(planItems), {
    capacityByCollaboratorDay: weekPayload?.capacityByCollaboratorDay,
  })
  const syncDivergenceCount = countPlanningSyncDivergences(planItems)
  const outsidePlanEntriesCount = weekPayload?.executionOutsidePlanSummary.entriesCount ?? 0

  return {
    plannedMinutes: weekPayload?.summary.plannedMinutes ?? 0,
    realizedMinutes: operational.totalRealizedMinutes,
    collaboratorsCount: weekPayload?.summary.collaboratorsCount ?? 0,
    attentionCount: syncDivergenceCount + outsidePlanEntriesCount,
    syncDivergenceCount,
    outsidePlanEntriesCount,
  }
}
