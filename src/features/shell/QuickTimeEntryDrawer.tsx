import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { SgpToast, type SgpToastVariant } from '../../components/ui/SgpToast'
import { formatHumanMinutes } from '../../lib/formatters'
import { postConveyorStepTimeEntry } from '../../services/conveyors/conveyorStepAssignmentsApiService'
import { patchConveyorStepCompletion } from '../../services/conveyors/conveyorsApiService'
import { listTimeEntryCandidates } from '../../services/my-activities/myActivitiesApiService'
import type { TimeEntryCandidateItem } from '../../domain/my-activities/my-activities.types'
import type {
  ExtraTimeEntryDescriptionOption,
  ExtraTimeEntryItem,
} from '../../domain/my-activities/extraTimeEntries.types'
import { useAuth } from '../../lib/use-auth'
import {
  isBlockingSeverity,
  presentationPlan,
  reportClientError,
} from '../../lib/errors'
import { useSgpErrorSurface } from '../../lib/errors/SgpErrorPresentation'
import { transversalUxCopy } from '../../lib/transversalUxCopy'
import {
  formatAwaitingPreviousActivitiesLabel,
  resolveOutOfSequenceActionLabel,
  resolveSequenceListBadge,
} from '../../domain/production/production.helpers'
import { labelRoleInStep } from '../colaborador/minhasAtividadesLabels'
import {
  createMyExtraTimeEntry,
  listExtraTimeEntryDescriptions,
  listMyExtraTimeEntries,
} from '../../services/my-activities/extraTimeEntriesApiService'
import {
  buildTimeEntryPayload,
  canShowSaveAndCompleteButton,
  canSubmitExtraTimeEntry,
  candidateNeedsJustification,
  candidateNeedsOutOfSequenceJustification,
  candidateRequiresOperationalJustification,
  emptyJustificationValue,
  EXTRA_TIME_ENTRY_DESCRIPTION_PLACEHOLDER,
  QUICK_TIME_ENTRY_ERRORS,
  QUICK_TIME_ENTRY_TOAST,
  resolveExtraDescriptionSelectionAfterLoad,
  resolveTimeEntrySuccessToast,
  validateCompleteOutOfSequenceJustification,
  validateTimeEntryForm,
  type JustificationFieldValue,
} from './quickTimeEntryDrawerLogic'
import { JustificationSelect } from '../../components/operational/JustificationSelect'
import { resolvePreferredJustificationCategory } from '../../domain/operational/timeEntryJustificationField'
import { QuickTimeEntryCandidateActions } from './QuickTimeEntryCandidateActions'

const SEARCH_DEBOUNCE_MS = 200

type ToastState = { message: string; variant: SgpToastVariant } | null

type Phase = 'list' | 'form'
type DrawerTab = 'conveyor' | 'extra'

type Props = {
  open: boolean
  onClose: () => void
  initialCandidate?: TimeEntryCandidateItem | null
  /** Chamado após apontamento de esteira salvo com sucesso (drawer pode permanecer aberto). */
  onTimeEntrySaved?: () => void
}

function buildContextLine(c: TimeEntryCandidateItem) {
  const parts: string[] = [c.conveyorName]
  if (c.clientName?.trim()) parts.push(c.clientName.trim())
  if (c.vehicleLabel?.trim() || c.plate?.trim()) {
    parts.push([c.vehicleLabel?.trim(), c.plate?.trim()].filter(Boolean).join(' · '))
  }
  return parts.join(' · ')
}

