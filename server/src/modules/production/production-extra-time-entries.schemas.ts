import { z } from 'zod'

/** Data local do servidor no formato YYYY-MM-DD (mesma referência usada no restante do módulo). */
function todayIsoLocal(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

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
    if (data.entryDate && data.entryDate > todayIsoLocal()) {
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
