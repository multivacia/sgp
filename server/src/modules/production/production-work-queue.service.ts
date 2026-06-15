import type pg from 'pg'
import type { MyWorkQueueItemApi } from '../my-work-queue/my-work-queue.dto.js'
import { serviceGetWorkQueueForCollaborator } from '../my-work-queue/my-work-queue.service.js'
import { sumRealizedMinutesByStepForConveyor } from '../conveyors/conveyorNodeWorkload.repository.js'
import type {
  ProductionWorkQueueItemApi,
  ProductionWorkQueueResponseApi,
} from './production-work-queue.dto.js'
import {
  resolveProductionCanCompleteStep,
  resolveProductionCanTrackTime,
  resolveProductionRequiresOutOfSequenceJustification,
} from './production-work-queue.rules.js'

function mapToProductionItem(
  item: MyWorkQueueItemApi,
  realizedMinutes: number,
): ProductionWorkQueueItemApi {
  const pending = item.isActivityCompleted
    ? 0
    : Math.max(0, (item.plannedMinutes ?? 0) - realizedMinutes)

  const trackInput = {
    isActivityCompleted: item.isActivityCompleted,
    isOutOfSequence: item.isOutOfSequence,
    planItemStatus: item.status,
    conveyorOperationalStatus: item.conveyorOperationalStatus,
    isPlannedForCollaborator: true,
  }

  return {
    workPlanItemId: item.workPlanItemId,
    conveyorId: item.conveyorId,
    conveyorTitle: item.conveyorTitle,
    activityNodeId: item.activityNodeId,
    activityTitle: item.activityTitle,
    taskTitle: item.taskTitle,
    sectorTitle: item.sectorTitle,
    plannedDate: item.plannedDate,
    plannedMinutes: item.plannedMinutes,
    realizedMinutes,
    pendingMinutes: pending,
    activityOperationalStatus: item.activityOperationalStatus,
    isActivityCompleted: item.isActivityCompleted,
    isOverdue: item.isOverdue,
    isOutOfSequence: item.isOutOfSequence,
    previousOpenCount: item.previousOpenCount,
    previousOpenActivities: item.previousOpenActivities.map((p) => ({
      activityTitle: p.activityTitle,
      sectorTitle: p.sectorTitle,
      taskTitle: p.taskTitle,
    })),
    group: item.group,
    canTrackTime: resolveProductionCanTrackTime(trackInput),
    canCompleteStep: resolveProductionCanCompleteStep(trackInput),
    requiresOutOfSequenceJustification:
      resolveProductionRequiresOutOfSequenceJustification(trackInput),
  }
}

export async function serviceGetProductionWorkQueue(
  pool: pg.Pool,
  input: {
    collaboratorId: string
    date?: string | null
    includePastDue?: boolean
  },
): Promise<ProductionWorkQueueResponseApi> {
  const result = await serviceGetWorkQueueForCollaborator(pool, {
    collaboratorId: input.collaboratorId,
    date: input.date,
    includePastDue: input.includePastDue,
    listOptions: {
      planItemStatuses: ['PLANNED'],
    },
  })

  const uniqueConveyorIds = [...new Set(result.items.map((i) => i.conveyorId))]
  const realizedByStep = new Map<string, number>()
  await Promise.all(
    uniqueConveyorIds.map(async (cid) => {
      const m = await sumRealizedMinutesByStepForConveyor(pool, cid)
      for (const [stepId, min] of m) {
        realizedByStep.set(stepId, min)
      }
    }),
  )

  return {
    date: result.date,
    planStatus: result.planStatus,
    summary: {
      plannedItemsToday: result.summary.plannedItemsToday,
      overdueItems: result.summary.overdueItems,
      completedItemsToday: result.summary.completedItemsToday,
    },
    items: result.items.map((item) =>
      mapToProductionItem(item, realizedByStep.get(item.activityNodeId) ?? 0),
    ),
  }
}
