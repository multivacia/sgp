import { z } from 'zod'
import { PRODUCTION_OUT_OF_SEQUENCE_JUSTIFICATION_MAX } from './production-out-of-sequence.js'

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

export const productionUnassignedTimeEntryBodySchema = z.object({
  conveyorId: z.string().uuid(),
  stepNodeId: z.string().uuid(),
  minutes: z.number().int().min(1),
  note: z.union([z.string().max(2000).trim(), z.null()]).optional(),
  exceptionJustificationId: z.string().uuid().optional(),
  exceptionJustificationComplement: z
    .union([z.string().max(2000).trim(), z.null()])
    .optional(),
  exceptionJustification: z
    .union([z.string().max(4000).trim(), z.null()])
    .optional(),
  outOfSequenceJustificationId: z.string().uuid().optional(),
  outOfSequenceJustificationComplement: z
    .union([z.string().max(2000).trim(), z.null()])
    .optional(),
  outOfSequenceJustification: z
    .union([z.string().max(4000).trim(), z.null()])
    .optional(),
})

export type ProductionUnassignedTimeEntryBody = z.infer<
  typeof productionUnassignedTimeEntryBodySchema
>
