import { createPortal } from 'react-dom'

type WeeklyAgendaBacklogFabProps = {
  count: number
  onClick: () => void
}

export function WeeklyAgendaBacklogFab(props: WeeklyAgendaBacklogFabProps) {
  const { count, onClick } = props
  const showPulse = count >= 3

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60]">
      <div className="pointer-events-auto relative">
        {showPulse ? (
          <span
            className="pointer-events-none absolute inset-[-6px] animate-ping rounded-full border border-sgp-gold/40 opacity-75"
            aria-hidden
          />
        ) : null}
        <button
          type="button"
          className="relative flex size-[60px] flex-col items-center justify-center rounded-full border border-sgp-gold/35 bg-sgp-gold/15 text-slate-50 shadow-[0_12px_30px_rgba(0,0,0,0.5)] hover:bg-sgp-gold/25"
          title="Ver backlog operacional"
          aria-label={`Backlog operacional${count > 0 ? `, ${count} itens` : ''}`}
          data-testid="weekly-agenda-backlog-fab"
          onClick={onClick}
        >
          <span className="text-xl leading-none text-slate-100">+</span>
          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-200">
            Backlog
          </span>
          {count > 0 ? (
            <span
              className="absolute -right-1 -top-1 flex min-h-[22px] min-w-[22px] items-center justify-center rounded-full border-2 border-sgp-navy-deep bg-rose-600 px-1 text-[11px] font-bold tabular-nums text-white"
              data-testid="weekly-agenda-backlog-fab-badge"
            >
              {count}
            </span>
          ) : null}
        </button>
      </div>
    </div>,
    document.body,
  )
}
