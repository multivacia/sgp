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

import type { SequenceWarningType } from '../production/production.helpers'

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
  isNextRecommended: boolean
  hasPreviousPendingStep: boolean
  sequenceWarningType?: SequenceWarningType
  sequenceWarningLabel?: string
  previousOpenCount: number
  previousOpenActivities: ProductionWorkQueuePreviousOpenActivity[]
  allPreviousOpenActivities: ProductionWorkQueuePreviousOpenActivity[]
  awaitingPreviousActivities: ProductionWorkQueuePreviousOpenActivity[]
  hasPreviousOpenActivitiesFromOtherCollaborators: boolean
  previousOpenActivitiesFromOtherCollaborators: ProductionWorkQueuePreviousOpenFromOtherCollaborator[]
  previousOpenActivitiesWarningMessage: string | null

  group: 'overdue' | 'today' | 'completed'

  canTrackTime: boolean
  canPointTime?: boolean
  blockingReason?: string
  canCompleteStep: boolean
  requiresOutOfSequenceJustification: boolean
  /** Último session_completion_pct não nulo do colaborador neste STEP. */
  lastSessionCompletionPct?: number | null
}

export type ProductionWorkQueuePreviousOpenActivity = {
  activityTitle: string
  sectorTitle: string
  taskTitle: string
}

export type ProductionWorkQueuePreviousOpenFromOtherCollaborator = {
  activityTitle: string
  sectorTitle: string
  taskTitle: string
  collaboratorNames: string[]
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
  justificationId?: string
  justificationComplement?: string
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

/** GET /api/v1/production/extra-time-entries/descriptions — catálogo (Kiosk). */
export type ProductionExtraTimeEntryDescriptionOption = {
  id: string
  description: string
}

/** GET /api/v1/production/extra-time-entries — histórico recente (Kiosk). */
export type ProductionExtraTimeEntry = {
  id: string
  descriptionId: string
  description: string
  entryDate: string
  minutes: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type ProductionExtraTimeEntryPayload = {
  descriptionId: string
  entryDate?: string
  minutes: number
  notes?: string | null
}

/** POST /api/v1/production/time-entries/unassigned-exception — "Outra atividade" (Kiosk). */
export type ProductionUnassignedTimeEntryPayload = {
  conveyorId: string
  stepNodeId: string
  minutes: number
  note?: string | null
  exceptionJustification?: string | null
  exceptionJustificationId?: string | null
  exceptionJustificationComplement?: string | null
  outOfSequenceJustification?: string | null
  outOfSequenceJustificationId?: string | null
  outOfSequenceJustificationComplement?: string | null
}
