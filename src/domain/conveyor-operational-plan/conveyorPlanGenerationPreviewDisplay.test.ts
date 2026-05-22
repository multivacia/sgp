import { describe, expect, it } from 'vitest'
import {
  buildConveyorPlanGenerationImpactLines,
  buildConveyorPlanGenerationImpactSections,
  formatConveyorPlanGenerationPreviewWarnings,
  isConveyorPlanRegeneration,
  labelGenerateConveyorPlanItemsButton,
} from './conveyorPlanGenerationPreviewDisplay'
import type { ConveyorOperationalPlanGenerationPreview } from './conveyor-operational-plan.types'

function preview(
  partial: Partial<ConveyorOperationalPlanGenerationPreview> = {},
): ConveyorOperationalPlanGenerationPreview {
  return {
    plannedStartDate: '2026-06-01',
    plannedEndDate: '2026-06-05',
    dailyCapacityMinutes: 480,
    existingActiveItemsCount: 0,
    existingGeneratedItemsCount: 0,
    existingManualItemsCount: 0,
    existingReviewedItemsCount: 0,
    existingReviewRequiredItemsCount: 0,
    generatedItemsCount: 3,
    generatedReviewRequiredItemsCount: 0,
    hasExistingItems: false,
    hasManualItems: false,
    hasReviewedItems: false,
    warnings: [],
    ...partial,
  }
}

describe('conveyorPlanGenerationPreviewDisplay', () => {
  it('differentiates generate vs regenerate button labels', () => {
    expect(labelGenerateConveyorPlanItemsButton(0)).toBe('Gerar itens do plano')
    expect(labelGenerateConveyorPlanItemsButton(2)).toBe('Regenerar itens do plano')
    expect(isConveyorPlanRegeneration(0)).toBe(false)
    expect(isConveyorPlanRegeneration(1)).toBe(true)
  })

  it('formats warning messages', () => {
    const messages = formatConveyorPlanGenerationPreviewWarnings([
      { code: 'MANUAL_ITEMS_WILL_BE_REMOVED', message: 'Itens manuais serão removidos.' },
    ])
    expect(messages).toEqual(['Itens manuais serão removidos.'])
  })

  it('builds impact sections with separate alerts', () => {
    const sections = buildConveyorPlanGenerationImpactSections(
      preview({
        hasExistingItems: true,
        existingActiveItemsCount: 4,
        existingManualItemsCount: 2,
        existingReviewedItemsCount: 1,
        generatedReviewRequiredItemsCount: 1,
      }),
    )
    expect(sections.some((s) => s.id === 'replacement')).toBe(true)
    expect(sections.some((s) => s.id === 'manual')).toBe(true)
    expect(sections.some((s) => s.id === 'reviewed')).toBe(true)
    expect(sections.some((s) => s.id === 'after-generation')).toBe(true)
  })

  it('builds impact lines including manual items', () => {
    const lines = buildConveyorPlanGenerationImpactLines(
      preview({
        hasExistingItems: true,
        existingActiveItemsCount: 4,
        existingManualItemsCount: 2,
        existingReviewedItemsCount: 1,
        generatedReviewRequiredItemsCount: 1,
      }),
    )
    expect(lines.some((l) => l.includes('substituídos'))).toBe(true)
    expect(lines.some((l) => l.includes('manual'))).toBe(true)
    expect(lines.some((l) => l.includes('revisado'))).toBe(true)
    expect(lines.some((l) => l.includes('precisarão revisão'))).toBe(true)
  })
})
