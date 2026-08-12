import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { StatusBadge } from '../../components/backlog/StatusBadge'
import { PageCanvas } from '../../components/ui/PageCanvas'
import type {
  ConveyorDetail,
  ConveyorOperationalStatus,
  ConveyorStructureStep,
} from '../../domain/conveyors/conveyor.types'
import { CONVEYOR_STATUS_TRANSITION_ACTIONS } from '../../domain/conveyors/conveyorOperationalStatus'
import {
  canAbortStep,
  canCompleteStep,
  canReopenStep,
  canRestoreAbortedStep,
  isStepAborted,
  isStepOperationallyCompleted,
  stepOperationalStatusLabel,
} from '../../domain/conveyors/stepOperationalStatus'
import {
  type StepAbortReasonCode,
  stepAbortReasonLabel,
} from '../../domain/conveyors/stepAbortReasons'
import { AbortConveyorStepDialog } from './AbortConveyorStepDialog'
import type { ConveyorNodeWorkload } from '../../domain/conveyors/conveyorNodeWorkload.types'
import type { ConveyorOperationalEvent } from '../../domain/conveyors/conveyorOperationalEvents.types'
import { ConveyorOperationalEventsTimeline } from './ConveyorOperationalEventsTimeline'
import {
  displayUsuarioObservacoes,
  parseWizardPrazoForDisplay,
} from './conveyorBasicDataExtras'
import type { StepAnaliticoDetalhe } from '../../domain/esteiras/step-analitico.types'
import { useAuth } from '../../lib/use-auth'
import { ApiError } from '../../lib/api/apiErrors'
import {
  isBlockingSeverity,
  reportClientError,
} from '../../lib/errors'
import { useSgpErrorSurface } from '../../lib/errors/SgpErrorPresentation'
import { mapOperationalStatusToUi } from '../../lib/backlog/mapConveyorListToBacklog'
import {
  getConveyorById,
  getConveyorOperationalEvents,
  getConveyorNodeWorkload,
  getConveyorStepSequenceCheck,
  patchConveyorStatus,
  patchConveyorStepCompletion,
  reopenConveyorStep,
  abortConveyorStep,
  restoreAbortedConveyorStep,
} from '../../services/conveyors/conveyorsApiService'
import {
  getConveyorStepAssignees,
  getConveyorStepTimeEntries,
} from '../../services/conveyors/conveyorStepAssignmentsApiService'
import { buildStepAnaliticoDetalheFromApi } from './step-analitico/buildStepAnaliticoDetalheFromApi'
import { StepAnaliticoPanel } from './StepAnaliticoPanel'
import { SgpToast } from '../../components/ui/SgpToast'
import { JustificationSelect } from '../../components/operational/JustificationSelect'
import {
  emptyJustificationValue,
  type JustificationFieldValue,
} from '../shell/quickTimeEntryDrawerLogic'
import { resolvePreferredJustificationCategory } from '../../domain/operational/timeEntryJustificationField'
import { formatMinutosHumanos } from '../../lib/formatters'
import {
  computeTarefaResumo,
  type AtividadePrioridade,
  type AtividadeStatusDetalhe,
  type EsteiraStatusGeral,
  type EsteiraTarefaMock,
} from '../../mocks/esteira-detalhe'
import {
  getEsteiraOperacionalDetalheMock,
  type EsteiraAtividadeOperacional,
} from '../../mocks/esteira-operacional'
import { obterHistoricoAgregadoAtividade } from '../../mocks/apontamentos-repository'
import {
  getOperacaoApontamentosVersion,
  subscribeOperacaoApontamentos,
} from '../../mocks/apontamento-sync'
import {
  ActivityHistoricoDrawer,
  type HistoricoDrawerContext,
} from './ActivityHistoricoDrawer'
import { GestorAtividadeMenu } from './GestorAtividadeMenu'
import { ConveyorNodeWorkloadPanel } from './ConveyorNodeWorkloadPanel'
import { ConveyorHealthAnalysisCard } from './ConveyorHealthAnalysisCard'
import { ConveyorOperationalPlanCard } from './ConveyorOperationalPlanCard'
import { ConveyorLifecycleReturnPanel } from './ConveyorLifecycleReturnPanel'
import {
  collectConveyorActivityTicketSources,
  filterConveyorActivityTicketSources,
} from '../operational-tickets/activityTicketConveyorSource'
import { buildConveyorGroupedTicketPrintItems } from '../operational-tickets/buildConveyorActivityTicketPrintModels'
import { ConveyorActivityTicketsPrintDialog } from '../operational-tickets/ConveyorActivityTicketsPrintDialog'
import { ThermalActivityTicketsPrintArea } from '../operational-tickets/ThermalActivityTicketsPrintArea'
import { ThermalTicketPrintProgressOverlay } from '../operational-tickets/ThermalTicketPrintProgressOverlay'
import { isBatchThermalTicketPrint } from '../operational-tickets/thermalTicketPrintQueue'
import { useActivityTicketPrint } from '../operational-tickets/useActivityTicketPrint'

function statusEsteiraLabel(s: EsteiraStatusGeral) {
  const map: Record<EsteiraStatusGeral, string> = {
    em_execucao: 'Em execução',
    pausada: 'Pausada',
    concluida: 'Concluída',
    no_backlog: 'No backlog',
  }
  return map[s]
}

function statusTarefaLabel(t: EsteiraTarefaMock['status']) {
  const map = {
    nao_iniciada: 'Não iniciada',
    em_andamento: 'Em andamento',
    concluida: 'Concluída',
  }
  return map[t]
}

function statusAtividadeBadge(a: AtividadeStatusDetalhe) {
  const styles: Record<AtividadeStatusDetalhe, string> = {
    pendente:
      'border-white/15 bg-white/[0.06] text-slate-300 ring-1 ring-white/[0.06]',
    pronta:
      'border-emerald-400/40 bg-emerald-500/14 text-emerald-100 ring-1 ring-emerald-500/20',
    em_execucao:
      'border-sky-400/40 bg-sky-500/15 text-sky-100 ring-1 ring-sky-500/20',
    pausada:
      'border-violet-400/40 bg-violet-500/14 text-violet-100 ring-1 ring-violet-500/20',
    concluida:
      'border-emerald-400/40 bg-emerald-500/14 text-emerald-100 ring-1 ring-emerald-500/18',
    bloqueada:
      'border-amber-400/45 bg-amber-500/16 text-amber-50 ring-1 ring-amber-500/20',
  }
  const labels: Record<AtividadeStatusDetalhe, string> = {
    pendente: 'Pendente',
    pronta: 'Pronta',
    em_execucao: 'Em execução',
    pausada: 'Pausada',
    concluida: 'Concluída',
    bloqueada: 'Bloqueada',
  }
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${styles[a]}`}
    >
      {labels[a]}
    </span>
  )
}

const OBS_GESTOR_PREVIEW_MAX = 110

function previewObservacaoGestor(texto: string) {
  const t = texto.trim()
  if (t.length <= OBS_GESTOR_PREVIEW_MAX) return t
  return `${t.slice(0, OBS_GESTOR_PREVIEW_MAX).trim()}…`
}

function prioridadeAtividadeBadge(p?: AtividadePrioridade) {
  if (!p) return null
  const styles: Record<AtividadePrioridade, string> = {
    baixa: 'border-white/12 bg-white/[0.05] text-slate-500 ring-1 ring-white/[0.06]',
    media:
      'border-white/10 bg-white/[0.04] text-slate-400 ring-1 ring-white/[0.05]',
    alta: 'border-amber-400/35 bg-amber-500/10 text-amber-100/90 ring-1 ring-amber-500/15',
    critica:
      'border-rose-400/38 bg-rose-500/11 text-rose-100/95 ring-1 ring-rose-500/16',
  }
  const labels: Record<AtividadePrioridade, string> = {
    baixa: 'Baixa',
    media: 'Média',
    alta: 'Alta',
    critica: 'Crítica',
  }
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${styles[p]}`}
    >
      {labels[p]}
    </span>
  )
}

const ATIVIDADE_GRID_MAIN =
  'md:grid md:grid-cols-[1fr_minmax(5rem,auto)_minmax(6rem,auto)_minmax(7rem,auto)_minmax(5rem,auto)_auto] md:items-center md:gap-3'

