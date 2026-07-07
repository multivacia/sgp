import { describe, expect, it } from 'vitest'
import {
  resolveIsNextRecommended,
  resolveIsStructurallyNextRecommended,
  resolveSequencePresentation,
  resolveSequenceWarningLabel,
} from '../modules/my-work-queue/work-queue-sequence-presentation.js'

describe('work-queue-sequence-presentation', () => {
  it('resolveSequenceWarningLabel — uma pendência nomeia a etapa', () => {
    expect(
      resolveSequenceWarningLabel(true, [{ activityTitle: 'Funilaria' }]),
    ).toEqual({
      sequenceWarningType: 'PREVIOUS_STEP_PENDING',
      sequenceWarningLabel: 'Etapa anterior pendente: Funilaria',
    })
  })

  it('resolveSequenceWarningLabel — várias pendências usa alerta genérico', () => {
    expect(
      resolveSequenceWarningLabel(true, [
        { activityTitle: 'A' },
        { activityTitle: 'B' },
      ]),
    ).toEqual({
      sequenceWarningType: 'PREVIOUS_STEP_PENDING',
      sequenceWarningLabel: 'Atenção à sequência',
    })
  })

  it('resolveSequencePresentation — pendência anterior não bloqueia apontamento', () => {
    const p = resolveSequencePresentation({
      isActivityCompleted: false,
      conveyorOperationalStatus: 'EM_ANDAMENTO',
      hasPreviousPendingStep: true,
      allPreviousOpenActivities: [{ activityTitle: 'Desmontagem' }],
    })
    expect(p.canPointTime).toBe(true)
    expect(p.requiresOutOfSequenceJustification).toBe(true)
    expect(p.sequenceWarningLabel).toContain('Desmontagem')
  })

  it('resolveSequencePresentation — esteira finalizada bloqueia', () => {
    const p = resolveSequencePresentation({
      isActivityCompleted: false,
      conveyorOperationalStatus: 'FINALIZADA',
      hasPreviousPendingStep: false,
      allPreviousOpenActivities: [],
    })
    expect(p.canPointTime).toBe(false)
    expect(p.blockingReason).toMatch(/finalizada/i)
  })

  it('resolveIsNextRecommended — true por item sem pendência e com canPointTime', () => {
    expect(
      resolveIsNextRecommended({
        isActivityCompleted: false,
        hasPreviousPendingStep: false,
        canPointTime: true,
      }),
    ).toBe(true)
  })

  it('resolveIsNextRecommended — false com pendência estrutural, independente da ordem da fila', () => {
    expect(
      resolveIsNextRecommended({
        isActivityCompleted: false,
        hasPreviousPendingStep: true,
        canPointTime: true,
      }),
    ).toBe(false)
  })

  it('resolveIsNextRecommended — false quando canPointTime bloqueado', () => {
    expect(
      resolveIsNextRecommended({
        isActivityCompleted: false,
        hasPreviousPendingStep: false,
        canPointTime: false,
      }),
    ).toBe(false)
  })

  it('duas esteiras distintas podem ter isNextRecommended true simultaneamente', () => {
    const cv1 = resolveIsNextRecommended({
      isActivityCompleted: false,
      hasPreviousPendingStep: false,
      canPointTime: true,
    })
    const cv2 = resolveIsNextRecommended({
      isActivityCompleted: false,
      hasPreviousPendingStep: false,
      canPointTime: true,
    })
    expect(cv1).toBe(true)
    expect(cv2).toBe(true)
  })

  it('resolveIsStructurallyNextRecommended — true sem pendência e esteira liberada', () => {
    expect(
      resolveIsStructurallyNextRecommended({
        isActivityCompleted: false,
        hasPreviousPendingStep: false,
        conveyorOperationalStatus: 'A_INICIAR',
      }),
    ).toBe(true)
  })

  it('resolveIsStructurallyNextRecommended — false com pendência anterior', () => {
    expect(
      resolveIsStructurallyNextRecommended({
        isActivityCompleted: false,
        hasPreviousPendingStep: true,
        conveyorOperationalStatus: 'EM_ANDAMENTO',
      }),
    ).toBe(false)
  })
})
