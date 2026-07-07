import type { OperationalBucket } from '../../lib/backlog/operationalBuckets'

/** Bucket operacional (mesma regra do painel de esteiras). */
export type MyActivityOperationalBucket = OperationalBucket

/** GET /api/v1/my-activities — item alinhado ao backend (`MyActivityItemApi`). */
export type MyActivityRoleInStep = 'primary' | 'support'

export type MyActivityItem = {
  assigneeId: string
  conveyorId: string
  conveyorCode: string | null
  conveyorName: string
  conveyorStatus: string
  estimatedDeadline: string | null
  operationalBucket: MyActivityOperationalBucket
  stepNodeId: string
  stepName: string
  optionName: string
  areaName: string
  roleInStep: MyActivityRoleInStep
  plannedMinutes: number | null
  plannedQuantity: number
  plannedTotalMinutes: number
  realizedMinutes: number | null
}

export type TimeEntryCandidatePreviousOpen = {
  taskTitle: string
  sectorTitle: string
  activityTitle: string
}

/** GET /api/v1/me/time-entry-candidates — item alinhado ao backend. */
export type TimeEntryCandidateItem = {
  conveyorId: string
  conveyorCode: string | null
  conveyorName: string
  clientName: string | null
  vehicleLabel: string | null
  plate: string | null
  stepNodeId: string
  stepName: string
  activityTitle: string
  /** Tarefa (nó OPTION) — alinhado ao backend `taskTitle`. */
  taskTitle?: string
  areaName: string
  sectorTitle: string
  roleInStep: MyActivityRoleInStep
  assignmentType: 'COLLABORATOR' | 'TEAM'
  plannedMinutes: number | null
  plannedQuantity?: number
  plannedTotalMinutes?: number
  realizedMinutes: number
  pendingMinutes: number
  isAssignedToMe: boolean
  requiresJustification: boolean
  isOutOfSequence: boolean
  hasPreviousPendingStep: boolean
  sequenceWarningType?: 'PREVIOUS_STEP_PENDING' | 'OUT_OF_SEQUENCE'
  sequenceWarningLabel?: string
  requiresOutOfSequenceJustification: boolean
  canPointTime?: boolean
  blockingReason?: string
  previousOpenCount: number
  previousOpenActivities: TimeEntryCandidatePreviousOpen[]
  allPreviousOpenActivities?: TimeEntryCandidatePreviousOpen[]
  awaitingPreviousActivities: TimeEntryCandidatePreviousOpen[]
  /** true quando o STEP pode ser concluído explicitamente. */
  canCompleteStep?: boolean
  /** Data planejada no plano semanal publicado, quando aplicável. */
  plannedDate?: string | null
  /** true quando a data planejada é anterior ao dia de referência. */
  isOverdue?: boolean
}
