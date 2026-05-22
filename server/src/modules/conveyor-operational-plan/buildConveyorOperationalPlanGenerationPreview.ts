/**
 * Prévia de impacto da geração/regeneração do Plano Operacional da Esteira (R4-S3).
 * Função pura — sem I/O.
 */

import type { BuildConveyorOperationalPlanGeneratedItemsResult } from './buildConveyorOperationalPlanGeneratedItems.js'

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

export type ConveyorPlanGenerationPreviewExistingItem = {
  sourceKind: 'MANUAL' | 'GENERATED' | 'IMPORTED'
  reviewRequired: boolean
  status: string
}

export type BuildConveyorOperationalPlanGenerationPreviewInput = {
  existingItems: ConveyorPlanGenerationPreviewExistingItem[]
  generated: BuildConveyorOperationalPlanGeneratedItemsResult
  plannedStartDate: string
  plannedEndDate: string | null
  dailyCapacityMinutes: number
  startDateAdjustedToBusinessDay: boolean
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

const WARNING_MESSAGES: Record<ConveyorPlanGenerationPreviewWarningCode, string> = {
  EXISTING_ITEMS_WILL_BE_REPLACED:
    'Os itens atuais do plano serão substituídos por uma nova lista gerada.',
  MANUAL_ITEMS_WILL_BE_REMOVED:
    'Este plano possui itens manuais. Eles serão removidos na regeneração.',
  REVIEWED_ITEMS_WILL_BE_REMOVED:
    'Este plano possui itens já revisados. A regeneração descartará esses ajustes.',
  ITEMS_NEED_REVIEW_AFTER_GENERATION:
    'A nova geração incluirá itens que precisarão de revisão antes da aprovação.',
  NO_ACTIVE_STEPS_FOUND:
    'Nenhuma atividade (STEP) ativa foi encontrada na estrutura da esteira.',
  START_DATE_ADJUSTED_TO_BUSINESS_DAY:
    'A data de início informada cai em fim de semana; o planejamento começará no próximo dia útil.',
}

function isActiveItem(item: ConveyorPlanGenerationPreviewExistingItem): boolean {
  return item.status !== 'CANCELLED'
}

function isReviewedReadyItem(item: ConveyorPlanGenerationPreviewExistingItem): boolean {
  return isActiveItem(item) && !item.reviewRequired && item.status === 'PLANNED'
}

export function buildConveyorOperationalPlanGenerationPreview(
  input: BuildConveyorOperationalPlanGenerationPreviewInput,
): ConveyorOperationalPlanGenerationPreview {
  const activeExisting = input.existingItems.filter(isActiveItem)

  const existingGeneratedItemsCount = activeExisting.filter((i) => i.sourceKind === 'GENERATED').length
  const existingManualItemsCount = activeExisting.filter((i) => i.sourceKind === 'MANUAL').length
  const existingReviewedItemsCount = activeExisting.filter(isReviewedReadyItem).length
  const existingReviewRequiredItemsCount = activeExisting.filter((i) => i.reviewRequired).length

  const generatedItemsCount = input.generated.items.length
  const generatedReviewRequiredItemsCount = input.generated.items.filter((i) => i.reviewRequired).length

  const hasExistingItems = activeExisting.length > 0
  const hasManualItems = existingManualItemsCount > 0
  const hasReviewedItems = existingReviewedItemsCount > 0

  const warnings: ConveyorPlanGenerationPreviewWarning[] = []

  if (hasExistingItems) {
    warnings.push({
      code: 'EXISTING_ITEMS_WILL_BE_REPLACED',
      message: WARNING_MESSAGES.EXISTING_ITEMS_WILL_BE_REPLACED,
    })
  }
  if (hasManualItems) {
    warnings.push({
      code: 'MANUAL_ITEMS_WILL_BE_REMOVED',
      message: WARNING_MESSAGES.MANUAL_ITEMS_WILL_BE_REMOVED,
    })
  }
  if (hasReviewedItems) {
    warnings.push({
      code: 'REVIEWED_ITEMS_WILL_BE_REMOVED',
      message: WARNING_MESSAGES.REVIEWED_ITEMS_WILL_BE_REMOVED,
    })
  }
  if (generatedReviewRequiredItemsCount > 0) {
    warnings.push({
      code: 'ITEMS_NEED_REVIEW_AFTER_GENERATION',
      message: WARNING_MESSAGES.ITEMS_NEED_REVIEW_AFTER_GENERATION,
    })
  }
  if (generatedItemsCount === 0) {
    warnings.push({
      code: 'NO_ACTIVE_STEPS_FOUND',
      message: WARNING_MESSAGES.NO_ACTIVE_STEPS_FOUND,
    })
  }
  if (input.startDateAdjustedToBusinessDay) {
    warnings.push({
      code: 'START_DATE_ADJUSTED_TO_BUSINESS_DAY',
      message: WARNING_MESSAGES.START_DATE_ADJUSTED_TO_BUSINESS_DAY,
    })
  }

  return {
    plannedStartDate: input.plannedStartDate,
    plannedEndDate: input.plannedEndDate,
    dailyCapacityMinutes: input.dailyCapacityMinutes,
    existingActiveItemsCount: activeExisting.length,
    existingGeneratedItemsCount,
    existingManualItemsCount,
    existingReviewedItemsCount,
    existingReviewRequiredItemsCount,
    generatedItemsCount,
    generatedReviewRequiredItemsCount,
    hasExistingItems,
    hasManualItems,
    hasReviewedItems,
    warnings,
  }
}
