import type { OperationalPlanningPlanItem } from '../../domain/operational-planning/operational-planning.types'
import { resolvePlanningItemExecutionSummary } from '../operational-planning/planningExecutionHelpers'

export type WeeklyAgendaPlanCardTone = 'planned' | 'in_progress' | 'completed' | 'attention'

export function resolveWeeklyAgendaPlanCardTone(
  item: Pick<
    OperationalPlanningPlanItem,
    'plannedMinutes' | 'realizedMinutes' | 'activityOperationalStatus' | 'syncStatus'
  >,
): WeeklyAgendaPlanCardTone {
  if (item.syncStatus === 'DIVERGED') return 'attention'

  const execution = resolvePlanningItemExecutionSummary({
    plannedMinutes: item.plannedMinutes,
    realizedMinutes: item.realizedMinutes,
    operationalStatus: item.activityOperationalStatus,
  })

  if (execution.isOperationallyCompleted || execution.state === 'completed') {
    return 'completed'
  }
  if (execution.state === 'in_progress' || execution.state === 'reached_planned' || execution.state === 'over_planned') {
    return 'in_progress'
  }
  return 'planned'
}

export function weeklyAgendaPlanCardToneClasses(tone: WeeklyAgendaPlanCardTone): string {
  switch (tone) {
    case 'completed':
      return 'border-emerald-400/25 bg-emerald-500/10 ring-emerald-500/10'
    case 'in_progress':
      return 'border-sky-400/25 bg-sky-500/10 ring-sky-500/10'
    case 'attention':
      return 'border-sgp-gold/35 bg-sgp-gold/10 ring-sgp-gold/15'
    default:
      return 'border-white/[0.08] bg-white/[0.05] ring-white/[0.03]'
  }
}
