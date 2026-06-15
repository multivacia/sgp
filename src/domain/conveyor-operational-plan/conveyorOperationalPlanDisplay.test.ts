import { describe, expect, it } from 'vitest'
import {
  canCreateConveyorOperationalPlan,
  canEditConveyorOperationalPlanItems,
  conveyorPlanItemShowsManualAdjustmentBadge,
  getConveyorOperationalPlanStateMessage,
  labelConveyorOperationalPlanFactoryStatus,
  labelConveyorOperationalPlanItemSource,
  labelConveyorOperationalPlanItemStatus,
  labelConveyorOperationalPlanStatus,
  showApproveConveyorOperationalPlanButton,
  showGenerateConveyorOperationalPlanItemsButton,
  showSendToFactoryConveyorOperationalPlanButton,
  showWaitingFactoryPlanningMessage,
} from './conveyorOperationalPlanDisplay'
import type { ConveyorOperationalPlanItem } from './conveyor-operational-plan.types'
import type { ConveyorOperationalPlanSummary } from './conveyorPlanSummary'

function emptySummary(
  partial: Partial<ConveyorOperationalPlanSummary> = {},
): ConveyorOperationalPlanSummary {
  return {
    activeItemsCount: 0,
    reviewRequiredItemsCount: 0,
    readyItemsCount: 0,
    generatedItemsCount: 0,
    manualItemsCount: 0,
    importedItemsCount: 0,
    totalPlannedMinutes: 0,
    firstPlannedDate: null,
    lastPlannedDate: null,
    completedItemsCount: 0,
    inProgressItemsCount: 0,
    cancelledItemsCount: 0,
    ...partial,
  }
}

function planItem(
  partial: Partial<ConveyorOperationalPlanItem> = {},
): ConveyorOperationalPlanItem {
  return {
    id: 'i1',
    planId: 'p1',
    conveyorId: 'c1',
    activityNodeId: 'a1',
    taskTitle: 'T',
    sectorTitle: 'S',
    activityTitle: 'A',
    plannedDate: null,
    plannedOrder: 0,
    plannedMinutes: null,
    plannedCollaboratorId: null,
    plannedCollaboratorName: null,
    plannedTeamId: null,
    plannedTeamName: null,
    status: 'PLANNED',
    sourceKind: 'GENERATED',
    originWorkPlanItemId: null,
    syncStatus: null,
    reviewRequired: false,
    reviewReasons: [],
    cancellationReason: null,
    notes: null,
    realizedMinutes: 0,
    activityOperationalStatus: null,
    createdAt: '',
    updatedAt: '',
    ...partial,
  }
}

describe('conveyorOperationalPlanDisplay', () => {
  it('labels plan status in Portuguese', () => {
    expect(labelConveyorOperationalPlanStatus('DRAFT')).toBe('Rascunho')
    expect(labelConveyorOperationalPlanStatus('WAITING_FACTORY_PLANNING')).toContain('fábrica')
  })

  it('allows create for EM_PLANEJAMENTO, A_INICIAR and EM_ANDAMENTO', () => {
    expect(canCreateConveyorOperationalPlan('EM_PLANEJAMENTO')).toBe(true)
    expect(canCreateConveyorOperationalPlan('A_INICIAR')).toBe(true)
    expect(canCreateConveyorOperationalPlan('EM_ANDAMENTO')).toBe(true)
    expect(canCreateConveyorOperationalPlan('EM_REVISAO')).toBe(false)
  })

  it('shows approve in DRAFT and send in APPROVED', () => {
    expect(showApproveConveyorOperationalPlanButton('DRAFT')).toBe(true)
    expect(showApproveConveyorOperationalPlanButton('APPROVED')).toBe(false)
    expect(showSendToFactoryConveyorOperationalPlanButton('APPROVED')).toBe(true)
    expect(showWaitingFactoryPlanningMessage('WAITING_FACTORY_PLANNING')).toBe(true)
  })

  it('shows generate items only in DRAFT', () => {
    expect(showGenerateConveyorOperationalPlanItemsButton('DRAFT')).toBe(true)
    expect(showGenerateConveyorOperationalPlanItemsButton('APPROVED')).toBe(false)
    expect(showGenerateConveyorOperationalPlanItemsButton('WAITING_FACTORY_PLANNING')).toBe(false)
  })

  it('labels factory and source kinds', () => {
    expect(labelConveyorOperationalPlanFactoryStatus('NOT_SCHEDULED')).toBe('Não agendado')
    expect(labelConveyorOperationalPlanFactoryStatus('FULLY_SCHEDULED')).toBe('Agendado')
    expect(labelConveyorOperationalPlanItemSource('MANUAL')).toBe('Manual')
    expect(labelConveyorOperationalPlanItemSource('GENERATED')).toContain('automaticamente')
  })

  it('labels item status with review override', () => {
    expect(labelConveyorOperationalPlanItemStatus(planItem({ status: 'PLANNED' }))).toBe('Planejado')
    expect(
      labelConveyorOperationalPlanItemStatus(
        planItem({ status: 'PLANNED', reviewRequired: true }),
      ),
    ).toBe('Precisa revisão')
  })

  it('allows item edit only in DRAFT', () => {
    expect(canEditConveyorOperationalPlanItems('DRAFT')).toBe(true)
    expect(canEditConveyorOperationalPlanItems('APPROVED')).toBe(false)
  })

  it('detects manual adjustment on generated items', () => {
    const generatedAt = '2026-05-01T10:00:00.000Z'
    expect(
      conveyorPlanItemShowsManualAdjustmentBadge(
        planItem({
          sourceKind: 'GENERATED',
          updatedAt: '2026-05-02T10:00:00.000Z',
        }),
        generatedAt,
      ),
    ).toBe(true)
    expect(
      conveyorPlanItemShowsManualAdjustmentBadge(
        planItem({ sourceKind: 'MANUAL', updatedAt: '2026-05-02T10:00:00.000Z' }),
        generatedAt,
      ),
    ).toBe(false)
  })

  it('returns state messages by plan status', () => {
    expect(getConveyorOperationalPlanStateMessage('DRAFT', emptySummary())).toContain('rascunho')
    expect(
      getConveyorOperationalPlanStateMessage(
        'DRAFT',
        emptySummary({ activeItemsCount: 2, reviewRequiredItemsCount: 1 }),
      ),
    ).toContain('revisão')
    expect(getConveyorOperationalPlanStateMessage('APPROVED', emptySummary())).toContain('aprovado')
    expect(getConveyorOperationalPlanStateMessage('WAITING_FACTORY_PLANNING', emptySummary())).toContain(
      'Aguardando encaixe',
    )
    expect(getConveyorOperationalPlanStateMessage('WAITING_FACTORY_PLANNING', emptySummary())).toContain(
      'gestor da fábrica',
    )
  })
})
