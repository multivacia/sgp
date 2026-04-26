import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { SgpToast } from '../components/ui/SgpToast'
import { BacklogFilters } from '../components/backlog/BacklogFilters'
import { BacklogKpiCards } from '../components/backlog/BacklogKpiCards'
import { BacklogTable } from '../components/backlog/BacklogTable'
import { SgpContextActionsMenuProvider } from '../components/shell/SgpContextActionsMenu'
import { getDataMode } from '../lib/api/env'
import {
  isBlockingSeverity,
  reportClientError,
} from '../lib/errors'
import { useSgpErrorSurface } from '../lib/errors/SgpErrorPresentation'
import {
  COLABS_DEFAULT_PAGE_SIZE,
} from '../lib/admin/collaboratorsListUrlState'
import {
  normalizeBacklogSearchParams,
  parseBacklogDaysWindow,
  parseBacklogPage,
  parseBacklogPageSize,
  parseBacklogPriority,
  parseBacklogQ,
  parseBacklogResponsible,
  parseBacklogSituationFilter,
  type BacklogPriorityParam,
  type BacklogSituationFilterValue,
} from '../lib/backlog/backlogUrlParams'
import { useRegisterTransientContext } from '../lib/shell/transient-context'
import {
  backlogChipBusca,
  backlogChipJanelaDias,
  backlogChipPrioridade,
  backlogChipResponsavel,
  backlogChipSituacaoPrefixed,
  backlogFilterDetailAtivas,
  backlogFilterDetailConcluidasWindow,
  backlogHeaderSemanticLine,
  backlogKpiDeckIntro,
  backlogSituationChipLabel,
  backlogTotalsVsTableFiltered,
} from '../lib/backlog/backlogCopy'
import {
  getOperationalBucket,
  type OperationalBucket,
} from '../lib/backlog/operationalBuckets'
import { mapConveyorListItemToBacklogRow } from '../lib/backlog/mapConveyorListToBacklog'
import {
  BACKLOG_MOCK_ROWS,
  computeBacklogKpis,
  type BacklogRow,
} from '../mocks/backlog'
import {
  getEsteirasExtraSnapshot,
  subscribeEsteiras,
} from '../mocks/runtime-esteiras'
import { listConveyors } from '../services/conveyors/conveyorsApiService'

function matchesSearch(row: BacklogRow, q: string) {
  if (!q.trim()) return true
  const s = q.toLowerCase()
  return (
    row.ref.toLowerCase().includes(s) ||
    row.name.toLowerCase().includes(s) ||
    row.responsible.toLowerCase().includes(s) ||
    (row.clientName?.toLowerCase().includes(s) ?? false)
  )
}

function applySituationAndWindow(
  row: BacklogRow,
  statusFilter: BacklogSituationFilterValue,
  daysWindow: number,
): boolean {
  if (statusFilter === 'ativas') {
    return getOperationalBucket(row) !== 'concluidas'
  }
  if (!statusFilter) return true
  const b = getOperationalBucket(row)
  if (statusFilter === 'concluidas' && daysWindow > 0) {
    if (b !== 'concluidas') return false
    const ca = row.completedAt
    if (!ca) return false
    const ms = new Date(ca).getTime()
    if (Number.isNaN(ms)) return false
    const cutoff = Date.now() - daysWindow * 24 * 60 * 60 * 1000
    return ms >= cutoff
  }
  return b === statusFilter
}

