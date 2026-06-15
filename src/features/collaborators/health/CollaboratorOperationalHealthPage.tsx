import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageCanvas } from '../../../components/ui/PageCanvas'
import type {
  CollaboratorHealthSummaryStatusFilter,
  CollaboratorOperationalHealthSnapshot,
  CollaboratorOperationalHealthSummary,
  CollaboratorOperationalHealthSummaryMeta,
} from '../../../domain/collaborator-health/collaboratorOperationalHealth.types'
import { filterCollaboratorHealthSummaryRows } from '../../../domain/collaborator-health/collaboratorOperationalHealthSummaryFilters'
import { isBlockingSeverity, reportClientError } from '../../../lib/errors'
import { useSgpErrorSurface } from '../../../lib/errors/SgpErrorPresentation'
import { useRegisterTransientContext } from '../../../lib/shell/transient-context'
import {
  getCollaboratorOperationalHealthSnapshot,
  getCollaboratorOperationalHealthSummary,
} from '../../../services/collaboratorOperationalHealth.service'
import { CollaboratorHealthSummaryCards } from './CollaboratorHealthSummaryCards'
import { CollaboratorHealthSummaryTable } from './CollaboratorHealthSummaryTable'
import { CollaboratorHealthSnapshotPanel } from './CollaboratorHealthSnapshotPanel'

const SUMMARY_LIMIT = 50

const LOAD_BLOCKING_TITLE = 'Não foi possível carregar a saúde operacional'
const LOAD_BLOCKING_MESSAGE =
  'Ocorreu um problema ao obter o resumo. Tente novamente em instantes ou confirme a sua sessão.'

