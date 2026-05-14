import { describe, expect, it } from 'vitest'
import {
  MACRO_PREVIEW_TASK_DRAG_ACTIVATOR_ATTR,
  MACRO_PREVIEW_TASK_DRAG_ACTIVATOR_SELECTOR,
  macroPreviewTaskDragActivatesFromElement,
  macroPreviewTaskDragRegionActivatesReorder,
} from './operationMatrixMacroViewTaskDnD'

describe('operationMatrixMacroViewTaskDnD', () => {
  it('permite reordenar tarefa apenas a partir do cabeçalho', () => {
    expect(macroPreviewTaskDragRegionActivatesReorder('header')).toBe(true)
    expect(macroPreviewTaskDragRegionActivatesReorder('body')).toBe(false)
    expect(macroPreviewTaskDragRegionActivatesReorder('sector')).toBe(false)
    expect(macroPreviewTaskDragRegionActivatesReorder('activity')).toBe(false)
  })

  it('identifica o ativador de drag no cabeçalho da tarefa', () => {
    const header = {
      closest: (selector: string) =>
        selector === MACRO_PREVIEW_TASK_DRAG_ACTIVATOR_SELECTOR ? header : null,
    }
    const body = {
      closest: () => null,
    }

    expect(macroPreviewTaskDragActivatesFromElement(header)).toBe(true)
    expect(macroPreviewTaskDragActivatesFromElement(body)).toBe(false)
    expect(macroPreviewTaskDragActivatesFromElement(null)).toBe(false)
  })

  it('expõe seletor estável para o cabeçalho arrastável', () => {
    expect(MACRO_PREVIEW_TASK_DRAG_ACTIVATOR_ATTR).toBe(
      'data-macro-preview-task-drag-activator',
    )
    expect(MACRO_PREVIEW_TASK_DRAG_ACTIVATOR_SELECTOR).toBe(
      '[data-macro-preview-task-drag-activator]',
    )
  })
})
