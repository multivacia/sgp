import type { OperationalPlanningPlanItem } from '../../../domain/operational-planning/operational-planning.types'
import { formatPlanningMinutes } from '../../operational-planning/planningBoardHelpers'
import { resolvePlanningItemOperationalStatusLabel } from '../../operational-planning/planningExecutionHelpers'
import { PlanningSyncBadge } from '../../operational-planning/PlanningSyncBadge'
import {
  resolveWeeklyAgendaPlanCardTone,
  weeklyAgendaPlanCardToneClasses,
} from '../weeklyAgendaPlanCardStatus'

type WeeklyAgendaPlanCardProps = {
  order: number
  item: OperationalPlanningPlanItem
}

export function WeeklyAgendaPlanCard(props: WeeklyAgendaPlanCardProps) {
  const { item, order } = props
  const tone = resolveWeeklyAgendaPlanCardTone(item)
  const statusLabel = resolvePlanningItemOperationalStatusLabel(item.activityOperationalStatus)

  return (
    <article
      className={[
        'group relative rounded-lg border p-2.5 text-[11px] ring-1',
        weeklyAgendaPlanCardToneClasses(tone),
      ].join(' ')}
    >
      <div className="min-w-0 pr-6">
        <p className="truncate text-[12px] font-semibold text-slate-50">{item.activityTitle}</p>
        <p className="mt-0.5 truncate text-[10px] text-slate-400">{item.conveyorTitle}</p>
        <p className="mt-1 truncate text-[10px] text-slate-500">
          {item.sectorTitle} · {item.taskTitle}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
          <span className="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 tabular-nums">
            #{order}
          </span>
          {item.plannedMinutes != null ? (
            <span className="tabular-nums">{formatPlanningMinutes(item.plannedMinutes)}</span>
          ) : null}
          {statusLabel ? (
            <span className="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-slate-300">
              {statusLabel}
            </span>
          ) : null}
        </div>
        {item.syncStatus === 'DIVERGED' ? (
          <div className="mt-2">
            <PlanningSyncBadge syncDifferences={item.syncDifferences} />
          </div>
        ) : null}
      </div>

      <button
        type="button"
        disabled
        aria-hidden
        className="absolute right-1.5 top-1.5 rounded-md border border-white/[0.08] px-1.5 py-0.5 text-[12px] text-slate-500 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 disabled:opacity-0"
        title="Ações disponíveis em breve"
      >
        ⋯
      </button>
    </article>
  )
}
