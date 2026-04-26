import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { PageCanvas } from '../../components/ui/PageCanvas'
import {
  SgpContextActionsMenu,
  SgpContextActionsMenuProvider,
  type SgpContextActionsMenuItemDef,
} from '../../components/shell/SgpContextActionsMenu'
import {
  SgpToast,
  type SgpToastVariant,
} from '../../components/ui/SgpToast'
import type {
  AdminCollaborator,
  CollaboratorCreateInput,
  CollaboratorUpdateInput,
  Role,
  Sector,
} from '../../domain/collaborators/collaborator.types'
import {
  isBlockingSeverity,
  reportClientError,
} from '../../lib/errors'
import { useSgpErrorSurface } from '../../lib/errors/SgpErrorPresentation'
import { useRegisterTransientContext } from '../../lib/shell/transient-context'
import {
  COLABS_DEFAULT_PAGE_SIZE,
  COLABS_PAGE_SIZE_OPTIONS,
  collaboratorsUrlStateToListApi,
  parseCollaboratorsListUrlState,
  serializeCollaboratorsListUrl,
  type CollaboratorsListUrlState,
} from '../../lib/admin/collaboratorsListUrlState'
import {
  createAdminCollaborator,
  getAdminCollaborator,
  listAdminCollaborators,
  listRolesPublic,
  listSectorsPublic,
  patchAdminCollaborator,
  postAdminCollaboratorActivate,
  postAdminCollaboratorInactivate,
  postAdminCollaboratorRestore,
  postAdminCollaboratorSoftDelete,
} from '../../services/admin/adminCollaboratorsApiService'

const COLABS_FILTER_KEYS: (keyof CollaboratorsListUrlState)[] = [
  'search',
  'sectorId',
  'roleId',
  'status',
]

type ToastState = { message: string; variant: SgpToastVariant } | null

