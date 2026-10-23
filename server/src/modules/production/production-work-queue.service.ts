import type pg from 'pg'
import type { MyWorkQueueItemApi } from '../my-work-queue/my-work-queue.dto.js'
import { serviceGetWorkQueueForCollaborator } from '../my-work-queue/my-work-queue.service.js'
import {
  getLatestSessionCompletionPctByStepForCollaborator,
} from '../conveyors/conveyorNodeWorkload.repository.js'
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
  lastSessionCompletionPct: number | null,
): ProductionWorkQueueItemApi {
  const pending = item.isActivityCompleted
    ? 0
    : Math.max(0, (item.plannedMinutes ?? 0) - realizedMinutes)

  const trackInput = {
    isActivityCompleted: item.isActivityCompleted,
    hasPreviousPendingStep: item.hasPreviousPendingStep,
    isOutOfSequence: item.isOutOfSequence,
    planItemStatus: item.status,
    conveyorOperationalStatus: item.conveyorOperationalStatus,
    isPlannedForCollaborator: true,
    activityOperationalStatus: item.activityOperationalStatus,
  }

  const canTrackTime = resolveProductionCanTrackTime(trackInput)

  return {
    workPlanItemId: item.workPlanItemId,
    conveyorId: item.conveyorId,
    conveyorTitle: item.conveyorTitle,
    conveyorCode: item.conveyorCode ?? null,
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
    isNextRecommended: item.isNextRecommended,
    hasPreviousPendingStep: item.hasPreviousPendingStep,
    sequenceWarningType: item.sequenceWarningType,
    sequenceWarningLabel: item.sequenceWarningLabel,
    previousOpenCount: item.previousOpenCount,
    previousOpenActivities: item.previousOpenActivities.map((p) => ({
      activityTitle: p.activityTitle,
      sectorTitle: p.sectorTitle,
      taskTitle: p.taskTitle,
    })),
    allPreviousOpenActivities: item.allPreviousOpenActivities.map((p) => ({
      activityTitle: p.activityTitle,
      sectorTitle: p.sectorTitle,
      taskTitle: p.taskTitle,
    })),
    awaitingPreviousActivities: item.awaitingPreviousActivities.map((p) => ({
      activityTitle: p.activityTitle,
      sectorTitle: p.sectorTitle,
      taskTitle: p.taskTitle,
    })),
    hasPreviousOpenActivitiesFromOtherCollaborators:
      item.hasPreviousOpenActivitiesFromOtherCollaborators,
    previousOpenActivitiesFromOtherCollaborators:
      item.previousOpenActivitiesFromOtherCollaborators.map((p) => ({
        activityTitle: p.activityTitle,
        sectorTitle: p.sectorTitle,
        taskTitle: p.taskTitle,
        collaboratorNames: p.collaboratorNames,
      })),
    previousOpenActivitiesWarningMessage: item.previousOpenActivitiesWarningMessage,
    group: item.group,
    canTrackTime,
    canPointTime: canTrackTime,
    blockingReason: item.blockingReason,
    canCompleteStep: resolveProductionCanCompleteStep(trackInput),
    requiresOutOfSequenceJustification: resolveProductionRequiresOutOfSequenceJustification(
      trackInput,
    ),
    lastSessionCompletionPct,
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
    allOpenPlanned: true,
    listOptions: {
      planItemStatuses: ['PLANNED'],
    },
  })

  const uniqueConveyorIds = [...new Set(result.items.map((i) => i.conveyorId))]
  const realizedByStep = new Map<string, number>()
  const stepIds = result.items.map((item) => item.activityNodeId)
  if (stepIds.length > 0) {
    const realized = await pool.query<{ step_id: string; minutes: string }>(
      'SELECT conveyor_node_id::text AS step_id, COALESCE(SUM(minutes), 0)::text AS minutes FROM conveyor_time_entries WHERE deleted_at IS NULL AND collaborator_id = $1::uuid AND conveyor_node_id = ANY($2::uuid[]) GROUP BY conveyor_node_id',
      [input.collaboratorId, stepIds],
    )
    for (const row of realized.rows) realizedByStep.set(row.step_id, Number(row.minutes) || 0)
  }

  const lastSessionCompletionPctByStep =
    await getLatestSessionCompletionPctByStepForCollaborator(
      pool,
      input.collaboratorId,
      uniqueConveyorIds,
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
      mapToProductionItem(
        item,
        realizedByStep.get(item.activityNodeId) ?? 0,
        lastSessionCompletionPctByStep.get(item.activityNodeId) ?? null,
      ),
    ),
  }
}
