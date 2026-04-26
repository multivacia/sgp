import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { PageCanvas } from '../../components/ui/PageCanvas'
import { SgpToast, type SgpToastVariant } from '../../components/ui/SgpToast'
import { formatHumanMinutes } from '../../lib/formatters'
import { isBlockingSeverity, reportClientError } from '../../lib/errors'
import { useSgpErrorSurface } from '../../lib/errors/SgpErrorPresentation'
import {
  deleteConveyorStepTimeEntry,
  getConveyorStepAssignees,
  getConveyorStepTimeEntries,
  postConveyorStepTimeEntryOnBehalf,
} from '../../services/conveyors/conveyorStepAssignmentsApiService'
import type { ConveyorStepTimeEntryListItem } from '../../domain/conveyors/conveyor-step-assignments.types'
import { useAuth } from '../../lib/use-auth'

type ToastState = { message: string; variant: SgpToastVariant } | null

export function ApontamentoGestorPage() {
  const { stepNodeId } = useParams<{ stepNodeId: string }>()
  const { pathname } = useLocation()
  const { presentBlocking } = useSgpErrorSurface()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, ready: authReady, can, canAny } = useAuth()

  const conveyorId =
    searchParams.get('conveyorId') ?? searchParams.get('esteiraId') ?? undefined
  const from = searchParams.get('from')
  const fromEsteira = from === 'esteira'

  const canManage = canAny([
    'time_entries.create_on_behalf',
    'time_entries.delete_any',
  ])
  const canCreateOnBehalf = can('time_entries.create_on_behalf')
  const canDeleteAny = can('time_entries.delete_any')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assigneeOptions, setAssigneeOptions] = useState<
    { id: string; collaboratorId: string; name: string }[]
  >([])
  const [entries, setEntries] = useState<ConveyorStepTimeEntryListItem[]>([])

  const [targetCollaboratorId, setTargetCollaboratorId] = useState('')
  const [minutosStr, setMinutosStr] = useState('30')
  const [observacao, setObservacao] = useState('')
  const [motivo, setMotivo] = useState('')
  const [toast, setToast] = useState<ToastState>(null)
  const [submitting, setSubmitting] = useState(false)

  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ConveyorStepTimeEntryListItem | null>(
    null,
  )
  const [motivoRemocao, setMotivoRemocao] = useState('')
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    if (!stepNodeId?.trim() || !conveyorId?.trim()) {
      setError('Indique a esteira e o passo (URL incompleta).')
      setAssigneeOptions([])
      setEntries([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [assignees, te] = await Promise.all([
        getConveyorStepAssignees(conveyorId.trim(), stepNodeId.trim()),
        getConveyorStepTimeEntries(conveyorId.trim(), stepNodeId.trim()),
      ])
      const collaboratorAssignees = assignees.filter(
        (a) => a.type === 'COLLABORATOR' && !!a.collaboratorId,
      )
      setAssigneeOptions(
        collaboratorAssignees.map((a) => ({
          id: a.id,
          collaboratorId: a.collaboratorId!,
          name: a.collaboratorName?.trim() || a.collaboratorId!,
        })),
      )
      setEntries(te)
      setTargetCollaboratorId((prev) => {
        if (prev && collaboratorAssignees.some((x) => x.collaboratorId === prev)) return prev
        return collaboratorAssignees[0]?.collaboratorId ?? ''
      })
    } catch (e) {
      setAssigneeOptions([])
      setEntries([])
      const n = reportClientError(e, {
        module: 'gestor',
        action: 'apontamento_gestor_load',
        route: pathname,
        entityId: conveyorId?.trim(),
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
        setError(null)
      } else {
        setError(n.userMessage)
      }
    } finally {
      setLoading(false)
    }
  }, [conveyorId, stepNodeId, pathname, presentBlocking])

  useEffect(() => {
    if (!authReady || !user) return
    void loadData()
  }, [authReady, user, loadData])

  const minutos = Number.parseInt(minutosStr, 10)
  const minutosValidos = Number.isInteger(minutos) && minutos >= 1
  const motivoOk = motivo.trim().length > 0

  function pushToast(message: string, variant: SgpToastVariant = 'neutral') {
    setToast({ message, variant })
  }

  async function executarCriacao() {
    if (
      !conveyorId?.trim() ||
      !stepNodeId?.trim() ||
      !targetCollaboratorId ||
      !minutosValidos ||
      !motivoOk ||
      submitting
    ) {
      return
    }
    setSubmitting(true)
    setToast(null)
    try {
      await postConveyorStepTimeEntryOnBehalf(conveyorId.trim(), stepNodeId.trim(), {
        targetCollaboratorId,
        minutes: minutos,
        notes: observacao.trim() || null,
        reason: motivo.trim(),
      })
      setConfirmCreateOpen(false)
      setMotivo('')
      setObservacao('')
      pushToast('Apontamento registado em nome do colaborador selecionado.', 'success')
      await loadData()
    } catch (e) {
      const n = reportClientError(e, {
        module: 'gestor',
        action: 'apontamento_gestor_create',
        route: pathname,
        entityId: conveyorId?.trim(),
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
      } else {
        pushToast(n.userMessage, 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function executarRemocao() {
    if (!deleteTarget || !conveyorId?.trim() || !stepNodeId?.trim() || deleting) return
    const own =
      user?.collaboratorId &&
      deleteTarget.collaboratorId === user.collaboratorId
    const needsReason = !own && canDeleteAny
    if (needsReason && !motivoRemocao.trim()) {
      pushToast('Indique o motivo da remoção.', 'error')
      return
    }
    setDeleting(true)
    setToast(null)
    try {
      await deleteConveyorStepTimeEntry(
        conveyorId.trim(),
        stepNodeId.trim(),
        deleteTarget.id,
        needsReason ? { reason: motivoRemocao.trim() } : undefined,
      )
      setDeleteTarget(null)
      setMotivoRemocao('')
      pushToast('Apontamento removido.', 'success')
      await loadData()
    } catch (e) {
      const n = reportClientError(e, {
        module: 'gestor',
        action: 'apontamento_gestor_delete',
        route: pathname,
        entityId: conveyorId?.trim(),
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
      } else {
        pushToast(n.userMessage, 'error')
      }
    } finally {
      setDeleting(false)
    }
  }

  const backLink = useMemo(() => {
    if (fromEsteira && conveyorId) {
      return { to: `/app/esteiras/${encodeURIComponent(conveyorId)}`, label: 'Esteira' }
    }
    return { to: '/app/dashboard', label: 'Dashboard' }
  }, [fromEsteira, conveyorId])

  if (!authReady) {
    return (
      <PageCanvas>
        <p className="text-sm text-slate-500">Carregando sessão…</p>
      </PageCanvas>
    )
  }

  if (!user) {
    return (
      <PageCanvas>
        <p className="text-sm text-slate-400">Inicie sessão para continuar.</p>
      </PageCanvas>
    )
  }

  if (!canManage) {
    return (
      <PageCanvas>
        <div className="sgp-panel max-w-lg rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/90">
            Permissão em falta
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Não tem permissão para apontamento gerencial. Contate um administrador.
          </p>
          <Link to="/app/backlog" className="sgp-cta-primary mt-6 inline-flex text-center">
            Voltar
          </Link>
        </div>
      </PageCanvas>
    )
  }

  if (!stepNodeId?.trim() || !conveyorId?.trim()) {
    return (
      <PageCanvas>
        <div className="sgp-panel max-w-lg rounded-2xl border border-white/[0.08] p-8">
          <p className="font-heading text-lg text-slate-200">URL incompleta</p>
          <p className="mt-2 text-sm text-slate-500">
            Abra a partir do detalhe da esteira (ligação &quot;Apontamento gerencial&quot; no
            passo) ou inclua conveyorId na query.
          </p>
          <Link to="/app/backlog" className="sgp-cta-primary mt-6 inline-flex text-center">
            Backlog
          </Link>
        </div>
      </PageCanvas>
    )
  }

  if (loading) {
    return (
      <PageCanvas>
        <p className="text-sm text-slate-500">Carregando passo…</p>
      </PageCanvas>
    )
  }

  if (error) {
    return (
      <PageCanvas>
        <div className="sgp-panel max-w-lg rounded-2xl border border-rose-500/25 bg-rose-500/[0.06] p-8">
          <p className="font-heading text-lg text-slate-100">{error}</p>
          <button
            type="button"
            className="sgp-cta-secondary mt-6"
            onClick={() => void loadData()}
          >
            Tentar novamente
          </button>
        </div>
      </PageCanvas>
    )
  }

  return (
    <PageCanvas>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(backLink.to)}
          className="text-sm font-semibold text-sgp-blue-bright hover:text-sky-300"
        >
          ← {backLink.label}
        </button>
      </div>

      <div className="sgp-panel max-w-2xl rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/90">
          Apontamento gerencial
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Registo em nome de um colaborador alocado neste passo. O motivo é obrigatório e fica
          na trilha administrativa.
        </p>
      </div>

      {toast ? (
        <div className="mt-4">
          <SgpToast
            message={toast.message}
            variant={toast.variant}
            onDismiss={() => setToast(null)}
          />
        </div>
      ) : null}

      {canCreateOnBehalf ? (
        <section className="mt-8 max-w-2xl space-y-4">
          <h2 className="font-heading text-lg text-slate-100">Novo lançamento</h2>
          {assigneeOptions.length === 0 ? (
            <p className="text-sm text-slate-500">
              Não há colaboradores alocados neste passo. Aloque antes de apontar.
            </p>
          ) : (
            <>
              <label className="block text-sm text-slate-400">
                Colaborador (alvo do tempo)
                <select
                  className="mt-1 w-full rounded-lg border border-white/[0.1] bg-sgp-app-panel-deep px-3 py-2 text-slate-100"
                  value={targetCollaboratorId}
                  onChange={(e) => setTargetCollaboratorId(e.target.value)}
                >
                  {assigneeOptions.map((o) => (
                    <option key={o.collaboratorId} value={o.collaboratorId}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-slate-400">
                Minutos
                <input
                  type="text"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-lg border border-white/[0.1] bg-sgp-app-panel-deep px-3 py-2 text-slate-100"
                  value={minutosStr}
                  onChange={(e) => setMinutosStr(e.target.value)}
                />
              </label>
              <label className="block text-sm text-slate-400">
                Observação (opcional)
                <textarea
                  className="mt-1 min-h-[72px] w-full rounded-lg border border-white/[0.1] bg-sgp-app-panel-deep px-3 py-2 text-slate-100"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                />
              </label>
              <label className="block text-sm text-slate-400">
                Motivo do registro em nome do colaborador (obrigatório)
                <textarea
                  className="mt-1 min-h-[80px] w-full rounded-lg border border-white/[0.1] bg-sgp-app-panel-deep px-3 py-2 text-slate-100"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={!minutosValidos || !motivoOk || submitting}
                className="sgp-cta-primary disabled:opacity-50"
                onClick={() => setConfirmCreateOpen(true)}
              >
                Rever e registar
              </button>
            </>
          )}
        </section>
      ) : null}

      <section className="mt-10 max-w-2xl">
        <h2 className="font-heading text-lg text-slate-100">Lançamentos no passo</h2>
        {entries.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Ainda não há apontamentos.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {entries.map((e) => {
              const own =
                user?.collaboratorId && e.collaboratorId === user.collaboratorId
              const canRemove = own || canDeleteAny
              return (
                <li
                  key={e.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm text-slate-200">
                      {e.collaboratorName ?? e.collaboratorId} ·{' '}
                      {formatHumanMinutes(e.minutes)}
                      {e.isDelegated ? (
                        <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200/95">
                          Registado por gestor
                        </span>
                      ) : null}
                    </p>
                    {e.isDelegated && e.recordedByUserEmail ? (
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Por {e.recordedByUserEmail}
                        {e.delegationReason ? ` · ${e.delegationReason}` : null}
                      </p>
                    ) : null}
                  </div>
                  {canRemove ? (
                    <button
                      type="button"
                      className="shrink-0 text-[11px] font-semibold text-rose-300/95 hover:text-rose-200"
                      onClick={() => {
                        setDeleteTarget(e)
                        setMotivoRemocao('')
                      }}
                    >
                      Remover…
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {confirmCreateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal
        >
          <div className="sgp-panel max-w-md rounded-2xl border border-white/[0.1] p-6 shadow-xl">
            <p className="font-heading text-lg text-slate-100">Confirmar registo</p>
            <p className="mt-2 text-sm text-slate-400">
              Serão creditados <strong className="text-slate-200">{minutos}</strong> minutos ao
              colaborador selecionado, com o motivo indicado. Deseja continuar?
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="sgp-cta-primary"
                disabled={submitting}
                onClick={() => void executarCriacao()}
              >
                {submitting ? 'A registar…' : 'Confirmar'}
              </button>
              <button
                type="button"
                className="sgp-cta-secondary"
                disabled={submitting}
                onClick={() => setConfirmCreateOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal
        >
          <div className="sgp-panel max-w-md rounded-2xl border border-white/[0.1] p-6 shadow-xl">
            <p className="font-heading text-lg text-slate-100">Remover apontamento</p>
            <p className="mt-2 text-sm text-slate-400">
              {user?.collaboratorId &&
              deleteTarget.collaboratorId === user.collaboratorId
                ? 'Confirma a remoção do seu próprio lançamento?'
                : 'Indique o motivo da remoção gerencial.'}
            </p>
            {user?.collaboratorId &&
            deleteTarget.collaboratorId === user.collaboratorId ? null : (
              <textarea
                className="mt-3 min-h-[80px] w-full rounded-lg border border-white/[0.1] bg-sgp-app-panel-deep px-3 py-2 text-sm text-slate-100"
                placeholder="Motivo obrigatório"
                value={motivoRemocao}
                onChange={(e) => setMotivoRemocao(e.target.value)}
              />
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-lg bg-rose-500/90 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                disabled={deleting}
                onClick={() => void executarRemocao()}
              >
                {deleting ? 'A remover…' : 'Remover'}
              </button>
              <button
                type="button"
                className="sgp-cta-secondary"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageCanvas>
  )
}
