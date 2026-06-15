/** Métricas previsto / realizado / faltante / excedente / evolução (esteiras). */
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

export function sumMinutes(values: readonly number[]): number {
  return values.reduce((acc, v) => acc + Math.max(0, Math.floor(Number(v) || 0)), 0)
}
