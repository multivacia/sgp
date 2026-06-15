import { describe, expect, it } from 'vitest'
import { buildActivityTicketPrintModel } from './activityTicketPrintModel'
import { groupPrintItemsIntoSheets } from './thermalTicketPrintSheets'

describe('groupPrintItemsIntoSheets', () => {
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

  it('cria uma folha por ticket sem cabeçalho', () => {
    const sheets = groupPrintItemsIntoSheets([
      { kind: 'ticket', model: ticket('a') },
      { kind: 'ticket', model: ticket('b') },
    ])

    expect(sheets).toHaveLength(2)
    expect(sheets[0]?.groupHeaderLabel).toBeUndefined()
    expect(sheets[1]?.model.activityNodeId).toBe('b')
  })

  it('associa cabeçalho de grupo ao primeiro ticket do bloco', () => {
    const sheets = groupPrintItemsIntoSheets([
      { kind: 'header', label: 'Tarefa: Bancos' },
      { kind: 'ticket', model: ticket('a') },
      { kind: 'ticket', model: ticket('b') },
      { kind: 'header', label: 'Resp.: Maria' },
      { kind: 'ticket', model: ticket('c') },
    ])

    expect(sheets).toHaveLength(3)
    expect(sheets[0]?.groupHeaderLabel).toBe('Tarefa: Bancos')
    expect(sheets[1]?.groupHeaderLabel).toBeUndefined()
    expect(sheets[2]?.groupHeaderLabel).toBe('Resp.: Maria')
  })
})
