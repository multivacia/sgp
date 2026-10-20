import { z } from 'zod'

/**
 * Período do Dashboard: `startDate` e `endDate` (`YYYY-MM-DD`, dias civis de São Paulo,
 * inclusivos). A validação semântica (obrigatoriedade do par, data existente, ordem) fica em
 * `resolveDashboardPeriod` para responder 400 com mensagens em português.
 */
const dashboardPeriodQueryFields = {
  startDate: z.string().max(64).optional(),
  endDate: z.string().max(64).optional(),
}

/**
 * Gerencial. Precedência: `startDate`/`endDate` (quando enviados) > `days` (legado:
 * últimos N dias até agora; padrão 30 sem nenhum dos dois).
 */
export const executiveDashboardQuerySchema = z.object({
  ...dashboardPeriodQueryFields,
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
})

export type ExecutiveDashboardQuery = z.infer<
  typeof executiveDashboardQuerySchema
>

/**
 * Operacional: horas apontadas no período. Precedência: `startDate`/`endDate` (quando
 * enviados) > `realizedPeriodPreset` (legado). Sem nenhum dos dois, não há indicador de período.
 */
export const operationalDashboardQuerySchema = z.object({
  ...dashboardPeriodQueryFields,
  realizedPeriodPreset: z.enum(['7d', '15d', '30d', 'month']).optional(),
})

export type OperationalDashboardQuery = z.infer<
  typeof operationalDashboardQuerySchema
>
