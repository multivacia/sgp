import { describe, expect, it } from 'vitest'
import {
  buildEntryAtForWorkDate,
  formatIsoDateBr,
  formatWorkDateLabel,
  isFutureWorkDate,
  isValidIsoDate,
  operationalDateOf,
  operationalTodayIso,
  shiftIsoDate,
  validateWorkDate,
  WORK_DATE_ERRORS,
} from './workDate'

/** 28/09/2026 10:00 em São Paulo. */
const NOW = new Date('2026-09-28T13:00:00.000Z')
/** 28/09/2026 23:30 em São Paulo — em UTC já é 29/09. */
const NOW_LATE_SP = new Date('2026-09-29T02:30:00.000Z')
/** 29/09/2026 00:10 em São Paulo. */
const NOW_AFTER_MIDNIGHT_SP = new Date('2026-09-29T03:10:00.000Z')

describe('workDate — data de realização (São Paulo)', () => {
  it('hoje é a data civil de SP, não a de UTC (toISOString)', () => {
    expect(operationalTodayIso(NOW)).toBe('2026-09-28')
    expect(NOW_LATE_SP.toISOString().slice(0, 10)).toBe('2026-09-29')
    expect(operationalTodayIso(NOW_LATE_SP)).toBe('2026-09-28')
    expect(operationalTodayIso(NOW_AFTER_MIDNIGHT_SP)).toBe('2026-09-29')
  })

  it('hoje → envia o instante atual (comportamento anterior)', () => {
    expect(buildEntryAtForWorkDate('2026-09-28', NOW)).toBe(NOW.toISOString())
    // 23:30 em SP: o instante é 29/09 em UTC, mas continua no dia 28 em SP.
    const lateEntry = buildEntryAtForWorkDate('2026-09-28', NOW_LATE_SP)
    expect(lateEntry).toBe(NOW_LATE_SP.toISOString())
    expect(operationalDateOf(new Date(lateEntry))).toBe('2026-09-28')
  })

  it('data passada → meio-dia de SP com offset explícito; não desloca para o dia vizinho', () => {
    const entryAt = buildEntryAtForWorkDate('2026-09-27', NOW)
    expect(entryAt).toBe('2026-09-27T12:00:00-03:00')
    expect(operationalDateOf(new Date(entryAt))).toBe('2026-09-27')
    // logo após a meia-noite de SP, "ontem" continua sendo 28/09
    const y = shiftIsoDate(operationalTodayIso(NOW_AFTER_MIDNIGHT_SP), -1)
    expect(y).toBe('2026-09-28')
    expect(operationalDateOf(new Date(buildEntryAtForWorkDate(y, NOW_AFTER_MIDNIGHT_SP)))).toBe(
      '2026-09-28',
    )
  })

  it('validateWorkDate: passado sem limite, futuro e inválido bloqueados', () => {
    expect(validateWorkDate('2026-09-28', NOW)).toBeNull()
    expect(validateWorkDate('2019-01-01', NOW)).toBeNull()
    expect(validateWorkDate('2026-09-29', NOW)).toBe(WORK_DATE_ERRORS.future)
    expect(validateWorkDate('2026-09-29', NOW_LATE_SP)).toBe(WORK_DATE_ERRORS.future)
    expect(validateWorkDate('', NOW)).toBe(WORK_DATE_ERRORS.required)
    expect(validateWorkDate('2026-02-30', NOW)).toBe(WORK_DATE_ERRORS.invalid)
    expect(isFutureWorkDate('2026-09-29', NOW)).toBe(true)
  })

  it('utilitários de calendário', () => {
    expect(shiftIsoDate('2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftIsoDate('2026-12-31', 1)).toBe('2027-01-01')
    expect(isValidIsoDate('2024-02-29')).toBe(true)
    expect(isValidIsoDate('2026-13-01')).toBe(false)
    expect(formatIsoDateBr('2026-09-27')).toBe('27/09/2026')
  })

  it('rótulo da revisão/confirmação', () => {
    expect(formatWorkDateLabel('2026-09-28', NOW)).toBe('Hoje · 28/09/2026')
    expect(formatWorkDateLabel('2026-09-27', NOW)).toBe('Ontem · 27/09/2026')
    expect(formatWorkDateLabel('2026-09-20', NOW)).toBe('20/09/2026')
  })
})
