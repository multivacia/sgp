/** Contratos da API `/api/v1/operational-planning/*` */

export type OperationalPlanStatus = 'DRAFT' | 'PUBLISHED'

export type OperationalPlanningExecutionOutsidePlanSummary = {
  totalMinutes: number
  entriesCount: number
  activitiesCount: number
  conveyorsCount: number
}

export type OperationalPlanningWeekActivityKind =
  | 'TIME_ENTRY'
  | 'STEP_COMPLETED'
  | 'STEP_REOPENED'

export type OperationalPlanningWeekActivityItem = {
  id: string
  occurredAt: string
  kind: OperationalPlanningWeekActivityKind
  conveyorId: string
  conveyorName: string
  activityNodeId: string
  taskName: string | null
  areaName: string | null
  activityName: string
  collaboratorId: string | null
  collaboratorName: string | null
  actorName: string | null
  minutes: number | null
  entryOrigin: 'ASSIGNED' | 'UNASSIGNED_EXCEPTION' | null
  exceptionJustification: string | null
  outsidePlan: boolean | null
  description: string
}

export type OperationalPlanningWeekActivityPayload = {
  data: OperationalPlanningWeekActivityItem[]
  meta: {
    count: number
    hasMore: boolean
  }
}

export type OperationalPlanningExecutionOutsidePlanEntry = {
  id: string
  conveyorId: string
  conveyorTitle: string
  activityNodeId: string
  activityTitle: string
  taskTitle: string
  sectorTitle: string
  collaboratorId: string
  collaboratorName: string
  entryAt: string
  minutes: number
  entryOrigin: 'ASSIGNED' | 'UNASSIGNED_EXCEPTION'
  exceptionJustification: string | null
  notes: string | null
}

export type OperationalPlanningWeekPayload = {
  hasPlan: boolean
  week: {
    weekStartDate: string
    weekEndDate: string
    weekdayDates: readonly string[]
  }
  plan: null | {
    id: string
    weekStartDate: string
    weekEndDate: string
    status: OperationalPlanStatus
    publishedAt: string | null
    items: OperationalPlanningPlanItem[]
    createdAt: string
    updatedAt: string
  }
  summary: {
    plannedMinutes: number
    plannedItems: number
    collaboratorsCount: number
  }
  capacityByCollaboratorDay: Array<{
    collaboratorId: string
    date: string
    capacityMinutes: number
    plannedMinutes: number
  }>
  executionOutsidePlanSummary: OperationalPlanningExecutionOutsidePlanSummary
  executionOutsidePlanEntries: OperationalPlanningExecutionOutsidePlanEntry[]
  revision: {
    hasActivePublished: boolean
    activePublishedPlanId: string | null
    activePublishedAt: string | null
    hasUnpublishedRevision: boolean
  }
}

export type OperationalPlanningSuggestionMember = {
  id: string
  code: string | null
  fullName: string
  isPrimary: boolean
  suggestionOrder: number
}

export type OperationalPlanningSuggestionContext = {
  responsibleCollaboratorId: string | null
  responsibleCollaboratorCode: string | null
  responsibleCollaboratorFullName: string | null
  effectiveTeamId: string | null
  effectiveTeamName: string | null
  members: OperationalPlanningSuggestionMember[]
  multipleTeamsAssigned: boolean
}

export type OperationalPlanningPlanSyncStatus = 'PENDING' | 'SYNCED' | 'DIVERGED'

export type OperationalPlanningPlanSyncDifferenceCode =
  | 'FACTORY_ITEM_MISSING'
  | 'PLANNED_DATE_CHANGED'
  | 'PLANNED_MINUTES_CHANGED'
  | 'ASSIGNEE_CHANGED'
  | 'TEAM_CHANGED'
  | 'PLAN_ITEM_CANCELLED'
  | 'PLAN_ITEM_NEEDS_REVIEW'
  | 'FACTORY_ITEM_CANCELLED'

export type OperationalPlanningPlanSyncDifference = {
  code: OperationalPlanningPlanSyncDifferenceCode
  message: string
  planValue: string | null
  factoryValue: string | null
}

export type OperationalPlanningPlanItem = {
  id: string
  conveyorId: string
  conveyorTitle: string
  activityNodeId: string
  taskTitle: string
  sectorTitle: string
  activityTitle: string
  assignedCollaboratorId: string | null
  assignedCollaboratorName: string | null
  plannedDate: string
  plannedOrder: number
  plannedMinutes: number | null
  status: string
  notes: string | null
  /** Soma de apontamentos do STEP (`conveyor_time_entries`). */
  realizedMinutes: number
  /** Status operacional do STEP em `conveyor_nodes.operational_status`. */
  activityOperationalStatus: string | null
  conveyorOperationalPlanItemId?: string | null
  /** Estado de sincronização com o plano da esteira (itens encaixados). */
  syncStatus?: OperationalPlanningPlanSyncStatus | null
  syncDifferences?: OperationalPlanningPlanSyncDifference[]
}

export type OperationalPlanningFactoryIntakeItem = {
  conveyorOperationalPlanId: string
  conveyorOperationalPlanItemId: string
  conveyorId: string
  conveyorName: string
  activityNodeId: string
  plannedDate: string | null
  plannedOrder: number
  plannedMinutes: number | null
  plannedCollaboratorId: string | null
  plannedCollaboratorName: string | null
  plannedTeamId: string | null
  plannedTeamName: string | null
  taskTitle: string
  sectorTitle: string
  activityTitle: string
  activityOperationalStatus: string | null
  realizedMinutes: number
  reviewRequired: boolean
  syncStatus: string | null
  factoryPlanningStatus: string | null
  operationalPlanStatus: string | null
  planItemStatus: string
  totalPlanItems: number
  linkedPlanItems: number
  pendingPlanItems: number
  suggestionContext?: OperationalPlanningSuggestionContext | null
}

export type OperationalPlanningFactoryIntakePayload = {
  items: OperationalPlanningFactoryIntakeItem[]
}

export type OperationalPlanningBacklogItem = {
  conveyorId: string
  conveyorTitle: string
  clientName: string | null
  vehicleDescription: string | null
  licensePlate: string | null
  taskTitle: string
  sectorTitle: string
  activityNodeId: string
  activityTitle: string
  /** Previsto estrutural do STEP na esteira. */
  plannedMinutes: number | null
  /** Soma de apontamentos (`conveyor_time_entries`) do STEP. */
  realizedMinutes: number
  /** Pendência estrutural do STEP (previsto − realizado), não do slot semanal. */
  pendingMinutes: number
  assignedCollaborators: Array<{ id: string; fullName: string }>
  assignedTeams: Array<{ id: string; name: string }>
  suggestionContext?: OperationalPlanningSuggestionContext | null
  isOutOfSequence: boolean
  previousOpenCount: number
  isOverdue: boolean
  hasAssignees: boolean
}

export type OperationalPlanningBacklogPayload = {
  items: OperationalPlanningBacklogItem[]
  meta: { limit: number }
}

export type SaveOperationalWeekPlanInput = {
  weekStartDate: string
  weekEndDate: string
  items: Array<{
    conveyorId: string
    activityNodeId: string
    assignedCollaboratorId: string
    assignedTeamId?: string | null
    plannedDate: string
    plannedOrder: number
    plannedMinutes?: number | null
    notes?: string | null
    conveyorOperationalPlanItemId?: string | null
  }>
}
