import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { buildActivityTicketPrintModel } from './activityTicketPrintModel'
import { ThermalActivityTicket } from './ThermalActivityTicket'

describe('ThermalActivityTicket', () => {
  it('renderiza conteúdo operacional e mensagem de apoio', () => {
    const model = buildActivityTicketPrintModel(
      {
        conveyorId: 'c1',
        conveyorTitle: 'OS 7452',
        conveyorVehicleRef: 'Gol 1994',
        activityNodeId: 'step-node-8f42',
        activityTitle: 'Costurar lateral banco dianteiro',
        taskTitle: 'Bancos dianteiros',
        sectorTitle: 'Costura',
        plannedDate: '2026-05-18',
        plannedOrder: 2,
        plannedMinutes: 120,
        realizedMinutes: 45,
        activityOperationalStatus: 'IN_PROGRESS',
        responsibleName: 'Marcio',
        teamName: 'Tapeçaria',
      },
      { printedAt: '2026-05-18T16:20:00.000Z' },
    )

    const html = renderToStaticMarkup(createElement(ThermalActivityTicket, { model }))

    expect(html).toContain('Costurar lateral banco dianteiro')
    expect(html).toContain('OS 7452')
    expect(html).toContain('18/05/2026')
    expect(html).toContain('Marcio')
    expect(html).toContain('Tapeçaria')
    expect(html).toContain('Apoio operacional.')
    expect(html).toContain('Status oficial no SGP+.')
    expect(html).not.toContain('123.456.789-00')
    expect(html).not.toContain('@exemplo.com')
    expect(html).not.toContain('Endereço')
    expect(html).not.toContain('R$')
  })
})
