import type {
  ConveyorOperationalPlanGenerationPreview,
  ConveyorPlanGenerationPreviewWarning,
} from './conveyor-operational-plan.types'

export function isConveyorPlanRegeneration(activeItemsCount: number): boolean {
  return activeItemsCount > 0
}

export function labelGenerateConveyorPlanItemsButton(activeItemsCount: number): string {
  return isConveyorPlanRegeneration(activeItemsCount)
    ? 'Regenerar itens do plano'
    : 'Gerar itens do plano'
}

export function formatConveyorPlanGenerationPreviewWarnings(
  warnings: ConveyorPlanGenerationPreviewWarning[],
): string[] {
  return warnings.map((w) => w.message)
}

export type ConveyorPlanGenerationImpactSection = {
  id: string
  title: string
  lines: string[]
  tone: 'neutral' | 'warning' | 'info'
}

export function buildConveyorPlanGenerationImpactSections(
  preview: ConveyorOperationalPlanGenerationPreview,
): ConveyorPlanGenerationImpactSection[] {
  const sections: ConveyorPlanGenerationImpactSection[] = []

  if (preview.hasExistingItems) {
    const replacementLines = [
      `${preview.existingActiveItemsCount} item(ns) ativo(s) serão substituídos`,
    ]
    if (preview.existingGeneratedItemsCount > 0) {
      replacementLines.push(`${preview.existingGeneratedItemsCount} gerado(s) automaticamente`)
    }
    sections.push({
      id: 'replacement',
      title: 'Itens que serão substituídos',
      lines: replacementLines,
      tone: 'warning',
    })
  }

  if (preview.existingManualItemsCount > 0) {
    sections.push({
      id: 'manual',
      title: 'Itens manuais',
      lines: [
        `${preview.existingManualItemsCount} item(ns) adicionado(s) manualmente serão removidos`,
      ],
      tone: 'warning',
    })
  }

  if (preview.existingReviewedItemsCount > 0) {
    sections.push({
      id: 'reviewed',
      title: 'Itens já revisados',
      lines: [
        `${preview.existingReviewedItemsCount} item(ns) pronto(s) ou já revisado(s) serão removidos`,
      ],
      tone: 'neutral',
    })
  }

  if (preview.existingReviewRequiredItemsCount > 0) {
    sections.push({
      id: 'in-review',
      title: 'Itens em revisão',
      lines: [
        `${preview.existingReviewRequiredItemsCount} item(ns) com revisão pendente serão removidos`,
      ],
      tone: 'neutral',
    })
  }

  const afterLines: string[] = [
    `${preview.generatedItemsCount} novo(s) item(ns) serão gerados`,
  ]
  if (preview.generatedReviewRequiredItemsCount > 0) {
    afterLines.push(
      `${preview.generatedReviewRequiredItemsCount} precisarão revisão após a geração`,
    )
  }
  sections.push({
    id: 'after-generation',
    title: 'Após a regeneração',
    lines: afterLines,
    tone: preview.generatedReviewRequiredItemsCount > 0 ? 'warning' : 'info',
  })

  sections.push({
    id: 'capacity',
    title: 'Capacidade e período',
    lines: [
      `Capacidade diária: ${preview.dailyCapacityMinutes} min`,
      preview.plannedEndDate
        ? `Período previsto: ${preview.plannedStartDate} → ${preview.plannedEndDate}`
        : `Início previsto: ${preview.plannedStartDate}`,
    ],
    tone: 'info',
  })

  return sections
}

export function buildConveyorPlanGenerationImpactLines(
  preview: ConveyorOperationalPlanGenerationPreview,
): string[] {
  const lines: string[] = []
  if (preview.hasExistingItems) {
    lines.push(`${preview.existingActiveItemsCount} item(ns) atuais serão substituídos`)
    if (preview.existingGeneratedItemsCount > 0) {
      lines.push(`${preview.existingGeneratedItemsCount} gerado(s) automaticamente`)
    }
    if (preview.existingManualItemsCount > 0) {
      lines.push(`${preview.existingManualItemsCount} manual(is)`)
    }
    if (preview.existingReviewedItemsCount > 0) {
      lines.push(`${preview.existingReviewedItemsCount} já revisado(s)/prontos`)
    }
    if (preview.existingReviewRequiredItemsCount > 0) {
      lines.push(`${preview.existingReviewRequiredItemsCount} em revisão`)
    }
  }
  lines.push(`${preview.generatedItemsCount} novo(s) item(ns) previsto(s)`)
  if (preview.generatedReviewRequiredItemsCount > 0) {
    lines.push(`${preview.generatedReviewRequiredItemsCount} precisarão revisão após a geração`)
  }
  lines.push(`Capacidade diária: ${preview.dailyCapacityMinutes} min`)
  if (preview.plannedEndDate) {
    lines.push(`Período previsto: ${preview.plannedStartDate} → ${preview.plannedEndDate}`)
  } else {
    lines.push(`Início previsto: ${preview.plannedStartDate}`)
  }
  return lines
}

export const CONVEYOR_PLAN_REGENERATION_INTRO =
  'Regenerar substituirá os itens atuais do plano por uma nova lista baseada na estrutura atual da esteira. Itens editados manualmente serão removidos.'

export const CONVEYOR_PLAN_FIRST_GENERATION_INTRO =
  'O sistema usará a estrutura atual da esteira, tempos previstos e a capacidade diária padrão configurada.'
