import { z } from 'zod'

export const executiveDashboardQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
})

export type ExecutiveDashboardQuery = z.infer<
  typeof executiveDashboardQuerySchema
>

/** Query opcional do painel operacional — soma de apontamentos numa janela (V1.5). */
export const operationalDashboardQuerySchema = z.object({
  realizedPeriodPreset: z.enum(['7d', '15d', '30d', 'month']).optional(),
})

export type OperationalDashboardQuery = z.infer<
  typeof operationalDashboardQuerySchema
>
