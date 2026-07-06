import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ThermalActivityTicketsPrintArea } from './ThermalActivityTicketsPrintArea'
import { buildActivityTicketPrintModel } from './activityTicketPrintModel'
import type { ThermalTicketPrintSheet } from './thermalTicketPrintSheets'

describe('ThermalActivityTicketsPrintArea', () => {
  it('renderiza 1 host e 1 ticket no modo SSR (document indefinido)', () => {
    const model = buildActivityTicketPrintModel({
      conveyorId: 'c1',
      conveyorTitle: 'OS 100',
      activityNodeId: 'step-1',
      activityTitle: 'Costurar',
      taskTitle: 'Bancos',
      sectorTitle: 'Costura',
      plannedOrder: 0,
      plannedMinutes: 60,
      realizedMinutes: 0,
      activityOperationalStatus: 'IN_PROGRESS',
      planItemStatus: 'PLANNED',
      responsibleName: 'Marcio',
      teamName: undefined,
    })

    const sheet: ThermalTicketPrintSheet = {
      groupHeaderLabel: 'RESP.: MARCIO',
      model,
    }

    const html = renderToStaticMarkup(createElement(ThermalActivityTicketsPrintArea, { sheet }))

    const hostMatches = html.match(/thermal-ticket-print-host/g) ?? []
    expect(hostMatches).toHaveLength(1)

    const ticketMatches = html.match(/data-testid="thermal-activity-ticket"/g) ?? []
    expect(ticketMatches).toHaveLength(1)

    expect(html).toContain('Costurar')
  })
})
