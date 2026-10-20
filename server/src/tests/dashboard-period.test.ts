import { describe, expect, it } from 'vitest'
import {
  DASHBOARD_PERIOD_MESSAGES,
  dashboardPeriodDayCount,
  dashboardPeriodMeta,
  resolveDashboardPeriod,
} from '../modules/dashboard/dashboard.period.js'
import { parseEntryAtInput } from '../shared/operationalWorkDate.js'

function expect400(fn: () => unknown, message: string) {
  try {
    fn()
  } catch (e) {
    expect((e as { statusCode?: number }).statusCode).toBe(400)
    expect((e as Error).message).toBe(message)
    return
  }
  throw new Error('esperava 400')
}

describe('resolveDashboardPeriod', () => {
  it('01/10/2026 a 20/10/2026: 00:00 da inicial até o início de 21/10 (SP), exclusivo', () => {
    const p = resolveDashboardPeriod('2026-10-01', '2026-10-20')!
    expect(p.from.toISOString()).toBe('2026-10-01T03:00:00.000Z')
    expect(p.toExclusive.toISOString()).toBe('2026-10-21T03:00:00.000Z')
    expect(dashboardPeriodDayCount(p)).toBe(20)
    expect(dashboardPeriodMeta(p)).toEqual({
      startDate: '2026-10-01',
      endDate: '2026-10-20',
      timezone: 'America/Sao_Paulo',
      from: '2026-10-01T03:00:00.000Z',
      to: '2026-10-21T02:59:59.999Z',
    })
  })

  it('um único dia e virada de ano', () => {
    const one = resolveDashboardPeriod('2026-10-20', '2026-10-20')!
    expect(one.toExclusive.getTime() - one.from.getTime()).toBe(24 * 3600 * 1000)
    const ny = resolveDashboardPeriod('2026-12-31', '2027-01-01')!
    expect(ny.from.toISOString()).toBe('2026-12-31T03:00:00.000Z')
    expect(ny.toExclusive.toISOString()).toBe('2027-01-02T03:00:00.000Z')
    expect(dashboardPeriodDayCount(ny)).toBe(2)
  })

  it('sem datas = chamada legada (null)', () => {
    expect(resolveDashboardPeriod(undefined, undefined)).toBeNull()
    expect(resolveDashboardPeriod('', '  ')).toBeNull()
  })

  it('validações com mensagens em português', () => {
    expect400(() => resolveDashboardPeriod(undefined, '2026-10-20'), DASHBOARD_PERIOD_MESSAGES.startRequired)
    expect400(() => resolveDashboardPeriod('2026-10-01', undefined), DASHBOARD_PERIOD_MESSAGES.endRequired)
    expect400(() => resolveDashboardPeriod('2026-02-30', '2026-03-01'), DASHBOARD_PERIOD_MESSAGES.invalid)
    expect400(() => resolveDashboardPeriod('01/10/2026', '2026-10-20'), DASHBOARD_PERIOD_MESSAGES.invalid)
    expect400(() => resolveDashboardPeriod('2026-10-01', '2026-13-01'), DASHBOARD_PERIOD_MESSAGES.invalid)
    expect400(() => resolveDashboardPeriod('2026-10-21', '2026-10-20'), DASHBOARD_PERIOD_MESSAGES.startAfterEnd)
  })

  it('apontamento retroativo (data pura) cai no dia civil informado', () => {
    const entryAt = parseEntryAtInput('2026-10-20')
    const p = resolveDashboardPeriod('2026-10-20', '2026-10-20')!
    expect(entryAt >= p.from && entryAt < p.toExclusive).toBe(true)
    const next = resolveDashboardPeriod('2026-10-21', '2026-10-21')!
    expect(entryAt >= next.from && entryAt < next.toExclusive).toBe(false)
  })
})
