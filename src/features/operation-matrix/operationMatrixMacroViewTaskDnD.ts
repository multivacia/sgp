export const MACRO_PREVIEW_TASK_DRAG_ACTIVATOR_ATTR = 'data-macro-preview-task-drag-activator'

export const MACRO_PREVIEW_TASK_DRAG_ACTIVATOR_SELECTOR =
  `[${MACRO_PREVIEW_TASK_DRAG_ACTIVATOR_ATTR}]`

export type MacroPreviewTaskDragRegion = 'header' | 'body' | 'sector' | 'activity'

export function macroPreviewTaskDragRegionActivatesReorder(
  region: MacroPreviewTaskDragRegion,
): boolean {
  return region === 'header'
}

export function macroPreviewTaskDragActivatesFromElement(
  element: { closest(selector: string): unknown | null } | null,
): boolean {
  if (!element) return false
  return element.closest(MACRO_PREVIEW_TASK_DRAG_ACTIVATOR_SELECTOR) != null
}
