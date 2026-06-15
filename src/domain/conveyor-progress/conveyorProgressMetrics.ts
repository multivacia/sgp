export type ConveyorProgressMetrics = {
  plannedMinutes: number
  realizedMinutes: number
  remainingMinutes: number
  exceededMinutes: number
  progressPercent: number
}

export function computeConveyorProgressMetrics(
  plannedMinutes: number,
  realizedMinutes: number,
): ConveyorProgressMetrics {
  const planned = Math.max(0, Math.floor(Number(plannedMinutes) || 0))
  const realized = Math.max(0, Math.floor(Number(realizedMinutes) || 0))
  return {
    plannedMinutes: planned,
    realizedMinutes: realized,
    remainingMinutes: Math.max(planned - realized, 0),
    exceededMinutes: Math.max(realized - planned, 0),
    progressPercent: planned > 0 ? Math.round((realized / planned) * 100) : 0,
  }
}

/** Formato operacional: 01h30, 8h15, 0h45 */
export function formatConveyorProgressDuration(minutes: number | null | undefined): string {
  const m = Math.max(0, Math.floor(Number(minutes) || 0))
  const h = Math.floor(m / 60)
  const r = m % 60
  const hPart = h === 0 ? '0' : h < 10 ? String(h).padStart(2, '0') : String(h)
  return r === 0 ? `${hPart}h` : `${hPart}h${String(r).padStart(2, '0')}`
}

export function formatConveyorProgressPercent(value: number | null | undefined): string {
  const planned = Math.floor(Number(value) || 0)
  if (planned <= 0 && value === 0) return '0%'
  return `${Math.max(0, planned)}%`
}

export function formatExceededLabel(exceededMinutes: number): string | null {
  if (exceededMinutes <= 0) return null
  return `+ ${formatConveyorProgressDuration(exceededMinutes)} acima`
}

export function sumMinutes(values: readonly number[]): number {
  return values.reduce((acc, v) => acc + Math.max(0, Math.floor(Number(v) || 0)), 0)
}
