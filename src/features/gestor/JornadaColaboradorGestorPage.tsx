import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { PageCanvas } from '../../components/ui/PageCanvas'
import {
  OPERATIONAL_BUCKET_LABELS,
  parseFlexibleDeadlineToDate,
} from '../../lib/backlog/operationalBuckets'
import { formatHumanMinutes } from '../../lib/formatters'
import { useAuth } from '../../lib/use-auth'
import type { MyActivityItem } from '../../domain/my-activities/my-activities.types'
import type { OperationalJourneyData } from '../../domain/operational-journey/operational-journey.types'
import { fetchOperationalJourney } from '../../services/operational-journey/operationalJourneyApiService'
import { listAdminCollaborators } from '../../services/admin/adminCollaboratorsApiService'
import type { AdminCollaborator } from '../../domain/collaborators/collaborator.types'
import {
  labelConveyorOperationalStatus,
  labelRoleInStep,
} from '../colaborador/minhasAtividadesLabels'
import type { OperationalPeriodPreset } from '../../domain/operational-journey/operational-journey.types'
import {
  formatCoberturaTempoRatio,
  operationalLabels,
  periodPresetOptions,
} from '../../lib/operationalSemantics'
import { reportClientError } from '../../lib/errors'
import {
  resolveJourneyLoadUserMessage,
  transversalUxCopy,
} from '../../lib/transversalUxCopy'

function JornadaGestorSkeleton() {
  return (
    <div className="mt-8 max-w-5xl space-y-4 animate-pulse" aria-hidden>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-white/[0.06]" />
        ))}
      </div>
      <div className="h-36 rounded-xl bg-white/[0.05]" />
      <div className="h-36 rounded-xl bg-white/[0.05]" />
    </div>
  )
}

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

function bucketBadgeClass(bucket: MyActivityItem['operationalBucket']): string {
  if (bucket === 'em_atraso') {
    return 'border-rose-400/35 bg-rose-500/12 text-rose-100 ring-1 ring-rose-500/20'
  }
  if (bucket === 'concluidas') {
    return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100/95 ring-1 ring-emerald-500/15'
  }
  return 'border-white/12 bg-white/[0.05] text-slate-300 ring-1 ring-white/[0.06]'
}

function formatPeriodLabel(fromIso: string, toIso: string): string {
  try {
    const a = new Date(fromIso)
    const b = new Date(toIso)
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '—'
    const df = a.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    const dt = b.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    return `${df} → ${dt}`
  } catch {
    return '—'
  }
}