export function QuickTimeEntryDrawer({
  open,
  onClose,
  initialCandidate = null,
  onTimeEntrySaved,
}: Props) {
  const { user, ready: authReady } = useAuth()
  const { presentBlocking } = useSgpErrorSurface()
  const [phase, setPhase] = useState<Phase>('list')
  const [tab, setTab] = useState<DrawerTab>('conveyor')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  /** Inclui atividades em aberto fora da alocação do colaborador (com critério no servidor). */
  const [searchOtherActivities, setSearchOtherActivities] = useState(false)
  const [items, setItems] = useState<TimeEntryCandidateItem[]>([])
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selected, setSelected] = useState<TimeEntryCandidateItem | null>(null)
  const [minutesStr, setMinutesStr] = useState('0')
  const [executedQuantityStr, setExecutedQuantityStr] = useState('1')
  const [description, setDescription] = useState('')
  const [operationalJustification, setOperationalJustification] =
    useState<JustificationFieldValue>(emptyJustificationValue())
  const [justificationUseFallback, setJustificationUseFallback] = useState(false)
  const [justificationRequiresComplement, setJustificationRequiresComplement] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [extraDescriptions, setExtraDescriptions] = useState<
    ExtraTimeEntryDescriptionOption[]
  >([])
  const [extraDescriptionsLoading, setExtraDescriptionsLoading] = useState(false)
  const [extraDescriptionsError, setExtraDescriptionsError] = useState<string | null>(null)
  const [extraEntries, setExtraEntries] = useState<ExtraTimeEntryItem[]>([])
  const [extraEntriesLoading, setExtraEntriesLoading] = useState(false)
  const [extraEntriesError, setExtraEntriesError] = useState<string | null>(null)
  const [extraUnavailableReason, setExtraUnavailableReason] = useState<string | null>(null)
  const [extraDescriptionId, setExtraDescriptionId] = useState('')
  const [extraEntryDate, setExtraEntryDate] = useState(new Date().toISOString().slice(0, 10))
  const [extraMinutesStr, setExtraMinutesStr] = useState('30')
  const [extraNotes, setExtraNotes] = useState('')
  const [extraSubmitting, setExtraSubmitting] = useState(false)
  const [extraSubmitError, setExtraSubmitError] = useState<string | null>(null)
  const [completeConfirmCandidate, setCompleteConfirmCandidate] =
    useState<TimeEntryCandidateItem | null>(null)
  const [completeJustification, setCompleteJustification] =
    useState<JustificationFieldValue>(emptyJustificationValue())
  const [completeError, setCompleteError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedSearch(search),
      SEARCH_DEBOUNCE_MS,
    )
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (!open) {
      setPhase('list')
      setTab('conveyor')
      setSelected(null)
      setSearch('')
      setDebouncedSearch('')
      setSearchOtherActivities(false)
      setLoadError(null)
      setSubmitError(null)
      setToast(null)
      setMinutesStr('0')
      setDescription('')
      setOperationalJustification(emptyJustificationValue())
      setJustificationUseFallback(false)
      setJustificationRequiresComplement(false)
      setExtraDescriptions([])
      setExtraDescriptionsLoading(false)
      setExtraDescriptionsError(null)
      setExtraEntries([])
      setExtraEntriesLoading(false)
      setExtraEntriesError(null)
      setExtraUnavailableReason(null)
      setExtraDescriptionId('')
      setExtraEntryDate(new Date().toISOString().slice(0, 10))
      setExtraMinutesStr('30')
      setExtraNotes('')
      setExtraSubmitting(false)
      setExtraSubmitError(null)
      setCompleteConfirmCandidate(null)
      setCompleteJustification(emptyJustificationValue())
      setCompleteError(null)
      setCompleting(false)
    }
  }, [open])

  const load = useCallback(async () => {
    if (!open) return
    setLoading(true)
    setLoadError(null)
    try {
      const r = await listTimeEntryCandidates({
        q: debouncedSearch || undefined,
        limit: 50,
        includeUnassigned: searchOtherActivities,
      })
      setItems(r.items)
      setUnavailableReason(r.unavailableReason)
    } catch (e) {
      setItems([])
      setUnavailableReason(null)
      const n = reportClientError(e, {
        module: 'shell',
        action: 'time_entry_candidates',
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
        onClose()
        return
      }
      setLoadError(n.userMessage)
    } finally {
      setLoading(false)
    }
  }, [open, debouncedSearch, searchOtherActivities, onClose, presentBlocking])

  useEffect(() => {
    if (!open || !authReady) return
    void load()
  }, [open, authReady, load])

  const loadExtraDescriptions = useCallback(async () => {
    if (!open) return
    setExtraDescriptionsLoading(true)
    setExtraDescriptionsError(null)
    try {
      const rows = await listExtraTimeEntryDescriptions()
      setExtraDescriptions(rows)
      setExtraDescriptionId((prev) => resolveExtraDescriptionSelectionAfterLoad(prev, rows))
    } catch (e) {
      const n = reportClientError(e, {
        module: 'shell',
        action: 'extra_time_entry_descriptions_load',
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
        onClose()
        return
      }
      setExtraDescriptionsError(n.userMessage)
      setExtraDescriptions([])
      setExtraDescriptionId('')
    } finally {
      setExtraDescriptionsLoading(false)
    }
  }, [open, onClose, presentBlocking])

  const loadExtraEntries = useCallback(async () => {
    if (!open) return
    setExtraEntriesLoading(true)
    setExtraEntriesError(null)
    try {
      const result = await listMyExtraTimeEntries({ limit: 10 })
      setExtraEntries(result.items)
      setExtraUnavailableReason(result.unavailableReason)
    } catch (e) {
      const n = reportClientError(e, {
        module: 'shell',
        action: 'extra_time_entries_list',
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
        onClose()
        return
      }
      setExtraEntriesError(n.userMessage)
      setExtraEntries([])
      setExtraUnavailableReason(null)
    } finally {
      setExtraEntriesLoading(false)
    }
  }, [open, onClose, presentBlocking])

  useEffect(() => {
    if (!open || !authReady) return
    void loadExtraDescriptions()
    void loadExtraEntries()
  }, [open, authReady, loadExtraDescriptions, loadExtraEntries])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  function pushToast(message: string, variant: SgpToastVariant = 'success') {
    setToast({ message, variant })
  }

  const minutes = Number.parseInt(minutesStr, 10)
  const minutesValid = Number.isInteger(minutes) && minutes >= 1
  const executedQuantity = Number.parseInt(executedQuantityStr, 10)
  const executedQuantityValid =
    Number.isInteger(executedQuantity) && executedQuantity >= 0
  const assignedCandidates = useMemo(
    () => items.filter((c) => !candidateNeedsJustification(c)),
    [items],
  )
  const otherCandidates = useMemo(
    () => items.filter((c) => candidateNeedsJustification(c)),
    [items],
  )
  const formNeedsJustification = selected
    ? candidateNeedsJustification(selected)
    : false
  const formNeedsOutOfSequence = selected
    ? candidateNeedsOutOfSequenceJustification(selected)
    : false
  const formRequiresOperationalJustification = selected
    ? candidateRequiresOperationalJustification(selected)
    : false
  const justificationValidationError = selected
    ? validateTimeEntryForm({
        candidate: selected,
        operationalJustification,
        useFallback: justificationUseFallback,
        requiresComplement: justificationRequiresComplement,
      })
    : null
  const canSubmitForm =
    minutesValid && executedQuantityValid && !justificationValidationError
  const showSaveAndComplete =
    selected != null && canShowSaveAndCompleteButton(selected)
  const extraMinutes = Number.parseInt(extraMinutesStr, 10)
  const extraMinutesValid = Number.isInteger(extraMinutes) && extraMinutes >= 1

  const startForm = useCallback((c: TimeEntryCandidateItem) => {
    setSelected(c)
    setPhase('form')
    setSubmitError(null)
    setMinutesStr('0')
    setDescription('')
    setOperationalJustification(emptyJustificationValue())
    setJustificationUseFallback(false)
    setJustificationRequiresComplement(false)
  }, [])

  useEffect(() => {
    if (!open || !initialCandidate) return
    setTab('conveyor')
    startForm(initialCandidate)
  }, [open, initialCandidate, startForm])

  function backToList() {
    setPhase('list')
    setSelected(null)
    setSubmitError(null)
  }

  async function save(markAsDone = false) {
    if (!selected || !user || submitting || !minutesValid || !executedQuantityValid) return
    if (!user.collaboratorId) {
      pushToast(transversalUxCopy.collaboratorLinkMissingToast, 'error')
      return
    }
    if (unavailableReason) {
      pushToast(transversalUxCopy.collaboratorLinkMissingToast, 'error')
      return
    }
    const validationError = validateTimeEntryForm({
      candidate: selected,
      operationalJustification,
      useFallback: justificationUseFallback,
      requiresComplement: justificationRequiresComplement,
    })
    if (validationError) {
      setSubmitError(validationError)
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    setToast(null)
    try {
      await postConveyorStepTimeEntry(
        selected.conveyorId,
        selected.stepNodeId,
        buildTimeEntryPayload({
          candidate: selected,
          minutes,
          executedQuantity,
          description,
          operationalJustification,
          markAsDone,
        }),
      )
      pushToast(resolveTimeEntrySuccessToast(markAsDone), 'success')
      setPhase('list')
      setSelected(null)
      setDescription('')
      setOperationalJustification(emptyJustificationValue())
      setJustificationUseFallback(false)
      setJustificationRequiresComplement(false)
      onTimeEntrySaved?.()
      void load()
    } catch (e) {
      const n = reportClientError(e, {
        module: 'shell',
        action: markAsDone ? 'quick_time_entry_save_and_complete' : 'quick_time_entry_save',
        entityId: selected.conveyorId,
      })
      const plan = presentationPlan(n)
      if (plan.surface === 'modal') {
        presentBlocking(n)
      } else {
        setSubmitError(n.userMessage)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function openCompleteConfirm(c: TimeEntryCandidateItem) {
    setCompleteConfirmCandidate(c)
    setCompleteJustification(emptyJustificationValue())
    setCompleteError(null)
  }

  function closeCompleteConfirm() {
    if (completing) return
    setCompleteConfirmCandidate(null)
    setCompleteJustification(emptyJustificationValue())
    setCompleteError(null)
  }

  async function confirmCompleteActivity() {
    const c = completeConfirmCandidate
    if (!c || completing) return
    const oosErr = validateCompleteOutOfSequenceJustification(c, completeJustification)
    if (oosErr) {
      setCompleteError(oosErr)
      return
    }
    setCompleting(true)
    setCompleteError(null)
    try {
      await patchConveyorStepCompletion(c.conveyorId, c.stepNodeId, {
        action: 'COMPLETE',
        ...(candidateNeedsOutOfSequenceJustification(c)
          ? {
              outOfSequenceJustification: completeJustification.legacyText.trim(),
              ...(completeJustification.justificationId
                ? {
                    justificationId: completeJustification.justificationId,
                    justificationComplement:
                      completeJustification.justificationComplement.trim() || undefined,
                  }
                : {}),
            }
          : {}),
      })
      pushToast(QUICK_TIME_ENTRY_TOAST.activityCompleted, 'success')
      setCompleteConfirmCandidate(null)
      setCompleteJustification(emptyJustificationValue())
      onTimeEntrySaved?.()
      void load()
    } catch (e) {
      const n = reportClientError(e, {
        module: 'shell',
        action: 'quick_time_entry_complete',
        entityId: c.conveyorId,
      })
      const plan = presentationPlan(n)
      if (plan.surface === 'modal') {
        presentBlocking(n)
        closeCompleteConfirm()
      } else {
        setCompleteError(n.userMessage || QUICK_TIME_ENTRY_ERRORS.completeFailed)
      }
    } finally {
      setCompleting(false)
    }
  }

  function renderCandidateActions(c: TimeEntryCandidateItem) {
    return (
      <QuickTimeEntryCandidateActions
        candidate={c}
        onApontar={() => startForm(c)}
        onComplete={() => openCompleteConfirm(c)}
        disabled={Boolean(unavailableReason)}
        completing={completing}
      />
    )
  }

  async function saveExtra() {
    if (!user || extraSubmitting) return
    if (!user.collaboratorId || extraUnavailableReason) {
      pushToast(transversalUxCopy.collaboratorLinkMissingToast, 'error')
      return
    }
    if (!extraDescriptionId) {
      setExtraSubmitError(EXTRA_TIME_ENTRY_DESCRIPTION_PLACEHOLDER)
      return
    }
    if (!extraMinutesValid) {
      setExtraSubmitError('Informe minutos válidos (maior que zero).')
      return
    }
    setExtraSubmitError(null)
    setExtraSubmitting(true)
    try {
      await createMyExtraTimeEntry({
        descriptionId: extraDescriptionId,
        entryDate: extraEntryDate || undefined,
        minutes: extraMinutes,
        notes: extraNotes.trim() || undefined,
      })
      pushToast('Apontamento extra esteira registado com sucesso.', 'success')
      setExtraDescriptionId('')
      setExtraMinutesStr('30')
      setExtraNotes('')
      await loadExtraEntries()
    } catch (e) {
      const n = reportClientError(e, {
        module: 'shell',
        action: 'extra_time_entry_save',
      })
      const plan = presentationPlan(n)
      if (plan.surface === 'modal') {
        presentBlocking(n)
      } else {
        setExtraSubmitError(n.userMessage)
      }
    } finally {
      setExtraSubmitting(false)
    }
  }

  if (!open) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        aria-label="Fechar"
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 z-[101] flex h-dvh w-full max-w-xl flex-col overflow-hidden border-l border-white/[0.09] bg-gradient-to-b from-sgp-navy/98 via-sgp-app-panel to-sgp-navy-deep shadow-[0_0_60px_-12px_rgba(0,0,0,0.85)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qte-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-white/[0.07] bg-gradient-to-br from-sgp-navy-deep/95 to-black/20 px-5 py-4 md:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {phase === 'form' ? (
                <button
                  type="button"
                  onClick={backToList}
                  className="mb-2 text-[11px] font-semibold text-sgp-blue-bright hover:text-sky-200"
                >
                  ← Voltar à lista
                </button>
              ) : null}
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sgp-gold">
                Execução rápida
              </p>
              <h2
                id="qte-title"
                className="mt-1 font-heading text-lg font-bold tracking-tight text-white md:text-xl"
              >
                {tab === 'conveyor'
                  ? phase === 'list'
                    ? 'Apontar horas'
                    : 'Registrar tempo'
                  : 'Apontamento extra esteira'}
              </h2>
            </div>
            <button
              type="button"
              className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {!authReady ? (
            <p className="p-5 text-sm text-slate-500">Carregando sessão…</p>
          ) : (
            <>
              <div className="shrink-0 border-b border-white/[0.06] px-4 py-3 md:px-5">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTab('conveyor')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      tab === 'conveyor'
                        ? 'bg-sgp-gold/15 text-sgp-gold ring-1 ring-sgp-gold/35'
                        : 'text-slate-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    Esteira
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('extra')
                      setPhase('list')
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      tab === 'extra'
                        ? 'bg-sgp-gold/15 text-sgp-gold ring-1 ring-sgp-gold/35'
                        : 'text-slate-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    Extra esteira
                  </button>
                </div>
              </div>
              {tab === 'conveyor' ? (
                phase === 'list' ? (
                  <>
                    <div className="shrink-0 space-y-3 border-b border-white/[0.06] p-4 md:p-5">
                      {unavailableReason ? (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2.5 text-xs leading-relaxed text-amber-100/95">
                          <p className="font-bold text-amber-200">
                            {transversalUxCopy.collaboratorLinkMissingTitle}
                          </p>
                          <p className="mt-1 text-amber-50/90">{unavailableReason}</p>
                        </div>
                      ) : null}
                      <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        Pesquisar
                        <input
                          type="search"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Esteira, cliente, veículo, placa, setor, tarefa, atividade…"
                          className="mt-1.5 w-full rounded-xl border border-[color:var(--semantic-border-glass-strong)] bg-sgp-app-panel-deep/90 px-3 py-2 text-sm text-slate-200 outline-none ring-sgp-blue-bright/0 transition focus:ring-2 focus:ring-sgp-blue-bright/25"
                        />
                      </label>
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/[0.06] bg-black/15 px-3 py-2.5 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={searchOtherActivities}
                          onChange={(e) => setSearchOtherActivities(e.target.checked)}
                          disabled={Boolean(unavailableReason)}
                        />
                        <span>
                          <span className="font-semibold text-slate-100">Buscar outras atividades</span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                            Inclui atividades em aberto fora da sua alocação. Use pelo menos 2 caracteres na
                            pesquisa. Será necessária uma justificativa ao apontar.
                          </span>
                        </span>
                      </label>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3 md:px-5">
                      {loading ? (
                        <p className="text-sm text-slate-500">Carregando atividades…</p>
                      ) : loadError ? (
                        <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.06] p-4 text-sm text-rose-100">
                          <p>{loadError}</p>
                          <button
                            type="button"
                            className="mt-3 text-xs font-bold text-sgp-blue-bright hover:underline"
                            onClick={() => void load()}
                          >
                            Tentar novamente
                          </button>
                        </div>
                      ) : unavailableReason && items.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Não há atividades para apontar neste contexto.
                        </p>
                      ) : items.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          {debouncedSearch.trim()
                            ? 'Nenhuma atividade corresponde à pesquisa.'
                            : 'Sem atividades em aberto para apontamento.'}
                        </p>
                      ) : (
                        <div className="space-y-6">
                          {assignedCandidates.length > 0 ? (
                            <section>
                              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                Minhas atividades
                              </p>
                              <ul className="space-y-3">
                                {assignedCandidates.map((c) => (
                                  <li
                                    key={`${c.conveyorId}-${c.stepNodeId}`}
                                    className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 shadow-inner"
                                  >
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                      Esteira
                                    </p>
                                    <p className="mt-1 font-heading text-sm font-bold text-white">
                                      {c.conveyorName}
                                    </p>
                                    <p className="mt-2 text-xs text-slate-500">{buildContextLine(c)}</p>
                                    {c.isOverdue ? (
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        <span className="rounded border border-rose-500/35 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-100">
                                          Atrasada
                                        </span>
                                      </div>
                                    ) : null}
                                    {(() => {
                                      const seqBadge = resolveSequenceListBadge(c)
                                      if (seqBadge.kind === 'none') return null
                                      return (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          <span
                                            className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                              seqBadge.kind === 'recommended'
                                                ? 'border-sgp-gold/35 bg-sgp-gold/15 text-sgp-gold'
                                                : 'border-slate-500/35 bg-slate-500/15 text-slate-200'
                                            }`}
                                          >
                                            {seqBadge.label}
                                          </span>
                                        </div>
                                      )
                                    })()}
                                    <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                      Tarefa
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-400">{c.taskTitle ?? '—'}</p>
                                    <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                      Atividade
                                    </p>
                                    <p className="mt-0.5 text-sm font-semibold text-slate-200">
                                      {c.stepName}
                                    </p>
                                    <p className="mt-2 text-xs text-slate-500">
                                      {c.areaName} · {labelRoleInStep(c.roleInStep)}
                                      {c.assignmentType === 'TEAM' ? ' · Time' : ''}
                                    </p>
                                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                                      <div>
                                        <p className="text-[9px] uppercase tracking-wider text-slate-600">
                                          Previsto
                                        </p>
                                        <p className="font-semibold text-slate-200">
                                          {c.plannedMinutes != null
                                            ? formatHumanMinutes(c.plannedMinutes)
                                            : '—'}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-[9px] uppercase tracking-wider text-slate-600">
                                          Realizado
                                        </p>
                                        <p className="font-semibold text-slate-200">
                                          {formatHumanMinutes(c.realizedMinutes)}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-[9px] uppercase tracking-wider text-slate-600">
                                          Pendente
                                        </p>
                                        <p className="font-semibold text-slate-200">
                                          {formatHumanMinutes(c.pendingMinutes)}
                                        </p>
                                      </div>
                                    </div>
                                    {renderCandidateActions(c)}
                                  </li>
                                ))}
                              </ul>
                            </section>
                          ) : null}
                          {otherCandidates.length > 0 ? (
                            <section>
                              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                Fora da sua alocação
                              </p>
                              <ul className="space-y-3">
                                {otherCandidates.map((c) => (
                                  <li
                                    key={`${c.conveyorId}-${c.stepNodeId}`}
                                    className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4 shadow-inner"
                                  >
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-200/90">
                                      Esteira
                                    </p>
                                    <p className="mt-1 font-heading text-sm font-bold text-white">
                                      {c.conveyorName}
                                    </p>
                                    <p className="mt-2 text-xs text-slate-500">{buildContextLine(c)}</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <span className="rounded border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-100">
                                        Fora da sua alocação
                                      </span>
                                    </div>
                                    <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                      Tarefa
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-400">{c.taskTitle ?? '—'}</p>
                                    <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                      Atividade
                                    </p>
                                    <p className="mt-0.5 text-sm font-semibold text-slate-200">
                                      {c.stepName}
                                    </p>
                                    <p className="mt-2 text-xs text-slate-500">
                                      {c.areaName} · {labelRoleInStep(c.roleInStep)}
                                    </p>
                                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                                      <div>
                                        <p className="text-[9px] uppercase tracking-wider text-slate-600">
                                          Previsto
                                        </p>
                                        <p className="font-semibold text-slate-200">
                                          {c.plannedMinutes != null
                                            ? formatHumanMinutes(c.plannedMinutes)
                                            : '—'}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-[9px] uppercase tracking-wider text-slate-600">
                                          Realizado
                                        </p>
                                        <p className="font-semibold text-slate-200">
                                          {formatHumanMinutes(c.realizedMinutes)}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-[9px] uppercase tracking-wider text-slate-600">
                                          Pendente
                                        </p>
                                        <p className="font-semibold text-slate-200">
                                          {formatHumanMinutes(c.pendingMinutes)}
                                        </p>
                                      </div>
                                    </div>
                                    {renderCandidateActions(c)}
                                  </li>
                                ))}
                              </ul>
                            </section>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </>
                ) : selected ? (
                  <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-8 pt-4 md:px-6">
                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        Esteira
                      </p>
                      <p className="mt-1 font-heading text-base font-bold text-white">
                        {selected.conveyorName}
                      </p>
                      <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        Atividade
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-100">
                        {selected.stepName}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {selected.areaName} · {labelRoleInStep(selected.roleInStep)}
                      </p>
                    </div>

                    <label className="mt-6 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      Tempo (minutos)
                      <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={minutesStr}
                        onChange={(e) => setMinutesStr(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-[color:var(--semantic-border-glass-strong)] bg-sgp-app-panel-deep/90 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-sgp-blue-bright/25"
                      />
                    </label>

                    <label className="mt-4 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      Quantidade executada
                      <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={executedQuantityStr}
                        onChange={(e) => setExecutedQuantityStr(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-[color:var(--semantic-border-glass-strong)] bg-sgp-app-panel-deep/90 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-sgp-blue-bright/25"
                      />
                      <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-slate-500">
                        Unidades concluídas neste apontamento (0 se não concluiu unidade).
                      </span>
                    </label>

                    {formNeedsJustification ? (
                      <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2.5 text-xs text-amber-50/95">
                        <p className="font-semibold text-amber-100">
                          Você não está alocado nesta atividade. Para apontar horas, informe uma justificativa
                          (apontamento por exceção).
                        </p>
                      </div>
                    ) : null}

                    {!formNeedsOutOfSequence &&
                    selected &&
                    (selected.sequenceWarningLabel ||
                      selected.awaitingPreviousActivities.length > 0) ? (
                      <p className="mt-4 text-xs text-slate-400">
                        {selected.sequenceWarningLabel ??
                          formatAwaitingPreviousActivitiesLabel(selected.awaitingPreviousActivities)}
                      </p>
                    ) : null}

                    {formNeedsOutOfSequence ? (
                      <div className="mt-4 rounded-xl border border-sky-500/25 bg-sky-500/[0.07] px-3 py-2.5 text-xs text-sky-50/95">
                        <p className="font-semibold text-sky-100">
                          {resolveOutOfSequenceActionLabel()} — confirme o apontamento.
                        </p>
                        <p className="mt-1.5 leading-relaxed text-sky-100/90">
                          Existem atividades anteriores ainda pendentes nesta esteira
                          {selected && selected.previousOpenCount > 0 ? (
                            <>
                              {' '}
                              — antes dela ainda existem{' '}
                              <span className="font-semibold">{selected.previousOpenCount}</span>{' '}
                              {selected.previousOpenCount === 1
                                ? 'atividade pendente'
                                : 'atividades pendentes'}
                              .
                            </>
                          ) : (
                            '.'
                          )}
                        </p>
                        {selected && selected.previousOpenActivities.length > 0 ? (
                          <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] text-sky-100/85">
                            {selected.previousOpenActivities.map((p, i) => (
                              <li key={`${p.activityTitle}-${i}`}>
                                <span className="font-semibold">{p.taskTitle}</span>
                                {' › '}
                                <span className="font-semibold">{p.sectorTitle}</span>
                                {' › '}
                                {p.activityTitle}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-4">
                      <JustificationSelect
                        channel="app"
                        idPrefix="qte-operational"
                        value={operationalJustification.justificationId ?? ''}
                        complement={operationalJustification.justificationComplement}
                        legacyText={operationalJustification.legacyText}
                        required={formRequiresOperationalJustification}
                        preferredCategory={
                          formNeedsJustification
                            ? null
                            : formNeedsOutOfSequence
                              ? resolvePreferredJustificationCategory({
                                  hasPreviousPendingStep: selected?.hasPreviousPendingStep,
                                  isOutOfSequence: selected?.isOutOfSequence,
                                })
                              : null
                        }
                        preferredLabelHint={
                          formNeedsOutOfSequence && selected?.hasPreviousPendingStep
                            ? 'outro colaborador'
                            : null
                        }
                        disabled={submitting}
                        onCatalogStateChange={({ useFallback, selectedRequiresComplement }) => {
                          setJustificationUseFallback(useFallback)
                          setJustificationRequiresComplement(selectedRequiresComplement)
                        }}
                        onChange={(next) => {
                          setOperationalJustification({
                            justificationId: next.justificationId,
                            justificationComplement: next.justificationComplement,
                            legacyText: next.legacyText,
                          })
                          setSubmitError(null)
                        }}
                      />
                    </div>

                    <label className="mt-4 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      Descrição (opcional)
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        placeholder="Notas sobre o trabalho realizado…"
                        className="mt-1.5 w-full resize-none rounded-xl border border-[color:var(--semantic-border-glass-strong)] bg-sgp-app-panel-deep/90 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-sgp-blue-bright/25"
                      />
                    </label>

                    {submitError ? (
                      <p className="mt-3 text-sm text-rose-200">{submitError}</p>
                    ) : null}

                    <div className="mt-6 flex flex-col gap-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          className="rounded-xl border border-white/12 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.05]"
                          onClick={backToList}
                          disabled={submitting}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="sgp-cta-primary px-4 py-2.5 text-sm disabled:pointer-events-none disabled:opacity-50"
                          onClick={() => void save(false)}
                          disabled={submitting || !canSubmitForm}
                        >
                          {submitting ? 'A guardar…' : 'Salvar apontamento'}
                        </button>
                      </div>
                      {showSaveAndComplete ? (
                        <button
                          type="button"
                          className="w-full rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-100 transition hover:bg-emerald-500/20 disabled:pointer-events-none disabled:opacity-50 sm:self-end sm:px-6"
                          onClick={() => void save(true)}
                          disabled={submitting || !canSubmitForm}
                        >
                          {submitting ? 'A guardar…' : 'Salvar apontamento e concluir atividade'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null
              ) : (
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-8 pt-4 md:px-6">
                  {extraUnavailableReason ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2.5 text-xs leading-relaxed text-amber-100/95">
                      <p className="font-bold text-amber-200">
                        {transversalUxCopy.collaboratorLinkMissingTitle}
                      </p>
                      <p className="mt-1 text-amber-50/90">{extraUnavailableReason}</p>
                    </div>
                  ) : null}

                  <label className="mt-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Descrição do apontamento
                    <select
                      value={extraDescriptionId}
                      onChange={(e) => setExtraDescriptionId(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-[color:var(--semantic-border-glass-strong)] bg-sgp-app-panel-deep/90 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-sgp-blue-bright/25"
                      disabled={extraDescriptionsLoading || extraDescriptions.length === 0}
                    >
                      <option value="" disabled>
                        {EXTRA_TIME_ENTRY_DESCRIPTION_PLACEHOLDER}
                      </option>
                      {extraDescriptions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.description}
                        </option>
                      ))}
                    </select>
                  </label>

                  {extraDescriptionsLoading ? (
                    <p className="mt-2 text-xs text-slate-500">Carregando descrições...</p>
                  ) : null}
                  {extraDescriptionsError ? (
                    <p className="mt-2 text-xs text-rose-200">{extraDescriptionsError}</p>
                  ) : null}
                  {!extraDescriptionsLoading &&
                  !extraDescriptionsError &&
                  extraDescriptions.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Não há descrições ativas configuradas.
                    </p>
                  ) : null}

                  <label className="mt-4 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Data
                    <input
                      type="date"
                      value={extraEntryDate}
                      onChange={(e) => setExtraEntryDate(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-[color:var(--semantic-border-glass-strong)] bg-sgp-app-panel-deep/90 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-sgp-blue-bright/25"
                    />
                  </label>

                  <label className="mt-4 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Tempo (minutos)
                    <input
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={extraMinutesStr}
                      onChange={(e) => setExtraMinutesStr(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-[color:var(--semantic-border-glass-strong)] bg-sgp-app-panel-deep/90 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-sgp-blue-bright/25"
                    />
                  </label>

                  <label className="mt-4 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Observação (opcional)
                    <textarea
                      value={extraNotes}
                      onChange={(e) => setExtraNotes(e.target.value)}
                      rows={3}
                      className="mt-1.5 w-full resize-none rounded-xl border border-[color:var(--semantic-border-glass-strong)] bg-sgp-app-panel-deep/90 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-sgp-blue-bright/25"
                    />
                  </label>

                  {extraSubmitError ? (
                    <p className="mt-3 text-sm text-rose-200">{extraSubmitError}</p>
                  ) : null}

                  <div className="mt-5">
                    <button
                      type="button"
                      className="sgp-cta-primary w-full justify-center py-2 text-sm disabled:pointer-events-none disabled:opacity-50"
                      onClick={() => void saveExtra()}
                      disabled={
                        !canSubmitExtraTimeEntry({
                          descriptionId: extraDescriptionId,
                          minutesValid: extraMinutesValid,
                          submitting: extraSubmitting,
                          unavailable: Boolean(extraUnavailableReason),
                        })
                      }
                    >
                      {extraSubmitting ? 'A guardar…' : 'Salvar apontamento'}
                    </button>
                  </div>

                  <div className="mt-6 border-t border-white/[0.06] pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Últimos apontamentos extra esteira
                    </p>
                    {extraEntriesLoading ? (
                      <p className="mt-2 text-sm text-slate-500">Carregando...</p>
                    ) : extraEntriesError ? (
                      <p className="mt-2 text-sm text-rose-200">{extraEntriesError}</p>
                    ) : extraEntries.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">Sem apontamentos recentes.</p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {extraEntries.map((e) => (
                          <li
                            key={e.id}
                            className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2"
                          >
                            <p className="text-sm font-semibold text-slate-100">
                              {e.description}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {e.entryDate} · {formatHumanMinutes(e.minutes)}
                            </p>
                            {e.notes ? (
                              <p className="mt-1 text-xs text-slate-500">{e.notes}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {toast ? (
          <div className="pointer-events-none absolute bottom-6 left-4 right-4 z-[1] flex justify-center md:left-auto md:right-6 md:justify-end">
            <div className="pointer-events-auto max-w-md">
              <SgpToast
                message={toast.message}
                variant={toast.variant}
                onDismiss={() => setToast(null)}
              />
            </div>
          </div>
        ) : null}

        {completeConfirmCandidate ? (
          <div className="absolute inset-0 z-[2] flex items-end justify-center bg-slate-950/60 p-4 sm:items-center">
            <div
              className="w-full max-w-md rounded-2xl border border-white/10 bg-sgp-navy-deep p-5 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="qte-complete-title"
            >
              <h3
                id="qte-complete-title"
                className="font-heading text-base font-bold text-white"
              >
                Concluir esta atividade?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Esta ação marca a atividade como concluída e pode liberar a próxima atividade da
                sequência.
              </p>
              {candidateNeedsOutOfSequenceJustification(completeConfirmCandidate) ? (
                <>
                  <p className="mt-3 text-xs text-sky-100/90">
                    Esta atividade está fora da sequência planejada. Informe uma justificativa para
                    concluir mesmo assim.
                  </p>
                  <div className="mt-3">
                    <JustificationSelect
                      channel="app"
                      idPrefix="qte-complete-oos"
                      value={completeJustification.justificationId ?? ''}
                      complement={completeJustification.justificationComplement}
                      legacyText={completeJustification.legacyText}
                      preferredCategory={resolvePreferredJustificationCategory({
                        hasPreviousPendingStep: completeConfirmCandidate?.hasPreviousPendingStep,
                        isOutOfSequence: completeConfirmCandidate?.isOutOfSequence,
                      })}
                      preferredLabelHint={
                        completeConfirmCandidate?.hasPreviousPendingStep
                          ? 'outro colaborador'
                          : null
                      }
                      disabled={completing}
                      onChange={(next) =>
                        setCompleteJustification({
                          justificationId: next.justificationId,
                          justificationComplement: next.justificationComplement,
                          legacyText: next.legacyText,
                        })
                      }
                    />
                  </div>
                </>
              ) : null}
              {completeError ? (
                <p className="mt-3 text-sm text-rose-200">{completeError}</p>
              ) : null}
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="rounded-xl border border-white/12 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.05]"
                  onClick={closeCompleteConfirm}
                  disabled={completing}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-4 py-2.5 text-sm font-bold text-emerald-100 transition hover:bg-emerald-500/25 disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => void confirmCompleteActivity()}
                  disabled={
                    completing ||
                    (candidateNeedsOutOfSequenceJustification(completeConfirmCandidate) &&
                      !completeJustification.legacyText.trim().length)
                  }
                >
                  {completing ? 'A concluir…' : 'Concluir atividade'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </div>,
    document.body,
  )
}
