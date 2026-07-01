import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PlanningWeekTicketsPrintDialog } from './PlanningWeekTicketsPrintDialog'

describe('PlanningWeekTicketsPrintDialog', () => {
  it('renderiza controles de impressão da semana', () => {
    const html = renderToStaticMarkup(
      createElement(PlanningWeekTicketsPrintDialog, {
        open: true,
        totalCount: 5,
        printableCount: 3,
        agentStatus: 'available',
        agentFallbackNotice: null,
        onClose: () => {},
        onPrint: () => {},
        onTestThermalPrinter: () => {},
      }),
    )

    expect(html).toContain('Imprimir tickets da semana')
    expect(html).toContain('Agrupar por')
    expect(html).toContain('Responsável')
    expect(html).toContain('Tarefa / esteira')
    expect(html).toContain('Incluir atividades concluídas')
  })

  it('exibe mensagem quando não há itens planejados', () => {
    const html = renderToStaticMarkup(
      createElement(PlanningWeekTicketsPrintDialog, {
        open: true,
        totalCount: 0,
        printableCount: 0,
        agentStatus: 'unavailable',
        agentFallbackNotice: null,
        onClose: () => {},
        onPrint: () => {},
      }),
    )

    expect(html).toContain('Nenhuma atividade planejada nesta semana')
  })
})
