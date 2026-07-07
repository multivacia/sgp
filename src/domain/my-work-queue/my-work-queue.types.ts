import type { SequenceWarningType } from '../production/production.helpers'

export type MyWorkQueuePreviousOpenActivity = {
  activityNodeId: string
  activityTitle: string
  sectorTitle: string
  taskTitle: string
  orderPath: string
}

export type MyWorkQueuePreviousOpenFromOtherCollaborator = {
  activityNodeId: string
  activityTitle: string
  sectorTitle: string
  taskTitle: string
  orderPath: string
  collaboratorNames: string[]
}

export type MyWorkQueueItemGroup = 'overdue' | 'today' | 'completed'

export type MyWorkQueueItem = {
  workPlanId: string
  workPlanItemId: string
  plannedDate: string
  plannedOrder: number
  plannedMinutes: number | null
  status: string
  group: MyWorkQueueItemGroup
  conveyorId: string
  conveyorOperationalStatus: string
  conveyorTitle: string
  clientName: string | null
  vehicleDescription: string | null
  licensePlate: string | null
  taskTitle: string
  sectorTitle: string
  activityNodeId: string
  activityTitle: string
  activityOperationalStatus: string | null
  isActivityCompleted: boolean
  isOverdue: boolean
  isOutOfSequence: boolean
  isNextRecommended: boolean
  hasPreviousPendingStep: boolean
  sequenceWarningType?: SequenceWarningType
  sequenceWarningLabel?: string
  requiresOutOfSequenceJustification: boolean
  canPointTime: boolean
  blockingReason?: string
  previousOpenCount: number
  previousOpenActivities: MyWorkQueuePreviousOpenActivity[]
  allPreviousOpenActivities: MyWorkQueuePreviousOpenActivity[]
  awaitingPreviousActivities: MyWorkQueuePreviousOpenActivity[]
  hasPreviousOpenActivitiesFromOtherCollaborators: boolean
  previousOpenActivitiesFromOtherCollaborators: MyWorkQueuePreviousOpenFromOtherCollaborator[]
  previousOpenActivitiesWarningMessage: string | null
  structuralSequenceIndex: number
  isAssignedToMe: boolean
  requiresUnassignedJustification: boolean
  plannedVsCapacity: {
    plannedMinutesForDay: number
    capacityMinutesForDay: number
    overload: boolean
  }
}

export type MyWorkQueueSummary = {
  plannedItemsToday: number
  plannedMinutesToday: number
  overdueItems: number
  completedItemsToday: number
  outOfSequenceItems: number
  unassignedExceptionItems: number
  capacityMinutesToday: number
  overload: boolean
}

export type MyWorkQueueResponse = {
  date: string
  planStatus: 'PUBLISHED' | null
  summary: MyWorkQueueSummary
  items: MyWorkQueueItem[]
}

export type MyWorkQueueResult = {
  data: MyWorkQueueResponse
  collaboratorId: string | null
  unavailableReason: string | null
}
