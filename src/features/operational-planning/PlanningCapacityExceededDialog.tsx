import { useEffect } from 'react'
import {
  formatPlanningCapacityAlertDetailLine,
  formatPlanningCapacityAlertSummary,
  formatPlanningCapacityDatePtBr,
  type PlanningCapacityExceededAlert,
} from './planningCapacityExceededDetect'

type Props = {
  open: boolean
  alerts: readonly PlanningCapacityExceededAlert[]
  onClose: () => void
}

export function PlanningCapacityExceededDialog({ open, alerts, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key === 'Escape') {
        ev.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || alerts.length === 0) return null

  const primary = alerts[0]!
  const titleId = 'planning-capacity-exceeded-title'

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-amber-400/25 bg-gradient-to-b from-sgp-app-panel/95 to-sgp-app-panel-deep/98 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] ring-1 ring-amber-400/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-heading text-lg font-bold tracking-tight text-slate-50">
            Capacidade diária ultrapassada
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {alerts.map((alert) => {
            const details = formatPlanningCapacityAlertDetailLine(alert)
            return (
              <div
                key={`${alert.collaboratorId}|${alert.date}`}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"
              >
                <p className="text-sm leading-relaxed text-slate-300">
                  {formatPlanningCapacityAlertSummary(alert)}
                </p>
                <dl className="mt-3 grid grid-cols-1 gap-1.5 text-[13px] sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Colaborador</dt>
                    <dd className="font-medium text-slate-100">{alert.collaboratorName}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Data</dt>
                    <dd className="font-medium text-slate-100">
                      {formatPlanningCapacityDatePtBr(alert.date)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Capacidade diária</dt>
                    <dd className="font-medium text-slate-100">{details.capacity}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Tempo planejado</dt>
                    <dd className="font-medium text-slate-100">{details.planned}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-slate-500">Excedente</dt>
                    <dd className="font-semibold text-amber-300">{details.excess}</dd>
                  </div>
                </dl>
              </div>
            )
          })}
        </div>

        {alerts.length === 1 ? null : (
          <p className="mt-3 text-[12px] text-slate-500">
            {alerts.length} células ultrapassaram a capacidade nesta ação.
          </p>
        )}

        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          Você pode continuar o planejamento normalmente.
        </p>

        {/* Mantém referência ao alerta principal para leitores de tela em caso de lista */}
        <span className="sr-only">
          {primary.collaboratorName} · {formatPlanningCapacityDatePtBr(primary.date)}
        </span>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-sgp-gold/35 bg-sgp-gold/15 px-4 py-2.5 text-sm font-bold text-sgp-gold-warm shadow-inner transition hover:border-sgp-gold/50 hover:bg-sgp-gold/[0.18]"
            autoFocus
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  )
}
