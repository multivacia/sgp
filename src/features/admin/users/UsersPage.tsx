import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  SgpContextActionsMenu,
  SgpContextActionsMenuProvider,
  type SgpContextActionsMenuItemDef,
} from '../../../components/shell/SgpContextActionsMenu'
import { PageCanvas } from '../../../components/ui/PageCanvas'
import {
  parseUsersListUrlState,
  serializeUsersListUrl,
  USERS_DEFAULT_PAGE_SIZE,
  USERS_PAGE_SIZE_OPTIONS,
  usersUrlStateToListApi,
  type UsersListUrlState,
} from '../../../lib/admin/usersListUrlState'
import {
  SgpToast,
  type SgpToastVariant,
} from '../../../components/ui/SgpToast'
import type { AdminUserRow, AppRoleOption } from '../../../domain/admin/adminUser.types'
import {
  isBlockingSeverity,
  reportClientError,
} from '../../../lib/errors'
import { useSgpErrorSurface } from '../../../lib/errors/SgpErrorPresentation'
import { useRegisterTransientContext } from '../../../lib/shell/transient-context'
import {
  createAdminUser,
  fetchCollaboratorLinkageSummary,
  getAdminUser,
  listAdminUsers,
  listAppRoles,
  listEligibleCollaborators,
  patchAdminUser,
  postActivateUser,
  postForcePasswordChange,
  postInactivateUser,
  postResetAdminPassword,
  postRestoreUser,
  postSoftDeleteUser,
  type AdminUserListParams,
} from '../../../services/admin/adminUsersApiService'

const USERS_FILTER_KEYS: (keyof UsersListUrlState)[] = [
  'search',
  'roleId',
]

type ToastState = { message: string; variant: SgpToastVariant } | null

