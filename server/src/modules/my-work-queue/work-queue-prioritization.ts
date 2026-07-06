import type { MyWorkQueueItemApi } from './my-work-queue.dto.js'

type WorkQueueSortableItem = Pick<
  MyWorkQueueItemApi,
  | 'group'
  | 'hasPreviousPendingStep'
  | 'plannedDate'
  | 'workPlanItemId'
  | 'isActivityCompleted'
  | 'conveyorId'
  | 'structuralSequenceIndex'
>

function groupSortRank(group: MyWorkQueueItemApi['group']): number {
  if (group === 'overdue') return 0
  if (group === 'today') return 1
  return 2
}

/**
 * Ordenação operacional da fila (exibição apenas):
 * - em sequência estrutural antes de pendência anterior;
 * - sequência estrutural da esteira (`structuralSequenceIndex`), não `planned_order`.
 *
 * `isNextRecommended` NÃO é derivado desta ordenação — veja `resolveIsNextRecommended`.
 */
export function compareWorkQueueItems(
  a: WorkQueueSortableItem,
  b: WorkQueueSortableItem,
): number {
  const groupDiff = groupSortRank(a.group) - groupSortRank(b.group)
  if (groupDiff !== 0) return groupDiff

  const sequenceDiff =
    Number(a.hasPreviousPendingStep) - Number(b.hasPreviousPendingStep)
  if (sequenceDiff !== 0) return sequenceDiff

  const dateDiff = a.plannedDate.localeCompare(b.plannedDate)
  if (dateDiff !== 0) return dateDiff

  const conveyorDiff = a.conveyorId.localeCompare(b.conveyorId)
  if (conveyorDiff !== 0) return conveyorDiff

  const structuralDiff = a.structuralSequenceIndex - b.structuralSequenceIndex
  if (structuralDiff !== 0) return structuralDiff

  return a.workPlanItemId.localeCompare(b.workPlanItemId)
}

export function sortWorkQueueItems<T extends WorkQueueSortableItem>(items: T[]): T[] {
  return [...items].sort(compareWorkQueueItems)
}

/** Ordena a fila para exibição; preserva `isNextRecommended` já calculado por item. */
export function applyWorkQueuePrioritization<T extends WorkQueueSortableItem>(
  items: T[],
): T[] {
  return sortWorkQueueItems(items)
}

/**
 * @deprecated Recomendação é por item via `resolveIsNextRecommended` (sequência estrutural).
 * Mantido apenas para compatibilidade de import — retorna itens ordenados sem alterar flags.
 */
export function assignWorkQueueRecommendations<T extends WorkQueueSortableItem>(
  items: T[],
): T[] {
  return sortWorkQueueItems(items)
}
