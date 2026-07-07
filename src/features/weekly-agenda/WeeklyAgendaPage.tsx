import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TimeEntryCandidateItem } from '../../domain/my-activities/my-activities.types'
import { listPlanningSyncIssues } from '../../domain/operational-planning/planningSyncIssues'
import type { OperationalPlanningBacklogItem, OperationalPlanningWeekPayload } from '../../domain/operational-planning/operational-planning.types'
import { ApiError } from '../../lib/api/apiErrors'
import { reportClientError } from '../../lib/errors'
import { useAuth } from '../../lib/use-auth'
import {
  getConveyorStepSequenceCheck,
  patchConveyorStepCompletion,
} from '../../services/conveyors/conveyorsApiService'
import { listTimeEntryCandidates } from '../../services/my-activities/myActivitiesApiService'
import {
  publishOperationalPlanningWeek,
  saveOperationalPlanningWeek,
} from '../../services/operational-planning/operationalPlanningApiService'
import { buildActivityTicketPrintModel } from '../operational-tickets/activityTicketPrintModel'
import { buildActivityTicketInputFromPlanningSource } from '../operational-tickets/activityTicketPlanningSource'
import { PlanningWeekTicketsPrintDialog } from '../operational-tickets/PlanningWeekTicketsPrintDialog'
import { ThermalActivityTicketsPrintArea } from '../operational-tickets/ThermalActivityTicketsPrintArea'
import { ThermalTicketPrintProgressOverlay } from '../operational-tickets/ThermalTicketPrintProgressOverlay'
import { isBatchThermalTicketPrint } from '../operational-tickets/thermalTicketPrintQueue'
import { useActivityTicketPrint } from '../operational-tickets/useActivityTicketPrint'
import { usePlanningWeekTicketsPrint } from '../operational-tickets/usePlanningWeekTicketsPrint'
import { buildVisiblePlanningBacklogItems } from '../operational-planning/buildVisiblePlanningBacklogItems'
import { buildPlanningDaySummaries } from '../operational-planning/planningBoardHelpers'
import {
  canCompletePlanningStep,
  canPointTimeOnPlanningStep,
  mergePlanningExecutionFromServerItems,
  planningApontamentoCandidate,
} from '../operational-planning/planningCardActions'
import { buildPlanningBacklogExecutionLookup } from '../operational-planning/planningExecutionHelpers'
import {
  PUBLISH_SUCCESS_MESSAGE,
  resolvePlanningRevisionContext,
  resolvePlanningSaveErrorMessage,
  resolvePlanningSaveSuccessMessage,
  resolvePlanningSaveWeekDates,
  SAVE_REVISION_SUCCESS_MESSAGE,
  shouldAutoPersistPlanChanges,
} from '../operational-planning/operationalPlanningPlanStatusCopy'
import {
  isIsoDateInWeekdays,
  localTodayIsoDate,
  weekdayLabelsPt,
} from '../operational-planning/operationalPlanningWeekRange'
import { QuickTimeEntryDrawer } from '../shell/QuickTimeEntryDrawer'
import { PageCanvas } from '../../components/ui/PageCanvas'
import { WeeklyAgendaAttentionDrawer } from './components/WeeklyAgendaAttentionDrawer'
import { WeeklyAgendaBacklogCard } from './components/WeeklyAgendaBacklogCard'
import { WeeklyAgendaBatchQueueOverlay } from './components/WeeklyAgendaBatchQueueOverlay'
import { WeeklyAgendaBacklogDrawer } from './components/WeeklyAgendaBacklogDrawer'
import { WeeklyAgendaBacklogFab } from './components/WeeklyAgendaBacklogFab'
import { WeeklyAgendaBoard } from './components/WeeklyAgendaBoard'
import { WeeklyAgendaDayTabs } from './components/WeeklyAgendaDayTabs'
import { WeeklyAgendaHeader } from './components/WeeklyAgendaHeader'
import { WeeklyAgendaPlanCard } from './components/WeeklyAgendaPlanCard'
import { WeeklyAgendaPlacingBanner } from './components/WeeklyAgendaPlacingBanner'
import { WeeklyAgendaSummaryStrip } from './components/WeeklyAgendaSummaryStrip'
import { useWeeklyAgendaBacklog } from './hooks/useWeeklyAgendaBacklog'
import { useWeeklyAgendaWeek } from './hooks/useWeeklyAgendaWeek'
import { buildWeeklyAgendaBacklogEmptyMessage } from './weeklyAgendaBacklogEmptyMessage'
import {
  type DraftPlanItem,
  buildSavePayload,
  isWeeklyAgendaDraftDirty,
  planItemToDraft,
  removeDraftPlanItem,
} from './weeklyAgendaDraft'
import {
  applyBacklogToCellDrop,
  applyWeeklyAgendaDragEnd,
  BACKLOG_DRAG_PREFIX,
  CELL_DRAG_PREFIX,
  DAY_TAB_DRAG_PREFIX,
  parseBacklogActivityNodeId,
  parsePlanLocalKey,
  PLAN_DRAG_PREFIX,
} from './weeklyAgendaDnD'
import { snapCenterToCursor } from './weeklyAgendaDragModifiers'
import { buildWeeklyAgendaSummaryStrip } from './weeklyAgendaSummary'
import { applyBatchQueueAssignment } from './weeklyAgendaBatchQueue'

