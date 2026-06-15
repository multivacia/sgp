import { createPortal } from 'react-dom'
import { ThermalActivityTicket } from './ThermalActivityTicket'
import type { ThermalTicketPrintSheet } from './thermalTicketPrintSheets'
import './thermalActivityTicket.css'

type ThermalActivityTicketsPrintAreaProps = {
  sheet: ThermalTicketPrintSheet
}

export function ThermalActivityTicketGroupHeader(props: { label: string }) {
  return (
    <div className="thermal-ticket-group-header" data-testid="thermal-ticket-group-header">
      <hr className="thermal-ticket-rule" aria-hidden />
      <p className="thermal-ticket-group-header-label">{props.label}</p>
      <hr className="thermal-ticket-rule" aria-hidden />
    </div>
  )
}

export function ThermalActivityTicketsPrintArea(props: ThermalActivityTicketsPrintAreaProps) {
  const { sheet } = props

  const content = (
    <div className="thermal-ticket-print-host" aria-hidden>
      <div className="thermal-ticket-print-root">
        <div className="thermal-ticket-sheet" data-testid="thermal-ticket-sheet">
          {sheet.groupHeaderLabel ? (
            <ThermalActivityTicketGroupHeader label={sheet.groupHeaderLabel} />
          ) : null}
          <ThermalActivityTicket model={sheet.model} />
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return content
  return createPortal(content, document.body)
}
