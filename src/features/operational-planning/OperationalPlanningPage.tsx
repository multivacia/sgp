import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PageCanvas } from '../../components/ui/PageCanvas'
import type { TimeEntryCandidateItem } from '../../domain/my-activities/my-activities.types'
import {
  canCompletePlanningStep,
  canPointTimeOnPlanningStep,
  canReopenPlanningStep,
  mergePlanningExecutionFromServerItems,
  planningApontamentoCandidate,
} from './planningCardActions'
import { QuickTimeEntryDrawer } from '../shell/QuickTimeEntryDrawer'
import { useAuth } from '../../lib/use-auth'
import {
  getConveyorStepSequenceCheck,
  patchConveyorStepCompletion,
  reopenConveyorStep,
} from '../../services/conveyors/conveyorsApiService'
import { listTimeEntryCandidates } from '../../services/my-activities/myActivitiesApiService'
import type {
  OperationalPlanningBacklogItem,
  OperationalPlanningFactoryIntakeItem,
  OperationalPlanningPlanItem,
  OperationalPlanningWeekActivityItem,
  OperationalPlanningWeekPayload,
} from '../../domain/operational-planning/operational-planning.types'
import type { Collaborator } from '../../domain/collaborators/collaborator.types'
import { formatHumanMinutes } from '../../lib/formatters'
import {
  buildPlanningAssigneeSummaries,
  buildPlanningDaySummaries,
  formatPlanningCapacityExceededMessage,
  formatPlanningMinutes,
  resolvePlanningCapacityState,
  sumPlanningItemMinutes,
} from './planningBoardHelpers'
import { reportClientError } from '../../lib/errors'
import { ApiError } from '../../lib/api/apiErrors'
import { useRegisterTransientContext } from '../../lib/shell/transient-context'
import { createCollaboratorsApiService } from '../../services/collaborators/collaboratorsApiService'
import {
  exportOperationalPlanningWeekToExcel,
  exportOperationalPlanningWeeklyViewToExcel,
  getFactoryIntakeItems,
  getOperationalPlanningWeek,
  getOperationalPlanningWeekActivity,
  listOperationalPlanningBacklog,
  publishOperationalPlanningWeek,
  saveOperationalPlanningWeek,
} from '../../services/operational-planning/operationalPlanningApiService'
import { OperationalPlanningExportButton } from './OperationalPlanningExportButton'
import {
  isOperationalPlanningExportActionDisabled,
  resolveOperationalPlanningExportWeekStart,
  runOperationalPlanningExportFlow,
} from './operationalPlanningExportFlow'
import { OperationalPlanningWeeklyViewExportButton } from './OperationalPlanningWeeklyViewExportButton'
import {
  isOperationalPlanningWeeklyViewExportActionDisabled,
  resolveOperationalPlanningExportMutualExclusion,
  resolveOperationalPlanningWeeklyViewExportWeekStart,
  runOperationalPlanningWeeklyViewExportFlow,
} from './operationalPlanningWeeklyViewExportFlow'
import { buildVisiblePlanningBacklogItems } from './buildVisiblePlanningBacklogItems'
import {
  PLAN_PUBLISHED_HELPER_TEXT,
  PLAN_UNPUBLISHED_CHANGES_BADGE,
  PUBLISH_BUTTON_LABEL,
  PUBLISH_SUCCESS_MESSAGE,
  SAVE_REVISION_SUCCESS_MESSAGE,
  isPlanningPublishDisabled,
  resolvePlanningPublishButtonTitle,
  resolvePlanningRevisionContext,
  resolvePlanningSaveButtonLabel,
  resolvePlanningSaveErrorMessage,
  resolvePlanningSaveSuccessMessage,
  resolvePlanningSaveWeekDates,
  resolvePlanningStatusBadgeLabel,
  shouldAutoPersistPlanChanges,
  hasLegacyPlanWeekEndDate,
  LEGACY_PLAN_WEEK_END_NOTICE,
} from './operationalPlanningPlanStatusCopy'
import {
  DEFAULT_FACTORY_INTAKE_FILTERS,
  type FactoryIntakeFilters,
} from './factoryIntakeGrouping'
import { FactoryIntakePanel } from './FactoryIntakePanel'
import {
  formatFactoryIntakeKpiLine,
  useFactoryIntakePanelData,
} from './factoryIntakePanelData'
import {
  buildPlanningFilterOptions,
  DEFAULT_PLANNING_BOARD_FILTERS,
  filterPlanningDraftItems,
  isPlanningBoardFiltersActive,
  PLANNING_COLLABORATOR_ALL,
  PLANNING_COLLABORATOR_UNASSIGNED,
  PLANNING_CONVEYOR_ALL,
  type PlanningBoardFilters,
} from './planningBoardFilters'
import { buildPlanningBacklogExecutionLookup } from './planningExecutionHelpers'
import {
  resolveDefaultPlanningDailySelectedDay,
  type PlanningDailySelectedDay,
  type PlanningViewMode,
} from './planningDailyBoard'
import { PlanningCapacityExceededDialog } from './PlanningCapacityExceededDialog'
import { PlanningDailyKanbanView } from './PlanningDailyKanbanView'
import { PlanningItemQuickActions } from './PlanningItemQuickActions'
import { PlanningPlanCardExecution } from './PlanningPlanCardExecution'
import { usePlanningCapacityExceededAlert } from './usePlanningCapacityExceededAlert'
import {
  fridayAfterMonday,
  isIsoDateInWeekdays,
  localTodayIsoDate,
  mondayOfWeekContainingLocal,
  shiftWeek,
  weekdayLabelsPt,
} from './operationalPlanningWeekRange'
import { PlanningWeekOperationalSummaryBar } from './PlanningWeekOperationalSummaryBar'
import { PlanningWeekDeviationBar } from './PlanningWeekDeviationBar'
import { PlanningPrincipalDeviationsPanel } from './PlanningPrincipalDeviationsPanel'
import { buildPlanningWeekOperationalSummary } from './planningWeekOperationalSummary'
import {
  buildPlanningDeviationItems,
  buildPlanningDeviationSummary,
} from './planningDeviationIndicators'
import { countPlanningSyncDivergences, listPlanningSyncIssues } from '../../domain/operational-planning/planningSyncIssues'
import { PlanningSyncBadge } from './PlanningSyncBadge'
import { PlanningSyncIssuesPanel } from './PlanningSyncIssuesPanel'
import { PlanningExecutionOutsidePlanPanel } from './PlanningExecutionOutsidePlanPanel'
import { PlanningWeekHistoryPanel } from './PlanningWeekHistoryPanel'
import {
  DEFAULT_PLANNING_WEEK_ACTIVITY_FILTERS,
  filterPlanningWeekActivityItems,
  type PlanningWeekActivityFilters,
} from './planningWeekActivity'
import {
  buildActivityTicketInputsFromPlanningSources,
} from '../operational-tickets/activityTicketPlanningSource'
import {
  buildActivityTicketPrintModelsFromPlanningInputs,
} from '../operational-tickets/activityTicketPrintModel'
import { buildSinglePlanningTicketPrintItems } from '../operational-tickets/buildSinglePlanningTicketPrintItems'
import { resolvePlanningItemsForTicketBatchPrint } from '../operational-tickets/resolvePlanningItemsForTicketBatch'
import { ACTIVITY_TICKET_PRINT_SUPPORT_MESSAGE, ACTIVITY_TICKET_SILENT_PRINT_HINT } from '../operational-tickets/activityTicketPrintCopy'
import { ThermalActivityTicketsPrintArea } from '../operational-tickets/ThermalActivityTicketsPrintArea'
import { ThermalPrintAgentControls } from '../operational-tickets/ThermalPrintAgentControls'
import { ThermalTicketPrintProgressOverlay } from '../operational-tickets/ThermalTicketPrintProgressOverlay'
import { isBatchThermalTicketPrint } from '../operational-tickets/thermalTicketPrintQueue'
import { useActivityTicketPrint } from '../operational-tickets/useActivityTicketPrint'
import { PlanningWeekTicketsPrintButton } from '../operational-tickets/PlanningWeekTicketsPrintButton'
import { PlanningWeekTicketsPrintDialog } from '../operational-tickets/PlanningWeekTicketsPrintDialog'
import { usePlanningWeekTicketsPrint } from '../operational-tickets/usePlanningWeekTicketsPrint'
import {
  SHOW_PLANNING_PRINCIPAL_DEVIATIONS,
  SHOW_PLANNING_SECONDARY_TABS,
} from './planningUiFlags'
import {
  PLANNING_BACKLOG_COLUMN_CLASS,
  PLANNING_BACKLOG_SCROLL_CLASS,
  PLANNING_COLLABORATORS_COLUMN_CLASS,
  PLANNING_COLLABORATORS_SCROLL_CLASS,
  PLANNING_LAYOUT_TEST_IDS,
  PLANNING_OPERATIONAL_WORKSPACE_CLASS,
  PLANNING_PAGE_ROOT_CLASS,
  PLANNING_UPPER_SECTION_CLASS,
} from './planningOperationalLayout'

export { ACTIVITY_TICKET_PRINT_SUPPORT_MESSAGE } from '../operational-tickets/activityTicketPrintCopy'

const collaboratorsApi = createCollaboratorsApiService()

type DraftPlanItem = {
  localKey: string
  serverItemId?: string
  conveyorId: string
  activityNodeId: string
  conveyorTitle: string
  activityTitle: string
  taskTitle: string
  sectorTitle: string
  assignedCollaboratorId: string
  assignedCollaboratorName: string | null
  assignedTeamId?: string | null
  plannedDate: string
  plannedOrder: number
  plannedMinutes: number | null
  notes: string | null
  isOutOfSequence?: boolean
  conveyorOperationalPlanItemId?: string | null
  /** Do GET da semana; ausente em itens recém-adicionados localmente. */
  realizedMinutes?: number | null
  /** Status operacional do STEP (`conveyor_nodes.operational_status`). */
  activityOperationalStatus?: string | null
  syncStatus?: OperationalPlanningPlanItem['syncStatus']
  syncDifferences?: OperationalPlanningPlanItem['syncDifferences']
  /** Status do item no plano semanal (`PLANNED`, `CANCELLED`, …). */
  status?: string | null
}

type SidePanelTab = 'backlog' | 'factory-intake' | 'sync-pending' | 'outside-plan' | 'history'

