import { describe, expect, it } from 'vitest'
import {
  buildKioskExtraEsteiraPayload,
  canSubmitKioskExtraEsteiraForm,
  isValidKioskExtraEsteiraMinutes,
  parseKioskMinutes,
} from './kioskExtraEsteiraFlowLogic'

describe('kioskExtraEsteiraFlowLogic', () => {
  it('parseKioskMinutes converte string válida e retorna 0 para inválida', () => {
    expect(parseKioskMinutes('30')).toBe(30)
    expect(parseKioskMinutes('')).toBe(0)
    expect(parseKioskMinutes('abc')).toBe(0)
  })

  it('isValidKioskExtraEsteiraMinutes exige inteiro >= 1', () => {
    expect(isValidKioskExtraEsteiraMinutes(1)).toBe(true)
    expect(isValidKioskExtraEsteiraMinutes(0)).toBe(false)
    expect(isValidKioskExtraEsteiraMinutes(-5)).toBe(false)
  })

  it('canSubmitKioskExtraEsteiraForm exige descrição selecionada e minutos válidos', () => {
    expect(canSubmitKioskExtraEsteiraForm({ descriptionId: '', minutes: 15 })).toBe(false)
    expect(canSubmitKioskExtraEsteiraForm({ descriptionId: 'd1', minutes: 0 })).toBe(false)
    expect(canSubmitKioskExtraEsteiraForm({ descriptionId: 'd1', minutes: 15 })).toBe(true)
  })

  it('buildKioskExtraEsteiraPayload omite notes vazio e inclui notes preenchido', () => {
    expect(
      buildKioskExtraEsteiraPayload({ descriptionId: 'd1', minutes: 15, notes: '  ' }),
    ).toEqual({ descriptionId: 'd1', minutes: 15 })
    expect(
      buildKioskExtraEsteiraPayload({ descriptionId: 'd1', minutes: 15, notes: ' obs ' }),
    ).toEqual({ descriptionId: 'd1', minutes: 15, notes: 'obs' })
  })
})
