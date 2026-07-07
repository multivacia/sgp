/**
 * DTO do endpoint GET /api/v1/production/me/work-queue.
 */

export type ProductionWorkQueuePreviousOpenActivityApi = {
  activityTitle: string
  sectorTitle: string
  taskTitle: string
}

export type ProductionWorkQueuePreviousOpenFromOtherCollaboratorApi = {
  activityTitle: string
  sectorTitle: string
  taskTitle: string
  collaboratorNames: string[]
}

export type ProductionWorkQueueItemApi = {
  workPlanItemId: string

  conveyorId: string
  conveyorTitle: string

  activityNodeId: string
  activityTitle: string
  taskTitle: string
  sectorTitle: string

  plannedDate: string
  plannedMinutes: number | null
  /** Minutos já apontados neste STEP (via conveyor_time_entries). */
  realizedMinutes: number
  /** max(0, plannedMinutes - realizedMinutes); 0 se step concluído. */
  pendingMinutes: number

  activityOperationalStatus: string | null
  isActivityCompleted: boolean
  isOverdue: boolean
  isOutOfSequence: boolean
  /** Próxima atividade recomendada na sequência estrutural (nunca true se etapa anterior pendente). */
  isNextRecommended: boolean
  hasPreviousPendingStep: boolean
  sequenceWarningType?: 'PREVIOUS_STEP_PENDING' | 'OUT_OF_SEQUENCE'
  sequenceWarningLabel?: string
  previousOpenCount: number
  previousOpenActivities: ProductionWorkQueuePreviousOpenActivityApi[]
  allPreviousOpenActivities: ProductionWorkQueuePreviousOpenActivityApi[]
  awaitingPreviousActivities: ProductionWorkQueuePreviousOpenActivityApi[]
  hasPreviousOpenActivitiesFromOtherCollaborators: boolean
  previousOpenActivitiesFromOtherCollaborators: ProductionWorkQueuePreviousOpenFromOtherCollaboratorApi[]
  previousOpenActivitiesWarningMessage: string | null

  group: 'overdue' | 'today' | 'completed'

  /** true quando o colaborador pode apontar (esteira liberada, item do plano, não concluída). */
  canTrackTime: boolean
  /** Alias semântico de canTrackTime para consistência com demais DTOs. */
  canPointTime: boolean
  blockingReason?: string
  /** true quando pode concluir via markAsDone no POST de apontamento. */
  canCompleteStep: boolean
  /** Quando true, o POST exige outOfSequenceJustification. */
  requiresOutOfSequenceJustification: boolean
}

export type ProductionWorkQueueResponseApi = {
  date: string
  planStatus: 'PUBLISHED' | null
  summary: {
    plannedItemsToday: number
    overdueItems: number
    completedItemsToday: number
  }
  items: ProductionWorkQueueItemApi[]
}