function atividadeRowClass(a: EsteiraAtividadeOperacional) {
  const base =
    'flex flex-col gap-3 rounded-xl py-4 first:pt-2 md:px-2'
  if (a.status === 'bloqueada') {
    return `${base} border-l-[3px] border-l-amber-500/40 bg-amber-500/[0.04] pl-3`
  }
  if (a.status === 'pausada') {
    return `${base} border-l-[3px] border-l-violet-500/45 bg-violet-500/[0.05] pl-3`
  }
  if (a.apontabilidade.apontavel) {
    return `${base} border-l-[3px] border-l-emerald-400/55 bg-emerald-500/[0.04] pl-3 md:pl-3`
  }
  return `${base} border-l-[3px] border-l-white/[0.08] pl-3`
}

function originRegisterLabel(o: 'MANUAL' | 'BASE' | 'HYBRID'): string {
  if (o === 'MANUAL') return 'Manual'
  if (o === 'BASE') return 'Base'
  return 'Misto'
}

/** Alinhado à matriz v1 do backend. */
const STATUS_TRANSITION_ACTIONS = CONVEYOR_STATUS_TRANSITION_ACTIONS

function flattenConveyorStructureSteps(
  structure: ConveyorDetail['structure'],
): ConveyorStructureStep[] {
  const out: ConveyorStructureStep[] = []
  for (const opt of structure.options) {
    for (const area of opt.areas) {
      for (const st of area.steps) {
        out.push(st)
      }
    }
  }
  return out
}

const OPERATIONAL_EVENTS_LOAD_ERROR = 'Não foi possível carregar os eventos operacionais.'

function isUuidLike(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s.trim(),
  )
}