export function BacklogPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { presentBlocking } = useSgpErrorSurface()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams

  const dataMode = getDataMode()
  const useLiveApi = dataMode === 'real' || dataMode === 'auto'

  const qFromUrl = parseBacklogQ(searchParams)
  const [qDraft, setQDraft] = useState(qFromUrl)
  useEffect(() => {
    setQDraft(qFromUrl)
  }, [qFromUrl])

  useRegisterTransientContext({
    id: 'backlog-search-draft',
    isDirty: () => qDraft.trim() !== qFromUrl.trim(),
    onReset: () => setQDraft(qFromUrl),
  })

  useEffect(() => {
    if (qDraft.trim() === qFromUrl) return
    const t = window.setTimeout(() => {
      const next = new URLSearchParams(searchParamsRef.current)
      const tq = qDraft.trim()
      if (tq) next.set('q', tq)
      else next.delete('q')
      next.delete('page')
      setSearchParams(next, { replace: true })
    }, 320)
    return () => window.clearTimeout(t)
  }, [qDraft, qFromUrl, setSearchParams])

  const statusFilter = useMemo(
    () => parseBacklogSituationFilter(searchParams),
    [searchParams],
  )

  const daysWindow = useMemo(
    () => parseBacklogDaysWindow(searchParams),
    [searchParams],
  )

  const priorityFilter = useMemo(
    () => parseBacklogPriority(searchParams),
    [searchParams],
  )

  const responsibleFilter = useMemo(
    () => parseBacklogResponsible(searchParams),
    [searchParams],
  )

  /** Normaliza combinações incoerentes na URL (precedência: `scope=ativas` > `situacao`; `days` só com concluídas). */
  useEffect(() => {
    const normalized = normalizeBacklogSearchParams(searchParams)
    if (normalized) setSearchParams(normalized, { replace: true })
  }, [searchParams, setSearchParams])

  const handleStatusFilterChange = useCallback(
    (v: string) => {
      const next = new URLSearchParams(searchParams)
      next.delete('page')
      next.delete('scope')
      next.delete('situacao')
      next.delete('days')
      next.delete('completedWithinDays')
      if (!v) {
        setSearchParams(next, { replace: true })
        return
      }
      if (v === 'ativas') {
        next.set('scope', 'ativas')
      } else if (v === 'concluidas') {
        next.set('situacao', 'concluidas')
      } else {
        next.set('situacao', v)
      }
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const handlePriorityChange = useCallback(
    (v: string) => {
      const next = new URLSearchParams(searchParams)
      next.delete('page')
      if (!v) next.delete('priority')
      else next.set('priority', v)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const handleResponsibleChange = useCallback(
    (v: string) => {
      const next = new URLSearchParams(searchParams)
      next.delete('page')
      if (!v) next.delete('responsible')
      else next.set('responsible', v)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const scrollToListSection = useCallback(() => {
    listSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [])

  const handleKpiBucketClick = useCallback(
    (bucket: OperationalBucket) => {
      handleStatusFilterChange(bucket)
      window.requestAnimationFrame(() => {
        scrollToListSection()
      })
    },
    [handleStatusFilterChange, scrollToListSection],
  )

  const [routeToast, setRouteToast] = useState<string | null>(null)
  const listSectionRef = useRef<HTMLElement | null>(null)

  const [apiRows, setApiRows] = useState<BacklogRow[]>([])
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const loadConveyors = useCallback(async () => {
    if (!useLiveApi) return
    setApiLoading(true)
    setApiError(null)
    try {
      // Fonte global do painel: sem recortes de filtros de tabela.
      const items = await listConveyors()
      setApiRows(items.map(mapConveyorListItemToBacklogRow))
    } catch (e) {
      setApiRows([])
      const n = reportClientError(e, {
        module: 'backlog',
        action: 'list_conveyors',
        route: location.pathname + location.search,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
      } else {
        setApiError(n.userMessage)
      }
    } finally {
      setApiLoading(false)
    }
  }, [useLiveApi])

  useEffect(() => {
    void loadConveyors()
  }, [loadConveyors])

  useEffect(() => {
    if (!useLiveApi) return
    const onFocus = () => {
      void loadConveyors()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [useLiveApi, loadConveyors])

  useEffect(() => {
    const msg = (location.state as { sgpToast?: string } | null)?.sgpToast
    if (!msg) return
    const id = window.setTimeout(() => {
      setRouteToast(msg)
      navigate(`${location.pathname}${location.search}`, {
        replace: true,
        state: {},
      })
    }, 0)
    return () => window.clearTimeout(id)
  }, [location, navigate])

  const extra = useSyncExternalStore(
    subscribeEsteiras,
    getEsteirasExtraSnapshot,
    getEsteirasExtraSnapshot,
  )

  const mockRows = useMemo(
    () => [...BACKLOG_MOCK_ROWS, ...extra],
    [extra],
  )

  const allRows = useLiveApi ? apiRows : mockRows

  const page = useMemo(() => parseBacklogPage(searchParams), [searchParams])
  const pageSize = useMemo(
    () => parseBacklogPageSize(searchParams),
    [searchParams],
  )

  const setBacklogPage = useCallback(
    (p: number) => {
      const next = new URLSearchParams(searchParams)
      if (p <= 1) next.delete('page')
      else next.set('page', String(p))
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const setBacklogPageSize = useCallback(
    (n: number) => {
      const next = new URLSearchParams(searchParams)
      if (n === COLABS_DEFAULT_PAGE_SIZE) next.delete('pageSize')
      else next.set('pageSize', String(n))
      next.delete('page')
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const filtered = useMemo(() => {
    return allRows.filter((row) => {
      if (!matchesSearch(row, qDraft)) return false
      if (priorityFilter && row.priority !== priorityFilter) return false
      if (responsibleFilter && row.responsible !== responsibleFilter) {
        return false
      }
      if (!applySituationAndWindow(row, statusFilter, daysWindow)) return false
      return true
    })
  }, [
    allRows,
    qDraft,
    priorityFilter,
    responsibleFilter,
    statusFilter,
    daysWindow,
  ])

  const kpis = useMemo(() => computeBacklogKpis(allRows), [allRows])

  const totalFiltered = filtered.length
  const maxPage = Math.max(1, Math.ceil(totalFiltered / pageSize) || 1)

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  useEffect(() => {
    if (useLiveApi && apiLoading) return
    if (totalFiltered === 0 && page > 1) {
      setBacklogPage(1)
      return
    }
    if (page > maxPage) {
      setBacklogPage(maxPage)
    }
  }, [
    useLiveApi,
    apiLoading,
    totalFiltered,
    page,
    maxPage,
    setBacklogPage,
  ])

  const responsibleOptions = useMemo(() => {
    const set = new Set<string>()
    for (const r of allRows) {
      const x = r.responsible?.trim()
      if (x && x !== '—') set.add(x)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [allRows])

  const hasTemporalWindow =
    statusFilter === 'concluidas' && daysWindow > 0
  const hasTableFilters =
    Boolean(qFromUrl.trim()) ||
    Boolean(statusFilter) ||
    Boolean(priorityFilter) ||
    Boolean(responsibleFilter) ||
    hasTemporalWindow

  return (
    <div className="space-y-8">
      {routeToast && (
        <SgpToast
          fixed
          message={routeToast}
          variant="success"
          onDismiss={() => setRouteToast(null)}
        />
      )}

      <header className="sgp-header-card flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
            <span className="h-px w-8 bg-gradient-to-r from-sgp-gold to-transparent" />
            Operação
          </p>
          <h1 className="sgp-page-title mt-3">Painel Operacional de Esteiras</h1>
          <p className="sgp-page-lead">
            Acompanhe backlog, revisão, andamento, atraso e conclusão das esteiras
            em uma visão única da operação.
          </p>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            {backlogHeaderSemanticLine}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
          <Link to="/app/nova-esteira" className="sgp-cta-primary">
            Nova Esteira Manual
          </Link>
          <Link to="/app/importar-os" className="sgp-cta-secondary">
            Nova esteira por documento
          </Link>
        </div>
      </header>

      {useLiveApi && apiError ? (
        <div
          className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-100/95"
          role="alert"
        >
          {apiError}
        </div>
      ) : null}

      <div className="space-y-3">
        <p className="max-w-3xl text-xs text-slate-500">{backlogKpiDeckIntro}</p>
        <BacklogKpiCards
          kpis={kpis}
          activeBucket={statusFilter && statusFilter !== 'ativas' ? statusFilter : null}
          onBucketClick={handleKpiBucketClick}
        />
      </div>

      {hasTableFilters ? (
        <div className="space-y-2 text-xs text-slate-500">
          <p>{backlogTotalsVsTableFiltered}</p>
          <div className="flex flex-wrap items-center gap-2">
            {statusFilter === 'ativas' ? (
              <span className="inline-flex items-center rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-sky-200/95">
                {backlogSituationChipLabel('ativas')}
              </span>
            ) : null}
            {backlogChipSituacaoPrefixed(statusFilter) ? (
              <span className="inline-flex items-center rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-sky-200/95">
                {backlogChipSituacaoPrefixed(statusFilter)}
              </span>
            ) : null}
            {hasTemporalWindow ? (
              <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-100/90">
                {backlogChipJanelaDias(daysWindow)}
              </span>
            ) : null}
            {qFromUrl.trim() ? (
              <span className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-semibold text-slate-300/95">
                {backlogChipBusca(qFromUrl)}
              </span>
            ) : null}
            {priorityFilter === 'alta' ||
            priorityFilter === 'media' ||
            priorityFilter === 'baixa' ? (
              <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-100/90">
                {backlogChipPrioridade(priorityFilter as BacklogPriorityParam)}
              </span>
            ) : null}
            {responsibleFilter ? (
              <span className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet-100/90">
                {backlogChipResponsavel(responsibleFilter)}
              </span>
            ) : null}
          </div>
          {statusFilter === 'ativas' ? (
            <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-slate-400">
              {backlogFilterDetailAtivas}
            </p>
          ) : null}
          {hasTemporalWindow ? (
            <p className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-2 text-emerald-100/90">
              {backlogFilterDetailConcluidasWindow(daysWindow)}
            </p>
          ) : null}
        </div>
      ) : null}

      {useLiveApi && apiLoading ? (
        <p className="text-sm text-slate-500">Carregando esteiras…</p>
      ) : null}

      <section ref={listSectionRef} className="space-y-4">
        <BacklogFilters
          search={qDraft}
          onSearchChange={setQDraft}
          statusFilter={statusFilter}
          onStatusChange={handleStatusFilterChange}
          priorityFilter={priorityFilter}
          onPriorityChange={handlePriorityChange}
          responsibleFilter={responsibleFilter}
          onResponsibleChange={handleResponsibleChange}
          responsibleOptions={responsibleOptions}
          pageSize={pageSize}
          onPageSizeChange={setBacklogPageSize}
        />
        <p className="text-xs text-slate-500">
          {useLiveApi && apiLoading
            ? 'Carregando…'
            : `${totalFiltered} registro(s) · página ${page} de ${maxPage}`}
        </p>
        <SgpContextActionsMenuProvider>
          <BacklogTable rows={pagedRows} />
        </SgpContextActionsMenuProvider>
        {!useLiveApi || !apiLoading ? (
          totalFiltered > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
              <p className="text-xs">
                A mostrar{' '}
                <span className="tabular-nums font-medium text-slate-300">
                  {(page - 1) * pageSize + 1}–
                  {Math.min(page * pageSize, totalFiltered)}
                </span>{' '}
                de{' '}
                <span className="tabular-nums font-medium text-slate-300">
                  {totalFiltered}
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-40"
                  disabled={page <= 1}
                  onClick={() => setBacklogPage(page - 1)}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-40"
                  disabled={page >= maxPage}
                  onClick={() => setBacklogPage(page + 1)}
                >
                  Seguinte
                </button>
              </div>
            </div>
          ) : null
        ) : null}
      </section>
    </div>
  )
}
