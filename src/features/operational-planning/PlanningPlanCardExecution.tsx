import type { PlanningCardActionItem } from './planningCardActions'
import {
  buildPlanningExecutionDisplayLines,
  resolvePlanningItemExecutionSummary,
  resolvePlanningItemOperationalStatusLabel,
  resolvePlanningItemProgress,
  resolvePlanningItemRealizedForCard,
} from './planningExecutionHelpers'

type PlanningPlanCardExecutionProps = {
  item: PlanningCardActionItem
  backlogExecutionLookup: ReadonlyMap<string, number>
  compact?: boolean
}

export function PlanningPlanCardExecution(props: PlanningPlanCardExecutionProps) {
  const realizedMinutes = resolvePlanningItemRealizedForCard(
    props.item,
    props.backlogExecutionLookup,
  )
  const summary = resolvePlanningItemExecutionSummary({
    plannedMinutes: props.item.plannedMinutes,
    realizedMinutes,
    operationalStatus: props.item.activityOperationalStatus,
  })
  const progress = resolvePlanningItemProgress(summary)
  const lines = buildPlanningExecutionDisplayLines(summary)
  const statusLabel = resolvePlanningItemOperationalStatusLabel(
    props.item.activityOperationalStatus,
  )

  return (
    <div
      className={[
        'space-y-1.5 border-t border-white/[0.06] pt-2',
        props.compact ? 'mt-1.5' : 'mt-2',
      ].join(' ')}
    >
      {!props.compact ? (
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Execução</p>
      ) : null}
      <div className="space-y-0.5 text-[10px] text-slate-400">
        <p className="text-slate-300">{lines.plannedLine}</p>
        {lines.unavailableLine ? (
          <p className="text-slate-500">{lines.unavailableLine}</p>
        ) : (
          <>
            <p className={summary.state === 'not_started' ? 'text-slate-500' : 'text-slate-300'}>
              {lines.realizedLine}
            </p>
            {lines.pendingLine ? <p>{lines.pendingLine}</p> : null}
          </>
        )}
        {lines.alertLine ? (
          <p className="font-medium text-amber-200/85">{lines.alertLine}</p>
        ) : null}
      </div>
      {statusLabel ? (
        <span className="inline-flex rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-slate-400">
          {statusLabel}
        </span>
      ) : null}
      {progress.showBar ? (
        <div className="space-y-1">
          <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={[
                'h-full rounded-full',
                progress.isOverPlanned ? 'bg-amber-400/50' : 'bg-slate-400/45',
              ].join(' ')}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          {progress.overLabel ? (
            <p className="text-[9px] text-amber-200/80">{progress.overLabel}</p>
          ) : null}
        </div>
      ) : progress.emptyLabel ? (
        <p className="text-[9px] text-slate-500">{progress.emptyLabel}</p>
      ) : null}
    </div>
  )
}
