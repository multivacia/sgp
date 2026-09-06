import { describe, expect, it } from 'vitest'
import type { TimeEntryCandidateItem } from '../../domain/my-activities/my-activities.types'
import { emptyJustificationValue } from '../shell/quickTimeEntryDrawerLogic'
import {
  filterKioskOtherActivityCandidates,
  isValidKioskOtherActivitySearchTerm,
  KIOSK_OTHER_ACTIVITY_TOAST,
  kioskOtherActivityCandidateCode,
  validateKioskOtherActivityForm,
} from './kioskOutraAtividadeFlowLogic'

function baseCandidate(
  overrides: Partial<TimeEntryCandidateItem> = {},
): TimeEntryCandidateItem {
  return {
    conveyorId: 'cv-1',
    conveyorCode: 'OS-100',
    conveyorName: 'Esteira 100',
    clientName: null,
    vehicleLabel: null,
    plate: null,
    stepNodeId: 'step-1',
    stepName: 'Costura',
    activityTitle: 'Costura',
    areaName: 'Costura',
    sectorTitle: 'Costura',
    roleInStep: 'primary',
    assignmentType: 'COLLABORATOR',
    plannedMinutes: 30,
    realizedMinutes: 0,
    pendingMinutes: 30,
    isAssignedToMe: false,
    requiresJustification: true,
    isOutOfSequence: false,
    hasPreviousPendingStep: false,
    requiresOutOfSequenceJustification: false,
    previousOpenCount: 0,
    previousOpenActivities: [],
    awaitingPreviousActivities: [],
    ...overrides,
  }
}

describe('KIOSK_OTHER_ACTIVITY_TOAST', () => {
  it('possui texto próprio, distinto do "+Extra"', () => {
    expect(KIOSK_OTHER_ACTIVITY_TOAST.entrySaved).toBe(
      'Apontamento em outra atividade registrado com sucesso.',
    )
  })
})

describe('kioskOtherActivityCandidateCode', () => {
  it('retorna o código da esteira quando presente', () => {
    expect(kioskOtherActivityCandidateCode(baseCandidate({ conveyorCode: 'OS-42' }))).toBe(
      'OS-42',
    )
  })

  it('retorna "Sem código" quando ausente ou vazio', () => {
    expect(kioskOtherActivityCandidateCode(baseCandidate({ conveyorCode: null }))).toBe(
      'Sem código',
    )
    expect(kioskOtherActivityCandidateCode(baseCandidate({ conveyorCode: '   ' }))).toBe(
      'Sem código',
    )
  })
})

describe('isValidKioskOtherActivitySearchTerm', () => {
  it('rejeita menos de 2 caracteres', () => {
    expect(isValidKioskOtherActivitySearchTerm('')).toBe(false)
    expect(isValidKioskOtherActivitySearchTerm('a')).toBe(false)
    expect(isValidKioskOtherActivitySearchTerm(' a ')).toBe(false)
  })

  it('aceita 2 ou mais caracteres (ignorando espaços)', () => {
    expect(isValidKioskOtherActivitySearchTerm('ab')).toBe(true)
    expect(isValidKioskOtherActivitySearchTerm('  ab  ')).toBe(true)
  })
})

describe('filterKioskOtherActivityCandidates', () => {
  it('mantém apenas candidatos fora da alocação atual (isAssignedToMe === false)', () => {
    const items = [
      baseCandidate({ stepNodeId: 'a', isAssignedToMe: false }),
      baseCandidate({ stepNodeId: 'b', isAssignedToMe: true }),
      baseCandidate({ stepNodeId: 'c', isAssignedToMe: false }),
    ]
    const result = filterKioskOtherActivityCandidates(items)
    expect(result.map((r) => r.stepNodeId)).toEqual(['a', 'c'])
  })
})

describe('validateKioskOtherActivityForm', () => {
  const validJustification = { ...emptyJustificationValue(), legacyText: 'Cobrindo colega.' }

  it('exige atividade selecionada', () => {
    expect(
      validateKioskOtherActivityForm({
        selected: null,
        minutes: 30,
        justification: validJustification,
        useFallback: true,
        requiresComplement: false,
      }),
    ).toBe('Selecione uma atividade.')
  })

  it('exige minutos válidos (> 0)', () => {
    expect(
      validateKioskOtherActivityForm({
        selected: baseCandidate(),
        minutes: 0,
        justification: validJustification,
        useFallback: true,
        requiresComplement: false,
      }),
    ).toBe('Informe minutos válidos (maior que zero).')
  })

  it('exige justificativa (nem catálogo nem texto livre informados)', () => {
    expect(
      validateKioskOtherActivityForm({
        selected: baseCandidate(),
        minutes: 30,
        justification: emptyJustificationValue(),
        useFallback: false,
        requiresComplement: false,
      }),
    ).toBeTruthy()
  })

  it('aceita quando tudo é válido', () => {
    expect(
      validateKioskOtherActivityForm({
        selected: baseCandidate(),
        minutes: 30,
        justification: validJustification,
        useFallback: true,
        requiresComplement: false,
      }),
    ).toBeNull()
  })
})
