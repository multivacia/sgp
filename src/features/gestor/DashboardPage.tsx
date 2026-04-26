import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link, useLocation } from 'react-router-dom'
import { openBacklogInNewTab } from '../../lib/dashboard/dashboardNavigation'
import { DashboardOperacionalBarList } from '../../components/dashboard/DashboardOperacionalBarList'
import {
  DashboardViewModeToggle,
  type DashboardViewMode,
} from '../../components/dashboard/DashboardViewModeToggle'
import { ExecutiveWindowSelector } from '../../components/dashboard/ExecutiveWindowSelector'
import { PageCanvas } from '../../components/ui/PageCanvas'
import type { DashboardOperacionalSerieItem } from '../../lib/dashboard-operacional-series'
import { OPERATIONAL_BUCKET_LABELS } from '../../lib/backlog/operationalBuckets'
import { formatHumanMinutes } from '../../lib/formatters'
import { isBlockingSeverity, reportClientError } from '../../lib/errors'
import { useSgpErrorSurface } from '../../lib/errors/SgpErrorPresentation'
import { useAuth } from '../../lib/use-auth'
import {
  readStoredExecutiveWindowDays,
  persistExecutiveWindowDays,
  type ExecutiveWindowDays,
} from '../../lib/dashboard/executiveDashboardWindow'
import {
  fetchExecutiveDashboard,
  fetchOperationalDashboard,
} from '../../services/dashboard/dashboardApiService'
import {
  dashboardHints,
  executiveDashboardCopy,
  operationalLabels,
} from '../../lib/operationalSemantics'
import type {
  ExecutiveDashboardData,
  OperationalBucketKey,
  OperationalDashboardData,
} from '../../domain/dashboard/dashboard.types'
import { DashboardChartsSkeleton } from '../../components/dashboard/charts/DashboardChartsSkeleton'

const OperationalDashboardCharts = lazy(() =>
  import('../../components/dashboard/charts/OperationalDashboardCharts').then((m) => ({
    default: m.OperationalDashboardCharts,
  })),
)

const ExecutiveDashboardCharts = lazy(() =>
  import('../../components/dashboard/charts/ExecutiveDashboardCharts').then((m) => ({
    default: m.ExecutiveDashboardCharts,
  })),
)

const BUCKET_ORDER: OperationalBucketKey[] = [
  'em_atraso',
  'em_revisao',
  'em_andamento',
  'no_backlog',
  'concluidas',
]

type TabKey = 'operational' | 'executive'

const VIEW_MODE_STORAGE_KEY = 'sgp.dashboard.viewMode'
const OP_REALIZED_PRESET_KEY = 'sgp.dashboard.operationalRealizedPreset'

function readStoredOperationalRealizedPreset():
  | ''
  | '7d'
  | '15d'
  | '30d'
  | 'month' {
  try {
    const v = localStorage.getItem(OP_REALIZED_PRESET_KEY)
    if (v === '7d' || v === '15d' || v === '30d' || v === 'month' || v === '') {
      return v as '' | '7d' | '15d' | '30d' | 'month'
    }
  } catch {
    /* ignore */
  }
  return ''
}

function readStoredViewMode(): DashboardViewMode {
  try {
    const v = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    return v === 'charts' ? 'charts' : 'cards'
  } catch {
    return 'cards'
  }
}

const kpiCardClass = [
  'sgp-kpi-card group relative rounded-2xl border border-white/[0.08] bg-sgp-app-panel-deep/90 p-5',
  'text-left transition-colors',
].join(' ')

function KpiCard({
  label,
  value,
  hint,
  featured,
  onDrillDown,
  drillTitle,
}: {
  label: string
  value: string | number
  hint?: string
  featured?: boolean
  /** Abre o backlog numa nova aba com o recorte correspondente ao KPI. */
  onDrillDown?: () => void
  /** `title` + `aria-label` no botão de drill-down. */
  drillTitle?: string
}) {
  const className = [
    kpiCardClass,
    featured && 'sgp-kpi-card--featured ring-1 ring-sgp-gold/20',
    onDrillDown &&
      'cursor-pointer hover:border-sgp-gold/25 hover:bg-sgp-app-panel-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sgp-gold/40',
  ]
    .filter(Boolean)
    .join(' ')

  const inner = (
    <>
      <p className="sgp-kpi-label text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="sgp-kpi-value mt-3 font-heading text-2xl font-bold tabular-nums text-slate-50">
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-xs leading-snug text-slate-500">{hint}</p>
      ) : null}
    </>
  )

  if (onDrillDown) {
    return (
      <button
        type="button"
        title={drillTitle}
        aria-label={drillTitle ?? label}
        onClick={onDrillDown}
        className={className}
      >
        {inner}
      </button>
    )
  }

  return <div className={className}>{inner}</div>
}

