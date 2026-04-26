import { z } from 'zod';
const MAX_LIMIT = 100;
export const operationalJourneyQuerySchema = z
    .object({
    periodPreset: z.enum(['7d', '15d', '30d', 'month', 'custom']).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
    conveyorId: z.string().uuid().optional(),
})
    .superRefine((data, ctx) => {
    const hasFrom = Boolean(data.from?.trim());
    const hasTo = Boolean(data.to?.trim());
    const preset = data.periodPreset;
    const implicitCustom = !preset && hasFrom && hasTo;
    const explicitCustom = preset === 'custom';
    if (explicitCustom || implicitCustom) {
        if (!hasFrom || !hasTo) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Intervalo personalizado requer os parâmetros from e to (ISO 8601).',
                path: ['from'],
            });
        }
    }
})
    .transform((data) => {
    const from = data.from?.trim() || undefined;
    const to = data.to?.trim() || undefined;
    let periodPreset;
    if (from && to && !data.periodPreset) {
        periodPreset = 'custom';
    }
    else if (data.periodPreset) {
        periodPreset = data.periodPreset;
    }
    else {
        periodPreset = '7d';
    }
    return {
        periodPreset,
        from,
        to,
        limit: data.limit ?? 20,
        conveyorId: data.conveyorId?.trim(),
    };
});
//# sourceMappingURL=operational-journey.schemas.js.map