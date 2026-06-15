import { describe, expect, it } from 'vitest'
import { buildActivityTicketPrintModel } from '../../features/operational-tickets/activityTicketPrintModel'
import { sheetToAgentPayload } from './activityTicketAgentPayload'

describe('sheetToAgentPayload', () => {
  it('mapeia folha de impressao para payload do agente', () => {
    const model = buildActivityTicketPrintModel(
      {
        conveyorId: 'c1',
        conveyorTitle: 'OS 7549',
        conveyorCode: '7549',
        conveyorVehicleRef: 'VOYAGE SPORT',
        activityNodeId: 'step-abc-1234',
        activityTitle: 'Cortar carpete',
        taskTitle: 'PORTA MALAS',
        sectorTitle: 'CORTE',
        plannedMinutes: 30,
      },
      { printedAt: '2026-06-14T15:00:00.000Z' },
    )

    const payload = sheetToAgentPayload({
      groupHeaderLabel: 'SETOR: CORTE',
      model,
    })

    expect(payload.groupHeaderLabel).toBe('SETOR: CORTE')
    expect(payload.conveyorTitle).toBe('OS 7549')
    expect(payload.activityTitle).toBe('Cortar carpete')
    expect(payload.shortCode).toBe('STEP-1234')
  })
})
