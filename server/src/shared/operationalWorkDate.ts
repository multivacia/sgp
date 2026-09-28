import { AppError } from './errors/AppError.js'
import { ErrorCodes } from './errors/errorCodes.js'

/**
 * Data de realização do trabalho (apontamentos).
 *
 * Regra única de contabilização: o dia operacional de um apontamento é a data civil de
 * `entry_at` em São Paulo (mesma referência de `operational-planning`). `created_at`
 * continua a registar o instante real da gravação (auditoria).
 *
 * - Sem data informada → agora.
 * - Data de hoje (SP) → agora (instantes futuros no mesmo dia são limitados a agora).
 * - Data passada → instante informado; data pura `YYYY-MM-DD` vira 12:00 de SP (meio-dia
 *   evita deslocamento para o dia vizinho em qualquer conversão de fuso).
 * - Data futura (SP) → 422 `TIME_ENTRY_FUTURE_DATE`.
 */
export const OPERATIONAL_TIMEZONE = 'America/Sao_Paulo' as const

/** Brasil sem horário de verão desde 2019; offset explícito usado na âncora de meio-dia. */
const OPERATIONAL_NOON_SUFFIX = 'T12:00:00-03:00'

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

export const TIME_ENTRY_FUTURE_DATE_MESSAGE =
  'A data de realização não pode ser futura.'

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: OPERATIONAL_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Data civil (YYYY-MM-DD) do instante em São Paulo. */
export function operationalDateOf(instant: Date): string {
  return dateFormatter.format(instant)
}

/** Hoje (YYYY-MM-DD) em São Paulo. */
export function operationalToday(now: Date = new Date()): string {
  return operationalDateOf(now)
}

export function isFutureOperationalDate(dateIso: string, now: Date = new Date()): boolean {
  return dateIso > operationalToday(now)
}

function isValidDateOnly(s: string): boolean {
  if (!DATE_ONLY_RE.test(s)) return false
  const d = new Date(`${s}${OPERATIONAL_NOON_SUFFIX}`)
  return !Number.isNaN(d.getTime()) && operationalDateOf(d) === s
}

function futureDateError(): AppError {
  return new AppError(TIME_ENTRY_FUTURE_DATE_MESSAGE, 422, ErrorCodes.TIME_ENTRY_FUTURE_DATE)
}

/**
 * Converte o `entryAt` recebido na API em instante. Data pura (`YYYY-MM-DD`) é interpretada
 * como meio-dia de São Paulo (nunca como meia-noite UTC).
 */
export function parseEntryAtInput(raw: string): Date {
  const s = raw.trim()
  const dateOnly = DATE_ONLY_RE.test(s)
  const d = dateOnly ? new Date(`${s}${OPERATIONAL_NOON_SUFFIX}`) : new Date(s)
  if (Number.isNaN(d.getTime()) || (dateOnly && !isValidDateOnly(s))) {
    throw new AppError('Data/hora inválida.', 422, ErrorCodes.VALIDATION_ERROR)
  }
  return d
}

/** Resolve o `entry_at` a gravar num apontamento de atividade (ver regra no topo). */
export function resolveTimeEntryEntryAt(entryAt: Date | undefined, now: Date = new Date()): Date {
  if (entryAt === undefined) return now
  if (Number.isNaN(entryAt.getTime())) {
    throw new AppError('Data/hora inválida.', 422, ErrorCodes.VALIDATION_ERROR)
  }
  if (isFutureOperationalDate(operationalDateOf(entryAt), now)) {
    throw futureDateError()
  }
  return entryAt.getTime() > now.getTime() ? now : entryAt
}

/** Resolve o `entry_date` do apontamento extra esteira: padrão hoje (SP); futuro → 422. */
export function resolveExtraEntryDate(entryDate: string | undefined, now: Date = new Date()): string {
  const today = operationalToday(now)
  if (entryDate === undefined || entryDate.trim() === '') return today
  const d = entryDate.trim()
  if (!isValidDateOnly(d)) {
    throw new AppError('Data inválida.', 422, ErrorCodes.VALIDATION_ERROR)
  }
  if (d > today) throw futureDateError()
  return d
}
