export type CutMode = 'partial' | 'full'

export type AgentConfig = {
  port: number
  printerName: string
  paperWidthMm: number
  charsPerLine: number
  cutMode: CutMode
  authToken: string
  allowedOrigins: string[]
  mockPrinter: boolean
}

export type ActivityTicketPayload = {
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

export type TicketPrintResult = {
  index: number
  success: boolean
  message: string
  activityNodeId?: string
  shortCode?: string
}
