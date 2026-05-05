import { z } from 'zod'

export const extraTimeEntryDescriptionIdParamSchema = z.string().uuid()

const descriptionSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(3, { message: 'Descrição deve ter no mínimo 3 caracteres.' })
      .max(120, { message: 'Descrição deve ter no máximo 120 caracteres.' }),
  )

const internalNoteSchema = z
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
        z.string().max(500, { message: 'Observação interna demasiado longa.' }),
        z.null(),
      ])
      .optional(),
  )

export const createExtraTimeEntryDescriptionBodySchema = z.object({
  description: descriptionSchema,
  internalNote: internalNoteSchema,
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
})

export const updateExtraTimeEntryDescriptionBodySchema = z.object({
  description: descriptionSchema.optional(),
  internalNote: internalNoteSchema,
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
})

const listStatusSchema = z.enum(['active', 'inactive', 'all']).default('active')

export const listExtraTimeEntryDescriptionsQuerySchema = z.object({
  q: z
    .string()
    .transform((s) => s.trim())
    .optional(),
  status: listStatusSchema,
})

export const extraTimeEntryDescriptionResponseSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  internalNote: z.string().nullable(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type CreateExtraTimeEntryDescriptionBody = z.infer<
  typeof createExtraTimeEntryDescriptionBodySchema
>
export type UpdateExtraTimeEntryDescriptionBody = z.infer<
  typeof updateExtraTimeEntryDescriptionBodySchema
>
export type ListExtraTimeEntryDescriptionsQuery = z.infer<
  typeof listExtraTimeEntryDescriptionsQuerySchema
>
