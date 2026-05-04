import { z } from 'zod'

export const collaboratorOperationalHealthQuerySchema = z.object({
  referenceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'referenceDate deve ser YYYY-MM-DD.')
    .optional(),
  recentDays: z.coerce
    .number()
    .int()
    .min(1)
    .max(30)
    .optional()
    .default(7),
})

export type CollaboratorOperationalHealthQuery = z.infer<
  typeof collaboratorOperationalHealthQuerySchema
>

const queryBoolLoose = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return false
  if (typeof val === 'boolean') return val
  const raw = Array.isArray(val) ? val[0] : val
  const s = String(raw).trim().toLowerCase()
  return ['true', '1', 'yes', 'on'].includes(s)
}, z.boolean())

export const collaboratorOperationalHealthSummaryQuerySchema =
  collaboratorOperationalHealthQuerySchema.extend({
    limit: z.coerce.number().int().min(1).max(200).optional().default(50),
    includeInactive: queryBoolLoose.optional().default(false),
  })

export type CollaboratorOperationalHealthSummaryQuery = z.infer<
  typeof collaboratorOperationalHealthSummaryQuerySchema
>
