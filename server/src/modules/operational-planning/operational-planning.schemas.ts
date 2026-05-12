import { z } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')

export const operationalPlanningWeekQuerySchema = z.object({
  weekStart: isoDate,
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

const planItemInputSchema = z.object({
  conveyorId: z.string().uuid(),
  activityNodeId: z.string().uuid(),
  assignedCollaboratorId: z.string().uuid(),
  assignedTeamId: z.string().uuid().nullable().optional(),
  plannedDate: isoDate,
  plannedOrder: z.number().int().min(0),
  plannedMinutes: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
})

export const saveOperationalWeekPlanBodySchema = z.object({
  weekStartDate: isoDate,
  weekEndDate: isoDate,
  /** Lista vazia é válida: rascunho da semana sem atividades ainda distribuídas. */
  items: z.array(planItemInputSchema).default([]),
})

export type SaveOperationalWeekPlanBody = z.infer<typeof saveOperationalWeekPlanBodySchema>
export type PlanItemInput = z.infer<typeof planItemInputSchema>
