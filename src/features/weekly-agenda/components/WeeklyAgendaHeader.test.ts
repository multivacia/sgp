import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { WeeklyAgendaHeader } from './WeeklyAgendaHeader'

const defaultProps = {
  weekMonday: '2026-07-06',
  weekPayload: null,
  loading: false,
  busy: false,
  dirty: false,
  draftItemsCount: 0,
  onWeekChange: vi.fn(),
  onSaveDraft: vi.fn(),
  onPublish: vi.fn(),
}

describe('WeeklyAgendaHeader week tickets print', () => {
  it('renderiza botão com contagem quando há itens imprimíveis', () => {
    const html = renderToStaticMarkup(
      createElement(WeeklyAgendaHeader, {
        ...defaultProps,
        weekTicketPrintCount: 7,
        weekTicketPrintDisabled: false,
        onOpenWeekTicketPrint: vi.fn(),
      }),
    )

    expect(html).toContain('data-testid="weekly-agenda-week-tickets-print"')
    expect(html).toContain('Imprimir tickets da semana (7)')
  })

  it('renderiza botão desabilitado sem contagem quando não há itens', () => {
    const html = renderToStaticMarkup(
      createElement(WeeklyAgendaHeader, {
        ...defaultProps,
        weekTicketPrintCount: 0,
        weekTicketPrintDisabled: true,
        onOpenWeekTicketPrint: vi.fn(),
      }),
    )

    expect(html).toContain('Imprimir tickets da semana')
    expect(html).not.toContain('Imprimir tickets da semana (0)')
    expect(html).toContain('disabled')
  })
})
