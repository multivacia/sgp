import { describe, expect, it } from 'vitest'
import { resolveOperationalPeriod } from '../shared/operationalPeriod.js'
import {
  operationalDayEnd,
  operationalDayStart,
  operationalMonthStart,
} from '../shared/operationalWorkDate.js'

const DAY = 24 * 60 * 60 * 1000

describe('resolveOperationalPeriod — America/Sao_Paulo', () => {
  it('month: começa 00:00 de SP do dia 1 (não 00:00 UTC)', () => {
    const now = new Date('2026-09-15T15:00:00.000Z')
    const r = resolveOperationalPeriod({ preset: 'month', now })
    expect(r.from.toISOString()).toBe('2026-09-01T03:00:00.000Z')
    expect(r.to).toBe(now)
  })

  it('month: virada de mês considera SP mesmo quando UTC já está no mês seguinte', () => {
    // 31/08 23:30 em SP = 01/09 02:30 UTC → ainda é agosto em SP.
    const lateAug = new Date('2026-09-01T02:30:00.000Z')
    expect(resolveOperationalPeriod({ preset: 'month', now: lateAug }).from.toISOString()).toBe(
      '2026-08-01T03:00:00.000Z',
    )
    // 01/09 00:10 em SP = 01/09 03:10 UTC → setembro em SP.
    const earlySep = new Date('2026-09-01T03:10:00.000Z')
    expect(resolveOperationalPeriod({ preset: 'month', now: earlySep }).from.toISOString()).toBe(
      '2026-09-01T03:00:00.000Z',
    )
    // Virada de ano.
    const newYearUtc = new Date('2027-01-01T01:00:00.000Z')
    expect(resolveOperationalPeriod({ preset: 'month', now: newYearUtc }).from.toISOString()).toBe(
      '2026-12-01T03:00:00.000Z',
    )
  })

  it('7d / 15d / 30d preservam a janela móvel de N×24h terminando em now', () => {
    const now = new Date('2026-09-01T02:30:00.000Z')
    for (const [preset, days] of [['7d', 7], ['15d', 15], ['30d', 30]] as const) {
      const r = resolveOperationalPeriod({ preset, now })
      expect(r.to).toBe(now)
      expect(r.to.getTime() - r.from.getTime()).toBe(days * DAY)
    }
  })

  it('custom devolve os limites recebidos sem alteração', () => {
    const customFrom = new Date('2026-08-31T03:00:00.000Z')
    const customTo = new Date('2026-09-01T02:59:59.999Z')
    const r = resolveOperationalPeriod({ preset: 'custom', customFrom, customTo })
    expect(r.from).toBe(customFrom)
    expect(r.to).toBe(customTo)
  })

  it('limites do dia civil de SP', () => {
    expect(operationalDayStart('2026-09-01').toISOString()).toBe('2026-09-01T03:00:00.000Z')
    expect(operationalDayEnd('2026-08-31').toISOString()).toBe('2026-09-01T02:59:59.999Z')
    expect(operationalMonthStart(new Date('2026-03-01T02:59:00.000Z')).toISOString()).toBe(
      '2026-02-01T03:00:00.000Z',
    )
  })
})
