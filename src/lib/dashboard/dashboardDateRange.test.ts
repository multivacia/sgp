/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest'
import {
  DASHBOARD_DATE_RANGE_ERRORS,
  DASHBOARD_DATE_RANGE_STORAGE_KEY,
  DASHBOARD_DEFAULT_DATE_RANGE,
  formatDashboardDateRange,
  persistDashboardDateRange,
  readStoredDashboardDateRange,
  validateDashboardDateRange,
} from './dashboardDateRange'

describe('dashboardDateRange', () => {
  afterEach(() => localStorage.clear())

  it('configuração inicial: 01/10/2026 a 20/10/2026 sem preferência salva', () => {
    expect(readStoredDashboardDateRange()).toEqual({ startDate: '2026-10-01', endDate: '2026-10-20' })
    expect(DASHBOARD_DEFAULT_DATE_RANGE).toEqual({ startDate: '2026-10-01', endDate: '2026-10-20' })
  })

  it('não usa as preferências antigas por visão', () => {
    localStorage.setItem('sgp.dashboard.executiveWindowDays', '90')
    localStorage.setItem('sgp.dashboard.operationalRealizedPreset', '7d')
    expect(readStoredDashboardDateRange()).toEqual(DASHBOARD_DEFAULT_DATE_RANGE)
  })

  it('persiste numa única chave e recupera o intervalo válido', () => {
    persistDashboardDateRange({ startDate: '2026-09-01', endDate: '2026-09-30' })
    expect(JSON.parse(localStorage.getItem(DASHBOARD_DATE_RANGE_STORAGE_KEY)!)).toEqual({
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    })
    expect(readStoredDashboardDateRange()).toEqual({ startDate: '2026-09-01', endDate: '2026-09-30' })
  })

  it('valor salvo inválido ou corrompido volta à configuração inicial', () => {
    for (const raw of ['{', '{"startDate":"2026-10-21","endDate":"2026-10-20"}', '{"startDate":"2026-02-30","endDate":"2026-03-01"}', '"x"']) {
      localStorage.setItem(DASHBOARD_DATE_RANGE_STORAGE_KEY, raw)
      expect(readStoredDashboardDateRange()).toEqual(DASHBOARD_DEFAULT_DATE_RANGE)
    }
  })

  it('validações em português', () => {
    expect(validateDashboardDateRange({ startDate: '2026-10-01', endDate: '2026-10-20' })).toBeNull()
    expect(validateDashboardDateRange({ startDate: '2026-10-20', endDate: '2026-10-20' })).toBeNull()
    expect(validateDashboardDateRange({ startDate: '', endDate: '2026-10-20' })).toEqual({
      startDate: DASHBOARD_DATE_RANGE_ERRORS.startRequired,
    })
    expect(validateDashboardDateRange({ startDate: '2026-10-01', endDate: '' })).toEqual({
      endDate: DASHBOARD_DATE_RANGE_ERRORS.endRequired,
    })
    expect(validateDashboardDateRange({ startDate: '2026-02-30', endDate: '2026-03-01' })).toEqual({
      startDate: DASHBOARD_DATE_RANGE_ERRORS.invalid,
    })
    expect(validateDashboardDateRange({ startDate: '2026-10-21', endDate: '2026-10-20' })).toEqual({
      range: DASHBOARD_DATE_RANGE_ERRORS.startAfterEnd,
    })
    expect(DASHBOARD_DATE_RANGE_ERRORS).toEqual({
      startRequired: 'Informe a data inicial.',
      endRequired: 'Informe a data final.',
      invalid: 'Informe uma data válida.',
      startAfterEnd: 'A data inicial não pode ser posterior à data final.',
    })
  })

  it('formata em dd/mm/aaaa', () => {
    expect(formatDashboardDateRange({ startDate: '2026-10-01', endDate: '2026-10-20' })).toBe(
      '01/10/2026 a 20/10/2026',
    )
    expect(formatDashboardDateRange({ startDate: '2026-10-20', endDate: '2026-10-20' })).toBe('20/10/2026')
  })
})
