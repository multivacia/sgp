export type ConveyorProgressTimeMetrics = {
  plannedMinutes: number
  realizedMinutes: number
  remainingMinutes: number
  exceededMinutes: number
  timeConsumptionPct: number | null
}

/** @deprecated Use ConveyorProgressTimeMetrics */
export type ConveyorProgressMetrics = ConveyorProgressTimeMetrics

export type OperationalProgressInput = {
  isCompleted: boolean
  latestSessionCompletionPct: number | null | undefined
}

export type WeightedOperationalProgressInput = {
  operationalProgressPct: number
  plannedMinutes: number
}

export type WeightedOperationalProgressSummary = {
  operationalProgressPct: number
  includedActivityCount: number
  withoutPlannedTimeCount: number
}

function normalizeMinutes(value: number | null | undefined): number {
  return Math.max(0, Math.floor(Number(value) || 0))
}

function normalizePlannedMinutes(value: number | null | undefined): number | null {
  if (value == null) return null
  const planned = normalizeMinutes(value)
  return planned > 0 ? planned : null
}

function roundToSingleDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

export function computeTimeConsumptionPct(
  plannedMinutes: number | null | undefined,
  realizedMinutes: number | null | undefined,
): number | null {
  const planned = normalizePlannedMinutes(plannedMinutes)
  if (planned == null) return null
  const realized = normalizeMinutes(realizedMinutes)
  return roundToSingleDecimal((realized / planned) * 100)
}

export function resolveActivityOperationalProgressPct(
  input: OperationalProgressInput,
): number {
  if (input.isCompleted) return 100
  const pct = input.latestSessionCompletionPct
  if (typeof pct !== 'number' || !Number.isFinite(pct)) return 0
  return Math.max(0, Math.min(100, Math.round(pct)))
}

export function consolidateWeightedOperationalProgress(
  items: readonly WeightedOperationalProgressInput[],
): WeightedOperationalProgressSummary {
  if (items.length === 0) {
    return {
      operationalProgressPct: 0,
      includedActivityCount: 0,
      withoutPlannedTimeCount: 0,
    }
  }

  const withPlanned = items.filter((item) => normalizePlannedMinutes(item.plannedMinutes) != null)
  const withoutPlannedTimeCount = items.length - withPlanned.length

  if (withPlanned.length > 0) {
    let weightedSum = 0
    let totalWeight = 0
    for (const item of withPlanned) {
      const weight = normalizePlannedMinutes(item.plannedMinutes) ?? 0
      weightedSum += item.operationalProgressPct * weight
      totalWeight += weight
    }

    return {
      operationalProgressPct:
        totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0,
      includedActivityCount: withPlanned.length,
      withoutPlannedTimeCount,
    }
  }

  const average =
    items.reduce((acc, item) => acc + item.operationalProgressPct, 0) / items.length

  return {
    operationalProgressPct: Math.round(average),
    includedActivityCount: items.length,
    withoutPlannedTimeCount,
  }
}

export function computeConveyorProgressMetrics(
  plannedMinutes: number,
  realizedMinutes: number,
): ConveyorProgressTimeMetrics {
  const planned = normalizeMinutes(plannedMinutes)
  const realized = normalizeMinutes(realizedMinutes)
  return {
    plannedMinutes: planned,
    realizedMinutes: realized,
    remainingMinutes: Math.max(planned - realized, 0),
    exceededMinutes: Math.max(realized - planned, 0),
    timeConsumptionPct: computeTimeConsumptionPct(planned, realized),
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
  if (value == null) return '—'
  const pct = Math.floor(Number(value) || 0)
  if (pct <= 0 && value === 0) return '0%'
  return `${Math.max(0, pct)}%`
}

export function formatExceededLabel(exceededMinutes: number): string | null {
  if (exceededMinutes <= 0) return null
  return `+ ${formatConveyorProgressDuration(exceededMinutes)} acima`
}

export function sumMinutes(values: readonly number[]): number {
  return values.reduce((acc, v) => acc + Math.max(0, Math.floor(Number(v) || 0)), 0)
}
