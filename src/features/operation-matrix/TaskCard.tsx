import { memo } from 'react'
import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import type { MatrixTreeAggregateMaps } from './matrixTreeAggregates'
import { getBranchStats } from './matrixTreeAggregates'
import { HighlightName } from './matrixTreeHighlight'
import { MatrixContextActionsMenu } from './MatrixContextActionsMenu'
import type { TaskTreeAggregate } from './treeAggregates'

export type TaskCardProps = {
  task: MatrixNodeTreeApi
  aggregate: TaskTreeAggregate
  aggregateMaps: MatrixTreeAggregateMaps
  selectedId: string | null
  onSelectComposition: (id: string) => void
  onSelectEditMeta: (id: string) => void
  searchQuery: string
  isActiveTask: boolean
  isSearchMatch: boolean
  busy: boolean
  onRemoveTask: () => void
  onDuplicateTask: () => void
}

export const TaskCard = memo(function TaskCard({
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
  onRemoveTask,
  onDuplicateTask,
}: TaskCardProps) {
  const branch = getBranchStats(aggregateMaps, task.id)
  const warnBranch = branch.activitiesWithoutResponsibleInBranch > 0

  const taskSelected = task.id === selectedId
  const searchRing =
    isSearchMatch && !taskSelected ? 'ring-1 ring-amber-400/35' : ''

  const frameSelected =
    taskSelected &&
    'border-sgp-gold/50 bg-sgp-gold/[0.07] ring-2 ring-sgp-gold/30'

  const frameBranch =
    !taskSelected &&
    isActiveTask &&
    'border-sgp-gold/25 bg-sgp-gold/[0.04] ring-1 ring-sgp-gold/20'

  const frameIdle =
    !taskSelected &&
    !isActiveTask &&
    'border-white/[0.08] bg-white/[0.02] ring-1 ring-white/[0.04] hover:border-sgp-gold/22 hover:bg-white/[0.04]'

  const cardFrame = frameSelected || frameBranch || frameIdle

  const warnEdge = warnBranch ? 'border-l-[3px] border-l-amber-500/55' : ''

  const metricsLine = [
    `${aggregate.sectorsCount} áreas`,
    `${aggregate.activitiesCount} etapas`,
    `${aggregate.totalMinutes} min`,
  ].join(' · ')

  return (
    <article
      data-matrix-task-id={task.id}
      className={[
        'flex h-full min-h-[5.25rem] flex-row overflow-hidden rounded-xl border text-left transition duration-200',
        cardFrame,
        searchRing,
        warnEdge,
      ].join(' ')}
      title={
        warnBranch
          ? 'Há etapas sem responsável definido nesta opção'
          : undefined
      }
    >
      <button
        type="button"
        onClick={() => onSelectComposition(task.id)}
        className="flex h-full min-h-[5.25rem] min-w-0 flex-1 flex-col rounded-l-xl rounded-r-none p-2.5 text-left sm:p-3"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <p className="line-clamp-2 font-heading text-sm font-bold leading-snug tracking-tight text-slate-50">
            <HighlightName name={task.name} query={searchQuery} className="" />
          </p>
          {task.description?.trim() ? (
            <p className="mt-1 line-clamp-1 text-[11px] leading-snug text-slate-400">
              {task.description.trim()}
            </p>
          ) : null}
          <p className="mt-auto pt-1.5 text-[10px] leading-snug text-slate-400 tabular-nums">
            <span className="line-clamp-1 font-medium">{metricsLine}</span>
          </p>
        </div>
      </button>
      <div className="flex shrink-0 flex-col justify-start border-l border-white/[0.08] py-1.5 pl-1 pr-1.5">
        <MatrixContextActionsMenu
          menuKey={`matrix-task-${task.id}`}
          disabled={busy}
          items={[
            {
              label: 'Editar',
              onClick: () => onSelectEditMeta(task.id),
            },
            {
              label: 'Duplicar',
              onClick: () => void onDuplicateTask(),
            },
            {
              label: 'Remover',
              destructive: true,
              onClick: () => void onRemoveTask(),
            },
          ]}
        />
      </div>
    </article>
  )
})