function AssignmentCard({
  item,
  apontamentoGestorHref,
  showApontamento,
}: {
  item: MyActivityItem
  apontamentoGestorHref: string | null
  showApontamento: boolean
}) {
  const deadlineLine = formatDeadlineLine(item.estimatedDeadline)
  return (
    <li className="sgp-surface-hover rounded-2xl border border-white/[0.08] border-l-4 border-l-sgp-blue-bright bg-gradient-to-br from-sgp-app-panel/95 to-sgp-app-panel-deep/90 p-5 pl-4 shadow-[var(--sgp-shadow-card-dark)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-heading text-sm font-bold text-sgp-blue-bright">
              {item.conveyorCode ?? '—'}
            </span>
            <span className="rounded-md border border-white/12 bg-white/[0.05] px-2 py-0.5 text-[11px] font-bold text-slate-300 ring-1 ring-white/[0.05]">
              {labelConveyorOperationalStatus(item.conveyorStatus)}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${bucketBadgeClass(
                item.operationalBucket,
              )}`}
            >
              {OPERATIONAL_BUCKET_LABELS[item.operationalBucket]}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                item.roleInStep === 'primary'
                  ? 'bg-amber-500/15 text-amber-100 ring-1 ring-amber-500/25'
                  : 'bg-white/[0.06] text-slate-300 ring-1 ring-white/[0.08]'
              }`}
            >
              {labelRoleInStep(item.roleInStep)}
            </span>
          </div>
          <h2 className="font-heading text-lg font-bold leading-snug text-slate-50">
            {item.conveyorName}
          </h2>
          <p className="text-sm font-medium text-slate-400">
            <span className="text-slate-500">Etapa · </span>
            {item.stepName}
          </p>
          <p className="text-xs text-slate-500">
            {item.optionName} · {item.areaName}
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs tabular-nums text-slate-500">
            <span>
              {operationalLabels.previstoEstrutural} (step):{' '}
              {item.plannedMinutes != null ? formatHumanMinutes(item.plannedMinutes) : '—'}
            </span>
            <span>
              {operationalLabels.minutosApontadosAcumulado} (neste step):{' '}
              {item.realizedMinutes == null
                ? '—'
                : formatHumanMinutes(item.realizedMinutes)}
            </span>
            {deadlineLine && (
              <span className="text-slate-400">Prazo: {deadlineLine}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
          <Link
            to={`/app/esteiras/${encodeURIComponent(item.conveyorId)}`}
            className="sgp-cta-secondary !px-4 !py-2.5 text-center text-sm"
          >
            Ver esteira
          </Link>
          {showApontamento && apontamentoGestorHref && (
            <Link to={apontamentoGestorHref} className="sgp-cta-primary !px-4 !py-2.5 text-center text-sm">
              Apontamento gerencial
            </Link>
          )}
        </div>
      </div>
    </li>
  )
}

export function JornadaColaboradorGestorPage() {
  const { pathname } = useLocation()
  const { canAny } = useAuth()
  const canApontamentoGestor = canAny([
    'time_entries.create_on_behalf',
    'time_entries.delete_any',
  ])

  const [searchParams, setSearchParams] = useSearchParams()
  const colaboradorId = searchParams.get('colaboradorId')?.trim() || ''
  const conveyorFilter = searchParams.get('conveyorId')?.trim() || ''
  const periodPresetRaw = searchParams.get('periodPreset')?.trim() || '7d'
  const periodPreset = (
    ['7d', '15d', '30d', 'month', 'custom'].includes(periodPresetRaw)
      ? periodPresetRaw
      : '7d'
  ) as OperationalPeriodPreset
  const periodFrom = searchParams.get('periodFrom')?.trim() || ''
  const periodTo = searchParams.get('periodTo')?.trim() || ''

  const [collabOptions, setCollabOptions] = useState<AdminCollaborator[]>([])
  const [collabsLoading, setCollabsLoading] = useState(true)
  const [journey, setJourney] = useState<OperationalJourneyData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setCollabsLoading(true)
      try {
        const { items } = await listAdminCollaborators({
          status: 'ACTIVE',
          deleted: 'exclude',
          limit: 250,
          offset: 0,
        })
        if (!cancelled) setCollabOptions(items)
      } catch {
        if (!cancelled) setCollabOptions([])
      } finally {
        if (!cancelled) setCollabsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const loadJourney = useCallback(async () => {
    if (!colaboradorId) {
      setJourney(null)
      setError(null)
      setLoading(false)
      return
    }
    if (periodPreset === 'custom' && (!periodFrom || !periodTo)) {
      setJourney(null)
      setError('Intervalo personalizado: indique as datas de início e fim.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchOperationalJourney(colaboradorId, {
        limit: 20,
        periodPreset,
        ...(conveyorFilter ? { conveyorId: conveyorFilter } : {}),
        ...(periodPreset === 'custom' && periodFrom && periodTo
          ? { from: `${periodFrom}T00:00:00.000Z`, to: `${periodTo}T23:59:59.999Z` }
          : {}),
      })
      setJourney(data)
    } catch (e) {
      setJourney(null)
      const n = reportClientError(e, {
        module: 'gestor',
        action: 'jornada_colaborador_load',
        route: pathname,
        entityId: colaboradorId || undefined,
      })
      setError(resolveJourneyLoadUserMessage(e, n))
    } finally {
      setLoading(false)
    }
  }, [colaboradorId, conveyorFilter, periodPreset, periodFrom, periodTo, pathname])

  useEffect(() => {
    void loadJourney()
  }, [loadJourney])

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

  const patchParams = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '') next.delete(k)
      else next.set(k, v)
    }
    setSearchParams(next, { replace: true })
  }

  return (
    <PageCanvas>
      <header className="sgp-header-card max-w-5xl">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
          <span className="h-px w-8 bg-gradient-to-r from-sgp-gold to-transparent" />
          Gestão operacional
        </p>
        <h1 className="sgp-page-title mt-3">Jornada por colaborador</h1>
        <p className="sgp-page-lead max-w-3xl">
          Carga, sinais de atraso, cobertura de tempo no escopo alocado e histórico de apontamentos.
          Recortes temporais padronizados (7 / 15 / 30 dias, mês UTC ou intervalo personalizado).{' '}
          {transversalUxCopy.navHintBacklog}
        </p>
      </header>

      <section className="mt-8 max-w-5xl rounded-xl border border-white/[0.08] bg-sgp-app-panel-deep/40 p-4 md:p-5">
        <label className="flex max-w-xl flex-col gap-2 text-xs font-medium text-slate-400">
          Colaborador
          <select
            className="rounded-lg border border-white/10 bg-sgp-app-panel-deep px-3 py-2.5 text-sm text-slate-200"
            value={colaboradorId}
            disabled={collabsLoading}
            onChange={(e) => {
              const v = e.target.value
              patchParams({
                colaboradorId: v || undefined,
                conveyorId: undefined,
              })
            }}
          >
            <option value="">Selecione…</option>
            {collabOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName.trim() || c.id}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-4 flex max-w-xl flex-col gap-2 text-xs font-medium text-slate-400">
          Recorte temporal
          <select
            className="rounded-lg border border-white/10 bg-sgp-app-panel-deep px-3 py-2.5 text-sm text-slate-200"
            value={periodPreset}
            onChange={(e) => {
              const v = e.target.value as OperationalPeriodPreset
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
          <div className="mt-4 flex max-w-xl flex-wrap gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
              De (data)
              <input
                type="date"
                className="rounded-lg border border-white/10 bg-sgp-app-panel-deep px-3 py-2 text-sm text-slate-200"
                value={periodFrom}
                onChange={(e) => patchParams({ periodFrom: e.target.value || undefined })}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-400">
              Até (data)
              <input
                type="date"
                className="rounded-lg border border-white/10 bg-sgp-app-panel-deep px-3 py-2 text-sm text-slate-200"
                value={periodTo}
                onChange={(e) => patchParams({ periodTo: e.target.value || undefined })}
              />
            </label>
          </div>
        )}
        {journey && conveyorChoices.length > 0 && (
          <label className="mt-4 flex max-w-xl flex-col gap-2 text-xs font-medium text-slate-400">
            Esteira (opcional)
            <select
              className="rounded-lg border border-white/10 bg-sgp-app-panel-deep px-3 py-2.5 text-sm text-slate-200"
              value={conveyorFilter}
              onChange={(e) => {
                const v = e.target.value
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
      </section>

      {error && (
        <div
          className="mt-6 max-w-5xl rounded-2xl border border-rose-500/30 bg-rose-500/[0.08] px-5 py-4 text-sm text-rose-100/95"
          role="alert"
        >
          <p>{error}</p>
          <p className="mt-2 text-xs text-rose-100/75">{transversalUxCopy.journeyRetryHint}</p>
          <div className="mt-4">
            <button
              type="button"
              className="sgp-cta-secondary !py-2 text-sm"
              onClick={() => void loadJourney()}
              disabled={loading || !colaboradorId}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {loading && colaboradorId ? <JornadaGestorSkeleton /> : null}

      {!loading && !error && journey && (
        <>
          <p className="mt-6 text-sm text-slate-500">
            {operationalLabels.minutosApontadosPeriodo} + histórico recente — intervalo:{' '}
            <span className="text-slate-300">
              {formatPeriodLabel(journey.period.from, journey.period.to)}
            </span>
            <span className="text-slate-600"> · </span>
            <span className="text-slate-500">preset: {journey.query.periodPreset}</span>
          </p>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sgp-panel sgp-panel-hover !p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Alocações (escopo)
              </p>
              <p className="mt-1 font-heading text-2xl font-bold text-slate-50">
                {journey.load.assignmentCount}
              </p>
            </div>
            <div className="sgp-panel sgp-panel-hover !p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {operationalLabels.previstoEstrutural} (soma STEPs)
              </p>
              <p className="mt-1 font-heading text-2xl font-bold text-slate-50">
                {formatHumanMinutes(journey.load.plannedMinutesOnStepsSum)}
              </p>
            </div>
            <div className="sgp-panel sgp-panel-hover !p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {operationalLabels.minutosApontadosPeriodo}
              </p>
              <p className="mt-1 font-heading text-2xl font-bold text-sgp-gold-warm">
                {formatHumanMinutes(journey.execution.realizedMinutesInPeriod)}
              </p>
            </div>
            <div className="sgp-panel sgp-panel-hover !p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {operationalLabels.minutosApontadosAcumulado} (escopo)
              </p>
              <p className="mt-1 font-heading text-2xl font-bold text-slate-50">
                {formatHumanMinutes(journey.execution.realizedMinutesTotal)}
              </p>
            </div>
          </section>

          <section className="mt-4 rounded-xl border border-sgp-gold/25 bg-sgp-gold/[0.06] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200/90">
              {operationalLabels.coberturaTempo}
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-amber-100">
              {formatCoberturaTempoRatio(journey.coberturaTempo.ratio)}
            </p>
            <p className="mt-2 text-xs text-amber-100/80">
              Numerador: soma dos apontamentos nos STEPs alocados. Denominador:{' '}
              {operationalLabels.previstoEstrutural} no mesmo conjunto de STEPs.{' '}
              {journey.coberturaTempo.ratio === null
                ? 'Não aplicável se o previsto estrutural no escopo for ≤ 0.'
                : `${formatHumanMinutes(journey.coberturaTempo.realizadoMinutosAcumuladoEscopo)} / ${formatHumanMinutes(journey.coberturaTempo.previstoMinutosEscopo)}.`}
            </p>
          </section>

          <section className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-200/90">
              {operationalLabels.pressaoAtraso} (alocações no bucket «em atraso»)
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-rose-100">
              {journey.signals.pressaoAtrasoAlocacoes}
            </p>
            <p className="mt-2 text-xs text-rose-100/75">
              Contagem por situação: no backlog {journey.risk.byBucket.no_backlog}, em revisão{' '}
              {journey.risk.byBucket.em_revisao}, em andamento {journey.risk.byBucket.em_andamento},
              em atraso {journey.risk.byBucket.em_atraso}, concluídas {journey.risk.byBucket.concluidas}
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-50">
              Em aberto
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Alocações em esteiras ainda não concluídas (bucket ≠ concluídas).
            </p>
            {journey.assignmentsOpen.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                {conveyorFilter
                  ? transversalUxCopy.journeyEmptyFiltered
                  : 'Nada em aberto neste recorte. Confira o bucket «em atraso» ou o histórico abaixo.'}
              </p>
            ) : (
              <ul className="mt-6 space-y-4">
                {journey.assignmentsOpen.map((item) => (
                  <AssignmentCard
                    key={item.assigneeId}
                    item={item}
                    showApontamento={canApontamentoGestor}
                    apontamentoGestorHref={
                      canApontamentoGestor
                        ? `/app/gestao/apontamento/${encodeURIComponent(item.stepNodeId)}?conveyorId=${encodeURIComponent(item.conveyorId)}&from=jornada_gestao`
                        : null
                    }
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="mt-12">
            <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-50">
              Em risco (bucket em atraso)
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Alocações cuja esteira está no bucket «em atraso» ({operationalLabels.pressaoAtraso}).
            </p>
            {journey.assignmentsAtRisk.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                {conveyorFilter
                  ? transversalUxCopy.journeyEmptyFiltered
                  : 'Nenhuma alocação em atraso neste recorte.'}
              </p>
            ) : (
              <ul className="mt-6 space-y-4">
                {journey.assignmentsAtRisk.map((item) => (
                  <AssignmentCard
                    key={item.assigneeId}
                    item={item}
                    showApontamento={canApontamentoGestor}
                    apontamentoGestorHref={
                      canApontamentoGestor
                        ? `/app/gestao/apontamento/${encodeURIComponent(item.stepNodeId)}?conveyorId=${encodeURIComponent(item.conveyorId)}&from=jornada_gestao`
                        : null
                    }
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="mt-12 max-w-5xl">
            <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-50">
              {operationalLabels.pendenciaTempo}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              STEPs em aberto com previsto estrutural superior ao acumulado apontado pelo colaborador
              (ordenado por maior diferença). Sinal operacional.
            </p>
            {journey.signals.pendenciaTempo.count === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Nenhuma neste recorte.</p>
            ) : (
              <ul className="mt-4 space-y-2 rounded-xl border border-white/[0.08] bg-sgp-app-panel-deep/30 p-3 text-sm">
                {journey.signals.pendenciaTempo.items.map((p) => (
                  <li
                    key={p.assigneeId}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] py-2 last:border-0"
                  >
                    <span className="text-slate-200">
                      {p.conveyorName} · {p.stepName}
                    </span>
                    <span className="tabular-nums text-slate-400">
                      Δ {formatHumanMinutes(p.gapMinutes)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-12 max-w-5xl">
            <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-50">
              Histórico recente
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {operationalLabels.minutosApontadosPeriodo}: últimos lançamentos (máx.{' '}
              {journey.query.limit} linhas).
            </p>
            {journey.recentTimeEntries.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                {conveyorFilter
                  ? transversalUxCopy.journeyEmptyFiltered
                  : 'Sem lançamentos no período. Alargue a janela temporal ou confira outra esteira.'}
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-sgp-app-panel-deep/35">
                {journey.recentTimeEntries.map((e) => (
                  <li key={e.id} className="flex flex-col gap-1 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium text-slate-200">{e.conveyorName}</p>
                      <p className="text-xs text-slate-500">
                        {e.stepName} · {formatHumanMinutes(e.minutes)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>
                        {new Date(e.entryAt).toLocaleString('pt-BR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                      <Link
                        to={`/app/esteiras/${encodeURIComponent(e.conveyorId)}`}
                        className="text-sgp-gold hover:underline"
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
      )}

      {!colaboradorId && !loading && !collabsLoading && (
        <div className="sgp-panel sgp-panel-hover mt-10 max-w-lg rounded-2xl border border-white/[0.08] p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
            {transversalUxCopy.gestorSelectCollaboratorTitle}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {transversalUxCopy.gestorSelectCollaboratorBody}
          </p>
          <Link
            to="/app/colaboradores"
            className="sgp-cta-primary mt-5 inline-flex text-center text-sm"
          >
            {transversalUxCopy.gestorOpenCollaborators}
          </Link>
        </div>
      )}
    </PageCanvas>
  )
}
