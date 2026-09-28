import { describe, expect, it } from 'vitest'
import {
  isFutureOperationalDate,
  operationalDateOf,
  operationalToday,
  parseEntryAtInput,
  resolveExtraEntryDate,
  resolveTimeEntryEntryAt,
} from '../shared/operationalWorkDate.js'
import { AppError } from '../shared/errors/AppError.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import { createExtraTimeEntryBodySchema } from '../modules/my-activities/extra-time-entries.schemas.js'
import { createProductionExtraTimeEntryBodySchema } from '../modules/production/production-extra-time-entries.schemas.js'
import {
  productionTimeEntryBodySchema,
  productionUnassignedTimeEntryBodySchema,
} from '../modules/production/production-time-entries.schemas.js'

/** 28/09/2026 10:00 em São Paulo. */
const NOW = new Date('2026-09-28T13:00:00.000Z')
/** 28/09/2026 23:30 em São Paulo — em UTC já é 29/09. */
const NOW_LATE_SP = new Date('2026-09-29T02:30:00.000Z')

function expectFutureError(fn: () => unknown) {
  try {
    fn()
  } catch (e) {
    expect(e).toBeInstanceOf(AppError)
    expect((e as AppError).statusCode).toBe(422)
    expect((e as AppError).code).toBe(ErrorCodes.TIME_ENTRY_FUTURE_DATE)
    return
  }
  throw new Error('esperava erro TIME_ENTRY_FUTURE_DATE')
}

describe('operationalWorkDate — dia civil em São Paulo', () => {
  it('operationalToday usa São Paulo e não UTC na virada do dia', () => {
    expect(operationalToday(NOW)).toBe('2026-09-28')
    expect(NOW_LATE_SP.toISOString().slice(0, 10)).toBe('2026-09-29')
    expect(operationalToday(NOW_LATE_SP)).toBe('2026-09-28')
    expect(operationalDateOf(new Date('2026-09-29T03:00:00.000Z'))).toBe('2026-09-29')
    expect(operationalDateOf(new Date('2026-09-29T02:59:59.999Z'))).toBe('2026-09-28')
  })

  it('parseEntryAtInput: data pura vira meio-dia de SP (não meia-noite UTC)', () => {
    const d = parseEntryAtInput('2026-09-27')
    expect(d.toISOString()).toBe('2026-09-27T15:00:00.000Z')
    expect(operationalDateOf(d)).toBe('2026-09-27')
  })

  it('parseEntryAtInput: ISO com offset explícito preserva o dia escolhido', () => {
    expect(operationalDateOf(parseEntryAtInput('2026-09-27T12:00:00-03:00'))).toBe('2026-09-27')
    expect(operationalDateOf(parseEntryAtInput('2026-09-27T23:59:00-03:00'))).toBe('2026-09-27')
    expect(operationalDateOf(parseEntryAtInput('2026-09-27T00:00:00-03:00'))).toBe('2026-09-27')
  })

  it('parseEntryAtInput rejeita data inexistente', () => {
    expect(() => parseEntryAtInput('2026-02-30')).toThrow(AppError)
    expect(() => parseEntryAtInput('abc')).toThrow(AppError)
  })

  it('resolveTimeEntryEntryAt: sem data → agora (comportamento atual)', () => {
    expect(resolveTimeEntryEntryAt(undefined, NOW)).toBe(NOW)
  })

  it('resolveTimeEntryEntryAt: ontem é preservado', () => {
    const yesterday = parseEntryAtInput('2026-09-27T12:00:00-03:00')
    const r = resolveTimeEntryEntryAt(yesterday, NOW)
    expect(r.toISOString()).toBe('2026-09-27T15:00:00.000Z')
    expect(operationalDateOf(r)).toBe('2026-09-27')
  })

  it('resolveTimeEntryEntryAt: sem limite retroativo', () => {
    const old = parseEntryAtInput('2019-01-02')
    expect(operationalDateOf(resolveTimeEntryEntryAt(old, NOW))).toBe('2019-01-02')
  })

  it('resolveTimeEntryEntryAt: amanhã (SP) → 422 TIME_ENTRY_FUTURE_DATE', () => {
    expectFutureError(() =>
      resolveTimeEntryEntryAt(parseEntryAtInput('2026-09-29T12:00:00-03:00'), NOW),
    )
    expectFutureError(() => resolveTimeEntryEntryAt(parseEntryAtInput('2026-09-29'), NOW))
  })

  it('resolveTimeEntryEntryAt: hoje em hora futura é limitado a agora (mesmo dia)', () => {
    const laterToday = parseEntryAtInput('2026-09-28T18:00:00-03:00')
    expect(resolveTimeEntryEntryAt(laterToday, NOW)).toBe(NOW)
  })

  it('resolveTimeEntryEntryAt: às 23:30 de SP, "hoje" não é tratado como futuro nem vira o dia seguinte', () => {
    const today = parseEntryAtInput('2026-09-28')
    const r = resolveTimeEntryEntryAt(today, NOW_LATE_SP)
    expect(operationalDateOf(r)).toBe('2026-09-28')
    const yesterday = resolveTimeEntryEntryAt(parseEntryAtInput('2026-09-27'), NOW_LATE_SP)
    expect(operationalDateOf(yesterday)).toBe('2026-09-27')
    expectFutureError(() =>
      resolveTimeEntryEntryAt(parseEntryAtInput('2026-09-29'), NOW_LATE_SP),
    )
  })

  it('resolveExtraEntryDate: padrão é hoje em SP, mesmo quando UTC já virou', () => {
    expect(resolveExtraEntryDate(undefined, NOW)).toBe('2026-09-28')
    expect(resolveExtraEntryDate(undefined, NOW_LATE_SP)).toBe('2026-09-28')
    expect(resolveExtraEntryDate('2026-09-27', NOW)).toBe('2026-09-27')
    expectFutureError(() => resolveExtraEntryDate('2026-09-29', NOW_LATE_SP))
    expect(() => resolveExtraEntryDate('2026-02-30', NOW)).toThrow(AppError)
  })

  it('isFutureOperationalDate', () => {
    expect(isFutureOperationalDate('2026-09-28', NOW)).toBe(false)
    expect(isFutureOperationalDate('2026-09-29', NOW)).toBe(true)
  })
})

