import { describe, expect, it } from 'vitest'
import { buildActivityTicketPrintModel } from './activityTicketPrintModel'
import {
  advanceThermalTicketPrintQueue,
  createThermalTicketPrintQueue,
  getThermalTicketPrintProgress,
  getThermalTicketSheetAt,
  isBatchThermalTicketPrint,
} from './thermalTicketPrintQueue'
import { groupPrintItemsIntoSheets } from './thermalTicketPrintSheets'

describe('thermalTicketPrintQueue', () => {
  const ticket = (id: string) =>
    buildActivityTicketPrintModel(
      {
        conveyorId: 'c1',
        conveyorTitle: 'OS 1',
        activityNodeId: id,
        activityTitle: `Atividade ${id}`,
      },
      { printedAt: '2026-06-14T12:00:00.000Z' },
    )

  it('cria fila com uma folha por ticket', () => {
    const sheets = groupPrintItemsIntoSheets([
      { kind: 'ticket', model: ticket('a') },
      { kind: 'ticket', model: ticket('b') },
      { kind: 'ticket', model: ticket('c') },
    ])
    const queue = createThermalTicketPrintQueue(sheets)

    expect(queue).toEqual({ sheets, index: 0 })
    expect(getThermalTicketPrintProgress(queue!)).toEqual({ current: 1, total: 3 })
    expect(getThermalTicketSheetAt(queue!)?.model.activityNodeId).toBe('a')
  })

  it('avanca a fila ate esgotar', () => {
    const sheets = groupPrintItemsIntoSheets([
      { kind: 'ticket', model: ticket('a') },
      { kind: 'ticket', model: ticket('b') },
    ])
    const queue = createThermalTicketPrintQueue(sheets)!
    const next = advanceThermalTicketPrintQueue(queue)

    expect(next).toEqual({ sheets, index: 1 })
    expect(getThermalTicketPrintProgress(next!)).toEqual({ current: 2, total: 2 })
    expect(advanceThermalTicketPrintQueue(next!)).toBeNull()
  })

  it('identifica impressao em lote', () => {
    expect(isBatchThermalTicketPrint({ current: 1, total: 1 })).toBe(false)
    expect(isBatchThermalTicketPrint({ current: 2, total: 5 })).toBe(true)
  })
})
