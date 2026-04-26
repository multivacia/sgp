import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { PageCanvas } from '../../components/ui/PageCanvas'
import {
  OPERATIONAL_BUCKET_LABELS,
  parseFlexibleDeadlineToDate,
} from '../../lib/backlog/operationalBuckets'
import { formatHumanMinutes } from '../../lib/formatters'
import type { MyActivityItem } from '../../domain/my-activities/my-activities.types'
import type { OperationalJourneyData } from '../../domain/operational-journey/operational-journey.types'
import {
  fetchMyOperationalJourney,
  type OperationalJourneyQuery,
} from '../../services/operational-journey/operationalJourneyApiService'
import type { OperationalPeriodPreset } from '../../domain/operational-journey/operational-journey.types'
import {
  operationalLabels,
  periodPresetOptions,
} from '../../lib/operationalSemantics'
import {
  labelConveyorOperationalStatus,
  labelRoleInStep,
} from './minhasAtividadesLabels'
import { reportClientError } from '../../lib/errors'
import {
  resolveJourneyLoadUserMessage,
  transversalUxCopy,
} from '../../lib/transversalUxCopy'

function formatDeadlineLine(value: string | null): string | null {
  if (value == null || value.trim() === '') return null
  const d = parseFlexibleDeadlineToDate(value)
  if (d) {
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }
  return value.trim()
}

function formatPeriodLabel(fromIso: string, toIso: string): string {
  try {
    const a = new Date(fromIso)
    const b = new Date(toIso)
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '—'
    const df = a.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    const dt = b.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    return `${df} → ${dt}`
  } catch {
    return '—'
  }
}

function activityKey(item: MyActivityItem): string {
  return `${item.conveyorId}-${item.stepNodeId}`
}

function bucketBadgeClass(bucket: MyActivityItem['operationalBucket']): string {
  if (bucket === 'em_atraso') {
    return 'border-rose-400/35 bg-rose-500/12 text-rose-100 ring-1 ring-rose-500/20'
  }
  if (bucket === 'concluidas') {
    return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100/95 ring-1 ring-emerald-500/15'
  }
  return 'border-white/12 bg-white/[0.05] text-slate-300 ring-1 ring-white/[0.06]'
}

function apontamentoHref(stepNodeId: string, conveyorId: string): string {
  const q = new URLSearchParams({
    conveyorId,
    from: 'jornada',
  })
  return `/app/apontamento/${encodeURIComponent(stepNodeId)}?${q.toString()}`
}

function esteiraDetalheHref(conveyorId: string): string {
  const q = new URLSearchParams({ from: 'jornada' })
  return `/app/esteiras/${encodeURIComponent(conveyorId)}?${q.toString()}`
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-slate-300">
      {children}
    </span>
  )
}

function JornadaSkeleton() {
  return (
    <div className="mt-6 space-y-6 animate-pulse" aria-hidden>
      <div className="h-36 rounded-2xl bg-white/[0.06]" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-7 w-24 rounded-full bg-white/[0.06]" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 rounded-2xl bg-white/[0.05]" />
        ))}
      </div>
    </div>
  )
}

