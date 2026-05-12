import type { TimeEntryCandidateItem } from '../../domain/my-activities/my-activities.types'
import type { MyWorkQueueItem } from '../../domain/my-work-queue/my-work-queue.types'

export function workQueueApontamentoCandidate(
  item: MyWorkQueueItem,
): TimeEntryCandidateItem {
  return {
    conveyorId: item.conveyorId,
    conveyorCode: null,
    conveyorName: item.conveyorTitle,
    clientName: item.clientName,
    vehicleLabel: item.vehicleDescription,
    plate: item.licensePlate,
    stepNodeId: item.activityNodeId,
    stepName: item.activityTitle,
    activityTitle: item.activityTitle,
    taskTitle: item.taskTitle,
    areaName: item.sectorTitle,
    sectorTitle: item.sectorTitle,
    roleInStep: 'support',
    assignmentType: 'COLLABORATOR',
    plannedMinutes: item.plannedMinutes,
    realizedMinutes: 0,
    pendingMinutes: Math.max(0, item.plannedMinutes ?? 0),
    isAssignedToMe: item.isAssignedToMe,
    requiresJustification: item.requiresUnassignedJustification,
    isOutOfSequence: item.isOutOfSequence,
    requiresOutOfSequenceJustification: item.requiresOutOfSequenceJustification,
    previousOpenCount: item.previousOpenCount,
    previousOpenActivities: item.previousOpenActivities.map((prev) => ({
      taskTitle: prev.taskTitle,
      sectorTitle: prev.sectorTitle,
      activityTitle: prev.activityTitle,
    })),
  }
}

export function sortWorkQueueItems(items: MyWorkQueueItem[]): MyWorkQueueItem[] {
  return [...items].sort(
    (a, b) =>
      a.plannedDate.localeCompare(b.plannedDate) ||
      a.plannedOrder - b.plannedOrder ||
      a.workPlanItemId.localeCompare(b.workPlanItemId),
  )
}