function EsteiraDetalheBasicoReal({ id }: { id: string | undefined }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { presentBlocking } = useSgpErrorSurface()
  const [searchParams] = useSearchParams()
  const stepParam = searchParams.get('step')?.trim() ?? ''
  const { can } = useAuth()
  const canChangePipelineStatus = can('conveyors.edit_status')
  const canAlterConveyor = can('conveyors.create')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [detail, setDetail] = useState<ConveyorDetail | null>(null)
  const [patchStatusLoading, setPatchStatusLoading] = useState(false)
  const [patchError, setPatchError] = useState<string | null>(null)
  const [stepAnaliticoByStepId, setStepAnaliticoByStepId] = useState<
    Record<string, StepAnaliticoDetalhe>
  >({})
  const [stepAnaliticoLoading, setStepAnaliticoLoading] = useState(false)
  const [stepHighlightId, setStepHighlightId] = useState<string | null>(null)
  const [stepNotice, setStepNotice] = useState<string | null>(null)
  const stepErrorMarkRef = useRef('')
  const [nodeWorkload, setNodeWorkload] = useState<ConveyorNodeWorkload | null>(
    null,
  )
  const [nodeWorkloadLoading, setNodeWorkloadLoading] = useState(false)
  const [nodeWorkloadError, setNodeWorkloadError] = useState<string | null>(
    null,
  )
  const [routeToast, setRouteToast] = useState<string | null>(null)
  const [showCreatedBanner, setShowCreatedBanner] = useState(false)
  const [operationalEvents, setOperationalEvents] = useState<ConveyorOperationalEvent[]>(
    [],
  )
  const [operationalEventsLoading, setOperationalEventsLoading] = useState(false)
  const [operationalEventsError, setOperationalEventsError] = useState<string | null>(
    null,
  )
  const [operationalEventsLimit, setOperationalEventsLimit] = useState(50)
  const [stepCompletingId, setStepCompletingId] = useState<string | null>(null)
  const [conveyorTicketsPrintOpen, setConveyorTicketsPrintOpen] = useState(false)
  const {
    currentSheet: conveyorPrintSheet,
    printProgress: conveyorPrintProgress,
    agentStatus: conveyorAgentStatus,
    agentFallbackNotice: conveyorAgentFallbackNotice,
    testPrintLoading: conveyorTestPrintLoading,
    requestPrint: requestConveyorTicketPrint,
    cancelPrint: cancelConveyorTicketPrint,
    clearAgentFallbackNotice: clearConveyorAgentFallbackNotice,
    testThermalPrinter: testConveyorThermalPrinter,
  } = useActivityTicketPrint()
  const [stepReopeningId, setStepReopeningId] = useState<string | null>(null)
  const [reopenDialog, setReopenDialog] = useState<{
    stepId: string
    stepName: string
  } | null>(null)
  const [reopenNote, setReopenNote] = useState('')
  const [stepAbortingId, setStepAbortingId] = useState<string | null>(null)
  const [abortDialog, setAbortDialog] = useState<{
    stepId: string
    stepName: string
    idempotencyKey: string
  } | null>(null)
  const [abortReasonCode, setAbortReasonCode] =
    useState<StepAbortReasonCode>('NAO_MAIS_NECESSARIA')
  const [abortReasonText, setAbortReasonText] = useState('')
  const [stepAbortError, setStepAbortError] = useState<string | null>(null)
  const [stepRestoringId, setStepRestoringId] = useState<string | null>(null)
  const [completeOosDialog, setCompleteOosDialog] = useState<{
    stepId: string
    stepName: string
    previousOpenCount: number
    samples: { taskTitle: string; sectorTitle: string; activityTitle: string }[]
  } | null>(null)
  const [completeOosJustification, setCompleteOosJustification] =
    useState<JustificationFieldValue>(emptyJustificationValue())

  const handleLoadMoreOperationalEvents = useCallback(() => {
    setOperationalEventsLimit((n) => Math.min(200, n + 25))
  }, [])

  const resolveStepName = useCallback(
    (stepId: string) => {
      if (!detail?.structure?.options) return 'Atividade'
      for (const opt of detail.structure.options) {
        for (const area of opt.areas ?? []) {
          for (const step of area.steps ?? []) {
            if (step.id === stepId) return step.name
          }
        }
      }
      return 'Atividade'
    },
    [detail],
  )

  const executeCompleteStep = useCallback(
    async (stepId: string, justification: JustificationFieldValue) => {
      if (!detail?.id) return
      setStepCompletingId(stepId)
      try {
        await patchConveyorStepCompletion(detail.id, stepId, {
          action: 'COMPLETE',
          ...(justification.legacyText.trim()
            ? {
                outOfSequenceJustification: justification.legacyText.trim(),
                ...(justification.justificationId
                  ? {
                      justificationId: justification.justificationId,
                      justificationComplement:
                        justification.justificationComplement.trim() || undefined,
                    }
                  : {}),
              }
            : {}),
        })
        setCompleteOosDialog(null)
        setCompleteOosJustification(emptyJustificationValue())
        const [dNext, evNext, wNext] = await Promise.all([
          getConveyorById(detail.id),
          getConveyorOperationalEvents(detail.id, { limit: operationalEventsLimit }),
          getConveyorNodeWorkload(detail.id).catch(() => null),
        ])
        setDetail(dNext)
        setOperationalEvents(evNext.data)
        if (wNext) setNodeWorkload(wNext)
      } catch (e) {
        const n = reportClientError(e, {
          module: 'esteiras',
          action: 'step_complete',
          route: location.pathname,
          entityId: detail.id,
        })
        if (n.code === 'STEP_COMPLETION_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION') {
          setCompleteOosJustification(emptyJustificationValue())
          setCompleteOosDialog({
            stepId,
            stepName: resolveStepName(stepId),
            previousOpenCount: 0,
            samples: [],
          })
          return
        }
        if (isBlockingSeverity(n.severity)) {
          presentBlocking(n)
        } else {
          setLoadError(n.userMessage)
        }
      } finally {
        setStepCompletingId(null)
      }
    },
    [
      detail,
      location.pathname,
      presentBlocking,
      operationalEventsLimit,
      resolveStepName,
    ],
  )

  const handleCompleteStepClick = useCallback(
    async (stepId: string) => {
      if (!detail?.id) return
      let prefetch: Awaited<ReturnType<typeof getConveyorStepSequenceCheck>> | null =
        null
      try {
        prefetch = await getConveyorStepSequenceCheck(detail.id, stepId)
      } catch {
        prefetch = null
      }
      if (prefetch && !prefetch.targetFound) {
        setLoadError(
          'Esta atividade não foi encontrada na estrutura actual desta esteira.',
        )
        return
      }
      if (prefetch?.isOutOfSequence) {
        setCompleteOosJustification(emptyJustificationValue())
        setCompleteOosDialog({
          stepId,
          stepName: resolveStepName(stepId),
          previousOpenCount: prefetch.previousOpenCount,
          samples: prefetch.previousOpenActivities.slice(0, 3).map((x) => ({
            taskTitle: x.taskTitle,
            sectorTitle: x.sectorTitle,
            activityTitle: x.activityTitle,
          })),
        })
        return
      }
      if (!window.confirm('Confirmar conclusão desta atividade?')) return
      await executeCompleteStep(stepId, emptyJustificationValue())
    },
    [detail, executeCompleteStep, resolveStepName],
  )

  const handleConfirmReopenStep = useCallback(async () => {
    if (!detail?.id || !reopenDialog) return
    const stepId = reopenDialog.stepId
    const note = reopenNote.trim() ? reopenNote.trim().slice(0, 2000) : undefined
    setStepReopeningId(stepId)
    try {
      await reopenConveyorStep(detail.id, stepId, { note })
      const [dNext, evNext, wNext] = await Promise.all([
        getConveyorById(detail.id),
        getConveyorOperationalEvents(detail.id, { limit: operationalEventsLimit }),
        getConveyorNodeWorkload(detail.id).catch(() => null),
      ])
      setDetail(dNext)
      setOperationalEvents(evNext.data)
      if (wNext) setNodeWorkload(wNext)
      setReopenDialog(null)
      setReopenNote('')
      setRouteToast('Atividade reaberta.')
    } catch (e) {
      const n = reportClientError(e, {
        module: 'esteiras',
        action: 'step_reopen',
        route: location.pathname,
        entityId: detail.id,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
      } else {
        setLoadError(n.userMessage || 'Não foi possível reabrir a atividade.')
      }
    } finally {
      setStepReopeningId(null)
    }
  }, [
    detail,
    location.pathname,
    presentBlocking,
    operationalEventsLimit,
    reopenDialog,
    reopenNote,
  ])

  const handleConfirmAbortStep = useCallback(async () => {
    if (!detail?.id || !abortDialog) return
    if (abortReasonCode === 'OUTRO' && !abortReasonText.trim()) {
      setStepAbortError('Informe o texto do motivo quando selecionar Outro.')
      return
    }
    const stepId = abortDialog.stepId
    setStepAbortingId(stepId)
    setStepAbortError(null)
    try {
      const aborted = await abortConveyorStep(
        detail.id,
        stepId,
        {
          reasonCode: abortReasonCode,
          reasonText: abortReasonCode === 'OUTRO' ? abortReasonText.trim() : null,
        },
        { idempotencyKey: abortDialog.idempotencyKey },
      )
      setDetail(aborted.data)
      setAbortDialog(null)
      setAbortReasonCode('NAO_MAIS_NECESSARIA')
      setAbortReasonText('')
      setStepAbortError(null)
      setRouteToast('Atividade dispensada.')

      // Refresh auxiliar: falha aqui não desfaz a dispensa já concluída.
      try {
        const [evNext, wNext] = await Promise.all([
          getConveyorOperationalEvents(detail.id, { limit: operationalEventsLimit }),
          getConveyorNodeWorkload(detail.id).catch(() => null),
        ])
        setOperationalEvents(evNext.data)
        if (wNext) setNodeWorkload(wNext)
      } catch {
        /* soft-fail pós-sucesso */
      }
    } catch (e) {
      const n = reportClientError(e, {
        module: 'esteiras',
        action: 'step_abort',
        route: location.pathname,
        entityId: detail.id,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
      } else {
        setStepAbortError(n.userMessage || 'Não foi possível dispensar a atividade.')
      }
    } finally {
      setStepAbortingId(null)
    }
  }, [
    abortDialog,
    abortReasonCode,
    abortReasonText,
    detail,
    location.pathname,
    operationalEventsLimit,
    presentBlocking,
  ])

  const handleConfirmRestoreAbortedStep = useCallback(
    async (stepId: string) => {
      if (!detail?.id) return
      if (!window.confirm('Restaurar esta atividade dispensada? O planejamento cancelado não será reativado.')) {
        return
      }
      setStepRestoringId(stepId)
      try {
        await restoreAbortedConveyorStep(detail.id, stepId, {
          idempotencyKey: crypto.randomUUID(),
        })
        const [dNext, evNext, wNext] = await Promise.all([
          getConveyorById(detail.id),
          getConveyorOperationalEvents(detail.id, { limit: operationalEventsLimit }),
          getConveyorNodeWorkload(detail.id).catch(() => null),
        ])
        setDetail(dNext)
        setOperationalEvents(evNext.data)
        if (wNext) setNodeWorkload(wNext)
        setRouteToast('Dispensa restaurada.')
      } catch (e) {
        const n = reportClientError(e, {
          module: 'esteiras',
          action: 'step_restore_aborted',
          route: location.pathname,
          entityId: detail.id,
        })
        if (isBlockingSeverity(n.severity)) {
          presentBlocking(n)
        } else {
          setLoadError(n.userMessage || 'Não foi possível restaurar a atividade.')
        }
      } finally {
        setStepRestoringId(null)
      }
    },
    [detail, location.pathname, operationalEventsLimit, presentBlocking],
  )

  useEffect(() => {
    const st = location.state as
      | { sgpToast?: string; fromNovaEsteira?: boolean }
      | null
    const msg = st?.sgpToast?.trim()
    const fromCreate = Boolean(st?.fromNovaEsteira)
    if (!msg && !fromCreate) return
    const t = window.setTimeout(() => {
      if (msg) setRouteToast(msg)
      if (fromCreate) setShowCreatedBanner(true)
      navigate(`${location.pathname}${location.search}`, {
        replace: true,
        state: {},
      })
    }, 0)
    return () => window.clearTimeout(t)
  }, [location, navigate])

  const loadDetail = useCallback(async () => {
    if (!id?.trim()) {
      setLoading(false)
      setNotFound(true)
      return
    }
    setLoading(true)
    setLoadError(null)
    setNotFound(false)
    try {
      const d = await getConveyorById(id.trim())
      setDetail(d)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setNotFound(true)
      } else {
        const n = reportClientError(e, {
          module: 'esteiras',
          action: 'detalhe_load',
          route: location.pathname,
          entityId: id ?? undefined,
        })
        if (isBlockingSeverity(n.severity)) {
          presentBlocking(n)
        } else {
          setLoadError(n.userMessage)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  useEffect(() => {
    if (!detail?.id) {
      setNodeWorkload(null)
      setNodeWorkloadError(null)
      setNodeWorkloadLoading(false)
      return
    }
    let cancelled = false
    setNodeWorkloadLoading(true)
    setNodeWorkloadError(null)
    void getConveyorNodeWorkload(detail.id)
      .then((w) => {
        if (!cancelled) setNodeWorkload(w)
      })
      .catch((e) => {
        if (!cancelled) {
          setNodeWorkload(null)
          const n = reportClientError(e, {
            module: 'esteiras',
            action: 'detalhe_node_workload',
            route: location.pathname,
            entityId: detail.id,
          })
          if (isBlockingSeverity(n.severity)) {
            presentBlocking(n)
          } else {
            setNodeWorkloadError(n.userMessage)
          }
        }
      })
      .finally(() => {
        if (!cancelled) setNodeWorkloadLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [detail?.id])

  useEffect(() => {
    if (!detail) {
      setStepAnaliticoByStepId({})
      setStepAnaliticoLoading(false)
      return
    }
    let cancelled = false
    const steps = flattenConveyorStructureSteps(detail.structure)
    if (steps.length === 0) {
      setStepAnaliticoByStepId({})
      setStepAnaliticoLoading(false)
      return
    }
    setStepAnaliticoLoading(true)
    ;(async () => {
      const next: Record<string, StepAnaliticoDetalhe> = {}
      await Promise.all(
        steps.map(async (st) => {
          const [aRes, tRes] = await Promise.allSettled([
            getConveyorStepAssignees(detail.id, st.id),
            getConveyorStepTimeEntries(detail.id, st.id),
          ])
          const assignees = aRes.status === 'fulfilled' ? aRes.value : []
          const timeEntries = tRes.status === 'fulfilled' ? tRes.value : []
          const cargaParcial =
            aRes.status === 'rejected' || tRes.status === 'rejected'
          next[st.id] = buildStepAnaliticoDetalheFromApi({
            conveyorId: detail.id,
            stepNodeId: st.id,
            planejadoMin: st.plannedMinutes ?? 0,
            plannedQuantity: st.plannedQuantity ?? 1,
            assignees,
            timeEntries,
            cargaParcial,
          })
        }),
      )
      if (!cancelled) {
        setStepAnaliticoByStepId(next)
        setStepAnaliticoLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [detail])

  useEffect(() => {
    if (!detail?.id) {
      setOperationalEvents([])
      setOperationalEventsError(null)
      setOperationalEventsLoading(false)
      return
    }
    let cancelled = false
    setOperationalEventsLoading(true)
    setOperationalEventsError(null)
    void getConveyorOperationalEvents(detail.id, { limit: operationalEventsLimit })
      .then((r) => {
        if (!cancelled) setOperationalEvents(r.data)
      })
      .catch((e) => {
        if (!cancelled) {
          setOperationalEvents([])
          const n = reportClientError(e, {
            module: 'esteiras',
            action: 'detalhe_operational_events',
            route: location.pathname,
            entityId: detail.id,
          })
          if (isBlockingSeverity(n.severity)) {
            presentBlocking(n)
          } else {
            setOperationalEventsError(OPERATIONAL_EVENTS_LOAD_ERROR)
          }
        }
      })
      .finally(() => {
        if (!cancelled) setOperationalEventsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [detail?.id, operationalEventsLimit, location.pathname, presentBlocking])

  useEffect(() => {
    if (!detail || stepAnaliticoLoading) return
    if (!stepParam) {
      stepErrorMarkRef.current = ''
      return
    }

    if (!isUuidLike(stepParam)) {
      const errKey = `${detail.id}|${stepParam}|invalid`
      if (stepErrorMarkRef.current !== errKey) {
        stepErrorMarkRef.current = errKey
        setStepNotice('Identificador de atividade inválido.')
      }
      return
    }
    const flat = flattenConveyorStructureSteps(detail.structure)
    if (!flat.some((s) => s.id === stepParam)) {
      const errKey = `${detail.id}|${stepParam}|missing`
      if (stepErrorMarkRef.current !== errKey) {
        stepErrorMarkRef.current = errKey
        setStepNotice('Atividade não encontrada nesta estrutura.')
      }
      return
    }

    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(`sgp-step-${stepParam}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setStepHighlightId(stepParam)
      window.setTimeout(() => setStepHighlightId(null), 2800)
    })
    return () => cancelAnimationFrame(raf)
  }, [detail, stepAnaliticoLoading, stepParam])

  const conveyorTicketSources = useMemo(
    () => (detail ? collectConveyorActivityTicketSources(detail, nodeWorkload) : []),
    [detail, nodeWorkload],
  )

  const conveyorPrintableTicketCount = useMemo(
    () => filterConveyorActivityTicketSources(conveyorTicketSources, false).length,
    [conveyorTicketSources],
  )

  const handleConveyorTicketsPrint = useCallback(
    (options: { grouping: 'structure' | 'task' | 'responsible'; includeCompleted: boolean }) => {
      if (!detail) return
      const items = buildConveyorGroupedTicketPrintItems(detail, nodeWorkload, {
        grouping: options.grouping,
        includeCompleted: options.includeCompleted,
      })
      if (!items.some((item) => item.kind === 'ticket')) return
      requestConveyorTicketPrint(items)
      setConveyorTicketsPrintOpen(false)
    },
    [detail, nodeWorkload, requestConveyorTicketPrint],
  )

  const handlePatchStatus = async (target: ConveyorOperationalStatus) => {
    if (!id?.trim()) return
    setPatchStatusLoading(true)
    setPatchError(null)
    try {
      const d = await patchConveyorStatus(id.trim(), {
        operationalStatus: target,
      })
      setDetail(d)
      setOperationalEventsLoading(true)
      setOperationalEventsError(null)
      try {
        const ev = await getConveyorOperationalEvents(id.trim(), {
          limit: operationalEventsLimit,
        })
        setOperationalEvents(ev.data)
      } catch (evErr) {
        setOperationalEvents([])
        const n = reportClientError(evErr, {
          module: 'esteiras',
          action: 'detalhe_operational_events_after_status',
          route: location.pathname,
          entityId: id.trim(),
        })
        if (isBlockingSeverity(n.severity)) {
          presentBlocking(n)
        } else {
          setOperationalEventsError(OPERATIONAL_EVENTS_LOAD_ERROR)
        }
      } finally {
        setOperationalEventsLoading(false)
      }
    } catch (e) {
      const n = reportClientError(e, {
        module: 'esteiras',
        action: 'detalhe_patch_status',
        route: location.pathname,
        entityId: id ?? undefined,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
      } else {
        setPatchError(n.userMessage)
      }
    } finally {
      setPatchStatusLoading(false)
    }
  }

  const notFoundPanel = (
    <PageCanvas>
      <div className="sgp-panel sgp-panel-hover max-w-lg rounded-2xl border border-white/[0.08] p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Detalhe da esteira
        </p>
        <p className="font-heading mt-2 text-lg text-slate-200">
          Esteira não encontrada
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Não existe esteira ativa com este identificador na base de dados.
          Verifique o link ou volte ao backlog.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to="/app/backlog" className="sgp-cta-primary inline-flex text-center">
            Voltar ao backlog
          </Link>
          <Link to="/app/minha-fila" className="sgp-cta-secondary inline-flex text-center">
            Minha fila
          </Link>
        </div>
      </div>
    </PageCanvas>
  )

  if (loading) {
    return (
      <PageCanvas>
        <p className="text-sm text-slate-500">Carregando esteira…</p>
      </PageCanvas>
    )
  }

  if (loadError) {
    return (
      <PageCanvas>
        <div
          className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-100/95"
          role="alert"
        >
          {loadError}
        </div>
        <div className="mt-6">
          <Link to="/app/backlog" className="sgp-cta-secondary inline-flex text-center">
            Voltar ao backlog
          </Link>
        </div>
      </PageCanvas>
    )
  }

  if (notFound || !detail) {
    return notFoundPanel
  }

  const refLine =
    detail.code?.trim() && detail.code.length > 0
      ? detail.code
      : detail.name.trim() || detail.id
  const prazoDisplay = parseWizardPrazoForDisplay(detail.estimatedDeadline)
  const observacoesUsuario = displayUsuarioObservacoes(detail.initialNotes)

  return (
    <PageCanvas>
      {routeToast ? (
        <SgpToast
          fixed
          variant="success"
          message={routeToast}
          onDismiss={() => setRouteToast(null)}
          className="!bottom-auto top-6 max-w-md"
        />
      ) : null}
      {reopenDialog ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal
          aria-labelledby="reopen-step-title"
          onClick={() => {
            if (stepReopeningId) return
            setReopenDialog(null)
            setReopenNote('')
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-gradient-to-b from-sgp-app-panel/95 to-sgp-app-panel-deep/98 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.05]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="reopen-step-title"
              className="font-heading text-lg font-bold tracking-tight text-slate-50"
            >
              Reabrir atividade?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              A atividade voltará a ter pendência calculada normalmente. Os apontamentos e o histórico de
              conclusão serão mantidos.
            </p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Observação da reabertura{' '}
              <span className="font-normal normal-case text-slate-600">(opcional)</span>
              <textarea
                value={reopenNote}
                onChange={(e) => setReopenNote(e.target.value)}
                maxLength={2000}
                rows={3}
                disabled={Boolean(stepReopeningId)}
                className="mt-2 w-full resize-y rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sgp-gold/35 focus:outline-none focus:ring-1 focus:ring-sgp-gold/25 disabled:opacity-50"
                placeholder="Contexto para a equipa…"
              />
            </label>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                disabled={Boolean(stepReopeningId)}
                onClick={() => {
                  setReopenDialog(null)
                  setReopenNote('')
                }}
                className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-sgp-gold/30 hover:bg-white/[0.07] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={Boolean(stepReopeningId)}
                onClick={() => void handleConfirmReopenStep()}
                className="rounded-xl border border-sgp-gold/35 bg-sgp-gold/10 px-4 py-2.5 text-sm font-bold text-sgp-gold-warm shadow-inner transition hover:border-sgp-gold/50 hover:bg-sgp-gold/[0.14] disabled:opacity-50"
              >
                {stepReopeningId ? 'Reabrindo atividade…' : 'Reabrir atividade'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <AbortConveyorStepDialog
        open={Boolean(abortDialog)}
        stepName={abortDialog?.stepName ?? ''}
        reasonCode={abortReasonCode}
        reasonText={abortReasonText}
        busy={Boolean(stepAbortingId)}
        error={stepAbortError}
        onChangeReasonCode={(code) => {
          setStepAbortError(null)
          setAbortReasonCode(code)
        }}
        onChangeReasonText={(text) => {
          setStepAbortError(null)
          setAbortReasonText(text)
        }}
        onCancel={() => {
          if (stepAbortingId) return
          setAbortDialog(null)
          setAbortReasonText('')
          setStepAbortError(null)
        }}
        onConfirm={() => void handleConfirmAbortStep()}
      />
      {completeOosDialog ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal
          aria-labelledby="complete-oos-title"
          onClick={() => {
            if (stepCompletingId) return
            setCompleteOosDialog(null)
            setCompleteOosJustification(emptyJustificationValue())
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-gradient-to-b from-sgp-app-panel/95 to-sgp-app-panel-deep/98 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.05]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="complete-oos-title"
              className="font-heading text-lg font-bold tracking-tight text-slate-50"
            >
              Concluir atividade
            </h2>
            <div className="mt-3 rounded-xl border border-sky-500/25 bg-sky-500/[0.07] px-3 py-2.5 text-sm text-sky-50/95">
              <p className="font-semibold text-sky-100">
                Esta atividade está fora da sequência recomendada.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-sky-100/90">
                {completeOosDialog.previousOpenCount > 0 ? (
                  <>
                    Existem atividades anteriores ainda pendentes nesta esteira — antes dela ainda existem{' '}
                    <span className="font-semibold">{completeOosDialog.previousOpenCount}</span>{' '}
                    {completeOosDialog.previousOpenCount === 1
                      ? 'atividade pendente'
                      : 'atividades pendentes'}
                    .
                  </>
                ) : (
                  <>
                    Informe uma justificativa para executar esta atividade fora da sequência recomendada.
                  </>
                )}
              </p>
              {completeOosDialog.samples.length > 0 ? (
                <ul className="mt-2 list-inside list-disc text-[11px] text-sky-100/85">
                  {completeOosDialog.samples.map((p, i) => (
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
            <p className="mt-3 text-xs text-slate-500">
              Atividade: <span className="text-slate-300">{completeOosDialog.stepName}</span>
            </p>
            <div className="mt-4">
              <JustificationSelect
                channel="app"
                idPrefix={`esteira-complete-oos-${completeOosDialog.stepId}`}
                value={completeOosJustification.justificationId ?? ''}
                complement={completeOosJustification.justificationComplement}
                legacyText={completeOosJustification.legacyText}
                preferredCategory={resolvePreferredJustificationCategory({
                  hasPreviousPendingStep: completeOosDialog.previousOpenCount > 0,
                  isOutOfSequence: true,
                })}
                preferredLabelHint={
                  completeOosDialog.previousOpenCount > 0 ? 'outro colaborador' : null
                }
                disabled={Boolean(stepCompletingId)}
                onChange={(next) =>
                  setCompleteOosJustification({
                    justificationId: next.justificationId,
                    justificationComplement: next.justificationComplement,
                    legacyText: next.legacyText,
                  })
                }
              />
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                disabled={Boolean(stepCompletingId)}
                onClick={() => {
                  setCompleteOosDialog(null)
                  setCompleteOosJustification(emptyJustificationValue())
                }}
                className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-sgp-gold/30 hover:bg-white/[0.07] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  Boolean(stepCompletingId) ||
                  !completeOosJustification.legacyText.trim().length
                }
                onClick={() =>
                  void executeCompleteStep(
                    completeOosDialog.stepId,
                    completeOosJustification,
                  )
                }
                className="rounded-xl border border-sgp-gold/35 bg-sgp-gold/10 px-4 py-2.5 text-sm font-bold text-sgp-gold-warm shadow-inner transition hover:border-sgp-gold/50 hover:bg-sgp-gold/[0.14] disabled:opacity-50"
              >
                {stepCompletingId === completeOosDialog.stepId
                  ? 'A concluir…'
                  : 'Confirmar conclusão'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {stepNotice ? (
        <SgpToast
          fixed
          variant="neutral"
          message={stepNotice}
          onDismiss={() => setStepNotice(null)}
        />
      ) : null}
      {showCreatedBanner ? (
        <div
          role="status"
          className="mb-6 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-4 py-3 text-sm text-emerald-100/95"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">Esteira criada com sucesso.</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-emerald-100/85">
                Próximos passos:
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold">
                <Link to="/app/backlog" className="text-emerald-200/95 hover:underline">
                  Ver backlog
                </Link>
                <Link
                  to="/app/minha-fila"
                  className="text-emerald-200/95 hover:underline"
                >
                  Ir a Minha fila
                </Link>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 text-xs font-semibold text-slate-400 transition hover:text-slate-200"
              onClick={() => setShowCreatedBanner(false)}
            >
              Fechar
            </button>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Link
          to="/app/backlog"
          className="group inline-flex items-center gap-2 text-sm font-semibold text-sgp-blue-bright transition hover:text-sky-300"
        >
          <span className="transition-transform group-hover:-translate-x-0.5">
            ←
          </span>
          Backlog operacional
        </Link>
      </div>

      <header className="relative mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-sgp-navy/95 via-sgp-app-panel-deep/98 to-sgp-app-panel/95 p-6 shadow-[var(--sgp-shadow-card-dark)] ring-1 ring-white/[0.06] md:p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
          Detalhe da esteira
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <h1 className="sgp-page-title">
            {detail.name}
          </h1>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-white/[0.12] bg-white/[0.05] px-3 py-2 text-xs font-bold text-slate-100 ring-1 ring-white/[0.06] transition hover:bg-white/[0.08] disabled:opacity-50"
              title="Imprimir tickets térmicos das atividades desta esteira"
              disabled={conveyorTicketSources.length === 0}
              onClick={() => setConveyorTicketsPrintOpen(true)}
            >
              Imprimir tickets
            </button>
            {canAlterConveyor ? (
              <Link
                to={`/app/esteiras/${encodeURIComponent(detail.id)}/alterar`}
                className="rounded-lg border border-amber-400/35 bg-amber-500/12 px-3 py-2 text-xs font-bold text-amber-100 ring-1 ring-amber-500/20 transition hover:bg-amber-500/20"
              >
                Alterar esta esteira
              </Link>
            ) : null}
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {refLine} · {originRegisterLabel(detail.originRegister)}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusBadge status={mapOperationalStatusToUi(detail.operationalStatus)} />
        </div>
        {patchError ? (
          <div
            className="relative mt-4 rounded-xl border border-rose-500/30 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-100/95"
            role="alert"
          >
            {patchError}
          </div>
        ) : null}
        {canChangePipelineStatus ? (
          <div className="relative mt-4 flex flex-wrap gap-2">
            {STATUS_TRANSITION_ACTIONS[detail.operationalStatus].map((a) => (
              <button
                key={a.target}
                type="button"
                disabled={patchStatusLoading}
                onClick={() => void handlePatchStatus(a.target)}
                className="rounded-lg border border-sgp-gold/40 bg-sgp-gold/12 px-3 py-2 text-xs font-bold text-sgp-gold-warm shadow-sm transition hover:bg-sgp-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {a.label}
              </button>
            ))}
            <ConveyorLifecycleReturnPanel
              conveyorId={detail.id}
              operationalStatus={detail.operationalStatus}
              operationalEventsLimit={operationalEventsLimit}
              routePath={location.pathname}
              onDetailUpdated={setDetail}
              onOperationalEventsUpdated={setOperationalEvents}
              onOperationalEventsLoading={setOperationalEventsLoading}
              onSuccessToast={setRouteToast}
              presentBlocking={presentBlocking}
            />
          </div>
        ) : (
          <p className="relative mt-4 text-xs text-slate-500">
            Transições de pipeline exigem a permissão{' '}
            <span className="font-mono text-slate-400">conveyors.edit_status</span>.
          </p>
        )}
      </header>

      <section className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Resumo operacional
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Tarefas
            </dt>
            <dd className="mt-1 font-heading text-2xl tabular-nums text-slate-100">
              {detail.totalOptions}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Setores
            </dt>
            <dd className="mt-1 font-heading text-2xl tabular-nums text-slate-100">
              {detail.totalAreas}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Atividades
            </dt>
            <dd className="mt-1 font-heading text-2xl tabular-nums text-slate-100">
              {detail.totalSteps}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Tempo estimado total
            </dt>
            <dd className="mt-1 font-heading text-2xl tabular-nums text-sgp-gold">
              {formatMinutosHumanos(detail.totalPlannedMinutes)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Dados básicos
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Cliente
            </dt>
            <dd className="mt-1 text-sm text-slate-200">
              {detail.clientName?.trim() || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Responsável
            </dt>
            <dd className="mt-1 text-sm text-slate-200">
              {detail.responsible?.trim() || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Veículo
            </dt>
            <dd className="mt-1 text-sm text-slate-200">
              {detail.vehicle?.trim() || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Modelo / versão
            </dt>
            <dd className="mt-1 text-sm text-slate-200">
              {detail.modelVersion?.trim() || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Placa
            </dt>
            <dd className="mt-1 text-sm text-slate-200">
              {detail.plate?.trim() || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Prioridade
            </dt>
            <dd className="mt-1 text-sm text-slate-200">
              {detail.priority === 'alta'
                ? 'Alta'
                : detail.priority === 'media'
                  ? 'Média'
                  : 'Baixa'}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Início previsto
            </dt>
            <dd className="mt-1 text-sm text-slate-200">
              {prazoDisplay.inicioPrevisto || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Fim previsto
            </dt>
            <dd className="mt-1 text-sm text-slate-200">
              {prazoDisplay.fimPrevisto || '—'}
            </dd>
          </div>
          {prazoDisplay.prazoLegado ? (
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Prazo estimado
              </dt>
              <dd className="mt-1 text-sm text-slate-200">
                {prazoDisplay.prazoLegado}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Tempo total previsto (min)
            </dt>
            <dd className="mt-1 text-sm tabular-nums text-slate-200">
              {formatMinutosHumanos(detail.totalPlannedMinutes)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Atividades (total)
            </dt>
            <dd className="mt-1 text-sm tabular-nums text-slate-200">
              {detail.totalSteps}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Criada em
            </dt>
            <dd className="mt-1 text-sm text-slate-200">
              {new Date(detail.createdAt).toLocaleString('pt-BR')}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Concluída em
            </dt>
            <dd className="mt-1 text-sm text-slate-200">
              {detail.completedAt
                ? new Date(detail.completedAt).toLocaleString('pt-BR')
                : '—'}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Observações
            </dt>
            <dd className="mt-1 text-sm leading-relaxed text-slate-200">
              {observacoesUsuario || '—'}
            </dd>
          </div>
        </dl>
      </section>

      <ConveyorNodeWorkloadPanel
        conveyorId={detail.id}
        data={nodeWorkload}
        loading={nodeWorkloadLoading}
        error={nodeWorkloadError}
      />

      <ConveyorHealthAnalysisCard conveyorId={detail.id} />

      <ConveyorOperationalPlanCard
        conveyorId={detail.id}
        operationalStatus={detail.operationalStatus}
        structure={detail.structure}
        canEdit={canAlterConveyor}
      />

      <ConveyorOperationalEventsTimeline
        events={operationalEvents}
        loading={operationalEventsLoading}
        error={operationalEventsError}
        structure={detail.structure}
        fetchLimit={operationalEventsLimit}
        onLoadMore={handleLoadMoreOperationalEvents}
      />

      <section className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Estrutura operacional
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Tarefas, setores e atividades persistidas na base (ordenadas como na criação).
        </p>
        <div className="mt-6 space-y-6">
          {detail.structure.options.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum nó de estrutura registado.</p>
          ) : (
            detail.structure.options.map((opt) => (
              <div
                key={opt.id}
                className="rounded-xl border border-white/[0.08] bg-sgp-app-panel-deep/40 p-4"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-sgp-gold">
                  Tarefa {opt.orderIndex}
                </p>
                <h3 className="mt-1 font-heading text-lg font-semibold text-slate-100">
                  {opt.name}
                </h3>
                <div className="mt-4 space-y-4 border-l border-white/[0.08] pl-4">
                  {opt.areas.map((area) => (
                    <div key={area.id}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Setor {area.orderIndex}
                      </p>
                      <p className="font-medium text-slate-200">{area.name}</p>
                      <ul className="mt-2 space-y-2">
                        {area.steps.map((st) => (
                          <li
                            key={st.id}
                            id={`sgp-step-${st.id}`}
                            className={[
                              'space-y-2 scroll-mt-24 transition-shadow duration-300',
                              stepHighlightId === st.id
                                ? 'rounded-xl ring-2 ring-sgp-gold/50 ring-offset-2 ring-offset-[rgb(15,23,42)]'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm">
                              <span className="text-slate-200">
                                <span className="tabular-nums text-slate-500">
                                  {st.orderIndex}.
                                </span>{' '}
                                {st.name}
                              </span>
                              <span className="flex flex-wrap items-center gap-2">
                                {isStepOperationallyCompleted(st) ? (
                                  <span className="rounded-md border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-100">
                                    Atividade concluída
                                  </span>
                                ) : null}
                                {isStepAborted(st) ? (
                                  <span
                                    className="rounded-md border border-slate-400/35 bg-slate-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-100"
                                    title={[
                                      stepAbortReasonLabel(st.abortReasonCode),
                                      st.abortReasonText,
                                      st.abortedByName,
                                      st.abortedAt
                                        ? new Date(st.abortedAt).toLocaleString('pt-BR')
                                        : null,
                                    ]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  >
                                    {stepOperationalStatusLabel('ABORTED')}
                                  </span>
                                ) : null}
                                <span className="text-xs tabular-nums text-slate-400">
                                  {st.plannedMinutes != null
                                    ? formatMinutosHumanos(st.plannedMinutes)
                                    : '—'}
                                </span>
                              </span>
                            </div>
                            {canReopenStep(st, canAlterConveyor) ||
                            canCompleteStep(st, canAlterConveyor) ||
                            canAbortStep(st, canAlterConveyor) ||
                            canRestoreAbortedStep(st, canAlterConveyor) ? (
                              <div className="flex flex-wrap justify-end gap-2">
                                {canReopenStep(st, canAlterConveyor) ? (
                                  <button
                                    type="button"
                                    disabled={
                                      stepReopeningId === st.id ||
                                      stepCompletingId === st.id ||
                                      stepAbortingId === st.id ||
                                      stepRestoringId === st.id
                                    }
                                    className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/15 disabled:opacity-50"
                                    onClick={() => {
                                      setReopenNote('')
                                      setReopenDialog({ stepId: st.id, stepName: st.name })
                                    }}
                                  >
                                    Reabrir atividade
                                  </button>
                                ) : null}
                                {canCompleteStep(st, canAlterConveyor) ? (
                                  <button
                                    type="button"
                                    disabled={
                                      stepCompletingId === st.id ||
                                      stepReopeningId === st.id ||
                                      stepAbortingId === st.id ||
                                      stepRestoringId === st.id
                                    }
                                    className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-white/[0.09] disabled:opacity-50"
                                    onClick={() => void handleCompleteStepClick(st.id)}
                                  >
                                    {stepCompletingId === st.id ? 'A concluir…' : 'Concluir atividade'}
                                  </button>
                                ) : null}
                                {canAbortStep(st, canAlterConveyor) ? (
                                  <button
                                    type="button"
                                    disabled={
                                      stepAbortingId === st.id ||
                                      stepCompletingId === st.id ||
                                      stepReopeningId === st.id ||
                                      stepRestoringId === st.id
                                    }
                                    className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-500/15 disabled:opacity-50"
                                    onClick={() => {
                                      setStepAbortError(null)
                                      setAbortReasonCode('NAO_MAIS_NECESSARIA')
                                      setAbortReasonText('')
                                      setAbortDialog({
                                        stepId: st.id,
                                        stepName: st.name,
                                        idempotencyKey: crypto.randomUUID(),
                                      })
                                    }}
                                  >
                                    Dispensar
                                  </button>
                                ) : null}
                                {canRestoreAbortedStep(st, canAlterConveyor) ? (
                                  <button
                                    type="button"
                                    disabled={
                                      stepRestoringId === st.id ||
                                      stepAbortingId === st.id ||
                                      stepCompletingId === st.id ||
                                      stepReopeningId === st.id
                                    }
                                    className="rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-100 hover:bg-sky-500/15 disabled:opacity-50"
                                    onClick={() => void handleConfirmRestoreAbortedStep(st.id)}
                                  >
                                    {stepRestoringId === st.id ? 'Restaurando…' : 'Restaurar'}
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                            <StepAnaliticoPanel
                              loading={stepAnaliticoLoading}
                              stepAnalitico={stepAnaliticoByStepId[st.id]}
                              matrixActivityNodeId={undefined}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <ConveyorActivityTicketsPrintDialog
        open={conveyorTicketsPrintOpen}
        totalCount={conveyorTicketSources.length}
        printableCount={conveyorPrintableTicketCount}
        agentStatus={conveyorAgentStatus}
        agentFallbackNotice={conveyorAgentFallbackNotice}
        testPrintLoading={conveyorTestPrintLoading}
        onClose={() => setConveyorTicketsPrintOpen(false)}
        onPrint={handleConveyorTicketsPrint}
        onDismissAgentNotice={clearConveyorAgentFallbackNotice}
        onTestThermalPrinter={() => {
          void testConveyorThermalPrinter()
        }}
      />

      {conveyorPrintSheet ? (
        <ThermalActivityTicketsPrintArea sheet={conveyorPrintSheet} />
      ) : null}
      <ThermalTicketPrintProgressOverlay
        open={
          conveyorPrintProgress !== null && isBatchThermalTicketPrint(conveyorPrintProgress)
        }
        current={conveyorPrintProgress?.current ?? 0}
        total={conveyorPrintProgress?.total ?? 0}
        onCancel={cancelConveyorTicketPrint}
      />
    </PageCanvas>
  )
}

export function EsteiraDetalheMockPage({ id }: { id: string | undefined }) {
  const operacaoV = useSyncExternalStore(
    subscribeOperacaoApontamentos,
    getOperacaoApontamentosVersion,
    getOperacaoApontamentosVersion,
  )
  const operacional = useMemo(
    () => (id ? getEsteiraOperacionalDetalheMock(id) : undefined),
    [id, operacaoV],
  )

  const resumo = operacional?.resumoOperacional ?? null

  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [historico, setHistorico] = useState<HistoricoDrawerContext | null>(
    null,
  )
  const [gestorToast, setGestorToast] = useState<string | null>(null)

  useEffect(() => {
    if (!gestorToast) return
    const t = window.setTimeout(() => setGestorToast(null), 4200)
    return () => window.clearTimeout(t)
  }, [gestorToast])

  useEffect(() => {
    if (!operacional) return
    const o: Record<string, boolean> = {}
    operacional.blocos.forEach((t) => {
      o[t.id] = true
    })
    const tid = window.setTimeout(() => setOpen(o), 0)
    return () => window.clearTimeout(tid)
  }, [operacional])

  if (!operacional || !resumo) {
    return (
      <PageCanvas>
        <div className="sgp-panel sgp-panel-hover max-w-lg rounded-2xl border border-white/[0.08] p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Detalhe da esteira
          </p>
          <p className="font-heading mt-2 text-lg text-slate-200">
            Esteira não encontrada
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            O identificador na URL não corresponde a uma esteira na projeção
            operacional (oficial ou materializada nesta sessão). Volte ao backlog
            ou abra uma esteira a partir da lista.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to="/app/backlog" className="sgp-cta-primary inline-flex text-center">
              Voltar ao backlog
            </Link>
            <Link to="/app/minha-fila" className="sgp-cta-secondary inline-flex text-center">
              Minha fila
            </Link>
          </div>
        </div>
      </PageCanvas>
    )
  }

  const toggle = (tid: string) =>
    setOpen((s) => ({ ...s, [tid]: !s[tid] }))

  const apontamentoSearch = `?from=esteira&esteiraId=${encodeURIComponent(operacional.esteiraId)}`

  return (
    <PageCanvas>
      {gestorToast && (
        <SgpToast
          fixed
          message={gestorToast}
          variant="success"
          onDismiss={() => setGestorToast(null)}
        />
      )}

      {historico && (
        <ActivityHistoricoDrawer
          open
          onClose={() => setHistorico(null)}
          context={historico}
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <Link
          to="/app/backlog"
          className="group inline-flex items-center gap-2 text-sm font-semibold text-sgp-blue-bright transition hover:text-sky-300"
        >
          <span className="transition-transform group-hover:-translate-x-0.5">
            ←
          </span>
          Backlog operacional
        </Link>
      </div>

      {/* 1 — Cabeçalho executivo */}
      <header className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-sgp-navy/95 via-sgp-app-panel-deep/98 to-sgp-app-panel/95 p-6 shadow-[var(--sgp-shadow-card-dark)] ring-1 ring-white/[0.06] md:p-8">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-sgp-gold/10 blur-3xl"
          aria-hidden
        />
        <p className="relative text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
          Detalhe da esteira
        </p>
        <div className="relative mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="sgp-page-title leading-tight">
              {operacional.nome}
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-400">
              Responsável principal:{' '}
              <span className="text-slate-200">
                {operacional.responsavelPrincipal}
              </span>
            </p>
            <p className="mt-1 text-sm font-medium text-slate-400">
              Veículo:{' '}
              <span className="text-slate-200">{operacional.veiculo}</span>
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {operacional.origemLabel} · {operacional.codigoOs}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-lg border border-emerald-400/35 bg-emerald-500/12 px-3 py-1.5 text-xs font-bold text-emerald-100 ring-1 ring-emerald-500/15">
              {statusEsteiraLabel(operacional.statusGeral)}
            </span>
            <span
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ring-1 ${
                operacional.prioridade === 'alta'
                  ? 'border-rose-400/45 bg-rose-500/16 text-rose-50 ring-rose-500/18'
                  : operacional.prioridade === 'media'
                    ? 'border-amber-400/45 bg-amber-500/16 text-amber-50 ring-amber-500/18'
                    : 'border-white/14 bg-white/[0.07] text-slate-300 ring-white/[0.06]'
              }`}
            >
              Prioridade{' '}
              {operacional.prioridade === 'alta'
                ? 'alta'
                : operacional.prioridade === 'media'
                  ? 'média'
                  : 'baixa'}
            </span>
          </div>
        </div>
        <p className="relative mt-4 text-xs font-medium text-sgp-blue-bright">
          {operacional.prazoTexto}
          {operacional.enteredAt && (
            <span className="ml-2 text-slate-500">
              · Entrada {new Date(operacional.enteredAt).toLocaleString('pt-BR')}
            </span>
          )}
        </p>

        <div className="relative mt-8 grid gap-6 border-t border-white/[0.07] pt-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Progresso geral
            </p>
            <p className="mt-1 font-heading text-3xl font-bold tabular-nums text-white">
              {resumo.progressoPct}%
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sgp-blue-bright to-sgp-gold transition-[width] duration-500"
                style={{ width: `${Math.min(100, resumo.progressoPct)}%` }}
              />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Estimado total
            </p>
            <p className="mt-1 font-heading text-3xl font-bold tabular-nums text-sgp-gold">
              {formatMinutosHumanos(resumo.estimativaTotalMin)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Realizado total
            </p>
            <p className="mt-1 font-heading text-3xl font-bold tabular-nums text-emerald-300/95">
              {formatMinutosHumanos(resumo.realizadoTotalMin)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Macroblocos
            </p>
            <p className="mt-1 font-heading text-3xl font-bold tabular-nums text-white">
              {resumo.totalTarefas}{' '}
              <span className="text-lg font-semibold text-slate-500">tarefas</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {resumo.totalAtividades} atividades no total
            </p>
          </div>
        </div>

        {operacional.observacaoCurta && (
          <p className="relative mt-6 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-slate-400">
            <span className="font-semibold text-slate-500">Nota: </span>
            {operacional.observacaoCurta}
          </p>
        )}
      </header>

      {/* 2 — Resumo operacional */}
      <section aria-label="Resumo operacional">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/38">
          Leitura rápida
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9">
          {[
            { label: 'Tarefas', value: String(resumo.totalTarefas) },
            { label: 'Atividades', value: String(resumo.totalAtividades) },
            { label: 'Concluídas', value: String(resumo.concluidas) },
            { label: 'Em execução', value: String(resumo.emExecucao) },
            { label: 'Pausadas', value: String(resumo.pausadas) },
            { label: 'Pendentes', value: String(resumo.pendentes) },
            { label: 'Prontas', value: String(resumo.prontas) },
            { label: 'Bloqueadas', value: String(resumo.bloqueadas) },
            { label: 'Apontáveis', value: String(resumo.apontaveis) },
          ].map((k) => (
            <div
              key={k.label}
              className="sgp-kpi-card sgp-kpi-card--compact rounded-2xl"
            >
              <p className="sgp-kpi-label">{k.label}</p>
              <p className="sgp-kpi-value mt-1 text-slate-50">{k.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3 — Corpo por tarefas */}
      <section aria-label="Tarefas e atividades">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
              Execução
            </p>
            <h2 className="sgp-page-title mt-1 text-xl md:text-2xl">
              Macroblocos e atividades
            </h2>
            <p className="sgp-page-lead mt-1 max-w-2xl text-sm">
              Cada linha é a mesma atividade que o colaborador executa e aponta.
              Borda verde indica apontável agora; o botão Apontar abre o mesmo
              contexto da tela de apontamento.
            </p>
          </div>
        </div>

        <ul className="space-y-3">
          {operacional.blocos.length === 0 && (
            <li className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] px-6 py-14 text-center">
              <p className="font-heading text-base font-semibold text-slate-300">
                Esta esteira ainda não tem macroblocos no mock.
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Quando houver tarefas, a execução e o apontamento aparecem aqui.
              </p>
            </li>
          )}
          {operacional.blocos.map((b) => {
            const tr = computeTarefaResumo({
              id: b.id,
              nome: b.nome,
              ordem: b.ordem,
              status: b.statusAgregado,
              atividades: b.atividades,
            })
            const expanded = open[b.id] !== false
            return (
              <li
                key={b.id}
                className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-sgp-app-panel/95 to-sgp-app-panel-deep/90 shadow-[var(--sgp-shadow-card-dark)] transition hover:border-white/[0.11]"
              >
                <button
                  type="button"
                  onClick={() => toggle(b.id)}
                  aria-expanded={expanded}
                  aria-label={expanded ? 'Recolher tarefa' : 'Expandir tarefa'}
                  className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-white/[0.02] md:px-5 md:py-4"
                >
                  <span
                    className={`mt-0.5 shrink-0 text-sgp-gold transition-transform duration-200 ${
                      expanded ? 'rotate-90' : ''
                    }`}
                    aria-hidden
                  >
                    ›
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Tarefa {b.ordem}
                      </span>
                      <span className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-bold text-slate-400">
                        {statusTarefaLabel(b.statusAgregado)}
                      </span>
                    </div>
                    <p className="mt-1 font-heading text-lg font-bold text-slate-50">
                      {b.nome}
                    </p>
                    {b.opcaoNome && b.areaNome && (
                      <p className="mt-2 text-[11px] leading-snug text-slate-500">
                        <span className="font-semibold text-slate-400">
                          Tarefa (matriz)
                        </span>{' '}
                        · {b.opcaoNome}
                        <span className="mx-1.5 text-slate-600">|</span>
                        <span className="font-semibold text-slate-400">
                          Setor
                        </span>{' '}
                        · {b.areaNome}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
                      <span>
                        Atividades:{' '}
                        <span className="tabular-nums text-slate-300">
                          {tr.done}/{tr.total} concluídas
                        </span>
                      </span>
                      <span>
                        Estimado:{' '}
                        <span className="text-slate-300">
                          {formatMinutosHumanos(tr.estimativa)}
                        </span>
                      </span>
                      <span>
                        Realizado:{' '}
                        <span className="text-slate-300">
                          {formatMinutosHumanos(tr.realizado)}
                        </span>
                      </span>
                      <span className="tabular-nums text-sgp-gold">
                        {tr.pct}% do bloco
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sgp-blue-bright/90 to-sgp-gold/90"
                        style={{ width: `${Math.min(100, tr.pct)}%` }}
                      />
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-white/[0.06] bg-black/20 px-3 py-3 md:px-5 md:py-4">
                    <div className="hidden gap-3 border-b border-white/[0.05] pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 md:grid md:grid-cols-[1fr_minmax(5rem,auto)_minmax(6rem,auto)_minmax(7rem,auto)_minmax(5rem,auto)_auto]">
                      <span>Atividade</span>
                      <span>Responsável</span>
                      <span>Contexto</span>
                      <span>Status</span>
                      <span className="text-right">Estim. / Real.</span>
                      <span className="text-right">Ações</span>
                    </div>
                    <ul className="divide-y divide-white/[0.05]">
                      {b.atividades.length === 0 && (
                        <li className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-500">
                          Nenhuma atividade neste macrobloco no mock.
                        </li>
                      )}
                      {b.atividades.map((a) => {
                        const podeApontar = a.apontabilidade.apontavel
                        const sa = a.stepAnalitico
                        return (
                        <li
                          key={a.id}
                          className={atividadeRowClass(a)}
                        >
                          <div className={`${ATIVIDADE_GRID_MAIN}`}>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium leading-snug text-slate-100">
                                {a.nome}
                              </p>
                              {prioridadeAtividadeBadge(a.prioridade)}
                            </div>
                            {a.observacaoGestor && (
                              <p
                                className="mt-1 line-clamp-2 text-[10px] leading-snug text-violet-300/85"
                                title={a.observacaoGestor}
                              >
                                <span className="font-semibold text-violet-400/90">
                                  Gestor ·{' '}
                                </span>
                                {previewObservacaoGestor(a.observacaoGestor)}
                              </p>
                            )}
                            {a.status === 'bloqueada' && a.bloqueioMotivo && (
                              <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-amber-200/80">
                                {a.bloqueioMotivo.startsWith('Bloqueio ·')
                                  ? a.bloqueioMotivo
                                  : `Bloqueio · ${a.bloqueioMotivo}`}
                              </p>
                            )}
                            {podeApontar && (
                              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400/90">
                                {a.status === 'pausada'
                                  ? 'Em pausa · apontamento disponível'
                                  : a.status === 'pronta'
                                    ? 'Pronta para execução'
                                    : 'Apontamento disponível'}
                              </p>
                            )}
                            {!podeApontar && a.apontabilidade.motivoNaoApontavel && (
                              <p
                                className="mt-1 line-clamp-2 text-[10px] text-slate-500"
                                title={a.apontabilidade.motivoNaoApontavel}
                              >
                                {a.apontabilidade.motivoNaoApontavel}
                              </p>
                            )}
                            {(() => {
                              if (sa) return null
                              const agg = obterHistoricoAgregadoAtividade(
                                operacional.esteiraId,
                                a.id,
                              )
                              if (agg.quantidade === 0) return null
                              return (
                                <p className="mt-1 text-[10px] text-slate-500">
                                  Apontamentos: {agg.quantidade} · total{' '}
                                  {formatMinutosHumanos(agg.totalMinutos)}
                                </p>
                              )
                            })()}
                          </div>
                          <span className="text-sm font-semibold text-slate-300">
                            {a.colaboradorNome}
                            {a.colaboradorCodigo ? (
                              <span className="ml-1.5 text-xs font-medium text-slate-500">
                                {a.colaboradorCodigo}
                              </span>
                            ) : null}
                            {a.colaboradorRegistroInativo ? (
                              <span className="ml-2 inline-block rounded-md border border-white/14 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Inativo no cadastro
                              </span>
                            ) : null}
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            {a.setorNome}
                          </span>
                          <div className="flex flex-col gap-1">
                            {statusAtividadeBadge(a.status)}
                          </div>
                          <div className="text-right text-xs tabular-nums text-slate-400 md:text-sm">
                            <span className="text-slate-500">est. </span>
                            {formatMinutosHumanos(a.estimativaMin)}
                            <span className="text-slate-600"> · </span>
                            <span className="text-slate-300">
                              real {formatMinutosHumanos(a.realizadoMin)}
                            </span>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            {podeApontar ? (
                              <Link
                                to={{
                                  pathname: `/app/apontamento/${a.id}`,
                                  search: apontamentoSearch,
                                }}
                                className="sgp-cta-primary !px-3 !py-2 text-[11px] shadow-[0_0_20px_-8px_rgba(201,162,39,0.45)]"
                              >
                                Apontar
                              </Link>
                            ) : (
                              <span className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-bold text-slate-500">
                                {a.status === 'concluida'
                                  ? 'Concluída'
                                  : a.status === 'bloqueada'
                                    ? 'Bloqueada'
                                    : a.status === 'pausada'
                                      ? 'Pausada'
                                      : '—'}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setHistorico({
                                  activityId: a.id,
                                  activityNome: a.nome,
                                  tarefaNome: b.nome,
                                  esteiraNome: operacional.nome,
                                  responsavel: a.responsavel,
                                  setor: a.setorNome,
                                  statusAtual: a.status,
                                })
                              }
                              className="rounded-lg border border-white/12 bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-bold text-slate-400 transition hover:border-sgp-blue-bright/35 hover:text-slate-200"
                            >
                              Ver histórico
                            </button>
                            <GestorAtividadeMenu
                              atividade={a}
                              onToast={setGestorToast}
                            />
                          </div>
                          </div>

                          {sa ? (
                            <StepAnaliticoPanel
                              stepAnalitico={sa}
                              matrixActivityNodeId={a.matrixActivityNodeId}
                            />
                          ) : null}
                        </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </PageCanvas>
  )
}

export function EsteiraDetalhePage() {
  const { id } = useParams()
  return <EsteiraDetalheBasicoReal id={id} />
}
