import { describe, expect, it } from 'vitest'
import {
  canSubmitKioskProductionTimeEntry,
  kioskRequiresExcessTimeJustification,
  kioskRequiresOperationalJustification,
  productionOutOfSequenceJustificationError,
  productionPlannedTimeReachedHint,
  productionTimePlannedCoverageLabel,
  productionTimePlannedCoveragePct,
  resolveKioskInitialSessionCompletionPct,
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

  it('resolveKioskInitialSessionCompletionPct usa lastSessionCompletionPct da fila', () => {
    expect(resolveKioskInitialSessionCompletionPct({ lastSessionCompletionPct: 50 })).toBe(50)
    expect(resolveKioskInitialSessionCompletionPct({ lastSessionCompletionPct: null })).toBe(0)
    expect(resolveKioskInitialSessionCompletionPct({})).toBe(0)
    expect(resolveKioskInitialSessionCompletionPct({ lastSessionCompletionPct: 150 })).toBe(100)
  })

  it('canSubmitKioskProductionTimeEntry bloqueia envio vazio sem conclusão', () => {
    expect(
      canSubmitKioskProductionTimeEntry({
        markAsDone: false,
        minutes: 0,
        sessionPct: 0,
        requiresOperationalJustification: false,
        justification: emptyJustificationFieldValue(),
        useFallback: false,
        requiresComplement: false,
      }),
    ).toBe(false)
  })

  it('canSubmitKioskProductionTimeEntry permite concluir sem tempo trabalhado', () => {
    expect(
      canSubmitKioskProductionTimeEntry({
        markAsDone: true,
        minutes: 0,
        sessionPct: 0,
        requiresOperationalJustification: false,
        justification: emptyJustificationFieldValue(),
        useFallback: false,
        requiresComplement: false,
      }),
    ).toBe(true)
  })

  it('canSubmitKioskProductionTimeEntry permite tempo sem evolução', () => {
    expect(
      canSubmitKioskProductionTimeEntry({
        markAsDone: false,
        minutes: 30,
        sessionPct: 0,
        requiresOperationalJustification: false,
        justification: emptyJustificationFieldValue(),
        useFallback: false,
        requiresComplement: false,
      }),
    ).toBe(true)
  })

  it('canSubmitKioskProductionTimeEntry exige justificativa fora de sequência', () => {
    expect(
      canSubmitKioskProductionTimeEntry({
        markAsDone: false,
        minutes: 15,
        sessionPct: 0,
        requiresOperationalJustification: true,
        justification: emptyJustificationFieldValue(),
        useFallback: false,
        requiresComplement: false,
      }),
    ).toBe(false)
    expect(
      canSubmitKioskProductionTimeEntry({
        markAsDone: false,
        minutes: 15,
        sessionPct: 0,
        requiresOperationalJustification: true,
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
        markAsDone: false,
        minutes: 15,
        sessionPct: 0,
        requiresOperationalJustification: false,
        justification: emptyJustificationFieldValue(),
        useFallback: false,
        requiresComplement: false,
      }),
    ).toBe(true)
  })

  describe('kioskRequiresExcessTimeJustification', () => {
    const item = (plannedMinutes: number | null, realizedMinutes: number) =>
      baseItem({ plannedMinutes, realizedMinutes })

    it('planned=30, realized=0, minutes=15 → não exige', () => {
      expect(kioskRequiresExcessTimeJustification(item(30, 0), 15)).toBe(false)
    })

    it('planned=30, realized=0, minutes=30 → não exige', () => {
      expect(kioskRequiresExcessTimeJustification(item(30, 0), 30)).toBe(false)
    })

    it('planned=30, realized=0, minutes=60 → exige', () => {
      expect(kioskRequiresExcessTimeJustification(item(30, 0), 60)).toBe(true)
    })

    it('planned=30, realized=20, minutes=15 → exige', () => {
      expect(kioskRequiresExcessTimeJustification(item(30, 20), 15)).toBe(true)
    })

    it('planned=30, realized=45, minutes=5 → exige', () => {
      expect(kioskRequiresExcessTimeJustification(item(30, 45), 5)).toBe(true)
    })

    it('planned=60, realized=50, minutes=15 exige justificativa', () => {
      expect(kioskRequiresExcessTimeJustification(item(60, 50), 15)).toBe(true)
    })

    it('planned=60, realized=50, minutes=10 não exige', () => {
      expect(kioskRequiresExcessTimeJustification(item(60, 50), 10)).toBe(false)
    })

    it('planned=60, realized=60, minutes=5 exige', () => {
      expect(kioskRequiresExcessTimeJustification(item(60, 60), 5)).toBe(true)
    })

    it('minutes=0 não exige por excesso', () => {
      expect(kioskRequiresExcessTimeJustification(item(30, 45), 0)).toBe(false)
    })

    it('planned null ou zero não exige', () => {
      expect(kioskRequiresExcessTimeJustification(item(null, 10), 30)).toBe(false)
      expect(kioskRequiresExcessTimeJustification(item(0, 10), 30)).toBe(false)
    })
  })

  it('OOS + excesso com justificativa válida libera submit', () => {
    const item = baseItem({
      plannedMinutes: 30,
      realizedMinutes: 25,
      requiresOutOfSequenceJustification: true,
    })
    expect(kioskRequiresOperationalJustification(item, 10)).toBe(true)
    expect(
      canSubmitKioskProductionTimeEntry({
        markAsDone: false,
        minutes: 10,
        sessionPct: 0,
        requiresOperationalJustification: true,
        justification: {
          justificationId: 'plan-1',
          justificationComplement: '',
          legacyText: 'Falha no planejamento',
        },
        useFallback: false,
        requiresComplement: false,
      }),
    ).toBe(true)
  })

  it('sem justificativa quando exigida bloqueia submit por excesso', () => {
    const item = baseItem({ plannedMinutes: 60, realizedMinutes: 50 })
    expect(kioskRequiresOperationalJustification(item, 15)).toBe(true)
    expect(
      canSubmitKioskProductionTimeEntry({
        markAsDone: false,
        minutes: 15,
        sessionPct: 0,
        requiresOperationalJustification: true,
        justification: emptyJustificationFieldValue(),
        useFallback: false,
        requiresComplement: false,
      }),
    ).toBe(false)
  })

  it('minutes=0 + markAsDone=true não exige por excesso', () => {
    const item = baseItem({ plannedMinutes: 30, realizedMinutes: 45 })
    expect(kioskRequiresExcessTimeJustification(item, 0)).toBe(false)
    expect(kioskRequiresOperationalJustification(item, 0)).toBe(false)
    expect(
      canSubmitKioskProductionTimeEntry({
        markAsDone: true,
        minutes: 0,
        sessionPct: 80,
        requiresOperationalJustification: false,
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
