/**
 * Cálculos operacionais de quantidade — espelho de `server/src/shared/activityOperationalQuantity.ts`.
 */

export const DEFAULT_PLANNED_QUANTITY = 1

const QUANTITY_UNIT_LABEL = 'un.'

export function resolveActivityPlannedQuantity(
  raw: number | string | null | undefined,
): number {
  if (raw == null || raw === '') return DEFAULT_PLANNED_QUANTITY
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : raw
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PLANNED_QUANTITY
  return Math.floor(n)
}

export function resolveActivityPlannedUnitMinutes(
  raw: number | string | null | undefined,
): number {
  if (raw == null || raw === '') return 0
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : raw
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

export function resolveActivityPlannedTotalMinutes(
  unitMinutes: number | string | null | undefined,
  plannedQuantity?: number | string | null | undefined,
): number {
  const unit = resolveActivityPlannedUnitMinutes(unitMinutes)
  const qty = resolveActivityPlannedQuantity(plannedQuantity)
  return unit * qty
}

export function formatPlannedQuantity(quantity: number): string {
  const q = resolveActivityPlannedQuantity(quantity)
  return `${q} ${QUANTITY_UNIT_LABEL}`
}

export function formatUnitAndTotalMinutes(
  unitMinutes: number | null | undefined,
  plannedQuantity?: number | null | undefined,
  formatMinutes: (m: number) => string = (m) => `${m} min`,
): string {
  const qty = resolveActivityPlannedQuantity(plannedQuantity)
  const unit = resolveActivityPlannedUnitMinutes(unitMinutes)
  const total = unit * qty
  if (qty <= 1) {
    return formatMinutes(unit)
  }
  return `${qty} ${QUANTITY_UNIT_LABEL} × ${formatMinutes(unit)} = ${formatMinutes(total)}`
}

export function sumExecutedQuantityFromEntries(
  entries: Array<{ executedQuantity?: number | null }>,
): number {
  let sum = 0
  for (const e of entries) {
    if (e.executedQuantity == null) continue
    const n = Number(e.executedQuantity)
    if (!Number.isFinite(n) || n < 0) continue
    sum += Math.floor(n)
  }
  return sum
}

export function sumExecutedMinutesFromEntries(
  entries: Array<{ minutes: number }>,
): number {
  return entries.reduce((s, e) => s + Math.max(0, Math.floor(e.minutes) || 0), 0)
}

export function resolveActualMinutesPerUnit(
  executedMinutesTotal: number,
  executedQuantityTotal: number,
): number | null {
  if (executedQuantityTotal <= 0) return null
  return Math.max(0, executedMinutesTotal) / executedQuantityTotal
}

export function resolveQuantityProgressPercent(
  executedQuantityTotal: number,
  plannedQuantity: number,
): number | null {
  const planned = resolveActivityPlannedQuantity(plannedQuantity)
  if (planned <= 0) return null
  return executedQuantityTotal / planned
}

export function resolveRemainingQuantity(
  executedQuantityTotal: number,
  plannedQuantity: number,
): number {
  const planned = resolveActivityPlannedQuantity(plannedQuantity)
  return Math.max(0, planned - Math.max(0, executedQuantityTotal))
}

export function resolveRemainingPlannedMinutes(
  executedMinutesTotal: number,
  plannedTotalMinutes: number,
): number {
  return Math.max(0, plannedTotalMinutes - Math.max(0, executedMinutesTotal))
}

export type ActivityOperationalProgress = {
  plannedQuantity: number
  plannedUnitMinutes: number
  plannedTotalMinutes: number
  executedQuantityTotal: number
  executedMinutesTotal: number
  actualMinutesPerUnit: number | null
  quantityProgressPercent: number | null
  remainingQuantity: number
  remainingPlannedMinutes: number
}

export function buildActivityOperationalProgress(input: {
  plannedUnitMinutes: number | null | undefined
  plannedQuantity?: number | null | undefined
  timeEntries: Array<{ minutes: number; executedQuantity?: number | null }>
}): ActivityOperationalProgress {
  const plannedQuantity = resolveActivityPlannedQuantity(input.plannedQuantity)
  const plannedUnitMinutes = resolveActivityPlannedUnitMinutes(input.plannedUnitMinutes)
  const plannedTotalMinutes = plannedUnitMinutes * plannedQuantity
  const executedMinutesTotal = sumExecutedMinutesFromEntries(input.timeEntries)
  const executedQuantityTotal = sumExecutedQuantityFromEntries(input.timeEntries)
  return {
    plannedQuantity,
    plannedUnitMinutes,
    plannedTotalMinutes,
    executedQuantityTotal,
    executedMinutesTotal,
    actualMinutesPerUnit: resolveActualMinutesPerUnit(
      executedMinutesTotal,
      executedQuantityTotal,
    ),
    quantityProgressPercent: resolveQuantityProgressPercent(
      executedQuantityTotal,
      plannedQuantity,
    ),
    remainingQuantity: resolveRemainingQuantity(
      executedQuantityTotal,
      plannedQuantity,
    ),
    remainingPlannedMinutes: resolveRemainingPlannedMinutes(
      executedMinutesTotal,
      plannedTotalMinutes,
    ),
  }
}
