/* eslint-disable react-hooks/refs -- @dnd-kit useSortable */
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMemo, useState, type CSSProperties, type Dispatch, type PointerEvent, type ReactNode, type SetStateAction } from 'react'
import { formatMinutosHumanos } from '../../lib/formatters'
import { matrixUxNodeLabel } from './matrixServiceUx'
import { matrixPreviewActivityInfoFlags } from './operationMatrixPreviewEdits'
import { MacroPreviewInlineNodeName } from './MacroPreviewInlineNodeName'
import { isPreviewPendingNodeId } from './operationMatrixPreviewStructureCreate'
import type {
  MacroActivityRow,
  MacroSectorBlock,
  MacroTaskBlock,
  OperationMatrixMacroPreviewModel,
} from './operationMatrixPreviewMapper'
import {
  collapseAllIds,
  collectMacroSectorIds,
  collectMacroTaskIds,
  createCollapsedIdSet,
  hasAnyCollapsed,
  isIdCollapsed,
  macroSectorActivitiesRegionId,
  macroTaskSectorsRegionId,
  toggleCollapsedId,
  type CollapsedIdSet,
} from './operationMatrixMacroViewCollapse'
import { MACRO_PREVIEW_TASK_DRAG_ACTIVATOR_ATTR } from './operationMatrixMacroViewTaskDnD'
import {
  canMacroPreviewActivityDrop,
  MACRO_PREVIEW_ACTIVITY_DRAG_ACTIVATOR_ATTR,
  macroPreviewActivitySortableId,
  type MacroPreviewActivityDragData,
} from './operationMatrixMacroViewActivityDnD'
import {
  canMacroPreviewSectorDrop,
  MACRO_PREVIEW_SECTOR_DRAG_ACTIVATOR_ATTR,
  macroPreviewSectorSortableId,
  type MacroPreviewDragData,
} from './operationMatrixMacroViewSectorDnD'
import { MacroPreviewInlineNameSaveProvider } from './MacroPreviewInlineNameSaveContext'
import type { InlineNameSaveRegistry } from './macroPreviewInlineNameSave'
import {
  MatrixActionsMenuProvider,
  MatrixContextActionsMenu,
} from './MatrixContextActionsMenu'
import { confirmPreviewStructureRemoval } from './operationMatrixPreviewStructureCreate'

type Props = {
  model: OperationMatrixMacroPreviewModel
  inlineNameSaveRegistry?: InlineNameSaveRegistry
  edit?: {
    teams: { id: string; name: string }[]
    teamsListFailed: boolean
    onPatchActivity: (
      activityId: string,
      patch: Partial<{
        plannedMinutes: number | null
        teamIds: string[]
      }>,
    ) => void
    onPatchNodeName?: (nodeId: string, name: string) => void
    onAddTask?: () => string | null
    onAddSector?: (taskId: string) => string | null
    onAddActivity?: (taskId: string, sectorId: string) => string | null
    onCancelPendingCreate?: (nodeId: string) => void
    onRemoveStructureNode?: (nodeId: string) => void
    bornInEditNodeId?: string | null
    onConsumeBornInEdit?: (nodeId: string) => void
    onReorderTasks?: (activeId: string, overId: string) => void
    onReorderSectors?: (taskId: string, activeSectorId: string, overSectorId: string) => void
    onReorderActivities?: (
      taskId: string,
      sectorId: string,
      activeActivityId: string,
      overActivityId: string,
    ) => void
  }
}

function SummaryCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-100">{value}</p>
    </div>
  )
}

const matrixPreviewInfoRowClass =
  'border-amber-300/90 bg-[#FFFBEB] text-amber-950 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-200/95'

const matrixPreviewInfoBadgeClass =
  'max-w-full whitespace-normal break-words rounded border border-amber-300/80 bg-amber-100/80 px-1.5 py-0.5 text-left text-[9px] font-medium leading-snug text-amber-950 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-100/90'

const macroPreviewExpandButtonClass =
  'shrink-0 rounded-lg border border-white/12 bg-white/[0.02] px-2.5 py-1 text-[11px] font-medium text-slate-300 outline-none transition hover:border-white/18 hover:bg-white/[0.05] focus-visible:border-sgp-gold/35 focus-visible:ring-2 focus-visible:ring-sgp-gold/30'

