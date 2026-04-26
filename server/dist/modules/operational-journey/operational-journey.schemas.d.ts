import { z } from 'zod';
export declare const operationalJourneyQuerySchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    periodPreset: z.ZodOptional<z.ZodEnum<["7d", "15d", "30d", "month", "custom"]>>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
    conveyorId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit?: number | undefined;
    periodPreset?: "custom" | "7d" | "15d" | "30d" | "month" | undefined;
    from?: string | undefined;
    to?: string | undefined;
    conveyorId?: string | undefined;
}, {
    limit?: number | undefined;
    periodPreset?: "custom" | "7d" | "15d" | "30d" | "month" | undefined;
    from?: string | undefined;
    to?: string | undefined;
    conveyorId?: string | undefined;
}>, {
    limit?: number | undefined;
    periodPreset?: "custom" | "7d" | "15d" | "30d" | "month" | undefined;
    from?: string | undefined;
    to?: string | undefined;
    conveyorId?: string | undefined;
}, {
    limit?: number | undefined;
    periodPreset?: "custom" | "7d" | "15d" | "30d" | "month" | undefined;
    from?: string | undefined;
    to?: string | undefined;
    conveyorId?: string | undefined;
}>, {
    periodPreset: "custom" | "7d" | "15d" | "30d" | "month";
    from: string | undefined;
    to: string | undefined;
    limit: number;
    conveyorId: string | undefined;
}, {
    limit?: number | undefined;
    periodPreset?: "custom" | "7d" | "15d" | "30d" | "month" | undefined;
    from?: string | undefined;
    to?: string | undefined;
    conveyorId?: string | undefined;
}>;
export type OperationalJourneyQuery = z.infer<typeof operationalJourneyQuerySchema>;
//# sourceMappingURL=operational-journey.schemas.d.ts.map