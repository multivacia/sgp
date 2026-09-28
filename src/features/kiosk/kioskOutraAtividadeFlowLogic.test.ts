import { describe, expect, it } from 'vitest'
import type { TimeEntryCandidateItem } from '../../domain/my-activities/my-activities.types'
import { emptyJustificationValue } from '../shell/quickTimeEntryDrawerLogic'
import {
  buildKioskUnassignedTimeEntryPayload,
  canSubmitKioskOutraAtividadeForm,
  formatCandidateContextLine,
  isValidKioskOutraAtividadeMinutes,
} from './kioskOutraAtividadeFlowLogic'

function candidate(overrides: Partial<TimeEntryCandidateItem> = {}): TimeEntryCandidateItem {
  return {
    conveyorId: 'conv-1',
    conveyorCode: 'OS-1000',
    conveyorName: 'Gol GTI',
    clientName: null,
    vehicleLabel: null,
    plate: null,
    stepNodeId: 'step-1',
    stepName: 'Costurar banco',
    activityTitle: 'Costurar banco',
    taskTitle: 'Estofamento',
    areaName: 'Costura',
    sectorTitle: 'Costura',
    roleInStep: 'primary',
    assignmentType: 'COLLABORATOR',
    plannedMinutes: 60,
    realizedMinutes: 0,
    pendingMinutes: 60,
    isAssignedToMe: true,
    requiresJustification: false,
    isOutOfSequence: false,
    hasPreviousPendingStep: false,
    requiresOutOfSequenceJustification: false,
    previousOpenCount: 0,
    previousOpenActivities: [],
    awaitingPreviousActivities: [],
    ...overrides,
  }
}

/** 28/09/2026 10:00 em São Paulo. */
const NOW = new Date('2026-09-28T13:00:00.000Z')

