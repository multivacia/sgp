import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageCanvas } from '../../../components/ui/PageCanvas'
import {
  SgpToast,
  type SgpToastVariant,
} from '../../../components/ui/SgpToast'
import {
  isBlockingSeverity,
  reportClientError,
} from '../../../lib/errors'
import { useSgpErrorSurface } from '../../../lib/errors/SgpErrorPresentation'
import { useRegisterTransientContext } from '../../../lib/shell/transient-context'
import { PERMISSION_RBAC_MANAGE_ROLE_PERMISSIONS } from '../../../lib/permissions/permissionCodes'
import { useAuth } from '../../../lib/use-auth'
import {
  fetchRbacPermissionsCatalog,
  fetchRbacRolePermissions,
  fetchRbacRoles,
  putRbacRolePermissions,
  type RbacPermissionRow,
  type RbacRole,
} from '../../../services/admin/rbacApiService'

type ToastState = { message: string; variant: SgpToastVariant } | null

const COLABORADOR = 'COLABORADOR'

function domainFromCode(code: string): string {
  const i = code.indexOf('.')
  return i === -1 ? code : code.slice(0, i)
}

function setsEqualString(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const x of a) {
    if (!b.has(x)) return false
  }
  return true
}

function groupPermissions(rows: RbacPermissionRow[]): Map<string, RbacPermissionRow[]> {
  const m = new Map<string, RbacPermissionRow[]>()
  for (const row of rows) {
    const d = domainFromCode(row.code)
    const list = m.get(d) ?? []
    list.push(row)
    m.set(d, list)
  }
  for (const [, list] of m) {
    list.sort((a, b) => a.code.localeCompare(b.code))
  }
  return new Map([...m.entries()].sort((a, b) => a[0].localeCompare(b[0])))
}

