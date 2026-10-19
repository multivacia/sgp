import type { BacklogRow } from '../../mocks/backlog'
import {
  backlogArchiveActionLabel,
  backlogArchiveDialogBody,
  backlogArchiveDialogTitle,
  backlogUnarchiveActionLabel,
  backlogUnarchiveDialogBody,
  backlogUnarchiveDialogTitle,
} from '../../lib/backlog/backlogCopy'
import type { BacklogArchiveAction } from './backlogRowActions'

type Props = {
  row: BacklogRow | null
  action: BacklogArchiveAction | null
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}

/** Confirmação simples de Arquivar/Desarquivar (mesmo padrão visual do diálogo de exclusão). */
export function BacklogArchiveConveyorDialog({
  row,
  action,
  busy,
  onCancel,
  onConfirm,
}: Props) {
  if (!row || !action) return null
  const isArchive = action === 'archive'
  const confirmLabel = isArchive ? backlogArchiveActionLabel : backlogUnarchiveActionLabel

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal
      aria-labelledby="backlog-archive-conveyor-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-gradient-to-b from-sgp-app-panel/95 to-sgp-app-panel-deep/98 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.05]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="backlog-archive-conveyor-title"
          className="font-heading text-lg font-bold tracking-tight text-slate-50"
        >
          {isArchive ? backlogArchiveDialogTitle : backlogUnarchiveDialogTitle}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Esteira <span className="font-medium text-slate-200">{row.ref}</span>
          {row.name ? (
            <>
              {' '}
              (<span className="text-slate-300">{row.name}</span>)
            </>
          ) : null}
          . {isArchive ? backlogArchiveDialogBody : backlogUnarchiveDialogBody}
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
            className="rounded-xl border border-sky-400/35 bg-sky-500/15 px-4 py-2.5 text-sm font-bold text-sky-100 transition hover:border-sky-400/50 hover:bg-sky-500/22 disabled:opacity-50"
          >
            {busy ? 'Salvando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
