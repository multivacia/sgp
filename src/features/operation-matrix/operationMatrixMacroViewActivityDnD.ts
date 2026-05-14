export const MACRO_PREVIEW_ACTIVITY_SORTABLE_PREFIX = 'macro-activity:'

export const MACRO_PREVIEW_ACTIVITY_DRAG_ACTIVATOR_ATTR =
  'data-macro-preview-activity-drag-activator'

export const MACRO_PREVIEW_ACTIVITY_DRAG_ACTIVATOR_SELECTOR =
  `[${MACRO_PREVIEW_ACTIVITY_DRAG_ACTIVATOR_ATTR}]`

export type MacroPreviewActivityDragRegion = 'name' | 'control'

export type MacroPreviewActivityDragData = {
  type: 'ACTIVITY'
  parentTaskId: string
  parentSectorId: string
  activityId: string
}

export function macroPreviewActivitySortableId(
  taskId: string,
  sectorId: string,
  activityId: string,
): string {
  return `${MACRO_PREVIEW_ACTIVITY_SORTABLE_PREFIX}${taskId}:${sectorId}:${activityId}`
}

export function parseMacroPreviewActivitySortableId(
  sortableId: string,
): { taskId: string; sectorId: string; activityId: string } | null {
  if (!sortableId.startsWith(MACRO_PREVIEW_ACTIVITY_SORTABLE_PREFIX)) return null
  const payload = sortableId.slice(MACRO_PREVIEW_ACTIVITY_SORTABLE_PREFIX.length)
  const parts = payload.split(':')
  if (parts.length !== 3) return null
  const [taskId, sectorId, activityId] = parts
  if (!taskId || !sectorId || !activityId) return null
  return { taskId, sectorId, activityId }
}

export function macroPreviewActivityDragRegionActivatesReorder(
  region: MacroPreviewActivityDragRegion,
): boolean {
  return region === 'name'
}

export function canMacroPreviewActivityDrop(
  active: MacroPreviewActivityDragData | null | undefined,
  over: MacroPreviewActivityDragData | null | undefined,
): boolean {
  if (!active || !over) return false
  if (active.type !== 'ACTIVITY' || over.type !== 'ACTIVITY') return false
  if (!active.activityId || !over.activityId) return false
  if (active.activityId === over.activityId) return false
  return (
    active.parentTaskId === over.parentTaskId &&
    active.parentSectorId === over.parentSectorId
  )
}
