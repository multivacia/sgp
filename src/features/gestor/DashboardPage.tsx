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
import { DashboardDateRangeFilter } from '../../components/dashboard/DashboardDateRangeFilter'
import { PageCanvas } from '../../components/ui/PageCanvas'
import type { DashboardOperacionalSerieItem } from '../../lib/dashboard-operacional-series'
import { OPERATIONAL_BUCKET_LABELS } from '../../lib/backlog/operationalBuckets'
import {
  buildCapacityStatus,
  capacityLoadStatusLabel,
  formatCapacityLabel,
  formatPercent,
} from '../../features/admin/operational-capacity/operationalCapacity.helpers'
import { PERMISSION_OPERATIONAL_SETTINGS_MANAGE } from '../../lib/permissions/permissionCodes'
import { formatHumanMinutes } from '../../lib/formatters'
import { isBlockingSeverity, reportClientError } from '../../lib/errors'
import { useSgpErrorSurface } from '../../lib/errors/SgpErrorPresentation'
import { useAuth } from '../../lib/use-auth'
import {
  DASHBOARD_LOAD_ERROR,
  formatDashboardDateRange,
  persistDashboardDateRange,
  readStoredDashboardDateRange,
  type DashboardDateRange,
} from '../../lib/dashboard/dashboardDateRange'
import { ApiError } from '../../lib/api/apiErrors'
import {
  fetchExecutiveDashboard,
  fetchOperationalDashboard,
} from '../../services/dashboard/dashboardApiService'
import { getCollaboratorCapacityResolved } from '../../services/operationalCapacity.service'
import { SHOW_ARGOS_HEALTH_UI } from '../../lib/argos/argosUiFlags'
import { getConveyorHealthSummary } from '../../services/conveyors/conveyorsApiService'
import { buildArgosDashboardSummary } from '../../domain/conveyors/conveyorHealthDashboard'
import type { ConveyorHealthSummaryItem } from '../../domain/conveyors/conveyorHealth.types'
import {
  dashboardConcluidasNoPeriodoLabel,
  dashboardHints,
  dashboardLabels,
  executiveDashboardCopy,
} from '../../lib/operationalSemantics'
import type {
  ExecutiveDashboardData,
  OperationalBucketKey,
  OperationalDashboardData,
} from '../../domain/dashboard/dashboard.types'
import { DashboardChartsSkeleton } from '../../components/dashboard/charts/DashboardChartsSkeleton'
import { formatWorkDateFromEntryAt } from '../../domain/operational/workDate'
import { subscribeOperationalDataChanged } from '../../lib/operational/operationalDataEvents'

/** Ao voltar para a aba após este intervalo, o Dashboard reconsulta os indicadores. */
const DASHBOARD_REFRESH_ON_RETURN_MS = 30_000

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
  'aguardando_planejamento',
  'em_planejamento',
  'em_execucao',
  'em_elaboracao',
  'finalizadas',
  'canceladas',
]

type TabKey = 'operational' | 'executive'

