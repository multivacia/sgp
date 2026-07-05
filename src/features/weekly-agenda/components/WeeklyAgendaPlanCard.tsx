/* eslint-disable react-hooks/refs -- @dnd-kit useSortable */
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DraftPlanItem } from '../weeklyAgendaDraft'
import { dragPlanId } from '../weeklyAgendaDnD'
import { formatPlanningMinutes } from '../../operational-planning/planningBoardHelpers'
import { resolvePlanningItemOperationalStatusLabel } from '../../operational-planning/planningExecutionHelpers'
import { PlanningSyncBadge } from '../../operational-planning/PlanningSyncBadge'
import {
  resolveWeeklyAgendaPlanCardTone,
  weeklyAgendaPlanCardToneClasses,
} from '../weeklyAgendaPlanCardStatus'
import { WeeklyAgendaPlanCardMenu } from './WeeklyAgendaPlanCardMenu'

type WeeklyAgendaPlanCardProps = {
  order: number
  item: DraftPlanItem
  dragDisabled?: boolean
  overlay?: boolean
  canAlterConveyor?: boolean
  actionBusy?: boolean
  onPointTime?: () => void
  onComplete?: () => void
  onPrintTicket?: () => void
  onRemoveFromPlan?: () => void
}

export function WeeklyAgendaPlanCard(props: WeeklyAgendaPlanCardProps) {
  const { item, order } = props
  const tone = resolveWeeklyAgendaPlanCardTone({
    plannedMinutes: item.plannedMinutes,
    realizedMinutes: item.realizedMinutes ?? 0,
    activityOperationalStatus: item.activityOperationalStatus ?? null,
    syncStatus: item.syncStatus,
  })
  const statusLabel = resolvePlanningItemOperationalStatusLabel(item.activityOperationalStatus)
  const dragId = dragPlanId(item.localKey)

  const sortable = useSortable({
    id: dragId,
    disabled: props.dragDisabled || props.overlay,
  })

  const style =
    props.overlay || sortable.isDragging
      ? undefined
      : {
          transform: CSS.Transform.toString(sortable.transform),
          transition: sortable.transition,
        }

  const interactive =
    props.onPointTime &&
    props.onComplete &&
    props.onPrintTicket &&
    props.onRemoveFromPlan &&
    !props.overlay

  return (
    <article
      ref={props.overlay ? undefined : sortable.setNodeRef}
      style={style}
      data-testid={`weekly-agenda-plan-card-${item.localKey}`}
      className={[
        'group relative rounded-lg border p-2.5 text-[11px] ring-1',
        weeklyAgendaPlanCardToneClasses(tone),
        sortable.isDragging && !props.overlay ? 'opacity-0' : '',
        props.overlay ? 'cursor-grabbing shadow-xl ring-sgp-gold/30' : '',
      ].join(' ')}
      {...(props.overlay ? {} : { ...sortable.attributes })}
    >
      <div
        className={[
          'min-w-0',
          interactive ? 'cursor-grab pr-6 active:cursor-grabbing' : 'pr-6',
        ].join(' ')}
        {...(props.overlay ? {} : sortable.listeners)}
      >
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

      {interactive ? (
        <WeeklyAgendaPlanCardMenu
          item={item}
          canAlterConveyor={props.canAlterConveyor ?? false}
          actionBusy={props.actionBusy ?? false}
          onPointTime={props.onPointTime!}
          onComplete={props.onComplete!}
          onPrintTicket={props.onPrintTicket!}
          onRemoveFromPlan={props.onRemoveFromPlan!}
        />
      ) : null}
    </article>
  )
}
