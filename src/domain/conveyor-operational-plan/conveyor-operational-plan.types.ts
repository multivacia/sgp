/** Contratos da API `/api/v1/conveyors/:conveyorId/operational-plan` */

export type ConveyorOperationalPlanStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'WAITING_FACTORY_PLANNING'
  | 'PARTIALLY_PLANNED_IN_FACTORY'
  | 'FULLY_PLANNED_IN_FACTORY'
  | 'IN_EXECUTION'
  | 'COMPLETED'
  | 'CANCELLED'

export type ConveyorOperationalPlanFactoryStatus =
  | 'NOT_SCHEDULED'
  | 'PARTIALLY_SCHEDULED'
  | 'FULLY_SCHEDULED'
  | 'DIVERGED'
  | 'REVIEW_REQUIRED'

export type ConveyorOperationalPlanItemStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NEEDS_REVIEW'

export type ConveyorOperationalPlan = {
  id: string
  conveyorId: string
  status: ConveyorOperationalPlanStatus
  plannedStartDate: string | null
  plannedEndDate: string | null
  version: number
  generatedAt: string | null
  generatedBy: string | null
  approvedAt: string | null
  approvedBy: string | null
  factoryPlanningStatus: ConveyorOperationalPlanFactoryStatus | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type ConveyorPlanItemReviewReason = {
  code: string
  message: string
}

export type ConveyorOperationalPlanItem = {
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
  status: ConveyorOperationalPlanItemStatus
  sourceKind: 'MANUAL' | 'GENERATED' | 'IMPORTED'
  originWorkPlanItemId: string | null
  syncStatus: 'PENDING' | 'SYNCED' | 'DIVERGED' | null
  reviewRequired: boolean
  reviewReasons: ConveyorPlanItemReviewReason[]
  cancellationReason: string | null
  notes: string | null
  realizedMinutes: number
  activityOperationalStatus: string | null
  createdAt: string
  updatedAt: string
}

export type ConveyorOperationalPlanPayload = {
  plan: ConveyorOperationalPlan
  items: ConveyorOperationalPlanItem[]
  dailyCapacityMinutes: number
}

export type CreateConveyorOperationalPlanInput = {
  plannedStartDate?: string | null
  plannedEndDate?: string | null
  notes?: string | null
}

export type CreateConveyorOperationalPlanItemInput = {
  activityNodeId: string
  plannedDate?: string | null
  plannedOrder?: number
  plannedMinutes?: number | null
  plannedCollaboratorId?: string | null
  plannedTeamId?: string | null
  notes?: string | null
}

export type PatchConveyorOperationalPlanItemInput = {
  plannedDate?: string | null
  plannedOrder?: number
  plannedMinutes?: number | null
  plannedCollaboratorId?: string | null
  plannedTeamId?: string | null
  status?: 'PLANNED' | 'NEEDS_REVIEW' | 'CANCELLED'
  notes?: string | null
}

export type GenerateConveyorOperationalPlanItemsInput = {
  plannedStartDate: string
  overwrite?: boolean
}

export type ConveyorPlanGenerationPreviewWarningCode =
  | 'EXISTING_ITEMS_WILL_BE_REPLACED'
  | 'MANUAL_ITEMS_WILL_BE_REMOVED'
  | 'REVIEWED_ITEMS_WILL_BE_REMOVED'
  | 'ITEMS_NEED_REVIEW_AFTER_GENERATION'
  | 'NO_ACTIVE_STEPS_FOUND'
  | 'START_DATE_ADJUSTED_TO_BUSINESS_DAY'

export type ConveyorPlanGenerationPreviewWarning = {
  code: ConveyorPlanGenerationPreviewWarningCode
  message: string
}

export type ConveyorOperationalPlanGenerationPreview = {
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
  warnings: ConveyorPlanGenerationPreviewWarning[]
}

export type PreviewConveyorOperationalPlanGenerationInput = {
  plannedStartDate: string
}
