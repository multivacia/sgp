import { describe, expect, it } from 'vitest'
import {
  filterPlanningActivityTicketSources,
  type ActivityTicketPlanningSource,
} from './activityTicketPlanningSource'
import { buildPlanningGroupedTicketPrintItems } from './buildPlanningGroupedTicketPrintItems'
import { resolveWeekPlanningItemsForTicketPrint } from './resolvePlanningItemsForTicketBatch'

function item(
  partial: Partial<ActivityTicketPlanningSource> & Pick<ActivityTicketPlanningSource, 'activityNodeId'>,
): ActivityTicketPlanningSource {
  return {
    conveyorId: 'c1',
    conveyorTitle: 'Esteira',
    activityTitle: 'Atividade',
    taskTitle: 'Tarefa',
    sectorTitle: 'Setor',
    plannedDate: '2026-07-07',
    plannedOrder: 0,
    plannedMinutes: 60,
    ...partial,
  }
}

describe('usePlanningWeekTicketsPrint wiring', () => {
  it('conta itens da semana com a mesma regra do planejamento', () => {
    const draftItems = Array.from({ length: 7 }, (_, index) =>
      item({ activityNodeId: `a${index}`, plannedOrder: index }),
    )

    const weekTicketSources = resolveWeekPlanningItemsForTicketPrint(draftItems)
    const weekPrintableTicketCount = filterPlanningActivityTicketSources(weekTicketSources, false).length

    expect(weekTicketSources).toHaveLength(7)
    expect(weekPrintableTicketCount).toBe(7)
  })

  it('ignora itens cancelados na contagem', () => {
    const draftItems = [
      item({ activityNodeId: 'a1' }),
      item({ activityNodeId: 'a2', status: 'CANCELLED' }),
    ]

    const weekTicketSources = resolveWeekPlanningItemsForTicketPrint(draftItems)
    expect(weekTicketSources).toHaveLength(1)
  })

  it('monta impressão agrupada com tickets elegíveis', () => {
    const draftItems = [item({ activityNodeId: 'a1' })]
    const weekTicketSources = resolveWeekPlanningItemsForTicketPrint(draftItems)

    const items = buildPlanningGroupedTicketPrintItems(weekTicketSources, {
      grouping: 'task',
      includeCompleted: false,
      backlogExecutionLookup: new Map(),
    })

    expect(items.some((entry) => entry.kind === 'ticket')).toBe(true)
  })
})
