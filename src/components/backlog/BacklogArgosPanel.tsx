import type { ArgosHealthBacklogFilter } from '../../domain/conveyors/conveyorHealth.types'
import type { ArgosHealthSummaryOverview } from '../../domain/conveyors/conveyorHealthBacklog'
import { SHOW_ARGOS_PANEL_FILTERS } from '../../lib/backlog/backlogUiFlags'

type Props = {
  argosFilter: ArgosHealthBacklogFilter
  onArgosFilterChange: (filter: ArgosHealthBacklogFilter) => void
  overview: ArgosHealthSummaryOverview
}

export function BacklogArgosPanel({
  argosFilter,
  onArgosFilterChange,
  overview,
}: Props) {
  if (!SHOW_ARGOS_PANEL_FILTERS) return null

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => onArgosFilterChange('all')}
          className={`rounded-full border px-3 py-1.5 ${
            argosFilter === 'all'
              ? 'border-sgp-blue-bright/45 bg-sgp-blue-bright/15 text-slate-100'
              : 'border-white/12 bg-white/[0.03] text-slate-300'
          }`}
        >
          ARGOS: Todas
        </button>
        <button
          type="button"
          onClick={() => onArgosFilterChange('with_analysis')}
          className={`rounded-full border px-3 py-1.5 ${
            argosFilter === 'with_analysis'
              ? 'border-sgp-blue-bright/45 bg-sgp-blue-bright/15 text-slate-100'
              : 'border-white/12 bg-white/[0.03] text-slate-300'
          }`}
        >
          ARGOS: Com análise
        </button>
        <button
          type="button"
          onClick={() => onArgosFilterChange('without_analysis')}
          className={`rounded-full border px-3 py-1.5 ${
            argosFilter === 'without_analysis'
              ? 'border-sgp-blue-bright/45 bg-sgp-blue-bright/15 text-slate-100'
              : 'border-white/12 bg-white/[0.03] text-slate-300'
          }`}
        >
          ARGOS: Sem análise
        </button>
        <button
          type="button"
          onClick={() => onArgosFilterChange('risk_low')}
          className={`rounded-full border px-3 py-1.5 ${
            argosFilter === 'risk_low'
              ? 'border-sgp-blue-bright/45 bg-sgp-blue-bright/15 text-slate-100'
              : 'border-white/12 bg-white/[0.03] text-slate-300'
          }`}
        >
          ARGOS: Risco baixo
        </button>
        <button
          type="button"
          onClick={() => onArgosFilterChange('risk_medium')}
          className={`rounded-full border px-3 py-1.5 ${
            argosFilter === 'risk_medium'
              ? 'border-sgp-blue-bright/45 bg-sgp-blue-bright/15 text-slate-100'
              : 'border-white/12 bg-white/[0.03] text-slate-300'
          }`}
        >
          ARGOS: Risco médio
        </button>
        <button
          type="button"
          onClick={() => onArgosFilterChange('risk_high_or_critical')}
          className={`rounded-full border px-3 py-1.5 ${
            argosFilter === 'risk_high_or_critical'
              ? 'border-sgp-blue-bright/45 bg-sgp-blue-bright/15 text-slate-100'
              : 'border-white/12 bg-white/[0.03] text-slate-300'
          }`}
        >
          ARGOS: Alto/crítico
        </button>
        <button
          type="button"
          onClick={() => onArgosFilterChange('health_attention')}
          className={`rounded-full border px-3 py-1.5 ${
            argosFilter === 'health_attention'
              ? 'border-sgp-blue-bright/45 bg-sgp-blue-bright/15 text-slate-100'
              : 'border-white/12 bg-white/[0.03] text-slate-300'
          }`}
        >
          ARGOS: Saúde atenção
        </button>
        <button
          type="button"
          onClick={() => onArgosFilterChange('health_critical')}
          className={`rounded-full border px-3 py-1.5 ${
            argosFilter === 'health_critical'
              ? 'border-sgp-blue-bright/45 bg-sgp-blue-bright/15 text-slate-100'
              : 'border-white/12 bg-white/[0.03] text-slate-300'
          }`}
        >
          ARGOS: Saúde crítica
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-300">
        <span className="rounded-lg border border-white/12 bg-white/[0.03] px-3 py-1.5">
          Com análise ARGOS: {overview.withAnalysis}
        </span>
        <span className="rounded-lg border border-white/12 bg-white/[0.03] px-3 py-1.5">
          Sem análise ARGOS: {overview.withoutAnalysis}
        </span>
        <span className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-1.5">
          Em atenção: {overview.healthAttention}
        </span>
        <span className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-1.5">
          Alto/crítico risco: {overview.riskHighOrCritical}
        </span>
        <span className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5">
          Saudáveis/baixo risco: {overview.riskLow}
        </span>
      </div>
    </>
  )
}
