import { z } from 'zod'
import { isFutureOperationalDate } from '../../shared/operationalWorkDate.js'

export const listProductionExtraTimeEntriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
})

const createProductionExtraTimeEntryBodyBaseSchema = z.object({
  descriptionId: z.string().uuid(),
  entryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  minutes: z.number().int().min(1, { message: 'minutes deve ser maior que 0.' }),
  notes: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim() : v),
    z.string().max(500, { message: 'notes demasiado longo.' }).optional(),
  ),
})

export const createProductionExtraTimeEntryBodySchema =
  createProductionExtraTimeEntryBodyBaseSchema.superRefine((data, ctx) => {
    if (data.entryDate && isFutureOperationalDate(data.entryDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'entryDate não pode ser uma data futura.',
        path: ['entryDate'],
      })
    }
  })

export type ListProductionExtraTimeEntriesQuery = z.infer<
  typeof listProductionExtraTimeEntriesQuerySchema
>
export type CreateProductionExtraTimeEntryBody = z.infer<
  typeof createProductionExtraTimeEntryBodySchema
>
