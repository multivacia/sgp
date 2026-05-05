import { z } from 'zod'

export const listExtraTimeEntriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
})

export const createExtraTimeEntryBodySchema = z.object({
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

export type ListExtraTimeEntriesQuery = z.infer<typeof listExtraTimeEntriesQuerySchema>
export type CreateExtraTimeEntryBody = z.infer<typeof createExtraTimeEntryBodySchema>
