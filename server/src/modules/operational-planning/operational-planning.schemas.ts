import { z } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')

export const operationalPlanningWeekQuerySchema = z.object({
  weekStart: isoDate,
})

export const operationalPlanningWeekActivityQuerySchema = z.object({
  weekStart: isoDate,
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
})

export const operationalPlanningBacklogQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(100),
  conveyorId: z.string().uuid().optional(),
  collaboratorId: z.string().uuid().optional(),
})

export const operationalPlanningPlanIdParamSchema = z.object({
  planId: z.string().uuid(),
})

export const operationalPlanningWorkPlanItemIdParamSchema = z.object({
  workPlanItemId: z.string().uuid(),
})

const applyConveyorPlanSyncFieldSchema = z.enum([
  'plannedDate',
  'plannedMinutes',
  'assignedCollaboratorId',
  'assignedTeamId',
])

export const applyConveyorPlanToWeekItemBodySchema = z.object({
  fields: z.array(applyConveyorPlanSyncFieldSchema).min(1).optional(),
})

export type ApplyConveyorPlanToWeekItemBody = z.infer<typeof applyConveyorPlanToWeekItemBodySchema>
export type ApplyConveyorPlanSyncField = z.infer<typeof applyConveyorPlanSyncFieldSchema>

const planItemInputSchema = z.object({
  conveyorId: z.string().uuid(),
  activityNodeId: z.string().uuid(),
  assignedCollaboratorId: z.string().uuid(),
  assignedTeamId: z.string().uuid().nullable().optional(),
  plannedDate: isoDate,
  plannedOrder: z.number().int().min(0),
  plannedMinutes: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  conveyorOperationalPlanItemId: z.string().uuid().nullable().optional(),
})

export const operationalPlanningFactoryIntakeQuerySchema = z.object({
  /** Reservado para filtro futuro; MVP retorna todos os itens aguardando encaixe. */
  weekStart: isoDate.optional(),
})

export const saveOperationalWeekPlanBodySchema = z.object({
  weekStartDate: isoDate,
  weekEndDate: isoDate,
  /** Lista vazia é válida: rascunho da semana sem atividades ainda distribuídas. */
  items: z.array(planItemInputSchema).default([]),
})

export type SaveOperationalWeekPlanBody = z.infer<typeof saveOperationalWeekPlanBodySchema>
export type PlanItemInput = z.infer<typeof planItemInputSchema>
