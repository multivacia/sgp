import { describe, expect, it } from 'vitest'
import {
  filterPlanningActivityTicketSources,
  type ActivityTicketPlanningSource,
} from './activityTicketPlanningSource'

function source(
  partial?: Partial<ActivityTicketPlanningSource>,
): ActivityTicketPlanningSource {
  return {
    conveyorId: 'c1',
    conveyorTitle: 'OS 100',
    activityNodeId: 'step-1',
    activityTitle: 'Costurar',
    taskTitle: 'Bancos',
    sectorTitle: 'Costura',
    plannedDate: '2026-06-01',
    plannedOrder: 0,
    plannedMinutes: 60,
    activityOperationalStatus: 'IN_PROGRESS',
    status: null,
    ...partial,
  }
}

describe('filterPlanningActivityTicketSources', () => {
  it('item cancelado sempre é excluído (includeCompleted = false)', () => {
    const result = filterPlanningActivityTicketSources(
      [source({ status: 'CANCELLED' })],
      false,
    )
    expect(result).toHaveLength(0)
  })

  it('item cancelado é excluído mesmo com includeCompleted = true', () => {
    const result = filterPlanningActivityTicketSources(
      [source({ status: 'CANCELLED', activityOperationalStatus: 'COMPLETED' })],
      true,
    )
    expect(result).toHaveLength(0)
  })

  it('item concluído é excluído por padrão (includeCompleted = false)', () => {
    const result = filterPlanningActivityTicketSources(
      [source({ activityOperationalStatus: 'COMPLETED' })],
      false,
    )
    expect(result).toHaveLength(0)
  })

  it('item concluído é incluído quando includeCompleted = true', () => {
    const result = filterPlanningActivityTicketSources(
      [source({ activityOperationalStatus: 'COMPLETED' })],
      true,
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.activityOperationalStatus).toBe('COMPLETED')
  })

  it('item ativo é incluído em ambos os modos', () => {
    const item = source({ activityOperationalStatus: 'IN_PROGRESS' })
    expect(filterPlanningActivityTicketSources([item], false)).toHaveLength(1)
    expect(filterPlanningActivityTicketSources([item], true)).toHaveLength(1)
  })

  it('STEP ABORTED é excluído do lote padrão e também com includeCompleted = true', () => {
    const aborted = source({
      activityNodeId: 'dispensado',
      activityOperationalStatus: 'ABORTED',
    })
    expect(filterPlanningActivityTicketSources([aborted], false)).toHaveLength(0)
    expect(filterPlanningActivityTicketSources([aborted], true)).toHaveLength(0)
  })

  it('filtra corretamente lista mista (ativo + concluído + cancelado + ABORTED)', () => {
    const sources = [
      source({ activityNodeId: 'ativo', activityOperationalStatus: 'IN_PROGRESS' }),
      source({ activityNodeId: 'concluido', activityOperationalStatus: 'COMPLETED' }),
      source({ activityNodeId: 'cancelado', status: 'CANCELLED' }),
      source({ activityNodeId: 'dispensado', activityOperationalStatus: 'ABORTED' }),
    ]

    const semConcluidos = filterPlanningActivityTicketSources(sources, false)
    expect(semConcluidos).toHaveLength(1)
    expect(semConcluidos[0]?.activityNodeId).toBe('ativo')

    const comConcluidos = filterPlanningActivityTicketSources(sources, true)
    expect(comConcluidos).toHaveLength(2)
    expect(comConcluidos.map((s) => s.activityNodeId)).toContain('ativo')
    expect(comConcluidos.map((s) => s.activityNodeId)).toContain('concluido')
    expect(comConcluidos.map((s) => s.activityNodeId)).not.toContain('cancelado')
    expect(comConcluidos.map((s) => s.activityNodeId)).not.toContain('dispensado')
  })
})
