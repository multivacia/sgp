import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  SgpContextActionsMenu,
  SgpContextActionsMenuProvider,
  type SgpContextActionsMenuItemDef,
} from '../../../components/shell/SgpContextActionsMenu'
import { PageCanvas } from '../../../components/ui/PageCanvas'
import {
  SgpToast,
  type SgpToastVariant,
} from '../../../components/ui/SgpToast'
import type {
  OperationalCollaboratorRoleRow,
  OperationalSectorRow,
} from '../../../domain/operational-settings/operationalCatalog.types'
import {
  isBlockingSeverity,
  reportClientError,
} from '../../../lib/errors'
import { useSgpErrorSurface } from '../../../lib/errors/SgpErrorPresentation'
import {
  createOperationalCollaboratorRole,
  createOperationalSector,
  deleteOperationalCollaboratorRole,
  deleteOperationalSector,
  listOperationalCollaboratorRoles,
  listOperationalSectors,
  patchOperationalCollaboratorRole,
  patchOperationalSector,
} from '../../../services/admin/operationalSettingsApiService'

type TabId = 'sectors' | 'roles'

type ToastState = { message: string; variant: SgpToastVariant } | null

export function OperationalSettingsPage() {
  const { pathname } = useLocation()
  const { presentBlocking } = useSgpErrorSurface()
  const [tab, setTab] = useState<TabId>('sectors')
  const [toast, setToast] = useState<ToastState>(null)

  const [sectors, setSectors] = useState<OperationalSectorRow[]>([])
  const [roles, setRoles] = useState<OperationalCollaboratorRoleRow[]>([])
  const [loadingSectors, setLoadingSectors] = useState(true)
  const [loadingRoles, setLoadingRoles] = useState(false)

  const [sectorModal, setSectorModal] = useState<
    | { mode: 'create' }
    | { mode: 'edit'; row: OperationalSectorRow }
    | null
  >(null)
  const [roleModal, setRoleModal] = useState<
    | { mode: 'create' }
    | { mode: 'edit'; row: OperationalCollaboratorRoleRow }
    | null
  >(null)

  const pushToast = (message: string, variant: SgpToastVariant = 'success') => {
    setToast({ message, variant })
  }

  const govErr = useCallback(
    (err: unknown, action: string) => {
      const n = reportClientError(err, {
        module: 'governanca',
        action,
        route: pathname,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
        return
      }
      pushToast(n.userMessage, 'error')
    },
    [pathname, presentBlocking],
  )

  const loadSectors = useCallback(async () => {
    setLoadingSectors(true)
    try {
      setSectors(await listOperationalSectors())
    } catch (e) {
      govErr(e, 'operational_settings_sectors_load')
    } finally {
      setLoadingSectors(false)
    }
  }, [govErr])

  const loadRoles = useCallback(async () => {
    setLoadingRoles(true)
    try {
      setRoles(await listOperationalCollaboratorRoles())
    } catch (e) {
      govErr(e, 'operational_settings_roles_load')
    } finally {
      setLoadingRoles(false)
    }
  }, [govErr])

  useEffect(() => {
    void loadSectors()
  }, [loadSectors])

  useEffect(() => {
    if (tab === 'roles') void loadRoles()
  }, [tab, loadRoles])

  return (
    <SgpContextActionsMenuProvider>
    <PageCanvas>
      <header className="sgp-header-card max-w-5xl">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
          <span className="h-px w-8 bg-gradient-to-r from-sgp-gold to-transparent" />
          Governança
        </p>
        <div className="mt-3">
          <h1 className="sgp-page-title">Configurações operacionais</h1>
          <p className="sgp-page-lead mt-2 max-w-2xl">
            Parametrização isolada de setores e de funções/papéis usados no cadastro de colaboradores.
            Papéis de segurança (RBAC) não são geridos aqui.
          </p>
        </div>
      </header>

      {toast ? (
        <SgpToast
          fixed
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      ) : null}

      <div className="mt-8 flex flex-wrap gap-2 border-b border-white/[0.08] pb-3">
        <button
          type="button"
          onClick={() => setTab('sectors')}
          className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
            tab === 'sectors'
              ? 'bg-sgp-gold/15 text-sgp-gold ring-1 ring-sgp-gold/35'
              : 'text-slate-400 hover:bg-white/[0.04]'
          }`}
        >
          Setores
        </button>
        <button
          type="button"
          onClick={() => setTab('roles')}
          className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
            tab === 'roles'
              ? 'bg-sgp-gold/15 text-sgp-gold ring-1 ring-sgp-gold/35'
              : 'text-slate-400 hover:bg-white/[0.04]'
          }`}
        >
          Funções operacionais
        </button>
      </div>

      {tab === 'sectors' ? (
        <section className="mt-6">
          <div className="sgp-panel sgp-panel-hover">
            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:justify-between">
              <p className="text-sm text-slate-400">
                {loadingSectors
                  ? 'Carregando…'
                  : `${sectors.length} setor(es) · visível nas listagens quando ativo.`}
              </p>
              <button
                type="button"
                className="sgp-cta-primary !px-4 !py-2 text-sm"
                onClick={() => setSectorModal({ mode: 'create' })}
              >
                Novo setor
              </button>
            </div>
          </div>
          <div className="mt-4 sgp-table-shell">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr
                  className="border-b border-white/[0.08] text-white shadow-inner"
                  style={{ background: 'var(--sgp-gradient-header)' }}
                >
                  <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Nome</th>
                  <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Ativo</th>
                  <th className="w-40 whitespace-nowrap px-4 py-4 text-right font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingSectors ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                      Carregando…
                    </td>
                  </tr>
                ) : sectors.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                      Nenhum setor.
                    </td>
                  </tr>
                ) : (
                  sectors.map((s) => {
                    const menuItems: SgpContextActionsMenuItemDef[] = [
                      {
                        label: 'Editar nome',
                        onClick: () => setSectorModal({ mode: 'edit', row: s }),
                      },
                      {
                        label: 'Eliminar',
                        destructive: true,
                        onClick: () => {
                          if (
                            !window.confirm(
                              'Eliminar este setor? Referências em colaboradores ficam sem setor.',
                            )
                          ) {
                            return
                          }
                          void (async () => {
                            try {
                              await deleteOperationalSector(s.id)
                              pushToast('Setor eliminado.')
                              await loadSectors()
                            } catch (err) {
                              govErr(err, 'operational_settings_sector_delete')
                            }
                          })()
                        },
                      },
                    ]
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3 font-medium text-slate-100">{s.name}</td>
                        <td className="px-4 py-3">
                          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                            <input
                              type="checkbox"
                              checked={s.isActive}
                              onChange={async (e) => {
                                try {
                                  const next = await patchOperationalSector(s.id, {
                                    isActive: e.target.checked,
                                  })
                                  setSectors((prev) =>
                                    prev.map((x) => (x.id === next.id ? next : x)),
                                  )
                                  pushToast(
                                    e.target.checked ? 'Setor ativado.' : 'Setor inativado.',
                                  )
                                } catch (err) {
                                  govErr(err, 'operational_settings_sector_patch')
                                }
                              }}
                              className="rounded border-white/20 bg-sgp-void"
                            />
                            {s.isActive ? 'Sim' : 'Não'}
                          </label>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end">
                            <SgpContextActionsMenu menuKey={`sector-${s.id}`} items={menuItems} />
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
        </section>
      ) : (
        <section className="mt-6">
          <div className="sgp-panel sgp-panel-hover">
            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:justify-between">
              <p className="text-sm text-slate-400">
                {loadingRoles
                  ? 'Carregando…'
                  : `${roles.length} função(ões) · apenas papéis marcados para cadastro de colaboradores (não inclui perfis RBAC como Administrador).`}
              </p>
              <button
                type="button"
                className="sgp-cta-primary !px-4 !py-2 text-sm"
                onClick={() => setRoleModal({ mode: 'create' })}
              >
                Nova função
              </button>
            </div>
          </div>
          <div className="mt-4 sgp-table-shell">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr
                  className="border-b border-white/[0.08] text-white shadow-inner"
                  style={{ background: 'var(--sgp-gradient-header)' }}
                >
                  <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Código</th>
                  <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Nome</th>
                  <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Ativo</th>
                  <th className="w-44 whitespace-nowrap px-4 py-4 text-right font-heading text-[11px] font-bold uppercase tracking-[0.12em]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingRoles ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      Carregando…
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      Nenhuma função operacional.
                    </td>
                  </tr>
                ) : (
                  roles.map((r) => {
                    const menuItems: SgpContextActionsMenuItemDef[] = [
                      {
                        label: 'Editar',
                        onClick: () => setRoleModal({ mode: 'edit', row: r }),
                      },
                      {
                        label: 'Eliminar',
                        destructive: true,
                        onClick: () => {
                          if (
                            !window.confirm(
                              'Eliminar esta função? Só é permitido se não houver utilizadores nem colaboradores associados.',
                            )
                          ) {
                            return
                          }
                          void (async () => {
                            try {
                              await deleteOperationalCollaboratorRole(r.id)
                              pushToast('Função eliminada.')
                              await loadRoles()
                            } catch (err) {
                              govErr(err, 'operational_settings_role_delete')
                            }
                          })()
                        },
                      },
                    ]
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-slate-300">{r.code}</td>
                        <td className="px-4 py-3 font-medium text-slate-100">{r.name}</td>
                        <td className="px-4 py-3">
                          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                            <input
                              type="checkbox"
                              checked={r.isActive}
                              onChange={async (e) => {
                                try {
                                  const next = await patchOperationalCollaboratorRole(r.id, {
                                    isActive: e.target.checked,
                                  })
                                  setRoles((prev) =>
                                    prev.map((x) => (x.id === next.id ? next : x)),
                                  )
                                  pushToast(
                                    e.target.checked
                                      ? 'Função ativada.'
                                      : 'Função inativada.',
                                  )
                                } catch (err) {
                                  govErr(err, 'operational_settings_role_patch')
                                }
                              }}
                              className="rounded border-white/20 bg-sgp-void"
                            />
                            {r.isActive ? 'Sim' : 'Não'}
                          </label>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end">
                            <SgpContextActionsMenu menuKey={`role-${r.id}`} items={menuItems} />
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
        </section>
      )}

      {sectorModal ? (
        <SectorNameModal
          mode={sectorModal.mode}
          initialName={sectorModal.mode === 'edit' ? sectorModal.row.name : ''}
          onClose={() => setSectorModal(null)}
          onSave={async (name) => {
            try {
              if (sectorModal.mode === 'create') {
                await createOperationalSector({ name })
                pushToast('Setor criado.')
              } else {
                await patchOperationalSector(sectorModal.row.id, { name })
                pushToast('Setor atualizado.')
              }
              setSectorModal(null)
              await loadSectors()
            } catch (e) {
              govErr(e, 'operational_settings_sector_save')
            }
          }}
        />
      ) : null}

      {roleModal ? (
        <RoleEditModal
          mode={roleModal.mode}
          initialName={roleModal.mode === 'edit' ? roleModal.row.name : ''}
          initialCode={roleModal.mode === 'edit' ? roleModal.row.code : ''}
          onClose={() => setRoleModal(null)}
          onSave={async ({ name, code }) => {
            try {
              if (roleModal.mode === 'create') {
                await createOperationalCollaboratorRole({
                  name,
                  code: code.trim() || undefined,
                })
                pushToast('Função criada.')
              } else {
                await patchOperationalCollaboratorRole(roleModal.row.id, {
                  name,
                  code,
                })
                pushToast('Função atualizada.')
              }
              setRoleModal(null)
              await loadRoles()
            } catch (e) {
              govErr(e, 'operational_settings_role_save')
            }
          }}
        />
      ) : null}
    </PageCanvas>
    </SgpContextActionsMenuProvider>
  )
}

function SectorNameModal({
  mode,
  initialName,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit'
  initialName: string
  onClose: () => void
  onSave: (name: string) => void | Promise<void>
}) {
  const [name, setName] = useState(initialName)
  const [err, setErr] = useState<string | null>(null)

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-sgp-navy/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-gradient-to-b from-sgp-navy to-sgp-void p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-heading text-lg font-bold text-slate-100">
          {mode === 'create' ? 'Novo setor' : 'Editar setor'}
        </h2>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Nome <span className="text-rose-300/90">*</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setErr(null)
            }}
            className="sgp-input-app mt-1.5 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
          />
        </label>
        {err ? (
          <p className="mt-2 text-sm text-rose-200/90">{err}</p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/12 px-4 py-2 text-sm font-bold text-slate-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              const t = name.trim()
              if (!t) {
                setErr('Informe o nome.')
                return
              }
              void onSave(t)
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

function RoleEditModal({
  mode,
  initialName,
  initialCode,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit'
  initialName: string
  initialCode: string
  onClose: () => void
  onSave: (v: { name: string; code: string }) => void | Promise<void>
}) {
  const [name, setName] = useState(initialName)
  const [code, setCode] = useState(initialCode)
  const [err, setErr] = useState<string | null>(null)

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-sgp-navy/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/[0.1] bg-gradient-to-b from-sgp-navy to-sgp-void p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-heading text-lg font-bold text-slate-100">
          {mode === 'create' ? 'Nova função operacional' : 'Editar função operacional'}
        </h2>
        <p className="mt-2 text-xs text-slate-500">
          Código opcional na criação — se vazio, o sistema gera um código único (prefixo OPF_).
        </p>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Nome <span className="text-rose-300/90">*</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setErr(null)
            }}
            className="sgp-input-app mt-1.5 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
          />
        </label>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Código {mode === 'create' ? '(opcional)' : null}
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              setErr(null)
            }}
            placeholder={mode === 'create' ? 'OPF_… ou vazio' : ''}
            className="sgp-input-app mt-1.5 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 font-mono text-sm text-slate-200"
          />
        </label>
        {err ? (
          <p className="mt-2 text-sm text-rose-200/90">{err}</p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/12 px-4 py-2 text-sm font-bold text-slate-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              const nt = name.trim()
              if (!nt) {
                setErr('Informe o nome.')
                return
              }
              const ct = code.trim()
              if (mode === 'edit' && !ct) {
                setErr('Informe o código.')
                return
              }
              void onSave({ name: nt, code: ct })
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
