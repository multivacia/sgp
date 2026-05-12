import { useMemo, type ReactNode } from 'react'
/* eslint-disable react-hooks/refs -- @dnd-kit useSortable legitimately exposes node refs and drag state during render */
import { CSS } from '@dnd-kit/utilities'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import {
  NOVA_MATRIZ_ESTRUTURA_DND_MIME,
  stringifyNovaMatrizEstruturaDrag,
} from './criar-matriz/novaMatrizEstruturaDnD'
import type { MatrixTreeAggregateMaps } from './matrixTreeAggregates'
import { buildNodeTypeMap, findAncestorTaskId } from './matrixTreeSelection'
import { TaskCard } from './TaskCard'
import { getTaskAggregate } from './treeAggregates'

type Props = {
  tasks: MatrixNodeTreeApi[]
  tree: MatrixNodeTreeApi
  parentMap: ReadonlyMap<string, string | null>
  selectedId: string | null
  onSelectComposition: (id: string) => void
  onSelectEditMeta: (id: string) => void
  aggregateMaps: MatrixTreeAggregateMaps
  searchQuery: string
  matchIds: ReadonlySet<string>
  taskAggregates: Map<string, ReturnType<typeof getTaskAggregate>>
  busy: boolean
  onRemoveTaskFromCatalog: (taskId: string) => void | Promise<void>
  onDuplicateTask: (taskId: string) => void | Promise<void>
  /** Quando falso, desliga reordenação por arraste (mantém layout). */
  taskSortable?: boolean
  /** Conteúdo abaixo de cada cartão de tarefa (ex.: composição expandida). */
  renderTaskFooter?: (task: MatrixNodeTreeApi) => ReactNode
  /** Controla largura máxima dos cartões (layout em coluna larga do editor). */
  taskCardWidthClass?: string
  compositionExpandedByTaskId?: ReadonlySet<string>
  onToggleTaskCompositionExpanded?: (taskId: string) => void
  /** Para drop posicional (HTML5): regista elemento da linha da tarefa. */
  registerCatalogDropRowEl?: (taskId: string, el: HTMLDivElement | null) => void
  /** ↩ Para «Bases e extras»: arrastar tarefa persistida de volta ao catálogo. */
  persistedCatalogDragBack?: boolean
}

function subtreeTouchesIds(
  node: MatrixNodeTreeApi,
  ids: ReadonlySet<string>,
): boolean {
  if (ids.has(node.id)) return true
  return node.children.some((c) => subtreeTouchesIds(c, ids))
}

function SortableTaskRow({
  task,
  aggregate,
  aggregateMaps,
  selectedId,
  onSelectComposition,
  onSelectEditMeta,
  searchQuery,
  isActiveTask,
  isSearchMatch,
  busy,
  onRemoveTaskFromCatalog,
  onDuplicateTask,
  sequencePosition,
  renderTaskFooter,
  taskCardWidthClass,
  compositionExpanded,
  onToggleTaskCompositionExpanded,
  registerCatalogDropRowEl,
  persistedCatalogDragBack,
}: Omit<Props, 'tree' | 'parentMap' | 'tasks' | 'matchIds' | 'taskAggregates'> & {
  task: MatrixNodeTreeApi
  aggregate: ReturnType<typeof getTaskAggregate>
  isActiveTask: boolean
  isSearchMatch: boolean
  sequencePosition?: number
  renderTaskFooter?: (task: MatrixNodeTreeApi) => ReactNode
  taskCardWidthClass?: string
  compositionExpanded?: boolean
  onToggleTaskCompositionExpanded?: (taskId: string) => void
  registerCatalogDropRowEl?: (taskId: string, el: HTMLDivElement | null) => void
  persistedCatalogDragBack?: boolean
}) {
  const sortable = useSortable({
    id: task.id,
    disabled: busy,
  })
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  }
  return (
    <div
      ref={(el) => {
        sortable.setNodeRef(el)
        registerCatalogDropRowEl?.(task.id, el)
      }}
      style={style}
      className={
        sortable.isDragging
          ? `relative z-10 min-w-0 ${taskCardWidthClass ?? 'max-w-lg'} opacity-60`
          : `min-w-0 ${taskCardWidthClass ?? 'max-w-lg'}`
      }
    >
      <TaskCard
        task={task}
        aggregate={aggregate}
        aggregateMaps={aggregateMaps}
        selectedId={selectedId}
        onSelectComposition={onSelectComposition}
        onSelectEditMeta={onSelectEditMeta}
        searchQuery={searchQuery}
        isActiveTask={isActiveTask}
        isSearchMatch={isSearchMatch}
        busy={busy}
        onRemoveTask={() => void onRemoveTaskFromCatalog(task.id)}
        onDuplicateTask={() => void onDuplicateTask(task.id)}
        compositionExpanded={compositionExpanded}
        onToggleCompositionExpanded={
          onToggleTaskCompositionExpanded
            ? () => onToggleTaskCompositionExpanded(task.id)
            : undefined
        }
        dragHandle={{
          attributes: sortable.attributes,
          listeners: sortable.listeners as Record<string, unknown>,
          sequencePosition,
        }}
        persistedCatalogDragBack={
          persistedCatalogDragBack && !busy
            ? {
                onDragStart: (e) => {
                  e.dataTransfer.setData(
                    NOVA_MATRIZ_ESTRUTURA_DND_MIME,
                    stringifyNovaMatrizEstruturaDrag({
                      kind: 'persisted-matrix-task',
                      taskId: task.id,
                    }),
                  )
                  e.dataTransfer.effectAllowed = 'move'
                },
              }
            : undefined
        }
      />
      {renderTaskFooter ? renderTaskFooter(task) : null}
    </div>
  )
}

