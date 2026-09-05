import { z } from 'zod'

/**
 * Validação equivalente à do fluxo web (`extra-time-entries.schemas.ts`),
 * com a regra adicional de bloqueio de `entryDate` futura — específica do
 * Modo Fábrica (apontamento no momento do trabalho, não pode "adiantar" data).
 */

export const productionListExtraTimeEntriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
})

function todayIsoDate(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const productionCreateExtraTimeEntryBaseSchema = z.object({
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

export const productionCreateExtraTimeEntryBodySchema =
  productionCreateExtraTimeEntryBaseSchema.superRefine((data, ctx) => {
    if (data.entryDate && data.entryDate > todayIsoDate()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'entryDate não pode ser uma data futura.',
        path: ['entryDate'],
      })
    }
  })

export type ProductionListExtraTimeEntriesQuery = z.infer<
  typeof productionListExtraTimeEntriesQuerySchema
>
export type ProductionCreateExtraTimeEntryBody = z.infer<
  typeof productionCreateExtraTimeEntryBodySchema
>
