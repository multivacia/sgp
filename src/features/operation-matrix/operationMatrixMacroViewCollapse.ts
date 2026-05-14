export type CollapsedIdSet = ReadonlySet<string>

export function createCollapsedIdSet(): CollapsedIdSet {
  return new Set()
}

export function isIdCollapsed(collapsedIds: CollapsedIdSet, id: string): boolean {
  return collapsedIds.has(id)
}

export function toggleCollapsedId(collapsedIds: CollapsedIdSet, id: string): CollapsedIdSet {
  const next = new Set(collapsedIds)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  return next
}

export function collectMacroTaskIds(tasks: readonly { id: string }[]): string[] {
  return tasks.map((task) => task.id)
}

export function collectMacroSectorIds(
  tasks: readonly { sectors: readonly { id: string }[] }[],
): string[] {
  return tasks.flatMap((task) => task.sectors.map((sector) => sector.id))
}

export function hasAnyCollapsed(
  collapsedTaskIds: CollapsedIdSet,
  collapsedSectorIds: CollapsedIdSet,
): boolean {
  return collapsedTaskIds.size > 0 || collapsedSectorIds.size > 0
}

export function collapseAllIds(ids: readonly string[]): CollapsedIdSet {
  return new Set(ids)
}

export function macroTaskSectorsRegionId(taskId: string): string {
  return `macro-task-${taskId}-sectors`
}

export function macroSectorActivitiesRegionId(sectorId: string): string {
  return `macro-sector-${sectorId}-activities`
}
