import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  buildPlanningSyncDifferenceComparison,
  hasApplyableConveyorPlanSyncDifferences,
  type PlanningSyncIssueListItem,
} from '../../domain/operational-planning/planningSyncIssues'
import { applyConveyorPlanValuesToWeekItem } from '../../services/operational-planning/operationalPlanningApiService'
import { isBlockingSeverity, reportClientError } from '../../lib/errors'
import { useSgpErrorSurface } from '../../lib/errors/SgpErrorPresentation'

const APPLY_CONFIRM_MESSAGE =
  'Esta ação atualizará o item no Planejamento da Fábrica com os valores do Plano da Esteira. Apontamentos e execução real não serão alterados.\n\nDeseja continuar?'

type PlanningSyncIssuesPanelProps = {
  items: readonly PlanningSyncIssueListItem[]
  onWeekApplied?: (message: string) => void | Promise<void>
}

export function PlanningSyncIssuesPanel(props: PlanningSyncIssuesPanelProps) {
  const { items, onWeekApplied } = props
  const { presentBlocking } = useSgpErrorSurface()
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [itemError, setItemError] = useState<{ itemId: string; message: string } | null>(null)

  async function handleApply(item: PlanningSyncIssueListItem) {
    if (!hasApplyableConveyorPlanSyncDifferences(item.syncDifferences ?? [])) return
    if (!window.confirm(APPLY_CONFIRM_MESSAGE)) return

    setApplyingId(item.id)
    setItemError(null)
    try {
      await applyConveyorPlanValuesToWeekItem(item.id)
      await onWeekApplied?.('Valores do plano da esteira aplicados ao planejamento da fábrica.')
    } catch (e) {
      const n = reportClientError(e, {
        module: 'operational-planning',
        action: 'apply_conveyor_plan_sync',
        entityId: item.id,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
      } else {
        setItemError({ itemId: item.id, message: n.userMessage })
      }
    } finally {
      setApplyingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[15px] font-semibold text-slate-100">Pendências de sincronização</h2>
        <p className="mt-1 text-[12px] text-slate-500">
          Itens encaixados cujo plano da esteira diverge do planejamento semanal. Revise manualmente
          — nada é alterado automaticamente.
        </p>
        <p className="mt-2 text-[12px] font-medium text-amber-200/90">
          {items.length === 0
            ? 'Nenhuma pendência nesta semana.'
            : `${items.length} item(ns) com divergência`}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-3 py-4 text-center text-[13px] text-slate-500">
          Todos os itens vinculados estão sincronizados com o plano da esteira.
        </p>
      ) : (
        <ul className="space-y-3 lg:max-h-[calc(100vh-280px)] lg:overflow-y-auto lg:pr-1">
          {items.map((item) => {
            const canApply = hasApplyableConveyorPlanSyncDifferences(item.syncDifferences ?? [])
            const isApplying = applyingId === item.id
            const localError = itemError?.itemId === item.id ? itemError.message : null

            return (
              <li
                key={item.id}
                className="rounded-xl border border-amber-400/20 bg-amber-500/[0.06] p-3 text-[12px] ring-1 ring-amber-500/10"
              >
                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  {item.conveyorTitle}
                </p>
                <p className="mt-0.5 truncate text-[13px] font-semibold text-slate-50">
                  {item.activityTitle}
                </p>
                <p className="mt-1 truncate text-[11px] text-slate-500">
                  {item.sectorTitle} · {item.taskTitle}
                </p>

                <div className="mt-2 space-y-2">
                  {(item.syncDifferences ?? []).map((diff) => {
                    const cmp = buildPlanningSyncDifferenceComparison(diff)
                    return (
                      <div
                        key={diff.code}
                        className="rounded-lg border border-white/[0.06] bg-black/20 px-2 py-1.5"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200/80">
                          {cmp.fieldLabel}
                        </p>
                        <div className="mt-1 grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <p className="text-slate-500">Plano da esteira</p>
                            <p className="font-medium text-slate-100">{cmp.planDisplay}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Fábrica</p>
                            <p className="font-medium text-slate-100">{cmp.factoryDisplay}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {localError ? (
                  <p className="mt-2 text-[11px] text-rose-300/95" role="alert">
                    {localError}
                  </p>
                ) : null}

                {canApply ? (
                  <button
                    type="button"
                    disabled={isApplying}
                    className="mt-3 w-full rounded-lg border border-violet-400/30 bg-violet-500/15 px-2 py-1.5 text-[11px] font-semibold text-violet-100 hover:bg-violet-500/25 disabled:opacity-50"
                    onClick={() => void handleApply(item)}
                  >
                    {isApplying ? 'Aplicando…' : 'Aplicar plano da esteira'}
                  </button>
                ) : null}

                {item.conveyorOperationalPlanItemId && item.conveyorId ? (
                  <Link
                    to={`/app/esteiras/${item.conveyorId}`}
                    className="mt-2 inline-block text-[11px] font-medium text-violet-300 hover:text-violet-200"
                  >
                    Ver plano da esteira
                  </Link>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}