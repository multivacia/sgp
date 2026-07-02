import type { MyWorkQueueItemApi } from './my-work-queue.dto.js'

type WorkQueueSortableItem = Pick<
  MyWorkQueueItemApi,
  | 'group'
  | 'isOutOfSequence'
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
 * Ordenação operacional da fila:
 * - em sequência (para o colaborador) antes de bloqueio/exceção;
 * - sequência estrutural da esteira (`structuralSequenceIndex`), não `planned_order`.
 */
export function compareWorkQueueItems(
  a: WorkQueueSortableItem,
  b: WorkQueueSortableItem,
): number {
  const groupDiff = groupSortRank(a.group) - groupSortRank(b.group)
  if (groupDiff !== 0) return groupDiff

  const sequenceDiff = Number(a.isOutOfSequence) - Number(b.isOutOfSequence)
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

export function assignWorkQueueRecommendations<T extends WorkQueueSortableItem>(
  items: T[],
): Array<T & { isNextRecommended: boolean }> {
  const sorted = sortWorkQueueItems(items)
  const recommendedConveyors = new Set<string>()

  return sorted.map((item) => {
    const canRecommend =
      !item.isActivityCompleted &&
      !item.isOutOfSequence &&
      !recommendedConveyors.has(item.conveyorId)

    if (canRecommend) {
      recommendedConveyors.add(item.conveyorId)
    }

    return {
      ...item,
      isNextRecommended: canRecommend,
    }
  })
}

export function applyWorkQueuePrioritization<
  T extends WorkQueueSortableItem & { isNextRecommended?: boolean },
>(items: T[]): Array<T & { isNextRecommended: boolean }> {
  return assignWorkQueueRecommendations(items)
}

/** @deprecated Use assignWorkQueueRecommendations após montar isOutOfSequence por colaborador. */
export function resolveIsNextRecommended(
  item: Pick<MyWorkQueueItemApi, 'isActivityCompleted' | 'isOutOfSequence'>,
): boolean {
  return !item.isActivityCompleted && !item.isOutOfSequence
}