describe('schemas de apontamento — data de realização', () => {
  const uuid = '11111111-1111-4111-8111-111111111111'

  it('extra esteira web e Kiosk rejeitam data futura com a mesma regra', () => {
    const future = '2999-01-01'
    expect(
      createExtraTimeEntryBodySchema.safeParse({ descriptionId: uuid, minutes: 10, entryDate: future })
        .success,
    ).toBe(false)
    expect(
      createProductionExtraTimeEntryBodySchema.safeParse({
        descriptionId: uuid,
        minutes: 10,
        entryDate: future,
      }).success,
    ).toBe(false)
    const past = '2020-05-05'
    expect(
      createExtraTimeEntryBodySchema.safeParse({ descriptionId: uuid, minutes: 10, entryDate: past })
        .success,
    ).toBe(true)
    expect(
      createProductionExtraTimeEntryBodySchema.safeParse({
        descriptionId: uuid,
        minutes: 10,
        entryDate: past,
      }).success,
    ).toBe(true)
  })

  it('Kiosk (atividade planejada e outra atividade) aceita entryAt opcional', () => {
    const base = { conveyorId: uuid, stepNodeId: uuid, minutes: 10 }
    const a = productionTimeEntryBodySchema.parse({ ...base, entryAt: '2026-09-27T12:00:00-03:00' })
    expect(a.entryAt).toBe('2026-09-27T12:00:00-03:00')
    expect(productionTimeEntryBodySchema.parse(base).entryAt).toBeUndefined()
    const b = productionUnassignedTimeEntryBodySchema.parse({ ...base, entryAt: '2026-09-27' })
    expect(b.entryAt).toBe('2026-09-27')
    expect(productionTimeEntryBodySchema.safeParse({ ...base, entryAt: 'xx' }).success).toBe(false)
  })
})
