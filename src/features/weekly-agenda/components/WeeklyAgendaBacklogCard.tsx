/* eslint-disable react-hooks/refs -- @dnd-kit useDraggable */
import { useDraggable } from '@dnd-kit/core'
import type { OperationalPlanningBacklogItem } from '../../../domain/operational-planning/operational-planning.types'
import { formatPlanningOutOfSequenceTooltip } from '../../../domain/operational-planning/planningOutOfSequence'
import { formatHumanMinutes } from '../../../lib/formatters'
import { dragBacklogId } from '../weeklyAgendaDnD'

type WeeklyAgendaBacklogCardProps = {
  item: OperationalPlanningBacklogItem
  dragDisabled?: boolean
  overlay?: boolean
  onAssignClick?: () => void
}

export function WeeklyAgendaBacklogCard(props: WeeklyAgendaBacklogCardProps) {
  const { item } = props
  const dragId = dragBacklogId(item.activityNodeId)

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    disabled: props.dragDisabled || props.overlay,
  })

  return (
    <article
      ref={props.overlay ? undefined : setNodeRef}
      className={[
        'rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-[13px] shadow-sm ring-1 ring-white/[0.04]',
        isDragging && !props.overlay ? 'opacity-0' : '',
        props.overlay ? 'shadow-xl ring-sgp-gold/30' : '',
      ].join(' ')}
      data-testid={`weekly-agenda-backlog-card-${item.activityNodeId}`}
      {...(props.overlay ? {} : attributes)}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          {...(props.overlay ? {} : listeners)}
          className={[
            'min-w-0 flex-1',
            props.overlay ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing',
          ].join(' ')}
        >
          <p className="truncate font-semibold text-slate-100">{item.activityTitle}</p>
          <p className="mt-1 truncate text-[11px] text-slate-400">{item.conveyorTitle}</p>
          <p className="truncate text-[11px] text-slate-500">
            {item.taskTitle} › {item.sectorTitle}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Pendente: {formatHumanMinutes(item.pendingMinutes)}
          </p>
        </div>
        {!props.overlay && props.onAssignClick ? (
          <button
            type="button"
            className="shrink-0 rounded-lg border border-sgp-gold/35 bg-sgp-gold/15 px-2.5 py-1 text-[11px] font-semibold text-slate-100 hover:bg-sgp-gold/25"
            data-testid={`weekly-agenda-backlog-assign-${item.activityNodeId}`}
            onClick={(e) => {
              e.stopPropagation()
              props.onAssignClick?.()
            }}
            disabled={props.dragDisabled}
          >
            Atribuir
          </button>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {item.isOutOfSequence ? (
          <span
            className="rounded-md border border-amber-400/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-100"
            title={formatPlanningOutOfSequenceTooltip(item.previousOpenCount)}
          >
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
