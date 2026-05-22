import { Link } from 'react-router-dom'
import type { OperationalPlanningWeekActivityItem } from '../../domain/operational-planning/operational-planning.types'
import { formatPlanningMinutes } from './planningBoardHelpers'
import {
  buildPlanningWeekActivityDescription,
  formatPlanningActivityKind,
  formatPlanningWeekActivityDateTime,
  type PlanningWeekActivityFilters,
} from './planningWeekActivity'

type PlanningWeekHistoryPanelProps = {
  items: readonly OperationalPlanningWeekActivityItem[]
  filters: PlanningWeekActivityFilters
  onFiltersChange: (next: PlanningWeekActivityFilters) => void
  errorMessage: string | null
  loading?: boolean
}

function kindIconClass(kind: OperationalPlanningWeekActivityItem['kind']): string {
  switch (kind) {
    case 'TIME_ENTRY':
      return 'border-sky-400/25 bg-sky-500/10 text-sky-100'
    case 'STEP_COMPLETED':
      return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
    case 'STEP_REOPENED':
      return 'border-violet-400/25 bg-violet-500/10 text-violet-100'
    default:
      return 'border-white/10 bg-white/5 text-slate-200'
  }
}

function HistoryFilters(props: {
  filters: PlanningWeekActivityFilters
  onFiltersChange: (next: PlanningWeekActivityFilters) => void
}) {
  const { filters, onFiltersChange } = props
  return (
    <div className="space-y-2">
      <input
        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-600"
        placeholder="Buscar esteira, atividade ou colaborador…"
        value={filters.q}
        onChange={(e) => onFiltersChange({ ...filters, q: e.target.value })}
      />
      <div className="flex flex-wrap gap-2">
        <select
          className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 py-2 text-[12px] text-slate-100"
          value={filters.kind}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              kind: e.target.value as PlanningWeekActivityFilters['kind'],
            })
          }
        >
          <option value="all">Todos os tipos</option>
          <option value="TIME_ENTRY">Apontamentos</option>
          <option value="STEP_COMPLETED">Conclusões</option>
          <option value="STEP_REOPENED">Reaberturas</option>
        </select>
        <label className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[12px] text-slate-300">
          <input
            type="checkbox"
            checked={filters.outsidePlanOnly}
            onChange={(e) =>
              onFiltersChange({ ...filters, outsidePlanOnly: e.target.checked })
            }
          />
          Fora do plano
        </label>
      </div>
    </div>
  )
}

function HistoryCardHeader({ entry }: { entry: OperationalPlanningWeekActivityItem }) {
  const person =
    entry.kind === 'TIME_ENTRY'
      ? entry.collaboratorName
      : entry.actorName ?? entry.collaboratorName

  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="font-medium text-slate-100">{entry.conveyorName}</p>
        <p className="mt-0.5 text-slate-400">
          {[entry.taskName, entry.areaName, entry.activityName].filter(Boolean).join(' · ')}
        </p>
      </div>
      <HistoryCardAside entry={entry} person={person} />
    </div>
  )
}

function HistoryCardAside({
  entry,
  person,
}: {
  entry: OperationalPlanningWeekActivityItem
  person: string | null | undefined
}) {
  return (
    <div className="shrink-0 text-right">
      <p className="text-[11px] text-slate-500">{formatPlanningWeekActivityDateTime(entry.occurredAt)}</p>
      {person ? <p className="mt-0.5 text-slate-300">{person}</p> : null}
      {entry.minutes != null && entry.kind === 'TIME_ENTRY' ? (
        <p className="mt-0.5 font-semibold tabular-nums text-sky-100">
          {formatPlanningMinutes(entry.minutes)}
        </p>
      ) : null}
    </div>
  )
}

function HistoryCardBadges({ entry }: { entry: OperationalPlanningWeekActivityItem }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span
        className={[
          'rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
          kindIconClass(entry.kind),
        ].join(' ')}
      >
        {formatPlanningActivityKind(entry.kind)}
      </span>
      {entry.outsidePlan === true ? (
        <span className="rounded-md border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-100">
          Fora do plano
        </span>
      ) : null}
      {entry.entryOrigin === 'UNASSIGNED_EXCEPTION' ? (
        <span className="rounded-md border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-100">
          Exceção
          {entry.exceptionJustification?.trim()
            ? ` — ${entry.exceptionJustification.trim()}`
            : null}
        </span>
      ) : null}
    </div>
  )
}

export function PlanningWeekHistoryPanel(props: PlanningWeekHistoryPanelProps) {
  const { items, filters, onFiltersChange, errorMessage, loading } = props

  return (
    <>
      <div>
        <h2 className="text-[15px] font-semibold text-slate-100">Histórico da semana</h2>
        <p className="mt-1 text-[12px] text-slate-500">
          Fatos operacionais registrados na semana selecionada.
        </p>
      </div>

      <HistoryFilters filters={filters} onFiltersChange={onFiltersChange} />

      {errorMessage ? (
        <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-100">
          {errorMessage}
        </p>
      ) : null}

      {loading ? (
        <p className="text-center text-[13px] text-slate-500">Carregando histórico…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-4 text-center text-[13px] text-slate-500">
          {errorMessage
            ? 'Histórico indisponível nesta semana.'
            : 'Nenhum fato operacional registrado nesta semana.'}
        </p>
      ) : (
        <ul className="relative space-y-0 lg:max-h-[calc(100vh-320px)] lg:overflow-y-auto lg:pr-1">
          <li
            className="pointer-events-none absolute bottom-2 left-[15px] top-2 w-px bg-white/[0.08]"
            aria-hidden
          />
          {items.map((entry) => (
            <li key={entry.id} className="relative flex gap-3 pb-4">
              <span
                className={[
                  'relative z-[1] mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold',
                  kindIconClass(entry.kind),
                ].join(' ')}
                title={formatPlanningActivityKind(entry.kind)}
              >
                {entry.kind === 'TIME_ENTRY' ? '⏱' : entry.kind === 'STEP_COMPLETED' ? '✓' : '↺'}
              </span>
              <article className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-[12px]">
                <HistoryCardHeader entry={entry} />
                <p className="mt-2 text-slate-300">{buildPlanningWeekActivityDescription(entry)}</p>
                <HistoryCardBadges entry={entry} />
                <Link
                  to={`/esteiras/${entry.conveyorId}`}
                  className="mt-2 inline-block text-[11px] font-medium text-sgp-gold/90 hover:text-sgp-gold"
                >
                  Ver esteira
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
