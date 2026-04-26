import type { SupportTicketCreateResult } from './support.types'

type Props = {
  open: boolean
  result: SupportTicketCreateResult | null
  onClose: () => void
}

export function SupportTicketSuccessDialog({ open, result, onClose }: Props) {
  if (!open || !result) return null
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-sgp-app-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-heading text-lg font-bold text-slate-50">Chamado registrado com sucesso</h2>
        <p className="mt-2 text-sm text-slate-300">
          Protocolo: <span className="font-bold text-slate-100">{result.code}</span>
        </p>
        <div className="mt-4 space-y-1 text-xs text-slate-300">
          <p>E-mail: {result.notificationSummary.email}</p>
          <p>WhatsApp: {result.notificationSummary.whatsapp}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 rounded-xl border border-sgp-gold/35 bg-sgp-gold/10 px-4 py-2 text-sm font-bold text-sgp-gold-warm"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
