import { z } from 'zod'

/** Body opcional do POST `/api/v1/conveyors/:id/health-analysis`. */
export const postConveyorHealthAnalysisBodySchema = z
  .object({
    policy: z.enum(['economy', 'balanced', 'quality']).optional(),
  })
  .strict()

export type PostConveyorHealthAnalysisBody = z.infer<
  typeof postConveyorHealthAnalysisBodySchema
>

/** Query do GET `/api/v1/conveyors/:id/health-analysis/history`. */
export const getConveyorHealthAnalysisHistoryQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .strict()

export type GetConveyorHealthAnalysisHistoryQuery = z.infer<
  typeof getConveyorHealthAnalysisHistoryQuerySchema
>

/** Query do GET `/api/v1/conveyors/health-analysis/summary`. */
export const getConveyorHealthSummaryQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(500).default(100),
  })
  .strict()

export type GetConveyorHealthSummaryQuery = z.infer<
  typeof getConveyorHealthSummaryQuerySchema
>
