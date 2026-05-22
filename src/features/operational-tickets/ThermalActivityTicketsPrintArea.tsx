import type { ActivityTicketPrintModel } from './activityTicketPrintModel'
import { ThermalActivityTicket } from './ThermalActivityTicket'
import './thermalActivityTicket.css'

type ThermalActivityTicketsPrintAreaProps = {
  tickets: readonly ActivityTicketPrintModel[]
}

export function ThermalActivityTicketsPrintArea(props: ThermalActivityTicketsPrintAreaProps) {
  if (props.tickets.length === 0) return null

  return (
    <div className="thermal-ticket-print-host" aria-hidden>
      <div className="thermal-ticket-print-root">
        {props.tickets.map((model, index) => (
          <ThermalActivityTicket
            key={`${model.activityNodeId}-${index}`}
            model={model}
          />
        ))}
      </div>
    </div>
  )
}
