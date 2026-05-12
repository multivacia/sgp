import { useMemo, useState } from 'react'
/* eslint-disable react-hooks/refs -- @dnd-kit useSortable legitimately exposes node refs and drag state during render */
import { CSS } from '@dnd-kit/utilities'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import type { MatrixTreeAggregateMaps } from './matrixTreeAggregates'
import { getBranchStats } from './matrixTreeAggregates'
import { HighlightName } from './matrixTreeHighlight'
import { ActivityRowCompact } from './ActivityRowCompact'
import { MatrixContextActionsMenu } from './MatrixContextActionsMenu'

type Props = {
  task: MatrixNodeTreeApi
  aggregateMaps: MatrixTreeAggregateMaps
  collaboratorIdToName: ReadonlyMap<string, string>
  selectedId: string | null
  activePathIds: ReadonlySet<string>
  onSelectNode: (id: string) => void
  searchQuery: string
  matchIds: ReadonlySet<string>
  /** Quando falso, omite o título "Composição" (uso com cabeçalho externo). */
  showHeading?: boolean
  /** Ações por setor (nível SECTOR) na composição. */
  onDuplicateSector?: (sectorId: string) => void | Promise<void>
  onRemoveSector?: (sectorId: string) => void | Promise<void>
  sectorActionsBusy?: boolean
  onAddActivityToSector?: (sectorId: string) => void | Promise<void>
  onReorderActivityInSector?: (
    sectorId: string,
    dir: 'up' | 'down',
  ) => void | Promise<void>
  onDuplicateActivity?: (activityId: string) => void | Promise<void>
  onRemoveActivity?: (activityId: string) => void | Promise<void>
  /** Abre edição da atividade no painel (não confundir com seleção na linha). */
  onEditActivity?: (activityId: string) => void
}

type SortableActivityProps = {
  act: MatrixNodeTreeApi
  sector: MatrixNodeTreeApi
  task: MatrixNodeTreeApi
  activityOrdinal: number
  selectedId: string | null
  activePathIds: ReadonlySet<string>
  onSelectNode: (id: string) => void
  searchQuery: string
  matchIds: ReadonlySet<string>
  collaboratorIdToName: ReadonlyMap<string, string>
  showActivityRowActions: boolean
  onEditActivity?: (activityId: string) => void
  onDuplicateActivity?: (activityId: string) => void | Promise<void>
  onRemoveActivity?: (activityId: string) => void | Promise<void>
  sectorActionsBusy: boolean
}

function SortableActivityRow(p: SortableActivityProps) {
  const sortable = useSortable({
    id: p.act.id,
    disabled: p.sectorActionsBusy,
  })
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  }
  const active = p.act.id === p.selectedId
  const onPath = p.activePathIds.has(p.act.id)
  const dr = p.act.default_responsible_id?.trim() ?? ''
  const isMatch =
    !!p.searchQuery.trim() &&
    (p.matchIds.has(p.act.id) ||
      p.matchIds.has(p.sector.id) ||
      p.matchIds.has(p.task.id))
  let responsibleLabel: string | null = null
  let warnOrphan = false
  if (!dr) {
    responsibleLabel = null
  } else {
    const name = p.collaboratorIdToName.get(dr)
    if (name) responsibleLabel = name
    else {
      responsibleLabel = 'Não vinc.'
      warnOrphan = true
    }
  }

  const drag =
    !p.sectorActionsBusy
      ? {
          attributes: sortable.attributes,
          listeners: sortable.listeners as Record<string, unknown>,
          sequencePosition: p.activityOrdinal,
        }
      : undefined

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={
        sortable.isDragging
          ? 'relative z-10 opacity-60'
          : undefined
      }
    >
      <ActivityRowCompact
        node={p.act}
        selected={active}
        onPath={onPath}
        onSelect={() => p.onSelectNode(p.act.id)}
        searchQuery={p.searchQuery}
        isMatch={isMatch}
        responsibleLabel={responsibleLabel}
        warnNoResponsible={!dr}
        warnOrphan={warnOrphan}
        panelFocusId={p.act.id}
        showTypeBadge={false}
        dragHandle={drag}
        inlineActions={
          p.showActivityRowActions
            ? {
                onEdit: () =>
                  p.onEditActivity
                    ? p.onEditActivity(p.act.id)
                    : p.onSelectNode(p.act.id),
                onDuplicate: () => void p.onDuplicateActivity?.(p.act.id),
                onRemove: () => void p.onRemoveActivity?.(p.act.id),
                busy: p.sectorActionsBusy,
              }
            : undefined
        }
      />
    </div>
  )
}