export function RbacRolePermissionsPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { presentBlocking } = useSgpErrorSurface()
  const { user, refreshUser } = useAuth()

  const [toast, setToast] = useState<ToastState>(null)
  const [roles, setRoles] = useState<RbacRole[]>([])
  const [catalog, setCatalog] = useState<RbacPermissionRow[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())
  const [loadingList, setLoadingList] = useState(true)
  const [loadingRole, setLoadingRole] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeRole, setActiveRole] = useState<RbacRole | null>(null)
  const [permissionBaseline, setPermissionBaseline] = useState<Set<string> | null>(
    null,
  )

  const grouped = useMemo(() => groupPermissions(catalog), [catalog])
  const readOnlyColab =
    activeRole?.code === COLABORADOR

  const permissionsDirty = useMemo(() => {
    if (!permissionBaseline || readOnlyColab) return false
    return !setsEqualString(selectedCodes, permissionBaseline)
  }, [permissionBaseline, readOnlyColab, selectedCodes])

  useRegisterTransientContext({
    id: 'rbac-role-permissions',
    isDirty: () => permissionsDirty,
    onReset: () => {
      if (permissionBaseline) {
        setSelectedCodes(new Set(permissionBaseline))
      }
    },
  })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoadingList(true)
      setError(null)
      try {
        const [r, c] = await Promise.all([
          fetchRbacRoles(),
          fetchRbacPermissionsCatalog(),
        ])
        if (cancelled) return
        setRoles(r)
        setCatalog(c)
        setSelectedRoleId((prev) => prev ?? (r[0]?.id ?? null))
      } catch (e) {
        if (!cancelled) {
          const n = reportClientError(e, {
            module: 'governanca',
            action: 'rbac_catalog_load',
            route: pathname,
          })
          setError(
            isBlockingSeverity(n.severity) ? null : n.userMessage,
          )
          if (isBlockingSeverity(n.severity)) {
            presentBlocking(n)
          }
        }
      } finally {
        if (!cancelled) setLoadingList(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pathname, presentBlocking])

  useEffect(() => {
    if (!selectedRoleId) return
    let cancelled = false
    void (async () => {
      setLoadingRole(true)
      setError(null)
      try {
        const { role, permissionCodes } = await fetchRbacRolePermissions(
          selectedRoleId,
        )
        if (cancelled) return
        setActiveRole(role)
        const next = new Set(permissionCodes)
        setSelectedCodes(next)
        setPermissionBaseline(new Set(next))
      } catch (e) {
        if (!cancelled) {
          const n = reportClientError(e, {
            module: 'governanca',
            action: 'rbac_role_permissions_load',
            route: pathname,
            entityId: selectedRoleId ?? undefined,
          })
          setError(
            isBlockingSeverity(n.severity) ? null : n.userMessage,
          )
          if (isBlockingSeverity(n.severity)) {
            presentBlocking(n)
          }
          setPermissionBaseline(null)
        }
      } finally {
        if (!cancelled) setLoadingRole(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedRoleId, pathname, presentBlocking])

  const toggleCode = useCallback(
    (code: string, checked: boolean) => {
      if (readOnlyColab) return
      setSelectedCodes((prev) => {
        const next = new Set(prev)
        if (checked) next.add(code)
        else next.delete(code)
        return next
      })
    },
    [readOnlyColab],
  )

  const onSave = useCallback(async () => {
    if (!selectedRoleId || !activeRole || readOnlyColab) return
    setSaving(true)
    setToast(null)
    try {
      const codes = [...selectedCodes].sort((a, b) => a.localeCompare(b))
      await putRbacRolePermissions(selectedRoleId, codes)
      const fresh = await refreshUser()
      const stillRbac =
        fresh?.permissions.includes(PERMISSION_RBAC_MANAGE_ROLE_PERMISSIONS) ?? false
      if (!stillRbac) {
        navigate('/app/backlog', {
          replace: true,
          state: {
            shellFlash:
              'Deixou de ter acesso à gestão de permissões. Foi redirecionado para o painel operacional.',
          },
        })
        return
      }
      setToast({ message: 'Permissões do papel atualizadas.', variant: 'success' })
      const reloaded = await fetchRbacRolePermissions(selectedRoleId)
      const saved = new Set(reloaded.permissionCodes)
      setSelectedCodes(saved)
      setPermissionBaseline(new Set(saved))
    } catch (e) {
      const n = reportClientError(e, {
        module: 'governanca',
        action: 'rbac_role_permissions_save',
        route: pathname,
        entityId: selectedRoleId ?? undefined,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
      } else {
        setToast({ message: n.userMessage, variant: 'error' })
      }
    } finally {
      setSaving(false)
    }
  }, [
    activeRole,
    readOnlyColab,
    navigate,
    refreshUser,
    selectedCodes,
    selectedRoleId,
    pathname,
    presentBlocking,
  ])

  return (
    <PageCanvas>
      <header className="sgp-header-card space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sgp-gold-warm/90">
          Governança
        </p>
        <h1 className="sgp-page-title">
          Permissões por papel
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Consulte e altere as permissões RBAC de cada papel. O servidor é a fonte de verdade; as
          alterações ficam registadas na trilha administrativa.
        </p>
      </header>

      {toast ? (
        <SgpToast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100/90">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/[0.08] bg-sgp-app-panel-deep/40 p-4 shadow-[var(--sgp-shadow-card-dark)] md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <label
              htmlFor="rbac-role"
              className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
            >
              Papel
            </label>
            <select
              id="rbac-role"
              className="sgp-input-app w-full max-w-md rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
              value={selectedRoleId ?? ''}
              disabled={loadingList || !roles.length}
              onChange={(e) => {
                const v = e.target.value
                setSelectedRoleId(v || null)
              }}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className="rounded-xl border border-white/[0.1] bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.1] disabled:opacity-40"
              disabled={
                saving || loadingRole || readOnlyColab || !selectedRoleId
              }
              onClick={() => void onSave()}
            >
              {saving ? 'A guardar…' : 'Guardar alterações'}
            </button>
          </div>
        </div>

        {readOnlyColab ? (
          <p className="mt-4 rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-100/95">
            O papel <strong>Colaborador</strong> não tem permissões RBAC explícitas nesta versão
            (acesso operacional via autenticação). A edição para este papel está desativada.
          </p>
        ) : null}

        {loadingList || loadingRole ? (
          <p className="mt-6 text-sm text-slate-500">Carregando…</p>
        ) : (
          <div className="mt-6 space-y-8">
            {[...grouped.entries()].map(([domain, rows]) => (
              <div key={domain}>
                <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {domain}
                </h2>
                <ul className="grid gap-2 sm:grid-cols-1 lg:grid-cols-2">
                  {rows.map((p) => {
                    const checked = selectedCodes.has(p.code)
                    return (
                      <li
                        key={p.id}
                        className="flex gap-3 rounded-xl border border-white/[0.06] bg-sgp-void/40 px-3 py-2.5"
                      >
                        <input
                          id={`perm-${p.id}`}
                          type="checkbox"
                          className="mt-1 size-4 shrink-0 rounded border-white/20 bg-sgp-void"
                          checked={checked}
                          disabled={readOnlyColab}
                          onChange={(e) => toggleCode(p.code, e.target.checked)}
                        />
                        <label
                          htmlFor={`perm-${p.id}`}
                          className="min-w-0 flex-1 cursor-pointer"
                        >
                          <span className="block text-sm font-medium text-slate-100">
                            {p.name}
                          </span>
                          <span className="mt-0.5 block font-mono text-[11px] text-slate-500">
                            {p.code}
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {user?.roleId && selectedRoleId === user.roleId ? (
        <p className="text-xs text-slate-500">
          Está a editar o papel da sua sessão atual. Após guardar, as suas permissões serão
          atualizadas automaticamente.
        </p>
      ) : null}
    </PageCanvas>
  )
}
