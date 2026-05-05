import { z } from 'zod'

export const timeEntryCandidatesQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(50),
})

export type TimeEntryCandidatesQuery = z.infer<typeof timeEntryCandidatesQuerySchema>
