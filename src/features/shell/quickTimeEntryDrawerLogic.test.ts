import { describe, expect, it } from 'vitest'
import type { TimeEntryCandidateItem } from '../../domain/my-activities/my-activities.types'
import {
  buildTimeEntryPayload,
  canShowCompleteActivityButton,
  canShowSaveAndCompleteButton,
  candidateNeedsOutOfSequenceJustification,
  resolveTimeEntrySuccessToast,
  validateCompleteOutOfSequenceJustification,
  validateTimeEntryForm,
} from './quickTimeEntryDrawerLogic'

function baseCandidate(
  overrides: Partial<TimeEntryCandidateItem> = {},
): TimeEntryCandidateItem {
  return {
    conveyorId: 'c1',
    conveyorCode: null,
    conveyorName: 'Esteira',
    clientName: null,
    vehicleLabel: null,
    plate: null,
    stepNodeId: 's1',
    stepName: 'Atividade',
    activityTitle: 'Atividade',
    areaName: 'Setor',
    sectorTitle: 'Setor',
    roleInStep: 'primary',
    assignmentType: 'COLLABORATOR',
    plannedMinutes: 30,
    realizedMinutes: 0,
    pendingMinutes: 30,
    isAssignedToMe: true,
    requiresJustification: false,
    isOutOfSequence: false,
    requiresOutOfSequenceJustification: false,
    previousOpenCount: 0,
    previousOpenActivities: [],
    canCompleteStep: true,
    ...overrides,
  }
}

describe('quickTimeEntryDrawerLogic', () => {
  it('canShowCompleteActivityButton usa canCompleteStep e alocação', () => {
    expect(canShowCompleteActivityButton(baseCandidate())).toBe(true)
    expect(canShowCompleteActivityButton(baseCandidate({ canCompleteStep: false }))).toBe(
      false,
    )
    expect(
      canShowCompleteActivityButton(
        baseCandidate({ isAssignedToMe: false, requiresJustification: true }),
      ),
    ).toBe(false)
    expect(canShowCompleteActivityButton(baseCandidate({ conveyorId: '', stepNodeId: '' }))).toBe(
      false,
    )
  })

  it('canShowSaveAndCompleteButton inclui atividades fora da alocação', () => {
    expect(canShowSaveAndCompleteButton(baseCandidate())).toBe(true)
    expect(canShowSaveAndCompleteButton(baseCandidate({ canCompleteStep: false }))).toBe(
      false,
    )
    expect(
      canShowSaveAndCompleteButton(
        baseCandidate({ isAssignedToMe: false, requiresJustification: true }),
      ),
    ).toBe(true)
  })

  it('buildTimeEntryPayload inclui markAsDone quando solicitado', () => {
    const payload = buildTimeEntryPayload({
      candidate: baseCandidate(),
      minutes: 15,
      executedQuantity: 1,
      description: 'ok',
      exceptionJustification: '',
      outOfSequenceJustification: '',
      markAsDone: true,
    })
    expect(payload.markAsDone).toBe(true)
    expect(payload.minutes).toBe(15)
  })

  it('buildTimeEntryPayload normal não inclui markAsDone', () => {
    const payload = buildTimeEntryPayload({
      candidate: baseCandidate(),
      minutes: 15,
      executedQuantity: 1,
      description: '',
      exceptionJustification: '',
      outOfSequenceJustification: '',
      markAsDone: false,
    })
    expect(payload.markAsDone).toBeUndefined()
  })

  it('buildTimeEntryPayload fora de sequência inclui justificativa', () => {
    const payload = buildTimeEntryPayload({
      candidate: baseCandidate({ isOutOfSequence: true, requiresOutOfSequenceJustification: true }),
      minutes: 10,
      executedQuantity: 0,
      description: '',
      exceptionJustification: '',
      outOfSequenceJustification: ' urgente ',
      markAsDone: true,
    })
    expect(payload.outOfSequenceJustification).toBe('urgente')
    expect(payload.markAsDone).toBe(true)
  })

  it('resolveTimeEntrySuccessToast', () => {
    expect(resolveTimeEntrySuccessToast(false)).toContain('Apontamento')
    expect(resolveTimeEntrySuccessToast(true)).toContain('concluída')
  })

  it('validateTimeEntryForm exige justificativas', () => {
    expect(
      validateTimeEntryForm({
        candidate: baseCandidate({ requiresJustification: true, isAssignedToMe: false }),
        exceptionJustification: '',
        outOfSequenceJustification: '',
      }),
    ).toContain('justificativa')
    expect(
      validateTimeEntryForm({
        candidate: baseCandidate({ isOutOfSequence: true }),
        exceptionJustification: '',
        outOfSequenceJustification: '',
      }),
    ).toContain('sequência')
    expect(
      validateTimeEntryForm({
        candidate: baseCandidate(),
        exceptionJustification: '',
        outOfSequenceJustification: '',
      }),
    ).toBeNull()
  })

  it('validateCompleteOutOfSequenceJustification', () => {
    expect(
      validateCompleteOutOfSequenceJustification(baseCandidate(), ''),
    ).toBeNull()
    expect(
      validateCompleteOutOfSequenceJustification(
        baseCandidate({ isOutOfSequence: true }),
        '',
      ),
    ).toContain('justificativa')
    expect(candidateNeedsOutOfSequenceJustification(baseCandidate({ isOutOfSequence: true }))).toBe(
      true,
    )
  })
})
