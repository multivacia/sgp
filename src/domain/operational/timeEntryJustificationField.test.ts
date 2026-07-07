import { describe, expect, it } from 'vitest'
import type { TimeEntryJustificationOption } from '../operational-settings/timeEntryJustifications.types'
import {
  OPERATIONAL_JUSTIFICATION_MESSAGES,
  pickPreferredJustificationId,
  resolvePreferredJustificationCategory,
  validateJustificationFieldValue,
} from './timeEntryJustificationField'
import { emptyJustificationFieldValue } from './timeEntryJustificationField'

const OPTIONS: TimeEntryJustificationOption[] = [
  {
    id: 'sub-1',
    label: 'Substituição por ausência',
    description: null,
    category: 'SUBSTITUTION',
    requiresComplement: false,
    sortOrder: 10,
  },
  {
    id: 'seq-1',
    label: 'Atividade anterior pendente de outro colaborador',
    description: null,
    category: 'SEQUENCE',
    requiresComplement: false,
    sortOrder: 30,
  },
  {
    id: 'other-1',
    label: 'Outro motivo autorizado',
    description: null,
    category: 'OTHER',
    requiresComplement: true,
    sortOrder: 90,
  },
]

describe('timeEntryJustificationField', () => {
  it('resolve categoria SEQUENCE para pendência anterior', () => {
    expect(
      resolvePreferredJustificationCategory({ hasPreviousPendingStep: true }),
    ).toBe('SEQUENCE')
  })

  it('resolve categoria SUBSTITUTION para exceção de alocação', () => {
    expect(
      resolvePreferredJustificationCategory({ requiresAllocationException: true }),
    ).toBe('SUBSTITUTION')
  })

  it('pré-seleciona justificativa da categoria SEQUENCE', () => {
    expect(
      pickPreferredJustificationId(OPTIONS, 'SEQUENCE', 'outro colaborador'),
    ).toBe('seq-1')
  })

  it('não pré-seleciona sem categoria preferida', () => {
    expect(pickPreferredJustificationId(OPTIONS, null)).toBeNull()
  })

  it('exige seleção quando catálogo está ativo', () => {
    expect(
      validateJustificationFieldValue({
        value: emptyJustificationFieldValue(),
        useFallback: false,
        requiresComplement: false,
      }),
    ).toBe(OPERATIONAL_JUSTIFICATION_MESSAGES.missingSelection)
  })

  it('exige complemento quando configurado', () => {
    expect(
      validateJustificationFieldValue({
        value: {
          justificationId: 'other-1',
          justificationComplement: '',
          legacyText: 'Outro motivo autorizado',
        },
        useFallback: false,
        requiresComplement: true,
      }),
    ).toBe(OPERATIONAL_JUSTIFICATION_MESSAGES.missingComplement)
  })

  it('aceita complemento vazio quando não é obrigatório', () => {
    expect(
      validateJustificationFieldValue({
        value: {
          justificationId: 'seq-1',
          justificationComplement: '',
          legacyText: 'Atividade anterior pendente de outro colaborador',
        },
        useFallback: false,
        requiresComplement: false,
      }),
    ).toBeNull()
  })
})
