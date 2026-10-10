import { describe, expect, it } from 'vitest'
import type { TimeEntryCandidateItem } from '../../domain/my-activities/my-activities.types'
import {
  buildTimeEntryPayload,
  canShowCompleteActivityButton,
  canShowSaveAndCompleteButton,
  canSubmitExtraTimeEntry,
  candidateNeedsOutOfSequenceJustification,
  candidateRequiresOperationalJustification,
  candidateRequiresExcessJustification,
  emptyJustificationValue,
  EXTRA_TIME_ENTRY_DESCRIPTION_PLACEHOLDER,
  resolveExtraDescriptionSelectionAfterLoad,
  resolveTimeEntrySuccessToast,
  validateCompleteOutOfSequenceJustification,
  validateTimeEntryForm,
} from './quickTimeEntryDrawerLogic'

/** 28/09/2026 10:00 em São Paulo (13:00 UTC). */
const NOW = new Date('2026-09-28T13:00:00.000Z')
const TODAY_SP = '2026-09-28'

function jv(legacyText: string, id: string | null = null) {
  return {
    justificationId: id,
    justificationComplement: '',
    legacyText,
  }
}

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
    hasPreviousPendingStep: false,
    requiresOutOfSequenceJustification: false,
    previousOpenCount: 0,
    previousOpenActivities: [],
    awaitingPreviousActivities: [],
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
      operationalJustification: emptyJustificationValue(),
      markAsDone: true,
      workDate: TODAY_SP,
      now: NOW,
    })
    expect(payload.markAsDone).toBe(true)
    expect(payload.minutes).toBe(15)
  })

  it('buildTimeEntryPayload normal envia justificativa voluntária quando selecionada', () => {
    const payload = buildTimeEntryPayload({
      candidate: baseCandidate(),
      minutes: 15,
      executedQuantity: 1,
      description: 'observação livre',
      operationalJustification: jv('Repriorização autorizada', '33333333-3333-3333-3333-333333333333'),
      markAsDone: false,
      workDate: TODAY_SP,
      now: NOW,
    })
    expect(payload.justificationId).toBe('33333333-3333-3333-3333-333333333333')
    expect(payload.description).toBe('observação livre')
    expect(payload.outOfSequenceJustification).toBeUndefined()
    expect(payload.exceptionJustificationId).toBeUndefined()
  })

  it('cenário defeito: FE classifica opcional e envia só justificationId (backend deve aceitar no contexto real)', () => {
    const candidate = baseCandidate({
      isAssignedToMe: true,
      requiresJustification: false,
      isOutOfSequence: false,
      requiresOutOfSequenceJustification: false,
    })
    expect(candidateRequiresOperationalJustification(candidate)).toBe(false)
    const payload = buildTimeEntryPayload({
      candidate,
      minutes: 20,
      executedQuantity: 1,
      description: '',
      operationalJustification: jv('Atividade emergencial', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
      markAsDone: false,
      workDate: TODAY_SP,
      now: NOW,
    })
    expect(payload.justificationId).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    expect(payload.exceptionJustificationId).toBeUndefined()
    expect(payload.outOfSequenceJustificationId).toBeUndefined()
  })

  it('buildTimeEntryPayload normal sem seleção não envia justificativa', () => {
    const payload = buildTimeEntryPayload({
      candidate: baseCandidate(),
      minutes: 15,
      executedQuantity: 1,
      description: '',
      operationalJustification: emptyJustificationValue(),
      markAsDone: false,
      workDate: TODAY_SP,
      now: NOW,
    })
    expect(payload.justificationId).toBeUndefined()
    expect(payload.exceptionJustification).toBeUndefined()
  })

  it('buildTimeEntryPayload fora de sequência inclui justificativa', () => {
    const payload = buildTimeEntryPayload({
      candidate: baseCandidate({ isOutOfSequence: true, requiresOutOfSequenceJustification: true }),
      minutes: 10,
      executedQuantity: 0,
      description: '',
      operationalJustification: jv('urgente'),
      markAsDone: true,
      workDate: TODAY_SP,
      now: NOW,
    })
    expect(payload.outOfSequenceJustification).toBe('urgente')
    expect(payload.markAsDone).toBe(true)
  })

  it('buildTimeEntryPayload com data de hoje envia o instante atual (comportamento anterior)', () => {
    const payload = buildTimeEntryPayload({
      candidate: baseCandidate(),
      minutes: 15,
      executedQuantity: 1,
      description: '',
      operationalJustification: emptyJustificationValue(),
      markAsDone: false,
      workDate: TODAY_SP,
      now: NOW,
    })
    expect(payload.entryAt).toBe(NOW.toISOString())
  })

  it('buildTimeEntryPayload com data de ontem envia meio-dia de São Paulo com offset explícito', () => {
    const payload = buildTimeEntryPayload({
      candidate: baseCandidate(),
      minutes: 15,
      executedQuantity: 1,
      description: '',
      operationalJustification: emptyJustificationValue(),
      markAsDone: true,
      workDate: '2026-09-27',
      now: NOW,
    })
    expect(payload.entryAt).toBe('2026-09-27T12:00:00-03:00')
    expect(payload.markAsDone).toBe(true)
  })

  it('resolveTimeEntrySuccessToast', () => {
    expect(resolveTimeEntrySuccessToast(false)).toContain('Apontamento')
    expect(resolveTimeEntrySuccessToast(true)).toContain('concluída')
  })

  it('buildTimeEntryPayload com id padronizado inclui campos estruturados', () => {
    const payload = buildTimeEntryPayload({
      candidate: baseCandidate({ isOutOfSequence: true }),
      minutes: 10,
      executedQuantity: 0,
      description: '',
      operationalJustification: jv('Sequência liberada', '22222222-2222-2222-2222-222222222222'),
      markAsDone: false,
      workDate: TODAY_SP,
      now: NOW,
    })
    expect(payload.outOfSequenceJustificationId).toBe('22222222-2222-2222-2222-222222222222')
    expect(payload.outOfSequenceJustification).toBe('Sequência liberada')
  })

  it('validateTimeEntryForm exige justificativas em exceção', () => {
    expect(
      validateTimeEntryForm({
        candidate: baseCandidate({ requiresJustification: true, isAssignedToMe: false }),
        operationalJustification: emptyJustificationValue(),
        useFallback: false,
        requiresComplement: false,
      }),
    ).toContain('justificativa')
    expect(
      validateTimeEntryForm({
        candidate: baseCandidate({ isOutOfSequence: true }),
        operationalJustification: emptyJustificationValue(),
        useFallback: false,
        requiresComplement: false,
      }),
    ).toContain('justificativa')
    expect(
      validateTimeEntryForm({
        candidate: baseCandidate(),
        operationalJustification: emptyJustificationValue(),
        useFallback: false,
        requiresComplement: false,
      }),
    ).toBeNull()
    expect(candidateRequiresOperationalJustification(baseCandidate())).toBe(false)
  })

  it('validateCompleteOutOfSequenceJustification', () => {
    expect(
      validateCompleteOutOfSequenceJustification(baseCandidate(), emptyJustificationValue()),
    ).toBeNull()
    expect(
      validateCompleteOutOfSequenceJustification(
        baseCandidate({ isOutOfSequence: true }),
        emptyJustificationValue(),
      ),
    ).toContain('justificativa')
    expect(candidateNeedsOutOfSequenceJustification(baseCandidate({ isOutOfSequence: true }))).toBe(
      true,
    )
    expect(
      candidateNeedsOutOfSequenceJustification(
        baseCandidate({
          isOutOfSequence: false,
          awaitingPreviousActivities: [{ activityTitle: 'Funilaria', sectorTitle: 'S', taskTitle: 'T' }],
        }),
      ),
    ).toBe(false)
  })

  describe('apontamento extra — seleção de motivo sem pré-seleção', () => {
    const rows = [
      { id: 'desc-1', description: 'Reunião diária' },
      { id: 'desc-2', description: 'Treinamento' },
    ]

    it('lista carregada sem escolha anterior permanece vazia', () => {
      expect(resolveExtraDescriptionSelectionAfterLoad('', rows)).toBe('')
    })

    it('não escolhe automaticamente o primeiro motivo', () => {
      expect(resolveExtraDescriptionSelectionAfterLoad('', rows)).not.toBe(rows[0].id)
    })

    it('mantém escolha anterior válida após recarregar', () => {
      expect(resolveExtraDescriptionSelectionAfterLoad('desc-2', rows)).toBe('desc-2')
    })

    it('descarta escolha anterior removida da lista', () => {
      expect(resolveExtraDescriptionSelectionAfterLoad('desc-gone', rows)).toBe('')
    })

    it('lista vazia resulta em seleção vazia', () => {
      expect(resolveExtraDescriptionSelectionAfterLoad('desc-1', [])).toBe('')
      expect(resolveExtraDescriptionSelectionAfterLoad('', [])).toBe('')
    })

    it('sem motivo selecionado não permite envio', () => {
      expect(
        canSubmitExtraTimeEntry({
          descriptionId: '',
          minutesValid: true,
        }),
      ).toBe(false)
    })

    it('com motivo e minutos válidos permite envio', () => {
      expect(
        canSubmitExtraTimeEntry({
          descriptionId: 'desc-1',
          minutesValid: true,
        }),
      ).toBe(true)
    })

    it('data futura ou vazia bloqueia envio do extra esteira', () => {
      expect(
        canSubmitExtraTimeEntry({
          descriptionId: 'desc-1',
          minutesValid: true,
          entryDate: '2999-01-01',
        }),
      ).toBe(false)
      expect(
        canSubmitExtraTimeEntry({
          descriptionId: 'desc-1',
          minutesValid: true,
          entryDate: '',
        }),
      ).toBe(false)
      expect(
        canSubmitExtraTimeEntry({
          descriptionId: 'desc-1',
          minutesValid: true,
          entryDate: '2020-01-15',
        }),
      ).toBe(true)
    })

    it('após salvar a seleção deve ser limpa (estado vazio)', () => {
      const afterSave = resolveExtraDescriptionSelectionAfterLoad('', rows)
      expect(afterSave).toBe('')
      expect(EXTRA_TIME_ENTRY_DESCRIPTION_PLACEHOLDER).toBe('Selecione um motivo...')
    })

    it('ao reabrir, placeholder é o estado inicial vazio', () => {
      const reopened = resolveExtraDescriptionSelectionAfterLoad('', rows)
      expect(reopened).toBe('')
      expect(EXTRA_TIME_ENTRY_DESCRIPTION_PLACEHOLDER).toBe('Selecione um motivo...')
    })
  })
})

