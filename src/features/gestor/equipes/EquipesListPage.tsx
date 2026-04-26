import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  SgpContextActionsMenu,
  SgpContextActionsMenuProvider,
  type SgpContextActionsMenuItemDef,
} from '../../../components/shell/SgpContextActionsMenu'
import { PageCanvas } from '../../../components/ui/PageCanvas'
import type { Team } from '../../../domain/teams/team.types'
import {
  COLABS_DEFAULT_PAGE_SIZE,
  COLABS_PAGE_SIZE_OPTIONS,
} from '../../../lib/admin/collaboratorsListUrlState'
import {
  isBlockingSeverity,
  reportClientError,
} from '../../../lib/errors'
import { useSgpErrorSurface } from '../../../lib/errors/SgpErrorPresentation'
import { useAuth } from '../../../lib/use-auth'
import { deleteTeam, listTeams, patchTeam } from '../../../services/teams/teamsApiService'

/** Copy específica do modal bloqueante quando falha o GET da listagem (mantém log/severidade via `reportClientError`). */
const EQUIPES_LIST_LOAD_BLOCKING_TITLE = 'Não foi possível carregar as equipes'
const EQUIPES_LIST_LOAD_BLOCKING_MESSAGE =
  'Ocorreu um problema ao buscar as equipes cadastradas. Tente novamente em instantes.'

type TeamsListUrlState = {
  page: number
  pageSize: number
  search: string
  isActive: 'all' | 'true' | 'false'
}

