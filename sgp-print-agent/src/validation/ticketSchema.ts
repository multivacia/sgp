import { z } from 'zod'

export const activityTicketSchema = z.object({
  groupHeaderLabel: z.string().trim().min(1).max(120).optional(),
  conveyorTitle: z.string().trim().min(1).max(200),
  conveyorCode: z.string().trim().min(1).max(80).optional(),
  conveyorVehicleRef: z.string().trim().min(1).max(200).optional(),
  activityNodeId: z.string().trim().min(1).max(120),
  activityTitle: z.string().trim().min(1).max(300),
  taskTitle: z.string().trim().min(1).max(200).optional(),
  sectorTitle: z.string().trim().min(1).max(120).optional(),
  areaTitle: z.string().trim().min(1).max(120).optional(),
  plannedDate: z.string().trim().min(1).max(40).optional(),
  plannedOrder: z.number().int().min(1).max(999).optional(),
  plannedMinutes: z.number().int().min(0).max(99999).optional(),
  realizedMinutes: z.number().int().min(0).max(99999).optional(),
  pendingMinutes: z.number().int().min(0).max(99999).optional(),
  operationalStatusLabel: z.string().trim().min(1).max(80).optional(),
  responsibleName: z.string().trim().min(1).max(120).optional(),
  teamName: z.string().trim().min(1).max(120).optional(),
  shortCode: z.string().trim().min(1).max(40),
  printedAt: z.string().trim().min(1).max(40),
})

export const singleTicketBodySchema = z.object({
  ticket: activityTicketSchema,
})

export const batchTicketsBodySchema = z.object({
  tickets: z.array(activityTicketSchema).min(1).max(200),
})

export type ValidatedActivityTicket = z.infer<typeof activityTicketSchema>
