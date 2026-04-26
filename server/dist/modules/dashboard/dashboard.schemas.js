import { z } from 'zod';
export const executiveDashboardQuerySchema = z.object({
    days: z.coerce.number().int().min(1).max(365).optional().default(30),
});
/** Query opcional do painel operacional — soma de apontamentos numa janela (V1.5). */
export const operationalDashboardQuerySchema = z.object({
    realizedPeriodPreset: z.enum(['7d', '15d', '30d', 'month']).optional(),
});
//# sourceMappingURL=dashboard.schemas.js.map