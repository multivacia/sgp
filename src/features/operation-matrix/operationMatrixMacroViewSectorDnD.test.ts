import { describe, expect, it } from 'vitest'
import {
  canMacroPreviewSectorDrop,
  macroPreviewSectorDragRegionActivatesReorder,
  macroPreviewSectorSortableId,
  parseMacroPreviewSectorSortableId,
} from './operationMatrixMacroViewSectorDnD'

describe('operationMatrixMacroViewSectorDnD', () => {
  it('gera e interpreta ids sortable composto por tarefa e setor', () => {
    const sortableId = macroPreviewSectorSortableId('task-1', 'sector-1')
    expect(sortableId).toBe('macro-sector:task-1:sector-1')
    expect(parseMacroPreviewSectorSortableId(sortableId)).toEqual({
      taskId: 'task-1',
      sectorId: 'sector-1',
    })
    expect(parseMacroPreviewSectorSortableId('task-1')).toBeNull()
  })

  it('permite drop apenas entre setores irmãos da mesma tarefa', () => {
    const active = {
      type: 'SECTOR' as const,
      parentTaskId: 'task-1',
      sectorId: 'sector-a',
    }
    const sameTask = {
      type: 'SECTOR' as const,
      parentTaskId: 'task-1',
      sectorId: 'sector-b',
    }
    const otherTask = {
      type: 'SECTOR' as const,
      parentTaskId: 'task-2',
      sectorId: 'sector-b',
    }

    expect(canMacroPreviewSectorDrop(active, sameTask)).toBe(true)
    expect(canMacroPreviewSectorDrop(active, otherTask)).toBe(false)
    expect(canMacroPreviewSectorDrop(active, active)).toBe(false)
    expect(canMacroPreviewSectorDrop(null, sameTask)).toBe(false)
  })

  it('restringe drag de setor ao cabeçalho', () => {
    expect(macroPreviewSectorDragRegionActivatesReorder('header')).toBe(true)
    expect(macroPreviewSectorDragRegionActivatesReorder('activity')).toBe(false)
    expect(macroPreviewSectorDragRegionActivatesReorder('task-body')).toBe(false)
  })
})
