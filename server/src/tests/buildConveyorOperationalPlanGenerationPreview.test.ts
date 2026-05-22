import { describe, expect, it } from 'vitest'
import { buildConveyorOperationalPlanGeneratedItems } from '../modules/conveyor-operational-plan/buildConveyorOperationalPlanGeneratedItems.js'
import { buildConveyorOperationalPlanGenerationPreview } from '../modules/conveyor-operational-plan/buildConveyorOperationalPlanGenerationPreview.js'

const STEP_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

function generatedFromSteps(
  steps: Parameters<typeof buildConveyorOperationalPlanGeneratedItems>[0]['steps'],
  plannedStartDate = '2026-06-01',
) {
  return buildConveyorOperationalPlanGeneratedItems({
    steps,
    plannedStartDate,
    dailyCapacityMinutes: 480,
  })
}

describe('buildConveyorOperationalPlanGenerationPreview', () => {
  it('preview without existing items has no overwrite warnings', () => {
    const generated = generatedFromSteps([
      {
        activityNodeId: STEP_ID,
        taskName: 'T',
        areaName: 'A',
        activityName: 'S',
        optionOrderIndex: 0,
        areaOrderIndex: 0,
        stepOrderIndex: 0,
        plannedMinutes: 60,
        defaultResponsibleId: null,
        collaboratorAssigneeIds: [],
        teamAssigneeIds: [],
      },
    ])
    const preview = buildConveyorOperationalPlanGenerationPreview({
      existingItems: [],
      generated,
      plannedStartDate: '2026-06-01',
      plannedEndDate: generated.plannedEndDate,
      dailyCapacityMinutes: 480,
      startDateAdjustedToBusinessDay: false,
    })
    expect(preview.hasExistingItems).toBe(false)
    expect(preview.generatedItemsCount).toBe(1)
    expect(preview.warnings.map((w) => w.code)).not.toContain('EXISTING_ITEMS_WILL_BE_REPLACED')
    expect(preview.warnings.map((w) => w.code)).not.toContain('MANUAL_ITEMS_WILL_BE_REMOVED')
  })

  it('preview with generated existing items warns replacement', () => {
    const generated = generatedFromSteps([])
    const preview = buildConveyorOperationalPlanGenerationPreview({
      existingItems: [{ sourceKind: 'GENERATED', reviewRequired: true, status: 'NEEDS_REVIEW' }],
      generated,
      plannedStartDate: '2026-06-01',
      plannedEndDate: generated.plannedEndDate,
      dailyCapacityMinutes: 480,
      startDateAdjustedToBusinessDay: false,
    })
    expect(preview.existingActiveItemsCount).toBe(1)
    expect(preview.existingGeneratedItemsCount).toBe(1)
    expect(preview.warnings.map((w) => w.code)).toContain('EXISTING_ITEMS_WILL_BE_REPLACED')
  })

  it('preview with manual item warns manual removal', () => {
    const generated = generatedFromSteps([])
    const preview = buildConveyorOperationalPlanGenerationPreview({
      existingItems: [{ sourceKind: 'MANUAL', reviewRequired: false, status: 'PLANNED' }],
      generated,
      plannedStartDate: '2026-06-01',
      plannedEndDate: generated.plannedEndDate,
      dailyCapacityMinutes: 480,
      startDateAdjustedToBusinessDay: false,
    })
    expect(preview.existingManualItemsCount).toBe(1)
    expect(preview.hasManualItems).toBe(true)
    expect(preview.warnings.map((w) => w.code)).toContain('MANUAL_ITEMS_WILL_BE_REMOVED')
  })

  it('preview with reviewed ready item warns reviewed removal', () => {
    const generated = generatedFromSteps([])
    const preview = buildConveyorOperationalPlanGenerationPreview({
      existingItems: [{ sourceKind: 'GENERATED', reviewRequired: false, status: 'PLANNED' }],
      generated,
      plannedStartDate: '2026-06-01',
      plannedEndDate: generated.plannedEndDate,
      dailyCapacityMinutes: 480,
      startDateAdjustedToBusinessDay: false,
    })
    expect(preview.existingReviewedItemsCount).toBe(1)
    expect(preview.hasReviewedItems).toBe(true)
    expect(preview.warnings.map((w) => w.code)).toContain('REVIEWED_ITEMS_WILL_BE_REMOVED')
  })

  it('preview with generated review items warns review after generation', () => {
    const generated = generatedFromSteps([
      {
        activityNodeId: STEP_ID,
        taskName: 'T',
        areaName: 'A',
        activityName: 'S',
        optionOrderIndex: 0,
        areaOrderIndex: 0,
        stepOrderIndex: 0,
        plannedMinutes: null,
        defaultResponsibleId: null,
        collaboratorAssigneeIds: [],
        teamAssigneeIds: [],
      },
    ])
    const preview = buildConveyorOperationalPlanGenerationPreview({
      existingItems: [],
      generated,
      plannedStartDate: '2026-06-01',
      plannedEndDate: generated.plannedEndDate,
      dailyCapacityMinutes: 480,
      startDateAdjustedToBusinessDay: false,
    })
    expect(preview.generatedReviewRequiredItemsCount).toBeGreaterThan(0)
    expect(preview.warnings.map((w) => w.code)).toContain('ITEMS_NEED_REVIEW_AFTER_GENERATION')
  })

  it('preview with zero active steps warns no active steps', () => {
    const generated = generatedFromSteps([])
    const preview = buildConveyorOperationalPlanGenerationPreview({
      existingItems: [],
      generated,
      plannedStartDate: '2026-06-01',
      plannedEndDate: generated.plannedEndDate,
      dailyCapacityMinutes: 480,
      startDateAdjustedToBusinessDay: false,
    })
    expect(preview.generatedItemsCount).toBe(0)
    expect(preview.warnings.map((w) => w.code)).toContain('NO_ACTIVE_STEPS_FOUND')
  })

  it('preview includes start date adjusted warning', () => {
    const generated = generatedFromSteps([])
    const preview = buildConveyorOperationalPlanGenerationPreview({
      existingItems: [],
      generated,
      plannedStartDate: '2026-06-01',
      plannedEndDate: generated.plannedEndDate,
      dailyCapacityMinutes: 480,
      startDateAdjustedToBusinessDay: true,
    })
    expect(preview.warnings.map((w) => w.code)).toContain('START_DATE_ADJUSTED_TO_BUSINESS_DAY')
  })
})
