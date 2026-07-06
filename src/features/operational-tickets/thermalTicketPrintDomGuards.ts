const PRINT_BODY_CLASS_DEFAULT = 'thermal-ticket-print-active'

export const THERMAL_TICKET_PRINT_HOST_SELECTOR = '.thermal-ticket-print-host'
export const THERMAL_ACTIVITY_TICKET_SELECTOR = '[data-testid="thermal-activity-ticket"]'

export type ThermalPrintDomReadiness = {
  ready: boolean
  reason?: string
  bodyHasActiveClass: boolean
  hostCount: number
  hostInBody: boolean
  ticketCountInHost: number
  expectedTicketShortCode?: string
  hostTextMatchesTicket: boolean
}

type DocumentLike = Pick<Document, 'body' | 'querySelectorAll'> & {
  body: Pick<HTMLElement, 'classList'>
}

type WindowLike = Pick<Window, 'print'>

export function getThermalPrintDomReadiness(
  args: { document: DocumentLike; bodyClassName?: string; expectedTicketShortCode?: string },
): ThermalPrintDomReadiness {
  const { document, bodyClassName = PRINT_BODY_CLASS_DEFAULT, expectedTicketShortCode } = args

  const bodyHasActiveClass = Boolean(document.body?.classList?.contains?.(bodyClassName))

  const hosts = document.querySelectorAll(THERMAL_TICKET_PRINT_HOST_SELECTOR)
  const hostCount = hosts?.length ?? 0
  if (!bodyHasActiveClass) {
    return {
      ready: false,
      reason: 'missing-body-active-class',
      bodyHasActiveClass,
      hostCount,
      hostInBody: false,
      ticketCountInHost: 0,
    }
  }

  if (hostCount !== 1) {
    return {
      ready: false,
      reason: `unexpected-host-count:${hostCount}`,
      bodyHasActiveClass,
      hostCount,
      hostInBody: false,
      ticketCountInHost: 0,
    }
  }

  const hostEl = hosts[0] as unknown as HTMLElement | undefined
  const hostInBody = Boolean(hostEl && hostEl.parentElement === document.body)

  if (!hostInBody) {
    return {
      ready: false,
      reason: 'host-not-in-body',
      bodyHasActiveClass,
      hostCount,
      hostInBody,
      ticketCountInHost: 0,
    }
  }

  const ticketEls = (hostEl as HTMLElement | undefined)?.querySelectorAll?.(
    THERMAL_ACTIVITY_TICKET_SELECTOR,
  )
  const ticketCountInHost = ticketEls?.length ?? 0

  if (ticketCountInHost < 1) {
    return {
      ready: false,
      reason: 'host-missing-ticket-content',
      bodyHasActiveClass,
      hostCount,
      hostInBody,
      ticketCountInHost,
      expectedTicketShortCode,
      hostTextMatchesTicket: false,
    }
  }

  if (expectedTicketShortCode) {
    const hostText = hostEl?.textContent ?? ''
    const hostTextMatchesTicket = hostText.includes(expectedTicketShortCode)
    if (!hostTextMatchesTicket) {
      return {
        ready: false,
        reason: 'host-ticket-content-mismatch',
        bodyHasActiveClass,
        hostCount,
        hostInBody,
        ticketCountInHost,
        expectedTicketShortCode,
        hostTextMatchesTicket,
      }
    }

    return {
      ready: true,
      bodyHasActiveClass,
      hostCount,
      hostInBody,
      ticketCountInHost,
      expectedTicketShortCode,
      hostTextMatchesTicket,
    }
  }

  return {
    ready: true,
    bodyHasActiveClass,
    hostCount,
    hostInBody,
    ticketCountInHost,
    expectedTicketShortCode,
    hostTextMatchesTicket: true,
  }
}

/**
 * Guarda o caminho de fallback para garantir que nunca dispare impressão
 * com a UI do planejamento visível (corrige race de timing portal/DOM).
 */
export function tryPrintThermalTicketIfDomReady(args: {
  currentSheet: unknown
  document: DocumentLike
  window: WindowLike
  bodyClassName?: string
}): { printed: boolean; reason?: string } {
  const { currentSheet, document, window, bodyClassName = PRINT_BODY_CLASS_DEFAULT } = args

  if (!currentSheet) return { printed: false, reason: 'missing-current-sheet' }
  if (typeof window.print !== 'function') return { printed: false, reason: 'missing-window-print' }

  const expectedTicketShortCode =
    (currentSheet as { model?: { shortCode?: unknown } } | undefined)?.model?.shortCode

  if (typeof expectedTicketShortCode !== 'string' || expectedTicketShortCode.trim().length === 0) {
    return { printed: false, reason: 'missing-current-sheet-shortcode' }
  }

  const readiness = getThermalPrintDomReadiness({
    document,
    bodyClassName,
    expectedTicketShortCode,
  })
  if (!readiness.ready) return { printed: false, reason: readiness.reason }

  window.print()
  return { printed: true }
}

