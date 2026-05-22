import { describe, expect, it } from 'vitest'
import type { OperationalPlanningWeekActivityItem } from '../../domain/operational-planning/operational-planning.types'
import {
  buildPlanningWeekActivityDescription,
  filterPlanningWeekActivityItems,
  formatPlanningActivityKind,
} from './planningWeekActivity'

function item(
  partial: Partial<OperationalPlanningWeekActivityItem> &
    Pick<OperationalPlanningWeekActivityItem, 'id' | 'kind'>,
): OperationalPlanningWeekActivityItem {
  return {
    occurredAt: '2026-05-13T14:00:00.000Z',
    conveyorId: 'cv-1',
    conveyorName: 'Esteira A',
    activityNodeId: 'step-1',
    taskName: 'Tarefa',
    areaName: 'Setor',
    activityName: 'Pintura',
    collaboratorId: null,
    collaboratorName: null,
    actorName: null,
    minutes: null,
    entryOrigin: null,
    exceptionJustification: null,
    outsidePlan: null,
    description: '',
    ...partial,
    id: partial.id,
    kind: partial.kind,
  }
}

describe('formatPlanningActivityKind', () => {
  it('labels kinds in Portuguese', () => {
    expect(formatPlanningActivityKind('TIME_ENTRY')).toBe('Apontamento')
    expect(formatPlanningActivityKind('STEP_COMPLETED')).toBe('Conclusão')
    expect(formatPlanningActivityKind('STEP_REOPENED')).toBe('Reabertura')
  })
})

describe('buildPlanningWeekActivityDescription', () => {
  it('uses API description when present', () => {
    expect(
      buildPlanningWeekActivityDescription(
        item({ id: '1', kind: 'TIME_ENTRY', description: 'Texto pronto' }),
      ),
    ).toBe('Texto pronto')
  })

  it('builds time entry description', () => {
    const text = buildPlanningWeekActivityDescription(
      item({
        id: '2',
        kind: 'TIME_ENTRY',
        collaboratorName: 'Maria',
        minutes: 45,
        activityName: 'Lixar',
      }),
    )
    expect(text).toContain('Maria')
    expect(text).toContain('45min')
    expect(text).toContain('Lixar')
  })
})

describe('filterPlanningWeekActivityItems', () => {
  const items = [
    item({
      id: '1',
      kind: 'TIME_ENTRY',
      conveyorName: 'Esteira X',
      collaboratorName: 'João',
      outsidePlan: true,
    }),
    item({
      id: '2',
      kind: 'STEP_COMPLETED',
      conveyorName: 'Esteira Y',
      actorName: 'Gestor',
      outsidePlan: null,
    }),
  ]

  it('filters by kind', () => {
    const out = filterPlanningWeekActivityItems(items, {
      q: '',
      kind: 'TIME_ENTRY',
      outsidePlanOnly: false,
    })
    expect(out).toHaveLength(1)
    expect(out[0]?.kind).toBe('TIME_ENTRY')
  })

  it('filters outside plan only', () => {
    const out = filterPlanningWeekActivityItems(items, {
      q: '',
      kind: 'all',
      outsidePlanOnly: true,
    })
    expect(out).toHaveLength(1)
    expect(out[0]?.outsidePlan).toBe(true)
  })

  it('filters by search text', () => {
    const out = filterPlanningWeekActivityItems(items, {
      q: 'gestor',
      kind: 'all',
      outsidePlanOnly: false,
    })
    expect(out).toHaveLength(1)
    expect(out[0]?.kind).toBe('STEP_COMPLETED')
  })
})