const VIEW_MODE_STORAGE_KEY = 'sgp.dashboard.viewMode'

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
  const canManageOperationalCapacity = can(PERMISSION_OPERATIONAL_SETTINGS_MANAGE)
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
  /** Período aplicado — único para Operacional e Gerencial (Cards e Gráficos). */
  const [period, setPeriod] = useState<DashboardDateRange>(() =>
    readStoredDashboardDateRange(),
  )
  /**
   * Período dos dados exibidos. Enquanto um novo período carrega, os números anteriores
   * continuam com o rótulo e o detalhamento do período a que pertencem.
   */
  const [dataPeriod, setDataPeriod] = useState<DashboardDateRange | null>(null)
  const shownPeriod = dataPeriod ?? period
  const periodLabel = formatDashboardDateRange(shownPeriod)
  const [refreshing, setRefreshing] = useState(false)
  const operationalLoadedRef = useRef(false)
  /** Só a consulta mais recente aplica resultado (período antigo não sobrescreve o novo). */
  const loadSeqRef = useRef(0)
  const [argosSummaryLoading, setArgosSummaryLoading] = useState(true)
  const [argosSummaryError, setArgosSummaryError] = useState<string | null>(null)
  const [argosSummaryItems, setArgosSummaryItems] = useState<ConveyorHealthSummaryItem[]>([])
  const [collabCapacityMinutes, setCollabCapacityMinutes] = useState<
    Record<string, number | undefined>
  >({})

  const load = useCallback(async () => {
    const seq = ++loadSeqRef.current
    const isInitialLoad = !operationalLoadedRef.current
    if (isInitialLoad) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const [op, ex] = await Promise.all([
        showOpTab ? fetchOperationalDashboard(period) : Promise.resolve(null),
        showExecTab ? fetchExecutiveDashboard(period) : Promise.resolve(null),
      ])
      if (seq !== loadSeqRef.current) return
      setOperational(op)
      setExecutive(ex)
      setDataPeriod(period)
      operationalLoadedRef.current = true
    } catch (e) {
      if (seq !== loadSeqRef.current) return
      setOperational(null)
      setExecutive(null)
      setDataPeriod(null)
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
        // Período recusado pelo servidor: mostra a mensagem dele; demais falhas, texto padrão.
        setError(e instanceof ApiError && e.status === 400 ? n.userMessage : DASHBOARD_LOAD_ERROR)
      }
    } finally {
      if (seq === loadSeqRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [period, showOpTab, showExecTab, pathname, presentBlocking])

  useEffect(() => {
    if (!showExecTab && tab === 'executive') {
      setTab('operational')
    }
  }, [showExecTab, tab])

  const applyPeriod = useCallback((next: DashboardDateRange) => {
    setPeriod(next)
    persistDashboardDateRange(next)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /**
   * Cards refletem apontamentos/conclusões feitos sem sair do Dashboard (ex.: "Apontar horas"
   * do cabeçalho) e ao voltar para a aba após alterações em outra aba. Sem polling.
   */
  const loadRef = useRef(load)
  loadRef.current = load
  useEffect(() => {
    const unsubscribe = subscribeOperationalDataChanged(() => {
      void loadRef.current()
    })
    let hiddenAt: number | null = null
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        return
      }
      if (hiddenAt != null && Date.now() - hiddenAt >= DASHBOARD_REFRESH_ON_RETURN_MS) {
        void loadRef.current()
      }
      hiddenAt = null
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  useEffect(() => {
    if (!operational || !canManageOperationalCapacity) {
      setCollabCapacityMinutes({})
      return
    }
    let cancelled = false
    const ids = operational.collaboratorLoad.map((c) => c.collaboratorId)
    if (ids.length === 0) {
      setCollabCapacityMinutes({})
      return
    }
    void Promise.allSettled(ids.map((id) => getCollaboratorCapacityResolved(id))).then(
      (results) => {
        if (cancelled) return
        const next: Record<string, number | undefined> = {}
        results.forEach((r, i) => {
          const id = ids[i]!
          if (r.status === 'fulfilled') next[id] = r.value.resolvedDailyMinutes
        })
        setCollabCapacityMinutes(next)
      },
    )
    return () => {
      cancelled = true
    }
  }, [operational, canManageOperationalCapacity])

  useEffect(() => {
    if (!SHOW_ARGOS_HEALTH_UI) return
    let cancelled = false
    setArgosSummaryLoading(true)
    setArgosSummaryError(null)
    ;(async () => {
      try {
        const res = await getConveyorHealthSummary({ limit: 500 })
        if (cancelled) return
        setArgosSummaryItems(res.data)
      } catch {
        if (cancelled) return
        setArgosSummaryItems([])
        setArgosSummaryError('Não foi possível carregar o resumo ARGOS agora.')
      } finally {
        if (!cancelled) setArgosSummaryLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const persistViewMode = useCallback((mode: DashboardViewMode) => {
    setViewMode(mode)
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
    } catch {
      /* ignore */
    }
  }, [])

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

  const argosDashboardSummary = useMemo(
    () => buildArgosDashboardSummary(argosSummaryItems),
    [argosSummaryItems],
  )

  return (
    <PageCanvas>
      <header className="sgp-header-card max-w-6xl">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
          <span className="h-px w-8 bg-gradient-to-r from-sgp-gold to-transparent" />
          Painel
        </p>
        <h1 className="sgp-page-title mt-3">Dashboards</h1>
        <p className="sgp-page-lead mt-1 max-w-3xl">
          Acompanhe a situação atual da operação e a visão gerencial, com as mesmas regras do
          painel de esteiras. Data inicial e Data final valem para as duas visões.
        </p>
        {tab === 'executive' && showExecTab ? (
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            {executiveDashboardCopy.headerMicrocopyExecutive}
          </p>
        ) : null}
      </header>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
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
        <DashboardDateRangeFilter
          value={period}
          onApply={applyPeriod}
          refreshing={loading || refreshing}
        />
        <div className="flex flex-wrap items-center gap-3">
          <DashboardViewModeToggle value={viewMode} onChange={persistViewMode} />
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || refreshing}
            className="sgp-cta-secondary !py-2 text-sm disabled:opacity-40"
          >
            {loading || refreshing ? 'Atualizando…' : 'Atualizar'}
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
          <OperationalDashboardCharts data={operational} periodLabel={periodLabel} />
        </Suspense>
      )}

      {!loading && operational && tab === 'operational' && showOpTab && viewMode === 'cards' && (
        <div className="mt-8 max-w-6xl space-y-10">
          <section>
            <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-300">
              Resumo
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Situação atual das esteiras e alocações. {dashboardLabels.horasApontadasPeriodo}:{' '}
              {periodLabel}.
            </p>
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
                hint="Situação atual de todas as esteiras. Clique para abrir o painel de esteiras em nova aba."
                onDrillDown={() => openBacklogInNewTab()}
                drillTitle={dashboardHints.drillBacklogTodas}
              />
              <KpiCard
                label={dashboardLabels.esteirasEmAtraso}
                value={operational.conveyorsByBucket.em_atraso}
                hint="Prazo estimado vencido (situação atual). Clique para abrir a lista em nova aba."
                onDrillDown={() => openBacklogInNewTab('em_atraso')}
                drillTitle={dashboardHints.drillBacklogAtraso}
              />
              <KpiCard
                label={dashboardLabels.alocacoesAtividades}
                value={operational.assignees.totalAllocations}
                hint={`Principal ${operational.assignees.primaryAllocations} · Apoio ${operational.assignees.supportAllocations}`}
              />
              <KpiCard
                label={dashboardLabels.totalHorasApontadas}
                value={formatHumanMinutes(
                  operational.plannedVsRealized.realizedMinutesTotal,
                )}
                hint={dashboardHints.acumuladoGlobal}
              />
            </div>
            {operational.plannedVsRealized.realizedMinutesInPeriod !== undefined && (
              <div className="mt-4">
                <KpiCard
                  featured
                  label={`${dashboardLabels.horasApontadasPeriodo} — ${periodLabel}`}
                  value={formatHumanMinutes(
                    operational.plannedVsRealized.realizedMinutesInPeriod,
                  )}
                  hint={dashboardHints.periodo(periodLabel)}
                />
              </div>
            )}
          </section>

          {SHOW_ARGOS_HEALTH_UI ? (
            <section className="sgp-panel sgp-panel-hover">
              <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-200">
                ARGOS — Saúde das Esteiras
              </h2>
              {argosSummaryLoading ? (
                <p className="mt-3 text-sm text-slate-500">Carregando resumo ARGOS…</p>
              ) : argosSummaryError ? (
                <p className="mt-3 text-sm text-slate-500">{argosSummaryError}</p>
              ) : argosDashboardSummary.withAnalysis === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  Ainda não há análises ARGOS salvas.
                </p>
              ) : (
                <>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <KpiCard
                      label="Esteiras analisadas"
                      value={argosDashboardSummary.withAnalysis}
                    />
                    <KpiCard
                      label="Alto/crítico risco"
                      value={argosDashboardSummary.riskHighOrCritical}
                    />
                    <KpiCard
                      label="Em atenção"
                      value={argosDashboardSummary.healthAttention}
                    />
                    <KpiCard
                      label="Score médio"
                      value={
                        argosDashboardSummary.averageScore == null
                          ? '—'
                          : argosDashboardSummary.averageScore
                      }
                    />
                    <KpiCard
                      label="Última análise"
                      value={
                        argosDashboardSummary.latestAnalysisAt
                          ? new Date(argosDashboardSummary.latestAnalysisAt).toLocaleString('pt-BR')
                          : '—'
                      }
                    />
                  </div>

                  <div className="mt-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Esteiras que pedem atenção
                    </p>
                    <ul className="mt-2 space-y-2 text-sm">
                      {argosDashboardSummary.topRiskItems.length === 0 ? (
                        <li className="text-slate-500">Sem itens de atenção no momento.</li>
                      ) : (
                        argosDashboardSummary.topRiskItems.map((item) => (
                          <li
                            key={item.analysisId}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-sgp-app-panel-deep/80 px-3 py-2"
                          >
                            <div className="text-xs text-slate-300">
                              <span className="font-semibold text-slate-200">
                                {item.conveyorId}
                              </span>{' '}
                              · saúde {item.healthStatus ?? '—'} · risco {item.riskLevel ?? '—'} ·
                              score {item.score ?? '—'} ·{' '}
                              {new Date(item.createdAt).toLocaleString('pt-BR')}
                            </div>
                            <a
                              href={`/app/esteiras/${encodeURIComponent(item.conveyorId)}`}
                              className="text-xs font-medium text-sgp-blue-bright hover:underline"
                            >
                              Consultar
                            </a>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </>
              )}
            </section>
          ) : null}

          <section className="sgp-panel sgp-panel-hover">
            <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-200">
              {dashboardLabels.esteirasPorSituacao}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Situação atual, com a mesma regra do painel de esteiras (prazo e estado). Clique
              em uma barra para abrir o painel de esteiras com a mesma situação{' '}
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
                Destaque — {dashboardLabels.esteirasEmAtraso}
              </h2>
              <ul className="mt-4 space-y-2 text-sm">
                {operational.overdueHighlight.length === 0 ? (
                  <li className="text-slate-500">Nenhuma esteira em atraso.</li>
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
                {dashboardLabels.tempoPrevistoVsHoras}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {operational.plannedVsRealized.notes}
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">
                    {dashboardLabels.tempoPrevistoAtividades}
                  </dt>
                  <dd className="font-heading font-bold tabular-nums text-slate-50">
                    {formatHumanMinutes(
                      operational.plannedVsRealized.plannedMinutesStepNodes,
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">
                    {dashboardLabels.totalPorEsteiraOs}{' '}
                    <span className="text-[10px] font-normal text-slate-600">
                      — referência
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
                    {dashboardLabels.totalHorasApontadas}
                  </dt>
                  <dd className="font-heading font-bold tabular-nums text-emerald-200/95">
                    {formatHumanMinutes(
                      operational.plannedVsRealized.realizedMinutesTotal,
                    )}
                  </dd>
                </div>
                {operational.plannedVsRealized.realizedMinutesInPeriod !== undefined && (
                    <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
                      <dt className="text-slate-500">
                        {dashboardLabels.horasApontadasPeriodo}{' '}
                        <span className="text-[10px] text-slate-600">({periodLabel})</span>
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
              Atividades = alocações por colaborador; horas = soma de todos os apontamentos de
              cada um (sem filtro de período).
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
                  {dashboardLabels.totalHorasApontadas}
                </p>
                <div className="mt-2">
                  <DashboardOperacionalBarList
                    items={collaboratorMinutesSeries}
                    accent="responsaveis-minutos"
                    emptyMessage="Nenhum apontamento registrado."
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="py-2 pr-3">Colaborador</th>
                    <th className="py-2 pr-3">Alocações</th>
                    <th className="py-2 pr-3">Principal / apoio</th>
                    <th className="py-2 pr-3">{dashboardLabels.tempoPrevistoAtividades}</th>
                    {canManageOperationalCapacity ? (
                      <th className="py-2 pr-3">Previsto vs capacidade diária</th>
                    ) : null}
                    <th className="py-2">{dashboardLabels.totalHorasApontadas}</th>
                  </tr>
                </thead>
                <tbody>
                  {operational.collaboratorLoad.map((r) => {
                    const capM = collabCapacityMinutes[r.collaboratorId]
                    const st =
                      capM != null
                        ? buildCapacityStatus({
                            allocatedMinutes: r.plannedMinutesOnSteps,
                            capacityMinutes: capM,
                          })
                        : null
                    const pctLabel =
                      capM != null && r.plannedMinutesOnSteps > 0
                        ? formatPercent(r.plannedMinutesOnSteps / capM)
                        : null
                    return (
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
                        {canManageOperationalCapacity ? (
                          <td className="py-2 pr-3 text-xs">
                            {capM != null ? (
                              <span
                                className={
                                  st?.kind === 'over'
                                    ? 'text-rose-200/95'
                                    : st?.kind === 'attention'
                                      ? 'text-amber-200/95'
                                      : 'text-slate-300'
                                }
                              >
                                {formatHumanMinutes(r.plannedMinutesOnSteps)} /{' '}
                                {formatCapacityLabel(capM)} · {pctLabel ?? '—'}
                                {st && st.kind !== 'no_data' ? (
                                  <span className="ml-1 text-[10px] text-slate-500">
                                    ({capacityLoadStatusLabel(st.kind)})
                                  </span>
                                ) : null}
                              </span>
                            ) : (
                              <span className="text-slate-600">…</span>
                            )}
                          </td>
                        ) : null}
                        <td className="py-2 tabular-nums text-emerald-200/90">
                          {formatHumanMinutes(r.realizedMinutes)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {canManageOperationalCapacity ? (
                <p className="mt-3 max-w-3xl text-[11px] leading-relaxed text-slate-600">
                  O tempo previsto é a soma das atividades atribuídas; a capacidade diária é o
                  limite de jornada. A comparação é indicativa quando o previsto total excede um dia.
                </p>
              ) : null}
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
                <li className="text-slate-500">Nenhum apontamento registrado.</li>
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
                          {formatWorkDateFromEntryAt(e.entryAt)}
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
            Gerado em {new Date(operational.meta.generatedAt).toLocaleString('pt-BR')}
          </p>
        </div>
      )}

      {executive && tab === 'executive' && showExecTab && viewMode === 'charts' && (
        <Suspense fallback={<DashboardChartsSkeleton />}>
          <ExecutiveDashboardCharts data={executive} period={shownPeriod} />
        </Suspense>
      )}

      {executive && tab === 'executive' && showExecTab && viewMode === 'cards' && (
        <div className="mt-8 max-w-6xl space-y-10">
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-400">
              {dashboardLabels.periodoAnalise} ({periodLabel})
            </span>
            : aplica-se somente às <span className="text-slate-400">esteiras concluídas</span>{' '}
            (pela data de conclusão). Esteiras ativas e em atraso mostram a situação atual.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              featured
              label="Esteiras ativas"
              value={executive.totals.activeConveyors}
              hint="Situação atual: esteiras não finalizadas nem canceladas, sem filtro de data. Clique para abrir a lista em nova aba."
              onDrillDown={() => openBacklogInNewTab('ativas')}
              drillTitle={dashboardHints.drillBacklogAtivas}
            />
            <KpiCard
              label={dashboardConcluidasNoPeriodoLabel(periodLabel)}
              value={executive.totals.completedInWindow}
              hint="Esteiras finalizadas com data de conclusão no período. Clique para abrir a lista com o mesmo período em nova aba."
              onDrillDown={() =>
                openBacklogInNewTab('finalizadas', { completedPeriod: shownPeriod })
              }
              drillTitle={dashboardHints.drillBacklogConcluidas(periodLabel)}
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
                  {dashboardLabels.tempoPrevistoAtividades}
                </p>
                <p className="mt-1 font-heading text-2xl font-bold text-slate-50">
                  {formatHumanMinutes(executive.plannedVsRealized.plannedMinutesStepNodes)}
                </p>
              </div>
              <div title={dashboardHints.totalOsApoio}>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">
                  {dashboardLabels.totalPorEsteiraOs}
                  <span className="ml-1 text-[9px] font-normal normal-case text-slate-600">
                    referência
                  </span>
                </p>
                <p className="mt-1 font-heading text-2xl font-bold text-slate-400">
                  {formatHumanMinutes(executive.plannedVsRealized.plannedMinutesConveyorTotal)}
                </p>
              </div>
              <div title={dashboardHints.acumuladoGlobal}>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">
                  {dashboardLabels.totalHorasApontadas}
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
