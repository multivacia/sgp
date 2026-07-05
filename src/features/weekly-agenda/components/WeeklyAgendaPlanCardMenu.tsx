import { useEffect, useRef, useState } from 'react'
import {
  canCompletePlanningStep,
  canPointTimeOnPlanningStep,
  type PlanningCardActionItem,
} from '../../operational-planning/planningCardActions'

type WeeklyAgendaPlanCardMenuProps = {
  item: PlanningCardActionItem
  canAlterConveyor: boolean
  actionBusy: boolean
  onPointTime: () => void
  onComplete: () => void
  onPrintTicket: () => void
  onRemoveFromPlan: () => void
}

export function WeeklyAgendaPlanCardMenu(props: WeeklyAgendaPlanCardMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const showPointTime = canPointTimeOnPlanningStep(props.item.activityOperationalStatus)
  const showComplete = canCompletePlanningStep(
    props.item.activityOperationalStatus,
    props.canAlterConveyor,
  )

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="absolute right-1.5 top-1.5">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Ações da atividade"
        data-testid={`weekly-agenda-plan-card-menu-${props.item.activityNodeId}`}
        className="rounded-md border border-white/[0.08] bg-sgp-navy-deep/80 px-1.5 py-0.5 text-[12px] text-slate-300 hover:bg-white/[0.08] disabled:opacity-50"
        disabled={props.actionBusy}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        ⋯
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[11rem] rounded-lg border border-white/[0.10] bg-sgp-navy-deep py-1 shadow-lg"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {showPointTime ? (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-[12px] text-slate-200 hover:bg-white/[0.06] disabled:opacity-50"
              disabled={props.actionBusy}
              onClick={() => {
                setOpen(false)
                props.onPointTime()
              }}
            >
              Apontar tempo
            </button>
          ) : null}
          {showComplete ? (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-[12px] text-emerald-100 hover:bg-emerald-500/10 disabled:opacity-50"
              disabled={props.actionBusy}
              onClick={() => {
                setOpen(false)
                props.onComplete()
              }}
            >
              Concluir
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-[12px] text-slate-200 hover:bg-white/[0.06] disabled:opacity-50"
            disabled={props.actionBusy}
            onClick={() => {
              setOpen(false)
              props.onPrintTicket()
            }}
          >
            Imprimir ticket
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-[12px] text-rose-100 hover:bg-rose-500/10 disabled:opacity-50"
            disabled={props.actionBusy}
            onClick={() => {
              setOpen(false)
              props.onRemoveFromPlan()
            }}
          >
            Remover do plano
          </button>
        </div>
      ) : null}
    </div>
  )
}