describe('excesso de tempo previsto (apontamento-somente-planejado)', () => {
  const mine = (o: Partial<TimeEntryCandidateItem> = {}) =>
    baseCandidate({
      isAssignedToMe: true,
      requiresJustification: false,
      requiresOutOfSequenceJustification: false,
      isOutOfSequence: false,
      hasPreviousPendingStep: false,
      plannedMinutes: 60,
      plannedTotalMinutes: 60,
      realizedMinutes: 30,
      ...o,
    })

  it('atividade do colaborador acima do previsto dele exige justificativa', () => {
    expect(candidateRequiresExcessJustification(mine(), 31)).toBe(true)
    expect(candidateRequiresExcessJustification(mine(), 30)).toBe(false)
  })

  it('atividade de outro colaborador não pede justificativa de excesso', () => {
    expect(
      candidateRequiresExcessJustification(mine({ isAssignedToMe: false, requiresJustification: true }), 500),
    ).toBe(false)
  })

  it('sem previsto não exige', () => {
    expect(
      candidateRequiresExcessJustification(mine({ plannedMinutes: null, plannedTotalMinutes: undefined }), 500),
    ).toBe(false)
  })

  it('validateTimeEntryForm exige a justificativa quando passa do previsto', () => {
    const error = validateTimeEntryForm({
      candidate: mine(),
      operationalJustification: emptyJustificationValue(),
      useFallback: false,
      requiresComplement: false,
      minutes: 45,
    })
    expect(error).not.toBeNull()
    expect(
      validateTimeEntryForm({
        candidate: mine(),
        operationalJustification: emptyJustificationValue(),
        useFallback: false,
        requiresComplement: false,
        minutes: 10,
      }),
    ).toBeNull()
  })
})
