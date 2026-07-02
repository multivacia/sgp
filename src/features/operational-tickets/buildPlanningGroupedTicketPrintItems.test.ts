import { describe, expect, it } from 'vitest'
import type { ActivityTicketPlanningSource } from './activityTicketPlanningSource'
import { buildPlanningGroupedTicketPrintItems } from './buildPlanningGroupedTicketPrintItems'

function item(
  partial: Partial<ActivityTicketPlanningSource> & Pick<ActivityTicketPlanningSource, 'activityNodeId'>,
): ActivityTicketPlanningSource {
  return {
    conveyorId: 'c1',
    conveyorTitle: 'Esteira',
    activityTitle: 'Costurar',
    taskTitle: 'Bancos',
    sectorTitle: 'Costura',
    plannedDate: '2026-05-19',
    plannedOrder: 0,
    plannedMinutes: 60,
    assignedCollaboratorName: 'Marcio',
    activityOperationalStatus: 'IN_PROGRESS',
    ...partial,
  }
}

describe('buildPlanningGroupedTicketPrintItems', () => {
  it('monta tickets a partir dos itens planejados da semana', () => {
    const items = buildPlanningGroupedTicketPrintItems(
      [item({ activityNodeId: 'step-1' }), item({ activityNodeId: 'step-2' })],
      { grouping: 'responsible', printedAt: '2026-05-18T16:00:00.000Z' },
    )

    const tickets = items.filter((i) => i.kind === 'ticket')
    expect(tickets).toHaveLength(2)
    expect(tickets[0]?.kind === 'ticket' && tickets[0].model.activityTitle).toBe('Costurar')
    expect(tickets[0]?.kind === 'ticket' && tickets[0].model.responsibleName).toBe('Marcio')
  })

  it('exclui concluídas por padrão', () => {
    const items = buildPlanningGroupedTicketPrintItems(
      [
        item({ activityNodeId: 'open', activityOperationalStatus: 'IN_PROGRESS' }),
        item({ activityNodeId: 'done', activityOperationalStatus: 'COMPLETED' }),
      ],
      { grouping: 'task' },
    )

    expect(items.filter((i) => i.kind === 'ticket')).toHaveLength(1)
  })

  it('impressão avulsa com apenas 1 ticket', () => {
    const items = buildPlanningGroupedTicketPrintItems([item({ activityNodeId: 'only' })], {
      grouping: 'responsible',
    })

    expect(items.filter((i) => i.kind === 'ticket')).toHaveLength(1)
    expect(items.filter((i) => i.kind === 'header')).toHaveLength(1)
  })

  it('inclui concluídas quando includeCompleted = true', () => {
    const items = buildPlanningGroupedTicketPrintItems(
      [
        item({ activityNodeId: 'step-open', activityOperationalStatus: 'IN_PROGRESS', plannedOrder: 0 }),
        item({ activityNodeId: 'step-done', activityOperationalStatus: 'COMPLETED', plannedOrder: 1 }),
      ],
      { grouping: 'task', includeCompleted: true },
    )

    const tickets = items.filter((i) => i.kind === 'ticket')
    expect(tickets).toHaveLength(2)
    // plannedOrder controla a ordem; ambos devem estar presentes
    const ids = tickets.map((t) => t.kind === 'ticket' && t.model.activityNodeId)
    expect(ids).toContain('step-open')
    expect(ids).toContain('step-done')
  })

  it('não altera campos do layout do ticket', () => {
    const items = buildPlanningGroupedTicketPrintItems(
      [item({ activityNodeId: 'node-abcd' })],
      {
        grouping: 'task',
        printedAt: '2026-05-18T16:00:00.000Z',
      },
    )
    const ticket = items.find((i) => i.kind === 'ticket')
    expect(ticket?.kind).toBe('ticket')
    if (ticket?.kind !== 'ticket') return

    expect(ticket.model).toMatchObject({
      conveyorTitle: 'Esteira',
      activityTitle: 'Costurar',
      taskTitle: 'Bancos',
      sectorTitle: 'Costura',
      shortCode: 'STEP-ABCD',
    })
    expect(ticket.model).not.toHaveProperty('reprint')
    expect(ticket.model).not.toHaveProperty('secondCopy')
  })
})
