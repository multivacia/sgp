import { describe, expect, it } from 'vitest'
import {
  buildConveyorOperationalPlanGeneratedItems,
  DEFAULT_DAILY_CAPACITY_MINUTES,
  type ConveyorPlanGenerationStepInput,
} from '../modules/conveyor-operational-plan/buildConveyorOperationalPlanGeneratedItems.js'
import { deriveConveyorPlanItemReview } from '../modules/conveyor-operational-plan/deriveConveyorPlanItemReview.js'
import { resolveActivityPlannedTotalMinutes } from '../shared/activityOperationalQuantity.js'

const STEP_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const COLLAB = 'dddddddd-0000-0000-0000-000000000004'

function step(
  partial: Partial<ConveyorPlanGenerationStepInput> &
    Pick<ConveyorPlanGenerationStepInput, 'activityNodeId'>,
): ConveyorPlanGenerationStepInput {
  return {
    taskName: 'Tarefa',
    areaName: 'Setor',
    activityName: 'Atividade',
    optionOrderIndex: 0,
    areaOrderIndex: 0,
    stepOrderIndex: 0,
    plannedMinutes: 60,
    defaultResponsibleId: COLLAB,
    collaboratorAssigneeIds: [COLLAB],
    teamAssigneeIds: [],
    ...partial,
  }
}

describe('operational planning — carga planejada total', () => {
  it('qty 1 × 30 min → item do plano com 30 min', () => {
    expect(resolveActivityPlannedTotalMinutes(30, 1)).toBe(30)
    const { items } = buildConveyorOperationalPlanGeneratedItems({
      steps: [step({ activityNodeId: STEP_A, plannedMinutes: 30 })],
      plannedStartDate: '2026-05-18',
      dailyCapacityMinutes: DEFAULT_DAILY_CAPACITY_MINUTES,
    })
    expect(items[0].plannedMinutes).toBe(30)
  })

  it('qty 10 × 15 min → item do plano com 150 min', () => {
    expect(resolveActivityPlannedTotalMinutes(15, 10)).toBe(150)
    const { items } = buildConveyorOperationalPlanGeneratedItems({
      steps: [step({ activityNodeId: STEP_A, plannedMinutes: 150 })],
      plannedStartDate: '2026-05-18',
      dailyCapacityMinutes: DEFAULT_DAILY_CAPACITY_MINUTES,
    })
    expect(items[0].plannedMinutes).toBe(150)
  })

  it('revisão OVER_DAILY_CAPACITY considera carga total (150 min, capacidade 60)', () => {
    const review = deriveConveyorPlanItemReview({
      plannedMinutes: 150,
      plannedDate: '2026-06-01',
      plannedCollaboratorId: COLLAB,
      plannedTeamId: null,
      stepTeamIds: [],
      dailyCapacityMinutes: 60,
    })
    expect(review.reviewReasons.map((r) => r.code)).toContain('OVER_DAILY_CAPACITY')
  })

  it('qty 1 mantém comportamento anterior na geração (60 min)', () => {
    const { items } = buildConveyorOperationalPlanGeneratedItems({
      steps: [step({ activityNodeId: STEP_A, plannedMinutes: 60 })],
      plannedStartDate: '2026-05-18',
      dailyCapacityMinutes: DEFAULT_DAILY_CAPACITY_MINUTES,
    })
    expect(items[0].plannedMinutes).toBe(60)
  })
})
