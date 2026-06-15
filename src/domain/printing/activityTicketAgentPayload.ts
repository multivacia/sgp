import type { ActivityTicketPrintModel } from '../../features/operational-tickets/activityTicketPrintModel'
import type { ThermalTicketPrintSheet } from '../../features/operational-tickets/thermalTicketPrintSheets'

/** Payload enviado ao SGP Print Agent (espelha validação do agente). */
export type ActivityTicketAgentPayload = {
  groupHeaderLabel?: string
  conveyorTitle: string
  conveyorCode?: string
  conveyorVehicleRef?: string
  activityNodeId: string
  activityTitle: string
  taskTitle?: string
  sectorTitle?: string
  areaTitle?: string
  plannedDate?: string
  plannedOrder?: number
  plannedMinutes?: number
  realizedMinutes?: number
  pendingMinutes?: number
  operationalStatusLabel?: string
  responsibleName?: string
  teamName?: string
  shortCode: string
  printedAt: string
}

export function sheetToAgentPayload(sheet: ThermalTicketPrintSheet): ActivityTicketAgentPayload {
  const model: ActivityTicketPrintModel = sheet.model
  return {
    groupHeaderLabel: sheet.groupHeaderLabel,
    conveyorTitle: model.conveyorTitle,
    conveyorCode: model.conveyorCode,
    conveyorVehicleRef: model.conveyorVehicleRef,
    activityNodeId: model.activityNodeId,
    activityTitle: model.activityTitle,
    taskTitle: model.taskTitle,
    sectorTitle: model.sectorTitle,
    areaTitle: model.areaTitle,
    plannedDate: model.plannedDate,
    plannedOrder: model.plannedOrder,
    plannedMinutes: model.plannedMinutes,
    realizedMinutes: model.realizedMinutes,
    pendingMinutes: model.pendingMinutes,
    operationalStatusLabel: model.operationalStatusLabel,
    responsibleName: model.responsibleName,
    teamName: model.teamName,
    shortCode: model.shortCode,
    printedAt: model.printedAt,
  }
}

export function sheetsToAgentPayloads(
  sheets: readonly ThermalTicketPrintSheet[],
): ActivityTicketAgentPayload[] {
  return sheets.map(sheetToAgentPayload)
}
