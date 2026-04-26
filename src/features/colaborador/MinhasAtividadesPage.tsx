import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PageCanvas } from '../../components/ui/PageCanvas'
import {
  OPERATIONAL_BUCKET_LABELS,
  parseFlexibleDeadlineToDate,
} from '../../lib/backlog/operationalBuckets'
import { formatHumanMinutes } from '../../lib/formatters'
import {
  isBlockingSeverity,
  reportClientError,
} from '../../lib/errors'
import { useSgpErrorSurface } from '../../lib/errors/SgpErrorPresentation'
import { listMyActivities } from '../../services/my-activities/myActivitiesApiService'
import type { MyActivityItem } from '../../domain/my-activities/my-activities.types'
import {
  labelConveyorOperationalStatus,
  labelRoleInStep,
} from './minhasAtividadesLabels'

function apontamentoHref(item: MyActivityItem): string {
  const q = new URLSearchParams({
    conveyorId: item.conveyorId,
    from: 'minhas_atividades',
  })
  return `/app/apontamento/${encodeURIComponent(item.stepNodeId)}?${q.toString()}`
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

export function MinhasAtividadesPage() {
  const { presentBlocking } = useSgpErrorSurface()
  const location = useLocation()
  const navigate = useNavigate()
  const [items, setItems] = useState<MyActivityItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await listMyActivities()
      setItems(rows)
    } catch (e) {
      setItems(null)
      const n = reportClientError(e, {
        module: 'colaborador',
        action: 'minhas_atividades_load',
        route: location.pathname,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
        setError(null)
      } else {
        setError(n.userMessage)
      }
    } finally {
      setLoading(false)
    }
  }, [location.pathname, presentBlocking])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const st = location.state as { refreshMyActivities?: boolean } | null
    if (st?.refreshMyActivities) {
      void load()
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, load, navigate])

  return (
    <PageCanvas>
      <header className="sgp-header-card max-w-4xl">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
          <span className="h-px w-8 bg-gradient-to-r from-sgp-gold to-transparent" />
          Colaborador
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="sgp-page-title">Minhas atividades</h1>
            <p className="sgp-page-lead mt-1">
              Alocações reais em etapas (STEP) das suas esteiras: papel na
              equipe, tempos e atalhos para detalhe e apontamento de horas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="sgp-cta-secondary shrink-0 !py-2 text-sm disabled:opacity-40"
          >
            {loading ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>
      </header>

      {error && (
        <div
          className="mt-6 max-w-4xl rounded-2xl border border-rose-500/30 bg-rose-500/[0.08] px-5 py-4 text-sm text-rose-100/95"
          role="alert"
        >
          {error}
        </div>
      )}

      {loading && (
        <p className="mt-8 text-sm text-slate-500">Carregando atividades…</p>
      )}

      {!loading && !error && items && items.length > 0 && (
        <ul className="mt-8 max-w-4xl space-y-4">
          {items.map((item) => {
            const deadlineLine = formatDeadlineLine(item.estimatedDeadline)
            return (
              <li
                key={item.assigneeId}
                className="sgp-surface-hover rounded-2xl border border-white/[0.08] border-l-4 border-l-sgp-blue-bright bg-gradient-to-br from-sgp-app-panel/95 to-sgp-app-panel-deep/90 p-5 pl-4 shadow-[var(--sgp-shadow-card-dark)]"
              >
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
                        Previsto:{' '}
                        {item.plannedMinutes != null
                          ? formatHumanMinutes(item.plannedMinutes)
                          : '—'}
                      </span>
                      <span>
                        Realizado (seus apontamentos):{' '}
                        {item.realizedMinutes == null
                          ? '—'
                          : formatHumanMinutes(item.realizedMinutes)}
                      </span>
                      {deadlineLine && (
                        <span className="text-slate-400">
                          Prazo: {deadlineLine}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Esteira{' '}
                      <span className="font-mono text-slate-500">
                        {item.conveyorId}
                      </span>
                      {' · '}
                      Etapa{' '}
                      <span className="font-mono text-slate-500">
                        {item.stepNodeId}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                    <Link
                      to={`/app/esteiras/${encodeURIComponent(item.conveyorId)}`}
                      className="sgp-cta-secondary !px-4 !py-2.5 text-center text-sm"
                    >
                      Ver esteira
                    </Link>
                    <Link
                      to={apontamentoHref(item)}
                      className="sgp-cta-primary !px-4 !py-2.5 text-center text-sm"
                    >
                      Apontar horas
                    </Link>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {!loading && !error && items && items.length === 0 && (
        <div className="mt-8 max-w-4xl rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-14 text-center">
          <p className="font-heading text-base font-semibold text-slate-300">
            Nenhuma atividade alocada para si.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
            Quando for alocado a etapas nas esteiras (equipe por STEP), elas
            aparecerão aqui. Confirme no cadastro que o seu e-mail de login
            coincide com o do colaborador.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/app/backlog"
              className="sgp-cta-secondary !inline-flex !py-2 text-sm"
            >
              Ver backlog
            </Link>
          </div>
        </div>
      )}
    </PageCanvas>
  )
}
