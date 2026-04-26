import { z } from 'zod';
export declare const executiveDashboardQuerySchema: z.ZodObject<{
    days: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    days: number;
}, {
    days?: number | undefined;
}>;
export type ExecutiveDashboardQuery = z.infer<typeof executiveDashboardQuerySchema>;
/** Query opcional do painel operacional — soma de apontamentos numa janela (V1.5). */
export declare const operationalDashboardQuerySchema: z.ZodObject<{
    realizedPeriodPreset: z.ZodOptional<z.ZodEnum<["7d", "15d", "30d", "month"]>>;
}, "strip", z.ZodTypeAny, {
    realizedPeriodPreset?: "7d" | "15d" | "30d" | "month" | undefined;
}, {
    realizedPeriodPreset?: "7d" | "15d" | "30d" | "month" | undefined;
}>;
export type OperationalDashboardQuery = z.infer<typeof operationalDashboardQuerySchema>;
//# sourceMappingURL=dashboard.schemas.d.ts.map