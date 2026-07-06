import { describe, expect, it } from 'vitest'
import type { ActivityTicketPlanningSource } from './activityTicketPlanningSource'
import { buildSinglePlanningTicketPrintItems } from './buildSinglePlanningTicketPrintItems'
import { groupPrintItemsIntoSheets, ticketModelsToPrintItems } from './thermalTicketPrintSheets'

function planningItem(overrides: Partial<ActivityTicketPlanningSource>): ActivityTicketPlanningSource {
  return {
    conveyorId: 'conv-1',
    conveyorTitle: 'Esteira 1',
    activityNodeId: 'step-1',
    activityTitle: 'Atividade A',
    taskTitle: 'Tarefa',
    sectorTitle: 'Setor',
    plannedDate: '2026-05-19',
    plannedOrder: 0,
    plannedMinutes: 60,
    assignedCollaboratorName: 'Marcio',
    ...overrides,
  }
}

describe('buildSinglePlanningTicketPrintItems', () => {
  it('sempre retorna array com 1 ticket', () => {
    const item = planningItem({ activityNodeId: 'step-only' })
    const tickets = buildSinglePlanningTicketPrintItems(item)

    expect(tickets).toHaveLength(1)
    expect(tickets[0]?.activityNodeId).toBe('step-only')
  })

  it('preserva a atividade do item clicado (activityTitle)', () => {
    const item = planningItem({ activityTitle: 'Costurar banco' })
    const [ticket] = buildSinglePlanningTicketPrintItems(item)

    expect(ticket.activityTitle).toBe('Costurar banco')
  })

  it('gera 1 sheet para o fluxo do navegador', () => {
    const item = planningItem({ activityNodeId: 'step-only-one' })
    const [ticket] = buildSinglePlanningTicketPrintItems(item)

    const sheets = groupPrintItemsIntoSheets(ticketModelsToPrintItems([ticket]))
    expect(sheets).toHaveLength(1)
    expect(sheets[0]?.model.activityNodeId).toBe('step-only-one')
  })
})