describe('kioskOutraAtividadeFlowLogic', () => {
  it('formatCandidateContextLine junta esteira, tarefa e setor sem duplicar atividade', () => {
    expect(formatCandidateContextLine(candidate())).toBe('OS-1000 · Estofamento · Costura')
  })

  it('isValidKioskOutraAtividadeMinutes exige inteiro >= 1', () => {
    expect(isValidKioskOutraAtividadeMinutes(1)).toBe(true)
    expect(isValidKioskOutraAtividadeMinutes(0)).toBe(false)
  })

  it('canSubmitKioskOutraAtividadeForm: candidato alocado não exige justificativa', () => {
    const ok = canSubmitKioskOutraAtividadeForm({
      candidate: candidate({ isAssignedToMe: true }),
      minutes: 15,
      operationalJustification: {
        value: emptyJustificationValue(),
        useFallback: false,
        requiresComplement: false,
      },
    })
    expect(ok).toBe(true)
  })

  it('canSubmitKioskOutraAtividadeForm: candidato não alocado exige justificativa de exceção', () => {
    const notAssigned = candidate({ isAssignedToMe: false })
    const withoutJustification = canSubmitKioskOutraAtividadeForm({
      candidate: notAssigned,
      minutes: 15,
      operationalJustification: {
        value: emptyJustificationValue(),
        useFallback: false,
        requiresComplement: false,
      },
    })
    expect(withoutJustification).toBe(false)

    const withJustification = canSubmitKioskOutraAtividadeForm({
      candidate: notAssigned,
      minutes: 15,
      operationalJustification: {
        value: { justificationId: 'j1', justificationComplement: '', legacyText: 'Motivo' },
        useFallback: false,
        requiresComplement: false,
      },
    })
    expect(withJustification).toBe(true)
  })

  it('canSubmitKioskOutraAtividadeForm: uma única justificativa cobre exceção + fora de sequência simultâneas', () => {
    const notAssignedAndOos = candidate({ isAssignedToMe: false, isOutOfSequence: true })
    const withoutJustification = canSubmitKioskOutraAtividadeForm({
      candidate: notAssignedAndOos,
      minutes: 15,
      operationalJustification: {
        value: emptyJustificationValue(),
        useFallback: false,
        requiresComplement: false,
      },
    })
    expect(withoutJustification).toBe(false)

    const withJustification = canSubmitKioskOutraAtividadeForm({
      candidate: notAssignedAndOos,
      minutes: 15,
      operationalJustification: {
        value: { justificationId: 'j1', justificationComplement: '', legacyText: 'Motivo' },
        useFallback: false,
        requiresComplement: false,
      },
    })
    expect(withJustification).toBe(true)
  })

  it('canSubmitKioskOutraAtividadeForm bloqueia data futura', () => {
    const base = {
      candidate: candidate({ isAssignedToMe: true }),
      minutes: 15,
      operationalJustification: {
        value: { justificationId: null, justificationComplement: '', legacyText: '' },
        useFallback: false,
        requiresComplement: false,
      },
    }
    expect(canSubmitKioskOutraAtividadeForm({ ...base, workDate: '2999-01-01' })).toBe(false)
    expect(canSubmitKioskOutraAtividadeForm({ ...base, workDate: '2020-01-01' })).toBe(true)
  })

  it('buildKioskUnassignedTimeEntryPayload com data de hoje envia o instante atual', () => {
    const payload = buildKioskUnassignedTimeEntryPayload({
      candidate: candidate({ isAssignedToMe: true }),
      minutes: 20,
      note: '',
      operationalJustification: { justificationId: null, justificationComplement: '', legacyText: '' },
      workDate: '2026-09-28',
      now: NOW,
    })
    expect(payload.entryAt).toBe(NOW.toISOString())
  })

  it('buildKioskUnassignedTimeEntryPayload inclui exceptionJustificationId só quando exigido', () => {
    const notAssigned = candidate({ isAssignedToMe: false })
    const payload = buildKioskUnassignedTimeEntryPayload({
      candidate: notAssigned,
      minutes: 20,
      note: '',
      operationalJustification: {
        justificationId: 'j1',
        justificationComplement: '',
        legacyText: 'Motivo',
      },
      workDate: '2026-09-27',
      now: NOW,
    })
    expect(payload).toEqual({
      conveyorId: 'conv-1',
      stepNodeId: 'step-1',
      minutes: 20,
      entryAt: '2026-09-27T12:00:00-03:00',
      exceptionJustificationId: 'j1',
      exceptionJustification: 'Motivo',
    })
  })

  it('buildKioskUnassignedTimeEntryPayload não inclui campos de justificativa quando candidato já alocado', () => {
    const assigned = candidate({ isAssignedToMe: true })
    const payload = buildKioskUnassignedTimeEntryPayload({
      candidate: assigned,
      minutes: 20,
      note: 'obs',
      operationalJustification: {
        justificationId: 'j1',
        justificationComplement: '',
        legacyText: 'Motivo',
      },
      workDate: '2026-09-27',
      now: NOW,
    })
    expect(payload).toEqual({
      conveyorId: 'conv-1',
      stepNodeId: 'step-1',
      minutes: 20,
      entryAt: '2026-09-27T12:00:00-03:00',
      note: 'obs',
    })
  })

  it('buildKioskUnassignedTimeEntryPayload distribui a MESMA justificativa pros dois campos quando exceção + fora de sequência coexistem', () => {
    const notAssignedAndOos = candidate({ isAssignedToMe: false, isOutOfSequence: true })
    const payload = buildKioskUnassignedTimeEntryPayload({
      candidate: notAssignedAndOos,
      minutes: 20,
      note: '',
      operationalJustification: {
        justificationId: 'j1',
        justificationComplement: '',
        legacyText: 'Motivo único',
      },
      workDate: '2026-09-27',
      now: NOW,
    })
    expect(payload).toEqual({
      conveyorId: 'conv-1',
      stepNodeId: 'step-1',
      minutes: 20,
      entryAt: '2026-09-27T12:00:00-03:00',
      exceptionJustificationId: 'j1',
      exceptionJustification: 'Motivo único',
      outOfSequenceJustificationId: 'j1',
      outOfSequenceJustification: 'Motivo único',
    })
  })
})
