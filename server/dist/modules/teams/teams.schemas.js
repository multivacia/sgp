import { z } from 'zod';
export const uuidParamSchema = z.string().uuid();
export const listTeamsQuerySchema = z
    .object({
    search: z.string().optional(),
    is_active: z.enum(['true', 'false', 'all']).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
})
    .transform((data) => {
    const searchRaw = data.search?.trim();
    const f = data.is_active;
    const isActiveFilter = f === 'true' || f === 'false' ? f : 'all';
    return {
        search: searchRaw === undefined || searchRaw === '' ? undefined : searchRaw,
        isActiveFilter,
        limit: data.limit,
        offset: data.offset,
    };
});
export const createTeamBodySchema = z.object({
    name: z.string().trim().min(1).max(256),
    description: z.union([z.string().max(4000), z.null()]).optional(),
    isActive: z.boolean().optional(),
});
export const patchTeamBodySchema = createTeamBodySchema.partial();
export const createTeamMemberBodySchema = z.object({
    collaboratorId: z.string().uuid(),
    role: z.union([z.string().trim().max(128), z.null()]).optional(),
    isPrimary: z.boolean().optional(),
});
export const patchTeamMemberBodySchema = z.object({
    role: z.union([z.string().trim().max(128), z.null()]).optional(),
    isPrimary: z.boolean().optional(),
    isActive: z.boolean().optional(),
});
//# sourceMappingURL=teams.schemas.js.map