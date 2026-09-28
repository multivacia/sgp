/**
 * Data de realização do trabalho no apontamento (web, gestor e Kiosk).
 *
 * Referência única: data civil em São Paulo — a mesma usada pelo backend
 * (`server/src/shared/operationalWorkDate.ts`) para validar e contabilizar `entry_at`.
 * Nunca usar `toISOString().slice(0, 10)` para "hoje": em UTC o dia pode virar antes.
 */

export const OPERATIONAL_TIMEZONE = 'America/Sao_Paulo' as const

/** Brasil sem horário de verão desde 2019; offset explícito de São Paulo. */
const OPERATIONAL_OFFSET = '-03:00'
const OPERATIONAL_NOON_SUFFIX = `T12:00:00${OPERATIONAL_OFFSET}`

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

export const WORK_DATE_FIELD_LABEL = 'Data em que o trabalho foi realizado' as const

export const WORK_DATE_ERRORS = {
  required: 'Informe a data em que o trabalho foi realizado.',
  invalid: 'Data inválida.',
  future: 'A data de realização não pode ser futura.',
} as const

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
export function operationalTodayIso(now: Date = new Date()): string {
  return operationalDateOf(now)
}

export function isValidIsoDate(iso: string): boolean {
  if (!DATE_ONLY_RE.test(iso)) return false
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

/** Soma dias a uma data civil (aritmética de calendário, sem fuso). */
export function shiftIsoDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

export function isFutureWorkDate(iso: string, now: Date = new Date()): boolean {
  return iso > operationalTodayIso(now)
}

/** `null` = válida. Datas passadas sem limite; futuras bloqueadas. */
export function validateWorkDate(iso: string, now: Date = new Date()): string | null {
  const v = iso.trim()
  if (!v) return WORK_DATE_ERRORS.required
  if (!isValidIsoDate(v)) return WORK_DATE_ERRORS.invalid
  if (isFutureWorkDate(v, now)) return WORK_DATE_ERRORS.future
  return null
}

/**
 * `entryAt` enviado ao backend para a data escolhida:
 * - hoje → instante atual (mesmo comportamento de antes);
 * - data passada → 12:00 de São Paulo com offset explícito (não desloca para o dia vizinho).
 */
export function buildEntryAtForWorkDate(iso: string, now: Date = new Date()): string {
  if (iso === operationalTodayIso(now)) return now.toISOString()
  return `${iso}${OPERATIONAL_NOON_SUFFIX}`
}

/** `dd/mm/aaaa` a partir de `YYYY-MM-DD` (sem conversão de fuso). */
export function formatIsoDateBr(iso: string): string {
  if (!isValidIsoDate(iso)) return iso
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Rótulo para revisão/confirmação: «Hoje · 28/09/2026», «Ontem · 27/09/2026» ou a data. */
export function formatWorkDateLabel(iso: string, now: Date = new Date()): string {
  const today = operationalTodayIso(now)
  const br = formatIsoDateBr(iso)
  if (iso === today) return `Hoje · ${br}`
  if (iso === shiftIsoDate(today, -1)) return `Ontem · ${br}`
  return br
}

/**
 * Data de realização (`dd/mm/aaaa`) de um apontamento a partir de `entryAt` (instante):
 * extrai o dia civil em São Paulo antes de formatar — nunca exibe o horário (o 12:00 dos
 * lançamentos retroativos é convenção, não o horário real do trabalho).
 */
export function formatWorkDateFromEntryAt(entryAt: string | null | undefined): string {
  if (!entryAt?.trim()) return '—'
  const d = new Date(entryAt)
  if (Number.isNaN(d.getTime())) return entryAt
  return formatIsoDateBr(operationalDateOf(d))
}

/**
 * Limites ISO de um intervalo de dias civis de São Paulo (inclusivo), para filtros de período:
 * `from` = 00:00 e `to` = 23:59:59.999 em SP, com offset explícito.
 */
export function operationalDayRangeIso(fromIso: string, toIso: string): { from: string; to: string } {
  return {
    from: `${fromIso}T00:00:00.000${OPERATIONAL_OFFSET}`,
    to: `${toIso}T23:59:59.999${OPERATIONAL_OFFSET}`,
  }
}
