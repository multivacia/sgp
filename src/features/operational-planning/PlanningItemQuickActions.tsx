import { Link } from 'react-router-dom'
import {
  canCompletePlanningStep,
  canPointTimeOnPlanningStep,
  canReopenPlanningStep,
  type PlanningCardActionItem,
} from './planningCardActions'

type PlanningItemQuickActionsProps = {
  item: PlanningCardActionItem
  canAlterConveyor: boolean
  actionBusy: boolean
  isPrinting?: boolean
  onPointTime: () => void
  onComplete: () => void
  onReopen: () => void
  onPrintTicket?: () => void
  className?: string
}

export function PlanningItemQuickActions(props: PlanningItemQuickActionsProps) {
  const { item } = props
  const showPointTime = canPointTimeOnPlanningStep(item.activityOperationalStatus)
  const showComplete = canCompletePlanningStep(
    item.activityOperationalStatus,
    props.canAlterConveyor,
  )
  const showReopen = canReopenPlanningStep(item.activityOperationalStatus, props.canAlterConveyor)
  const conveyorDetailTo = `/app/esteiras/${encodeURIComponent(item.conveyorId)}?activityNodeId=${encodeURIComponent(item.activityNodeId)}`

  return (
    <div
      className={[
        'flex flex-wrap gap-1 border-t border-white/[0.06] pt-2',
        props.className,
      ]
        .filter(Boolean)
        .join(' ')}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Link
        to={conveyorDetailTo}
        className="rounded border border-white/[0.08] px-1.5 py-0.5 text-[9px] font-medium text-slate-300 hover:bg-white/[0.06]"
        title="Abrir detalhe da esteira"
      >
        Ver esteira
      </Link>
      {showPointTime ? (
        <button
          type="button"
          className="rounded border border-white/[0.08] px-1.5 py-0.5 text-[9px] font-medium text-slate-300 hover:bg-white/[0.06] disabled:opacity-50"
          title="Apontar horas"
          disabled={props.actionBusy}
          onClick={(e) => {
            e.stopPropagation()
            props.onPointTime()
          }}
        >
          Apontar
        </button>
      ) : null}
      {showComplete ? (
        <button
          type="button"
          className="rounded border border-emerald-400/25 px-1.5 py-0.5 text-[9px] font-medium text-emerald-100 hover:bg-emerald-500/10 disabled:opacity-50"
          title="Concluir atividade"
          disabled={props.actionBusy}
          onClick={(e) => {
            e.stopPropagation()
            props.onComplete()
          }}
        >
          Concluir
        </button>
      ) : null}
      {showReopen ? (
        <button
          type="button"
          className="rounded border border-amber-400/25 px-1.5 py-0.5 text-[9px] font-medium text-amber-100 hover:bg-amber-500/10 disabled:opacity-50"
          title="Reabrir atividade"
          disabled={props.actionBusy}
          onClick={(e) => {
            e.stopPropagation()
            props.onReopen()
          }}
        >
          Reabrir
        </button>
      ) : null}
      {props.onPrintTicket ? (
        <button
          type="button"
          className="rounded border border-white/[0.08] px-1.5 py-0.5 text-[9px] font-medium text-slate-300 hover:bg-white/[0.06] disabled:opacity-50"
          title="Imprimir ticket térmico desta atividade"
          disabled={props.actionBusy || props.isPrinting}
          onClick={(e) => {
            e.stopPropagation()
            props.onPrintTicket?.()
          }}
        >
          Imprimir ticket
        </button>
      ) : null}
    </div>
  )
}