const macroPreviewAddButtonClass =
  'rounded-lg border border-dashed border-white/12 bg-white/[0.02] px-3 py-1.5 text-[11px] font-medium text-slate-300 outline-none transition hover:border-white/18 hover:bg-white/[0.05] focus-visible:border-sgp-gold/35 focus-visible:ring-2 focus-visible:ring-sgp-gold/30'

const macroPreviewDragHandleClass = 'cursor-grab touch-none active:cursor-grabbing'

function ensureNodeExpanded(
  setter: Dispatch<SetStateAction<CollapsedIdSet>>,
  id: string,
) {
  setter((prev) => (isIdCollapsed(prev, id) ? toggleCollapsedId(prev, id) : prev))
}

const macroArticleClass =
  'overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]'

type MacroPreviewDragHandleProps = {
  setActivatorNodeRef: (element: HTMLElement | null) => void
  attributes: ReturnType<typeof useSortable>['attributes']
  listeners: ReturnType<typeof useSortable>['listeners']
}

function PencilMini({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MacroPreviewActivityRow({
  activity,
  edit,
  dragHandle,
  sortableLiRef,
  sortableLiStyle,
  onNameEditingChange,
}: {
  activity: MacroActivityRow
  edit: NonNullable<Props['edit']>
  dragHandle?: MacroPreviewDragHandleProps
  sortableLiRef?: (element: HTMLLIElement | null) => void
  sortableLiStyle?: CSSProperties
  onNameEditingChange?: (editing: boolean) => void
}) {
  const [timeOpen, setTimeOpen] = useState(false)
  const [timeDraft, setTimeDraft] = useState('')

  const stopDragOnControl = (event: PointerEvent) => {
    event.stopPropagation()
  }

  const sortedTeams = useMemo(
    () => [...edit.teams].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [edit.teams],
  )

  const openTimeEditor = () => {
    setTimeDraft(activity.plannedMinutes != null ? String(activity.plannedMinutes) : '')
    setTimeOpen(true)
  }

  const commitTimeDraft = () => {
    const raw = timeDraft.trim()
    if (raw === '') {
      edit.onPatchActivity(activity.id, { plannedMinutes: null })
      setTimeOpen(false)
      return
    }
    if (!/^\d+$/.test(raw)) {
      setTimeOpen(false)
      return
    }
    const n = Number.parseInt(raw, 10)
    if (n < 0) {
      setTimeOpen(false)
      return
    }
    edit.onPatchActivity(activity.id, { plannedMinutes: n })
    setTimeOpen(false)
  }

  const info = matrixPreviewActivityInfoFlags(activity.plannedMinutes, activity.teamIds)
  const infoHighlight = info.missingEffectiveTime || info.missingDefaultTeam

  const timeDisplay =
    activity.plannedMinutes != null ? (
      <span className="tabular-nums">{formatMinutosHumanos(activity.plannedMinutes)}</span>
    ) : (
      <span className={infoHighlight ? 'opacity-75' : 'text-slate-600 dark:opacity-90'}>—</span>
    )

  const primaryTeamId = activity.teamIds[0] ?? ''

  return (
    <li
      ref={sortableLiRef}
      style={sortableLiStyle}
      className={[
        'box-border grid w-full min-w-0 max-w-full grid-cols-1 gap-x-3 gap-y-2 overflow-hidden rounded-lg border px-3 py-2.5 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-y-2',
        infoHighlight ? matrixPreviewInfoRowClass : 'border-white/[0.05] bg-sgp-void/40',
      ].join(' ')}
    >
      {edit.onPatchNodeName ? (
        <MacroPreviewInlineNodeName
          nodeId={activity.id}
          name={activity.name}
          onCommit={edit.onPatchNodeName}
          onEditingChange={onNameEditingChange}
          textClassName={
            infoHighlight
              ? 'min-w-0 max-w-full break-words font-medium text-amber-950 [overflow-wrap:anywhere] dark:text-slate-100'
              : 'min-w-0 max-w-full break-words font-medium text-slate-200 [overflow-wrap:anywhere]'
          }
          inputClassName="text-sm"
          dragHandle={
            dragHandle
              ? {
                  setActivatorNodeRef: dragHandle.setActivatorNodeRef,
                  attributes: dragHandle.attributes,
                  listeners: dragHandle.listeners,
                  activatorAttr: MACRO_PREVIEW_ACTIVITY_DRAG_ACTIVATOR_ATTR,
                }
              : undefined
          }
          initialEditing={edit.bornInEditNodeId === activity.id}
          isPendingCreate={isPreviewPendingNodeId(activity.id)}
          onCancelPendingCreate={edit.onCancelPendingCreate}
        />
      ) : (
        <div
          ref={dragHandle?.setActivatorNodeRef}
          {...(dragHandle ? { [MACRO_PREVIEW_ACTIVITY_DRAG_ACTIVATOR_ATTR]: '' } : {})}
          className={[
            infoHighlight
              ? 'min-w-0 max-w-full break-words font-medium text-amber-950 [overflow-wrap:anywhere] dark:text-slate-100'
              : 'min-w-0 max-w-full break-words font-medium text-slate-200 [overflow-wrap:anywhere]',
            dragHandle ? macroPreviewDragHandleClass : '',
          ].join(' ')}
          {...(dragHandle?.attributes ?? {})}
          {...(dragHandle?.listeners ?? {})}
        >
          {activity.name}
        </div>
      )}
      <div
        onPointerDown={stopDragOnControl}
        className={
          infoHighlight
            ? 'flex min-w-0 w-full max-w-full flex-wrap items-center justify-start gap-x-2 gap-y-1.5 text-[11px] text-amber-900/90 sm:justify-end dark:text-slate-400'
            : 'flex min-w-0 w-full max-w-full flex-wrap items-center justify-start gap-x-2 gap-y-1.5 text-[11px] text-slate-500 sm:justify-end'
        }
      >
        {timeOpen ? (
          <span className="inline-flex shrink-0 items-center gap-1">
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={timeDraft}
              onChange={(e) => setTimeDraft(e.target.value)}
              onBlur={commitTimeDraft}
              onPointerDown={stopDragOnControl}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  ;(e.target as HTMLInputElement).blur()
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setTimeOpen(false)
                }
              }}
              autoFocus
              aria-label="Editar tempo previsto da atividade"
              className={[
                'box-border w-[4.5rem] max-w-full shrink-0 rounded border px-1.5 py-0.5 text-[11px] tabular-nums outline-none ring-sgp-gold/40 focus-visible:ring-2',
                infoHighlight
                  ? 'border-amber-400/40 bg-white/90 text-slate-900 dark:border-white/15 dark:bg-sgp-void/90 dark:text-slate-200'
                  : 'border-white/15 bg-sgp-void/90 text-slate-200',
              ].join(' ')}
            />
            <span className="shrink-0 text-current opacity-70">min</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={openTimeEditor}
            onPointerDown={stopDragOnControl}
            title="Editar tempo previsto"
            aria-label="Editar tempo previsto da atividade"
            className="group inline-flex max-w-full shrink-0 items-center gap-0.5 rounded border border-transparent px-0.5 text-left text-inherit outline-none transition hover:border-white/12 hover:bg-white/[0.04] focus-visible:border-sgp-gold/35 focus-visible:ring-2 focus-visible:ring-sgp-gold/30"
          >
            {timeDisplay}
            <PencilMini className="shrink-0 text-current opacity-60 transition group-hover:opacity-100 group-focus-visible:opacity-100 dark:opacity-50" />
          </button>
        )}

        {edit.teamsListFailed ? (
          <span
            className="min-w-0 max-w-full break-words text-left text-[11px] leading-snug text-slate-500 sm:max-w-[min(100%,15rem)] sm:text-right"
            title="Não foi possível carregar equipes. Tente novamente mais tarde."
          >
            {activity.teamsShortLabel ?? '—'}
          </span>
        ) : (
          <label
            className="flex min-w-0 max-w-full items-center gap-0.5 sm:max-w-[min(100%,15rem)]"
            onPointerDown={stopDragOnControl}
          >
            <select
              aria-label="Selecionar equipe padrão da atividade"
              value={primaryTeamId}
              onChange={(e) => {
                const v = e.target.value.trim()
                edit.onPatchActivity(activity.id, { teamIds: v === '' ? [] : [v] })
              }}
              className="box-border min-h-[1.75rem] w-full min-w-0 max-w-[min(100%,15rem)] cursor-pointer truncate rounded border border-transparent bg-transparent py-0.5 pl-0.5 pr-6 text-right text-[11px] leading-snug text-slate-700 outline-none transition hover:border-white/12 hover:bg-white/[0.04] focus-visible:border-sgp-gold/35 focus-visible:ring-2 focus-visible:ring-sgp-gold/30 dark:text-slate-400"
            >
              <option value="">— Sem equipe padrão —</option>
              {sortedTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <PencilMini className="pointer-events-none shrink-0 text-current opacity-40" />
          </label>
        )}

        {info.missingEffectiveTime ? (
          <span className={matrixPreviewInfoBadgeClass}>Sem tempo previsto</span>
        ) : null}
        {info.missingDefaultTeam ? (
          <span className={matrixPreviewInfoBadgeClass}>Sem equipe padrão</span>
        ) : null}
        {edit.onRemoveStructureNode ? (
          <div onPointerDown={stopDragOnControl} className="shrink-0 self-start">
            <MatrixContextActionsMenu
              menuKey={`macro-preview-activity-${activity.id}`}
              triggerLabel="⋯"
              items={[
                {
                  label: 'Remover atividade',
                  destructive: true,
                  onClick: () => {
                    if (!confirmPreviewStructureRemoval('ACTIVITY')) return
                    edit.onRemoveStructureNode?.(activity.id)
                  },
                },
              ]}
            />
          </div>
        ) : null}
      </div>
    </li>
  )
}

