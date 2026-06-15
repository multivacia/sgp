/**
 * DTO do endpoint GET /api/v1/production/me/work-queue.
 */

export type ProductionWorkQueuePreviousOpenActivityApi = {
  activityTitle: string
  sectorTitle: string
  taskTitle: string
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
  previousOpenCount: number
  previousOpenActivities: ProductionWorkQueuePreviousOpenActivityApi[]

  group: 'overdue' | 'today' | 'completed'

  /** true quando o colaborador pode apontar (esteira liberada, item do plano, não concluída). */
  canTrackTime: boolean
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