function parsePositiveInt(s: string | null, fallback: number): number {
  const n = Number.parseInt(s ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function parseTeamsListUrlState(sp: URLSearchParams): TeamsListUrlState {
  const page = Math.max(1, parsePositiveInt(sp.get('page'), 1))
  const psRaw = sp.get('pageSize')
  const psNum = Number.parseInt(psRaw ?? '', 10)
  const pageSize = (COLABS_PAGE_SIZE_OPTIONS as readonly number[]).includes(psNum)
    ? psNum
    : COLABS_DEFAULT_PAGE_SIZE
  const isActiveRaw = sp.get('isActive') ?? 'all'
  const isActive = ['all', 'true', 'false'].includes(isActiveRaw)
    ? (isActiveRaw as TeamsListUrlState['isActive'])
    : 'all'

  return {
    page,
    pageSize,
    search: sp.get('search')?.trim() ?? '',
    isActive,
  }
}

function serializeTeamsListUrl(state: TeamsListUrlState): URLSearchParams {
  const q = new URLSearchParams()
  if (state.page > 1) q.set('page', String(state.page))
  if (state.pageSize !== COLABS_DEFAULT_PAGE_SIZE) q.set('pageSize', String(state.pageSize))
  if (state.search.trim()) q.set('search', state.search.trim())
  if (state.isActive !== 'all') q.set('isActive', state.isActive)
  return q
}

export function EquipesListPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { presentBlocking } = useSgpErrorSurface()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlState = useMemo(
    () => parseTeamsListUrlState(searchParams),
    [searchParams],
  )
  const { can } = useAuth()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [rows, setRows] = useState<Team[]>([])
  const [total, setTotal] = useState(0)
  const [draftSearch, setDraftSearch] = useState(urlState.search)

  useEffect(() => {
    setDraftSearch(urlState.search)
  }, [urlState.search])

  const patchListUrl = useCallback(
    (patch: Partial<TeamsListUrlState>, opts?: { replace?: boolean }) => {
      const resetsPage = 'search' in patch || 'isActive' in patch || 'pageSize' in patch
      const next: TeamsListUrlState = {
        ...urlState,
        ...patch,
        ...(resetsPage && !('page' in patch) ? { page: 1 } : {}),
      }
      setSearchParams(serializeTeamsListUrl(next), {
        replace: opts?.replace !== false,
      })
    },
    [urlState, setSearchParams],
  )

  useEffect(() => {
    const t = window.setTimeout(() => {
      const trimmed = draftSearch.trim()
      if (trimmed === urlState.search) return
      patchListUrl({ search: trimmed })
    }, 350)
    return () => window.clearTimeout(t)
  }, [draftSearch, urlState.search, patchListUrl])

  const listParams = useMemo(() => {
    const offset = (urlState.page - 1) * urlState.pageSize
    return {
      search: urlState.search.trim() || undefined,
      isActive: urlState.isActive,
      limit: urlState.pageSize,
      offset,
    }
  }, [urlState])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { items, total: t } = await listTeams({
        search: listParams.search,
        isActive: listParams.isActive,
        limit: listParams.limit,
        offset: listParams.offset,
      })
      setRows(items)
      setTotal(t)
    } catch (err) {
      const n = reportClientError(err, {
        module: 'equipes',
        action: 'list',
        route: pathname,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking({
          ...n,
          modalTitle: EQUIPES_LIST_LOAD_BLOCKING_TITLE,
          userMessage: EQUIPES_LIST_LOAD_BLOCKING_MESSAGE,
        })
        return
      }
      setLoadError(n.userMessage)
    } finally {
      setLoading(false)
    }
  }, [listParams, pathname, presentBlocking])

  useEffect(() => {
    void load()
  }, [load])

  const maxPage = Math.max(1, Math.ceil(total / urlState.pageSize) || 1)

  useEffect(() => {
    if (loading) return
    if (total === 0 && urlState.page > 1) {
      patchListUrl({ page: 1 })
      return
    }
    if (urlState.page > maxPage) {
      patchListUrl({ page: maxPage })
    }
  }, [loading, total, urlState.page, maxPage, patchListUrl])

  const currentPage = urlState.page
  const offset = (urlState.page - 1) * urlState.pageSize

  const runRowAction = useCallback(
    async (teamId: string, action: () => Promise<unknown>) => {
      setActionLoadingId(teamId)
      setLoadError(null)
      try {
        await action()
        await load()
      } catch (err) {
        const n = reportClientError(err, {
          module: 'equipes',
          action: 'list_row_action',
          route: pathname,
          entityId: teamId,
        })
        if (isBlockingSeverity(n.severity)) {
          presentBlocking(n)
          return
        }
        setLoadError(n.userMessage)
      } finally {
        setActionLoadingId(null)
      }
    },
    [load, pathname, presentBlocking],
  )

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
            <h1 className="sgp-page-title">Equipes</h1>
            <p className="sgp-page-lead max-w-2xl">
              Agrupamentos operacionais reutilizáveis. Membros são colaboradores ativos; alterações
              de estado do colaborador permanecem visíveis na equipe.
            </p>
          </div>
          {can('teams.create') && (
            <Link to="/app/equipes/nova" className="sgp-cta-primary inline-flex px-6 py-2.5">
              Nova equipe
            </Link>
          )}
        </div>
      </header>

      <section className="max-w-6xl">
        <div className="sgp-panel sgp-panel-hover flex flex-col gap-3 !p-4 md:flex-row md:flex-wrap md:items-end">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500">Buscar</span>
            <input
              className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              placeholder="Nome da equipe…"
            />
          </label>
          <label className="flex min-w-[10rem] flex-col gap-1 text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500">Situação</span>
            <select
              className="sgp-input-app min-w-[10rem] rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
              value={urlState.isActive}
              onChange={(e) => {
                patchListUrl({ isActive: e.target.value as TeamsListUrlState['isActive'] })
              }}
            >
              <option value="all">Todas</option>
              <option value="true">Ativas</option>
              <option value="false">Inativas</option>
            </select>
          </label>
          <label className="flex min-w-[9rem] flex-col gap-1 text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500">Por página</span>
            <select
              className="sgp-input-app min-w-[9rem] rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
              value={urlState.pageSize}
              onChange={(e) => {
                patchListUrl({ pageSize: Number(e.target.value), page: 1 })
              }}
            >
              {COLABS_PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loadError && (
          <p className="mt-4 text-sm text-rose-300">
            {loadError}{' '}
            <button
              type="button"
              className="underline"
              onClick={() => {
                void load()
              }}
            >
              Tentar novamente
            </button>
          </p>
        )}

        <div className="mt-6 sgp-table-shell">
          <div className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-slate-400">Carregando…</p>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-black/20 py-12 text-center">
              <p className="text-slate-300">Nenhuma equipe encontrada.</p>
              <p className="mt-2 text-sm text-slate-500">
                Crie uma equipe para agrupar colaboradores em operações futuras.
              </p>
              {can('teams.create') && (
                <Link
                  to="/app/equipes/nova"
                  className="mt-6 inline-flex text-sm font-semibold text-sgp-gold hover:underline"
                >
                  Nova equipe
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr
                  className="border-b border-white/[0.08] text-white shadow-inner"
                  style={{ background: 'var(--sgp-gradient-header)' }}
                >
                  <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Nome</th>
                  <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Membros</th>
                  <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Situação</th>
                  <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Atualizado</th>
                  <th className="whitespace-nowrap px-4 py-4 text-right font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-white/5 text-slate-200 transition hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3 font-medium text-white">{row.name}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {row.activeMemberCount ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.isActive
                            ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300'
                            : 'rounded-full bg-slate-500/15 px-2 py-0.5 text-[11px] font-semibold text-slate-400'
                        }
                      >
                        {row.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {row.updatedAt
                        ? new Date(row.updatedAt).toLocaleString('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end">
                        <SgpContextActionsMenu
                          menuKey={`team-row-${row.id}`}
                          disabled={actionLoadingId === row.id}
                          items={
                            [
                              {
                                label: 'Editar',
                                onClick: () => {
                                  navigate(`/app/equipes/${row.id}`)
                                },
                              },
                              can('teams.update') && row.isActive
                                ? {
                                    label: 'Inativar',
                                    onClick: () => {
                                      if (!window.confirm('Deseja inativar esta equipe?')) {
                                        return
                                      }
                                      return runRowAction(row.id, () =>
                                        patchTeam(row.id, { isActive: false }),
                                      )
                                    },
                                  }
                                : null,
                              can('teams.update') && !row.isActive
                                ? {
                                    label: 'Ativar',
                                    onClick: () => {
                                      if (!window.confirm('Deseja ativar esta equipe?')) {
                                        return
                                      }
                                      return runRowAction(row.id, () =>
                                        patchTeam(row.id, { isActive: true }),
                                      )
                                    },
                                  }
                                : null,
                              can('teams.update')
                                ? {
                                    label: 'Remover',
                                    destructive: true,
                                    onClick: () => {
                                      if (!window.confirm('Deseja remover esta equipe?')) {
                                        return
                                      }
                                      return runRowAction(row.id, () => deleteTeam(row.id))
                                    },
                                  }
                                : null,
                            ].filter(Boolean) as SgpContextActionsMenuItemDef[]
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </div>
        </div>

        {!loading && total > 0 && (
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>
              {offset + 1}–{Math.min(offset + rows.length, total)} de {total} · página {currentPage} de {maxPage}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-40"
                disabled={offset === 0}
                onClick={() => patchListUrl({ page: Math.max(1, urlState.page - 1) })}
              >
                Anterior
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-40"
                disabled={offset + rows.length >= total}
                onClick={() => patchListUrl({ page: urlState.page + 1 })}
              >
                Seguinte
              </button>
            </div>
          </div>
        )}
      </section>
    </PageCanvas>
    </SgpContextActionsMenuProvider>
  )
}
