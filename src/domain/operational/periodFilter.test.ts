import { describe, expect, it } from 'vitest'
import {
  describePeriodRange,
  isIsoDateInPeriod,
  isPeriodRangeActive,
  OPEN_PERIOD_START_ISO,
  PERIOD_RANGE_INVALID_MESSAGE,
  resolveOpenPeriodBounds,
  validatePeriodRange,
} from './periodFilter'

describe('periodFilter', () => {
  it('ativo quando qualquer ponta é informada', () => {
    expect(isPeriodRangeActive({ from: '', to: '' })).toBe(false)
    expect(isPeriodRangeActive({ from: '2026-10-01', to: '' })).toBe(true)
    expect(isPeriodRangeActive({ from: '', to: '2026-10-07' })).toBe(true)
  })

  it('valida início <= fim', () => {
    expect(validatePeriodRange({ from: '2026-10-01', to: '2026-10-07' })).toBeNull()
    expect(validatePeriodRange({ from: '2026-10-07', to: '2026-10-07' })).toBeNull()
    expect(validatePeriodRange({ from: '2026-10-08', to: '2026-10-07' })).toBe(
      PERIOD_RANGE_INVALID_MESSAGE,
    )
    expect(validatePeriodRange({ from: '2026-10-08', to: '' })).toBeNull()
  })

  it('descreve o período em pt-BR', () => {
    expect(describePeriodRange({ from: '2026-10-01', to: '2026-10-07' })).toBe(
      'de 01/10/2026 a 07/10/2026',
    )
    expect(describePeriodRange({ from: '2026-10-07', to: '2026-10-07' })).toBe('em 07/10/2026')
    expect(describePeriodRange({ from: '2026-10-01', to: '' })).toBe('a partir de 01/10/2026')
    expect(describePeriodRange({ from: '', to: '2026-10-07' })).toBe('até 07/10/2026')
  })

  it('intervalo inclusivo com pontas abertas', () => {
    const r = { from: '2026-10-01', to: '2026-10-07' }
    expect(isIsoDateInPeriod('2026-10-01', r)).toBe(true)
    expect(isIsoDateInPeriod('2026-10-07', r)).toBe(true)
    expect(isIsoDateInPeriod('2026-09-30', r)).toBe(false)
    expect(isIsoDateInPeriod('2026-10-08', r)).toBe(false)
    expect(isIsoDateInPeriod('2020-01-01', { from: '', to: '2026-10-07' })).toBe(true)
  })

  it('completa pontas abertas: fim = hoje (SP), início = primeiro registro', () => {
    const now = new Date('2026-10-08T02:00:00.000Z') // 07/10 23h em São Paulo
    expect(resolveOpenPeriodBounds({ from: '', to: '' }, now)).toBeNull()
    expect(resolveOpenPeriodBounds({ from: '2026-10-01', to: '' }, now)).toEqual({
      from: '2026-10-01',
      to: '2026-10-07',
    })
    expect(resolveOpenPeriodBounds({ from: '', to: '2026-09-30' }, now)).toEqual({
      from: OPEN_PERIOD_START_ISO,
      to: '2026-09-30',
    })
  })
})
