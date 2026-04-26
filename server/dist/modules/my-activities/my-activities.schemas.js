import { z } from 'zod';
export const getMyActivitiesQuerySchema = z
    .object({
    email: z.string().email().optional(),
    collaboratorId: z.string().uuid().optional(),
})
    .refine((q) => q.email !== undefined || q.collaboratorId !== undefined, {
    message: 'Informe email (query ou cabeçalho X-User-Email) ou collaboratorId.',
});
//# sourceMappingURL=my-activities.schemas.js.map