import { z } from 'zod'
import { isFutureOperationalDate } from '../../shared/operationalWorkDate.js'

const entryDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.').refine(
  (value) => {
    const date = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  },
  'Data inválida.',
).refine((value) => !isFutureOperationalDate(value), 'A data não pode ser futura.')

const reason = z.string().trim().min(1, 'Informe o motivo da correção.').max(4000)

export const extraTimeEntryParamsSchema = z.object({
  timeEntryId: z.string().uuid(),
})
export const patchExtraTimeEntryBodySchema = z.object({
  expectedUpdatedAt: z.string().datetime({ offset: true }),
  reason,
  descriptionId: z.string().uuid(),
  entryDate,
  minutes: z.number().int().positive(),
  notes: z.string().trim().max(500).nullable(),
}).strict()
export const deleteExtraTimeEntryBodySchema = z.object({
  expectedUpdatedAt: z.string().datetime({ offset: true }),
  reason,
}).strict()

export type PatchExtraTimeEntryBody = z.infer<typeof patchExtraTimeEntryBodySchema>
export type DeleteExtraTimeEntryBody = z.infer<typeof deleteExtraTimeEntryBodySchema>
