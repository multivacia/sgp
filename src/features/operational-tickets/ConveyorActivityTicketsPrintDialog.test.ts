import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ConveyorActivityTicketsPrintDialog } from './ConveyorActivityTicketsPrintDialog'

describe('ConveyorActivityTicketsPrintDialog', () => {
  it('renderiza controles de impressão da esteira', () => {
    const html = renderToStaticMarkup(
      createElement(ConveyorActivityTicketsPrintDialog, {
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

    expect(html).toContain('Imprimir tickets da esteira')
    expect(html).toContain('Impressão direta disponível')
    expect(html).toContain('Testar impressora térmica')
    expect(html).toContain('Agrupar por')
    expect(html).toContain('Estrutura da esteira')
    expect(html).toContain('Incluir atividades concluídas')
    expect(html).toContain('Use os tickets como apoio físico na operação')
    expect(html).toContain('status oficial da atividade continua sendo controlado no SGP+')
  })

  it('não renderiza quando fechado', () => {
    const html = renderToStaticMarkup(
      createElement(ConveyorActivityTicketsPrintDialog, {
        open: false,
        totalCount: 5,
        printableCount: 3,
        agentStatus: 'unavailable',
        agentFallbackNotice: null,
        onClose: () => {},
        onPrint: () => {},
      }),
    )
    expect(html).toBe('')
  })
})
