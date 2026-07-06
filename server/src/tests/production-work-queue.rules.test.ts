import { describe, expect, it } from 'vitest'
import {
  resolveProductionCanCompleteStep,
  resolveProductionCanTrackTime,
  resolveProductionRequiresOutOfSequenceJustification,
} from '../modules/production/production-work-queue.rules.js'

const base = {
  isActivityCompleted: false,
  hasPreviousPendingStep: false,
  isOutOfSequence: false,
  planItemStatus: 'PLANNED',
  conveyorOperationalStatus: 'A_INICIAR',
  isPlannedForCollaborator: true,
}

describe('resolveProductionCanTrackTime', () => {
  it('permite primeira atividade em esteira A_INICIAR no plano', () => {
    expect(resolveProductionCanTrackTime(base)).toBe(true)
  })

  it('permite fora de sequência (justificativa no POST)', () => {
    expect(
      resolveProductionCanTrackTime({ ...base, isOutOfSequence: true }),
    ).toBe(true)
  })

  it('bloqueia atividade concluída', () => {
    expect(
      resolveProductionCanTrackTime({ ...base, isActivityCompleted: true }),
    ).toBe(false)
  })

  it('bloqueia esteira em planejamento', () => {
    expect(
      resolveProductionCanTrackTime({
        ...base,
        conveyorOperationalStatus: 'EM_PLANEJAMENTO',
      }),
    ).toBe(false)
  })
})

describe('resolveProductionRequiresOutOfSequenceJustification', () => {
  it('true quando etapa anterior pendente e não concluída', () => {
    expect(
      resolveProductionRequiresOutOfSequenceJustification({
        isActivityCompleted: false,
        hasPreviousPendingStep: true,
        isOutOfSequence: false,
      }),
    ).toBe(true)
  })

  it('false quando concluída', () => {
    expect(
      resolveProductionRequiresOutOfSequenceJustification({
        isActivityCompleted: true,
        hasPreviousPendingStep: true,
        isOutOfSequence: true,
      }),
    ).toBe(false)
  })
})

describe('resolveProductionCanCompleteStep', () => {
  it('espelha canTrackTime para itens apontáveis', () => {
    expect(resolveProductionCanCompleteStep(base)).toBe(true)
    expect(
      resolveProductionCanCompleteStep({ ...base, isOutOfSequence: true }),
    ).toBe(true)
    expect(
      resolveProductionCanCompleteStep({ ...base, isActivityCompleted: true }),
    ).toBe(false)
  })
})
