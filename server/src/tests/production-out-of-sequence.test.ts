import { describe, expect, it } from 'vitest'
import {
  assertProductionOutOfSequenceJustification,
  normalizeProductionOutOfSequenceJustification,
} from '../modules/production/production-out-of-sequence.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import { AppError } from '../shared/errors/AppError.js'

describe('production-out-of-sequence', () => {
  it('normaliza trim', () => {
    expect(normalizeProductionOutOfSequenceJustification('  ok  ')).toBe('ok')
    expect(normalizeProductionOutOfSequenceJustification('   ')).toBeNull()
  })

  it('rejeita vazio', () => {
    expect(() => assertProductionOutOfSequenceJustification('')).toThrow(AppError)
    try {
      assertProductionOutOfSequenceJustification('')
    } catch (e) {
      expect(e).toBeInstanceOf(AppError)
      expect((e as AppError).code).toBe(
        ErrorCodes.TIME_ENTRY_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION,
      )
    }
  })

  it('rejeita curta', () => {
    expect(() => assertProductionOutOfSequenceJustification('ab')).toThrow(AppError)
  })

  it('aceita justificativa válida', () => {
    expect(assertProductionOutOfSequenceJustification('Autorizado pelo gestor.')).toBe(
      'Autorizado pelo gestor.',
    )
  })
})
