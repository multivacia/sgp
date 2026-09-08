import { CONVEYOR_EDIT_REASON_MODAL_COPY } from './conveyorEditSavePolicy'

type Props = {
  open: boolean
  busy: boolean
  reason: string
  reasonError: string | null
  submitError: string | null
  onReasonChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Modal único de justificativa para alteração de esteira fora do Backlog.
 */
export function ConveyorEditReasonDialog({
  open,
  busy,
  reason,
  reasonError,
  submitError,
  onReasonChange,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null
  const copy = CONVEYOR_EDIT_REASON_MODAL_COPY

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal
      aria-labelledby="conveyor-edit-reason-title"
      onClick={() => {
        if (!busy) onCancel()
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-gradient-to-b from-sgp-app-panel/95 to-sgp-app-panel-deep/98 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.05]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="conveyor-edit-reason-title"
          className="font-heading text-lg font-bold tracking-tight text-slate-50"
        >
          {copy.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{copy.description}</p>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {copy.fieldLabel}
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            maxLength={500}
            rows={3}
            disabled={busy}
            className="mt-2 w-full resize-y rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm normal-case text-slate-100 placeholder:text-slate-600 focus:border-sgp-gold/35 focus:outline-none focus:ring-1 focus:ring-sgp-gold/25 disabled:opacity-50"
            placeholder={copy.placeholder}
          />
        </label>
        {reasonError ? (
          <p className="mt-2 text-sm text-rose-300/95" role="alert">
            {reasonError}
          </p>
        ) : null}
        {submitError ? (
          <p className="mt-2 text-sm text-rose-300/95" role="alert">
            {submitError}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-sgp-gold/30 hover:bg-white/[0.07] disabled:opacity-50"
          >
            {copy.cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-xl border border-sgp-gold/35 bg-sgp-gold/10 px-4 py-2.5 text-sm font-bold text-sgp-gold-warm shadow-inner transition hover:border-sgp-gold/50 hover:bg-sgp-gold/[0.14] disabled:opacity-50"
          >
            {busy ? 'A salvar…' : copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
