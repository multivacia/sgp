import { describe, expect, it } from 'vitest'
import { resolvePlanningItemsForTicketBatchPrint } from './resolvePlanningItemsForTicketBatch'
import type { ActivityTicketPlanningSource } from './activityTicketPlanningSource'

function item(
  partial: Partial<ActivityTicketPlanningSource> & Pick<ActivityTicketPlanningSource, 'activityNodeId'>,
): ActivityTicketPlanningSource {
  return {
    conveyorId: 'c1',
    conveyorTitle: 'Esteira',
    activityTitle: 'Atividade',
    taskTitle: 'Tarefa',
    sectorTitle: 'Setor',
    plannedDate: '2026-05-19',
    plannedOrder: 0,
    plannedMinutes: 60,
    ...partial,
  }
}

describe('resolvePlanningItemsForTicketBatchPrint', () => {
  it('no modo daily filtra pelo dia selecionado', () => {
    const visible = [
      item({ activityNodeId: 'a1', plannedDate: '2026-05-18', plannedOrder: 1 }),
      item({ activityNodeId: 'a2', plannedDate: '2026-05-19', plannedOrder: 0 }),
    ]

    const result = resolvePlanningItemsForTicketBatchPrint(visible, {
      viewMode: 'daily',
      dailySelectedDay: '2026-05-18',
    })

    expect(result.map((r) => r.activityNodeId)).toEqual(['a1'])
  })

  it('no modo week usa todos os itens visíveis', () => {
    const visible = [
      item({ activityNodeId: 'a1', plannedDate: '2026-05-18' }),
      item({ activityNodeId: 'a2', plannedDate: '2026-05-19' }),
    ]

    const result = resolvePlanningItemsForTicketBatchPrint(visible, {
      viewMode: 'week',
      dailySelectedDay: 'week',
    })

    expect(result).toHaveLength(2)
  })
})