function initialsFromName(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length >= 2) {
    return `${p[0]![0] ?? ''}${p[1]![0] ?? ''}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || '—'
}

function formatDt(iso: string | null) {
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

function UserAvatar({ row }: { row: AdminUserRow }) {
  const [failed, setFailed] = useState(false)
  const label = initialsFromName(row.displayName)
  if (row.avatarUrl && !failed) {
    return (
      <img
        src={row.avatarUrl}
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

type ModalMode = 'create' | 'edit' | null

type ConfirmPwdAction = { type: 'force' | 'reset'; user: AdminUserRow }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEmailField(v: string): string | null {
  const t = v.trim()
  if (!t) return 'Indique o e-mail.'
  if (!EMAIL_RE.test(t)) return 'E-mail inválido.'
  return null
}

function validateAvatarUrlField(v: string): string | null {
  const t = v.trim()
  if (!t) return null
  try {
    const u = new URL(t)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return 'URL do avatar deve usar http:// ou https://.'
    }
    return null
  } catch {
    return 'URL do avatar inválida.'
  }
}

export function UsersPage() {
  const { pathname } = useLocation()
  const { presentBlocking } = useSgpErrorSurface()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlState = useMemo(
    () => parseUsersListUrlState(searchParams),
    [searchParams],
  )
  const highlightUserId = urlState.focusUserId
  const didScrollHighlight = useRef(false)

  const [toast, setToast] = useState<ToastState>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [total, setTotal] = useState(0)
  const [roles, setRoles] = useState<AppRoleOption[]>([])

  const [draftSearch, setDraftSearch] = useState(urlState.search)
  const [focusFetchedUser, setFocusFetchedUser] = useState<AdminUserRow | null>(
    null,
  )
  const [showFocusOutsideBanner, setShowFocusOutsideBanner] = useState(false)

  const patchListUrl = useCallback(
    (patch: Partial<UsersListUrlState>, opts?: { replace?: boolean }) => {
      const resetsPage = USERS_FILTER_KEYS.some((k) => k in patch)
      const next: UsersListUrlState = {
        ...urlState,
        ...patch,
        ...(resetsPage && !('page' in patch) ? { page: 1 } : {}),
      }
      setSearchParams(serializeUsersListUrl(next), {
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

  const [modal, setModal] = useState<ModalMode>(null)
  const [editing, setEditing] = useState<AdminUserRow | null>(null)
  const [eligible, setEligible] = useState<
    Awaited<ReturnType<typeof listEligibleCollaborators>>
  >([])
  const [saving, setSaving] = useState(false)

  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRoleId, setFormRoleId] = useState('')
  const [formCollabId, setFormCollabId] = useState('')
  const [formAvatar, setFormAvatar] = useState('')

  const [confirmPwd, setConfirmPwd] = useState<ConfirmPwdAction | null>(null)
  const [resetReveal, setResetReveal] = useState<{
    email: string
    temporaryPassword: string
  } | null>(null)
  const [pwdActionLoading, setPwdActionLoading] = useState(false)
  const [unlinkedActiveCount, setUnlinkedActiveCount] = useState<number | null>(
    null,
  )

  useRegisterTransientContext({
    id: 'users-gov',
    isDirty: () =>
      modal !== null || confirmPwd !== null || resetReveal !== null,
    onReset: () => {
      setModal(null)
      setConfirmPwd(null)
      setResetReveal(null)
    },
  })

  const listParams = useMemo((): AdminUserListParams => {
    return usersUrlStateToListApi(urlState)
  }, [urlState])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [list, roleData, linkage] = await Promise.all([
        listAdminUsers(listParams),
        listAppRoles().catch(() => [] as AppRoleOption[]),
        fetchCollaboratorLinkageSummary().catch(() => null),
      ])
      setRows(list.items)
      setTotal(list.total)
      setRoles(roleData)
      setUnlinkedActiveCount(
        linkage ? linkage.unlinkedActiveUserCount : null,
      )
    } catch (e) {
      setUnlinkedActiveCount(null)
      const n = reportClientError(e, {
        module: 'governanca',
        action: 'users_list_load',
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
  }, [highlightUserId])

  useEffect(() => {
    if (!highlightUserId || loading) return
    if (didScrollHighlight.current) return
    const el = document.getElementById(`gov-user-${highlightUserId}`)
    if (el) {
      didScrollHighlight.current = true
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [highlightUserId, loading, rows])

  useEffect(() => {
    if (!highlightUserId || loading) {
      setFocusFetchedUser(null)
      setShowFocusOutsideBanner(false)
      return
    }
    if (rows.some((r) => r.id === highlightUserId)) {
      setFocusFetchedUser(null)
      setShowFocusOutsideBanner(false)
      return
    }
    let cancelled = false
    setShowFocusOutsideBanner(false)
    void getAdminUser(highlightUserId)
      .then((u) => {
        if (cancelled) return
        setFocusFetchedUser(u)
        setShowFocusOutsideBanner(true)
      })
      .catch(() => {
        if (cancelled) return
        setFocusFetchedUser(null)
        setShowFocusOutsideBanner(false)
      })
    return () => {
      cancelled = true
    }
  }, [highlightUserId, loading, rows])

  useEffect(() => {
    if (!modal) return
    const ex = modal === 'edit' && editing ? editing.id : null
    void listEligibleCollaborators(ex).then(setEligible).catch(() => setEligible([]))
  }, [modal, editing])

  function pushToast(message: string, variant: SgpToastVariant = 'success') {
    setToast({ message, variant })
  }

  function openCreate() {
    setEditing(null)
    setFormEmail('')
    setFormPassword('')
    setFormRoleId('')
    setFormCollabId('')
    setFormAvatar('')
    setModal('create')
  }

  function openEdit(u: AdminUserRow) {
    setEditing(u)
    setFormEmail(u.email)
    setFormPassword('')
    setFormRoleId(u.roleId ?? '')
    setFormCollabId(u.collaboratorId ?? '')
    setFormAvatar(u.avatarUrl ?? '')
    setModal('edit')
  }

  function govUsersError(err: unknown, action: string, entityId?: string) {
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

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault()
    const emailErr = validateEmailField(formEmail)
    if (emailErr) {
      pushToast(emailErr, 'error')
      return
    }
    const avatarErr = validateAvatarUrlField(formAvatar)
    if (avatarErr) {
      pushToast(avatarErr, 'error')
      return
    }
    if (!formRoleId) {
      pushToast('Selecione um papel operacional.', 'error')
      return
    }
    setSaving(true)
    try {
      if (modal === 'create') {
        if (!formPassword || formPassword.length < 8) {
          pushToast('A senha inicial deve ter pelo menos 8 caracteres.', 'error')
          setSaving(false)
          return
        }
        await createAdminUser({
          email: formEmail.trim(),
          password: formPassword,
          roleId: formRoleId,
          collaboratorId: formCollabId || null,
          avatarUrl: formAvatar.trim() || null,
        })
        pushToast('Usuário criado.')
      } else if (modal === 'edit' && editing) {
        const pwd = formPassword.trim()
        if (pwd && pwd.length < 8) {
          pushToast('A nova senha deve ter pelo menos 8 caracteres.', 'error')
          setSaving(false)
          return
        }
        await patchAdminUser(editing.id, {
          email: formEmail.trim(),
          roleId: formRoleId,
          collaboratorId: formCollabId || null,
          avatarUrl: formAvatar.trim() || null,
          ...(pwd ? { password: pwd } : {}),
        })
        pushToast('Usuário atualizado.')
      }
      setModal(null)
      await load()
    } catch (err) {
      govUsersError(err, 'users_save', editing?.id)
    } finally {
      setSaving(false)
    }
  }

  async function runWithReload(fn: () => Promise<unknown>, okMsg: string) {
    try {
      await fn()
      pushToast(okMsg)
      await load()
    } catch (err) {
      govUsersError(err, 'users_menu_action')
    }
  }

  async function handleConfirmPwdAction() {
    if (!confirmPwd) return
    const { type, user: u } = confirmPwd
    setPwdActionLoading(true)
    try {
      if (type === 'force') {
        await postForcePasswordChange(u.id)
        pushToast('Troca de senha obrigatória aplicada.')
        setConfirmPwd(null)
        await load()
      } else {
        const res = await postResetAdminPassword(u.id)
        setConfirmPwd(null)
        setResetReveal({
          email: u.email,
          temporaryPassword: res.temporaryPassword,
        })
        await load()
      }
    } catch (err) {
      govUsersError(err, 'users_password_action', confirmPwd?.user.id)
    } finally {
      setPwdActionLoading(false)
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
            <h1 className="sgp-page-title">Usuários de acesso</h1>
            <p className="sgp-page-lead max-w-2xl">
              Contas reais (<span className="font-mono text-slate-400">app_users</span>), papéis{' '}
              <span className="font-mono text-slate-400">app_roles</span> e vínculo opcional com
              colaboradores operacionais. Remoções são lógicas (soft delete).
            </p>
            <p className="mt-3">
              <Link
                to="/app/usuarios/trilha"
                className="text-sm font-semibold text-sgp-gold-warm/95 underline decoration-sgp-gold/35 underline-offset-4 transition hover:text-white"
              >
                Ver trilha administrativa
              </Link>
            </p>
          </div>
          <button type="button" className="sgp-cta-primary px-6" onClick={openCreate}>
            Novo utilizador
          </button>
        </div>
      </header>

      {unlinkedActiveCount !== null && unlinkedActiveCount > 0 ? (
        <div
          role="status"
          className="mt-6 max-w-6xl rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-50/95"
        >
          <p className="font-semibold text-amber-100/95">
            Pendências de vínculo operacional
          </p>
          <p className="mt-1 text-amber-100/85">
            Existem{' '}
            <span className="tabular-nums font-semibold">
              {unlinkedActiveCount}
            </span>{' '}
            conta(s) ativa(s) sem{' '}
            <span className="font-mono text-amber-200/90">collaborator_id</span>.
            Associe explicitamente na edição do utilizador (sem inferência por e-mail).
          </p>
        </div>
      ) : null}

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
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100/90"
        >
          {loadError}
        </div>
      ) : null}

      {showFocusOutsideBanner && highlightUserId && focusFetchedUser ? (
        <div
          role="status"
          className="max-w-6xl rounded-2xl border border-sgp-blue-bright/25 bg-sgp-blue-bright/[0.06] px-4 py-3 text-sm text-slate-200"
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
                  pageSize: USERS_DEFAULT_PAGE_SIZE,
                  search: '',
                  roleId: '',
                  focusUserId: highlightUserId,
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
                patchListUrl({ focusUserId: null })
                setFocusFetchedUser(null)
                setShowFocusOutsideBanner(false)
              }}
            >
              Manter filtros
            </button>
          </div>
        </div>
      ) : null}

      <section className="sgp-panel sgp-panel-hover">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500">
              Busca
            </span>
            <input
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              placeholder="E-mail ou nome…"
              className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
            />
          </label>
          <label className="flex min-w-[10rem] flex-col gap-1 text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500">
              Papel
            </span>
            <select
              value={urlState.roleId}
              onChange={(e) => patchListUrl({ roleId: e.target.value })}
              className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
            >
              <option value="">Todos</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} — {r.name}
                </option>
              ))}
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
              {USERS_PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {loading ? 'Carregando…' : `${total} registro(s) · página ${urlState.page} de ${maxPage}`}
        </p>
      </section>

      <div className="sgp-table-shell">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left text-sm">
          <thead>
            <tr
              className="border-b border-white/[0.08] text-white shadow-inner"
              style={{ background: 'var(--sgp-gradient-header)' }}
            >
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Usuário</th>
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Papel</th>
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Colaborador</th>
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Situação</th>
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Último login</th>
              <th className="w-28 whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Carregando…
                </td>
              </tr>
            ) : null}
            {!loading
              ? rows.map((u) => {
                  const isHighlighted =
                    highlightUserId != null && highlightUserId === u.id

                  const menuItems: SgpContextActionsMenuItemDef[] = [
                    { label: 'Editar', onClick: () => openEdit(u) },
                  ]
                  if (!u.deletedAt && u.isActive) {
                    menuItems.push({
                      label: 'Inativar',
                      onClick: () => {
                        if (
                          !window.confirm(
                            'Inativar este utilizador? Não poderá autenticar.',
                          )
                        )
                          return
                        void runWithReload(
                          () => postInactivateUser(u.id),
                          'Usuário inativado.',
                        )
                      },
                    })
                  }
                  if (!u.deletedAt && !u.isActive) {
                    menuItems.push({
                      label: 'Ativar',
                      onClick: () =>
                        void runWithReload(
                          () => postActivateUser(u.id),
                          'Usuário ativado.',
                        ),
                    })
                  }
                  if (!u.deletedAt) {
                    menuItems.push(
                      {
                        label: 'Forçar troca de senha',
                        onClick: () =>
                          setConfirmPwd({ type: 'force', user: u }),
                      },
                      {
                        label: 'Redefinir senha',
                        onClick: () =>
                          setConfirmPwd({ type: 'reset', user: u }),
                      },
                    )
                  }
                  if (!u.deletedAt && u.collaboratorId) {
                    menuItems.push({
                      label: 'Desvincular colaborador',
                      onClick: () => {
                        if (
                          !window.confirm(
                            'Desvincular o colaborador deste utilizador?',
                          )
                        )
                          return
                        void runWithReload(
                          () => patchAdminUser(u.id, { collaboratorId: null }),
                          'Colaborador desvinculado.',
                        )
                      },
                    })
                  }
                  if (!u.deletedAt) {
                    menuItems.push({
                      label: 'Remover (soft delete)',
                      destructive: true,
                      onClick: () => {
                        if (
                          !window.confirm(
                            'Remover logicamente este usuário? O registro permanece na base.',
                          )
                        )
                          return
                        void runWithReload(
                          () => postSoftDeleteUser(u.id),
                          'Usuário removido logicamente.',
                        )
                      },
                    })
                  } else {
                    menuItems.push({
                      label: 'Restaurar',
                      onClick: () => {
                        if (
                          !window.confirm(
                            'Restaurar este utilizador? Será necessário ativar o acesso se estiver inativo.',
                          )
                        )
                          return
                        void runWithReload(
                          () => postRestoreUser(u.id),
                          'Usuário restaurado.',
                        )
                      },
                    })
                  }

                  return (
              <tr
                id={`gov-user-${u.id}`}
                key={u.id}
                className={`border-b border-white/[0.04] transition hover:bg-white/[0.03] ${
                  isHighlighted
                    ? 'bg-sgp-gold/[0.06] ring-1 ring-inset ring-sgp-gold/35'
                    : ''
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar row={u} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-100">
                        {u.displayName}
                      </p>
                      <p className="truncate text-xs text-slate-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-slate-200">
                    {u.roleCode ?? '—'}
                  </span>
                  {u.roleName ? (
                    <span className="ml-1 text-xs text-slate-500">
                      ({u.roleName})
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {u.collaboratorId ? (
                    <div className="flex flex-col gap-1">
                      <span>{u.collaboratorName ?? '—'}</span>
                      <a
                        href={`/app/colaboradores?collaboratorId=${encodeURIComponent(u.collaboratorId)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-fit text-[11px] font-semibold text-sgp-gold/90 underline-offset-2 hover:underline"
                      >
                        Abrir colaborador
                      </a>
                    </div>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {u.deletedAt ? (
                      <span className="rounded-md border border-rose-500/35 bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-100/95">
                        Removido
                      </span>
                    ) : u.isActive ? (
                      <span className="rounded-md border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-100/95">
                        Ativo
                      </span>
                    ) : (
                      <span className="rounded-md border border-slate-500/35 bg-slate-500/15 px-2 py-0.5 text-[11px] font-semibold text-slate-200">
                        Inativo
                      </span>
                    )}
                    {u.mustChangePassword ? (
                      <span className="rounded-md border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-100/95">
                        Trocar senha
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {formatDt(u.lastLoginAt)}
                </td>
                <td className="relative px-4 py-3 text-right">
                  <div className="flex justify-end">
                    <SgpContextActionsMenu menuKey={u.id} items={menuItems} />
                  </div>
                </td>
              </tr>
                  )
                })
              : null}
            {!loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  Nenhum utilizador encontrado com os filtros actuais.
                </td>
              </tr>
            ) : null}
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

      {confirmPwd ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal
          aria-labelledby="pwd-confirm-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-gradient-to-b from-sgp-app-panel-deep to-sgp-void p-6 shadow-2xl">
            <h2
              id="pwd-confirm-title"
              className="font-heading text-lg font-bold text-slate-50"
            >
              {confirmPwd.type === 'force'
                ? 'Forçar troca de senha'
                : 'Redefinir senha'}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              {confirmPwd.type === 'force'
                ? 'O utilizador terá de definir uma nova senha no próximo acesso. A senha atual mantém-se até lá.'
                : 'Será gerada uma senha temporária forte. O utilizador terá de alterá-la no próximo acesso. A senha temporária só será mostrada uma vez — copie e transmita por um canal seguro.'}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Usuário:{' '}
              <span className="font-medium text-slate-300">
                {confirmPwd.user.email}
              </span>
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="sgp-cta-secondary px-5"
                disabled={pwdActionLoading}
                onClick={() => setConfirmPwd(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="sgp-cta-primary px-6"
                disabled={pwdActionLoading}
                onClick={() => void handleConfirmPwdAction()}
              >
                {pwdActionLoading ? 'A aplicar…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resetReveal ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal
          aria-labelledby="pwd-reset-reveal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-amber-500/25 bg-gradient-to-b from-sgp-app-panel-deep to-sgp-void p-6 shadow-2xl">
            <h2
              id="pwd-reset-reveal-title"
              className="font-heading text-lg font-bold text-slate-50"
            >
              Senha temporária
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Guarde agora — não será possível recuperar esta senha depois.
            </p>
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-slate-500">
              Conta
            </p>
            <p className="mt-1 font-mono text-sm text-slate-200">
              {resetReveal.email}
            </p>
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-slate-500">
              Senha temporária
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="flex-1 min-w-0 break-all rounded-lg border border-white/10 bg-sgp-void/90 px-3 py-2 font-mono text-sm text-amber-100/95">
                {resetReveal.temporaryPassword}
              </code>
              <button
                type="button"
                className="shrink-0 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-bold text-slate-100 transition hover:bg-white/[0.1]"
                onClick={() => {
                  void navigator.clipboard.writeText(resetReveal.temporaryPassword)
                  pushToast('Copiado para a área de transferência.')
                }}
              >
                Copiar
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="sgp-cta-primary px-6"
                onClick={() => setResetReveal(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modal ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/[0.1] bg-gradient-to-b from-sgp-app-panel-deep to-sgp-void p-6 shadow-2xl">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-slate-50">
              {modal === 'create' ? 'Novo utilizador' : 'Editar utilizador'}
            </h2>
            <form className="mt-6 space-y-5" onSubmit={handleSubmitForm}>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold uppercase tracking-wider text-slate-500">
                  E-mail{' '}
                  <span className="text-rose-300/90" aria-hidden>
                    *
                  </span>
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold uppercase tracking-wider text-slate-500">
                  Senha inicial
                  {modal === 'create' ? (
                    <>
                      {' '}
                      <span className="text-rose-300/90" aria-hidden>
                        *
                      </span>
                    </>
                  ) : (
                    <span className="block font-normal normal-case tracking-normal text-slate-600">
                      (opcional — deixe em branco para manter a senha atual)
                    </span>
                  )}
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
                />
                {modal === 'create' ? (
                  <span className="text-[11px] text-slate-600">
                    Mínimo 8 caracteres. Não será mostrada novamente.
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-600">
                    Se preencher, mínimo 8 caracteres.
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold uppercase tracking-wider text-slate-500">
                  Papel operacional{' '}
                  <span className="text-rose-300/90" aria-hidden>
                    *
                  </span>
                </span>
                <select
                  value={formRoleId}
                  onChange={(e) => setFormRoleId(e.target.value)}
                  className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
                >
                  <option value="" />
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} — {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold uppercase tracking-wider text-slate-500">
                  Colaborador
                </span>
                <select
                  value={formCollabId}
                  onChange={(e) => setFormCollabId(e.target.value)}
                  className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
                >
                  <option value="" />
                  {eligible.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                      {c.code ? ` (${c.code})` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold uppercase tracking-wider text-slate-500">
                  URL do avatar
                </span>
                <input
                  type="text"
                  inputMode="url"
                  value={formAvatar}
                  onChange={(e) => setFormAvatar(e.target.value)}
                  placeholder="https://…"
                  className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
                />
              </label>
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="sgp-cta-secondary px-5"
                  onClick={() => setModal(null)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="sgp-cta-primary px-6"
                  disabled={saving}
                >
                  {saving ? 'A guardar…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </PageCanvas>
    </SgpContextActionsMenuProvider>
  )
}
