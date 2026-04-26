import { useMemo } from 'react'
import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
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
}

function subtreeTouchesIds(
  node: MatrixNodeTreeApi,
  ids: ReadonlySet<string>,
): boolean {
  if (ids.has(node.id)) return true
  return node.children.some((c) => subtreeTouchesIds(c, ids))
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
}: Props) {
  const nodeTypeMap = useMemo(() => buildNodeTypeMap(tree), [tree])

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {tasks.map((task) => {
        const agg =
          taskAggregates.get(task.id) ?? getTaskAggregate(aggregateMaps, task.id)
        const isActiveTask =
          selectedId != null &&
          findAncestorTaskId(selectedId, parentMap, nodeTypeMap) === task.id
        const isSearchMatch =
          !!searchQuery.trim() && subtreeTouchesIds(task, matchIds)

        return (
          <div key={task.id} className="min-w-0 max-w-lg">
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
            />
          </div>
        )
      })}
    </div>
  )
}
