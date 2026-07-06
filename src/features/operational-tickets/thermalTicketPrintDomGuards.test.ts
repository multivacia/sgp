import { describe, expect, it, vi } from 'vitest'
import {
  THERMAL_ACTIVITY_TICKET_SELECTOR,
  THERMAL_TICKET_PRINT_HOST_SELECTOR,
  tryPrintThermalTicketIfDomReady,
} from './thermalTicketPrintDomGuards'

function makeMockDocument(opts: {
  bodyHasActiveClass: boolean
  hostCount: number
  hostInBody: boolean
  ticketCountInHost: number
  hostText: string
}) {
  const body = {
    classList: {
      contains: vi.fn().mockImplementation((cls: string) => {
        if (cls === 'thermal-ticket-print-active') return opts.bodyHasActiveClass
        return false
      }),
    },
  } as any

  const docBody = body

  const hosts = Array.from({ length: opts.hostCount }).map((_, idx) => {
    const parentElement = opts.hostInBody && idx === 0 ? docBody : ({} as any)
    return {
      parentElement,
      textContent: opts.hostText,
      querySelectorAll: vi.fn().mockImplementation((selector: string) => {
        if (selector === THERMAL_ACTIVITY_TICKET_SELECTOR) {
          return Array.from({ length: opts.ticketCountInHost }).map(() => ({} as any))
        }
        return []
      }),
    } as any
  })

  return {
    body,
    querySelectorAll: vi.fn().mockImplementation((selector: string) => {
      if (selector === THERMAL_TICKET_PRINT_HOST_SELECTOR) return hosts
      return []
    }),
  } as any
}

describe('thermalTicketPrintDomGuards', () => {
  it('não imprime quando currentSheet é null', () => {
    const document = makeMockDocument({
      bodyHasActiveClass: true,
      hostCount: 1,
      hostInBody: true,
      ticketCountInHost: 1,
      hostText: 'STEP-OK',
    })
    const print = vi.fn()

    const res = tryPrintThermalTicketIfDomReady({
      currentSheet: null,
      document,
      window: { print } as any,
    })

    expect(res.printed).toBe(false)
    expect(print).not.toHaveBeenCalled()
  })

  it('não imprime quando body class não está aplicada', () => {
    const document = makeMockDocument({
      bodyHasActiveClass: false,
      hostCount: 1,
      hostInBody: true,
      ticketCountInHost: 1,
      hostText: 'STEP-OK',
    })
    const print = vi.fn()

    const res = tryPrintThermalTicketIfDomReady({
      currentSheet: { model: { shortCode: 'STEP-OK' } },
      document,
      window: { print } as any,
    })

    expect(res.printed).toBe(false)
    expect(print).not.toHaveBeenCalled()
  })

  it('não imprime quando existe mais de 1 host', () => {
    const document = makeMockDocument({
      bodyHasActiveClass: true,
      hostCount: 2,
      hostInBody: true,
      ticketCountInHost: 1,
      hostText: 'STEP-OK',
    })
    const print = vi.fn()

    const res = tryPrintThermalTicketIfDomReady({
      currentSheet: { model: { shortCode: 'STEP-OK' } },
      document,
      window: { print } as any,
    })

    expect(res.printed).toBe(false)
    expect(print).not.toHaveBeenCalled()
  })

  it('não imprime quando host não tem conteúdo (ticketCountInHost < 1)', () => {
    const document = makeMockDocument({
      bodyHasActiveClass: true,
      hostCount: 1,
      hostInBody: true,
      ticketCountInHost: 0,
      hostText: 'STEP-OK',
    })
    const print = vi.fn()

    const res = tryPrintThermalTicketIfDomReady({
      currentSheet: { model: { shortCode: 'STEP-OK' } },
      document,
      window: { print } as any,
    })

    expect(res.printed).toBe(false)
    expect(print).not.toHaveBeenCalled()
  })

  it('imprime quando precondições estão satisfeitas', () => {
    const document = makeMockDocument({
      bodyHasActiveClass: true,
      hostCount: 1,
      hostInBody: true,
      ticketCountInHost: 1,
      hostText: 'STEP-OK',
    })
    const print = vi.fn()

    const res = tryPrintThermalTicketIfDomReady({
      currentSheet: { model: { shortCode: 'STEP-OK' } },
      document,
      window: { print } as any,
    })

    expect(res.printed).toBe(true)
    expect(print).toHaveBeenCalledOnce()
  })
})