function ReadonlyActivityRow({ activity }: { activity: MacroActivityRow }) {
  const info = matrixPreviewActivityInfoFlags(activity.plannedMinutes, activity.teamIds)
  const infoHighlight = info.missingEffectiveTime || info.missingDefaultTeam

  return (
    <li
      className={[
        'box-border grid w-full min-w-0 max-w-full grid-cols-1 gap-x-3 gap-y-2 overflow-hidden rounded-lg border px-3 py-2.5 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-y-2',
        infoHighlight ? matrixPreviewInfoRowClass : 'border-white/[0.05] bg-sgp-void/40',
      ].join(' ')}
    >
      <div
        className={
          infoHighlight
            ? 'min-w-0 max-w-full break-words font-medium text-amber-950 [overflow-wrap:anywhere] dark:text-slate-100'
            : 'min-w-0 max-w-full break-words font-medium text-slate-200 [overflow-wrap:anywhere]'
        }
      >
        {activity.name}
      </div>
      <div
        className={
          infoHighlight
            ? 'flex min-w-0 w-full max-w-full flex-wrap items-center justify-start gap-x-2 gap-y-1.5 text-[11px] text-amber-900/90 sm:justify-end dark:text-slate-400'
            : 'flex min-w-0 w-full max-w-full flex-wrap items-center justify-start gap-x-2 gap-y-1.5 text-[11px] text-slate-500 sm:justify-end'
        }
      >
        {activity.plannedMinutes != null ? (
          <span className="min-w-0 shrink-0">{formatMinutosHumanos(activity.plannedMinutes)}</span>
        ) : null}
        {activity.teamsShortLabel ? (
          <span className="min-w-0 max-w-full break-words text-slate-600 dark:text-slate-400">
            {activity.teamsShortLabel}
          </span>
        ) : null}
        {info.missingEffectiveTime ? (
          <span className={matrixPreviewInfoBadgeClass}>Sem tempo previsto</span>
        ) : null}
        {info.missingDefaultTeam ? (
          <span className={matrixPreviewInfoBadgeClass}>Sem equipe padrão</span>
        ) : null}
      </div>
    </li>
  )
}

