export type ProductionScope = 'PRODUCTION_MODE'

export type ProductionCredentialStatus =
  | 'READY'
  | 'NEEDS_INITIAL_PIN'
  | 'LOCKED'
  | 'DISABLED'

export type ProductionLoginStatus = 'AUTHENTICATED' | 'PIN_CHANGE_REQUIRED'

export type ProductionCollaboratorSummary = {
  id: string
  fullName: string
  name: string
  displayName: string
  avatarUrl: string | null
  initials: string
  teamName?: string | null
  productionCredentialStatus: ProductionCredentialStatus
  mustChangePin?: boolean
}

export type ProductionSession = {
  collaborator: ProductionCollaboratorSummary
  scope: ProductionScope
  status?: ProductionLoginStatus
  mustChangePin?: boolean
}

export type ProductionCollaboratorsList = {
  items: ProductionCollaboratorSummary[]
}

export type ProductionWorkQueueItem = {
  workPlanItemId: string

  conveyorId: string
  conveyorTitle: string

  activityNodeId: string
  activityTitle: string
  taskTitle: string
  sectorTitle: string

  plannedDate: string
  plannedMinutes: number | null
  realizedMinutes: number
  pendingMinutes: number

  activityOperationalStatus: string | null
  isActivityCompleted: boolean
  isOverdue: boolean
  isOutOfSequence: boolean
  previousOpenCount: number
  previousOpenActivities: ProductionWorkQueuePreviousOpenActivity[]

  group: 'overdue' | 'today' | 'completed'

  canTrackTime: boolean
  canCompleteStep: boolean
  requiresOutOfSequenceJustification: boolean
}

export type ProductionWorkQueuePreviousOpenActivity = {
  activityTitle: string
  sectorTitle: string
  taskTitle: string
}

export type ProductionTimeEntryPayload = {
  conveyorId: string
  stepNodeId: string
  minutes: number
  executedQuantity?: number | null
  note?: string | null
  sessionCompletionPct?: number | null
  markAsDone?: boolean
  outOfSequenceJustification?: string | null
}

export type ProductionTimeEntryResult = {
  id: string
  minutes: number
  entryOrigin: string
}

export type ProductionWorkQueueResponse = {
  date: string
  planStatus: 'PUBLISHED' | null
  summary: {
    plannedItemsToday: number
    overdueItems: number
    completedItemsToday: number
  }
  items: ProductionWorkQueueItem[]
}

export type ProductionWorkQueueFilter = 'all' | 'pending' | 'completed'
