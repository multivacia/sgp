import { describe, expect, it } from 'vitest'
import {
  canMacroPreviewActivityDrop,
  macroPreviewActivityDragRegionActivatesReorder,
  macroPreviewActivitySortableId,
  parseMacroPreviewActivitySortableId,
} from './operationMatrixMacroViewActivityDnD'

describe('operationMatrixMacroViewActivityDnD', () => {
  it('gera e interpreta ids sortable compostos por tarefa, setor e atividade', () => {
    const sortableId = macroPreviewActivitySortableId('task-1', 'sector-1', 'activity-1')
    expect(sortableId).toBe('macro-activity:task-1:sector-1:activity-1')
    expect(parseMacroPreviewActivitySortableId(sortableId)).toEqual({
      taskId: 'task-1',
      sectorId: 'sector-1',
      activityId: 'activity-1',
    })
    expect(parseMacroPreviewActivitySortableId('activity-1')).toBeNull()
  })

  it('permite drop apenas entre atividades irmãs do mesmo setor', () => {
    const active = {
      type: 'ACTIVITY' as const,
      parentTaskId: 'task-1',
      parentSectorId: 'sector-1',
      activityId: 'activity-a',
    }
    const sameSector = {
      type: 'ACTIVITY' as const,
      parentTaskId: 'task-1',
      parentSectorId: 'sector-1',
      activityId: 'activity-b',
    }
    const otherSector = {
      type: 'ACTIVITY' as const,
      parentTaskId: 'task-1',
      parentSectorId: 'sector-2',
      activityId: 'activity-b',
    }
    const otherTask = {
      type: 'ACTIVITY' as const,
      parentTaskId: 'task-2',
      parentSectorId: 'sector-1',
      activityId: 'activity-b',
    }

    expect(canMacroPreviewActivityDrop(active, sameSector)).toBe(true)
    expect(canMacroPreviewActivityDrop(active, otherSector)).toBe(false)
    expect(canMacroPreviewActivityDrop(active, otherTask)).toBe(false)
    expect(canMacroPreviewActivityDrop(active, active)).toBe(false)
    expect(canMacroPreviewActivityDrop(null, sameSector)).toBe(false)
  })

  it('restringe drag de atividade à área do nome', () => {
    expect(macroPreviewActivityDragRegionActivatesReorder('name')).toBe(true)
    expect(macroPreviewActivityDragRegionActivatesReorder('control')).toBe(false)
  })
})
