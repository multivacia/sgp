import { describe, expect, it } from 'vitest'
import {
  collapseAllIds,
  collectMacroSectorIds,
  collectMacroTaskIds,
  createCollapsedIdSet,
  hasAnyCollapsed,
  isIdCollapsed,
  macroSectorActivitiesRegionId,
  macroTaskSectorsRegionId,
  toggleCollapsedId,
} from './operationMatrixMacroViewCollapse'

const sampleTasks = [
  {
    id: 'task-1',
    sectors: [{ id: 'sector-1' }, { id: 'sector-2' }],
  },
  {
    id: 'task-2',
    sectors: [{ id: 'sector-3' }],
  },
]

describe('operationMatrixMacroViewCollapse', () => {
  it('inicia com tarefas e setores expandidos por padrão', () => {
    const collapsed = createCollapsedIdSet()

    expect(isIdCollapsed(collapsed, 'task-1')).toBe(false)
    expect(isIdCollapsed(collapsed, 'sector-1')).toBe(false)
  })

  it('recolhe e expande tarefa sem afetar outras chaves', () => {
    const collapsed = toggleCollapsedId(createCollapsedIdSet(), 'task-1')

    expect(isIdCollapsed(collapsed, 'task-1')).toBe(true)
    expect(isIdCollapsed(collapsed, 'task-2')).toBe(false)

    const expandedAgain = toggleCollapsedId(collapsed, 'task-1')
    expect(isIdCollapsed(expandedAgain, 'task-1')).toBe(false)
  })

  it('recolhe e expande setor sem afetar outras chaves', () => {
    const collapsed = toggleCollapsedId(createCollapsedIdSet(), 'sector-1')

    expect(isIdCollapsed(collapsed, 'sector-1')).toBe(true)
    expect(isIdCollapsed(collapsed, 'sector-2')).toBe(false)

    const expandedAgain = toggleCollapsedId(collapsed, 'sector-1')
    expect(isIdCollapsed(expandedAgain, 'sector-1')).toBe(false)
  })

  it('preserva o estado do setor quando a tarefa é recolhida e expandida', () => {
    const sectorCollapsed = toggleCollapsedId(createCollapsedIdSet(), 'sector-prep')
    const taskCollapsed = toggleCollapsedId(sectorCollapsed, 'task-1')
    const taskExpanded = toggleCollapsedId(taskCollapsed, 'task-1')

    expect(isIdCollapsed(taskExpanded, 'sector-prep')).toBe(true)
    expect(isIdCollapsed(taskExpanded, 'task-1')).toBe(false)
  })

  it('não reutiliza o conjunto anterior ao alternar', () => {
    const initial = createCollapsedIdSet()
    const next = toggleCollapsedId(initial, 'task-1')

    expect(next).not.toBe(initial)
    expect(isIdCollapsed(initial, 'task-1')).toBe(false)
    expect(isIdCollapsed(next, 'task-1')).toBe(true)
  })

  it('gera ids estáveis para aria-controls', () => {
    expect(macroTaskSectorsRegionId('task-1')).toBe('macro-task-task-1-sectors')
    expect(macroSectorActivitiesRegionId('sector-1')).toBe('macro-sector-sector-1-activities')
  })

  it('detecta quando há tarefas ou setores recolhidos', () => {
    const collapsedTasks = collapseAllIds(collectMacroTaskIds(sampleTasks))
    const collapsedSectors = collapseAllIds(collectMacroSectorIds(sampleTasks))

    expect(hasAnyCollapsed(createCollapsedIdSet(), createCollapsedIdSet())).toBe(false)
    expect(hasAnyCollapsed(collapsedTasks, createCollapsedIdSet())).toBe(true)
    expect(hasAnyCollapsed(createCollapsedIdSet(), collapsedSectors)).toBe(true)
  })

  it('recolhe todas as tarefas e setores conhecidos', () => {
    const collapsedTasks = collapseAllIds(collectMacroTaskIds(sampleTasks))
    const collapsedSectors = collapseAllIds(collectMacroSectorIds(sampleTasks))

    expect(isIdCollapsed(collapsedTasks, 'task-1')).toBe(true)
    expect(isIdCollapsed(collapsedTasks, 'task-2')).toBe(true)
    expect(isIdCollapsed(collapsedSectors, 'sector-1')).toBe(true)
    expect(isIdCollapsed(collapsedSectors, 'sector-3')).toBe(true)
  })
})
