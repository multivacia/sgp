import type {
  ActivityProgressItem,
  ActivityTimeEfficiency,
  AggregateTimeEfficiency,
} from './conveyorProgress.types'
import { computeConveyorProgressMetrics, sumMinutes } from './conveyorProgressMetrics'
import type { ConveyorProgressItem } from './conveyorProgress.types'

export type ConveyorProgressSummaryMetrics = {
  conveyorCount: number
  plannedMinutes: number
  realizedMinutes: number
  remainingMinutes: number
  exceededMinutes: number
  averageProgressPercent: number
  timeEfficiency: AggregateTimeEfficiency
}

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

export const TIME_EFFICIENCY_STATUS_LABELS: Record<ActivityTimeEfficiency['status'], string> = {
  SEM_TEMPO_PREVISTO: 'Sem tempo previsto',
  NAO_INICIADA: 'Não iniciada',
  CONCLUIDA_SEM_APONTAMENTO: 'Concluída sem apontamento',
  MAIS_RAPIDO: 'Mais rápido que previsto',
  DENTRO_DO_PREVISTO: 'Dentro do previsto',
  LEVE_DESVIO: 'Leve desvio',
  ATENCAO: 'Atenção',
  CRITICO: 'Crítico',
}

export function formatTimeEfficiencyPercent(value: number | null | undefined): string {
  if (value == null) return '—'
  return `${percentFormatter.format(value)}%`
}

export function formatTimeEfficiencyDeviationMinutes(value: number | null | undefined): string {
  if (value == null) return '—'
  if (value === 0) return '0 min'
  return `${value > 0 ? '+' : '−'}${Math.abs(value)} min`
}

export function formatTimeEfficiencyDeviationPercent(value: number | null | undefined): string {
  if (value == null) return '—'
  if (value === 0) return '0%'
  return `${value > 0 ? '+' : '−'}${percentFormatter.format(Math.abs(value))}%`
}

export function formatTimeEfficiencyStatus(status: ActivityTimeEfficiency['status']): string {
  return TIME_EFFICIENCY_STATUS_LABELS[status]
}

export function formatAggregateTimeEfficiencyStatus(
  status: AggregateTimeEfficiency['status'],
): string | null {
  if (!status) return null
  return TIME_EFFICIENCY_STATUS_LABELS[status]
}

export function formatAggregateTimeEfficiencyCounters(
  efficiency: AggregateTimeEfficiency,
): string | null {
  const parts: string[] = []
  if (efficiency.includedInCalculationCount > 0) {
    parts.push(`${efficiency.includedInCalculationCount} no cálculo`)
  }
  if (efficiency.partialCount > 0) {
    parts.push(`${efficiency.partialCount} parcial${efficiency.partialCount === 1 ? '' : 'is'}`)
  }
  if (efficiency.notStartedCount > 0) {
    parts.push(
      `${efficiency.notStartedCount} não iniciada${efficiency.notStartedCount === 1 ? '' : 's'}`,
    )
  }
  if (efficiency.withoutPlannedTimeCount > 0) {
    parts.push(
      `${efficiency.withoutPlannedTimeCount} sem tempo previsto`,
    )
  }
  if (efficiency.completedWithoutTimeCount > 0) {
    parts.push(
      `${efficiency.completedWithoutTimeCount} concluída${efficiency.completedWithoutTimeCount === 1 ? '' : 's'} sem apontamento`,
    )
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

export function computeConveyorProgressSummary(
  items: readonly ConveyorProgressItem[],
  timeEfficiency: AggregateTimeEfficiency = {
    status: null,
    efficiencyPct: null,
    deviationMinutes: null,
    deviationPct: null,
    notStartedCount: 0,
    withoutPlannedTimeCount: 0,
    completedWithoutTimeCount: 0,
    partialCount: 0,
    includedInCalculationCount: 0,
  },
): ConveyorProgressSummaryMetrics {
  if (items.length === 0) {
    return {
      conveyorCount: 0,
      plannedMinutes: 0,
      realizedMinutes: 0,
      remainingMinutes: 0,
      exceededMinutes: 0,
      averageProgressPercent: 0,
      timeEfficiency,
    }
  }

  const plannedMinutes = sumMinutes(items.map((i) => i.plannedMinutes))
  const realizedMinutes = sumMinutes(items.map((i) => i.realizedMinutes))
  const totals = computeConveyorProgressMetrics(plannedMinutes, realizedMinutes)

  const withPlanned = items.filter((i) => i.plannedMinutes > 0)
  const averageProgressPercent =
    withPlanned.length > 0
      ? Math.round(
          withPlanned.reduce((acc, i) => acc + i.progressPercent, 0) / withPlanned.length,
        )
      : 0

  return {
    conveyorCount: items.length,
    plannedMinutes: totals.plannedMinutes,
    realizedMinutes: totals.realizedMinutes,
    remainingMinutes: totals.remainingMinutes,
    exceededMinutes: totals.exceededMinutes,
    averageProgressPercent,
    timeEfficiency,
  }
}

export function aggregateStatusFromActivities(
  activities: readonly ActivityProgressItem[],
): string | null {
  if (activities.length === 0) return null
  if (activities.every((a) => a.status === 'COMPLETED')) return 'Concluída'
  if (activities.some((a) => a.status === 'IN_PROGRESS')) return 'Em andamento'
  if (activities.some((a) => a.status === 'PENDING')) return 'Aberta'
  return null
}

export function collectActivitiesFromTask(
  task: ConveyorProgressItem['tasks'][number],
): ActivityProgressItem[] {
  return task.sectors.flatMap((s) => s.activities)
}

export function filterSelectedConveyors(
  items: readonly ConveyorProgressItem[],
  selectedIds: ReadonlySet<string>,
): ConveyorProgressItem[] {
  return items.filter((i) => selectedIds.has(i.conveyorId))
}