export function CollaboratorOperationalHealthPage() {
  const { pathname } = useLocation()
  const { presentBlocking } = useSgpErrorSurface()

  const [recentDays, setRecentDays] = useState<7 | 15 | 30>(7)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CollaboratorHealthSummaryStatusFilter>('all')

  const [summary, setSummary] = useState<CollaboratorOperationalHealthSummary | null>(null)
  const [meta, setMeta] = useState<CollaboratorOperationalHealthSummaryMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<CollaboratorOperationalHealthSnapshot | null>(null)
  const [snapLoading, setSnapLoading] = useState(false)
  const [snapError, setSnapError] = useState<string | null>(null)

  useRegisterTransientContext({
    id: 'collaboradores-saude-operacional',
    isDirty: () => false,
    onReset: () => {
      setDetailOpen(false)
      setDetailId(null)
    },
  })

  const loadSummary = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { summary: s, meta: m } = await getCollaboratorOperationalHealthSummary({
        recentDays,
        limit: SUMMARY_LIMIT,
        includeInactive,
      })
      setSummary(s)
      setMeta(m)
    } catch (err) {
      const n = reportClientError(err, {
        module: 'collaboradores_saude',
        action: 'summary_load',
        route: pathname,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking({
          ...n,
          modalTitle: LOAD_BLOCKING_TITLE,
          userMessage: LOAD_BLOCKING_MESSAGE,
        })
        return
      }
      setLoadError(
        'Não foi possível carregar a saúde operacional dos colaboradores. Tente atualizar a página ou verificar a sua ligação.',
      )
    } finally {
      setLoading(false)
    }
  }, [includeInactive, pathname, presentBlocking, recentDays])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  const filteredRows = useMemo(() => {
    if (!summary) return []
    return filterCollaboratorHealthSummaryRows(summary.rows, { search, status: statusFilter })
  }, [summary, search, statusFilter])

  useEffect(() => {
    if (!detailOpen || !detailId) return
    let cancelled = false
    setSnapLoading(true)
    setSnapError(null)
    setSnapshot(null)
    void getCollaboratorOperationalHealthSnapshot(detailId, { recentDays })
      .then((snap) => {
        if (!cancelled) setSnapshot(snap)
      })
      .catch((err) => {
        if (cancelled) return
        reportClientError(err, {
          module: 'collaboradores_saude',
          action: 'snapshot_load',
          route: pathname,
          entityId: detailId,
        })
        setSnapError('Não foi possível carregar o detalhe deste colaborador.')
      })
      .finally(() => {
        if (!cancelled) setSnapLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [detailId, detailOpen, pathname, recentDays])

  function openDetail(id: string) {
    setDetailId(id)
    setDetailOpen(true)
  }

  function closeDetail() {
    setDetailOpen(false)
    setDetailId(null)
    setSnapshot(null)
    setSnapError(null)
  }

  return (
    <PageCanvas>
      <header className="sgp-header-card max-w-6xl">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
          <span className="h-px w-8 bg-gradient-to-r from-sgp-gold to-transparent" />
          Gestão
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="sgp-page-title">Saúde operacional dos colaboradores</h1>
            <p className="sgp-page-lead">
              Carga pendente, capacidade e apontamentos recentes com base nas regras determinísticas
              do SGP.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Resumo operacional baseado nos dados atuais do colaborador (carga, capacidade e
              apontamentos).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/app/colaboradores"
              className="rounded-lg border border-white/12 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/[0.05]"
            >
              Voltar a colaboradores
            </Link>
            <button
              type="button"
              className="sgp-cta-primary px-5 py-2 text-sm"
              disabled={loading}
              onClick={() => void loadSummary()}
            >
              Atualizar
            </button>
          </div>
        </div>
      </header>

      <section className="mt-6 max-w-6xl rounded-xl border border-white/[0.08] bg-sgp-app-panel-deep/50 px-4 py-3 text-xs text-slate-500">
        Regras determinísticas do SGP — sem julgamento de desempenho individual. Use os sinais para
        priorização operacional.
      </section>

      <section className="mt-6 max-w-6xl sgp-panel sgp-panel-hover">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          <label className="flex min-w-[10rem] flex-col gap-1 text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500">Janela (dias)</span>
            <select
              value={recentDays}
              onChange={(e) => setRecentDays(Number(e.target.value) as 7 | 15 | 30)}
              className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
            >
              <option value={7}>7 dias</option>
              <option value={15}>15 dias</option>
              <option value={30}>30 dias</option>
            </select>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              className="size-4 rounded border-white/20 bg-sgp-void"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            <span>Incluir colaboradores inativos</span>
          </label>
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500">
              Busca local (nome ou código)
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtra a lista já carregada…"
              className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
            />
          </label>
          <label className="flex min-w-[11rem] flex-col gap-1 text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500">
              Estado operacional
            </span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as CollaboratorHealthSummaryStatusFilter)
              }
              className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
            >
              <option value="all">Todos</option>
              <option value="critical">Crítico</option>
              <option value="attention">Atenção</option>
              <option value="healthy">Saudável</option>
              <option value="unknown">Sem dados suficientes (estado)</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Limite atual: {SUMMARY_LIMIT} colaboradores por pedido.
          {meta?.hasMore ? (
            <span className="mt-1 block text-amber-200/80">
              Existem mais colaboradores para além dos exibidos. Refine os filtros locais ou aguarde
              evoluções de listagem.
            </span>
          ) : null}
        </p>
      </section>

      {loading ? (
        <p className="mt-8 text-sm text-slate-400">Carregando saúde operacional…</p>
      ) : loadError ? (
        <div
          role="alert"
          className="mt-8 max-w-2xl rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100/90"
        >
          <p className="font-semibold">{loadError}</p>
          <p className="mt-2 text-xs text-rose-100/75">
            Tente atualizar a página ou verificar a sua ligação.
          </p>
        </div>
      ) : summary ? (
        <>
          <div className="mt-8 max-w-6xl">
            <CollaboratorHealthSummaryCards totals={summary.totals} />
          </div>
          <div className="mt-8 max-w-6xl">
            {filteredRows.length === 0 ? (
              <p className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-400">
                Não há colaboradores para exibir com os filtros atuais.
              </p>
            ) : (
              <CollaboratorHealthSummaryTable rows={filteredRows} onOpenDetail={openDetail} />
            )}
          </div>
        </>
      ) : null}

      <CollaboratorHealthSnapshotPanel
        open={detailOpen}
        loading={snapLoading}
        error={snapError}
        snapshot={snapshot}
        onClose={closeDetail}
      />
    </PageCanvas>
  )
}
