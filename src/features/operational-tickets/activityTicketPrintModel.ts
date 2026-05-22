import { resolvePlanningItemOperationalStatusLabel } from '../operational-planning/planningExecutionHelpers'

/** Modelo seguro para impressão térmica — somente campos allowlisted. */
export type ActivityTicketPrintModel = {
  conveyorId: string
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

/** Entrada mínima permitida para o builder (sem campos sensíveis). */
export type ActivityTicketPrintModelInput = {
  conveyorId: string
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
  plannedMinutes?: number | null
  realizedMinutes?: number | null

  activityOperationalStatus?: string | null
  planItemStatus?: string | null

  responsibleName?: string | null
  teamName?: string | null
}

const PLAN_ITEM_STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planejada',
  CANCELLED: 'Cancelada',
}

export function formatTicketDate(isoDate: string): string | undefined {
  const trimmed = isoDate.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined
  const [y, m, d] = trimmed.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  if (Number.isNaN(dt.getTime())) return undefined
  return dt.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatTicketDateTime(iso: string): string {
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return iso
  return dt.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatMinutes(minutes: number): string {
  const value = Math.max(0, Math.floor(minutes))
  return `${value} min`
}

export function buildShortStepCode(activityNodeId: string): string {
  const compact = activityNodeId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const suffix = (compact.slice(-4) || '0000').padStart(4, '0')
  return `STEP-${suffix}`
}

export function normalizeTicketText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed || undefined
}

function normalizeMinutes(raw: number | null | undefined): number | undefined {
  if (raw == null || !Number.isFinite(raw)) return undefined
  return Math.max(0, Math.floor(raw))
}

function resolveOperationalStatusLabel(input: ActivityTicketPrintModelInput): string | undefined {
  const operational = resolvePlanningItemOperationalStatusLabel(input.activityOperationalStatus)
  if (operational) return operational
  const planKey = input.planItemStatus?.trim()
  if (!planKey) return undefined
  return PLAN_ITEM_STATUS_LABELS[planKey] ?? undefined
}

function resolvePendingMinutes(
  plannedMinutes: number | undefined,
  realizedMinutes: number | undefined,
): number | undefined {
  if (plannedMinutes == null || realizedMinutes == null) return undefined
  return Math.max(0, plannedMinutes - realizedMinutes)
}

export function buildActivityTicketPrintModel(
  input: ActivityTicketPrintModelInput,
  options?: { printedAt?: string },
): ActivityTicketPrintModel {
  const printedAt = options?.printedAt ?? new Date().toISOString()
  const plannedMinutes = normalizeMinutes(input.plannedMinutes)
  const realizedMinutes = normalizeMinutes(input.realizedMinutes)
  const sectorTitle = normalizeTicketText(input.sectorTitle)
  const areaTitle = normalizeTicketText(input.areaTitle) ?? sectorTitle

  const model: ActivityTicketPrintModel = {
    conveyorId: input.conveyorId.trim(),
    conveyorTitle: normalizeTicketText(input.conveyorTitle) ?? 'Esteira',
    activityNodeId: input.activityNodeId.trim(),
    activityTitle: normalizeTicketText(input.activityTitle) ?? 'Atividade',
    shortCode: buildShortStepCode(input.activityNodeId),
    printedAt,
  }

  const conveyorCode = normalizeTicketText(input.conveyorCode)
  if (conveyorCode) model.conveyorCode = conveyorCode

  const conveyorVehicleRef = normalizeTicketText(input.conveyorVehicleRef)
  if (conveyorVehicleRef) model.conveyorVehicleRef = conveyorVehicleRef

  const taskTitle = normalizeTicketText(input.taskTitle)
  if (taskTitle) model.taskTitle = taskTitle

  if (sectorTitle) model.sectorTitle = sectorTitle
  if (areaTitle) model.areaTitle = areaTitle

  const plannedDate = input.plannedDate ? formatTicketDate(input.plannedDate) : undefined
  if (plannedDate) model.plannedDate = plannedDate

  if (input.plannedOrder != null && Number.isFinite(input.plannedOrder)) {
    model.plannedOrder = Math.max(0, Math.floor(input.plannedOrder)) + 1
  }

  if (plannedMinutes != null) model.plannedMinutes = plannedMinutes
  if (realizedMinutes != null) model.realizedMinutes = realizedMinutes

  const pendingMinutes = resolvePendingMinutes(plannedMinutes, realizedMinutes)
  if (pendingMinutes != null) model.pendingMinutes = pendingMinutes

  const operationalStatusLabel = resolveOperationalStatusLabel(input)
  if (operationalStatusLabel) model.operationalStatusLabel = operationalStatusLabel

  const responsibleName = normalizeTicketText(input.responsibleName)
  if (responsibleName) model.responsibleName = responsibleName

  const teamName = normalizeTicketText(input.teamName)
  if (teamName) model.teamName = teamName

  return model
}

export function buildActivityTicketPrintModelsFromPlanningInputs(
  inputs: readonly ActivityTicketPrintModelInput[],
  options?: { printedAt?: string },
): ActivityTicketPrintModel[] {
  const printedAt = options?.printedAt
  return inputs.map((input) => buildActivityTicketPrintModel(input, { printedAt }))
}
