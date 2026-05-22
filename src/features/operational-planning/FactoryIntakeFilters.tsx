import type {
  FactoryIntakeExecutionFilter,
  FactoryIntakeFilters,
  FactoryIntakePeriodFilter,
  FactoryIntakeReviewFilter,
  FactoryIntakeSyncFilter,
} from './factoryIntakeGrouping'

type FactoryIntakeFiltersBarProps = {
  filters: FactoryIntakeFilters
  onChange: (next: FactoryIntakeFilters) => void
  filtersActive: boolean
  onClear: () => void
}

const fieldClass =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-slate-100'

export function FactoryIntakeFiltersBar(props: FactoryIntakeFiltersBarProps) {
  const { filters, onChange } = props

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] text-slate-500" htmlFor="factory-intake-search">
          Buscar esteira, tarefa, setor ou atividade
        </label>
        <input
          id="factory-intake-search"
          className={`mt-1 ${fieldClass}`}
          placeholder="Buscar…"
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[11px] text-slate-500" htmlFor="factory-intake-review">
            Revisão
          </label>
          <select
            id="factory-intake-review"
            className={`mt-1 ${fieldClass}`}
            value={filters.review}
            onChange={(e) =>
              onChange({
                ...filters,
                review: e.target.value as FactoryIntakeReviewFilter,
              })
            }
          >
            <option value="all">Todos</option>
            <option value="with_review">Com revisão</option>
            <option value="without_review">Sem revisão</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] text-slate-500" htmlFor="factory-intake-period">
            Período sugerido
          </label>
          <select
            id="factory-intake-period"
            className={`mt-1 ${fieldClass}`}
            value={filters.period}
            onChange={(e) =>
              onChange({
                ...filters,
                period: e.target.value as FactoryIntakePeriodFilter,
              })
            }
          >
            <option value="all">Todos</option>
            <option value="this_week">Com data nesta semana</option>
            <option value="no_date">Sem data sugerida</option>
            <option value="overdue">Atrasados (antes desta semana)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] text-slate-500" htmlFor="factory-intake-sync">
            Sincronização
          </label>
          <select
            id="factory-intake-sync"
            className={`mt-1 ${fieldClass}`}
            value={filters.sync}
            onChange={(e) =>
              onChange({
                ...filters,
                sync: e.target.value as FactoryIntakeSyncFilter,
              })
            }
          >
            <option value="all">Todos</option>
            <option value="with_sync_pending">Com pendência de sincronização</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] text-slate-500" htmlFor="factory-intake-execution">
            Execução parcial
          </label>
          <select
            id="factory-intake-execution"
            className={`mt-1 ${fieldClass}`}
            value={filters.execution}
            onChange={(e) =>
              onChange({
                ...filters,
                execution: e.target.value as FactoryIntakeExecutionFilter,
              })
            }
          >
            <option value="all">Todos</option>
            <option value="partially_executed">Com apontamento parcial</option>
          </select>
        </div>
      </div>

      {props.filtersActive ? (
        <button
          type="button"
          className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/[0.07]"
          onClick={props.onClear}
        >
          Limpar filtros
        </button>
      ) : null}
    </div>
  )
}
