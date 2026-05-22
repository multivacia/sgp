import { formatPlanningSyncTooltip } from '../../domain/operational-planning/planningSyncIssues'
import type { OperationalPlanningPlanSyncDifference } from '../../domain/operational-planning/operational-planning.types'

type PlanningSyncBadgeProps = {
  syncDifferences?: readonly OperationalPlanningPlanSyncDifference[]
  className?: string
}

export function PlanningSyncBadge(props: PlanningSyncBadgeProps) {
  const tooltip = formatPlanningSyncTooltip(props.syncDifferences ?? [])
  return (
    <span
      className={[
        'inline-flex rounded-md border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-100',
        props.className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={tooltip}
    >
      Pendência de sincronização
    </span>
  )
}
