export type ConveyorOperationalPlanStatusDb =
  | 'DRAFT'
  | 'APPROVED'
  | 'WAITING_FACTORY_PLANNING'
  | 'PARTIALLY_PLANNED_IN_FACTORY'
  | 'FULLY_PLANNED_IN_FACTORY'
  | 'IN_EXECUTION'
  | 'COMPLETED'
  | 'CANCELLED'

export type ConveyorOperationalPlanFactoryStatusDb =
  | 'NOT_SCHEDULED'
  | 'PARTIALLY_SCHEDULED'
  | 'FULLY_SCHEDULED'
  | 'DIVERGED'
  | 'REVIEW_REQUIRED'

export type ConveyorOperationalPlanItemStatusDb =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NEEDS_REVIEW'

export type ConveyorOperationalPlanItemSourceKindDb = 'MANUAL' | 'GENERATED' | 'IMPORTED'

export type ConveyorOperationalPlanItemSyncStatusDb = 'PENDING' | 'SYNCED' | 'DIVERGED'

export type ConveyorOperationalPlanApi = {
  id: string
  conveyorId: string
  status: ConveyorOperationalPlanStatusDb
  plannedStartDate: string | null
  plannedEndDate: string | null
  version: number
  generatedAt: string | null
  generatedBy: string | null
  approvedAt: string | null
  approvedBy: string | null
  factoryPlanningStatus: ConveyorOperationalPlanFactoryStatusDb | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type ConveyorPlanItemReviewReasonApi = {
  code: string
  message: string
}

export type ConveyorOperationalPlanItemApi = {
  id: string
  planId: string
  conveyorId: string
  activityNodeId: string
  taskTitle: string
  sectorTitle: string
  activityTitle: string
  plannedDate: string | null
  plannedOrder: number
  plannedMinutes: number | null
  plannedCollaboratorId: string | null
  plannedCollaboratorName: string | null
  plannedTeamId: string | null
  plannedTeamName: string | null
  status: ConveyorOperationalPlanItemStatusDb
  sourceKind: ConveyorOperationalPlanItemSourceKindDb
  originWorkPlanItemId: string | null
  syncStatus: ConveyorOperationalPlanItemSyncStatusDb | null
  reviewRequired: boolean
  reviewReasons: ConveyorPlanItemReviewReasonApi[]
  cancellationReason: string | null
  notes: string | null
  realizedMinutes: number
  activityOperationalStatus: string | null
  createdAt: string
  updatedAt: string
}

export type ConveyorOperationalPlanGetApi = {
  plan: ConveyorOperationalPlanApi
  items: ConveyorOperationalPlanItemApi[]
  /** Capacidade diária usada na derivação de revisão (settings ou fallback defensivo). */
  dailyCapacityMinutes: number
}

export type ConveyorPlanGenerationPreviewWarningApi = {
  code: string
  message: string
}

export type ConveyorOperationalPlanGenerationPreviewApi = {
  plannedStartDate: string
  plannedEndDate: string | null
  dailyCapacityMinutes: number
  existingActiveItemsCount: number
  existingGeneratedItemsCount: number
  existingManualItemsCount: number
  existingReviewedItemsCount: number
  existingReviewRequiredItemsCount: number
  generatedItemsCount: number
  generatedReviewRequiredItemsCount: number
  hasExistingItems: boolean
  hasManualItems: boolean
  hasReviewedItems: boolean
  warnings: ConveyorPlanGenerationPreviewWarningApi[]
}
