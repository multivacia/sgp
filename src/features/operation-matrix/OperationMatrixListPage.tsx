import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  SgpContextActionsMenu,
  SgpContextActionsMenuProvider,
  type SgpContextActionsMenuItemDef,
} from '../../components/shell/SgpContextActionsMenu'
import { PageCanvas } from '../../components/ui/PageCanvas'
import {
  isBlockingSeverity,
  reportClientError,
} from '../../lib/errors'
import { useSgpErrorSurface } from '../../lib/errors/SgpErrorPresentation'
import {
  deleteMatrixNode,
  listMatrixItems,
  patchMatrixNode,
  restoreMatrixNode,
} from '../../services/operation-matrix/operationMatrixApiService'
import type { MatrixNodeApi } from '../../domain/operation-matrix/operation-matrix.types'
import { useAuth } from '../../lib/use-auth'

type FiltroAtivo = 'todos' | 'ativos' | 'inativos'
const MATRIX_DEFAULT_PAGE_SIZE = 25
const MATRIX_PAGE_SIZE_OPTIONS = [25, 50, 100] as const

export function OperationMatrixListPage() {
  const { presentBlocking } = useSgpErrorSurface()
  const { can } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const restoreMatrixId = (
    location.state as { restoreMatrixId?: string } | null
  )?.restoreMatrixId

  const [busca, setBusca] = useState('')
  const [draftBusca, setDraftBusca] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroAtivo>('todos')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(MATRIX_DEFAULT_PAGE_SIZE)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<MatrixNodeApi[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const canManageMatrix = can('operation_matrix.manage')
  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const isActive =
        filtroAtivo === 'todos'
          ? undefined
          : filtroAtivo === 'ativos'
            ? true
            : false
      const data = await listMatrixItems({
        search: busca.trim() || undefined,
        isActive,
      })
      setRows(data)
    } catch (e) {
      const n = reportClientError(e, {
        module: 'operation-matrix',
        action: 'matrix_list_load',
        route: location.pathname,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
        setLoadError(null)
      } else {
        setLoadError(n.userMessage)
      }
    } finally {
      setLoading(false)
    }
  }, [filtroAtivo, busca, location.pathname, presentBlocking])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = draftBusca.trim()
      if (trimmed === busca) return
      setBusca(trimmed)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [draftBusca, busca])

  async function handleRestoreMatrixFromList() {
    if (!restoreMatrixId) return
    setRestoring(true)
    setLoadError(null)
    try {
      await restoreMatrixNode(restoreMatrixId)
      navigate('.', { replace: true, state: {} })
      await load()
    } catch (e) {
      const n = reportClientError(e, {
        module: 'operation-matrix',
        action: 'matrix_restore_from_list',
        route: location.pathname,
        entityId: restoreMatrixId,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
        setLoadError(null)
      } else {
        setLoadError(n.userMessage)
      }
    } finally {
      setRestoring(false)
    }
  }

  async function runItemAction(
    itemId: string,
    action: () => Promise<unknown>,
  ) {
    setActionLoadingId(itemId)
    setLoadError(null)
    try {
      await action()
      await load()
    } catch (e) {
      const n = reportClientError(e, {
        module: 'operation-matrix',
        action: 'matrix_list_item_action',
        route: location.pathname,
        entityId: itemId,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
        setLoadError(null)
      } else {
        setLoadError(n.userMessage)
      }
    } finally {
      setActionLoadingId(null)
    }
  }

  const lista = useMemo(
    () =>
      [...rows].sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR'),
      ),
    [rows],
  )
  const maxPage = Math.max(1, Math.ceil(lista.length / pageSize) || 1)
  const currentPage = Math.min(page, maxPage)
  const pageStart = (currentPage - 1) * pageSize
  const pageEnd = pageStart + pageSize
  const pagedLista = useMemo(
    () => lista.slice(pageStart, pageEnd),
    [lista, pageStart, pageEnd],
  )

  useEffect(() => {
    if (page > maxPage) setPage(maxPage)
  }, [page, maxPage])

  return (
    <SgpContextActionsMenuProvider>
    <PageCanvas>
      <header className="sgp-header-card max-w-6xl">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
          <span className="h-px w-8 bg-gradient-to-r from-sgp-gold to-transparent" />
          Gestão
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="sgp-page-title">Matrizes de operação</h1>
            <p className="sgp-page-lead max-w-2xl">
              Catálogo mestre por item do pedido: tarefas, setores e atividades com
              previsto e responsável padrão. A esteira operacional será derivada
              desta matriz em um bloco futuro.
            </p>
          </div>
          <Link
            to="/app/matrizes-operacao/nova"
            className="sgp-cta-primary px-6 no-underline"
          >
            Nova matriz
          </Link>
        </div>
      </header>

      {restoreMatrixId ? (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-50/95">
          <span>Matriz removida. Deseja restaurar o item raiz e toda a árvore?</span>
          <button
            type="button"
            disabled={restoring}
            onClick={() => void handleRestoreMatrixFromList()}
            className="rounded-lg border border-amber-400/40 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-50 disabled:opacity-50"
          >
            {restoring ? 'Restaurando…' : 'Restaurar matriz'}
          </button>
          <button
            type="button"
            disabled={restoring}
            onClick={() => navigate('.', { replace: true, state: {} })}
            className="text-xs text-amber-200/70 underline"
          >
            Dispensar
          </button>
        </div>
      ) : null}

      {loadError ? (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100/90"
        >
          {loadError}
        </div>
      ) : null}

      <section className="mt-8">
        <div className="sgp-panel sgp-panel-hover flex flex-col gap-3 !p-4 md:flex-row md:flex-wrap md:items-end">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs">
          <span className="font-semibold uppercase tracking-wider text-slate-500">
            Buscar
          </span>
          <input
            value={draftBusca}
            onChange={(e) => setDraftBusca(e.target.value)}
            placeholder="Nome ou código…"
            className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold uppercase tracking-wider text-slate-500">
            Situação
          </span>
          <select
            value={filtroAtivo}
            onChange={(e) => setFiltroAtivo(e.target.value as FiltroAtivo)}
            className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
          >
            <option value="todos">Todos</option>
            <option value="ativos">Ativos</option>
            <option value="inativos">Inativos</option>
          </select>
        </label>
        <label className="flex min-w-[9rem] flex-col gap-1 text-xs">
          <span className="font-semibold uppercase tracking-wider text-slate-500">
            Por página
          </span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
          >
            {MATRIX_PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {loading
            ? 'Carregando…'
            : `${lista.length} registro(s) · página ${currentPage} de ${maxPage}`}
        </p>
      </section>

      <section className="mt-6 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Carregando…</p>
        ) : lista.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-sgp-app-panel-deep/35 px-6 py-12 text-center text-sm text-slate-400">
            Nenhuma matriz encontrada. Crie uma nova matriz para começar.
          </div>
        ) : (
          pagedLista.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-sgp-app-panel-deep/35 px-5 py-4 shadow-inner"
            >
              <div>
                <p className="font-heading text-base font-semibold text-white">
                  {item.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.code ? (
                    <span className="font-mono text-slate-400">{item.code}</span>
                  ) : (
                    <span>Sem código</span>
                  )}
                  {' · '}
                  {item.is_active ? (
                    <span className="text-emerald-400/90">Ativo</span>
                  ) : (
                    <span className="text-amber-400/90">Inativo</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <SgpContextActionsMenu
                  menuKey={`matrix-item-${item.id}`}
                  disabled={actionLoadingId === item.id}
                  items={
                    [
                      {
                        label: 'Abrir matriz',
                        onClick: () => navigate(`/app/matrizes-operacao/${item.id}`),
                      },
                      canManageMatrix && item.is_active
                        ? {
                            label: 'Inativar matriz',
                            onClick: () => {
                              if (
                                !window.confirm(
                                  'Deseja inativar esta matriz?',
                                )
                              ) {
                                return
                              }
                              return runItemAction(item.id, () =>
                                patchMatrixNode(item.id, { isActive: false }),
                              )
                            },
                          }
                        : null,
                      canManageMatrix && !item.is_active
                        ? {
                            label: 'Ativar matriz',
                            onClick: () => {
                              if (
                                !window.confirm(
                                  'Deseja ativar esta matriz?',
                                )
                              ) {
                                return
                              }
                              return runItemAction(item.id, () =>
                                patchMatrixNode(item.id, { isActive: true }),
                              )
                            },
                          }
                        : null,
                      canManageMatrix
                        ? {
                            label: 'Excluir matriz',
                            destructive: true,
                            onClick: () => {
                              if (
                                !window.confirm(
                                  'Deseja excluir esta matriz?',
                                )
                              ) {
                                return
                              }
                              return runItemAction(item.id, () =>
                                deleteMatrixNode(item.id),
                              )
                            },
                          }
                        : null,
                    ].filter(Boolean) as SgpContextActionsMenuItemDef[]
                  }
                />
              </div>
            </div>
          ))
        )}
      </section>
      {!loading && lista.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
          <p className="text-xs">
            A mostrar{' '}
            <span className="tabular-nums font-medium text-slate-300">
              {pageStart + 1}–{Math.min(pageStart + pageSize, lista.length)}
            </span>{' '}
            de <span className="tabular-nums font-medium text-slate-300">{lista.length}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-40"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-40"
              disabled={currentPage >= maxPage}
              onClick={() => setPage((p) => p + 1)}
            >
              Seguinte
            </button>
          </div>
        </div>
      ) : null}
    </PageCanvas>
    </SgpContextActionsMenuProvider>
  )
}