export function OperationMatrixTaskGrid({
  tasks,
  tree,
  parentMap,
  selectedId,
  onSelectComposition,
  onSelectEditMeta,
  aggregateMaps,
  searchQuery,
  matchIds,
  taskAggregates,
  busy,
  onRemoveTaskFromCatalog,
  onDuplicateTask,
  taskSortable = true,
  renderTaskFooter,
  taskCardWidthClass = 'max-w-lg',
  compositionExpandedByTaskId,
  onToggleTaskCompositionExpanded,
  registerCatalogDropRowEl,
  persistedCatalogDragBack = false,
}: Props) {
  const nodeTypeMap = useMemo(() => buildNodeTypeMap(tree), [tree])

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        {tasks.map((task, idx) => {
          const agg =
            taskAggregates.get(task.id) ?? getTaskAggregate(aggregateMaps, task.id)
          const isActiveTask =
            selectedId != null &&
            findAncestorTaskId(selectedId, parentMap, nodeTypeMap) === task.id
          const isSearchMatch =
            !!searchQuery.trim() && subtreeTouchesIds(task, matchIds)

          const compExpanded = compositionExpandedByTaskId?.has(task.id) ?? false
          if (!taskSortable) {
            return (
              <div
                ref={(el) => registerCatalogDropRowEl?.(task.id, el)}
                key={task.id}
                className={`min-w-0 ${taskCardWidthClass}`}
              >
                <TaskCard
                  task={task}
                  aggregate={agg}
                  aggregateMaps={aggregateMaps}
                  selectedId={selectedId}
                  onSelectComposition={onSelectComposition}
                  onSelectEditMeta={onSelectEditMeta}
                  searchQuery={searchQuery}
                  isActiveTask={isActiveTask}
                  isSearchMatch={isSearchMatch}
                  busy={busy}
                  onRemoveTask={() => void onRemoveTaskFromCatalog(task.id)}
                  onDuplicateTask={() => void onDuplicateTask(task.id)}
                  compositionExpanded={compExpanded}
                  onToggleCompositionExpanded={
                    onToggleTaskCompositionExpanded
                      ? () => onToggleTaskCompositionExpanded(task.id)
                      : undefined
                  }
                  persistedCatalogDragBack={
                    persistedCatalogDragBack && !busy
                      ? {
                          onDragStart: (e) => {
                            e.dataTransfer.setData(
                              NOVA_MATRIZ_ESTRUTURA_DND_MIME,
                              stringifyNovaMatrizEstruturaDrag({
                                kind: 'persisted-matrix-task',
                                taskId: task.id,
                              }),
                            )
                            e.dataTransfer.effectAllowed = 'move'
                          },
                        }
                      : undefined
                  }
                />
                {renderTaskFooter ? renderTaskFooter(task) : null}
              </div>
            )
          }
          return (
            <SortableTaskRow
              key={task.id}
              task={task}
              aggregate={agg}
              aggregateMaps={aggregateMaps}
              selectedId={selectedId}
              onSelectComposition={onSelectComposition}
              onSelectEditMeta={onSelectEditMeta}
              searchQuery={searchQuery}
              isActiveTask={isActiveTask}
              isSearchMatch={isSearchMatch}
              busy={busy}
              onRemoveTaskFromCatalog={onRemoveTaskFromCatalog}
              onDuplicateTask={onDuplicateTask}
              sequencePosition={idx + 1}
              renderTaskFooter={renderTaskFooter}
              taskCardWidthClass={taskCardWidthClass}
              compositionExpanded={compExpanded}
              onToggleTaskCompositionExpanded={onToggleTaskCompositionExpanded}
              registerCatalogDropRowEl={registerCatalogDropRowEl}
              persistedCatalogDragBack={persistedCatalogDragBack}
            />
          )
        })}
      </SortableContext>
    </div>
  )
}
