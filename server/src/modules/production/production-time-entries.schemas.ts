import { z } from 'zod'
import { PRODUCTION_OUT_OF_SEQUENCE_JUSTIFICATION_MAX } from './production-out-of-sequence.js'

/** Data/hora de realização do trabalho (ISO 8601 com fuso, ou `YYYY-MM-DD` = meio-dia de SP). */
const entryAtInput = z
  .string()
  .min(1)
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Data/hora inválida.')

const productionTimeEntryBodyBaseSchema = z.object({
  conveyorId: z.string().uuid(),
  stepNodeId: z.string().uuid(),
  minutes: z.number().int(),
  executedQuantity: z.number().int().min(0).nullable().optional(),
  note: z.union([z.string().max(2000).trim(), z.null()]).optional(),
  sessionCompletionPct: z.number().int().min(0).max(100).nullable().optional(),
  markAsDone: z.boolean().optional(),
  outOfSequenceJustification: z
    .union([z.string().max(PRODUCTION_OUT_OF_SEQUENCE_JUSTIFICATION_MAX), z.null()])
    .optional(),
  justificationId: z.string().uuid().optional(),
  justificationComplement: z.union([z.string().max(2000), z.null()]).optional(),
  entryAt: entryAtInput.optional(),
})

export const productionTimeEntryBodySchema = productionTimeEntryBodyBaseSchema.superRefine(
  (data, ctx) => {
    if (data.minutes < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'minutes não pode ser negativo.',
        path: ['minutes'],
      })
      return
    }
    if (data.minutes === 0 && data.markAsDone !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'minutes deve ser maior que zero.',
        path: ['minutes'],
      })
    }
  },
)

export type ProductionTimeEntryBody = z.infer<typeof productionTimeEntryBodySchema>

/** Apontamento em "Outra Atividade" — atividade real de uma esteira, sem alocação/responsabilidade. */
export const productionUnassignedTimeEntryBodySchema = z.object({
  conveyorId: z.string().uuid(),
  stepNodeId: z.string().uuid(),
  minutes: z.number().int().min(1, { message: 'minutes deve ser maior que 0.' }),
  note: z.union([z.string().max(2000).trim(), z.null()]).optional(),
  exceptionJustification: z
    .union([z.string().max(PRODUCTION_OUT_OF_SEQUENCE_JUSTIFICATION_MAX), z.null()])
    .optional(),
  exceptionJustificationId: z.string().uuid().optional(),
  exceptionJustificationComplement: z.union([z.string().max(2000), z.null()]).optional(),
  outOfSequenceJustification: z
    .union([z.string().max(PRODUCTION_OUT_OF_SEQUENCE_JUSTIFICATION_MAX), z.null()])
    .optional(),
  outOfSequenceJustificationId: z.string().uuid().optional(),
  outOfSequenceJustificationComplement: z.union([z.string().max(2000), z.null()]).optional(),
  entryAt: entryAtInput.optional(),
})

export type ProductionUnassignedTimeEntryBody = z.infer<
  typeof productionUnassignedTimeEntryBodySchema
>
