import type { OperationalPlanningBacklogItem } from '../../../domain/operational-planning/operational-planning.types'
import { formatHumanMinutes } from '../../../lib/formatters'

type WeeklyAgendaBacklogCardProps = {
  item: OperationalPlanningBacklogItem
}

export function WeeklyAgendaBacklogCard(props: WeeklyAgendaBacklogCardProps) {
  const { item } = props

  return (
    <article
      className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-[13px] shadow-sm ring-1 ring-white/[0.04]"
      data-testid={`weekly-agenda-backlog-card-${item.activityNodeId}`}
    >
      <p className="truncate font-semibold text-slate-100">{item.activityTitle}</p>
      <p className="mt-1 truncate text-[11px] text-slate-400">{item.conveyorTitle}</p>
      <p className="truncate text-[11px] text-slate-500">
        {item.taskTitle} › {item.sectorTitle}
      </p>
      <p className="mt-1 text-[11px] text-slate-400">
        Pendente: {formatHumanMinutes(item.pendingMinutes)}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {item.isOutOfSequence ? (
          <span className="rounded-md border border-amber-400/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-100">
            Fora de sequência
          </span>
        ) : null}
        {!item.hasAssignees ? (
          <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-400">
            Sem responsável
          </span>
        ) : null}
        {item.isOverdue ? (
          <span className="rounded-md border border-rose-400/25 bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-100">
            Atrasada
          </span>
        ) : null}
      </div>
    </article>
  )
}
