import { z } from 'zod'

export const TIME_ENTRY_JUSTIFICATION_CATEGORIES = [
  'SUBSTITUTION',
  'SEQUENCE',
  'PLANNING',
  'REWORK',
  'PRIORITY',
  'EMERGENCY',
  'OTHER',
] as const

export type TimeEntryJustificationCategory =
  (typeof TIME_ENTRY_JUSTIFICATION_CATEGORIES)[number]

export const timeEntryJustificationIdParamSchema = z.string().uuid()

const labelSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(3, { message: 'Justificativa deve ter no mínimo 3 caracteres.' })
      .max(200, { message: 'Justificativa deve ter no máximo 200 caracteres.' }),
  )

const descriptionSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v): string | null | undefined => {
    if (v === undefined) return undefined
    if (v === null) return null
    const trimmed = v.trim()
    return trimmed.length > 0 ? trimmed : null
  })
  .pipe(
    z
      .union([
        z.string().max(500, { message: 'Descrição demasiado longa.' }),
        z.null(),
      ])
      .optional(),
  )

const categorySchema = z
  .union([z.enum(TIME_ENTRY_JUSTIFICATION_CATEGORIES), z.null()])
  .optional()

const usageScopeSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v): string | null | undefined => {
    if (v === undefined) return undefined
    if (v === null) return null
    const trimmed = v.trim()
    return trimmed.length > 0 ? trimmed : null
  })
  .pipe(
    z
      .union([
        z.string().max(120, { message: 'Escopo de uso demasiado longo.' }),
        z.null(),
      ])
      .optional(),
  )

export const createTimeEntryJustificationBodySchema = z.object({
  label: labelSchema,
  description: descriptionSchema,
  category: categorySchema,
  requiresComplement: z.boolean().optional(),
  usageScope: usageScopeSchema,
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
})

export const updateTimeEntryJustificationBodySchema = z.object({
  label: labelSchema.optional(),
  description: descriptionSchema,
  category: categorySchema,
  requiresComplement: z.boolean().optional(),
  usageScope: usageScopeSchema,
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
})

const listStatusSchema = z.enum(['active', 'inactive', 'all']).default('all')

export const listTimeEntryJustificationsQuerySchema = z.object({
  q: z
    .string()
    .transform((s) => s.trim())
    .optional(),
  status: listStatusSchema,
})

export type CreateTimeEntryJustificationBody = z.infer<
  typeof createTimeEntryJustificationBodySchema
>
export type UpdateTimeEntryJustificationBody = z.infer<
  typeof updateTimeEntryJustificationBodySchema
>
export type ListTimeEntryJustificationsQuery = z.infer<
  typeof listTimeEntryJustificationsQuerySchema
>
