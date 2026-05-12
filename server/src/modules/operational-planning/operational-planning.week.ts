/**
 * Semana operacional MVP: segunda a sexta (5 dias). `week_start_date` = segunda-feira.
 */

const MS_DAY = 86_400_000

function utcDateParts(d: Date): { y: number; m: number; day: number } {
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth(),
    day: d.getUTCDate(),
  }
}

function utcDateFromParts(y: number, m: number, day: number): Date {
  return new Date(Date.UTC(y, m, day, 12, 0, 0, 0))
}

/** Parse `YYYY-MM-DD` como data UTC (meio-dia evita deslocamentos por DST). */
export function parseIsoDateUtc(dateStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim())
  if (!m) throw new Error('data inválida')
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  return utcDateFromParts(y, mo, d)
}

/** Segunda-feira da semana ISO que contém `dateStr` (UTC). */
export function mondayOfWeekContaining(dateStr: string): string {
  const d = parseIsoDateUtc(dateStr)
  const dow = d.getUTCDay() // 0 domingo … 6 sábado
  const deltaToMonday = dow === 0 ? -6 : 1 - dow
  const mon = new Date(d.getTime() + deltaToMonday * MS_DAY)
  const { y, m, day } = utcDateParts(mon)
  const mm = String(m + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

/** Sexta-feira da mesma semana que `mondayDateStr` (segunda). */
export function fridayAfterMonday(mondayDateStr: string): string {
  const d = parseIsoDateUtc(mondayDateStr)
  const fri = new Date(d.getTime() + 4 * MS_DAY)
  const { y, m, day } = utcDateParts(fri)
  const mm = String(m + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

export function assertMonday(dateStr: string): void {
  const d = parseIsoDateUtc(dateStr)
  if (d.getUTCDay() !== 1) {
    throw new Error('week_start_date deve ser uma segunda-feira')
  }
}

export function assertFriday(dateStr: string): void {
  const d = parseIsoDateUtc(dateStr)
  if (d.getUTCDay() !== 5) {
    throw new Error('week_end_date deve ser uma sexta-feira')
  }
}

export function weekDayStrings(mondayDateStr: string): readonly string[] {
  const out: string[] = []
  let d = parseIsoDateUtc(mondayDateStr)
  for (let i = 0; i < 5; i += 1) {
    const { y, m, day } = utcDateParts(d)
    const mm = String(m + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    out.push(`${y}-${mm}-${dd}`)
    d = new Date(d.getTime() + MS_DAY)
  }
  return out
}

/** Comparador textual seguro para datas ISO `YYYY-MM-DD`. */
export function isDateInWeekInclusive(plannedDate: string, weekStart: string, weekEnd: string): boolean {
  return plannedDate >= weekStart && plannedDate <= weekEnd
}
