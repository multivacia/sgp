import { formatPlanningMinutes } from '../../operational-planning/planningBoardHelpers'
import type { WeeklyAgendaSummaryStripModel } from '../weeklyAgendaSummary'

type WeeklyAgendaSummaryStripProps = {
  summary: WeeklyAgendaSummaryStripModel
}

export function WeeklyAgendaSummaryStrip(props: WeeklyAgendaSummaryStripProps) {
  const { summary } = props

  return (
    <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
      <div className="flex min-w-0 flex-1 gap-3 sm:min-w-[min(100%,36rem)]">
        <div className="min-w-0 flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Planejado</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-50">
            {formatPlanningMinutes(summary.plannedMinutes)}
          </p>
        </div>
        <div className="min-w-0 flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Realizado</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-50">
            {formatPlanningMinutes(summary.realizedMinutes)}
          </p>
        </div>
        <div className="min-w-0 flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Equipe no plano</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-50">
            {summary.collaboratorsCount}
          </p>
        </div>
      </div>

      {summary.attentionCount > 0 ? (
        <button
          type="button"
          disabled
          title="Painel de atenção disponível no próximo passo (PR-3)"
          className="inline-flex min-h-[4.25rem] items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-500/[0.08] px-4 py-3 text-left opacity-90 disabled:cursor-not-allowed"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-amber-300/30 bg-amber-500/15 text-[13px] font-bold tabular-nums text-amber-100">
            {summary.attentionCount}
          </span>
          <span>
            <span className="block text-[12px] font-semibold text-amber-100">Atenção</span>
            <span className="mt-0.5 block text-[11px] text-slate-400">
              {summary.syncDivergenceCount > 0
                ? `${summary.syncDivergenceCount} divergência(s)`
                : null}
              {summary.syncDivergenceCount > 0 && summary.outsidePlanEntriesCount > 0 ? ' · ' : null}
              {summary.outsidePlanEntriesCount > 0
                ? `${summary.outsidePlanEntriesCount} fora do plano`
                : null}
            </span>
          </span>
        </button>
      ) : (
        <div className="inline-flex min-h-[4.25rem] items-center rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[12px] text-slate-500">
          Nenhum item de atenção nesta semana.
        </div>
      )}
    </section>
  )
}
