import { formatIsoDateBr, operationalTodayIso } from './workDate'

/**
 * Filtro de período por datas civis (`YYYY-MM-DD`, America/Sao_Paulo), inclusivo nas duas
 * pontas. Início e fim são opcionais; quando ambos existem, início deve ser ≤ fim.
 */
export type PeriodRangeInput = { from: string; to: string }

export const PERIOD_RANGE_INVALID_MESSAGE =
  'Período inválido: a data inicial deve ser anterior ou igual à data final.'

export function isPeriodRangeActive(range: PeriodRangeInput): boolean {
  return Boolean(range.from.trim() || range.to.trim())
}

export function validatePeriodRange(range: PeriodRangeInput): string | null {
  const from = range.from.trim()
  const to = range.to.trim()
  if (from && to && from > to) return PERIOD_RANGE_INVALID_MESSAGE
  return null
}

/** Texto curto para feedback: «de 01/10/2026 a 07/10/2026», «a partir de …», «até …». */
export function describePeriodRange(range: PeriodRangeInput): string {
  const from = range.from.trim()
  const to = range.to.trim()
  if (from && to) {
    return from === to
      ? `em ${formatIsoDateBr(from)}`
      : `de ${formatIsoDateBr(from)} a ${formatIsoDateBr(to)}`
  }
  if (from) return `a partir de ${formatIsoDateBr(from)}`
  if (to) return `até ${formatIsoDateBr(to)}`
  return ''
}

/** Item com data civil `YYYY-MM-DD` dentro do período (inclusivo; pontas vazias = abertas). */
export function isIsoDateInPeriod(dateIso: string, range: PeriodRangeInput): boolean {
  const from = range.from.trim()
  const to = range.to.trim()
  if (from && dateIso < from) return false
  if (to && dateIso > to) return false
  return true
}

/**
 * Data mínima usada quando o início do período fica em aberto em consultas que exigem
 * as duas pontas (ex.: jornada) — equivale a "desde o primeiro registro".
 */
export const OPEN_PERIOD_START_ISO = '2000-01-01'

/**
 * Completa um período com pontas opcionais para consultas que exigem início e fim:
 * fim vazio = hoje (America/Sao_Paulo); início vazio = desde o primeiro registro.
 * Retorna `null` quando nenhuma ponta foi informada.
 */
export function resolveOpenPeriodBounds(
  range: PeriodRangeInput,
  now: Date = new Date(),
): PeriodRangeInput | null {
  const from = range.from.trim()
  const to = range.to.trim()
  if (!from && !to) return null
  return {
    from: from || OPEN_PERIOD_START_ISO,
    to: to || operationalTodayIso(now),
  }
}
