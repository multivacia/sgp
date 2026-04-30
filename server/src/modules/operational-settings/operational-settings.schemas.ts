import { z } from 'zod'

export const uuidParamSchema = z.string().uuid()
export const isoDateParamSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data deve estar no formato YYYY-MM-DD.' })

const nameSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1, { message: 'Nome é obrigatório.' }).max(256, { message: 'Nome demasiado longo.' }))

const roleNameSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1, { message: 'Nome é obrigatório.' }).max(128, { message: 'Nome demasiado longo.' }))

export const createSectorBodySchema = z.object({
  name: nameSchema,
})

export const patchSectorBodySchema = z.object({
  name: nameSchema.optional(),
  isActive: z.boolean().optional(),
})

export const createCollaboratorRoleBodySchema = z.object({
  name: roleNameSchema,
  /** Opcional; se omitido ou vazio, o servidor gera código único `OPF_*`. */
  code: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().min(2).max(32).optional(),
  ),
})

export const patchCollaboratorRoleBodySchema = z.object({
  name: roleNameSchema.optional(),
  code: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(2).max(32))
    .optional(),
  isActive: z.boolean().optional(),
})

const dailyMinutesSchema = z
  .number()
  .int()
  .min(1, { message: 'dailyMinutes deve ser maior que 0.' })
  .max(1440, { message: 'dailyMinutes deve ser menor ou igual a 1440.' })

export const upsertOperationalCapacityBodySchema = z.object({
  defaultDailyMinutes: dailyMinutesSchema,
})

const nullableIsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional()

export const upsertCollaboratorCapacityOverrideBodySchema = z
  .object({
    dailyMinutes: dailyMinutesSchema,
    effectiveFrom: nullableIsoDateSchema,
    effectiveTo: nullableIsoDateSchema,
    isActive: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    const from = v.effectiveFrom ?? null
    const to = v.effectiveTo ?? null
    if (!from || !to) return
    if (to < from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'effectiveTo deve ser maior ou igual a effectiveFrom.',
        path: ['effectiveTo'],
      })
    }
  })

export const collaboratorCapacityQuerySchema = z.object({
  date: isoDateParamSchema.optional(),
})

export type CreateSectorBody = z.infer<typeof createSectorBodySchema>
export type PatchSectorBody = z.infer<typeof patchSectorBodySchema>
export type CreateCollaboratorRoleBody = z.infer<typeof createCollaboratorRoleBodySchema>
export type PatchCollaboratorRoleBody = z.infer<typeof patchCollaboratorRoleBodySchema>
export type UpsertOperationalCapacityBody = z.infer<typeof upsertOperationalCapacityBodySchema>
export type UpsertCollaboratorCapacityOverrideBody = z.infer<typeof upsertCollaboratorCapacityOverrideBodySchema>
export type CollaboratorCapacityQuery = z.infer<typeof collaboratorCapacityQuerySchema>
