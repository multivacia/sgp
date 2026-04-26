import { z } from 'zod';
export declare const getMyActivitiesQuerySchema: z.ZodEffects<z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    collaboratorId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email?: string | undefined;
    collaboratorId?: string | undefined;
}, {
    email?: string | undefined;
    collaboratorId?: string | undefined;
}>, {
    email?: string | undefined;
    collaboratorId?: string | undefined;
}, {
    email?: string | undefined;
    collaboratorId?: string | undefined;
}>;
export type GetMyActivitiesQueryParsed = z.infer<typeof getMyActivitiesQuerySchema>;
//# sourceMappingURL=my-activities.schemas.d.ts.map