import type { ActivityProgressItem } from '../../domain/conveyor-progress/conveyorProgress.types'
import type { ActivityTicketPrintModelInput } from './activityTicketPrintModel'

export type ActivityTicketProgressContext = {
  conveyorId: string
  conveyorTitle: string
  conveyorCode?: string | null
  taskTitle: string
  sectorTitle: string
  activity: ActivityProgressItem
}

export function isProgressActivityPrintable(ctx: ActivityTicketProgressContext): boolean {
  return Boolean(
    ctx.conveyorId.trim() &&
      ctx.activity.activityId.trim() &&
      ctx.activity.activityName.trim(),
  )
}

export function buildActivityTicketInputFromProgressContext(
  ctx: ActivityTicketProgressContext,
): ActivityTicketPrintModelInput {
  return {
    conveyorId: ctx.conveyorId.trim(),
    conveyorTitle: ctx.conveyorTitle.trim() || 'Esteira',
    conveyorCode: ctx.conveyorCode?.trim() || undefined,
    activityNodeId: ctx.activity.activityId.trim(),
    activityTitle: ctx.activity.activityName.trim(),
    taskTitle: ctx.taskTitle.trim() || undefined,
    sectorTitle: ctx.sectorTitle.trim() || undefined,
    plannedMinutes: ctx.activity.plannedMinutes,
    realizedMinutes: ctx.activity.realizedMinutes,
    activityOperationalStatus: ctx.activity.status,
    responsibleName: ctx.activity.collaboratorName,
  }
}
