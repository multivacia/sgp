import { z } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')

const booleanQuery = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => {
    if (value == null) return undefined
    if (typeof value === 'boolean') return value
    return value.trim().toLowerCase() === 'true'
  })

export const myWorkQueueQuerySchema = z.object({
  date: isoDate.optional(),
  includePastDue: booleanQuery.default(true),
  /** Pesquisa por período (data planejada, inclusiva). Início e fim opcionais. */
  from: isoDate.optional(),
  to: isoDate.optional(),
})

export type MyWorkQueueQuery = z.infer<typeof myWorkQueueQuerySchema>
