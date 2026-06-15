import {
  formatMinutes,
  formatTicketDateTime,
  type ActivityTicketPrintModel,
} from './activityTicketPrintModel'

type ThermalActivityTicketProps = {
  model: ActivityTicketPrintModel
}

function formatPlannedOrder(order: number | undefined): string | undefined {
  if (order == null || !Number.isFinite(order)) return undefined
  return String(Math.max(1, Math.floor(order))).padStart(2, '0')
}

export function ThermalActivityTicket(props: ThermalActivityTicketProps) {
  const { model } = props
  const areaLabel = model.areaTitle ?? model.sectorTitle
  const orderLabel = formatPlannedOrder(model.plannedOrder)

  return (
    <article
      className="thermal-ticket thermal-ticket-page"
      data-testid="thermal-activity-ticket"
    >
      <p className="thermal-ticket-header">SGP+ ATIVIDADE</p>
      <hr className="thermal-ticket-rule" aria-hidden />

      <p className="thermal-ticket-line">
        <strong>Esteira:</strong> {model.conveyorTitle}
        {model.conveyorCode ? ` (${model.conveyorCode})` : ''}
      </p>
      {model.conveyorVehicleRef ? (
        <p className="thermal-ticket-line">
          <strong>Veículo/Ref.:</strong> {model.conveyorVehicleRef}
        </p>
      ) : null}

      <p className="thermal-ticket-line" style={{ marginTop: 6 }}>
        <strong>ATIVIDADE</strong>
      </p>
      <p className="thermal-ticket-activity-title">{model.activityTitle}</p>

      {model.taskTitle ? (
        <p className="thermal-ticket-line">
          <strong>Tarefa:</strong> {model.taskTitle}
        </p>
      ) : null}
      {areaLabel ? (
        <p className="thermal-ticket-line">
          <strong>Área:</strong> {areaLabel}
        </p>
      ) : null}

      {model.plannedDate ? (
        <p className="thermal-ticket-line">
          <strong>Planejado:</strong> {model.plannedDate}
        </p>
      ) : null}
      {orderLabel ? (
        <p className="thermal-ticket-line">
          <strong>Ordem:</strong> {orderLabel}
        </p>
      ) : null}
      {model.plannedMinutes != null ? (
        <p className="thermal-ticket-line">
          <strong>Tempo:</strong> {formatMinutes(model.plannedMinutes)}
        </p>
      ) : null}

      {model.responsibleName ? (
        <p className="thermal-ticket-line" style={{ marginTop: 6 }}>
          <strong>Resp.:</strong> {model.responsibleName}
        </p>
      ) : null}
      {model.teamName ? (
        <p className="thermal-ticket-line">
          <strong>Equipe:</strong> {model.teamName}
        </p>
      ) : null}

      {model.operationalStatusLabel ? (
        <p className="thermal-ticket-line" style={{ marginTop: 6 }}>
          <strong>Status:</strong> {model.operationalStatusLabel}
        </p>
      ) : null}
      {model.realizedMinutes != null ? (
        <p className="thermal-ticket-line">
          <strong>Realizado:</strong> {formatMinutes(model.realizedMinutes)}
        </p>
      ) : null}
      {model.pendingMinutes != null ? (
        <p className="thermal-ticket-line">
          <strong>Pendente:</strong> {formatMinutes(model.pendingMinutes)}
        </p>
      ) : null}

      <p className="thermal-ticket-line" style={{ marginTop: 8 }}>
        <strong>Obs:</strong>
      </p>
      <p className="thermal-ticket-line thermal-ticket-obs-lines">______________________________</p>
      <p className="thermal-ticket-line thermal-ticket-obs-lines">______________________________</p>

      <p className="thermal-ticket-code">{model.shortCode}</p>
      <p className="thermal-ticket-line" style={{ textAlign: 'center' }}>
        Impresso em: {formatTicketDateTime(model.printedAt)}
      </p>

      <p className="thermal-ticket-footer">Apoio operacional.</p>
      <p className="thermal-ticket-footer">Status oficial no SGP+.</p>

      <hr className="thermal-ticket-rule" aria-hidden />
    </article>
  )
}
