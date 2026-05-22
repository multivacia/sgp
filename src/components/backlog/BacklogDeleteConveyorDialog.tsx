import type { BacklogRow } from '../../mocks/backlog'

type Props = {
  row: BacklogRow | null
  open: boolean
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function BacklogDeleteConveyorDialog({
  row,
  open,
  busy,
  onCancel,
  onConfirm,
}: Props) {
  if (!open || !row) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal
      aria-labelledby="backlog-delete-conveyor-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-gradient-to-b from-sgp-app-panel/95 to-sgp-app-panel-deep/98 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.05]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="backlog-delete-conveyor-title"
          className="font-heading text-lg font-bold tracking-tight text-slate-50"
        >
          Excluir esteira?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Esta ação removerá definitivamente a esteira{' '}
          <span className="font-medium text-slate-200">{row.ref}</span>
          {row.name ? (
            <>
              {' '}
              (<span className="text-slate-300">{row.name}</span>)
            </>
          ) : null}{' '}
          e sua estrutura. Só é permitido excluir esteiras que ainda estão no backlog.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-sgp-gold/30 hover:bg-white/[0.07] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-xl border border-rose-400/35 bg-rose-500/15 px-4 py-2.5 text-sm font-bold text-rose-100 transition hover:border-rose-400/50 hover:bg-rose-500/22 disabled:opacity-50"
          >
            {busy ? 'Excluindo…' : 'Excluir esteira'}
          </button>
        </div>
      </div>
    </div>
  )
}
