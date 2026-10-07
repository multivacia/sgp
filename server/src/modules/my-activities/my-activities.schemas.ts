import { z } from 'zod'

export const timeEntryCandidatesQuerySchema = z.object({
  q: z.string().optional(),
  /** Filtro por esteira (nome, código, cliente, veículo, placa) — combinado com `activityQ` via AND. */
  conveyorQ: z.string().max(200).optional(),
  /** Filtro por atividade (atividade, setor, tarefa) — combinado com `conveyorQ` via AND. */
  activityQ: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(50),
  includeUnassigned: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true' || v === '1'),
})

export type TimeEntryCandidatesQuery = z.infer<typeof timeEntryCandidatesQuerySchema>
