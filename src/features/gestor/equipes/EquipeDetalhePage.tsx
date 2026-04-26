import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  SgpContextActionsMenu,
  SgpContextActionsMenuProvider,
  type SgpContextActionsMenuItemDef,
} from '../../../components/shell/SgpContextActionsMenu'
import { PageCanvas } from '../../../components/ui/PageCanvas'
import { SgpToast, type SgpToastVariant } from '../../../components/ui/SgpToast'
import type { Collaborator } from '../../../domain/collaborators/collaborator.types'
import type { Team, TeamMember } from '../../../domain/teams/team.types'
import {
  isBlockingSeverity,
  reportClientError,
} from '../../../lib/errors'
import { useSgpErrorSurface } from '../../../lib/errors/SgpErrorPresentation'
import { useAuth } from '../../../lib/use-auth'
import { createCollaboratorsApiService } from '../../../services/collaborators/collaboratorsApiService'
import {
  addTeamMember,
  getTeam,
  listTeamMembers,
  patchTeam,
  patchTeamMember,
  removeTeamMember,
} from '../../../services/teams/teamsApiService'

type ToastState = { message: string; variant: SgpToastVariant } | null

const collaboratorsApi = createCollaboratorsApiService()

function collaboratorBadge(row: TeamMember): { label: string; className: string } | null {
  if (row.collaboratorDeletedAt != null) {
    return {
      label: 'Removido do cadastro',
      className: 'bg-rose-500/15 text-rose-200',
    }
  }
  if (
    !row.collaboratorIsActive ||
    String(row.collaboratorStatus).toUpperCase() !== 'ACTIVE'
  ) {
    return {
      label: 'Colaborador inativo',
      className: 'bg-amber-500/15 text-amber-200',
    }
  }
  return null
}