type SortableSectorProps = {
  sector: MatrixNodeTreeApi
  task: MatrixNodeTreeApi
  sectorOrdinal: number
  aggregateMaps: MatrixTreeAggregateMaps
  selectedId: string | null
  activePathIds: ReadonlySet<string>
  onSelectNode: (id: string) => void
  searchQuery: string
  matchIds: ReadonlySet<string>
  onDuplicateSector?: (sectorId: string) => void | Promise<void>
  onRemoveSector?: (sectorId: string) => void | Promise<void>
  sectorActionsBusy: boolean
  onAddActivityToSector?: (sectorId: string) => void | Promise<void>
  onReorderActivityInSector?: (
    sectorId: string,
    dir: 'up' | 'down',
  ) => void | Promise<void>
  onDuplicateActivity?: (activityId: string) => void | Promise<void>
  onRemoveActivity?: (activityId: string) => void | Promise<void>
  onEditActivity?: (activityId: string) => void
  collaboratorIdToName: ReadonlyMap<string, string>
}

function SortableSectorCard(p: SortableSectorProps) {
  const [activitiesExpanded, setActivitiesExpanded] = useState(true)
  const sortable = useSortable({
    id: p.sector.id,
    disabled: p.sectorActionsBusy,
  })
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  }

  const st = getBranchStats(p.aggregateMaps, p.sector.id)
  const sectorSelected = p.selectedId === p.sector.id
  const isSectorBranch =
    !sectorSelected &&
    p.selectedId != null &&
    p.activePathIds.has(p.sector.id)
  const isSearchMatch =
    !!p.searchQuery.trim() &&
    p.matchIds.has(p.sector.id) &&
    !sectorSelected
  const warnBranch = st.activitiesWithoutResponsibleInBranch > 0

  const frameSelected =
    sectorSelected &&
    'border-sgp-gold/50 bg-sgp-gold/[0.07] ring-2 ring-sgp-gold/30'
  const frameBranch =
    !sectorSelected &&
    isSectorBranch &&
    'border-sgp-gold/25 bg-sgp-gold/[0.04] ring-1 ring-sgp-gold/20'
  const frameIdle =
    !sectorSelected &&
    !isSectorBranch &&
    'border-white/[0.08] bg-white/[0.02] ring-1 ring-white/[0.04] hover:border-sgp-gold/22 hover:bg-white/[0.04]'

  const cardFrame = frameSelected || frameBranch || frameIdle
  const searchRing = isSearchMatch ? 'ring-1 ring-amber-400/35' : ''
  const warnEdge = warnBranch ? 'border-l-[3px] border-l-amber-500/55' : ''

  const metricsLine = `${st.activityCount} atividades · ${st.plannedMinutesSum} min`

  const showSectorActionsColumn = p.onDuplicateSector && p.onRemoveSector

  const orderedActivities = p.sector.children
    .filter((c) => c.node_type === 'ACTIVITY')
    .slice()
    .sort((a, b) => a.order_index - b.order_index)

  const focusActivityInSector =
    p.selectedId != null &&
    orderedActivities.some((a) => a.id === p.selectedId)
      ? p.selectedId
      : null

  const focusIdx = focusActivityInSector
    ? orderedActivities.findIndex((a) => a.id === focusActivityInSector)
    : -1

  const activityReorderUpDisabled =
    focusActivityInSector == null ||
    focusIdx <= 0 ||
    !p.onReorderActivityInSector
  const activityReorderDownDisabled =
    focusActivityInSector == null ||
    focusIdx < 0 ||
    focusIdx >= orderedActivities.length - 1 ||
    !p.onReorderActivityInSector

  const showEtapasToolbar =
    p.onAddActivityToSector && p.onReorderActivityInSector

  const showActivityRowActions = !!(
    p.onDuplicateActivity && p.onRemoveActivity
  )

  const activityIds = orderedActivities.map((a) => a.id)

  const roundTl = showSectorActionsColumn ? '' : 'sm:rounded-tl-xl'

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      data-matrix-panel-focus={p.sector.id}
      className={[
        'scroll-mt-3',
        sortable.isDragging ? 'relative z-10' : '',
      ].join(' ')}
    >
      <article
        className={[
          'flex min-h-[5.25rem] flex-col overflow-hidden rounded-xl border text-left transition duration-200',
          cardFrame,
          searchRing,
          warnEdge,
          sortable.isDragging ? 'opacity-60' : '',
        ].join(' ')}
        title={
          warnBranch
            ? 'Há atividades sem responsável definido neste setor'
            : undefined
        }
      >
        <div className="flex min-h-[5.25rem] flex-1 flex-row">
          <div className="flex shrink-0 min-h-[5.25rem] flex-col items-center justify-center gap-0.5 self-stretch border-r border-white/[0.08] bg-black/20 py-1 pl-1.5 pr-0.5">
            <span className="font-mono text-[10px] font-semibold tabular-nums text-slate-500">
              {p.sectorOrdinal}
            </span>
            <button
              type="button"
              {...sortable.attributes}
              {...sortable.listeners}
              aria-label="Arrastar para reordenar setor"
              className="cursor-grab touch-none rounded-md border border-transparent px-1 py-1.5 text-sm leading-none text-slate-500 active:cursor-grabbing hover:border-white/10 hover:bg-white/[0.05] hover:text-slate-300"
            >
              <span aria-hidden className="font-mono text-[10px] tracking-tighter">
                ⋮⋮
              </span>
            </button>
          </div>
            <button
              type="button"
              onClick={() => p.onSelectNode(p.sector.id)}
            className={
              showSectorActionsColumn
                ? `flex min-h-[5.25rem] min-w-0 flex-1 flex-col rounded-none ${roundTl} rounded-tr-none p-2.5 text-left sm:p-3`
                : `flex min-h-[5.25rem] min-w-0 flex-1 flex-col rounded-t-xl rounded-b-none p-2.5 text-left sm:p-3`
            }
          >
            <div className="flex min-h-0 flex-1 flex-col">
              <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Setor
              </span>
              <p className="mt-0.5 line-clamp-2 font-heading text-sm font-bold leading-snug tracking-tight text-slate-50">
                <HighlightName
                  name={p.sector.name}
                  query={p.searchQuery}
                  className=""
                />
              </p>
              <p className="mt-auto pt-1.5 text-[10px] leading-snug text-slate-400 tabular-nums">
                <span className="line-clamp-1 font-medium">{metricsLine}</span>
              </p>
            </div>
          </button>
          <div className="flex shrink-0 flex-col justify-center gap-1 border-l border-white/[0.08] py-1.5 px-1">
            <button
              type="button"
              disabled={p.sectorActionsBusy}
              aria-expanded={activitiesExpanded}
              aria-label={
                activitiesExpanded ? 'Recolher setor' : 'Expandir setor'
              }
              onClick={(e) => {
                e.stopPropagation()
                setActivitiesExpanded((v) => !v)
              }}
              className="shrink-0 rounded-lg border border-sgp-gold/35 bg-sgp-gold/10 px-2 py-1 text-[10px] font-semibold text-sgp-gold-warm disabled:opacity-50 sm:text-[11px]"
            >
              {activitiesExpanded ? 'Recolher' : 'Expandir'}
            </button>
          </div>
          {showSectorActionsColumn ? (
            <div className="flex shrink-0 flex-col justify-start rounded-tr-xl border-l border-white/[0.08] py-1.5 pl-1 pr-1.5">
              <MatrixContextActionsMenu
                menuKey={`matrix-sector-${p.sector.id}`}
                disabled={p.sectorActionsBusy}
                items={[
                  {
                    label: 'Editar',
                    onClick: () => p.onSelectNode(p.sector.id),
                  },
                  {
                    label: 'Duplicar',
                    onClick: () => void p.onDuplicateSector!(p.sector.id),
                  },
                  {
                    label: 'Remover',
                    destructive: true,
                    onClick: () => void p.onRemoveSector!(p.sector.id),
                  },
                ]}
              />
            </div>
          ) : null}
        </div>
        <div
          className={`rounded-b-xl border-t border-white/[0.06] bg-black/10 ${
            activitiesExpanded ? '' : 'hidden'
          }`}
        >
          {showEtapasToolbar ? (
            <div className="border-b border-white/[0.06] bg-black/[0.08] px-2 py-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <h3 className="shrink-0 px-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Atividades
                </h3>
                <div
                  className="flex min-w-0 flex-nowrap items-center justify-end gap-1.5 overflow-x-auto sm:ml-auto [scrollbar-width:thin]"
                  role="toolbar"
                  aria-label="Ações das atividades deste setor"
                >
                  <button
                    type="button"
                    disabled={p.sectorActionsBusy}
                    onClick={() =>
                      void p.onAddActivityToSector?.(p.sector.id)
                    }
                    className="shrink-0 rounded-lg border border-sgp-gold/35 bg-sgp-gold/10 px-2.5 py-1 text-[11px] font-semibold text-sgp-gold-warm disabled:opacity-50"
                  >
                    + Adicionar atividade
                  </button>
                  <button
                    type="button"
                    disabled={
                      p.sectorActionsBusy || activityReorderUpDisabled
                    }
                    onClick={() =>
                      void p.onReorderActivityInSector?.(p.sector.id, 'up')
                    }
                    className="shrink-0 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/90 disabled:opacity-40"
                  >
                    Subir
                  </button>
                  <button
                    type="button"
                    disabled={
                      p.sectorActionsBusy || activityReorderDownDisabled
                    }
                    onClick={() =>
                      void p.onReorderActivityInSector?.(p.sector.id, 'down')
                    }
                    className="shrink-0 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/90 disabled:opacity-40"
                  >
                    Descer
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          <div className="space-y-1.5 px-2 py-2.5">
            {orderedActivities.length === 0 ? (
              <p className="px-1 text-[10px] text-slate-600">Sem atividades.</p>
            ) : (
              <SortableContext
                items={activityIds}
                strategy={verticalListSortingStrategy}
              >
                {orderedActivities.map((act, aIdx) => (
                  <SortableActivityRow
                    key={act.id}
                    act={act}
                    sector={p.sector}
                    task={p.task}
                    activityOrdinal={aIdx + 1}
                    selectedId={p.selectedId}
                    activePathIds={p.activePathIds}
                    onSelectNode={p.onSelectNode}
                    searchQuery={p.searchQuery}
                    matchIds={p.matchIds}
                    collaboratorIdToName={p.collaboratorIdToName}
                    showActivityRowActions={showActivityRowActions}
                    onEditActivity={p.onEditActivity}
                    onDuplicateActivity={p.onDuplicateActivity}
                    onRemoveActivity={p.onRemoveActivity}
                    sectorActionsBusy={p.sectorActionsBusy}
                  />
                ))}
              </SortableContext>
            )}
          </div>
        </div>
      </article>
    </div>
  )
}

