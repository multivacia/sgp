import { describe, expect, it } from 'vitest'
import {
  canSubmitKioskProductionTimeEntry,
  productionOutOfSequenceJustificationError,
  productionPlannedTimeReachedHint,
  productionTimePlannedCoverageLabel,
  productionTimePlannedCoveragePct,
} from './kioskActivityCardLogic'
import type { ProductionWorkQueueItem } from './production.types'
import { emptyJustificationFieldValue } from '../operational/timeEntryJustificationField'

const baseItem = (
  overrides: Partial<ProductionWorkQueueItem> = {},
): ProductionWorkQueueItem => ({
  workPlanItemId: 'wpi-1',
  conveyorId: 'cv-1',
  conveyorTitle: 'OS 001',
  activityNodeId: 'act-1',
  activityTitle: 'Atividade',
  taskTitle: 'Tarefa',
  sectorTitle: 'Setor',
  plannedDate: '2026-05-28',
  plannedMinutes: 15,
  realizedMinutes: 0,
  pendingMinutes: 15,
  activityOperationalStatus: 'PENDING',
  isActivityCompleted: false,
  isOverdue: false,
  isOutOfSequence: false,
  isNextRecommended: false,
  hasPreviousPendingStep: false,
  requiresOutOfSequenceJustification: false,
  previousOpenCount: 0,
  previousOpenActivities: [],
  allPreviousOpenActivities: [],
  awaitingPreviousActivities: [],
  hasPreviousOpenActivitiesFromOtherCollaborators: false,
  previousOpenActivitiesFromOtherCollaborators: [],
  previousOpenActivitiesWarningMessage: null,
  group: 'today',
  canTrackTime: true,
  canCompleteStep: true,
  ...overrides,
})

describe('kioskActivityCardLogic', () => {
  it('productionTimePlannedCoveragePct usa tempo realizado/planejado', () => {
    expect(
      productionTimePlannedCoveragePct({ plannedMinutes: 15, realizedMinutes: 15 }),
    ).toBe(100)
  })

  it('productionTimePlannedCoverageLabel não usa "previsto" ambíguo sozinho', () => {
    expect(productionTimePlannedCoverageLabel(100)).toBe('Tempo previsto: 100%')
  })

  it('productionPlannedTimeReachedHint quando tempo atingido sem conclusão', () => {
    expect(
      productionPlannedTimeReachedHint(
        baseItem({ plannedMinutes: 15, realizedMinutes: 15 }),
      ),
    ).toContain('Marque como concluída')
  })

  it('canSubmitKioskProductionTimeEntry exige justificativa fora de sequência', () => {
    expect(
      canSubmitKioskProductionTimeEntry({
        minutesValid: true,
        requiresOutOfSequenceJustification: true,
        justification: emptyJustificationFieldValue(),
        useFallback: false,
        requiresComplement: false,
      }),
    ).toBe(false)
    expect(
      canSubmitKioskProductionTimeEntry({
        minutesValid: true,
        requiresOutOfSequenceJustification: true,
        justification: {
          justificationId: 'seq-1',
          justificationComplement: '',
          legacyText: 'Atividade anterior pendente de outro colaborador',
        },
        useFallback: false,
        requiresComplement: false,
      }),
    ).toBe(true)
    expect(
      canSubmitKioskProductionTimeEntry({
        minutesValid: true,
        requiresOutOfSequenceJustification: false,
        justification: emptyJustificationFieldValue(),
        useFallback: false,
        requiresComplement: false,
      }),
    ).toBe(true)
  })

  it('productionOutOfSequenceJustificationError para vazio', () => {
    expect(
      productionOutOfSequenceJustificationError({
        justification: emptyJustificationFieldValue(),
        useFallback: false,
        requiresComplement: false,
      }),
    ).toMatch(/justificativa/i)
  })
})