function MacroPreviewSortableTask({
  taskId,
  children,
}: {
  taskId: string
  children: (dragHandle: MacroPreviewDragHandleProps) => ReactNode
}) {
  const sortable = useSortable({
    id: taskId,
    data: { type: 'TASK', taskId },
  })
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.65 : 1,
  }
  return (
    <article ref={sortable.setNodeRef} style={style} className={macroArticleClass}>
      {children({
        setActivatorNodeRef: sortable.setActivatorNodeRef,
        attributes: sortable.attributes,
        listeners: sortable.listeners,
      })}
    </article>
  )
}

function MacroPreviewSortableSector({
  taskId,
  sectorId,
  children,
}: {
  taskId: string
  sectorId: string
  children: (dragHandle: MacroPreviewDragHandleProps) => ReactNode
}) {
  const sortable = useSortable({
    id: macroPreviewSectorSortableId(taskId, sectorId),
    data: { type: 'SECTOR', parentTaskId: taskId, sectorId },
  })
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.65 : 1,
  }
  return (
    <div ref={sortable.setNodeRef} style={style} className="min-w-0 px-5 py-4">
      {children({
        setActivatorNodeRef: sortable.setActivatorNodeRef,
        attributes: sortable.attributes,
        listeners: sortable.listeners,
      })}
    </div>
  )
}

