import { z } from 'zod'

export const timeEntryCandidatesQuerySchema = z.object({
  q: z.string().optional(),
  /** Esteira/OS (nome, código, cliente, veículo, placa) — AND com `activityQ`. `q` com `&` preenche ambos. */
  conveyorQ: z.string().max(200).optional(),
  /** Nome da atividade — AND com `conveyorQ`. */
  activityQ: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(50),
  includeUnassigned: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true' || v === '1'),
})

export type TimeEntryCandidatesQuery = z.infer<typeof timeEntryCandidatesQuerySchema>
