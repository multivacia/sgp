import { describe, expect, it } from 'vitest'
import { pickEffectiveContextualJustification } from '../shared/timeEntryJustificationResolver.js'

describe('pickEffectiveContextualJustification', () => {
  it('usa justificativa específica quando presente (precedência)', () => {
    expect(
      pickEffectiveContextualJustification({
        specificJustificationId: '11111111-1111-1111-1111-111111111111',
        specificJustificationComplement: 'comp-especifica',
        voluntaryJustificationId: '22222222-2222-2222-2222-222222222222',
        voluntaryJustificationComplement: 'comp-generica',
      }),
    ).toEqual({
      justificationId: '11111111-1111-1111-1111-111111111111',
      justificationComplement: 'comp-especifica',
      legacyText: null,
    })
  })

  it('não mistura complemento genérico com ID específico', () => {
    expect(
      pickEffectiveContextualJustification({
        specificJustificationId: '11111111-1111-1111-1111-111111111111',
        specificJustificationComplement: null,
        voluntaryJustificationId: '22222222-2222-2222-2222-222222222222',
        voluntaryJustificationComplement: 'comp-generica',
      }),
    ).toEqual({
      justificationId: '11111111-1111-1111-1111-111111111111',
      justificationComplement: null,
      legacyText: null,
    })
  })

  it('usa justificationId genérico (voluntário) como fallback de exceção/OOS', () => {
    expect(
      pickEffectiveContextualJustification({
        specificJustificationId: null,
        voluntaryJustificationId: '22222222-2222-2222-2222-222222222222',
        voluntaryJustificationComplement: 'detalhe',
      }),
    ).toEqual({
      justificationId: '22222222-2222-2222-2222-222222222222',
      justificationComplement: 'detalhe',
      legacyText: null,
    })
  })

  it('preserva texto legado específico mesmo com fallback de id voluntário', () => {
    expect(
      pickEffectiveContextualJustification({
        specificLegacyText: 'texto legado',
        voluntaryJustificationId: '22222222-2222-2222-2222-222222222222',
        voluntaryJustificationComplement: 'x',
      }),
    ).toEqual({
      justificationId: '22222222-2222-2222-2222-222222222222',
      justificationComplement: 'x',
      legacyText: 'texto legado',
    })
  })

  it('sem específica nem genérica devolve apenas legado específico', () => {
    expect(
      pickEffectiveContextualJustification({
        specificLegacyText: 'somente texto',
      }),
    ).toEqual({
      justificationId: null,
      justificationComplement: null,
      legacyText: 'somente texto',
    })
  })

  it('sem qualquer input devolve nulls', () => {
    expect(pickEffectiveContextualJustification({})).toEqual({
      justificationId: null,
      justificationComplement: null,
      legacyText: null,
    })
  })

  it('mesmo justificationId genérico atende exceção e fora de sequência', () => {
    const voluntary = {
      voluntaryJustificationId: '22222222-2222-2222-2222-222222222222',
      voluntaryJustificationComplement: 'único',
    }
    const forOos = pickEffectiveContextualJustification(voluntary)
    const forException = pickEffectiveContextualJustification(voluntary)
    expect(forOos.justificationId).toBe(forException.justificationId)
    expect(forOos.justificationComplement).toBe('único')
  })
})
