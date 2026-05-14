export const MACRO_PREVIEW_SECTOR_SORTABLE_PREFIX = 'macro-sector:'

export const MACRO_PREVIEW_SECTOR_DRAG_ACTIVATOR_ATTR =
  'data-macro-preview-sector-drag-activator'

export const MACRO_PREVIEW_SECTOR_DRAG_ACTIVATOR_SELECTOR =
  `[${MACRO_PREVIEW_SECTOR_DRAG_ACTIVATOR_ATTR}]`

export type MacroPreviewDragItemType = 'TASK' | 'SECTOR'

export type MacroPreviewSectorDragRegion = 'header' | 'activity' | 'task-body'

export type MacroPreviewSectorDragData = {
  type: 'SECTOR'
  parentTaskId: string
  sectorId: string
}

export type MacroPreviewTaskDragData = {
  type: 'TASK'
  taskId: string
}

export type MacroPreviewDragData = MacroPreviewSectorDragData | MacroPreviewTaskDragData

export function macroPreviewSectorSortableId(taskId: string, sectorId: string): string {
  return `${MACRO_PREVIEW_SECTOR_SORTABLE_PREFIX}${taskId}:${sectorId}`
}

export function parseMacroPreviewSectorSortableId(
  sortableId: string,
): { taskId: string; sectorId: string } | null {
  if (!sortableId.startsWith(MACRO_PREVIEW_SECTOR_SORTABLE_PREFIX)) return null
  const payload = sortableId.slice(MACRO_PREVIEW_SECTOR_SORTABLE_PREFIX.length)
  const separator = payload.indexOf(':')
  if (separator <= 0) return null
  const taskId = payload.slice(0, separator)
  const sectorId = payload.slice(separator + 1)
  if (!taskId || !sectorId) return null
  return { taskId, sectorId }
}

export function macroPreviewSectorDragRegionActivatesReorder(
  region: MacroPreviewSectorDragRegion,
): boolean {
  return region === 'header'
}

export function canMacroPreviewSectorDrop(
  active: MacroPreviewSectorDragData | null | undefined,
  over: MacroPreviewSectorDragData | null | undefined,
): boolean {
  if (!active || !over) return false
  if (active.type !== 'SECTOR' || over.type !== 'SECTOR') return false
  if (!active.sectorId || !over.sectorId) return false
  if (active.sectorId === over.sectorId) return false
  return active.parentTaskId === over.parentTaskId
}