function JourneyActivityCard({ item }: { item: MyActivityItem }) {
  const [open, setOpen] = useState(false)
  const deadlineLine = formatDeadlineLine(item.estimatedDeadline)
  const prev = item.plannedMinutes != null ? formatHumanMinutes(item.plannedMinutes) : '—'
  const real =
    item.realizedMinutes == null ? '—' : formatHumanMinutes(item.realizedMinutes)
  const canApontar = item.operationalBucket !== 'concluidas'

  return (
    <li className="rounded-xl border border-white/[0.08] bg-white/[0.03] shadow-inner ring-1 ring-white/[0.04]">
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${bucketBadgeClass(
                item.operationalBucket,
              )}`}
            >
              {OPERATIONAL_BUCKET_LABELS[item.operationalBucket]}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {labelRoleInStep(item.roleInStep)}
            </span>
          </div>
          <p className="font-heading text-sm font-semibold leading-snug text-white">{item.stepName}</p>
          <p className="text-xs text-slate-400">
            <span className="font-medium text-sgp-blue-bright">{item.conveyorCode ?? '—'}</span>
            <span className="text-slate-500"> · </span>
            <span className="text-slate-300">{item.conveyorName}</span>
          </p>
          <p className="text-[11px] tabular-nums text-slate-500">
            Previsto: <span className="text-slate-300">{prev}</span>
            <span className="text-slate-600"> · </span>
            Realizado (step): <span className="text-slate-300">{real}</span>
          </p>
          <button
            type="button"
            className="w-fit text-left text-[11px] font-semibold text-sgp-gold/90 hover:text-sgp-gold"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? '▼ Recolher detalhe' : '▸ Expandir detalhe'}
          </button>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          {canApontar ? (
            <Link
              to={apontamentoHref(item.stepNodeId, item.conveyorId)}
              className="sgp-cta-primary inline-flex justify-center px-4 py-2 text-center text-sm"
            >
              Apontar
            </Link>
          ) : (
            <span className="rounded-lg border border-white/[0.08] px-3 py-2 text-center text-xs text-slate-500">
              Concluída
            </span>
          )}
          <Link
            to={esteiraDetalheHref(item.conveyorId)}
            className="sgp-cta-secondary inline-flex justify-center px-3 py-1.5 text-center text-xs"
          >
            Ver esteira
          </Link>
        </div>
      </div>
      {open ? (
        <div className="border-t border-white/[0.06] bg-black/20 px-3 py-3 text-xs text-slate-400">
          <p>
            <span className="text-slate-500">Opção · Área:</span>{' '}
            <span className="text-slate-200">
              {item.optionName} · {item.areaName}
            </span>
          </p>
          <p className="mt-1">
            <span className="text-slate-500">Esteira:</span>{' '}
            <span className="text-slate-300">{labelConveyorOperationalStatus(item.conveyorStatus)}</span>
            {deadlineLine ? (
              <>
                <span className="text-slate-600"> · </span>
                <span className="text-slate-500">Prazo:</span>{' '}
                <span className="text-slate-300">{deadlineLine}</span>
              </>
            ) : null}
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            {operationalLabels.previstoEstrutural}: {prev} · {operationalLabels.minutosApontadosAcumulado}{' '}
            (step): {real}
          </p>
        </div>
      ) : null}
    </li>
  )
}

function ActivityColumn({
  title,
  hint,
  items,
  emptyLabel,
}: {
  title: string
  hint: string
  items: MyActivityItem[]
  emptyLabel: string
}) {
  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 ring-1 ring-white/[0.03]">
      <h2 className="font-heading text-sm font-semibold tracking-tight text-white">{title}</h2>
      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{hint}</p>
      {items.length === 0 ? (
        <p className="mt-4 flex-1 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="mt-4 flex flex-1 flex-col gap-2.5">
          {items.map((item) => (
            <JourneyActivityCard key={activityKey(item)} item={item} />
          ))}
        </ul>
      )}
    </section>
  )
}

export function JornadaPage() {
  const { pathname } = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const periodPresetRaw = searchParams.get('periodPreset')?.trim() || '7d'
  const periodPreset = (
    ['7d', '15d', '30d', 'month', 'custom'].includes(periodPresetRaw)
      ? periodPresetRaw
      : '7d'
  ) as OperationalPeriodPreset
  const periodFrom = searchParams.get('periodFrom')?.trim() || ''
  const periodTo = searchParams.get('periodTo')?.trim() || ''
  const conveyorFilter = searchParams.get('conveyorId')?.trim() || ''

  const [journey, setJourney] = useState<OperationalJourneyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadJourney = useCallback(async () => {
    if (periodPreset === 'custom' && (!periodFrom || !periodTo)) {
      setJourney(null)
      setError('Intervalo personalizado: indique início e fim.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const query: OperationalJourneyQuery = {
        limit: 20,
        periodPreset,
        ...(conveyorFilter ? { conveyorId: conveyorFilter } : {}),
        ...(periodPreset === 'custom' && periodFrom && periodTo
          ? { from: `${periodFrom}T00:00:00.000Z`, to: `${periodTo}T23:59:59.999Z` }
          : {}),
      }
      const data = await fetchMyOperationalJourney(query)
      setJourney(data)
    } catch (e) {
      setJourney(null)
      const n = reportClientError(e, {
        module: 'colaborador',
        action: 'jornada_load',
        route: pathname,
      })
      setError(resolveJourneyLoadUserMessage(e, n))
    } finally {
      setLoading(false)
    }
  }, [periodPreset, periodFrom, periodTo, conveyorFilter, pathname])

  useEffect(() => {
    void loadJourney()
  }, [loadJourney])

  const patchParams = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '') next.delete(k)
      else next.set(k, v)
    }
    setSearchParams(next, { replace: true })
  }

  const periodLabel = useMemo(() => {
    if (!journey) return '—'
    return formatPeriodLabel(journey.period.from, journey.period.to)
  }, [journey])

  /** Todas as alocações da jornada (abertas + em atraso), sem duplicar chave. */
  const allAssignments = useMemo(() => {
    if (!journey) return []
    const map = new Map<string, MyActivityItem>()
    for (const i of journey.assignmentsAtRisk) map.set(activityKey(i), i)
    for (const i of journey.assignmentsOpen) map.set(activityKey(i), i)
    return [...map.values()]
  }, [journey])

  const { pendentes, emAndamento, concluidas } = useMemo(() => {
    const p: MyActivityItem[] = []
    const e: MyActivityItem[] = []
    const c: MyActivityItem[] = []
    for (const item of allAssignments) {
      const b = item.operationalBucket
      if (b === 'no_backlog' || b === 'em_revisao') p.push(item)
      else if (b === 'em_andamento' || b === 'em_atraso') e.push(item)
      else if (b === 'concluidas') c.push(item)
    }
    return { pendentes: p, emAndamento: e, concluidas: c }
  }, [allAssignments])

  const conveyorChoices = useMemo(() => {
    if (!journey) return []
    const map = new Map<string, string>()
    const add = (id: string, name: string) => {
      if (!map.has(id)) map.set(id, name)
    }
    for (const x of journey.assignmentsOpen) add(x.conveyorId, x.conveyorName)
    for (const x of journey.assignmentsAtRisk) add(x.conveyorId, x.conveyorName)
    for (const x of journey.recentTimeEntries) add(x.conveyorId, x.conveyorName)
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [journey])

  const customIntervalInvalid =
    periodPreset === 'custom' && (!periodFrom || !periodTo)
  const canRetry =
    Boolean(error) && !customIntervalInvalid

  const openWorkCount = pendentes.length + emAndamento.length

  return (
    <PageCanvas>
      <div className="mx-auto max-w-6xl pb-12">
        <header className="rounded-2xl border border-white/[0.08] bg-gradient-to-r from-sgp-void via-sgp-navy-deep/80 to-sgp-void px-4 py-4 shadow-inner ring-1 ring-white/[0.04] sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
                <span className="h-px w-8 bg-gradient-to-r from-sgp-gold to-transparent" aria-hidden />
                Colaborador
              </p>
              <h1 className="sgp-page-title mt-2">
                Jornada do colaborador
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-300">
                O que tem para fazer, o que está em curso e o que já concluiu — com apontamento a um clique.{' '}
                {transversalUxCopy.navHintMinhasAtividades}
              </p>
              {journey?.collaborator.fullName ? (
                <p className="mt-2 text-xs text-slate-500">{journey.collaborator.fullName}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void loadJourney()}
              disabled={loading}
              className="sgp-cta-secondary h-fit shrink-0 self-start px-4 py-2 text-sm disabled:opacity-40"
            >
              {loading ? 'Atualizando…' : 'Atualizar'}
            </button>
          </div>

          {journey ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Chip>
                Previsto:{' '}
                <span className="text-slate-100">
                  {formatHumanMinutes(journey.load.plannedMinutesOnStepsSum)}
                </span>
              </Chip>
              <Chip>
                Realizado (período):{' '}
                <span className="text-slate-100">
                  {formatHumanMinutes(journey.execution.realizedMinutesInPeriod)}
                </span>
              </Chip>
              <Chip>
                Pendente (em aberto):{' '}
                <span className="text-slate-100">{openWorkCount}</span>
              </Chip>
              <Chip>
                Atividades: <span className="text-slate-100">{journey.load.assignmentCount}</span>
              </Chip>
            </div>
          ) : null}

          <details className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-300">
              Período e filtros
            </summary>
            <div className="mt-4 space-y-4 border-t border-white/[0.06] pt-4">
              <label className="flex max-w-xl flex-col gap-2 text-xs font-medium text-slate-400">
                Recorte temporal
                <select
                  className="sgp-input-app rounded-lg px-3 py-2.5 text-sm text-slate-200"
                  value={periodPreset}
                  onChange={(ev) => {
                    const v = ev.target.value as OperationalPeriodPreset
                    patchParams({
                      periodPreset: v === '7d' ? undefined : v,
                      periodFrom: undefined,
                      periodTo: undefined,
                    })
                  }}
                >
                  {periodPresetOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              {periodPreset === 'custom' && (
                <div className="flex max-w-xl flex-wrap gap-4">
                  <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
                    De (data)
                    <input
                      type="date"
                      className="sgp-input-app rounded-lg px-3 py-2 text-sm text-slate-200"
                      value={periodFrom}
                      onChange={(ev) => patchParams({ periodFrom: ev.target.value || undefined })}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
                    Até (data)
                    <input
                      type="date"
                      className="sgp-input-app rounded-lg px-3 py-2 text-sm text-slate-200"
                      value={periodTo}
                      onChange={(ev) => patchParams({ periodTo: ev.target.value || undefined })}
                    />
                  </label>
                </div>
              )}
              {journey && (
                <p className="text-xs text-slate-500">
                  Janela: <span className="text-slate-400">{periodLabel}</span>
                </p>
              )}
              {journey && conveyorChoices.length > 0 && (
                <label className="flex max-w-xl flex-col gap-2 text-xs font-medium text-slate-400">
                  Esteira (opcional)
                  <select
                    className="sgp-input-app rounded-lg px-3 py-2.5 text-sm text-slate-200"
                    value={conveyorFilter}
                    onChange={(ev) => {
                      const v = ev.target.value
                      patchParams({ conveyorId: v || undefined })
                    }}
                  >
                    <option value="">Todas</option>
                    {conveyorChoices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </details>
        </header>

        {error && (
          <div
            className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/[0.08] px-5 py-4 text-sm text-rose-100/95"
            role="alert"
          >
            <p>{error}</p>
            {canRetry ? (
              <p className="mt-2 text-xs text-rose-100/75">{transversalUxCopy.journeyRetryHint}</p>
            ) : null}
            {canRetry ? (
              <div className="mt-4">
                <button
                  type="button"
                  className="sgp-cta-secondary py-2 text-sm"
                  onClick={() => void loadJourney()}
                >
                  Tentar novamente
                </button>
              </div>
            ) : null}
          </div>
        )}

        {loading && !journey && !error ? <JornadaSkeleton /> : null}

        {journey ? (
          <>
            <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 ring-1 ring-white/[0.04]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Atividades (STEPs)
                </p>
                <p className="mt-1 font-heading text-2xl font-bold text-slate-50">
                  {journey.load.assignmentCount}
                </p>
              </div>
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.06] p-4 ring-1 ring-sky-500/15">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sky-200/80">
                  {operationalLabels.minutosApontadosPeriodo}
                </p>
                <p className="mt-1 font-heading text-2xl font-bold text-sky-100/95">
                  {formatHumanMinutes(journey.execution.realizedMinutesInPeriod)}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 ring-1 ring-emerald-500/15">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/85">
                  {operationalLabels.minutosApontadosAcumulado}
                </p>
                <p className="mt-1 font-heading text-2xl font-bold text-emerald-100/95">
                  {formatHumanMinutes(journey.execution.realizedMinutesTotal)}
                </p>
              </div>
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.07] p-4 ring-1 ring-rose-500/15">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-200/85">
                  Esteiras em atraso
                </p>
                <p className="mt-1 font-heading text-2xl font-bold text-rose-100/95">
                  {journey.risk.overdueCount}
                </p>
              </div>
            </section>

            <div className="mt-8 grid gap-4 md:grid-cols-3 md:items-start">
              <ActivityColumn
                title="Pendentes"
                hint="Aguardam arranque ou revisão antes da execução plena."
                items={pendentes}
                emptyLabel={
                  conveyorFilter
                    ? transversalUxCopy.journeyEmptyFiltered
                    : 'Nada neste estado no recorte atual.'
                }
              />
              <ActivityColumn
                title="Em andamento"
                hint="Em produção, pronta a libertar ou com pressão de prazo."
                items={emAndamento}
                emptyLabel={
                  conveyorFilter
                    ? transversalUxCopy.journeyEmptyFiltered
                    : 'Nenhuma atividade em execução neste recorte.'
                }
              />
              <ActivityColumn
                title="Concluídas"
                hint="Alocações já no bucket de conclusão da esteira."
                items={concluidas}
                emptyLabel={
                  conveyorFilter
                    ? transversalUxCopy.journeyEmptyFiltered
                    : 'Sem alocações concluídas listadas aqui — veja apontamentos abaixo.'
                }
              />
            </div>

            <section className="mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 ring-1 ring-white/[0.03]">
              <h2 className="font-heading text-sm font-semibold text-white">Apontamentos no período</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Lançamentos com data na janela (até {journey.query.limit ?? 20} registros).
              </p>
              {journey.recentTimeEntries.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  {conveyorFilter
                    ? transversalUxCopy.journeyEmptyFiltered
                    : 'Nenhum apontamento com data nesta janela. Experimente alargar o período ou apontar numa atividade em aberto.'}
                </p>
              ) : (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {journey.recentTimeEntries.map((e) => (
                    <li
                      key={e.id}
                      className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2.5 text-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-100">{e.conveyorName}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {e.stepName} · {formatHumanMinutes(e.minutes)}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-600">
                            {new Date(e.entryAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <Link
                          to={esteiraDetalheHref(e.conveyorId)}
                          className="shrink-0 text-xs font-semibold text-sgp-blue-bright hover:underline"
                        >
                          Esteira
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </PageCanvas>
  )
}