export function DashboardPage() {
  const { pathname } = useLocation()
  const { presentBlocking } = useSgpErrorSurface()
  const { can } = useAuth()
  const showOpTab = can('dashboard.view_operational')
  const showExecTab = can('dashboard.view_executive')
  const [tab, setTab] = useState<TabKey>(() =>
    !showOpTab && showExecTab ? 'executive' : 'operational',
  )
  const [viewMode, setViewMode] = useState<DashboardViewMode>(() =>
    readStoredViewMode(),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [operational, setOperational] = useState<OperationalDashboardData | null>(
    null,
  )
  const [executive, setExecutive] = useState<ExecutiveDashboardData | null>(null)
  const [execDays, setExecDays] = useState<ExecutiveWindowDays>(() =>
    readStoredExecutiveWindowDays(),
  )
  const [execRefreshing, setExecRefreshing] = useState(false)
  const [opRealizedPreset, setOpRealizedPreset] = useState<
    '' | '7d' | '15d' | '30d' | 'month'
  >(() => readStoredOperationalRealizedPreset())
  const operationalLoadedRef = useRef(false)

  const load = useCallback(async () => {
    const isInitialLoad = !operationalLoadedRef.current
    if (isInitialLoad) setLoading(true)
    else setExecRefreshing(true)
    setError(null)
    try {
      const [op, ex] = await Promise.all([
        showOpTab
          ? fetchOperationalDashboard(
              opRealizedPreset ? { realizedPeriodPreset: opRealizedPreset } : undefined,
            )
          : Promise.resolve(null),
        showExecTab ? fetchExecutiveDashboard(execDays) : Promise.resolve(null),
      ])
      setOperational(op)
      setExecutive(ex)
      operationalLoadedRef.current = true
    } catch (e) {
      setOperational(null)
      setExecutive(null)
      operationalLoadedRef.current = false
      const n = reportClientError(e, {
        module: 'gestor',
        action: 'dashboard_load',
        route: pathname,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
        setError(null)
      } else {
        setError(n.userMessage)
      }
    } finally {
      if (isInitialLoad) setLoading(false)
      else setExecRefreshing(false)
    }
  }, [execDays, opRealizedPreset, showOpTab, showExecTab, pathname, presentBlocking])

  useEffect(() => {
    if (!showExecTab && tab === 'executive') {
      setTab('operational')
    }
  }, [showExecTab, tab])

  const handleExecWindowChange = useCallback((days: ExecutiveWindowDays) => {
    setExecDays(days)
    persistExecutiveWindowDays(days)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const persistViewMode = useCallback((mode: DashboardViewMode) => {
    setViewMode(mode)
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
    } catch {
      /* ignore */
    }
  }, [])

  const persistOpRealizedPreset = useCallback(
    (v: '' | '7d' | '15d' | '30d' | 'month') => {
      setOpRealizedPreset(v)
      try {
        localStorage.setItem(OP_REALIZED_PRESET_KEY, v)
      } catch {
        /* ignore */
      }
    },
    [],
  )

  const bucketSeries: DashboardOperacionalSerieItem[] = useMemo(() => {
    if (!operational) return []
    return BUCKET_ORDER.map((k) => ({
      key: k,
      label: OPERATIONAL_BUCKET_LABELS[k],
      value: operational.conveyorsByBucket[k],
    }))
  }, [operational])

  const collaboratorActivitySeries: DashboardOperacionalSerieItem[] = useMemo(() => {
    if (!operational) return []
    return operational.collaboratorLoad.slice(0, 12).map((c) => ({
      key: c.collaboratorId,
      label: c.fullName?.trim() || c.collaboratorId.slice(0, 8),
      value: c.assignmentCount,
    }))
  }, [operational])

  const collaboratorMinutesSeries: DashboardOperacionalSerieItem[] = useMemo(() => {
    if (!operational) return []
    return operational.collaboratorLoad
      .filter((c) => c.realizedMinutes > 0)
      .slice(0, 12)
      .map((c) => ({
        key: `${c.collaboratorId}-m`,
        label: c.fullName?.trim() || c.collaboratorId.slice(0, 8),
        value: c.realizedMinutes,
      }))
  }, [operational])

  return (
    <PageCanvas>
      <header className="sgp-header-card max-w-6xl">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
          <span className="h-px w-8 bg-gradient-to-r from-sgp-gold to-transparent" />
          Painel
        </p>
        <h1 className="sgp-page-title mt-3">Dashboards</h1>
        <p className="sgp-page-lead mt-1 max-w-3xl">
          Acompanhe o snapshot operacional e os recortes executivos com a mesma regra de
          backlog e esteiras.
        </p>
        {tab === 'executive' && showExecTab ? (
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            {executiveDashboardCopy.headerMicrocopyExecutive}
          </p>
        ) : null}
      </header>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        {showOpTab && showExecTab ? (
          <div
            className="inline-flex rounded-lg border border-white/10 bg-sgp-void/60 p-0.5"
            role="tablist"
          >
            {(
              [
                ['operational', 'Operacional'],
                ['executive', 'Gerencial'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={[
                  'rounded-md px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors',
                  tab === k
                    ? 'bg-white/10 text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {showOpTab ? 'Operacional' : showExecTab ? 'Gerencial' : null}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {tab === 'executive' ? (
            <div className="flex flex-wrap items-center gap-2 border-r border-white/10 pr-3">
              <ExecutiveWindowSelector
                value={execDays}
                onChange={handleExecWindowChange}
                disabled={execRefreshing}
              />
              {execRefreshing ? (
                <span
                  className="text-[10px] font-medium text-slate-500"
                  aria-live="polite"
                >
                  Atualizando painel gerencial…
                </span>
              ) : null}
            </div>
          ) : null}
          <DashboardViewModeToggle value={viewMode} onChange={persistViewMode} />
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || execRefreshing}
            className="sgp-cta-secondary !py-2 text-sm disabled:opacity-40"
          >
            {loading || execRefreshing ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="mt-6 max-w-3xl rounded-2xl border border-rose-500/30 bg-rose-500/[0.08] px-5 py-4 text-sm text-rose-100/95"
          role="alert"
        >
          {error}
        </div>
      )}

      {loading &&
        ((tab === 'operational' && showOpTab && !operational) ||
          (tab === 'executive' && showExecTab && !executive)) && (
        <p className="mt-8 text-sm text-slate-500">Carregando indicadores…</p>
      )}

      {!loading && operational && tab === 'operational' && showOpTab && viewMode === 'charts' && (
        <Suspense fallback={<DashboardChartsSkeleton />}>
          <OperationalDashboardCharts data={operational} />
        </Suspense>
      )}

      {!loading && operational && tab === 'operational' && showOpTab && viewMode === 'cards' && (
        <div className="mt-8 max-w-6xl space-y-10">
          <section>
            <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-300">
              Resumo
            </h2>
            <label className="mt-3 flex max-w-md flex-col gap-1.5 text-xs font-medium text-slate-500">
              Opcional: soma de apontamentos num recorte temporal (não altera o acumulado global).
              <select
                className="rounded-lg border border-white/10 bg-sgp-app-panel-deep px-3 py-2 text-sm text-slate-200"
                value={opRealizedPreset}
                onChange={(e) =>
                  persistOpRealizedPreset(
                    e.target.value as '' | '7d' | '15d' | '30d' | 'month',
                  )
                }
              >
                <option value="">Sem período adicional</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="15d">Últimos 15 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="month">Mês atual (UTC)</option>
              </select>
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                featured
                label="Esteiras (total)"
                value={
                  BUCKET_ORDER.reduce(
                    (s, k) => s + operational.conveyorsByBucket[k],
                    0,
                  )
                }
                hint="Snapshot atual na base. Abre o backlog de esteiras (todas) numa nova aba."
                onDrillDown={() => openBacklogInNewTab()}
                drillTitle={dashboardHints.drillBacklogTodas}
              />
              <KpiCard
                label={`${operationalLabels.pressaoAtraso} (esteiras)`}
                value={operational.conveyorsByBucket.em_atraso}
                hint="Bucket operacional em atraso (prazo vs hoje). Abre o backlog com o mesmo recorte numa nova aba."
                onDrillDown={() => openBacklogInNewTab('em_atraso')}
                drillTitle={dashboardHints.drillBacklogAtraso}
              />
              <KpiCard
                label="Alocações em STEPs"
                value={operational.assignees.totalAllocations}
                hint={`Principal ${operational.assignees.primaryAllocations} · Apoio ${operational.assignees.supportAllocations}`}
              />
              <KpiCard
                label={operationalLabels.minutosApontadosAcumulado}
                value={formatHumanMinutes(
                  operational.plannedVsRealized.realizedMinutesTotal,
                )}
                hint="Todos os apontamentos válidos na base."
              />
            </div>
            {operational.plannedVsRealized.realizedMinutesInPeriod !== undefined &&
              operational.plannedVsRealized.realizedPeriod && (
                <div className="mt-4">
                  <KpiCard
                    label={operationalLabels.minutosApontadosPeriodo}
                    value={formatHumanMinutes(
                      operational.plannedVsRealized.realizedMinutesInPeriod,
                    )}
                    hint={`Janela ${operational.plannedVsRealized.realizedPeriod.preset} (UTC).`}
                  />
                </div>
              )}
          </section>

          <section className="sgp-panel sgp-panel-hover">
            <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-200">
              Esteiras por bucket operacional
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Mesma regra do backlog e do painel de esteiras (prazo vs estado). Abre o
              backlog com o recorte do bucket ao premir uma barra{' '}
              <span className="text-slate-600">(nova aba)</span>.
            </p>
            <div className="mt-4 max-w-xl">
              <DashboardOperacionalBarList
                items={bucketSeries}
                accent="operacao"
                onBarClick={(key) =>
                  openBacklogInNewTab(key as (typeof BUCKET_ORDER)[number])
                }
              />
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section className="sgp-panel sgp-panel-hover">
              <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-200">
                Destaque — {operationalLabels.pressaoAtraso}
              </h2>
              <ul className="mt-4 space-y-2 text-sm">
                {operational.overdueHighlight.length === 0 ? (
                  <li className="text-slate-500">Nenhuma esteira neste bucket.</li>
                ) : (
                  operational.overdueHighlight.map((r) => (
                    <li
                      key={r.conveyorId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-sgp-app-panel-deep/80 px-3 py-2"
                    >
                      <span className="font-semibold text-slate-200">{r.name}</span>
                      <a
                        href={`/app/esteiras/${encodeURIComponent(r.conveyorId)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-sgp-blue-bright hover:underline"
                      >
                        Abrir
                      </a>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="sgp-panel sgp-panel-hover">
              <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-200">
                Previsto estrutural vs minutos apontados
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {operational.plannedVsRealized.notes}
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">
                    {operationalLabels.previstoEstrutural} (referência — STEPs)
                  </dt>
                  <dd className="font-heading font-bold tabular-nums text-slate-50">
                    {formatHumanMinutes(
                      operational.plannedVsRealized.plannedMinutesStepNodes,
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">
                    {operationalLabels.totalPorEsteiraOs}{' '}
                    <span className="text-[10px] font-normal text-slate-600">
                      — apoio
                    </span>
                  </dt>
                  <dd className="font-heading font-bold tabular-nums text-slate-300">
                    {formatHumanMinutes(
                      operational.plannedVsRealized.plannedMinutesConveyorTotal,
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
                  <dt className="text-slate-500">
                    {operationalLabels.minutosApontadosAcumulado}
                  </dt>
                  <dd className="font-heading font-bold tabular-nums text-emerald-200/95">
                    {formatHumanMinutes(
                      operational.plannedVsRealized.realizedMinutesTotal,
                    )}
                  </dd>
                </div>
                {operational.plannedVsRealized.realizedMinutesInPeriod !== undefined &&
                  operational.plannedVsRealized.realizedPeriod && (
                    <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
                      <dt className="text-slate-500">
                        {operationalLabels.minutosApontadosPeriodo}{' '}
                        <span className="text-[10px] text-slate-600">
                          ({operational.plannedVsRealized.realizedPeriod.preset})
                        </span>
                      </dt>
                      <dd className="font-heading font-bold tabular-nums text-sky-200">
                        {formatHumanMinutes(
                          operational.plannedVsRealized.realizedMinutesInPeriod,
                        )}
                      </dd>
                    </div>
                  )}
              </dl>
            </section>
          </div>

          <section className="sgp-panel sgp-panel-hover">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-200">
                Carga por colaborador
              </h2>
              <Link
                to="/app/colaboradores"
                className="text-[11px] font-bold uppercase tracking-wide text-sgp-blue-bright hover:underline"
              >
                Colaboradores
              </Link>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Atividades = alocações por colaborador; minutos = soma dos apontamentos de
              cada um.
            </p>
            <div className="mt-6 grid gap-10 lg:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Atividades alocadas
                </p>
                <div className="mt-2">
                  <DashboardOperacionalBarList
                    items={collaboratorActivitySeries}
                    accent="responsaveis-atividades"
                    emptyMessage="Sem alocações."
                  />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Minutos apontados
                </p>
                <div className="mt-2">
                  <DashboardOperacionalBarList
                    items={collaboratorMinutesSeries}
                    accent="responsaveis-minutos"
                    emptyMessage="Sem apontamentos registados."
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="py-2 pr-3">Colaborador</th>
                    <th className="py-2 pr-3">Alocações</th>
                    <th className="py-2 pr-3">Principal / apoio</th>
                    <th className="py-2 pr-3">{operationalLabels.previstoEstrutural} (STEPS)</th>
                    <th className="py-2">{operationalLabels.minutosApontadosAcumulado}</th>
                  </tr>
                </thead>
                <tbody>
                  {operational.collaboratorLoad.map((r) => (
                    <tr
                      key={r.collaboratorId}
                      className="border-b border-white/[0.04] text-slate-300"
                    >
                      <td className="py-2 pr-3 font-medium text-slate-200">
                        {r.fullName ?? r.collaboratorId.slice(0, 8)}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{r.assignmentCount}</td>
                      <td className="py-2 pr-3 tabular-nums">
                        {r.primaryCount} / {r.supportCount}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {formatHumanMinutes(r.plannedMinutesOnSteps)}
                      </td>
                      <td className="py-2 tabular-nums text-emerald-200/90">
                        {formatHumanMinutes(r.realizedMinutes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {operational.collaboratorLoad.length === 0 && (
                <p className="mt-4 text-sm text-slate-500">Sem dados de colaboradores.</p>
              )}
            </div>
          </section>

          <section className="sgp-panel sgp-panel-hover">
            <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-200">
              Últimos apontamentos
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {operational.recentTimeEntries.length === 0 ? (
                <li className="text-slate-500">Nenhum apontamento registado.</li>
              ) : (
                operational.recentTimeEntries.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-lg border border-white/[0.06] bg-sgp-app-panel-deep/80 px-3 py-2 transition-colors hover:border-white/12"
                  >
                    <Link
                      to={`/app/esteiras/${encodeURIComponent(e.conveyorId)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abre o detalhe da esteira numa nova aba"
                      className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sgp-gold/40"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-semibold text-slate-200 underline-offset-2 hover:underline">
                          {e.conveyorName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(e.entryAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {e.stepName} · {e.collaboratorName ?? e.collaboratorId} ·{' '}
                        {formatHumanMinutes(e.minutes)}
                      </p>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>

          <p className="text-[10px] text-slate-600">
            Gerado em {new Date(operational.meta.generatedAt).toLocaleString('pt-BR')}{' '}
            · {operational.meta.scope}
          </p>
        </div>
      )}

      {executive && tab === 'executive' && showExecTab && viewMode === 'charts' && (
        <Suspense fallback={<DashboardChartsSkeleton />}>
          <ExecutiveDashboardCharts data={executive} windowDays={execDays} />
        </Suspense>
      )}

      {executive && tab === 'executive' && showExecTab && viewMode === 'cards' && (
        <div className="mt-8 max-w-6xl space-y-10">
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-400">Janela ({execDays} dias)</span>: aplica-se
            só a <span className="text-slate-400">concluídas</span> (data de conclusão neste
            intervalo). <span className="text-slate-600">Esteiras ativas</span> são o estado
            atual (não concluídas); a janela não se aplica a este recorte.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              featured
              label="Esteiras ativas"
              value={executive.totals.activeConveyors}
              hint="Snapshot atual (não concluídas). Sem filtro de data. Abre o backlog com âmbito ativas numa nova aba."
              onDrillDown={() => openBacklogInNewTab('ativas')}
              drillTitle={dashboardHints.drillBacklogAtivas}
            />
            <KpiCard
              label={`Concluídas (${execDays}d)`}
              value={executive.totals.completedInWindow}
              hint={`Concluídas com data de conclusão nos últimos ${execDays} dias. Abre o backlog com o mesmo recorte numa nova aba.`}
              onDrillDown={() =>
                openBacklogInNewTab('concluidas', { days: execDays })
              }
              drillTitle={`Abre o backlog com concluídas dos últimos ${execDays} dias. Nova aba.`}
            />
            <KpiCard
              label={executiveDashboardCopy.participacaoAtrasoTitulo}
              value={
                executive.totals.delayRateVsActive == null
                  ? '—'
                  : `${Math.round(executive.totals.delayRateVsActive * 100)}%`
              }
              hint={executiveDashboardCopy.participacaoAtrasoHint}
            />
          </div>

          <section className="sgp-panel sgp-panel-hover">
            <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-200">
              {executiveDashboardCopy.secaoAgregadaTitulo}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {executive.plannedVsRealized.notes}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-12 gap-y-6">
              <div title={dashboardHints.previstoEstruturalSteps}>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">
                  {operationalLabels.previstoEstrutural} (STEPS)
                </p>
                <p className="mt-1 font-heading text-2xl font-bold text-slate-50">
                  {formatHumanMinutes(executive.plannedVsRealized.plannedMinutesStepNodes)}
                </p>
              </div>
              <div title={dashboardHints.totalOsApoio}>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">
                  {operationalLabels.totalPorEsteiraOs}
                  <span className="ml-1 text-[9px] font-normal normal-case text-slate-600">
                    apoio
                  </span>
                </p>
                <p className="mt-1 font-heading text-2xl font-bold text-slate-400">
                  {formatHumanMinutes(executive.plannedVsRealized.plannedMinutesConveyorTotal)}
                </p>
              </div>
              <div title={dashboardHints.acumuladoGlobal}>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">
                  {operationalLabels.minutosApontadosAcumulado}
                </p>
                <p className="mt-1 font-heading text-2xl font-bold text-emerald-200/95">
                  {formatHumanMinutes(executive.plannedVsRealized.realizedMinutesTotal)}
                </p>
              </div>
            </div>
          </section>

          <section className="sgp-panel sgp-panel-hover">
            <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-200">
              {executiveDashboardCopy.listaAtrasoTitulo}
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {executive.topOverdueConveyors.length === 0 ? (
                <li className="text-slate-500">Nenhuma esteira em atraso no momento.</li>
              ) : (
                executive.topOverdueConveyors.map((r) => (
                  <li
                    key={r.conveyorId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2"
                  >
                    <div>
                      <span className="font-semibold text-slate-100">{r.name}</span>
                      {r.estimatedDeadline ? (
                        <span className="ml-2 text-xs text-slate-500">
                          Prazo: {r.estimatedDeadline}
                        </span>
                      ) : null}
                    </div>
                    <a
                      href={`/app/esteiras/${encodeURIComponent(r.conveyorId)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-sgp-blue-bright hover:underline"
                    >
                      Abrir
                    </a>
                  </li>
                ))
              )}
            </ul>
          </section>

          <p className="text-[10px] text-slate-600">
            Gerado em {new Date(executive.meta.generatedAt).toLocaleString('pt-BR')}
          </p>
        </div>
      )}
    </PageCanvas>
  )
}
