import { z } from 'zod'

export const stepAbortReasonCodeParamSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Z0-9_]+$/, {
    message: 'Código deve conter apenas A-Z, 0-9 e underscore.',
  })

const codeCreateSchema = z
  .string()
  .transform((s) => s.trim().toUpperCase())
  .pipe(
    z
      .string()
      .min(1, { message: 'Código é obrigatório.' })
      .max(64, { message: 'Código demasiado longo.' })
      .regex(/^[A-Z0-9_]+$/, {
        message: 'Código deve conter apenas A-Z, 0-9 e underscore.',
      }),
  )

const labelSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(1, { message: 'Motivo é obrigatório.' })
      .max(200, { message: 'Motivo deve ter no máximo 200 caracteres.' }),
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

export const createStepAbortReasonBodySchema = z.object({
  code: codeCreateSchema,
  label: labelSchema,
  description: descriptionSchema,
  requiresComplement: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
})

export const updateStepAbortReasonBodySchema = z.object({
  label: labelSchema.optional(),
  description: descriptionSchema,
  requiresComplement: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
})

const listStatusSchema = z.enum(['active', 'inactive', 'all']).default('all')

export const listStepAbortReasonsQuerySchema = z.object({
  q: z
    .string()
    .transform((s) => s.trim())
    .optional(),
  status: listStatusSchema,
})

export type CreateStepAbortReasonBody = z.infer<typeof createStepAbortReasonBodySchema>
export type UpdateStepAbortReasonBody = z.infer<typeof updateStepAbortReasonBodySchema>
export type ListStepAbortReasonsQuery = z.infer<typeof listStepAbortReasonsQuerySchema>
