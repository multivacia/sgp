const MS_DAY = 86_400_000

function utcParts(d: Date): { y: number; m: number; day: number } {
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), day: d.getUTCDate() }
}

function dtUtc(y: number, m: number, day: number): Date {
  return new Date(Date.UTC(y, m, day, 12, 0, 0, 0))
}

export function parseIsoDateUtc(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim())
  if (!m) throw new Error('data inválida')
  return dtUtc(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/** Segunda-feira da semana que contém `reference` (calendário local → ISO date). */
export function mondayOfWeekContainingLocal(reference: Date): string {
  const y = reference.getFullYear()
  const mo = reference.getMonth()
  const day = reference.getDate()
  const d = new Date(y, mo, day, 12, 0, 0, 0)
  const dow = d.getDay()
  const deltaToMonday = dow === 0 ? -6 : 1 - dow
  const mon = new Date(d.getTime() + deltaToMonday * MS_DAY)
  const yy = mon.getFullYear()
  const mm = String(mon.getMonth() + 1).padStart(2, '0')
  const dd = String(mon.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function fridayAfterMonday(mondayIso: string): string {
  const d = parseIsoDateUtc(mondayIso)
  const fri = new Date(d.getTime() + 4 * MS_DAY)
  const { y, m, day } = utcParts(fri)
  const mm = String(m + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

/** Semana operacional canônica: segunda (início) e sexta (+4 dias), nunca domingo. */
export function resolveOperationalWeekRange(weekStartDate: string): {
  weekStartDate: string
  weekEndDate: string
} {
  return {
    weekStartDate,
    weekEndDate: fridayAfterMonday(weekStartDate),
  }
}

export function isCanonicalOperationalWeekEnd(
  weekStartDate: string,
  weekEndDate: string,
): boolean {
  return weekEndDate === fridayAfterMonday(weekStartDate)
}

export function weekdayLabelsPt(): readonly string[] {
  return ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']
}

function localDateFromIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0)
}

export function shiftWeek(mondayIso: string, deltaWeeks: number): string {
  const d = localDateFromIso(mondayIso)
  const next = new Date(d.getTime() + deltaWeeks * 7 * MS_DAY)
  return mondayOfWeekContainingLocal(next)
}

/** Data de hoje no fuso local, formato ISO `YYYY-MM-DD`. */
export function localTodayIsoDate(reference: Date = new Date()): string {
  const yy = reference.getFullYear()
  const mm = String(reference.getMonth() + 1).padStart(2, '0')
  const dd = String(reference.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function isIsoDateInWeekdays(
  isoDate: string,
  weekdayDates: readonly string[],
): boolean {
  return weekdayDates.includes(isoDate)
}
