import { z } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')

export const conveyorIdParamSchema = z.object({
  conveyorId: z.string().uuid(),
})

export const conveyorOperationalPlanIdParamSchema = z.object({
  conveyorId: z.string().uuid(),
  planId: z.string().uuid(),
})

export const conveyorOperationalPlanItemIdParamSchema = z.object({
  conveyorId: z.string().uuid(),
  planId: z.string().uuid(),
  itemId: z.string().uuid(),
})

export const createConveyorOperationalPlanBodySchema = z.object({
  plannedStartDate: isoDate.nullable().optional(),
  plannedEndDate: isoDate.nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
})

export const createConveyorOperationalPlanItemBodySchema = z.object({
  activityNodeId: z.string().uuid(),
  plannedDate: isoDate.nullable().optional(),
  plannedOrder: z.number().int().min(0).optional().default(0),
  plannedMinutes: z.number().int().min(0).nullable().optional(),
  plannedCollaboratorId: z.string().uuid().nullable().optional(),
  plannedTeamId: z.string().uuid().nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
})

export const patchConveyorOperationalPlanItemBodySchema = z
  .object({
    plannedDate: isoDate.nullable().optional(),
    plannedOrder: z.number().int().min(0).optional(),
    plannedMinutes: z.number().int().min(0).nullable().optional(),
    plannedCollaboratorId: z.string().uuid().nullable().optional(),
    plannedTeamId: z.string().uuid().nullable().optional(),
    status: z.enum(['PLANNED', 'NEEDS_REVIEW', 'CANCELLED']).optional(),
    notes: z.string().max(4000).nullable().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, {
    message: 'Informe ao menos um campo para atualizar.',
  })

export type CreateConveyorOperationalPlanBody = z.infer<
  typeof createConveyorOperationalPlanBodySchema
>
export type CreateConveyorOperationalPlanItemBody = z.infer<
  typeof createConveyorOperationalPlanItemBodySchema
>
export type PatchConveyorOperationalPlanItemBody = z.infer<
  typeof patchConveyorOperationalPlanItemBodySchema
>

export const generateConveyorOperationalPlanItemsBodySchema = z.object({
  plannedStartDate: isoDate,
  overwrite: z.boolean().optional().default(false),
})

export type GenerateConveyorOperationalPlanItemsBody = z.infer<
  typeof generateConveyorOperationalPlanItemsBodySchema
>

export const previewConveyorOperationalPlanGenerationBodySchema = z.object({
  plannedStartDate: isoDate,
})

export type PreviewConveyorOperationalPlanGenerationBody = z.infer<
  typeof previewConveyorOperationalPlanGenerationBodySchema
>