export function EquipeDetalhePage() {
  const { id: teamId } = useParams<{ id: string }>()
  const { presentBlocking } = useSgpErrorSurface()
  const { can } = useAuth()
  const canUpdate = can('teams.update')
  const canMembers = can('teams.manage_members')

  const [toast, setToast] = useState<ToastState>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [savingTeam, setSavingTeam] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [collabOptions, setCollabOptions] = useState<Collaborator[]>([])
  const [loadingCollabs, setLoadingCollabs] = useState(false)
  const [pickCollabId, setPickCollabId] = useState('')
  const [pickRole, setPickRole] = useState('')
  const [pickPrimary, setPickPrimary] = useState(false)
  const [savingMember, setSavingMember] = useState(false)
  const [editRoleTarget, setEditRoleTarget] = useState<TeamMember | null>(null)
  const [editRoleValue, setEditRoleValue] = useState('')
  const [editPrimaryValue, setEditPrimaryValue] = useState(false)
  const [savingEditRole, setSavingEditRole] = useState(false)

  const pushToast = useCallback((message: string, variant: SgpToastVariant = 'success') => {
    setToast({ message, variant })
  }, [])

  const load = useCallback(async () => {
    if (!teamId) return
    setLoading(true)
    setNotFound(false)
    try {
      const t = await getTeam(teamId)
      if (!t) {
        setNotFound(true)
        setTeam(null)
        setMembers([])
        return
      }
      setTeam(t)
      setName(t.name)
      setDescription(t.description ?? '')
      setIsActive(t.isActive)
      const m = await listTeamMembers(teamId)
      setMembers(m)
    } catch (err) {
      const n = reportClientError(err, {
        module: 'equipes',
        action: 'detail_load',
        route: `/app/equipes/${teamId}`,
        entityId: teamId,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
        return
      }
      pushToast(n.userMessage, 'error')
    } finally {
      setLoading(false)
    }
  }, [presentBlocking, pushToast, teamId])

  useEffect(() => {
    void load()
  }, [load])

  const memberIds = useMemo(() => new Set(members.map((m) => m.collaboratorId)), [members])

  async function openAddModal() {
    if (!teamId) return
    setAddOpen(true)
    setPickCollabId('')
    setPickRole('')
    setPickPrimary(false)
    setLoadingCollabs(true)
    try {
      const rows = await collaboratorsApi.listCollaborators({ status: 'active' })
      setCollabOptions(rows.filter((c) => !memberIds.has(c.id)))
    } catch (err) {
      const n = reportClientError(err, {
        module: 'equipes',
        action: 'collab_options',
        route: `/app/equipes/${teamId}`,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
        return
      }
      pushToast(n.userMessage, 'error')
      setCollabOptions([])
    } finally {
      setLoadingCollabs(false)
    }
  }

  async function saveTeam() {
    if (!teamId || !team) return
    const n = name.trim()
    if (!n) {
      pushToast('Indique o nome da equipe.', 'error')
      return
    }
    setSavingTeam(true)
    try {
      const updated = await patchTeam(teamId, {
        name: n,
        description: description.trim() === '' ? null : description.trim(),
        isActive,
      })
      setTeam(updated)
      pushToast('Equipe atualizada.')
    } catch (err) {
      const rep = reportClientError(err, {
        module: 'equipes',
        action: 'patch_team',
        route: `/app/equipes/${teamId}`,
        entityId: teamId,
      })
      if (isBlockingSeverity(rep.severity)) {
        presentBlocking(rep)
        return
      }
      pushToast(rep.userMessage, 'error')
    } finally {
      setSavingTeam(false)
    }
  }

  async function submitAddMember() {
    if (!teamId || !pickCollabId) {
      pushToast('Escolha um colaborador.', 'error')
      return
    }
    setSavingMember(true)
    try {
      await addTeamMember(teamId, {
        collaboratorId: pickCollabId,
        role: pickRole.trim() === '' ? null : pickRole.trim(),
        isPrimary: pickPrimary,
      })
      pushToast('Membro adicionado.')
      setAddOpen(false)
      await load()
    } catch (err) {
      const rep = reportClientError(err, {
        module: 'equipes',
        action: 'add_member',
        route: `/app/equipes/${teamId}`,
        entityId: teamId,
      })
      if (isBlockingSeverity(rep.severity)) {
        presentBlocking(rep)
        return
      }
      pushToast(rep.userMessage, 'error')
    } finally {
      setSavingMember(false)
    }
  }

  async function onRemoveMember(m: TeamMember) {
    if (!teamId) return
    if (
      !window.confirm(
        `Remover ${m.collaboratorFullName} desta equipe? O vínculo fica inativo (não apaga o histórico).`,
      )
    ) {
      return
    }
    try {
      await removeTeamMember(teamId, m.id)
      pushToast('Membro removido da equipe.')
      await load()
    } catch (err) {
      const rep = reportClientError(err, {
        module: 'equipes',
        action: 'remove_member',
        route: `/app/equipes/${teamId}`,
        entityId: m.id,
      })
      if (isBlockingSeverity(rep.severity)) {
        presentBlocking(rep)
        return
      }
      pushToast(rep.userMessage, 'error')
    }
  }

  function openEditMemberRole(m: TeamMember) {
    setEditRoleTarget(m)
    setEditRoleValue(m.role ?? '')
    setEditPrimaryValue(Boolean(m.isPrimary))
  }

  async function onEditMemberRoleSubmit() {
    if (!teamId || !editRoleTarget) return
    const current = editRoleTarget.role?.trim() ?? ''
    const normalized = editRoleValue.trim()
    const currentPrimary = Boolean(editRoleTarget.isPrimary)
    const primaryChanged = editPrimaryValue !== currentPrimary
    if (normalized === current && !primaryChanged) {
      setEditRoleTarget(null)
      return
    }
    setSavingEditRole(true)
    if (!teamId) return
    try {
      await patchTeamMember(teamId, editRoleTarget.id, {
        role: normalized === '' ? null : normalized,
        isPrimary: editPrimaryValue,
      })
      pushToast('Membro da equipe atualizado.')
      setEditRoleTarget(null)
      await load()
    } catch (err) {
      const rep = reportClientError(err, {
        module: 'equipes',
        action: 'edit_member_role',
        route: `/app/equipes/${teamId}`,
        entityId: editRoleTarget.id,
      })
      if (isBlockingSeverity(rep.severity)) {
        presentBlocking(rep)
        return
      }
      pushToast(rep.userMessage, 'error')
    } finally {
      setSavingEditRole(false)
    }
  }

  if (!teamId) {
    return (
      <PageCanvas>
        <p className="text-slate-400">Identificador inválido.</p>
      </PageCanvas>
    )
  }

  return (
    <SgpContextActionsMenuProvider>
    <PageCanvas>
      {toast && (
        <SgpToast
          fixed
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}

      <div className="max-w-6xl">
        <Link to="/app/equipes" className="text-sm font-semibold text-slate-400 hover:text-white">
          ← Equipes
        </Link>
      </div>

      {loading ? (
        <p className="mt-6 text-slate-400">Carregando…</p>
      ) : notFound ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-sgp-app-panel-deep/60 p-8 text-center">
          <h1 className="sgp-page-title">Equipe não encontrada</h1>
          <Link to="/app/equipes" className="mt-4 inline-block text-sgp-gold hover:underline">
            Voltar à listagem
          </Link>
        </div>
      ) : team ? (
        <>
          <header className="sgp-header-card mt-6 max-w-6xl">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
              <span className="h-px w-8 bg-gradient-to-r from-sgp-gold to-transparent" />
              Gestão
            </p>
            <h1 className="sgp-page-title mt-2">{team.name}</h1>
          </header>

          <section className="mt-6 max-w-6xl rounded-2xl border border-white/10 bg-sgp-app-panel-deep/80 p-6 shadow-xl backdrop-blur">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
              Dados da equipe
            </h2>
            {!canUpdate ? (
              <p className="mt-2 text-sm text-slate-500">
                Sem permissão para editar esta equipe (<span className="font-mono">teams.update</span>
                ).
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-semibold uppercase tracking-wider text-slate-500">Nome</span>
                  <input
                    className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={256}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-semibold uppercase tracking-wider text-slate-500">Descrição</span>
                  <textarea
                    className="sgp-input-app min-h-[88px] resize-y rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={4000}
                  />
                </label>
                <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="size-4 rounded border-white/20"
                  />
                  Equipe ativa
                </label>
                <button
                  type="button"
                  className="sgp-cta-primary px-5 py-2"
                  disabled={savingTeam}
                  onClick={() => void saveTeam()}
                >
                  {savingTeam ? 'A guardar…' : 'Guardar alterações'}
                </button>
              </div>
            )}
          </section>

          <section className="mt-6 max-w-6xl rounded-2xl border border-white/10 bg-sgp-app-panel-deep/80 p-6 shadow-xl backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Membros</h2>
              {canMembers && (
                <button
                  type="button"
                  className="rounded-lg border border-sgp-gold/40 bg-sgp-gold/10 px-4 py-2 text-xs font-semibold text-sgp-gold hover:bg-sgp-gold/20"
                  onClick={() => void openAddModal()}
                >
                  Adicionar colaborador
                </button>
              )}
            </div>

            {members.length === 0 ? (
              <p className="mt-6 rounded-xl border border-dashed border-white/10 bg-black/15 py-10 text-center text-sm text-slate-400">
                Nenhum colaborador nesta equipe.
                {canMembers
                  ? ' Use "Adicionar colaborador" para associar alguém ativo.'
                  : ''}
              </p>
            ) : (
              <div className="mt-4 sgp-table-shell">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr
                      className="border-b border-white/[0.08] text-white shadow-inner"
                      style={{ background: 'var(--sgp-gradient-header)' }}
                    >
                      <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                        Colaborador
                      </th>
                      <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                        Papel na equipe
                      </th>
                      <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                        Referência
                      </th>
                      <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                        Situação
                      </th>
                      {canMembers && (
                        <th className="whitespace-nowrap px-4 py-4 text-right font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                          Ações
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => {
                      const badge = collaboratorBadge(m)
                      const memberActions: SgpContextActionsMenuItemDef[] = []
                      memberActions.push({
                        label: 'Editar',
                        onClick: () => {
                          openEditMemberRole(m)
                        },
                      })
                      memberActions.push({
                        label: 'Remover',
                        destructive: true,
                        onClick: () => {
                          void onRemoveMember(m)
                        },
                      })
                      return (
                        <tr
                          key={m.id}
                          className="border-b border-white/5 text-slate-200 hover:bg-white/[0.03]"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-white">{m.collaboratorFullName}</div>
                            {m.collaboratorEmail && (
                              <div className="text-xs text-slate-500">{m.collaboratorEmail}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-400">{m.role ?? '—'}</td>
                          <td className="px-4 py-3">
                            {m.isPrimary ? (
                              <span className="rounded-full bg-sgp-gold/15 px-2 py-0.5 text-[11px] font-semibold text-sgp-gold">
                                Referência
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              <span
                                className={
                                  m.isActive
                                    ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300'
                                    : 'rounded-full bg-slate-500/15 px-2 py-0.5 text-[11px] font-semibold text-slate-400'
                                }
                              >
                                {m.isActive ? 'Na equipe' : 'Removido'}
                              </span>
                              {badge && (
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
                                >
                                  {badge.label}
                                </span>
                              )}
                            </div>
                          </td>
                          {canMembers && (
                            <td className="px-4 py-3 text-right text-xs">
                              <div className="flex justify-end">
                                <SgpContextActionsMenu
                                  menuKey={`team-member-${m.id}`}
                                  items={memberActions}
                                />
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </section>
        </>
      ) : null}

      {addOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
          aria-labelledby="equipe-add-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-sgp-app-panel-deep p-6 shadow-2xl">
            <h2 id="equipe-add-title" className="text-lg font-semibold text-white">
              Adicionar colaborador
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Só colaboradores ativos podem ser associados. Já na equipe não aparecem na lista.
            </p>
            <div className="mt-5 space-y-4">
              <label className="flex flex-col gap-1.5 text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wide">Colaborador</span>
                <select
                  className="sgp-input"
                  value={pickCollabId}
                  onChange={(e) => setPickCollabId(e.target.value)}
                  disabled={loadingCollabs}
                >
                  <option value="">{loadingCollabs ? 'Carregando…' : 'Selecione…'}</option>
                  {collabOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wide">Papel na equipe (opcional)</span>
                <input
                  className="sgp-input"
                  value={pickRole}
                  onChange={(e) => setPickRole(e.target.value)}
                  maxLength={128}
                  placeholder="Ex.: Líder de turno"
                />
              </label>
              <label className="flex cursor-pointer items-center gap-3.5 pt-1 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={pickPrimary}
                  onChange={(e) => setPickPrimary(e.target.checked)}
                  className="size-4 rounded border-white/20"
                />
                Marcar como referência da equipe
              </label>
            </div>
            <div className="mt-7 flex flex-wrap justify-end gap-2.5 border-t border-white/[0.06] pt-4">
              <button
                type="button"
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300"
                onClick={() => setAddOpen(false)}
                disabled={savingMember}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="sgp-cta-primary px-4 py-2 text-sm"
                disabled={savingMember || !pickCollabId}
                onClick={() => void submitAddMember()}
              >
                {savingMember ? 'A guardar…' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {editRoleTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
          aria-labelledby="equipe-edit-role-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-sgp-app-panel-deep p-6 shadow-2xl">
            <h2 id="equipe-edit-role-title" className="text-lg font-semibold text-white">
              Editar colaborador
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Colaborador: <span className="font-medium text-slate-300">{editRoleTarget.collaboratorFullName}</span>
            </p>
            <div className="mt-5 space-y-4">
              <label className="flex flex-col gap-1.5 text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wide">Colaborador</span>
                <input
                  className="sgp-input"
                  value={editRoleTarget.collaboratorFullName}
                  readOnly
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wide">Papel na equipe (opcional)</span>
                <input
                  className="sgp-input"
                  value={editRoleValue}
                  onChange={(e) => setEditRoleValue(e.target.value)}
                  maxLength={128}
                  placeholder="Ex.: Líder de turno"
                  autoFocus
                />
              </label>
              <label className="flex cursor-pointer items-center gap-3.5 pt-1 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={editPrimaryValue}
                  onChange={(e) => setEditPrimaryValue(e.target.checked)}
                  className="size-4 rounded border-white/20"
                />
                Marcar como referência da equipe
              </label>
            </div>
            <div className="mt-7 flex flex-wrap justify-end gap-2.5 border-t border-white/[0.06] pt-4">
              <button
                type="button"
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300"
                onClick={() => setEditRoleTarget(null)}
                disabled={savingEditRole}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="sgp-cta-primary px-4 py-2 text-sm"
                disabled={savingEditRole}
                onClick={() => void onEditMemberRoleSubmit()}
              >
                {savingEditRole ? 'A guardar…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageCanvas>
    </SgpContextActionsMenuProvider>
  )
}
