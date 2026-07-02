import { describe, expect, it } from 'vitest'
import {
  JUSTIFICATION_SELECT_MESSAGES,
  validateJustificationSelectValue,
} from './JustificationSelect'

describe('JustificationSelect validation', () => {
  it('exige seleção quando não está em fallback', () => {
    expect(
      validateJustificationSelectValue({
        useFallback: false,
        justificationId: null,
        legacyText: '',
        requiresComplement: false,
        complement: '',
      }),
    ).toBe(JUSTIFICATION_SELECT_MESSAGES.missingSelection)
  })

  it('exige complemento quando configurado', () => {
    expect(
      validateJustificationSelectValue({
        useFallback: false,
        justificationId: '11111111-1111-1111-1111-111111111111',
        legacyText: 'Outro',
        requiresComplement: true,
        complement: '',
      }),
    ).toBe(JUSTIFICATION_SELECT_MESSAGES.missingComplement)
  })

  it('aceita texto livre em fallback', () => {
    expect(
      validateJustificationSelectValue({
        useFallback: true,
        justificationId: null,
        legacyText: 'Motivo manual',
        requiresComplement: false,
        complement: '',
      }),
    ).toBeNull()
  })
})
