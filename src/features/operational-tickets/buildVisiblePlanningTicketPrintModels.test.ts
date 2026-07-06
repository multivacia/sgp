import { describe, expect, it } from 'vitest'
import type { ActivityTicketPlanningSource } from './activityTicketPlanningSource'
import { buildActivityTicketInputsFromPlanningSources } from './activityTicketPlanningSource'
import { buildActivityTicketPrintModelsFromPlanningInputs } from './activityTicketPrintModel'
import { groupPrintItemsIntoSheets, ticketModelsToPrintItems } from './thermalTicketPrintSheets'

function item(activityNodeId: string, overrides?: Partial<ActivityTicketPlanningSource>): ActivityTicketPlanningSource {
  return {
    conveyorId: 'c1',
    conveyorTitle: 'Esteira 1',
    activityNodeId,
    activityTitle: `Atividade ${activityNodeId}`,
    taskTitle: 'Tarefa',
    sectorTitle: 'Setor',
    plannedDate: '2026-05-19',
    plannedOrder: 0,
    plannedMinutes: 60,
    activityOperationalStatus: 'IN_PROGRESS',
    assignedCollaboratorName: 'Marcio',
    ...overrides,
  }
}

describe('Impressão de tickets visíveis (planejamento)', () => {
  it('monta exatamente N tickets e gera N sheets no fallback do navegador', () => {
    const sources = [item('step-1'), item('step-2')]
    const inputs = buildActivityTicketInputsFromPlanningSources(sources)
    const models = buildActivityTicketPrintModelsFromPlanningInputs(inputs)

    const sheets = groupPrintItemsIntoSheets(ticketModelsToPrintItems(models))

    expect(models).toHaveLength(2)
    expect(sheets).toHaveLength(2)
    expect(sheets.map((s) => s.model.activityNodeId)).toEqual(['step-1', 'step-2'])
    expect(sheets.every((s) => s.groupHeaderLabel === undefined)).toBe(true)
  })
})