function planItemToDraft(it: OperationalPlanningPlanItem): DraftPlanItem {
  return {
    localKey: it.id,
    serverItemId: it.id,
    conveyorId: it.conveyorId,
    activityNodeId: it.activityNodeId,
    conveyorTitle: it.conveyorTitle,
    activityTitle: it.activityTitle,
    taskTitle: it.taskTitle,
    sectorTitle: it.sectorTitle,
    assignedCollaboratorId: it.assignedCollaboratorId ?? '',
    assignedCollaboratorName: it.assignedCollaboratorName,
    plannedDate: it.plannedDate,
    plannedOrder: it.plannedOrder,
    plannedMinutes: it.plannedMinutes,
    notes: it.notes,
    realizedMinutes: it.realizedMinutes,
    activityOperationalStatus: it.activityOperationalStatus,
    conveyorOperationalPlanItemId: it.conveyorOperationalPlanItemId,
    syncStatus: it.syncStatus,
    syncDifferences: it.syncDifferences,
    status: it.status,
  }
}

function recalculateOrders(items: DraftPlanItem[]): DraftPlanItem[] {
  const groups = new Map<string, DraftPlanItem[]>()
  for (const it of items) {
    const k = `${it.assignedCollaboratorId}|${it.plannedDate}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(it)
  }
  const out: DraftPlanItem[] = []
  for (const [, arr] of groups) {
    arr.sort((a, b) => a.plannedOrder - b.plannedOrder || a.localKey.localeCompare(b.localKey))
    arr.forEach((it, idx) => {
      out.push({ ...it, plannedOrder: idx })
    })
  }
  return out.sort((a, b) => {
    const dc = a.plannedDate.localeCompare(b.plannedDate)
    if (dc !== 0) return dc
    const cc = a.assignedCollaboratorId.localeCompare(b.assignedCollaboratorId)
    if (cc !== 0) return cc
    return a.plannedOrder - b.plannedOrder
  })
}

function buildSavePayload(
  weekStartDate: string,
  weekEndDate: string,
  drafts: DraftPlanItem[],
) {
  const normalized = recalculateOrders([...drafts])
  return {
    weekStartDate,
    weekEndDate,
    items: normalized.map((it) => ({
      conveyorId: it.conveyorId,
      activityNodeId: it.activityNodeId,
      assignedCollaboratorId: it.assignedCollaboratorId,
      assignedTeamId: it.assignedTeamId ?? null,
      plannedDate: it.plannedDate,
      plannedOrder: it.plannedOrder,
      plannedMinutes: it.plannedMinutes,
      notes: it.notes,
      conveyorOperationalPlanItemId: it.conveyorOperationalPlanItemId ?? null,
    })),
  }
}

function newLocalKey(): string {
  return globalThis.crypto.randomUUID()
}

function dragCellId(collaboratorId: string, plannedDate: string): string {
  return `cell|${collaboratorId}|${plannedDate}`
}

function parseCellId(id: string): { collaboratorId: string; plannedDate: string } | null {
  if (!id.startsWith('cell|')) return null
  const rest = id.slice(5)
  const last = rest.lastIndexOf('|')
  if (last <= 0) return null
  return {
    collaboratorId: rest.slice(0, last),
    plannedDate: rest.slice(last + 1),
  }
}

function BacklogDraggableCard(props: {
  item: OperationalPlanningBacklogItem
  blocked: boolean
  onAddClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `bl|${props.item.activityNodeId}`,
    disabled: props.blocked,
  })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-[13px] shadow-sm ring-1 ring-white/[0.04]',
        props.blocked ? 'opacity-55' : '',
        isDragging ? 'opacity-70' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div {...listeners} {...attributes} className="min-w-0 flex-1 cursor-grab active:cursor-grabbing">
          <p className="truncate font-semibold text-slate-100">{props.item.activityTitle}</p>
          <p className="mt-1 truncate text-[11px] text-slate-400">{props.item.conveyorTitle}</p>
          <p className="truncate text-[11px] text-slate-500">
            {props.item.taskTitle} › {props.item.sectorTitle}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Pendente: {formatHumanMinutes(props.item.pendingMinutes)}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.05] px-2 py-1 text-[11px] text-slate-200 hover:bg-white/[0.08]"
          onClick={(e) => {
            e.stopPropagation()
            props.onAddClick()
          }}
          disabled={props.blocked}
        >
          Adicionar ao plano
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {props.item.isOutOfSequence ? (
          <span className="rounded-md border border-amber-400/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-100">
            Fora de sequência
          </span>
        ) : null}
        {!props.item.hasAssignees ? (
          <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-400">
            Sem responsável
          </span>
        ) : null}
        {props.item.isOverdue ? (
          <span className="rounded-md border border-rose-400/25 bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-100">
            Atrasada
          </span>
        ) : null}
        {props.blocked ? (
          <span className="rounded-md border border-emerald-400/25 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-100">
            Já no plano
          </span>
        ) : null}
      </div>
    </div>
  )
}

function PlanScheduledCard(props: {
  order: number
  item: DraftPlanItem
  backlogExecutionLookup: ReadonlyMap<string, number>
  canAlterConveyor: boolean
  actionBusy: boolean
  isPrinting: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  onPointTime: () => void
  onComplete: () => void
  onReopen: () => void
  onPrintTicket?: () => void
}) {
  const { item, order } = props

  return (
    <div
      className="rounded-lg border border-white/[0.08] bg-white/[0.05] p-2.5 text-[11px] ring-1 ring-white/[0.03]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-500">
            {order}. Esteira
          </p>
          <p className="mt-0.5 truncate text-[12px] font-semibold text-slate-50">
            {item.conveyorTitle}
          </p>
          <p className="mt-1 truncate text-[12px] font-medium text-slate-200">
            {item.activityTitle}
          </p>
          <p className="mt-1 truncate text-[10px] text-slate-500">
            {item.sectorTitle} · {item.taskTitle}
          </p>
          {item.assignedCollaboratorName ? (
            <p className="mt-1 truncate text-[10px] text-slate-500">
              {item.assignedCollaboratorName}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            className="rounded border border-white/[0.08] px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-white/[0.06]"
            title="Subir ordem"
            onClick={props.onMoveUp}
          >
            ↑
          </button>
          <button
            type="button"
            className="rounded border border-white/[0.08] px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-white/[0.06]"
            title="Descer ordem"
            onClick={props.onMoveDown}
          >
            ↓
          </button>
          <button
            type="button"
            className="rounded border border-rose-400/30 px-1.5 py-0.5 text-[10px] text-rose-100 hover:bg-rose-500/10"
            title="Remover do plano"
            onClick={props.onRemove}
          >
            ✕
          </button>
        </div>
      </div>
      <PlanningPlanCardExecution
        item={item}
        backlogExecutionLookup={props.backlogExecutionLookup}
      />
      {item.syncStatus === 'DIVERGED' ? (
        <div className="mt-2">
          <PlanningSyncBadge syncDifferences={item.syncDifferences} />
        </div>
      ) : null}
      {item.isOutOfSequence ? (
        <p className="mt-2 text-[10px] font-medium text-amber-200/90">Fora de sequência</p>
      ) : null}
      <PlanningItemQuickActions
        item={item}
        canAlterConveyor={props.canAlterConveyor}
        actionBusy={props.actionBusy}
        isPrinting={props.isPrinting}
        onPointTime={props.onPointTime}
        onComplete={props.onComplete}
        onReopen={props.onReopen}
        onPrintTicket={props.onPrintTicket}
        className="mt-2"
      />
    </div>
  )
}

type PlanningBoardRowProps = {
  collaboratorId: string
  label: string
  assigneeWeek: ReturnType<typeof buildPlanningAssigneeSummaries>[number] | undefined
  weekdayDates: readonly string[]
  visibleDraftItems: DraftPlanItem[]
  backlogExecutionLookup: ReadonlyMap<string, number>
  capacityRows: NonNullable<OperationalPlanningWeekPayload['capacityByCollaboratorDay']>
  todayInDisplayedWeek: boolean
  todayIso: string
  onMoveUp: (localKey: string) => void
  onMoveDown: (localKey: string) => void
  onRemove: (localKey: string) => void
  canAlterConveyor: boolean
  cardActionBusyKey: string | null
  isPrinting: boolean
  onCardPointTime: (item: DraftPlanItem) => void
  onCardComplete: (item: DraftPlanItem) => void
  onCardReopen: (item: DraftPlanItem) => void
  onCardPrintTicket: (item: DraftPlanItem) => void
}

function PlanningBoardRow(props: PlanningBoardRowProps) {
  const {
    collaboratorId,
    label,
    assigneeWeek,
    weekdayDates,
    visibleDraftItems,
    backlogExecutionLookup,
    capacityRows,
    todayInDisplayedWeek,
    todayIso,
    onMoveUp,
    onMoveDown,
    onRemove,
    canAlterConveyor,
    cardActionBusyKey,
    isPrinting,
    onCardPointTime,
    onCardComplete,
    onCardReopen,
    onCardPrintTicket,
  } = props

  return (
    <tr>
      <td className="align-top">
        <p className="text-[13px] font-medium text-slate-200">{label}</p>
        {assigneeWeek && assigneeWeek.totalMinutes > 0 ? (
          <p className="mt-1 text-[10px] text-slate-500">
            {formatPlanningMinutes(assigneeWeek.totalMinutes)} na semana
            {assigneeWeek.itemsCount > 0
              ? ` · ${assigneeWeek.itemsCount} atividade${assigneeWeek.itemsCount === 1 ? '' : 's'}`
              : ''}
          </p>
        ) : null}
      </td>
      {weekdayDates.map((d) => {
        const cellItems = visibleDraftItems
          .filter((it) => it.assignedCollaboratorId === collaboratorId && it.plannedDate === d)
          .sort((a, b) => a.plannedOrder - b.plannedOrder)
        const cap = capacityRows.find((r) => r.collaboratorId === collaboratorId && r.date === d)
        const plannedSum = sumPlanningItemMinutes(cellItems)
        const capacityState = resolvePlanningCapacityState(plannedSum, cap?.capacityMinutes)
        const isTodayCol = Boolean(todayInDisplayedWeek && d === todayIso)
        return (
          <td
            key={d}
            className={isTodayCol ? 'align-top rounded-lg bg-sgp-gold/[0.02]' : 'align-top'}
          >
            <PlanDayDropZone
              collaboratorId={collaboratorId}
              plannedDate={d}
              isTodayColumn={isTodayCol}
            >
              {capacityState === 'over_capacity' && cap ? (
                <p className="mb-1 text-[10px] font-medium text-amber-200/90">
                  {formatPlanningCapacityExceededMessage(plannedSum, cap.capacityMinutes)}
                </p>
              ) : null}
              <p className="mb-2 text-[10px] text-slate-500">
                {formatPlanningMinutes(plannedSum)} planejados
                {cap && capacityState !== 'unknown'
                  ? ` · capacidade ${formatPlanningMinutes(cap.capacityMinutes)}`
                  : ''}
              </p>
              <div className="space-y-2">
                {cellItems.length === 0 ? (
                  <p className="py-4 text-center text-[10px] leading-relaxed text-slate-600">
                    Nenhuma atividade planejada para este dia.
                  </p>
                ) : (
                  cellItems.map((it, idx) => (
                    <PlanScheduledCard
                      key={it.localKey}
                      order={idx + 1}
                      item={it}
                      backlogExecutionLookup={backlogExecutionLookup}
                      canAlterConveyor={canAlterConveyor}
                      actionBusy={cardActionBusyKey === it.localKey}
                      isPrinting={isPrinting}
                      onMoveUp={() => onMoveUp(it.localKey)}
                      onMoveDown={() => onMoveDown(it.localKey)}
                      onRemove={() => onRemove(it.localKey)}
                      onPointTime={() => onCardPointTime(it)}
                      onComplete={() => onCardComplete(it)}
                      onReopen={() => onCardReopen(it)}
                      onPrintTicket={() => onCardPrintTicket(it)}
                    />
                  ))
                )}
              </div>
            </PlanDayDropZone>
          </td>
        )
      })}
    </tr>
  )
}

function PlanDayDropZone(props: {
  collaboratorId: string
  plannedDate: string
  isTodayColumn: boolean
  children: React.ReactNode
}) {
  const id = dragCellId(props.collaboratorId, props.plannedDate)
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={[
        'min-h-[140px] rounded-xl border p-2',
        props.isTodayColumn
          ? 'border-sgp-gold/20 bg-sgp-gold/[0.04]'
          : 'border-white/[0.06] bg-white/[0.02]',
        isOver ? 'ring-2 ring-sgp-gold/35' : '',
      ].join(' ')}
    >
      {props.children}
    </div>
  )
}

export function OperationalPlanningPage() {
  const { can } = useAuth()
  const canAlterConveyor = can('conveyors.create')

  const [weekMonday, setWeekMonday] = useState(() => mondayOfWeekContainingLocal(new Date()))
  const weekFriday = useMemo(() => fridayAfterMonday(weekMonday), [weekMonday])

  const [weekPayload, setWeekPayload] = useState<OperationalPlanningWeekPayload | null>(null)
  const [draftItems, setDraftItems] = useState<DraftPlanItem[]>([])
  const savedDraftJsonRef = useRef<string>('')

  const [backlogItems, setBacklogItems] = useState<OperationalPlanningBacklogItem[]>([])
  const [factoryIntakeItems, setFactoryIntakeItems] = useState<
    OperationalPlanningFactoryIntakeItem[]
  >([])
  const [sidePanelTab, setSidePanelTab] = useState<SidePanelTab>('backlog')
  const [weekActivityItems, setWeekActivityItems] = useState<OperationalPlanningWeekActivityItem[]>(
    [],
  )
  const [weekActivityError, setWeekActivityError] = useState<string | null>(null)
  const [weekActivityLoading, setWeekActivityLoading] = useState(false)
  const [historyFilters, setHistoryFilters] = useState<PlanningWeekActivityFilters>(
    () => ({ ...DEFAULT_PLANNING_WEEK_ACTIVITY_FILTERS }),
  )
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])

  const [backlogQ, setBacklogQ] = useState('')
  const [factoryIntakeFilters, setFactoryIntakeFilters] = useState<FactoryIntakeFilters>(
    () => ({ ...DEFAULT_FACTORY_INTAKE_FILTERS }),
  )
  const [boardCollabQ, setBoardCollabQ] = useState('')
  const [planningFilters, setPlanningFilters] = useState<PlanningBoardFilters>(
    () => ({ ...DEFAULT_PLANNING_BOARD_FILTERS }),
  )
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalBacklogItem, setModalBacklogItem] = useState<OperationalPlanningBacklogItem | null>(
    null,
  )
  const [modalFactoryIntakeItem, setModalFactoryIntakeItem] =
    useState<OperationalPlanningFactoryIntakeItem | null>(null)
  const [modalCollaboratorId, setModalCollaboratorId] = useState('')
  const [modalDay, setModalDay] = useState('')
  const [modalMinutes, setModalMinutes] = useState<number>(60)

  const capacityRowsForAlert = useMemo(
    () => weekPayload?.capacityByCollaboratorDay ?? [],
    [weekPayload?.capacityByCollaboratorDay],
  )
  const collaboratorNameById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of collaborators) map[c.id] = c.fullName
    return map
  }, [collaborators])
  const capacityExceededAlert = usePlanningCapacityExceededAlert(
    capacityRowsForAlert,
    collaboratorNameById,
  )

  const [quickTimeEntryOpen, setQuickTimeEntryOpen] = useState(false)
  const [quickTimeEntryCandidate, setQuickTimeEntryCandidate] =
    useState<TimeEntryCandidateItem | null>(null)
  const [cardActionBusyKey, setCardActionBusyKey] = useState<string | null>(null)
  const [planningViewMode, setPlanningViewMode] = useState<PlanningViewMode>('week')
  const [dailySelectedDay, setDailySelectedDay] = useState<PlanningDailySelectedDay>('week')
  const {
    currentSheet,
    printProgress,
    isPrinting,
    agentStatus,
    agentFallbackNotice,
    testPrintLoading,
    requestPrint: requestTicketPrint,
    cancelPrint,
    clearAgentFallbackNotice,
    testThermalPrinter,
  } = useActivityTicketPrint()

  const weekdayDates = useMemo(
    () => weekPayload?.week.weekdayDates ?? [],
    [weekPayload?.week.weekdayDates],
  )
  const dayLabels = weekdayLabelsPt()

  const plannedActivityIds = useMemo(
    () => new Set(draftItems.map((i) => i.activityNodeId)),
    [draftItems],
  )

  const dirty = useMemo(() => {
    try {
      return JSON.stringify(draftItems) !== savedDraftJsonRef.current
    } catch {
      return true
    }
  }, [draftItems])

  useEffect(() => {
    if (dirty) setSuccessMsg(null)
  }, [dirty])

  useRegisterTransientContext({
    id: 'operational-planning-week',
    isDirty: () => dirty,
    onReset: () => {
      try {
        const parsed = JSON.parse(savedDraftJsonRef.current) as DraftPlanItem[]
        setDraftItems(parsed)
      } catch {
        /* noop */
      }
    },
  })

  const loadWeekActivity = useCallback(async (weekStart: string) => {
    setWeekActivityLoading(true)
    setWeekActivityError(null)
    try {
      const res = await getOperationalPlanningWeekActivity(weekStart)
      setWeekActivityItems(res.data)
    } catch (e) {
      reportClientError(e, { module: 'operational-planning', action: 'load_week_activity' })
      setWeekActivityItems([])
      setWeekActivityError('Não foi possível carregar o histórico desta semana.')
    } finally {
      setWeekActivityLoading(false)
    }
  }, [])

  const loadWeek = useCallback(async () => {
    setBusy(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const w = await getOperationalPlanningWeek(weekMonday)
      setWeekPayload(w)
      setWeekMonday(w.week.weekStartDate)
      if (w.plan?.items?.length) {
        const d = w.plan.items.map(planItemToDraft)
        setDraftItems(d)
        savedDraftJsonRef.current = JSON.stringify(d)
      } else {
        setDraftItems([])
        savedDraftJsonRef.current = JSON.stringify([])
      }
      void loadWeekActivity(w.week.weekStartDate)
    } catch (e) {
      reportClientError(e, { module: 'operational-planning', action: 'load_week' })
      setErrorMsg('Não foi possível carregar o plano da semana.')
    } finally {
      setBusy(false)
    }
  }, [weekMonday, loadWeekActivity])

  const loadBacklog = useCallback(async () => {
    try {
      const b = await listOperationalPlanningBacklog({
        q: backlogQ,
        limit: 100,
      })
      setBacklogItems(b.items)
    } catch (e) {
      reportClientError(e, { module: 'operational-planning', action: 'load_backlog' })
    }
  }, [backlogQ])

  const loadFactoryIntake = useCallback(async () => {
    try {
      const data = await getFactoryIntakeItems(weekMonday)
      setFactoryIntakeItems(data.items)
    } catch (e) {
      reportClientError(e, { module: 'operational-planning', action: 'load_factory_intake' })
    }
  }, [weekMonday])

  useEffect(() => {
    void loadWeek()
  }, [loadWeek])

  useEffect(() => {
    void loadBacklog()
    void loadFactoryIntake()
  }, [loadBacklog, loadFactoryIntake])

  const refreshPlanningExecutionData = useCallback(async () => {
    try {
      const w = await getOperationalPlanningWeek(weekMonday)
      setWeekPayload(w)
      if (w.plan?.items?.length) {
        const serverDrafts = w.plan.items.map(planItemToDraft)
        setDraftItems((prev) => {
          try {
            const isDirty = JSON.stringify(prev) !== savedDraftJsonRef.current
            if (!isDirty) {
              savedDraftJsonRef.current = JSON.stringify(serverDrafts)
              return serverDrafts
            }
            return mergePlanningExecutionFromServerItems(prev, w.plan!.items)
          } catch {
            return mergePlanningExecutionFromServerItems(prev, w.plan!.items)
          }
        })
      }
      void loadBacklog()
      void loadWeekActivity(weekMonday)
    } catch (e) {
      reportClientError(e, { module: 'operational-planning', action: 'refresh_execution' })
    }
  }, [weekMonday, loadBacklog, loadWeekActivity])

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
            (c) => c.conveyorId === item.conveyorId && c.stepNodeId === item.activityNodeId,
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
        reportClientError(e, { module: 'operational-planning', action: 'card_complete_step' })
        const detail = e instanceof ApiError ? e.message : null
        setErrorMsg(detail ?? 'Não foi possível concluir a atividade.')
      } finally {
        setCardActionBusyKey(null)
      }
    },
    [canAlterConveyor, refreshPlanningExecutionData],
  )

  const handleCardReopen = useCallback(
    async (item: DraftPlanItem) => {
      if (!canReopenPlanningStep(item.activityOperationalStatus, canAlterConveyor)) return
      setCardActionBusyKey(item.localKey)
      setErrorMsg(null)
      try {
        if (!window.confirm('Confirmar reabertura desta atividade?')) return
        const noteRaw = window.prompt('Observação (opcional):')
        const note =
          noteRaw != null && noteRaw.trim().length > 0
            ? noteRaw.trim().slice(0, 2000)
            : undefined
        await reopenConveyorStep(item.conveyorId, item.activityNodeId, { note })
        setSuccessMsg('Atividade reaberta.')
        await refreshPlanningExecutionData()
      } catch (e) {
        reportClientError(e, { module: 'operational-planning', action: 'card_reopen_step' })
        const detail = e instanceof ApiError ? e.message : null
        setErrorMsg(detail ?? 'Não foi possível reabrir a atividade.')
      } finally {
        setCardActionBusyKey(null)
      }
    },
    [canAlterConveyor, refreshPlanningExecutionData],
  )

  useEffect(() => {
    void (async () => {
      try {
        const rows = await collaboratorsApi.listCollaborators({ status: 'active' })
        setCollaborators(rows)
      } catch (e) {
        reportClientError(e, { module: 'operational-planning', action: 'load_collaborators' })
      }
    })()
  }, [])

  const filteredCollaborators = useMemo(() => {
    const q = boardCollabQ.trim().toLowerCase()
    if (!q) return collaborators
    return collaborators.filter((c) => c.fullName.toLowerCase().includes(q))
  }, [collaborators, boardCollabQ])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function openAddModal(item: OperationalPlanningBacklogItem) {
    setModalFactoryIntakeItem(null)
    setModalBacklogItem(item)
    const suggestedCollabId =
      item.assignedCollaborators?.[0]?.id &&
      collaborators.some((c) => c.id === item.assignedCollaborators[0].id)
        ? item.assignedCollaborators[0].id
        : (collaborators[0]?.id ?? '')
    setModalCollaboratorId(suggestedCollabId)
    setModalDay(weekdayDates[0] ?? weekMonday)
    setModalMinutes(Math.max(1, item.pendingMinutes || item.plannedMinutes || 60))
    setModalOpen(true)
  }

  function openAddFactoryIntakeModal(item: OperationalPlanningFactoryIntakeItem) {
    setModalBacklogItem(null)
    setModalFactoryIntakeItem(item)
    const suggestedCollab =
      item.plannedCollaboratorId && collaborators.some((c) => c.id === item.plannedCollaboratorId)
        ? item.plannedCollaboratorId
        : (collaborators[0]?.id ?? '')
    setModalCollaboratorId(suggestedCollab)
    const suggestedDay =
      item.plannedDate && weekdayDates.includes(item.plannedDate)
        ? item.plannedDate
        : (weekdayDates[0] ?? weekMonday)
    setModalDay(suggestedDay)
    setModalMinutes(Math.max(1, item.plannedMinutes ?? 60))
    setModalOpen(true)
  }

  function confirmAddFromModal() {
    if (!modalCollaboratorId || !modalDay) return

    if (modalFactoryIntakeItem) {
      if (plannedActivityIds.has(modalFactoryIntakeItem.activityNodeId)) {
        setModalOpen(false)
        setModalFactoryIntakeItem(null)
        return
      }
      const name =
        collaborators.find((c) => c.id === modalCollaboratorId)?.fullName ?? null
      const cellItems = draftItems.filter(
        (d) => d.assignedCollaboratorId === modalCollaboratorId && d.plannedDate === modalDay,
      )
      const nextOrder =
        cellItems.length === 0 ? 0 : Math.max(...cellItems.map((c) => c.plannedOrder)) + 1
      const fi = modalFactoryIntakeItem
      const nextItem: DraftPlanItem = {
        localKey: newLocalKey(),
        conveyorId: fi.conveyorId,
        activityNodeId: fi.activityNodeId,
        conveyorTitle: fi.conveyorName,
        activityTitle: fi.activityTitle,
        taskTitle: fi.taskTitle,
        sectorTitle: fi.sectorTitle,
        assignedCollaboratorId: modalCollaboratorId,
        assignedCollaboratorName: name,
        assignedTeamId: fi.plannedTeamId,
        plannedDate: modalDay,
        plannedOrder: nextOrder,
        plannedMinutes: modalMinutes,
        notes: null,
        conveyorOperationalPlanItemId: fi.conveyorOperationalPlanItemId,
        realizedMinutes: fi.realizedMinutes,
        activityOperationalStatus: fi.activityOperationalStatus,
      }
      const previous = draftItems
      const next = recalculateOrders([...previous, nextItem])
      setDraftItems(next)
      setModalOpen(false)
      setModalFactoryIntakeItem(null)
      capacityExceededAlert.notifyIfNeeded(previous, next)
      return
    }

    if (!modalBacklogItem) return
    if (plannedActivityIds.has(modalBacklogItem.activityNodeId)) {
      setModalOpen(false)
      return
    }
    const name =
      collaborators.find((c) => c.id === modalCollaboratorId)?.fullName ?? null
    const cellItems = draftItems.filter(
      (d) => d.assignedCollaboratorId === modalCollaboratorId && d.plannedDate === modalDay,
    )
    const nextOrder =
      cellItems.length === 0 ? 0 : Math.max(...cellItems.map((c) => c.plannedOrder)) + 1
    const nextItem: DraftPlanItem = {
      localKey: newLocalKey(),
      conveyorId: modalBacklogItem.conveyorId,
      activityNodeId: modalBacklogItem.activityNodeId,
      conveyorTitle: modalBacklogItem.conveyorTitle,
      activityTitle: modalBacklogItem.activityTitle,
      taskTitle: modalBacklogItem.taskTitle,
      sectorTitle: modalBacklogItem.sectorTitle,
      assignedCollaboratorId: modalCollaboratorId,
      assignedCollaboratorName: name,
      plannedDate: modalDay,
      plannedOrder: nextOrder,
      plannedMinutes: modalMinutes,
      notes: null,
      isOutOfSequence: modalBacklogItem.isOutOfSequence,
      realizedMinutes: modalBacklogItem.realizedMinutes,
    }
    const previous = draftItems
    const next = recalculateOrders([...previous, nextItem])
    setDraftItems(next)
    setModalOpen(false)
    setModalBacklogItem(null)
    capacityExceededAlert.notifyIfNeeded(previous, next)
  }

  const applyPlanningWeekFromServer = useCallback(
    (out: OperationalPlanningWeekPayload) => {
      setWeekPayload(out)
      setWeekMonday(out.week.weekStartDate)
      if (out.plan?.items?.length) {
        const d = out.plan.items.map(planItemToDraft)
        setDraftItems(d)
        savedDraftJsonRef.current = JSON.stringify(d)
      } else {
        setDraftItems([])
        savedDraftJsonRef.current = JSON.stringify([])
      }
      void loadWeekActivity(out.week.weekStartDate)
    },
    [loadWeekActivity],
  )

  const persistPublishedPlanItems = useCallback(
    async (items: DraftPlanItem[]) => {
      if (!weekPayload?.plan || !shouldAutoPersistPlanChanges(weekPayload)) return
      const { weekStartDate, weekEndDate } = resolvePlanningSaveWeekDates(weekPayload)
      const body = buildSavePayload(weekStartDate, weekEndDate, items)
      setBusy(true)
      setErrorMsg(null)
      try {
        const out = await saveOperationalPlanningWeek(body)
        applyPlanningWeekFromServer(out)
        setSuccessMsg(SAVE_REVISION_SUCCESS_MESSAGE)
        void loadBacklog()
        void loadFactoryIntake()
      } catch (e) {
        reportClientError(e, { module: 'operational-planning', action: 'save_published_remove' })
        setErrorMsg(
          resolvePlanningSaveErrorMessage(
            e,
            'Não foi possível salvar a revisão do plano.',
          ),
        )
        void loadWeek()
      } finally {
        setBusy(false)
      }
    },
    [weekPayload, loadBacklog, loadFactoryIntake, loadWeek, applyPlanningWeekFromServer],
  )

  function removeDraft(localKey: string) {
    setDraftItems((prev) => {
      const next = prev.filter((p) => p.localKey !== localKey)
      if (shouldAutoPersistPlanChanges(weekPayload)) {
        void persistPublishedPlanItems(next)
      }
      return next
    })
  }

  function moveOrder(localKey: string, dir: -1 | 1) {
    setDraftItems((prev) => {
      const idx = prev.findIndex((p) => p.localKey === localKey)
      if (idx < 0) return prev
      const cur = prev[idx]!
      const sameCell = prev.filter(
        (p) =>
          p.assignedCollaboratorId === cur.assignedCollaboratorId &&
          p.plannedDate === cur.plannedDate,
      )
      const sorted = [...sameCell].sort((a, b) => a.plannedOrder - b.plannedOrder)
      const pos = sorted.findIndex((s) => s.localKey === localKey)
      const swapWith = sorted[pos + dir]
      if (!swapWith) return prev
      const next = prev.map((p) => {
        if (p.localKey === cur.localKey) return { ...p, plannedOrder: swapWith.plannedOrder }
        if (p.localKey === swapWith.localKey) return { ...p, plannedOrder: cur.plannedOrder }
        return p
      })
      return recalculateOrders(next)
    })
  }

  /**
   * Salva o rascunho atual (mesma lógica de `handleSaveDraft`) e devolve o payload salvo
   * (ou `null` em caso de erro) — reaproveitado pelo fluxo "Salvar e exportar" do Excel.
   */
  async function persistDraft(): Promise<OperationalPlanningWeekPayload | null> {
    if (!weekPayload) return null
    const { weekStartDate, weekEndDate } = resolvePlanningSaveWeekDates(weekPayload)
    const body = buildSavePayload(weekStartDate, weekEndDate, draftItems)
    setBusy(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const out = await saveOperationalPlanningWeek(body)
      applyPlanningWeekFromServer(out)
      setSuccessMsg(resolvePlanningSaveSuccessMessage(resolvePlanningRevisionContext(out)))
      void loadBacklog()
      void loadFactoryIntake()
      return out
    } catch (e) {
      reportClientError(e, { module: 'operational-planning', action: 'save_week' })
      const isPublished = weekPayload.plan?.status === 'PUBLISHED'
      setErrorMsg(
        resolvePlanningSaveErrorMessage(
          e,
          isPublished
            ? 'Não foi possível salvar as alterações no plano ativo.'
            : 'Não foi possível salvar o rascunho.',
        ),
      )
      return null
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveDraft() {
    await persistDraft()
  }

  const [isExporting, setIsExporting] = useState(false)

  async function handleExportExcel() {
    if (isExporting || busy) return
    if (draftItems.length === 0) return
    setIsExporting(true)
    try {
      const weekStartDate = resolveOperationalPlanningExportWeekStart(
        weekPayload?.week.weekStartDate,
        weekMonday,
      )
      await runOperationalPlanningExportFlow({
        dirty,
        weekStartDate,
        persistDraft,
        exportWeek: exportOperationalPlanningWeekToExcel,
      })
    } catch (e) {
      reportClientError(e, { module: 'operational-planning', action: 'export_week_excel' })
      setErrorMsg(
        e instanceof ApiError ? e.message : 'Não foi possível exportar o Excel do planejamento.',
      )
    } finally {
      setIsExporting(false)
    }
  }

  const [isExportingWeeklyView, setIsExportingWeeklyView] = useState(false)

  /** Enquanto uma exportação roda, a outra fica desabilitada — nunca simultâneas. */
  const exportMutualExclusion = resolveOperationalPlanningExportMutualExclusion({
    isExporting,
    isExportingWeeklyView,
  })

  async function handleExportWeeklyView() {
    if (isExportingWeeklyView || isExporting || busy) return
    if (draftItems.length === 0) return
    setIsExportingWeeklyView(true)
    try {
      const weekStartDate = resolveOperationalPlanningWeeklyViewExportWeekStart(
        weekPayload?.week.weekStartDate,
        weekMonday,
      )
      await runOperationalPlanningWeeklyViewExportFlow({
        dirty,
        weekStartDate,
        persistDraft,
        exportWeeklyView: exportOperationalPlanningWeeklyViewToExcel,
      })
    } catch (e) {
      reportClientError(e, { module: 'operational-planning', action: 'export_week_weekly_view_excel' })
      setErrorMsg(
        e instanceof ApiError
          ? e.message
          : 'Não foi possível exportar a visão semanal do planejamento.',
      )
    } finally {
      setIsExportingWeeklyView(false)
    }
  }

  async function handlePublish() {
    if (!weekPayload?.plan || draftItems.length === 0) return
    setBusy(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const out = await publishOperationalPlanningWeek(weekPayload.plan.id)
      applyPlanningWeekFromServer(out)
      void loadBacklog()
      void loadFactoryIntake()
      setSuccessMsg(PUBLISH_SUCCESS_MESSAGE)
    } catch (e) {
      reportClientError(e, { module: 'operational-planning', action: 'publish_week' })
      const detail = e instanceof ApiError ? e.message : null
      setErrorMsg(detail ?? 'Não foi possível publicar o plano.')
    } finally {
      setBusy(false)
    }
  }

  function handleDragEnd(ev: DragEndEvent) {
    const { active, over } = ev
    if (!over) return
    const aid = String(active.id)
    const oid = String(over.id)
    if (!aid.startsWith('bl|')) return
    const activityNodeId = aid.slice(3)
    const cell = parseCellId(oid)
    if (!cell) return
    if (plannedActivityIds.has(activityNodeId)) return
    const bl = backlogItems.find((b) => b.activityNodeId === activityNodeId)
    if (!bl) return
    const name = collaborators.find((c) => c.id === cell.collaboratorId)?.fullName ?? null
    const cellItems = draftItems.filter(
      (d) => d.assignedCollaboratorId === cell.collaboratorId && d.plannedDate === cell.plannedDate,
    )
    const nextOrder =
      cellItems.length === 0 ? 0 : Math.max(...cellItems.map((c) => c.plannedOrder)) + 1
    const nextItem: DraftPlanItem = {
      localKey: newLocalKey(),
      conveyorId: bl.conveyorId,
      activityNodeId: bl.activityNodeId,
      conveyorTitle: bl.conveyorTitle,
      activityTitle: bl.activityTitle,
      taskTitle: bl.taskTitle,
      sectorTitle: bl.sectorTitle,
      assignedCollaboratorId: cell.collaboratorId,
      assignedCollaboratorName: name,
      plannedDate: cell.plannedDate,
      plannedOrder: nextOrder,
      plannedMinutes: Math.max(1, bl.pendingMinutes || bl.plannedMinutes || 60),
      notes: null,
      isOutOfSequence: bl.isOutOfSequence,
      realizedMinutes: bl.realizedMinutes,
    }
    const previous = draftItems
    const next = recalculateOrders([...previous, nextItem])
    setDraftItems(next)
    capacityExceededAlert.notifyIfNeeded(previous, next)
  }

  const summary = weekPayload?.summary

  const visibleBacklogItems = useMemo(
    () => buildVisiblePlanningBacklogItems(backlogItems, draftItems),
    [backlogItems, draftItems],
  )

  const factoryIntakeWeek = useMemo(
    () => ({
      weekMonday,
      weekFriday,
      weekdayDates,
    }),
    [weekMonday, weekFriday, weekdayDates],
  )

  const weekPlanItemsForSync = useMemo(
    () => weekPayload?.plan?.items ?? [],
    [weekPayload?.plan?.items],
  )

  const { unfilteredTotals: factoryIntakeKpiTotals } = useFactoryIntakePanelData({
    intakeItems: factoryIntakeItems,
    draftItems,
    filters: factoryIntakeFilters,
    week: factoryIntakeWeek,
    weekPlanItems: weekPlanItemsForSync,
  })

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
    requestPrint: requestTicketPrint,
  })

  const syncDivergenceCount = useMemo(
    () => countPlanningSyncDivergences(weekPlanItemsForSync),
    [weekPlanItemsForSync],
  )

  const executionOutsidePlanSummary = weekPayload?.executionOutsidePlanSummary ?? {
    totalMinutes: 0,
    entriesCount: 0,
    activitiesCount: 0,
    conveyorsCount: 0,
  }
  const executionOutsidePlanEntries = weekPayload?.executionOutsidePlanEntries ?? []
  const visibleWeekActivityItems = useMemo(
    () => filterPlanningWeekActivityItems(weekActivityItems, historyFilters),
    [weekActivityItems, historyFilters],
  )
  const syncIssueItems = useMemo(
    () => listPlanningSyncIssues(weekPlanItemsForSync),
    [weekPlanItemsForSync],
  )

  const todayIso = useMemo(() => localTodayIsoDate(), [])
  const todayInDisplayedWeek = useMemo(
    () => isIsoDateInWeekdays(todayIso, weekdayDates),
    [todayIso, weekdayDates],
  )

  useEffect(() => {
    setDailySelectedDay(resolveDefaultPlanningDailySelectedDay(weekdayDates, todayIso))
  }, [weekMonday, weekdayDates, todayIso])

  const capacityRows = useMemo(
    () => weekPayload?.capacityByCollaboratorDay ?? [],
    [weekPayload?.capacityByCollaboratorDay],
  )
  const planningFilterOptions = useMemo(
    () =>
      buildPlanningFilterOptions(draftItems, {
        includeOverCapacityState: capacityRows.length > 0,
      }),
    [draftItems, capacityRows],
  )
  const visibleDraftItems = useMemo(
    () => filterPlanningDraftItems(draftItems, planningFilters, capacityRows),
    [draftItems, planningFilters, capacityRows],
  )
  const planningFiltersActive = isPlanningBoardFiltersActive(planningFilters)
  const activeDraftItemsCount = draftItems.length

  const daySummaries = useMemo(
    () => buildPlanningDaySummaries(visibleDraftItems),
    [visibleDraftItems],
  )
  const assigneeSummaryById = useMemo(() => {
    const rows = buildPlanningAssigneeSummaries(visibleDraftItems)
    return new Map(rows.map((r) => [r.assigneeId, r]))
  }, [visibleDraftItems])

  const boardCollaborators = useMemo(() => {
    const fid = planningFilters.collaboratorId
    if (fid === PLANNING_COLLABORATOR_UNASSIGNED) return []
    if (fid && fid !== PLANNING_COLLABORATOR_ALL) {
      return filteredCollaborators.filter((c) => c.id === fid)
    }
    return filteredCollaborators
  }, [filteredCollaborators, planningFilters.collaboratorId])

  const showUnassignedBoardRow = useMemo(() => {
    const fid = planningFilters.collaboratorId
    if (fid === PLANNING_COLLABORATOR_UNASSIGNED) return true
    if (fid && fid !== PLANNING_COLLABORATOR_ALL) return false
    return visibleDraftItems.some((it) => !it.assignedCollaboratorId?.trim())
  }, [planningFilters.collaboratorId, visibleDraftItems])

  const weekOperationalSummary = useMemo(
    () =>
      buildPlanningWeekOperationalSummary(visibleDraftItems, {
        capacityByCollaboratorDay: capacityRows,
        itemsForCapacityCells: draftItems,
      }),
    [visibleDraftItems, capacityRows, draftItems],
  )

  const deviationFilterOptions = useMemo(
    () => (planningFiltersActive ? { filters: planningFilters } : undefined),
    [planningFiltersActive, planningFilters],
  )

  const planningDeviationSummary = useMemo(
    () =>
      buildPlanningDeviationSummary(
        visibleDraftItems,
        executionOutsidePlanSummary,
        executionOutsidePlanEntries,
        deviationFilterOptions,
      ),
    [
      visibleDraftItems,
      executionOutsidePlanSummary,
      executionOutsidePlanEntries,
      deviationFilterOptions,
    ],
  )

  const principalDeviations = useMemo(
    () =>
      buildPlanningDeviationItems(
        visibleDraftItems,
        executionOutsidePlanEntries,
        deviationFilterOptions,
      ),
    [visibleDraftItems, executionOutsidePlanEntries, deviationFilterOptions],
  )

  const outsidePlanDeviationNote = useMemo(() => {
    if (!planningFiltersActive || executionOutsidePlanEntries.length === 0) return null
    const hasStateFilter =
      planningFilters.state === 'no_assignee' || planningFilters.state === 'over_capacity'
    if (hasStateFilter) {
      return 'Fora do plano considera a semana carregada (filtros de estado não se aplicam).'
    }
    if (
      planningFilters.collaboratorId !== PLANNING_COLLABORATOR_ALL ||
      planningFilters.conveyorId !== PLANNING_CONVEYOR_ALL ||
      planningFilters.q.trim() !== ''
    ) {
      return 'Fora do plano respeita filtros de esteira, colaborador e busca.'
    }
    return null
  }, [planningFiltersActive, executionOutsidePlanEntries.length, planningFilters])

  function clearPlanningFilters() {
    setPlanningFilters({ ...DEFAULT_PLANNING_BOARD_FILTERS })
  }

  const ticketBatchSources = useMemo(
    () =>
      resolvePlanningItemsForTicketBatchPrint(visibleDraftItems, {
        viewMode: planningViewMode,
        dailySelectedDay,
      }),
    [visibleDraftItems, planningViewMode, dailySelectedDay],
  )

  const handleCardPrintTicket = useCallback(
    (item: DraftPlanItem) => {
      requestTicketPrint(buildSinglePlanningTicketPrintItems(item, backlogExecutionLookup))
    },
    [backlogExecutionLookup, requestTicketPrint],
  )

  const handlePrintVisibleTickets = useCallback(() => {
    if (ticketBatchSources.length === 0) return
    const inputs = buildActivityTicketInputsFromPlanningSources(
      ticketBatchSources,
      backlogExecutionLookup,
    )
    requestTicketPrint(buildActivityTicketPrintModelsFromPlanningInputs(inputs))
  }, [ticketBatchSources, backlogExecutionLookup, requestTicketPrint])

  const backlogEmptyMessage = useMemo(() => {
    if (visibleBacklogItems.length > 0) return null
    if (backlogItems.length > 0) {
      return 'Todas as atividades carregadas no backlog já foram planejadas nesta semana.'
    }
    if (backlogQ.trim()) {
      return 'Nenhuma atividade encontrada para a busca.'
    }
    return 'Nenhuma atividade disponível no backlog operacional. Esteiras com Plano Operacional enviado à fábrica aparecem em Aguardando encaixe.'
  }, [visibleBacklogItems.length, backlogItems.length, backlogQ])

  const displayedWeekRange = useMemo(() => {
    if (weekPayload) {
      const dates = resolvePlanningSaveWeekDates(weekPayload)
      return { start: dates.weekStartDate, end: dates.weekEndDate }
    }
    return { start: weekMonday, end: weekFriday }
  }, [weekPayload, weekMonday, weekFriday])

  const legacyPlanWeekEndNotice = useMemo(
    () => (weekPayload && hasLegacyPlanWeekEndDate(weekPayload) ? LEGACY_PLAN_WEEK_END_NOTICE : null),
    [weekPayload],
  )

  /** Com abas secundárias ocultas, o painel lateral permanece no backlog. */
  const activeSidePanelTab: SidePanelTab = SHOW_PLANNING_SECONDARY_TABS
    ? sidePanelTab
    : 'backlog'

  return (
    <PageCanvas>
      <div
        data-testid={PLANNING_LAYOUT_TEST_IDS.pageRoot}
        className={PLANNING_PAGE_ROOT_CLASS}
      >
        <div className={PLANNING_UPPER_SECTION_CLASS}>
        <header className="sgp-header-card space-y-5">
          <div className="max-w-3xl">
            <h1 className="sgp-page-title">Planejamento da Semana</h1>
            <p className="sgp-page-lead mt-2">
              Distribua atividades por colaborador e acompanhe a execução diária.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 py-1">
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm text-slate-300 hover:bg-white/[0.06] disabled:opacity-40"
                onClick={() => setWeekMonday((w) => shiftWeek(w, -1))}
                disabled={busy}
                aria-label="Semana anterior"
              >
                ‹
              </button>
              <span className="min-w-[13.5rem] whitespace-nowrap text-center text-[13px] tabular-nums text-slate-200 sm:min-w-[15rem]">
                {displayedWeekRange.start} → {displayedWeekRange.end}
              </span>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm text-slate-300 hover:bg-white/[0.06] disabled:opacity-40"
                onClick={() => setWeekMonday((w) => shiftWeek(w, 1))}
                disabled={busy}
                aria-label="Próxima semana"
              >
                ›
              </button>
            </div>

            <span
              className={[
                'inline-flex shrink-0 rounded-full border px-3 py-1 text-[12px]',
                weekPayload?.plan?.status === 'PUBLISHED'
                  ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
                  : weekPayload?.revision?.hasUnpublishedRevision
                    ? 'border-amber-400/25 bg-amber-500/10 text-amber-100'
                    : 'border-white/[0.08] bg-white/[0.04] text-slate-300',
              ].join(' ')}
            >
              {resolvePlanningStatusBadgeLabel(resolvePlanningRevisionContext(weekPayload))}
            </span>
            {weekPayload?.revision?.hasUnpublishedRevision ? (
              <span className="inline-flex shrink-0 rounded-full border border-amber-400/20 bg-amber-500/5 px-3 py-1 text-[12px] text-amber-100/90">
                {PLAN_UNPUBLISHED_CHANGES_BADGE}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <PlanningWeekTicketsPrintButton
              count={weekTicketSources.length}
              disabled={busy || isPrinting || weekTicketSources.length === 0}
              onClick={openWeekTicketsPrintDialog}
            />
            <OperationalPlanningExportButton
              state={isExporting ? 'exporting' : dirty ? 'dirty' : 'idle'}
              disabled={
                isOperationalPlanningExportActionDisabled({
                  draftItemsCount: draftItems.length,
                  busy,
                }) || exportMutualExclusion.originalBlockedByOther
              }
              onClick={() => void handleExportExcel()}
            />
            <OperationalPlanningWeeklyViewExportButton
              state={isExportingWeeklyView ? 'exporting' : dirty ? 'dirty' : 'idle'}
              disabled={
                isOperationalPlanningWeeklyViewExportActionDisabled({
                  draftItemsCount: draftItems.length,
                  busy,
                }) || exportMutualExclusion.weeklyViewBlockedByOther
              }
              onClick={() => void handleExportWeeklyView()}
            />
            <button
              type="button"
              className="rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-[13px] font-medium text-slate-100 hover:bg-white/[0.09] disabled:opacity-50"
              onClick={() => void handleSaveDraft()}
              disabled={busy || !dirty || !weekPayload}
            >
              {resolvePlanningSaveButtonLabel(weekPayload?.plan?.status)}
            </button>
            <button
              type="button"
              className="rounded-xl border border-sgp-gold/35 bg-sgp-gold/15 px-4 py-2 text-[13px] font-medium text-slate-50 hover:bg-sgp-gold/25 disabled:opacity-50"
              title={resolvePlanningPublishButtonTitle({
                planStatus: weekPayload?.plan?.status,
                draftItemsCount: draftItems.length,
                hasActivePublished: weekPayload?.revision?.hasActivePublished,
              })}
              onClick={() => void handlePublish()}
              disabled={isPlanningPublishDisabled({
                busy,
                dirty,
                draftItemsCount: draftItems.length,
                hasPlan: Boolean(weekPayload?.plan),
                planStatus: weekPayload?.plan?.status,
              })}
            >
              {PUBLISH_BUTTON_LABEL}
            </button>
          </div>

          {weekPayload?.revision?.hasActivePublished || weekPayload?.plan?.status === 'PUBLISHED' ? (
            <p className="max-w-3xl text-[13px] leading-relaxed text-slate-400">
              {PLAN_PUBLISHED_HELPER_TEXT}
            </p>
          ) : null}

          {legacyPlanWeekEndNotice ? (
            <p
              role="status"
              className="max-w-3xl rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[13px] leading-relaxed text-amber-100"
            >
              {legacyPlanWeekEndNotice}
            </p>
          ) : null}

          {successMsg || errorMsg ? (
            <div className="space-y-3 border-t border-white/[0.06] pt-4">
              {successMsg ? (
                <p
                  role="status"
                  aria-live="polite"
                  className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-100"
                >
                  {successMsg}
                </p>
              ) : null}
              {errorMsg ? (
                <p
                  role="alert"
                  className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-100"
                >
                  {errorMsg}
                </p>
              ) : null}
            </div>
          ) : null}
        </header>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Minutos planejados</p>
            <p className="mt-1 text-xl font-semibold text-slate-50">
              {formatPlanningMinutes(summary?.plannedMinutes ?? 0)}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Atividades planejadas</p>
            <p className="mt-1 text-xl font-semibold text-slate-50">
              {planningFiltersActive ? visibleDraftItems.length : (summary?.plannedItems ?? 0)}
            </p>
            {planningFiltersActive ? (
              <p className="mt-1 text-[10px] text-slate-500">
                Total da semana: {summary?.plannedItems ?? 0}
              </p>
            ) : null}
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Colaboradores no plano</p>
            <p className="mt-1 text-xl font-semibold text-slate-50">{summary?.collaboratorsCount ?? 0}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Aguardando encaixe</p>
            <p className="mt-1 text-[13px] font-semibold leading-snug text-slate-50">
              {formatFactoryIntakeKpiLine(factoryIntakeKpiTotals)}
            </p>
          </div>
          {executionOutsidePlanSummary.entriesCount > 0 ? (
            <div className="rounded-xl border border-amber-400/25 bg-amber-500/[0.06] p-4 sm:col-span-2">
              <p className="text-[11px] uppercase tracking-wide text-amber-200/80">
                Fora do planejado
              </p>
              <p className="mt-1 text-xl font-semibold text-amber-100">
                {executionOutsidePlanSummary.entriesCount} apontamento(s) ·{' '}
                {formatPlanningMinutes(executionOutsidePlanSummary.totalMinutes)}
              </p>
              <p className="mt-1 text-[12px] text-slate-500">
                {executionOutsidePlanSummary.activitiesCount} atividade(s) em{' '}
                {executionOutsidePlanSummary.conveyorsCount} esteira(s) — revise na aba Fora do
                planejado.
              </p>
            </div>
          ) : null}
          {syncDivergenceCount > 0 ? (
            <div className="rounded-xl border border-amber-400/25 bg-amber-500/[0.06] p-4 sm:col-span-2 lg:col-span-4">
              <p className="text-[11px] uppercase tracking-wide text-amber-200/80">
                Pendências de sincronização
              </p>
              <p className="mt-1 text-xl font-semibold text-amber-100">
                {syncDivergenceCount} item(ns) divergente(s)
              </p>
              <p className="mt-1 text-[12px] text-slate-500">
                Plano da esteira e planejamento semanal não coincidem — revise na aba Pendências.
              </p>
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-100">Plano semanal</h2>
            <p className="mt-1 text-[12px] text-slate-500">
              Arraste do backlog para uma célula ou use “Adicionar ao plano”.
            </p>
          </div>

          {draftItems.length > 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <p className="text-[12px] font-medium text-slate-400">Filtros do quadro</p>
                {planningFiltersActive ? (
                  <button
                    type="button"
                    className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/[0.07]"
                    onClick={clearPlanningFilters}
                  >
                    Limpar filtros
                  </button>
                ) : null}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <label className="block text-[11px] text-slate-500">
                  Colaborador
                  <select
                    className="mt-1 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-slate-100"
                    value={planningFilters.collaboratorId}
                    onChange={(e) =>
                      setPlanningFilters((f) => ({ ...f, collaboratorId: e.target.value }))
                    }
                  >
                    <option value={PLANNING_COLLABORATOR_ALL}>Todos</option>
                    {planningFilterOptions.hasUnassigned ? (
                      <option value={PLANNING_COLLABORATOR_UNASSIGNED}>Sem responsável</option>
                    ) : null}
                    {planningFilterOptions.collaborators.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[11px] text-slate-500">
                  Esteira
                  <select
                    className="mt-1 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-slate-100"
                    value={planningFilters.conveyorId}
                    onChange={(e) =>
                      setPlanningFilters((f) => ({ ...f, conveyorId: e.target.value }))
                    }
                  >
                    <option value={PLANNING_CONVEYOR_ALL}>Todas as esteiras</option>
                    {planningFilterOptions.conveyors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[11px] text-slate-500">
                  Situação
                  <select
                    className="mt-1 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-slate-100"
                    value={planningFilters.state}
                    onChange={(e) =>
                      setPlanningFilters((f) => ({
                        ...f,
                        state: e.target.value as PlanningBoardFilters['state'],
                      }))
                    }
                  >
                    <option value="all">Todos</option>
                    <option value="no_assignee">Sem responsável</option>
                    {planningFilterOptions.states.includes('over_capacity') ? (
                      <option value="over_capacity">Com capacidade excedida</option>
                    ) : null}
                  </select>
                </label>
                <label className="block text-[11px] text-slate-500">
                  Busca no plano
                  <input
                    className="mt-1 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-600"
                    placeholder="Esteira, atividade, setor…"
                    value={planningFilters.q}
                    onChange={(e) => setPlanningFilters((f) => ({ ...f, q: e.target.value }))}
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="text-[11px] text-slate-500">
                  Exibindo {visibleDraftItems.length} de {activeDraftItemsCount} itens planejados
                  {planningFiltersActive ? ' (visão filtrada)' : ''}
                </p>
                <button
                  type="button"
                  className="rounded-lg border border-white/[0.10] bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-white/[0.08] disabled:opacity-50"
                  title="Imprimir tickets das atividades visíveis no quadro"
                  disabled={busy || isPrinting || ticketBatchSources.length === 0}
                  onClick={handlePrintVisibleTickets}
                >
                  Imprimir tickets visíveis
                  {ticketBatchSources.length > 0 ? ` (${ticketBatchSources.length})` : ''}
                </button>
                {planningViewMode === 'week' ? (
                  <input
                    className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-600"
                    placeholder="Filtrar colaboradores no quadro…"
                    value={boardCollabQ}
                    onChange={(e) => setBoardCollabQ(e.target.value)}
                  />
                ) : null}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                {ACTIVITY_TICKET_PRINT_SUPPORT_MESSAGE}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {ACTIVITY_TICKET_SILENT_PRINT_HINT}
              </p>
              <ThermalPrintAgentControls
                agentStatus={agentStatus}
                fallbackNotice={agentFallbackNotice}
                onDismissFallback={clearAgentFallbackNotice}
                onTestPrint={() => {
                  void testThermalPrinter()
                }}
                testLoading={testPrintLoading}
              />
            </div>
          ) : null}

          {draftItems.length > 0 || executionOutsidePlanSummary.entriesCount > 0 ? (
            <>
              <PlanningWeekOperationalSummaryBar
                summary={weekOperationalSummary}
                filtersActive={planningFiltersActive}
                weekTotalItems={activeDraftItemsCount}
                executionOutsidePlanCount={executionOutsidePlanSummary.entriesCount}
                executionOutsidePlanMinutes={executionOutsidePlanSummary.totalMinutes}
              />
              <PlanningWeekDeviationBar
                summary={planningDeviationSummary}
                filtersActive={planningFiltersActive}
                outsidePlanFilterNote={outsidePlanDeviationNote}
              />
              {SHOW_PLANNING_PRINCIPAL_DEVIATIONS ? (
                <PlanningPrincipalDeviationsPanel
                  deviations={principalDeviations}
                  weekdayDates={weekdayDates}
                />
              ) : null}
            </>
          ) : null}

          {draftItems.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] text-slate-500">Visualização</span>
              <div className="inline-flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-0.5">
                <button
                  type="button"
                  className={[
                    'rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors',
                    planningViewMode === 'week'
                      ? 'bg-white/[0.10] text-slate-100'
                      : 'text-slate-400 hover:text-slate-200',
                  ].join(' ')}
                  onClick={() => setPlanningViewMode('week')}
                >
                  Semana
                </button>
                <button
                  type="button"
                  className={[
                    'rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors',
                    planningViewMode === 'daily'
                      ? 'bg-white/[0.10] text-slate-100'
                      : 'text-slate-400 hover:text-slate-200',
                  ].join(' ')}
                  onClick={() => setPlanningViewMode('daily')}
                >
                  Daily
                </button>
              </div>
            </div>
          ) : null}
        </section>
        </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div
            data-testid={PLANNING_LAYOUT_TEST_IDS.operationalWorkspace}
            className={PLANNING_OPERATIONAL_WORKSPACE_CLASS}
          >
            <section
              data-testid={PLANNING_LAYOUT_TEST_IDS.backlogColumn}
              className={PLANNING_BACKLOG_COLUMN_CLASS}
            >
              {SHOW_PLANNING_SECONDARY_TABS ? (
              <div className="mb-3 flex shrink-0 flex-wrap gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
                <button
                  type="button"
                  className={[
                    'rounded-lg px-2 py-1.5 text-[11px] font-medium sm:flex-1 sm:text-[12px]',
                    activeSidePanelTab === 'backlog'
                      ? 'bg-white/[0.08] text-slate-100'
                      : 'text-slate-500 hover:text-slate-300',
                  ].join(' ')}
                  onClick={() => setSidePanelTab('backlog')}
                >
                  Backlog operacional
                </button>
                <button
                  type="button"
                  className={[
                    'rounded-lg px-2 py-1.5 text-[11px] font-medium sm:flex-1 sm:text-[12px]',
                    activeSidePanelTab === 'factory-intake'
                      ? 'bg-violet-500/15 text-violet-100'
                      : 'text-slate-500 hover:text-slate-300',
                  ].join(' ')}
                  onClick={() => setSidePanelTab('factory-intake')}
                >
                  Aguardando encaixe
                </button>
                <button
                  type="button"
                  className={[
                    'rounded-lg px-2 py-1.5 text-[11px] font-medium sm:flex-1 sm:text-[12px]',
                    activeSidePanelTab === 'sync-pending'
                      ? 'bg-amber-500/15 text-amber-100'
                      : 'text-slate-500 hover:text-slate-300',
                  ].join(' ')}
                  onClick={() => setSidePanelTab('sync-pending')}
                >
                  Pendências
                  {syncDivergenceCount > 0 ? (
                    <span className="ml-1 tabular-nums text-amber-200/90">({syncDivergenceCount})</span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className={[
                    'rounded-lg px-2 py-1.5 text-[11px] font-medium sm:flex-1 sm:text-[12px]',
                    activeSidePanelTab === 'outside-plan'
                      ? 'bg-amber-500/15 text-amber-100'
                      : 'text-slate-500 hover:text-slate-300',
                  ].join(' ')}
                  onClick={() => setSidePanelTab('outside-plan')}
                >
                  Fora do plano
                  {executionOutsidePlanSummary.entriesCount > 0 ? (
                    <span className="ml-1 tabular-nums text-amber-200/90">
                      ({executionOutsidePlanSummary.entriesCount})
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className={[
                    'rounded-lg px-2 py-1.5 text-[11px] font-medium sm:flex-1 sm:text-[12px]',
                    activeSidePanelTab === 'history'
                      ? 'bg-sky-500/15 text-sky-100'
                      : 'text-slate-500 hover:text-slate-300',
                  ].join(' ')}
                  onClick={() => setSidePanelTab('history')}
                >
                  Histórico
                  {weekActivityItems.length > 0 ? (
                    <span className="ml-1 tabular-nums text-sky-200/90">
                      ({weekActivityItems.length})
                    </span>
                  ) : null}
                </button>
              </div>
              ) : null}

              {activeSidePanelTab === 'backlog' ? (
              <>
              <div className="shrink-0 pb-3">
                <h2 className="text-[15px] font-semibold text-slate-100">Backlog operacional</h2>
                <p className="mt-1 text-[12px] text-slate-500">Buscar esteira / atividade</p>
                <div className="mt-3 flex gap-2">
                  <input
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-600"
                    placeholder="Buscar…"
                    value={backlogQ}
                    onChange={(e) => setBacklogQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void loadBacklog()
                    }}
                  />
                  <button
                    type="button"
                    className="shrink-0 rounded-xl border border-white/[0.10] bg-white/[0.06] px-3 py-2 text-[13px] text-slate-100"
                    onClick={() => void loadBacklog()}
                  >
                    Buscar
                  </button>
                </div>
              </div>
              <div
                data-testid={PLANNING_LAYOUT_TEST_IDS.backlogScrollArea}
                className={[PLANNING_BACKLOG_SCROLL_CLASS, 'space-y-3 pr-1'].join(' ')}
              >
                {visibleBacklogItems.map((b) => (
                  <BacklogDraggableCard
                    key={b.activityNodeId}
                    item={b}
                    blocked={plannedActivityIds.has(b.activityNodeId)}
                    onAddClick={() => openAddModal(b)}
                  />
                ))}
                {backlogEmptyMessage ? (
                  <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-4 text-center text-[13px] text-slate-500">
                    {backlogEmptyMessage}
                  </p>
                ) : null}
              </div>
              </>
              ) : activeSidePanelTab === 'factory-intake' ? (
              <div
                data-testid={PLANNING_LAYOUT_TEST_IDS.backlogScrollArea}
                className={[PLANNING_BACKLOG_SCROLL_CLASS, 'space-y-4'].join(' ')}
              >
                <FactoryIntakePanel
                  intakeItems={factoryIntakeItems}
                  draftItems={draftItems}
                  filters={factoryIntakeFilters}
                  onFiltersChange={setFactoryIntakeFilters}
                  week={factoryIntakeWeek}
                  weekPlanItems={weekPlanItemsForSync}
                  plannedActivityIds={plannedActivityIds}
                  onAddItem={openAddFactoryIntakeModal}
                />
              </div>
              ) : activeSidePanelTab === 'sync-pending' ? (
              <div
                data-testid={PLANNING_LAYOUT_TEST_IDS.backlogScrollArea}
                className={PLANNING_BACKLOG_SCROLL_CLASS}
              >
              <PlanningSyncIssuesPanel
                items={syncIssueItems}
                onWeekApplied={async (message) => {
                  setSuccessMsg(message)
                  await loadWeek()
                }}
              />
              </div>
              ) : activeSidePanelTab === 'outside-plan' ? (
              <div
                data-testid={PLANNING_LAYOUT_TEST_IDS.backlogScrollArea}
                className={[PLANNING_BACKLOG_SCROLL_CLASS, 'space-y-4'].join(' ')}
              >
                <PlanningExecutionOutsidePlanPanel
                  entries={executionOutsidePlanEntries}
                  summaryTotalMinutes={executionOutsidePlanSummary.totalMinutes}
                />
              </div>
              ) : (
              <div
                data-testid={PLANNING_LAYOUT_TEST_IDS.backlogScrollArea}
                className={[PLANNING_BACKLOG_SCROLL_CLASS, 'space-y-4'].join(' ')}
              >
                <PlanningWeekHistoryPanel
                  items={visibleWeekActivityItems}
                  filters={historyFilters}
                  onFiltersChange={setHistoryFilters}
                  errorMessage={weekActivityError}
                  loading={weekActivityLoading}
                />
              </div>
              )}
            </section>

            <section
              data-testid={PLANNING_LAYOUT_TEST_IDS.collaboratorsColumn}
              className={PLANNING_COLLABORATORS_COLUMN_CLASS}
            >
              {draftItems.length === 0 ? (
                <p className="mb-3 shrink-0 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[13px] leading-relaxed text-slate-400">
                  Nenhuma atividade planejada nesta semana. Arraste itens do backlog para o quadro
                  ou use “Adicionar ao plano”.
                </p>
              ) : null}

              <div
                data-testid={PLANNING_LAYOUT_TEST_IDS.collaboratorsScrollArea}
                className={PLANNING_COLLABORATORS_SCROLL_CLASS}
              >
              {planningViewMode === 'daily' && draftItems.length > 0 ? (
                <PlanningDailyKanbanView
                  items={visibleDraftItems}
                  weekdayDates={weekdayDates}
                  weekdayLabels={dayLabels}
                  selectedDay={dailySelectedDay}
                  onSelectedDayChange={setDailySelectedDay}
                  todayIso={todayIso}
                  todayInDisplayedWeek={todayInDisplayedWeek}
                  filtersActive={planningFiltersActive}
                  backlogExecutionLookup={backlogExecutionLookup}
                  canAlterConveyor={canAlterConveyor}
                  cardActionBusyKey={cardActionBusyKey}
                  onCardPointTime={(item) => void handleCardPointTime(item as DraftPlanItem)}
                  onCardComplete={(item) => void handleCardComplete(item as DraftPlanItem)}
                  onCardReopen={(item) => void handleCardReopen(item as DraftPlanItem)}
                  onCardPrintTicket={(item) => handleCardPrintTicket(item as DraftPlanItem)}
                />
              ) : null}

              {planningViewMode === 'week' ? (
              <div className="min-w-0">
                <table className="w-full min-w-[900px] border-separate border-spacing-2">
                  <thead>
                    <tr>
                      <th className="sticky top-0 z-[1] w-44 rounded-lg border border-transparent bg-sgp-void/95 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur-sm">
                        Colaborador
                      </th>
                      {dayLabels.map((label, i) => {
                        const dateIso = weekdayDates[i]
                        const isTodayCol = Boolean(
                          todayInDisplayedWeek && dateIso && dateIso === todayIso,
                        )
                        const dayTotal = dateIso ? (daySummaries[dateIso]?.totalMinutes ?? 0) : 0
                        return (
                          <th
                            key={label}
                            className={[
                              'sticky top-0 z-[1] rounded-lg px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm',
                              isTodayCol
                                ? 'border border-sgp-gold/25 bg-sgp-void/95 text-slate-200 ring-1 ring-sgp-gold/20'
                                : 'border border-transparent bg-sgp-void/95 text-slate-500',
                            ].join(' ')}
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span>{label}</span>
                              {isTodayCol ? (
                                <span className="rounded-md border border-sgp-gold/30 bg-sgp-gold/10 px-1.5 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-amber-100/90">
                                  Hoje
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-0.5 font-normal normal-case tracking-normal text-[10px] text-slate-600">
                              {dateIso ?? '—'}
                            </div>
                            <div className="mt-1 font-normal normal-case tracking-normal text-[10px] text-slate-400">
                              {formatPlanningMinutes(dayTotal)} planejadas
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {boardCollaborators.length === 0 && !showUnassignedBoardRow ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[13px] text-slate-500">
                          Nenhum colaborador corresponde ao filtro.
                        </td>
                      </tr>
                    ) : (
                      <>
                        {boardCollaborators.map((c) => (
                          <PlanningBoardRow
                            key={c.id}
                            collaboratorId={c.id}
                            label={c.fullName}
                            assigneeWeek={assigneeSummaryById.get(c.id)}
                            weekdayDates={weekdayDates}
                            visibleDraftItems={visibleDraftItems}
                            backlogExecutionLookup={backlogExecutionLookup}
                            capacityRows={capacityRows}
                            todayInDisplayedWeek={todayInDisplayedWeek}
                            todayIso={todayIso}
                            canAlterConveyor={canAlterConveyor}
                            cardActionBusyKey={cardActionBusyKey}
                            isPrinting={isPrinting}
                            onCardPointTime={handleCardPointTime}
                            onCardComplete={handleCardComplete}
                            onCardReopen={handleCardReopen}
                            onCardPrintTicket={handleCardPrintTicket}
                            onMoveUp={(localKey) => moveOrder(localKey, -1)}
                            onMoveDown={(localKey) => moveOrder(localKey, 1)}
                            onRemove={removeDraft}
                          />
                        ))}
                        {showUnassignedBoardRow ? (
                          <PlanningBoardRow
                            key="__unassigned__"
                            collaboratorId=""
                            label="Sem responsável"
                            assigneeWeek={assigneeSummaryById.get('')}
                            weekdayDates={weekdayDates}
                            visibleDraftItems={visibleDraftItems}
                            backlogExecutionLookup={backlogExecutionLookup}
                            capacityRows={capacityRows}
                            todayInDisplayedWeek={todayInDisplayedWeek}
                            todayIso={todayIso}
                            canAlterConveyor={canAlterConveyor}
                            cardActionBusyKey={cardActionBusyKey}
                            isPrinting={isPrinting}
                            onCardPointTime={handleCardPointTime}
                            onCardComplete={handleCardComplete}
                            onCardReopen={handleCardReopen}
                            onCardPrintTicket={handleCardPrintTicket}
                            onMoveUp={(localKey) => moveOrder(localKey, -1)}
                            onMoveDown={(localKey) => moveOrder(localKey, 1)}
                            onRemove={removeDraft}
                          />
                        ) : null}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
              ) : null}
              </div>
            </section>
          </div>
        </DndContext>
      </div>

      <PlanningCapacityExceededDialog
        open={capacityExceededAlert.open}
        alerts={capacityExceededAlert.alerts}
        onClose={capacityExceededAlert.close}
      />

      {modalOpen && (modalBacklogItem || modalFactoryIntakeItem) ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-slate-950 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-50">Adicionar ao plano</h3>
            {modalFactoryIntakeItem ? (
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-violet-300">
                Plano da Esteira
              </p>
            ) : null}
            <p className="mt-2 text-[13px] text-slate-400">
              {modalFactoryIntakeItem?.activityTitle ?? modalBacklogItem?.activityTitle}
            </p>
            {modalFactoryIntakeItem?.conveyorName ? (
              <p className="mt-1 text-[12px] text-slate-500">{modalFactoryIntakeItem.conveyorName}</p>
            ) : null}
            <label className="mt-4 block text-[12px] text-slate-500">
              Colaborador
              <select
                className="mt-1 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-slate-100"
                value={modalCollaboratorId}
                onChange={(e) => setModalCollaboratorId(e.target.value)}
              >
                {collaborators.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.fullName}
                  </option>
                ))}
              </select>
            </label>
            {modalBacklogItem && modalBacklogItem.assignedCollaborators.length > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Cadastrados na atividade:</span>
                {modalBacklogItem.assignedCollaborators.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setModalCollaboratorId(c.id)}
                    className={[
                      'rounded-lg px-2 py-0.5 text-[11px] transition-colors',
                      modalCollaboratorId === c.id
                        ? 'bg-[var(--gold,#c9a227)]/20 text-[var(--gold,#c9a227)] ring-1 ring-[var(--gold,#c9a227)]/40'
                        : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.10]',
                    ].join(' ')}
                  >
                    {c.fullName}
                  </button>
                ))}
              </div>
            ) : null}
            <label className="mt-3 block text-[12px] text-slate-500">
              Dia
              <select
                className="mt-1 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-slate-100"
                value={modalDay}
                onChange={(e) => setModalDay(e.target.value)}
              >
                {weekdayDates.map((d, i) => (
                  <option key={d} value={d}>
                    {dayLabels[i]} ({d})
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-[12px] text-slate-500">
              Minutos planejados
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-slate-100"
                value={modalMinutes}
                onChange={(e) => setModalMinutes(Number(e.target.value))}
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-white/[0.08] px-4 py-2 text-[13px] text-slate-300"
                onClick={() => {
                  setModalOpen(false)
                  setModalBacklogItem(null)
                  setModalFactoryIntakeItem(null)
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-xl border border-sgp-gold/35 bg-sgp-gold/15 px-4 py-2 text-[13px] font-medium text-slate-50"
                onClick={() => confirmAddFromModal()}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

