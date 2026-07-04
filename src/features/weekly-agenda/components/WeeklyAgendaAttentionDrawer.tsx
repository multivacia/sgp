import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { PlanningSyncIssueListItem } from '../../../domain/operational-planning/planningSyncIssues'
import type { OperationalPlanningExecutionOutsidePlanEntry } from '../../../domain/operational-planning/operational-planning.types'
import { PlanningExecutionOutsidePlanPanel } from '../../operational-planning/PlanningExecutionOutsidePlanPanel'
import { PlanningSyncIssuesPanel } from '../../operational-planning/PlanningSyncIssuesPanel'

type WeeklyAgendaAttentionDrawerProps = {
  open: boolean
  onClose: () => void
  syncItems: readonly PlanningSyncIssueListItem[]
  outsidePlanEntries: readonly OperationalPlanningExecutionOutsidePlanEntry[]
  outsidePlanTotalMinutes: number
  onWeekApplied?: (message: string) => void | Promise<void>
}

export function WeeklyAgendaAttentionDrawer(props: WeeklyAgendaAttentionDrawerProps) {
  const {
    open,
    onClose,
    syncItems,
    outsidePlanEntries,
    outsidePlanTotalMinutes,
    onWeekApplied,
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
    <div className="fixed inset-0 z-[55]" data-testid="weekly-agenda-attention-drawer">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        aria-label="Fechar painel de atenção"
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 z-[56] flex h-dvh w-full max-w-lg flex-col overflow-hidden border-l border-white/[0.09] bg-gradient-to-b from-sgp-navy/98 via-sgp-app-panel to-sgp-navy-deep shadow-[0_0_60px_-12px_rgba(0,0,0,0.85)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekly-agenda-attention-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-white/[0.07] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="weekly-agenda-attention-title"
                className="text-[15px] font-semibold text-slate-50"
              >
                Itens de atenção
              </h2>
              <p className="mt-1 text-[12px] text-slate-500">
                Divergências de sincronização e apontamentos fora do plano semanal.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] text-slate-200 hover:bg-white/[0.08]"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-5 py-5">
          <PlanningSyncIssuesPanel items={syncItems} onWeekApplied={onWeekApplied} />
          <div className="border-t border-white/[0.06] pt-8">
            <PlanningExecutionOutsidePlanPanel
              entries={outsidePlanEntries}
              summaryTotalMinutes={outsidePlanTotalMinutes}
            />
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
