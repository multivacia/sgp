import { useMemo, useState } from 'react'
import type { ConveyorStructure } from '../../domain/conveyors/conveyor.types'
import {
  buildConveyorStepDisplayNameById,
  filterOperationalEvents,
  getOperationalActivityDisplayLine,
} from '../../domain/conveyors/conveyorOperationalEventsDisplay'
import { formatConveyorOperationalEvent } from '../../domain/conveyors/formatConveyorOperationalEvent'
import type { ConveyorOperationalEvent } from '../../domain/conveyors/conveyorOperationalEvents.types'
import type { OperationalEventTimelineFilterCategory } from '../../domain/conveyors/conveyorOperationalEvents.types'
import {
  filterOperationalEventsByCategory,
  getOperationalEventCategoryLabel,
  getSafeOperationalEventNotePreview,
  groupOperationalEventsByLocalDate,
} from '../../domain/conveyors/operationalEventTaxonomy'
import type { OperationalEventSeverity } from '../../domain/conveyors/conveyorOperationalEvents.types'

const MAX_EVENTS_LIMIT = 200

const FILTER_ORDER: OperationalEventTimelineFilterCategory[] = [
  'all',
  'delay',
  'completion',
  'reopen',
  'block',
  'pause',
  'note',
  'other',
]

function severityBorderClass(severity: OperationalEventSeverity): string {
  switch (severity) {
    case 'critical':
      return 'border-l-rose-500/85'
    case 'warning':
      return 'border-l-amber-500/75'
    case 'success':
      return 'border-l-emerald-500/75'
    default:
      return 'border-l-slate-500/55'
  }
}

function severityBgClass(severity: OperationalEventSeverity): string {
  switch (severity) {
    case 'critical':
      return 'bg-rose-500/[0.06]'
    case 'warning':
      return 'bg-amber-500/[0.06]'
    case 'success':
      return 'bg-emerald-500/[0.06]'
    default:
      return 'bg-white/[0.03]'
  }
}

type Props = {
  events: ConveyorOperationalEvent[]
  loading: boolean
  error: string | null
  structure: ConveyorStructure
  fetchLimit: number
  onLoadMore: () => void
}

export function ConveyorOperationalEventsTimeline({
  events,
  loading,
  error,
  structure,
  fetchLimit,
  onLoadMore,
}: Props) {
  const [filter, setFilter] = useState<OperationalEventTimelineFilterCategory>('all')

  const stepNames = useMemo(() => buildConveyorStepDisplayNameById(structure), [structure])

  const filtered = useMemo(() => filterOperationalEvents(events, filter), [events, filter])

  const dayGroups = useMemo(() => groupOperationalEventsByLocalDate(filtered), [filtered])

  const filterCounts = useMemo(() => {
    const out: Partial<Record<OperationalEventTimelineFilterCategory, number>> = {}
    for (const id of FILTER_ORDER) {
      if (id === 'all') out.all = events.length
      else out[id] = filterOperationalEventsByCategory(events, id).length
    }
    return out as Record<OperationalEventTimelineFilterCategory, number>
  }, [events])

  const canLoadMore = fetchLimit < MAX_EVENTS_LIMIT && events.length >= fetchLimit

  return (
    <section className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Eventos operacionais</p>
        <p className="text-sm text-slate-500">Histórico de mudanças relevantes da esteira.</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Filtrar eventos por categoria">
        {FILTER_ORDER.map((id) => {
          const count = filterCounts[id] ?? 0
          const active = filter === id
          const label = getOperationalEventCategoryLabel(id)
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(id)}
              className={[
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active
                  ? 'border-sgp-gold/50 bg-sgp-gold/15 text-sgp-gold'
                  : 'border-white/[0.1] bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200',
              ].join(' ')}
            >
              {label}
              <span className="ml-1 tabular-nums opacity-70">({count})</span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Carregando eventos operacionais…</p>
      ) : null}

      {error ? (
        <p className="mt-6 text-sm text-rose-300/95" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && events.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          Nenhum evento operacional registrado para esta esteira.
        </p>
      ) : null}

      {!loading && !error && events.length > 0 && filtered.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Nenhum evento encontrado para o filtro selecionado.</p>
      ) : null}

      {!loading && !error && events.length > 0 ? (
        <p className="mt-3 text-[11px] text-slate-600">Exibindo os eventos mais recentes.</p>
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <div className="mt-6 space-y-8">
          {dayGroups.map((group) => (
            <div key={group.dateKey}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{group.label}</h3>
              <div className="relative mt-3 pl-5">
                <div className="absolute bottom-0 left-[7px] top-1 w-px bg-white/[0.12]" aria-hidden />
                <ul className="space-y-3">
                  {group.events.map((ev) => {
                    const display = formatConveyorOperationalEvent(ev)
                    const activityLine = getOperationalActivityDisplayLine(ev, stepNames)
                    const notePreview = getSafeOperationalEventNotePreview(ev)
                    const borderAccent = severityBorderClass(display.severity)
                    const bg = severityBgClass(display.severity)

                    return (
                      <li key={ev.eventId} className="relative pl-4">
                        <span
                          className="absolute left-[5px] top-3 h-2 w-2 rounded-full bg-slate-500 ring-2 ring-slate-900/80"
                          aria-hidden
                        />
                        <div
                          className={`rounded-xl border border-white/[0.08] border-l-[3px] px-3 py-2.5 ${borderAccent} ${bg}`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex shrink-0 rounded border border-white/15 bg-black/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-200">
                                  {display.chipLabel}
                                </span>
                                <p className="text-sm font-semibold text-slate-100">{display.label}</p>
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-slate-400">{display.description}</p>
                              {notePreview ? (
                                <p className="mt-1 text-xs italic text-slate-500">
                                  Nota: {notePreview}
                                  {notePreview.length >= 500 ? '…' : ''}
                                </p>
                              ) : null}
                              <p className="mt-1.5 text-[11px] text-slate-500">
                                {new Date(ev.occurredAt).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                                <span className="text-slate-600"> · </span>
                                Fonte: {ev.source}
                                {activityLine ? (
                                  <>
                                    <span className="text-slate-600"> · </span>
                                    {activityLine}
                                  </>
                                ) : null}
                              </p>
                            </div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!loading && !error && canLoadMore ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-sgp-gold/35 hover:bg-white/[0.07]"
          >
            Carregar mais (até {Math.min(MAX_EVENTS_LIMIT, fetchLimit + 25)} eventos)
          </button>
        </div>
      ) : null}
    </section>
  )
}