type ActiveDragState =
  | { kind: 'backlog'; item: OperationalPlanningBacklogItem }
  | { kind: 'plan'; item: DraftPlanItem }
  | null

type BacklogPlacingState = {
  activityNodeId: string
  activityTitle: string
  mode: 'drag' | 'tap'
}

export function WeeklyAgendaPage() {
  const { can } = useAuth()
  const canAlterConveyor = can('conveyors.create')

  const {
    weekMonday,
    setWeekMonday,
    weekPayload,
    setWeekPayload,
    collaborators,
    loading,
    error,
    reload,
  } = useWeeklyAgendaWeek()
  const {
    backlogItems,
    backlogQ,
    setBacklogQ,
    loading: backlogLoading,
    reloadBacklog,
  } = useWeeklyAgendaBacklog()

  const [draftItems, setDraftItems] = useState<DraftPlanItem[]>([])
  const savedDraftJsonRef = useRef<string>('[]')
  const [busy, setBusy] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [cardActionBusyKey, setCardActionBusyKey] = useState<string | null>(null)
  const [activeDrag, setActiveDrag] = useState<ActiveDragState>(null)
  const [dragOverlayWidth, setDragOverlayWidth] = useState<number | null>(null)
  const [quickTimeEntryOpen, setQuickTimeEntryOpen] = useState(false)
  const [quickTimeEntryCandidate, setQuickTimeEntryCandidate] =
    useState<TimeEntryCandidateItem | null>(null)

  const {
    requestPrint,
    currentSheet,
    printProgress,
    isPrinting,
    agentStatus,
    agentFallbackNotice,
    testPrintLoading,
    cancelPrint,
    clearAgentFallbackNotice,
    testThermalPrinter,
  } = useActivityTicketPrint()

  const weekdayDates = useMemo(
    () => weekPayload?.week.weekdayDates ?? [],
    [weekPayload?.week.weekdayDates],
  )
  const weekdayLabels = useMemo(() => weekdayLabelsPt(), [])
  const capacityRows = useMemo(
    () => weekPayload?.capacityByCollaboratorDay ?? [],
    [weekPayload?.capacityByCollaboratorDay],
  )

  const todayIso = useMemo(() => localTodayIsoDate(), [])
  const todayInDisplayedWeek = useMemo(
    () => isIsoDateInWeekdays(todayIso, weekdayDates),
    [todayIso, weekdayDates],
  )

  const [selectedDay, setSelectedDay] = useState<string>('')
  const [attentionDrawerOpen, setAttentionDrawerOpen] = useState(false)
  const [backlogDrawerOpen, setBacklogDrawerOpen] = useState(false)
  const [batchQueueOpen, setBatchQueueOpen] = useState(false)
  const [batchQueueSession, setBatchQueueSession] = useState(0)
  const [backlogPlacing, setBacklogPlacing] = useState<BacklogPlacingState | null>(null)
  const backlogDragFromOpenDrawerRef = useRef(false)
  const backlogDragCancelRequestedRef = useRef(false)

  useEffect(() => {
    if (!weekPayload) {
      setDraftItems([])
      savedDraftJsonRef.current = '[]'
      return
    }
    if (weekPayload.plan?.items?.length) {
      const d = weekPayload.plan.items.map(planItemToDraft)
      setDraftItems(d)
      savedDraftJsonRef.current = JSON.stringify(d)
    } else {
      setDraftItems([])
      savedDraftJsonRef.current = '[]'
    }
  }, [weekPayload])

  useEffect(() => {
    if (weekdayDates.length === 0) {
      setSelectedDay('')
      return
    }
    setSelectedDay((current) => {
      if (current && weekdayDates.includes(current)) return current
      if (todayInDisplayedWeek && weekdayDates.includes(todayIso)) return todayIso
      return weekdayDates[0] ?? ''
    })
  }, [weekMonday, weekdayDates, todayInDisplayedWeek, todayIso])

  const dirty = useMemo(
    () => isWeeklyAgendaDraftDirty(draftItems, savedDraftJsonRef.current),
    [draftItems],
  )

  useEffect(() => {
    if (dirty) setSuccessMsg(null)
  }, [dirty])

  const plannedActivityIds = useMemo(
    () => new Set(draftItems.map((i) => i.activityNodeId)),
    [draftItems],
  )

  const visibleBacklogItems = useMemo(
    () => buildVisiblePlanningBacklogItems(backlogItems, draftItems),
    [backlogItems, draftItems],
  )

  const backlogExecutionLookup = useMemo(
    () => buildPlanningBacklogExecutionLookup(backlogItems),
    [backlogItems],
  )

  const {
    weekTicketsPrintOpen,
    weekTicketSources,
    weekPrintableTicketCount,
    openWeekTicketsPrintDialog,
    closeWeekTicketsPrintDialog,
    handleWeekTicketsPrint,
  } = usePlanningWeekTicketsPrint({
    draftItems,
    backlogExecutionLookup,
    requestPrint,
  })

  const summaryStrip = useMemo(() => buildWeeklyAgendaSummaryStrip(weekPayload), [weekPayload])

  const syncIssueItems = useMemo(
    () => listPlanningSyncIssues(weekPayload?.plan?.items ?? []),
    [weekPayload?.plan?.items],
  )
  const executionOutsidePlanEntries = useMemo(
    () => weekPayload?.executionOutsidePlanEntries ?? [],
    [weekPayload?.executionOutsidePlanEntries],
  )
  const executionOutsidePlanTotalMinutes = useMemo(
    () => weekPayload?.executionOutsidePlanSummary.totalMinutes ?? 0,
    [weekPayload?.executionOutsidePlanSummary.totalMinutes],
  )

  const backlogEmptyMessage = useMemo(
    () =>
      buildWeeklyAgendaBacklogEmptyMessage({
        visibleCount: visibleBacklogItems.length,
        loadedCount: backlogItems.length,
        searchQuery: backlogQ,
      }),
    [visibleBacklogItems.length, backlogItems.length, backlogQ],
  )

  const daySummaries = useMemo(
    () =>
      buildPlanningDaySummaries(
        draftItems.map((item) => ({
          plannedDate: item.plannedDate,
          plannedMinutes: item.plannedMinutes,
          assignedCollaboratorId: item.assignedCollaboratorId ?? undefined,
        })),
      ),
    [draftItems],
  )
  const maxDayMinutes = useMemo(
    () => Math.max(0, ...Object.values(daySummaries).map((d) => d.totalMinutes)),
    [daySummaries],
  )
  const dayLoadMinutes = useMemo(
    () =>
      Object.fromEntries(
        weekdayDates.map((date) => [date, daySummaries[date]?.totalMinutes ?? 0]),
      ) as Record<string, number>,
    [weekdayDates, daySummaries],
  )

  const activeSelectedDay = selectedDay || weekdayDates[0] || ''

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  )

  const weeklyAgendaCollision: CollisionDetection = (args) => {
    const activeId = String(args.active?.id ?? '')
    const pointerHits = pointerWithin(args)
    if (activeId.startsWith(PLAN_DRAG_PREFIX)) {
      const planPointerHits = pointerHits.filter((entry) =>
        String(entry.id).startsWith(PLAN_DRAG_PREFIX),
      )
      if (planPointerHits.length > 0) return planPointerHits

      const planRectHits = rectIntersection(args).filter((entry) =>
        String(entry.id).startsWith(PLAN_DRAG_PREFIX),
      )
      if (planRectHits.length > 0) return planRectHits

      const dayTabHits = pointerHits.filter((entry) =>
        String(entry.id).startsWith(DAY_TAB_DRAG_PREFIX),
      )
      if (dayTabHits.length > 0) return dayTabHits

      const otherPlanContainers = args.droppableContainers.filter(
        (entry) =>
          String(entry.id).startsWith(PLAN_DRAG_PREFIX) && String(entry.id) !== activeId,
      )
      if (otherPlanContainers.length > 0) {
        const closestPlan = closestCenter({
          ...args,
          droppableContainers: otherPlanContainers,
        })
        if (closestPlan.length > 0) return closestPlan
      }
    }
    if (activeId.startsWith(BACKLOG_DRAG_PREFIX)) {
      const cellHits = pointerHits.filter((entry) => String(entry.id).startsWith(CELL_DRAG_PREFIX))
      if (cellHits.length > 0) return cellHits
    }
    return closestCenter(args)
  }

  const refreshPlanningExecutionData = useCallback(async () => {
    try {
      const w = await reload()
      if (w?.plan?.items?.length) {
        const serverDrafts = w.plan.items.map(planItemToDraft)
        setDraftItems((prev) => {
          const isDirty = isWeeklyAgendaDraftDirty(prev, savedDraftJsonRef.current)
          if (!isDirty) {
            savedDraftJsonRef.current = JSON.stringify(serverDrafts)
            return serverDrafts
          }
          return mergePlanningExecutionFromServerItems(prev, w.plan!.items)
        })
      }
      await reloadBacklog()
    } catch (e) {
      reportClientError(e, { module: 'weekly-agenda', action: 'refresh_execution' })
    }
  }, [reload, reloadBacklog])

  async function handleWeekApplied() {
    await reload()
    await reloadBacklog()
  }

  async function applyPlanningWeekFromServer(out: OperationalPlanningWeekPayload) {
    setWeekPayload(out)
    if (out.plan?.items?.length) {
      const d = out.plan.items.map(planItemToDraft)
      setDraftItems(d)
      savedDraftJsonRef.current = JSON.stringify(d)
    } else {
      setDraftItems([])
      savedDraftJsonRef.current = '[]'
    }
  }

  async function handleSaveDraft() {
    if (!weekPayload) return
    const { weekStartDate, weekEndDate } = resolvePlanningSaveWeekDates(weekPayload)
    const body = buildSavePayload(weekStartDate, weekEndDate, draftItems)
    setBusy(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const out = await saveOperationalPlanningWeek(body)
      await applyPlanningWeekFromServer(out)
      setSuccessMsg(resolvePlanningSaveSuccessMessage(resolvePlanningRevisionContext(out)))
      await reloadBacklog()
    } catch (e) {
      reportClientError(e, { module: 'weekly-agenda', action: 'save_week' })
      const isPublished = weekPayload.plan?.status === 'PUBLISHED'
      setErrorMsg(
        resolvePlanningSaveErrorMessage(
          e,
          isPublished
            ? 'Não foi possível salvar as alterações no plano ativo.'
            : 'Não foi possível salvar o rascunho.',
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  async function persistPublishedPlanItems(items: DraftPlanItem[]) {
    if (!weekPayload?.plan || !shouldAutoPersistPlanChanges(weekPayload)) return
    const { weekStartDate, weekEndDate } = resolvePlanningSaveWeekDates(weekPayload)
    const body = buildSavePayload(weekStartDate, weekEndDate, items)
    setBusy(true)
    setErrorMsg(null)
    try {
      const out = await saveOperationalPlanningWeek(body)
      await applyPlanningWeekFromServer(out)
      setSuccessMsg(SAVE_REVISION_SUCCESS_MESSAGE)
      await reloadBacklog()
    } catch (e) {
      reportClientError(e, { module: 'weekly-agenda', action: 'save_published_remove' })
      setErrorMsg(
        resolvePlanningSaveErrorMessage(
          e,
          'Não foi possível salvar a revisão do plano.',
        ),
      )
      await reload()
    } finally {
      setBusy(false)
    }
  }

  async function handlePublish() {
    if (!weekPayload?.plan || draftItems.length === 0) return
    setBusy(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const out = await publishOperationalPlanningWeek(weekPayload.plan.id)
      await applyPlanningWeekFromServer(out)
      await reloadBacklog()
      setSuccessMsg(PUBLISH_SUCCESS_MESSAGE)
    } catch (e) {
      reportClientError(e, { module: 'weekly-agenda', action: 'publish_week' })
      const detail = e instanceof ApiError ? e.message : null
      setErrorMsg(detail ?? 'Não foi possível publicar o plano.')
    } finally {
      setBusy(false)
    }
  }

  function clearBacklogPlacingMode(options?: { reopenDrawer?: boolean }) {
    setBacklogPlacing(null)
    backlogDragFromOpenDrawerRef.current = false
    backlogDragCancelRequestedRef.current = false
    if (options?.reopenDrawer) {
      setBacklogDrawerOpen(true)
    }
  }

  function handlePlacingCancel() {
    if (backlogPlacing?.mode === 'tap') {
      clearBacklogPlacingMode({ reopenDrawer: backlogDragFromOpenDrawerRef.current })
      return
    }
    backlogDragCancelRequestedRef.current = true
    setBacklogPlacing(null)
    if (backlogDragFromOpenDrawerRef.current) {
      setBacklogDrawerOpen(true)
    }
  }

  function handleBacklogAssignTap(item: OperationalPlanningBacklogItem) {
    backlogDragFromOpenDrawerRef.current = true
    setBacklogDrawerOpen(false)
    setBacklogPlacing({
      activityNodeId: item.activityNodeId,
      activityTitle: item.activityTitle,
      mode: 'tap',
    })
  }

  function handleBacklogCellTap(collaboratorId: string, plannedDate: string) {
    if (!backlogPlacing || backlogPlacing.mode !== 'tap') return
    const next = applyBacklogToCellDrop({
      activityNodeId: backlogPlacing.activityNodeId,
      cell: { collaboratorId, plannedDate },
      draftItems,
      backlogItems,
      collaborators,
      plannedActivityIds,
    })
    clearBacklogPlacingMode()
    if (next) setDraftItems(next)
  }

  function handleDragStart(ev: DragStartEvent) {
    const initialWidth = ev.active.rect.current.initial?.width
    setDragOverlayWidth(initialWidth && initialWidth > 0 ? initialWidth : null)

    const activeId = String(ev.active.id)
    const backlogId = parseBacklogActivityNodeId(activeId)
    if (backlogId) {
      const item = visibleBacklogItems.find((b) => b.activityNodeId === backlogId)
      if (!item) return
      if (backlogDrawerOpen) {
        backlogDragFromOpenDrawerRef.current = true
        setBacklogDrawerOpen(false)
      } else {
        backlogDragFromOpenDrawerRef.current = false
      }
      setBacklogPlacing({
        activityNodeId: item.activityNodeId,
        activityTitle: item.activityTitle,
        mode: 'drag',
      })
      setActiveDrag({ kind: 'backlog', item })
      return
    }
    const planKey = parsePlanLocalKey(activeId)
    if (planKey) {
      const item = draftItems.find((d) => d.localKey === planKey)
      if (item) setActiveDrag({ kind: 'plan', item })
    }
  }

  function clearDragVisualState() {
    setActiveDrag(null)
    setDragOverlayWidth(null)
    setBacklogPlacing((current) => (current?.mode === 'drag' ? null : current))
  }

  function handleDragEnd(ev: DragEndEvent) {
    const activeId = String(ev.active.id)
    const overId = ev.over ? String(ev.over.id) : ''
    const wasBacklogDrag = parseBacklogActivityNodeId(activeId) !== null
    const cancelRequested = backlogDragCancelRequestedRef.current

    clearDragVisualState()

    if (wasBacklogDrag) {
      if (cancelRequested) {
        clearBacklogPlacingMode({ reopenDrawer: backlogDragFromOpenDrawerRef.current })
        return
      }

      const next = applyWeeklyAgendaDragEnd({
        activeId,
        overId,
        draftItems,
        backlogItems,
        collaborators,
        plannedActivityIds,
      })

      if (next) {
        setDraftItems(next)
        clearBacklogPlacingMode()
        return
      }

      // Drop inválido: banner some; gaveta permanece fechada (FAB reabre — igual protótipo).
      clearBacklogPlacingMode()
      return
    }

    const next = applyWeeklyAgendaDragEnd({
      activeId,
      overId,
      draftItems,
      backlogItems,
      collaborators,
      plannedActivityIds,
    })
    if (next) setDraftItems(next)
  }

  function handleDragCancel() {
    const wasBacklogFromDrawer = backlogDragFromOpenDrawerRef.current
    clearDragVisualState()
    clearBacklogPlacingMode({ reopenDrawer: wasBacklogFromDrawer })
  }

  function handleRemoveFromPlan(item: DraftPlanItem) {
    const next = removeDraftPlanItem(draftItems, item.localKey)
    setDraftItems(next)
    if (shouldAutoPersistPlanChanges(weekPayload)) {
      void persistPublishedPlanItems(next)
    }
  }

  const handleCardPointTime = useCallback(async (item: DraftPlanItem) => {
    if (!canPointTimeOnPlanningStep(item.activityOperationalStatus)) return
    setCardActionBusyKey(item.localKey)
    setErrorMsg(null)
    try {
      let candidate: TimeEntryCandidateItem | null = null
      try {
        const r = await listTimeEntryCandidates({ limit: 100, includeUnassigned: true })
        candidate =
          r.items.find(
            (c: TimeEntryCandidateItem) =>
              c.conveyorId === item.conveyorId && c.stepNodeId === item.activityNodeId,
          ) ?? null
      } catch {
        candidate = null
      }
      setQuickTimeEntryCandidate(candidate ?? planningApontamentoCandidate(item))
      setQuickTimeEntryOpen(true)
    } finally {
      setCardActionBusyKey(null)
    }
  }, [])

  const handleCardComplete = useCallback(
    async (item: DraftPlanItem) => {
      if (!canCompletePlanningStep(item.activityOperationalStatus, canAlterConveyor)) return
      setCardActionBusyKey(item.localKey)
      setErrorMsg(null)
      try {
        let oosJust: string | undefined
        try {
          const seq = await getConveyorStepSequenceCheck(item.conveyorId, item.activityNodeId)
          if (seq.isOutOfSequence) {
            const j = window.prompt(
              'Esta atividade está fora da sequência recomendada. Informe a justificativa para concluí-la:',
            )
            if (j == null) return
            const trimmed = j.trim()
            if (!trimmed.length) {
              setErrorMsg('Informe uma justificativa para concluir fora da sequência.')
              return
            }
            oosJust = trimmed
          }
        } catch {
          /* confirmação simples se a checagem falhar */
        }
        if (!window.confirm('Confirmar conclusão desta atividade?')) return
        await patchConveyorStepCompletion(item.conveyorId, item.activityNodeId, {
          action: 'COMPLETE',
          ...(oosJust ? { outOfSequenceJustification: oosJust } : {}),
        })
        setSuccessMsg('Atividade concluída.')
        await refreshPlanningExecutionData()
      } catch (e) {
        reportClientError(e, { module: 'weekly-agenda', action: 'card_complete_step' })
        const detail = e instanceof ApiError ? e.message : null
        setErrorMsg(detail ?? 'Não foi possível concluir a atividade.')
      } finally {
        setCardActionBusyKey(null)
      }
    },
    [canAlterConveyor, refreshPlanningExecutionData],
  )

  const handleCardPrintTicket = useCallback(
    (item: DraftPlanItem) => {
      const input = buildActivityTicketInputFromPlanningSource(item, backlogExecutionLookup)
      requestPrint([buildActivityTicketPrintModel(input)])
    },
    [backlogExecutionLookup, requestPrint],
  )

  const isDragInProgress = activeDrag !== null || backlogPlacing !== null
  const backlogTapPlaceActivityId =
    backlogPlacing?.mode === 'tap' ? backlogPlacing.activityNodeId : null

  function handleStartBatchQueue() {
    setBacklogDrawerOpen(false)
    setBatchQueueSession((s) => s + 1)
    setBatchQueueOpen(true)
  }

  function handleBatchQueueClose() {
    setBatchQueueOpen(false)
  }

  function handleBatchQueueAssign(input: {
    activityNodeId: string
    collaboratorId: string
    plannedDate: string
  }) {
    const next = applyBatchQueueAssignment({
      activityNodeId: input.activityNodeId,
      collaboratorId: input.collaboratorId,
      plannedDate: input.plannedDate,
      draftItems,
      backlogItems,
      collaborators,
      plannedActivityIds,
    })
    if (next) setDraftItems(next)
  }

  function handleBatchQueueComplete() {
    setBatchQueueOpen(false)
    setSuccessMsg('Todos os itens do lote foram atribuídos ao rascunho.')
  }

  return (
    <PageCanvas>
      <DndContext
        sensors={sensors}
        collisionDetection={weeklyAgendaCollision}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="mx-auto max-w-[1600px] pb-24 lg:pr-20">
          {backlogPlacing ? (
            <WeeklyAgendaPlacingBanner
              activityTitle={backlogPlacing.activityTitle}
              mode={backlogPlacing.mode}
              onCancel={handlePlacingCancel}
            />
          ) : null}

          <WeeklyAgendaHeader
            weekMonday={weekMonday}
            weekPayload={weekPayload}
            loading={loading}
            busy={busy}
            dirty={dirty}
            draftItemsCount={draftItems.length}
            onWeekChange={setWeekMonday}
            onSaveDraft={() => void handleSaveDraft()}
            onPublish={() => void handlePublish()}
            weekTicketPrintCount={weekTicketSources.length}
            weekTicketPrintDisabled={busy || loading || isPrinting || weekTicketSources.length === 0}
            onOpenWeekTicketPrint={openWeekTicketsPrintDialog}
            successMsg={successMsg}
            errorMsg={errorMsg}
            suppressSecondaryHints={isDragInProgress}
          />

          {loading ? (
            <p className="mt-8 text-center text-[13px] text-slate-500" role="status">
              Carregando semana…
            </p>
          ) : null}

          {error ? (
            <p
              className="mt-8 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-100"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {!loading && !error ? (
            <>
              <div className="mt-8">
                <WeeklyAgendaSummaryStrip
                  summary={summaryStrip}
                  onAttentionClick={() => setAttentionDrawerOpen(true)}
                />
              </div>

              <section className="mt-8 space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-[15px] font-semibold text-slate-100">Grade da semana</h2>
                    <p className="mt-1 text-[12px] text-slate-500">
                      Arraste do backlog ou entre células; solte na aba do dia para mudar a data.
                    </p>
                    {activeSelectedDay ? (
                      <p
                        className="mt-1 text-[11px] text-slate-400 lg:hidden"
                        data-testid="weekly-agenda-mobile-selected-day"
                      >
                        Exibindo:{' '}
                        <span className="font-medium text-slate-200">
                          {weekdayLabels[weekdayDates.indexOf(activeSelectedDay)] ??
                            activeSelectedDay}
                        </span>{' '}
                        ({activeSelectedDay})
                      </p>
                    ) : null}
                  </div>
                  <div className="hidden flex-wrap gap-3 text-[11px] text-slate-500 lg:flex">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-sm bg-white/35" /> Planejada
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-sm bg-sky-400/80" /> Em execução
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-sm bg-emerald-400/80" /> Concluída
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-sm bg-sgp-gold/80" /> Divergente
                    </span>
                  </div>
                </div>

                {weekdayDates.length > 0 ? (
                  <WeeklyAgendaDayTabs
                    weekdayDates={weekdayDates}
                    weekdayLabels={weekdayLabels}
                    selectedDay={activeSelectedDay}
                    dayLoadMinutes={dayLoadMinutes}
                    maxDayMinutes={maxDayMinutes}
                    onSelectDay={setSelectedDay}
                  />
                ) : null}

                <WeeklyAgendaBoard
                  collaborators={collaborators}
                  draftItems={draftItems}
                  weekdayDates={weekdayDates}
                  weekdayLabels={weekdayLabels}
                  capacityRows={capacityRows}
                  selectedDay={activeSelectedDay}
                  todayIso={todayIso}
                  todayInDisplayedWeek={todayInDisplayedWeek}
                  dragDisabled={busy}
                  canAlterConveyor={canAlterConveyor}
                  cardActionBusyKey={cardActionBusyKey}
                  onCardPointTime={(item) => void handleCardPointTime(item)}
                  onCardComplete={(item) => void handleCardComplete(item)}
                  onCardPrintTicket={handleCardPrintTicket}
                  onCardRemoveFromPlan={handleRemoveFromPlan}
                  backlogTapPlaceActivityId={backlogTapPlaceActivityId}
                  onBacklogCellTap={handleBacklogCellTap}
                />
              </section>
            </>
          ) : null}
        </div>

        <WeeklyAgendaBacklogFab
          count={visibleBacklogItems.length}
          onClick={() => setBacklogDrawerOpen(true)}
        />

        <WeeklyAgendaBacklogDrawer
          open={backlogDrawerOpen && !batchQueueOpen}
          onClose={() => setBacklogDrawerOpen(false)}
          items={visibleBacklogItems}
          searchQuery={backlogQ}
          onSearchChange={setBacklogQ}
          onSearchSubmit={() => void reloadBacklog()}
          emptyMessage={backlogEmptyMessage}
          loading={backlogLoading}
          onStartBatchQueue={handleStartBatchQueue}
          onAssignItem={handleBacklogAssignTap}
        />

        {batchQueueOpen ? (
          <WeeklyAgendaBatchQueueOverlay
            key={batchQueueSession}
            open
            items={visibleBacklogItems}
            collaborators={collaborators}
            weekdayDates={weekdayDates}
            weekdayLabels={weekdayLabels}
            capacityRows={capacityRows}
            draftItems={draftItems}
            defaultPlannedDate={activeSelectedDay}
            onClose={handleBatchQueueClose}
            onAssign={handleBatchQueueAssign}
            onComplete={handleBatchQueueComplete}
          />
        ) : null}

        {typeof document !== 'undefined'
          ? createPortal(
              <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]} zIndex={1100}>
                {activeDrag ? (
                  <div
                    className="touch-none cursor-grabbing"
                    style={dragOverlayWidth ? { width: dragOverlayWidth } : undefined}
                    data-testid="weekly-agenda-drag-overlay"
                  >
                    {activeDrag.kind === 'backlog' ? (
                      <WeeklyAgendaBacklogCard item={activeDrag.item} overlay />
                    ) : (
                      <WeeklyAgendaPlanCard order={1} item={activeDrag.item} overlay />
                    )}
                  </div>
                ) : null}
              </DragOverlay>,
              document.body,
            )
          : null}
      </DndContext>

      <WeeklyAgendaAttentionDrawer
        open={attentionDrawerOpen}
        onClose={() => setAttentionDrawerOpen(false)}
        syncItems={syncIssueItems}
        outsidePlanEntries={executionOutsidePlanEntries}
        outsidePlanTotalMinutes={executionOutsidePlanTotalMinutes}
        onWeekApplied={handleWeekApplied}
      />

      <QuickTimeEntryDrawer
        open={quickTimeEntryOpen}
        initialCandidate={quickTimeEntryCandidate}
        onTimeEntrySaved={() => {
          void refreshPlanningExecutionData()
        }}
        onClose={() => {
          setQuickTimeEntryOpen(false)
          setQuickTimeEntryCandidate(null)
          void refreshPlanningExecutionData()
        }}
      />

      {currentSheet ? <ThermalActivityTicketsPrintArea sheet={currentSheet} /> : null}
      <ThermalTicketPrintProgressOverlay
        open={printProgress !== null && isBatchThermalTicketPrint(printProgress)}
        current={printProgress?.current ?? 0}
        total={printProgress?.total ?? 0}
        onCancel={cancelPrint}
      />

      <PlanningWeekTicketsPrintDialog
        open={weekTicketsPrintOpen}
        totalCount={weekTicketSources.length}
        printableCount={weekPrintableTicketCount}
        agentStatus={agentStatus}
        agentFallbackNotice={agentFallbackNotice}
        testPrintLoading={testPrintLoading}
        onClose={closeWeekTicketsPrintDialog}
        onPrint={handleWeekTicketsPrint}
        onDismissAgentNotice={clearAgentFallbackNotice}
        onTestThermalPrinter={() => {
          void testThermalPrinter()
        }}
      />
    </PageCanvas>
  )
}
