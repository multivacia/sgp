import { z } from 'zod'
import { PRODUCTION_OUT_OF_SEQUENCE_JUSTIFICATION_MAX } from './production-out-of-sequence.js'

export const productionTimeEntryBodySchema = z.object({
  conveyorId: z.string().uuid(),
  stepNodeId: z.string().uuid(),
  minutes: z.number().int().positive('minutes deve ser maior que zero.'),
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

export type ProductionTimeEntryBody = z.infer<typeof productionTimeEntryBodySchema>
