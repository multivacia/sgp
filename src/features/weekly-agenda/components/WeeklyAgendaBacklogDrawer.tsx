import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { OperationalPlanningBacklogItem } from '../../../domain/operational-planning/operational-planning.types'
import { WeeklyAgendaBacklogCard } from './WeeklyAgendaBacklogCard'

type WeeklyAgendaBacklogDrawerProps = {
  open: boolean
  onClose: () => void
  items: readonly OperationalPlanningBacklogItem[]
  searchQuery: string
  onSearchChange: (q: string) => void
  onSearchSubmit: () => void
  emptyMessage: string | null
  loading?: boolean
}

export function WeeklyAgendaBacklogDrawer(props: WeeklyAgendaBacklogDrawerProps) {
  const {
    open,
    onClose,
    items,
    searchQuery,
    onSearchChange,
    onSearchSubmit,
    emptyMessage,
    loading = false,
  } = props

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[50] flex items-end justify-center bg-slate-950/55"
      data-testid="weekly-agenda-backlog-drawer"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Fechar backlog"
        onClick={onClose}
      />
      <section
        className="relative z-[51] flex max-h-[78vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[20px] border border-b-0 border-white/[0.08] bg-gradient-to-b from-sgp-app-panel to-sgp-navy-deep shadow-[0_-12px_40px_rgba(0,0,0,0.45)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekly-agenda-backlog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-white/15" aria-hidden />
        <header className="shrink-0 px-5 pb-3 pt-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="weekly-agenda-backlog-title" className="text-[15px] font-semibold text-slate-50">
              Backlog operacional
            </h2>
            <button
              type="button"
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] text-slate-200 hover:bg-white/[0.08]"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
          <p className="mt-1 text-[12px] text-slate-500">
            Somente leitura — arrastar para a grade chega no PR-4.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-600"
              placeholder="Buscar esteira / atividade…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearchSubmit()
              }}
              data-testid="weekly-agenda-backlog-search"
            />
            <button
              type="button"
              className="shrink-0 rounded-xl border border-white/[0.10] bg-white/[0.06] px-3 py-2 text-[13px] text-slate-100"
              onClick={onSearchSubmit}
            >
              Buscar
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          {loading ? (
            <p className="py-6 text-center text-[13px] text-slate-500" role="status">
              Carregando backlog…
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <WeeklyAgendaBacklogCard key={item.activityNodeId} item={item} />
              ))}
              {emptyMessage ? (
                <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-4 text-center text-[13px] text-slate-500">
                  {emptyMessage}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  )
}
