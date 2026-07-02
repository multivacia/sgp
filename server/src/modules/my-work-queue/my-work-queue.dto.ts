export type MyWorkQueuePreviousOpenActivityApi = {
  activityNodeId: string
  activityTitle: string
  sectorTitle: string
  taskTitle: string
  orderPath: string
}

export type MyWorkQueuePreviousOpenFromOtherCollaboratorApi = {
  activityNodeId: string
  activityTitle: string
  sectorTitle: string
  taskTitle: string
  orderPath: string
  collaboratorNames: string[]
}

export type MyWorkQueueItemApi = {
  workPlanId: string
  workPlanItemId: string
  plannedDate: string
  plannedOrder: number
  plannedMinutes: number | null
  status: string
  group: 'overdue' | 'today' | 'completed'

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
  /** Próxima atividade recomendada na sequência estrutural para o colaborador atual. */
  isNextRecommended: boolean
  requiresOutOfSequenceJustification: boolean
  previousOpenCount: number
  previousOpenActivities: MyWorkQueuePreviousOpenActivityApi[]
  hasPreviousOpenActivitiesFromOtherCollaborators: boolean
  previousOpenActivitiesFromOtherCollaborators: MyWorkQueuePreviousOpenFromOtherCollaboratorApi[]
  previousOpenActivitiesWarningMessage: string | null
  /** Posição na sequência estrutural da esteira (ordenação operacional). */
  structuralSequenceIndex: number

  isAssignedToMe: boolean
  requiresUnassignedJustification: boolean

  plannedVsCapacity: {
    plannedMinutesForDay: number
    capacityMinutesForDay: number
    overload: boolean
  }
}

export type MyWorkQueueResponseApi = {
  date: string
  planStatus: 'PUBLISHED' | null
  summary: {
    plannedItemsToday: number
    plannedMinutesToday: number
    overdueItems: number
    completedItemsToday: number
    outOfSequenceItems: number
    unassignedExceptionItems: number
    capacityMinutesToday: number
    overload: boolean
  }
  items: MyWorkQueueItemApi[]
}
