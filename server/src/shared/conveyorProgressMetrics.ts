/** Métricas previsto / realizado / faltante / excedente / evolução (esteiras). */
export type ConveyorProgressMetrics = {
  plannedMinutes: number
  realizedMinutes: number
  remainingMinutes: number
  exceededMinutes: number
  progressPercent: number
}

export type TimeEfficiencyStatus =
  | 'SEM_TEMPO_PREVISTO'
  | 'NAO_INICIADA'
  | 'CONCLUIDA_SEM_APONTAMENTO'
  | 'MAIS_RAPIDO'
  | 'DENTRO_DO_PREVISTO'
  | 'LEVE_DESVIO'
  | 'ATENCAO'
  | 'CRITICO'

export type TimeEfficiencyMetrics = {
  status: TimeEfficiencyStatus
  isPartial: boolean
  includedInCalculation: boolean
  efficiencyPct: number | null
  deviationMinutes: number | null
  deviationPct: number | null
}

export type WeightedTimeEfficiencySummary = {
  status: TimeEfficiencyStatus | null
  efficiencyPct: number | null
  deviationMinutes: number | null
  deviationPct: number | null
  notStartedCount: number
  withoutPlannedTimeCount: number
  completedWithoutTimeCount: number
  partialCount: number
  includedInCalculationCount: number
}

export type TimeEfficiencyInput = {
  plannedMinutes: number | null | undefined
  realizedMinutes: number | null | undefined
  isCompleted: boolean
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

function classifyTimeEfficiency(
  plannedMinutes: number,
  realizedMinutes: number,
  deviationPct: number,
): TimeEfficiencyStatus {
  if (realizedMinutes < plannedMinutes) return 'MAIS_RAPIDO'
  if (realizedMinutes === plannedMinutes) return 'DENTRO_DO_PREVISTO'
  if (deviationPct <= 10) return 'LEVE_DESVIO'
  if (deviationPct <= 30) return 'ATENCAO'
  return 'CRITICO'
}

function calculateTimeEfficiencyValues(
  plannedMinutes: number,
  realizedMinutes: number,
): Pick<
  TimeEfficiencyMetrics,
  'status' | 'efficiencyPct' | 'deviationMinutes' | 'deviationPct'
> {
  const deviationMinutes = realizedMinutes - plannedMinutes
  const deviationPct = roundToSingleDecimal((deviationMinutes / plannedMinutes) * 100)
  const status = classifyTimeEfficiency(plannedMinutes, realizedMinutes, deviationPct)
  return {
    status,
    efficiencyPct: roundToSingleDecimal((plannedMinutes / realizedMinutes) * 100),
    deviationMinutes,
    deviationPct,
  }
}

export function computeConveyorProgressMetrics(
  plannedMinutes: number,
  realizedMinutes: number,
): ConveyorProgressMetrics {
  const planned = normalizeMinutes(plannedMinutes)
  const realized = normalizeMinutes(realizedMinutes)
  return {
    plannedMinutes: planned,
    realizedMinutes: realized,
    remainingMinutes: Math.max(planned - realized, 0),
    exceededMinutes: Math.max(realized - planned, 0),
    progressPercent: planned > 0 ? Math.round((realized / planned) * 100) : 0,
  }
}

export function computeTimeEfficiencyMetrics(
  input: TimeEfficiencyInput,
): TimeEfficiencyMetrics {
  const plannedMinutes = normalizePlannedMinutes(input.plannedMinutes)
  const realizedMinutes = normalizeMinutes(input.realizedMinutes)

  if (plannedMinutes == null) {
    return {
      status: 'SEM_TEMPO_PREVISTO',
      isPartial: false,
      includedInCalculation: false,
      efficiencyPct: null,
      deviationMinutes: null,
      deviationPct: null,
    }
  }

  if (realizedMinutes === 0 && !input.isCompleted) {
    return {
      status: 'NAO_INICIADA',
      isPartial: false,
      includedInCalculation: false,
      efficiencyPct: null,
      deviationMinutes: null,
      deviationPct: null,
    }
  }

  if (realizedMinutes === 0 && input.isCompleted) {
    return {
      status: 'CONCLUIDA_SEM_APONTAMENTO',
      isPartial: false,
      includedInCalculation: false,
      efficiencyPct: null,
      deviationMinutes: null,
      deviationPct: null,
    }
  }

  return {
    isPartial: !input.isCompleted,
    includedInCalculation: true,
    ...calculateTimeEfficiencyValues(plannedMinutes, realizedMinutes),
  }
}

export function consolidateWeightedTimeEfficiency(
  items: readonly TimeEfficiencyInput[],
): WeightedTimeEfficiencySummary {
  let totalPlannedMinutes = 0
  let totalRealizedMinutes = 0
  let notStartedCount = 0
  let withoutPlannedTimeCount = 0
  let completedWithoutTimeCount = 0
  let partialCount = 0
  let includedInCalculationCount = 0

  for (const item of items) {
    const metrics = computeTimeEfficiencyMetrics(item)
    switch (metrics.status) {
      case 'SEM_TEMPO_PREVISTO':
        withoutPlannedTimeCount += 1
        break
      case 'NAO_INICIADA':
        notStartedCount += 1
        break
      case 'CONCLUIDA_SEM_APONTAMENTO':
        completedWithoutTimeCount += 1
        break
      default:
        break
    }

    if (!metrics.includedInCalculation) {
      continue
    }

    includedInCalculationCount += 1
    if (metrics.isPartial) {
      partialCount += 1
    }
    totalPlannedMinutes += normalizePlannedMinutes(item.plannedMinutes) ?? 0
    totalRealizedMinutes += normalizeMinutes(item.realizedMinutes)
  }

  if (includedInCalculationCount === 0 || totalPlannedMinutes <= 0 || totalRealizedMinutes <= 0) {
    return {
      status: null,
      efficiencyPct: null,
      deviationMinutes: null,
      deviationPct: null,
      notStartedCount,
      withoutPlannedTimeCount,
      completedWithoutTimeCount,
      partialCount,
      includedInCalculationCount,
    }
  }

  const aggregate = calculateTimeEfficiencyValues(totalPlannedMinutes, totalRealizedMinutes)

  return {
    ...aggregate,
    notStartedCount,
    withoutPlannedTimeCount,
    completedWithoutTimeCount,
    partialCount,
    includedInCalculationCount,
  }
}

export function sumMinutes(values: readonly number[]): number {
  return values.reduce((acc, v) => acc + normalizeMinutes(v), 0)
}
