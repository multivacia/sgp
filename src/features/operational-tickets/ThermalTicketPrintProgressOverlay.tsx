import { ACTIVITY_TICKET_SILENT_PRINT_HINT } from './activityTicketPrintCopy'

type ThermalTicketPrintProgressOverlayProps = {
  open: boolean
  current: number
  total: number
  onCancel: () => void
}

export function ThermalTicketPrintProgressOverlay(props: ThermalTicketPrintProgressOverlayProps) {
  if (!props.open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal
      aria-live="polite"
      aria-labelledby="thermal-ticket-print-progress-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/[0.10] bg-sgp-app-panel-deep p-6 shadow-xl ring-1 ring-white/[0.06]">
        <h2
          id="thermal-ticket-print-progress-title"
          className="text-lg font-semibold text-slate-50"
        >
          Imprimindo tickets
        </h2>
        <p className="mt-3 text-sm text-slate-300">
          Imprimindo ticket {props.current} de {props.total}...
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Cada atividade é enviada em um job separado. O navegador pode abrir o diálogo de
          impressão para cada ticket.
        </p>
        <p className="mt-2 text-xs text-slate-400">{ACTIVITY_TICKET_SILENT_PRINT_HINT}</p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            className="sgp-cta-secondary rounded-lg px-4 py-2 text-sm"
            onClick={props.onCancel}
          >
            Cancelar fila
          </button>
        </div>
      </div>
    </div>
  )
}