export function TaskCompositionPanel({
  task,
  aggregateMaps,
  collaboratorIdToName,
  selectedId,
  activePathIds,
  onSelectNode,
  searchQuery,
  matchIds,
  showHeading = true,
  onDuplicateSector,
  onRemoveSector,
  sectorActionsBusy = false,
  onAddActivityToSector,
  onReorderActivityInSector,
  onDuplicateActivity,
  onRemoveActivity,
  onEditActivity,
}: Props) {
  const [setoresExpanded, setSetoresExpanded] = useState(true)
  const sectors = useMemo(
    () =>
      task.children
        .filter((c) => c.node_type === 'SECTOR')
        .slice()
        .sort((a, b) => a.order_index - b.order_index),
    [task.children],
  )

  const sectorIds = useMemo(() => sectors.map((s) => s.id), [sectors])

  const sectorCards = sectors.map((sector, sIdx) => (
    <SortableSectorCard
      key={sector.id}
      sector={sector}
      task={task}
      sectorOrdinal={sIdx + 1}
      aggregateMaps={aggregateMaps}
      selectedId={selectedId}
      activePathIds={activePathIds}
      onSelectNode={onSelectNode}
      searchQuery={searchQuery}
      matchIds={matchIds}
      onDuplicateSector={onDuplicateSector}
      onRemoveSector={onRemoveSector}
      sectorActionsBusy={sectorActionsBusy}
      onAddActivityToSector={onAddActivityToSector}
      onReorderActivityInSector={onReorderActivityInSector}
      onDuplicateActivity={onDuplicateActivity}
      onRemoveActivity={onRemoveActivity}
      onEditActivity={onEditActivity}
      collaboratorIdToName={collaboratorIdToName}
    />
  ))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        {showHeading ? (
          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Composição
          </h2>
        ) : (
          <span />
        )}
        {sectors.length > 0 ? (
          <button
            type="button"
            aria-expanded={setoresExpanded}
            aria-label={
              setoresExpanded ? 'Recolher tarefa' : 'Expandir tarefa'
            }
            onClick={() => setSetoresExpanded((v) => !v)}
            className="shrink-0 rounded-lg border border-sgp-gold/35 bg-sgp-gold/10 px-2.5 py-1 text-[11px] font-semibold text-sgp-gold-warm"
          >
            {setoresExpanded ? 'Recolher' : 'Expandir'}
          </button>
        ) : null}
      </div>
      <div className={`space-y-3 pr-0.5 ${setoresExpanded ? '' : 'hidden'}`}>
        {sectors.length === 0 ? (
          <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] text-slate-500">
            Nenhum setor nesta tarefa.
          </p>
        ) : (
          <SortableContext
            items={sectorIds}
            strategy={verticalListSortingStrategy}
          >
            {sectorCards}
          </SortableContext>
        )}
      </div>
    </div>
  )
}