function initialsFromName(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length >= 2) {
    return `${p[0]![0] ?? ''}${p[1]![0] ?? ''}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || '—'
}

function formatDt(iso: string | undefined | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

function ColaborAvatar({ row }: { row: AdminCollaborator }) {
  const [failed, setFailed] = useState(false)
  const label = initialsFromName(row.fullName)
  const src = row.avatarUrl?.trim()
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        className="size-9 shrink-0 rounded-full border border-white/10 object-cover"
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <div
      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-sgp-app-panel-deep text-[11px] font-bold text-slate-300"
      aria-hidden
    >
      {label}
    </div>
  )
}

export function ColaboradoresPage() {
  const { pathname } = useLocation()
  const { presentBlocking } = useSgpErrorSurface()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlState = useMemo(
    () => parseCollaboratorsListUrlState(searchParams),
    [searchParams],
  )
  const highlightCollaboratorId = urlState.focusCollaboratorId
  const didScrollHighlight = useRef(false)

  const [toast, setToast] = useState<ToastState>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [rows, setRows] = useState<AdminCollaborator[]>([])
  const [total, setTotal] = useState(0)

  const [draftSearch, setDraftSearch] = useState(urlState.search)
  const [focusFetchedCollab, setFocusFetchedCollab] =
    useState<AdminCollaborator | null>(null)
  const [showFocusOutsideBanner, setShowFocusOutsideBanner] = useState(false)

  const patchListUrl = useCallback(
    (patch: Partial<CollaboratorsListUrlState>, opts?: { replace?: boolean }) => {
      const resetsPage = COLABS_FILTER_KEYS.some((k) => k in patch)
      const next: CollaboratorsListUrlState = {
        ...urlState,
        ...patch,
        ...(resetsPage && !('page' in patch) ? { page: 1 } : {}),
      }
      setSearchParams(serializeCollaboratorsListUrl(next), {
        replace: opts?.replace !== false,
      })
    },
    [urlState, setSearchParams],
  )

  useEffect(() => {
    setDraftSearch(urlState.search)
  }, [urlState.search])

  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = draftSearch.trim()
      if (trimmed === urlState.search) return
      patchListUrl({ search: trimmed })
    }, 400)
    return () => clearTimeout(t)
  }, [draftSearch, urlState.search, patchListUrl])

  const [sectors, setSectors] = useState<Sector[]>([])
  const [roles, setRoles] = useState<Role[]>([])

  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState<AdminCollaborator | null>(null)

  useRegisterTransientContext({
    id: 'colaboradores-gov',
    isDirty: () => criando || editando !== null,
    onReset: () => {
      setCriando(false)
      setEditando(null)
    },
  })

  const listParams = useMemo(() => {
    return collaboratorsUrlStateToListApi(urlState)
  }, [urlState])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [list, sec, rol] = await Promise.all([
        listAdminCollaborators(listParams),
        listSectorsPublic(),
        listRolesPublic(),
      ])
      setRows(list.items)
      setTotal(list.total)
      setSectors(sec)
      setRoles(rol)
    } catch (e) {
      const n = reportClientError(e, {
        module: 'governanca',
        action: 'colaboradores_list_load',
        route: pathname,
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
  }, [loading, total, maxPage, urlState.page, urlState.pageSize, patchListUrl])

  useEffect(() => {
    didScrollHighlight.current = false
  }, [highlightCollaboratorId])

  useEffect(() => {
    if (!highlightCollaboratorId || loading) return
    if (didScrollHighlight.current) return
    const el = document.getElementById(`gov-collab-${highlightCollaboratorId}`)
    if (el) {
      didScrollHighlight.current = true
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [highlightCollaboratorId, loading, rows])

  useEffect(() => {
    if (!highlightCollaboratorId || loading) {
      setFocusFetchedCollab(null)
      setShowFocusOutsideBanner(false)
      return
    }
    if (rows.some((r) => r.id === highlightCollaboratorId)) {
      setFocusFetchedCollab(null)
      setShowFocusOutsideBanner(false)
      return
    }
    let cancelled = false
    setShowFocusOutsideBanner(false)
    void getAdminCollaborator(highlightCollaboratorId).then((c) => {
      if (cancelled || !c) return
      setFocusFetchedCollab(c)
      setShowFocusOutsideBanner(true)
    })
    return () => {
      cancelled = true
    }
  }, [highlightCollaboratorId, loading, rows])

  function pushToast(message: string, variant: SgpToastVariant = 'success') {
    setToast({ message, variant })
  }

  function govCollaboradorError(
    err: unknown,
    action: string,
    entityId?: string,
  ) {
    const n = reportClientError(err, {
      module: 'governanca',
      action,
      route: pathname,
      entityId,
    })
    if (isBlockingSeverity(n.severity)) {
      presentBlocking(n)
      return
    }
    pushToast(n.userMessage, 'error')
  }

  async function runWithReload(fn: () => Promise<unknown>, okMsg: string) {
    try {
      await fn()
      pushToast(okMsg)
      await load()
    } catch (err) {
      govCollaboradorError(err, 'colaboradores_menu_action')
    }
  }

  return (
    <SgpContextActionsMenuProvider>
    <PageCanvas>
      <header className="sgp-header-card max-w-6xl">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
          <span className="h-px w-8 bg-gradient-to-r from-sgp-gold to-transparent" />
          Governança
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="sgp-page-title">Colaboradores operacionais</h1>
            <p className="sgp-page-lead max-w-2xl">
              Cadastro real (<span className="font-mono text-slate-400">collaborators</span>) com
              remoção lógica e vínculo opcional com{' '}
              <span className="font-mono text-slate-400">app_users</span>. Sem dados fictícios.
            </p>
          </div>
          <button
            type="button"
            className="sgp-cta-primary px-6"
            onClick={() => setCriando(true)}
          >
            Novo colaborador
          </button>
        </div>
      </header>

      {toast && (
        <SgpToast
          fixed
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}

      {loadError ? (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100/90"
        >
          {loadError}
        </div>
      ) : null}

      {showFocusOutsideBanner && highlightCollaboratorId && focusFetchedCollab ? (
        <div
          role="status"
          className="mt-6 max-w-6xl rounded-2xl border border-sgp-blue-bright/25 bg-sgp-blue-bright/[0.06] px-4 py-3 text-sm text-slate-200"
        >
          <p className="font-semibold text-slate-100">
            Este registro está fora dos filtros atuais.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-bold text-slate-100"
              onClick={() => {
                setDraftSearch('')
                patchListUrl({
                  page: 1,
                  pageSize: COLABS_DEFAULT_PAGE_SIZE,
                  search: '',
                  sectorId: '',
                  roleId: '',
                  status: 'ALL',
                  focusCollaboratorId: highlightCollaboratorId,
                })
                setShowFocusOutsideBanner(false)
              }}
            >
              Limpar filtros e mostrar
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400"
              onClick={() => {
                patchListUrl({ focusCollaboratorId: null })
                setFocusFetchedCollab(null)
                setShowFocusOutsideBanner(false)
              }}
            >
              Manter filtros
            </button>
          </div>
        </div>
      ) : null}

      <section className="mt-6 sgp-panel sgp-panel-hover">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500">
              Buscar
            </span>
            <input
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              placeholder="Nome, e-mail, código…"
              className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
            />
          </label>
          <label className="flex min-w-[10rem] flex-col gap-1 text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500">
              Setor
            </span>
            <select
              value={urlState.sectorId}
              onChange={(e) => patchListUrl({ sectorId: e.target.value })}
              className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
            >
              <option value="">Todos</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[10rem] flex-col gap-1 text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500">
              Papel operacional
            </span>
            <select
              value={urlState.roleId}
              onChange={(e) => patchListUrl({ roleId: e.target.value })}
              className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
            >
              <option value="">Todos</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[9rem] flex-col gap-1 text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500">
              Situação
            </span>
            <select
              value={urlState.status}
              onChange={(e) =>
                patchListUrl({
                  status: e.target.value as CollaboratorsListUrlState['status'],
                })
              }
              className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
            >
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Ativos</option>
              <option value="INACTIVE">Inativos</option>
            </select>
          </label>
          <label className="flex min-w-[9rem] flex-col gap-1 text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500">
              Por página
            </span>
            <select
              value={urlState.pageSize}
              onChange={(e) =>
                patchListUrl({ pageSize: Number(e.target.value), page: 1 })
              }
              className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
            >
              {COLABS_PAGE_SIZE_OPTIONS.map((n) => (
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
            : `${total} registro(s) · página ${urlState.page} de ${maxPage}`}
        </p>
      </section>

      <div className="mt-6 sgp-table-shell">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr
              className="border-b border-white/[0.08] text-white shadow-inner"
              style={{ background: 'var(--sgp-gradient-header)' }}
            >
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                Colaborador
              </th>
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                Setor
              </th>
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                Usuário (acesso)
              </th>
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                Atualizado
              </th>
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                Situação
              </th>
              <th className="w-28 whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  Carregando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  Nenhum colaborador neste filtro.
                </td>
              </tr>
            ) : (
              rows.map((c) => {
                const deleted = Boolean(c.deletedAt)
                const linked = Boolean(c.linkedUserId)
                const isHighlighted =
                  highlightCollaboratorId != null &&
                  highlightCollaboratorId === c.id

                const menuItems: SgpContextActionsMenuItemDef[] = []
                if (!deleted) {
                  menuItems.push({
                    label: 'Editar…',
                    onClick: () => setEditando(c),
                  })
                }
                if (!deleted && c.status === 'active') {
                  menuItems.push({
                    label: 'Inativar',
                    onClick: () => {
                      if (
                        !window.confirm(
                          'Inativar este colaborador? Continua no cadastro e no histórico.',
                        )
                      ) {
                        return
                      }
                      void runWithReload(
                        () => postAdminCollaboratorInactivate(c.id),
                        'Colaborador inativado.',
                      )
                    },
                  })
                }
                if (!deleted && c.status === 'inactive') {
                  menuItems.push({
                    label: 'Ativar',
                    onClick: () =>
                      void runWithReload(
                        () => postAdminCollaboratorActivate(c.id),
                        'Colaborador ativado.',
                      ),
                  })
                }
                if (!deleted) {
                  menuItems.push({
                    label: 'Remover (soft delete)',
                    destructive: true,
                    onClick: () => {
                      if (
                        !window.confirm(
                          'Remover logicamente este colaborador? O registro deixa de aparecer nas listagens normais; o histórico operacional é mantido.',
                        )
                      ) {
                        return
                      }
                      void runWithReload(
                        () => postAdminCollaboratorSoftDelete(c.id),
                        'Colaborador removido logicamente.',
                      )
                    },
                  })
                } else {
                  menuItems.push({
                    label: 'Restaurar',
                    onClick: () => {
                      if (
                        !window.confirm(
                          'Restaurar este colaborador? Isto não altera ativo/inativo.',
                        )
                      ) {
                        return
                      }
                      void runWithReload(
                        () => postAdminCollaboratorRestore(c.id),
                        'Colaborador restaurado.',
                      )
                    },
                  })
                }

                return (
                  <tr
                    id={`gov-collab-${c.id}`}
                    key={c.id}
                    className={`border-b border-white/[0.04] transition hover:bg-white/[0.03] ${
                      isHighlighted
                        ? 'bg-sgp-gold/[0.06] ring-1 ring-inset ring-sgp-gold/35'
                        : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ColaborAvatar row={c} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-100">
                            {c.fullName}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {c.email ?? '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {c.sectorName ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {linked && c.linkedUserId && c.linkedUserEmail ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-200">{c.linkedUserEmail}</span>
                          <a
                            href={`/app/usuarios?userId=${encodeURIComponent(c.linkedUserId)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-fit text-[11px] font-semibold text-sgp-gold/90 underline-offset-2 hover:underline"
                          >
                            Abrir utilizador
                          </a>
                        </div>
                      ) : linked && c.linkedUserId ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-400">Vínculo sem e-mail visível</span>
                          <a
                            href={`/app/usuarios?userId=${encodeURIComponent(c.linkedUserId)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-fit text-[11px] font-semibold text-sgp-gold/90 underline-offset-2 hover:underline"
                          >
                            Abrir utilizador
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-500">Sem vínculo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {formatDt(c.updatedAt ?? c.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {deleted ? (
                          <span className="inline-block rounded-md border border-rose-500/35 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-100/90">
                            Removido
                          </span>
                        ) : c.status === 'active' ? (
                          <span className="inline-block rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200/90">
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-block rounded-md border border-white/14 bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Inativo
                          </span>
                        )}
                        {linked ? (
                          <span className="inline-block rounded-md border border-sgp-blue-bright/25 bg-sgp-blue-bright/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-200/90">
                            Com utilizador
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="relative px-4 py-3 text-right">
                      <div className="flex justify-end">
                        <SgpContextActionsMenu
                          menuKey={c.id}
                          items={menuItems}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {!loading && total > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
          <p className="text-xs">
            A mostrar{' '}
            <span className="tabular-nums font-medium text-slate-300">
              {(urlState.page - 1) * urlState.pageSize + 1}–
              {Math.min(urlState.page * urlState.pageSize, total)}
            </span>{' '}
            de <span className="tabular-nums font-medium text-slate-300">{total}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-40"
              disabled={urlState.page <= 1}
              onClick={() => patchListUrl({ page: urlState.page - 1 })}
            >
              Anterior
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-40"
              disabled={urlState.page >= maxPage}
              onClick={() => patchListUrl({ page: urlState.page + 1 })}
            >
              Seguinte
            </button>
          </div>
        </div>
      ) : null}

      {criando && (
        <FormColaboradorModal
          key="create"
          titulo="Novo colaborador"
          modo="create"
          sectors={sectors}
          roles={roles}
          onClose={() => setCriando(false)}
          onSubmit={async (input) => {
            try {
              await createAdminCollaborator(input)
              pushToast('Colaborador criado.', 'success')
              setCriando(false)
              await load()
            } catch (e) {
              govCollaboradorError(e, 'colaboradores_create')
            }
          }}
        />
      )}

      {editando ? (
        <FormColaboradorModal
          key={editando.id}
          titulo="Editar colaborador"
          modo="edit"
          inicial={editando}
          sectors={sectors}
          roles={roles}
          onClose={() => setEditando(null)}
          onSubmit={async (input) => {
            try {
              await patchAdminCollaborator(editando.id, input)
              pushToast('Dados atualizados.', 'success')
              setEditando(null)
              await load()
            } catch (e) {
              govCollaboradorError(e, 'colaboradores_patch', editando.id)
            }
          }}
        />
      ) : null}
    </PageCanvas>
    </SgpContextActionsMenuProvider>
  )
}

type FormPropsCreate = {
  titulo: string
  modo: 'create'
  sectors: Sector[]
  roles: Role[]
  onClose: () => void
  onSubmit: (input: CollaboratorCreateInput) => void | Promise<void>
}

type FormPropsEdit = {
  titulo: string
  modo: 'edit'
  inicial: AdminCollaborator
  sectors: Sector[]
  roles: Role[]
  onClose: () => void
  onSubmit: (input: CollaboratorUpdateInput) => void | Promise<void>
}

type FormProps = FormPropsCreate | FormPropsEdit

function resolveInitialSectorId(
  inicial: AdminCollaborator | undefined,
  sectors: Sector[],
): string {
  if (!inicial) return ''
  if (inicial.sectorId?.trim()) return inicial.sectorId
  const byName = inicial.sectorName?.trim()
    ? sectors.find((s) => s.name === inicial.sectorName)?.id
    : undefined
  return byName ?? ''
}

function isOptionalAvatarUrlOk(raw: string): boolean {
  const t = raw.trim()
  if (!t) return true
  return /^https?:\/\/.+/i.test(t)
}

function FormColaboradorModal(props: FormProps) {
  const { titulo, sectors, roles, onClose } = props
  const inicial = props.modo === 'edit' ? props.inicial : undefined
  const [fullName, setFullName] = useState(inicial?.fullName ?? '')
  const [statusOp, setStatusOp] = useState<'active' | 'inactive'>(() =>
    inicial ? (inicial.status === 'active' ? 'active' : 'inactive') : 'active',
  )
  const [avatarUrl, setAvatarUrl] = useState(inicial?.avatarUrl ?? '')
  const [notes, setNotes] = useState(inicial?.notes ?? '')
  const [sectorId, setSectorId] = useState(() =>
    resolveInitialSectorId(inicial, sectors),
  )
  const [roleId, setRoleId] = useState(inicial?.roleId ?? '')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    setFormError(null)
  }, [fullName, statusOp, sectorId, roleId, avatarUrl, notes])

  const sectorOrphan =
    inicial?.sectorId?.trim() &&
    !sectors.some((s) => s.id === inicial.sectorId)
  const roleOrphan =
    inicial?.roleId?.trim() && !roles.some((r) => r.id === inicial.roleId)

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-x-hidden overflow-y-hidden bg-sgp-navy/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-labelledby="colab-form-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl overflow-x-hidden overflow-y-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-b from-sgp-navy via-sgp-navy-deep to-sgp-void p-6 shadow-2xl ring-1 ring-white/[0.06] sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="colab-form-title"
          className="font-heading text-xl font-bold tracking-tight text-slate-100"
        >
          {titulo}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Campos marcados com <span className="text-rose-300/90">*</span> são obrigatórios.
        </p>

        {formError ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-100/95"
          >
            {formError}
          </div>
        ) : null}

        {/* Landscape: ordem 1→6 em leitura por linhas (esq. → dir., de cima para baixo). */}
        <div className="mt-5 grid min-w-0 grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 sm:col-span-2">
            Nome <span className="text-rose-300/90">*</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="off"
              className="sgp-input-app mt-1.5 w-full min-w-0 rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
            />
          </label>

          <label className="block min-w-0 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Status <span className="text-rose-300/90">*</span>
            <select
              value={statusOp}
              onChange={(e) =>
                setStatusOp(e.target.value === 'inactive' ? 'inactive' : 'active')
              }
              className="sgp-input-app mt-1.5 w-full min-w-0 rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </label>

          <label className="block min-w-0 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Setor <span className="text-rose-300/90">*</span>
            <select
              value={sectorId}
              onChange={(e) => setSectorId(e.target.value)}
              className="sgp-input-app mt-1.5 w-full min-w-0 rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
            >
              <option value=""> </option>
              {sectorOrphan && inicial?.sectorId ? (
                <option value={inicial.sectorId}>
                  {inicial.sectorName ?? inicial.sectorId}
                </option>
              ) : null}
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-0 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Função / papel operacional <span className="text-rose-300/90">*</span>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="sgp-input-app mt-1.5 w-full min-w-0 rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
            >
              <option value=""> </option>
              {roleOrphan && inicial?.roleId ? (
                <option value={inicial.roleId}>
                  {inicial.roleName ?? inicial.roleId}
                </option>
              ) : null}
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-0 text-xs font-semibold uppercase tracking-wider text-slate-500">
            URL do avatar
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
              autoComplete="off"
              className="sgp-input-app mt-1.5 w-full min-w-0 rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
            />
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 sm:col-span-2">
            Observações
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="sgp-input-app mt-1.5 w-full min-w-0 resize-none rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-white/[0.06] pt-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/12 bg-white/[0.05] px-4 py-2 text-sm font-bold text-slate-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              const nome = fullName.trim()
              if (!nome) {
                setFormError('Informe o nome.')
                return
              }
              if (!sectorId.trim()) {
                setFormError('Escolha um setor.')
                return
              }
              if (!roleId.trim()) {
                setFormError('Escolha uma função / papel operacional.')
                return
              }
              if (!isOptionalAvatarUrlOk(avatarUrl)) {
                setFormError(
                  'URL do avatar deve começar por http:// ou https://.',
                )
                return
              }
              const sidTrim = sectorId.trim()
              const sector = sectors.find((s) => s.id === sidTrim)
              const sn =
                sector?.name ??
                (inicial?.sectorId === sidTrim
                  ? inicial.sectorName ?? undefined
                  : undefined)
              const st = statusOp === 'active' ? 'active' : 'inactive'
              const notesTrim = notes.trim()
              const avatarTrim = avatarUrl.trim()

              if (props.modo === 'create') {
                void props.onSubmit({
                  fullName: nome,
                  sectorId: sidTrim,
                  sectorName: sn,
                  roleId: roleId.trim(),
                  status: st,
                  avatarUrl: avatarTrim || undefined,
                  notes: notesTrim || undefined,
                })
              } else {
                void props.onSubmit({
                  fullName: nome,
                  sectorId: sidTrim,
                  sectorName: sn,
                  roleId: roleId.trim(),
                  status: st,
                  avatarUrl: avatarTrim ? avatarTrim : null,
                  notes: notesTrim || undefined,
                })
              }
            }}
            className="sgp-cta-primary !px-4 !py-2 text-sm"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