function MacroPreviewSortableActivity({
  taskId,
  sectorId,
  activity,
  edit,
  onNameEditingChange,
}: {
  taskId: string
  sectorId: string
  activity: MacroActivityRow
  edit: NonNullable<Props['edit']>
  onNameEditingChange?: (editing: boolean) => void
}) {
  const sortable = useSortable({
    id: macroPreviewActivitySortableId(taskId, sectorId, activity.id),
    data: {
      type: 'ACTIVITY',
      parentTaskId: taskId,
      parentSectorId: sectorId,
      activityId: activity.id,
    } satisfies MacroPreviewActivityDragData,
  })
  const sortableLiStyle: CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.65 : 1,
  }

  return (
    <MacroPreviewActivityRow
      activity={activity}
      edit={edit}
      dragHandle={{
        setActivatorNodeRef: sortable.setActivatorNodeRef,
        attributes: sortable.attributes,
        listeners: sortable.listeners,
      }}
      sortableLiRef={sortable.setNodeRef}
      sortableLiStyle={sortableLiStyle}
      onNameEditingChange={onNameEditingChange}
    />
  )
}

export function OperationMatrixMacroView({
  model,
  edit,
  inlineNameSaveRegistry,
}: Props) {
  const g = model.executiveSummary
  const statusLabel = model.item.isActive ? 'Ativa' : 'Inativa'

  const [collapsedTaskIds, setCollapsedTaskIds] = useState<CollapsedIdSet>(() =>
    createCollapsedIdSet(),
  )
  const [collapsedSectorIds, setCollapsedSectorIds] = useState<CollapsedIdSet>(() =>
    createCollapsedIdSet(),
  )
  const [editingNameIds, setEditingNameIds] = useState<Set<string>>(() => new Set())

  const setNodeNameEditing = (nodeId: string, editing: boolean) => {
    setEditingNameIds((prev) => {
      const next = new Set(prev)
      if (editing) next.add(nodeId)
      else next.delete(nodeId)
      return next
    })
    if (editing && edit?.bornInEditNodeId === nodeId) {
      edit.onConsumeBornInEdit?.(nodeId)
    }
  }

  const taskIdList = useMemo(() => collectMacroTaskIds(model.tasks), [model.tasks])
  const sectorIdList = useMemo(() => collectMacroSectorIds(model.tasks), [model.tasks])

  const anyCollapsed = hasAnyCollapsed(collapsedTaskIds, collapsedSectorIds)

  const toggleGlobalCollapse = () => {
    if (anyCollapsed) {
      setCollapsedTaskIds(createCollapsedIdSet())
      setCollapsedSectorIds(createCollapsedIdSet())
    } else {
      setCollapsedTaskIds(collapseAllIds(taskIdList))
      setCollapsedSectorIds(collapseAllIds(sectorIdList))
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const onReorderTasks = edit?.onReorderTasks
  const onReorderSectors = edit?.onReorderSectors
  const onReorderActivities = edit?.onReorderActivities
  const structureDnDEnabled = Boolean(onReorderTasks || onReorderSectors || onReorderActivities)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeData = active.data.current as MacroPreviewDragData | undefined
    const overData = over.data.current as MacroPreviewDragData | undefined

    if (activeData?.type === 'TASK' && overData?.type === 'TASK') {
      if (!onReorderTasks) return
      onReorderTasks(activeData.taskId, overData.taskId)
      return
    }

    if (activeData?.type === 'SECTOR' && overData?.type === 'SECTOR') {
      if (!onReorderSectors || !canMacroPreviewSectorDrop(activeData, overData)) return
      onReorderSectors(activeData.parentTaskId, activeData.sectorId, overData.sectorId)
      return
    }

    const activeActivityData = active.data.current as MacroPreviewActivityDragData | undefined
    const overActivityData = over.data.current as MacroPreviewActivityDragData | undefined

    if (activeActivityData?.type === 'ACTIVITY' && overActivityData?.type === 'ACTIVITY') {
      if (!onReorderActivities || !canMacroPreviewActivityDrop(activeActivityData, overActivityData)) {
        return
      }
      onReorderActivities(
        activeActivityData.parentTaskId,
        activeActivityData.parentSectorId,
        activeActivityData.activityId,
        overActivityData.activityId,
      )
    }
  }

  const renderSectorBlock = (
    taskId: string,
    sector: MacroSectorBlock,
    dragHandle?: MacroPreviewDragHandleProps,
  ) => (
    <>
      <div
        ref={dragHandle?.setActivatorNodeRef}
        {...(dragHandle && !editingNameIds.has(sector.id)
          ? { [MACRO_PREVIEW_SECTOR_DRAG_ACTIVATOR_ATTR]: '' }
          : {})}
        className={[
          'flex flex-wrap items-start justify-between gap-2',
          dragHandle && !editingNameIds.has(sector.id) ? macroPreviewDragHandleClass : '',
        ].join(' ')}
        {...(dragHandle && !editingNameIds.has(sector.id) ? (dragHandle.attributes ?? {}) : {})}
        {...(dragHandle && !editingNameIds.has(sector.id) ? (dragHandle.listeners ?? {}) : {})}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {matrixUxNodeLabel.SECTOR}
          </p>
          {edit?.onPatchNodeName ? (
            <MacroPreviewInlineNodeName
              nodeId={sector.id}
              name={sector.name}
              onCommit={edit.onPatchNodeName}
              onEditingChange={(editing) => setNodeNameEditing(sector.id, editing)}
              textClassName="mt-1 block text-base font-medium text-slate-200"
              inputClassName="mt-1 text-base"
              initialEditing={edit.bornInEditNodeId === sector.id}
              isPendingCreate={isPreviewPendingNodeId(sector.id)}
              onCancelPendingCreate={edit.onCancelPendingCreate}
            />
          ) : (
            <h4 className="mt-1 text-base font-medium text-slate-200">{sector.name}</h4>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {edit?.onRemoveStructureNode ? (
            <div onPointerDown={(event) => event.stopPropagation()}>
              <MatrixContextActionsMenu
                menuKey={`macro-preview-sector-${sector.id}`}
                triggerLabel="⋯"
                items={[
                  {
                    label: 'Remover setor',
                    destructive: true,
                    onClick: () => {
                      if (!confirmPreviewStructureRemoval('SECTOR')) return
                      edit.onRemoveStructureNode?.(sector.id)
                    },
                  },
                ]}
              />
            </div>
          ) : null}
          <button
            type="button"
            className={macroPreviewExpandButtonClass}
            aria-expanded={!isIdCollapsed(collapsedSectorIds, sector.id)}
            aria-controls={macroSectorActivitiesRegionId(sector.id)}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setCollapsedSectorIds((prev) => toggleCollapsedId(prev, sector.id))}
          >
            {isIdCollapsed(collapsedSectorIds, sector.id) ? 'Expandir' : 'Recolher'}
          </button>
        </div>
      </div>
      <div
        id={macroSectorActivitiesRegionId(sector.id)}
        hidden={isIdCollapsed(collapsedSectorIds, sector.id)}
      >
        {sector.activities.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Sem atividades neste setor.</p>
        ) : onReorderActivities && edit ? (
          <SortableContext
            items={sector.activities.map((activity) =>
              macroPreviewActivitySortableId(taskId, sector.id, activity.id),
            )}
            strategy={verticalListSortingStrategy}
          >
            <ul className="mt-3 flex flex-col gap-3">
              {sector.activities.map((activity) => (
                <MacroPreviewSortableActivity
                  key={activity.id}
                  taskId={taskId}
                  sectorId={sector.id}
                  activity={activity}
                  edit={edit}
                  onNameEditingChange={(editing) => setNodeNameEditing(activity.id, editing)}
                />
              ))}
            </ul>
          </SortableContext>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {sector.activities.map((activity) =>
              edit ? (
                <MacroPreviewActivityRow
                  key={activity.id}
                  activity={activity}
                  edit={edit}
                  onNameEditingChange={(editing) => setNodeNameEditing(activity.id, editing)}
                />
              ) : (
                <ReadonlyActivityRow key={activity.id} activity={activity} />
              ),
            )}
          </ul>
        )}
        {edit?.onAddActivity ? (
          <div className="mt-3">
            <button
              type="button"
              className={macroPreviewAddButtonClass}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                const createdId = edit.onAddActivity?.(taskId, sector.id)
                if (createdId) {
                  ensureNodeExpanded(setCollapsedSectorIds, sector.id)
                  ensureNodeExpanded(setCollapsedTaskIds, taskId)
                }
              }}
            >
              + Adicionar atividade
            </button>
          </div>
        ) : null}
      </div>
    </>
  )

  const renderTaskCard = (task: MacroTaskBlock, dragHandle?: MacroPreviewDragHandleProps) => (
    <>
      <div
        ref={dragHandle?.setActivatorNodeRef}
        {...(dragHandle && !editingNameIds.has(task.id)
          ? { [MACRO_PREVIEW_TASK_DRAG_ACTIVATOR_ATTR]: '' }
          : {})}
        className={[
          'border-b border-white/[0.06] px-5 py-4',
          dragHandle && !editingNameIds.has(task.id) ? macroPreviewDragHandleClass : '',
        ].join(' ')}
        {...(dragHandle && !editingNameIds.has(task.id) ? (dragHandle.attributes ?? {}) : {})}
        {...(dragHandle && !editingNameIds.has(task.id) ? (dragHandle.listeners ?? {}) : {})}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-sgp-gold/90">
              {matrixUxNodeLabel.TASK}
            </p>
            {edit?.onPatchNodeName ? (
              <MacroPreviewInlineNodeName
                nodeId={task.id}
                name={task.name}
                onCommit={edit.onPatchNodeName}
                onEditingChange={(editing) => setNodeNameEditing(task.id, editing)}
                textClassName="mt-1 block text-lg font-semibold text-slate-100"
                inputClassName="mt-1 text-lg"
                initialEditing={edit.bornInEditNodeId === task.id}
                isPendingCreate={isPreviewPendingNodeId(task.id)}
                onCancelPendingCreate={edit.onCancelPendingCreate}
              />
            ) : (
              <h3 className="mt-1 text-lg font-semibold text-slate-100">{task.name}</h3>
            )}
            {task.description ? (
              <p className="mt-2 text-sm text-slate-400">{task.description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {edit?.onRemoveStructureNode ? (
              <div onPointerDown={(event) => event.stopPropagation()}>
                <MatrixContextActionsMenu
                  menuKey={`macro-preview-task-${task.id}`}
                  triggerLabel="⋯"
                  items={[
                    {
                      label: 'Remover tarefa',
                      destructive: true,
                      onClick: () => {
                        if (!confirmPreviewStructureRemoval('TASK')) return
                        edit.onRemoveStructureNode?.(task.id)
                      },
                    },
                  ]}
                />
              </div>
            ) : null}
            <button
              type="button"
              className={macroPreviewExpandButtonClass}
              aria-expanded={!isIdCollapsed(collapsedTaskIds, task.id)}
              aria-controls={macroTaskSectorsRegionId(task.id)}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setCollapsedTaskIds((prev) => toggleCollapsedId(prev, task.id))}
            >
              {isIdCollapsed(collapsedTaskIds, task.id) ? 'Expandir' : 'Recolher'}
            </button>
          </div>
        </div>
      </div>

      <div
        id={macroTaskSectorsRegionId(task.id)}
        hidden={isIdCollapsed(collapsedTaskIds, task.id)}
        className="divide-y divide-white/[0.05]"
      >
        {task.sectors.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">Sem setores nesta tarefa.</p>
        ) : onReorderSectors ? (
          <SortableContext
            items={task.sectors.map((sector) => macroPreviewSectorSortableId(task.id, sector.id))}
            strategy={verticalListSortingStrategy}
          >
            {task.sectors.map((sector) => (
              <MacroPreviewSortableSector key={sector.id} taskId={task.id} sectorId={sector.id}>
                {(sectorDragHandle) => renderSectorBlock(task.id, sector, sectorDragHandle)}
              </MacroPreviewSortableSector>
            ))}
          </SortableContext>
        ) : (
          task.sectors.map((sector) => (
            <div key={sector.id} className="min-w-0 px-5 py-4">
              {renderSectorBlock(task.id, sector)}
            </div>
          ))
        )}
        {edit?.onAddSector ? (
          <div className="px-5 py-4">
            <button
              type="button"
              className={macroPreviewAddButtonClass}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                const createdId = edit.onAddSector?.(task.id)
                if (createdId) {
                  ensureNodeExpanded(setCollapsedTaskIds, task.id)
                  ensureNodeExpanded(setCollapsedSectorIds, createdId)
                }
              }}
            >
              + Adicionar setor
            </button>
          </div>
        ) : null}
      </div>
    </>
  )

  const taskListBody =
    model.tasks.length === 0 ? (
      <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
        Nenhuma tarefa de serviço cadastrada nesta oferta.
      </p>
    ) : structureDnDEnabled ? (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {onReorderTasks ? (
          <SortableContext items={taskIdList} strategy={verticalListSortingStrategy}>
            <div className="space-y-8">
              {model.tasks.map((task) => (
                <MacroPreviewSortableTask key={task.id} taskId={task.id}>
                  {(taskDragHandle) => renderTaskCard(task, taskDragHandle)}
                </MacroPreviewSortableTask>
              ))}
            </div>
          </SortableContext>
        ) : (
          <div className="space-y-8">
            {model.tasks.map((task) => (
              <article key={task.id} className={macroArticleClass}>
                {renderTaskCard(task)}
              </article>
            ))}
          </div>
        )}
      </DndContext>
    ) : (
      <div className="space-y-8">
        {model.tasks.map((task) => (
          <article key={task.id} className={macroArticleClass}>
            {renderTaskCard(task)}
          </article>
        ))}
      </div>
    )

  const macroViewBody = (
    <div className="space-y-10">
      <header className="sgp-header-card">
        {edit ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-sgp-gold/95">Pré-visualização editável da matriz</p>
            <p className="max-w-3xl text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              Ajuste tempo previsto e equipe padrão das atividades sem alterar a estrutura.
            </p>
          </div>
        ) : (
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sgp-gold">
            Pré-visualização · somente leitura
          </p>
        )}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="sgp-page-title">{model.item.name}</h1>
            {model.item.code ? (
              <p className="mt-1 font-mono text-xs text-slate-500">{model.item.code}</p>
            ) : null}
            {model.item.description ? (
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
                {model.item.description}
              </p>
            ) : null}
          </div>
          <span
            className={`inline-flex shrink-0 self-start rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              model.item.isActive
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100/95'
                : 'border-white/15 bg-white/[0.04] text-slate-400'
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </header>

      <section aria-labelledby="macro-resumo-heading">
        <h2
          id="macro-resumo-heading"
          className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500"
        >
          Resumo executivo
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Tarefas de serviço" value={g.taskCount} />
          <SummaryCard label="Setores de execução" value={g.sectorCount} />
          <SummaryCard label="Atividades" value={g.activityCount} />
          <SummaryCard label="Tempo total previsto" value={formatMinutosHumanos(g.plannedMinutesSum)} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
          <span>
            Equipes distintas (vinculadas):{' '}
            <span className="font-semibold text-slate-300">{g.linkedDistinctDefaultTeams}</span>
          </span>
          <span className="text-slate-600">·</span>
          <span>
            Atividades sem equipe padrão:{' '}
            <span className="font-semibold text-slate-300">{g.activitiesWithoutDefaultTeam}</span>
          </span>
        </div>
      </section>

      <section aria-labelledby="macro-estrutura-heading" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="macro-estrutura-heading"
            className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500"
          >
            Estrutura da matriz
          </h2>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {edit?.onAddTask ? (
              <button
                type="button"
                className={macroPreviewAddButtonClass}
                onClick={() => {
                  const createdId = edit.onAddTask?.()
                  if (createdId) {
                    ensureNodeExpanded(setCollapsedTaskIds, createdId)
                  }
                }}
              >
                + Nova tarefa
              </button>
            ) : null}
            {model.tasks.length > 0 ? (
              <button
                type="button"
                className={macroPreviewExpandButtonClass}
                onClick={toggleGlobalCollapse}
              >
                {anyCollapsed ? 'Expandir tudo' : 'Recolher tudo'}
              </button>
            ) : null}
          </div>
        </div>

        {taskListBody}
      </section>
    </div>
  )

  let wrappedBody = macroViewBody
  if (edit) {
    wrappedBody = <MatrixActionsMenuProvider>{wrappedBody}</MatrixActionsMenuProvider>
  }
  if (inlineNameSaveRegistry) {
    wrappedBody = (
      <MacroPreviewInlineNameSaveProvider registry={inlineNameSaveRegistry}>
        {wrappedBody}
      </MacroPreviewInlineNameSaveProvider>
    )
  }

  return wrappedBody
}
