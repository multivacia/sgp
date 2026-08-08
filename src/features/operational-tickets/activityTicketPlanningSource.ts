import {
  resolvePlanningItemRealizedForCard,
} from '../operational-planning/planningExecutionHelpers'
import { isConveyorActivityTicketSourceCompleted } from './activityTicketConveyorSource'
import type { ActivityTicketPrintModelInput } from './activityTicketPrintModel'

/** Campos mínimos de um card do planejamento para montar ticket (allowlist). */
export type ActivityTicketPlanningSource = {
  conveyorId: string
  conveyorTitle: string
  conveyorCode?: string | null
  conveyorVehicleRef?: string | null
  activityNodeId: string
  activityTitle: string
  taskTitle: string
  sectorTitle: string
  plannedDate: string
  plannedOrder: number
  plannedMinutes: number | null
  realizedMinutes?: number | null
  activityOperationalStatus?: string | null
  status?: string | null
  assignedCollaboratorName?: string | null
  assignedTeamName?: string | null
}

export function buildActivityTicketInputFromPlanningSource(
  item: ActivityTicketPlanningSource,
  backlogExecutionLookup?: ReadonlyMap<string, number>,
): ActivityTicketPrintModelInput {
  const realizedMinutes = resolvePlanningItemRealizedForCard(item, backlogExecutionLookup)

  return {
    conveyorId: item.conveyorId,
    conveyorTitle: item.conveyorTitle,
    conveyorCode: item.conveyorCode ?? undefined,
    conveyorVehicleRef: item.conveyorVehicleRef ?? undefined,
    activityNodeId: item.activityNodeId,
    activityTitle: item.activityTitle,
    taskTitle: item.taskTitle,
    sectorTitle: item.sectorTitle,
    plannedDate: item.plannedDate,
    plannedOrder: item.plannedOrder,
    plannedMinutes: item.plannedMinutes,
    realizedMinutes,
    activityOperationalStatus: item.activityOperationalStatus,
    planItemStatus: item.status,
    responsibleName: item.assignedCollaboratorName,
    teamName: item.assignedTeamName,
  }
}

export function buildActivityTicketInputsFromPlanningSources(
  items: readonly ActivityTicketPlanningSource[],
  backlogExecutionLookup?: ReadonlyMap<string, number>,
): ActivityTicketPrintModelInput[] {
  return items.map((item) =>
    buildActivityTicketInputFromPlanningSource(item, backlogExecutionLookup),
  )
}

export function isPlanningActivityTicketSourceCancelled(
  source: Pick<ActivityTicketPlanningSource, 'status'>,
): boolean {
  return source.status?.trim() === 'CANCELLED'
}

export function filterPlanningActivityTicketSources(
  sources: readonly ActivityTicketPlanningSource[],
  includeCompleted: boolean,
): ActivityTicketPlanningSource[] {
  return sources.filter((source) => {
    if (isPlanningActivityTicketSourceCancelled(source)) return false
    if (source.activityOperationalStatus?.trim() === 'ABORTED') return false
    if (!includeCompleted && isConveyorActivityTicketSourceCompleted(source)) return false
    return true
  })
}
