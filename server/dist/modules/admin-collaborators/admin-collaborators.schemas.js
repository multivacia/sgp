import { z } from 'zod';
const deletedScope = z.enum(['exclude', 'only', 'include']);
const linkedScope = z.enum(['linked', 'unlinked', 'all']);
export const listAdminCollaboratorsQuerySchema = z
    .object({
    search: z.string().optional(),
    sector_id: z.string().optional(),
    role_id: z.string().optional(),
    status: z.string().optional(),
    linked_user: z.string().optional(),
    deleted: z.string().optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
})
    .superRefine((data, ctx) => {
    const st = data.status?.trim();
    if (st !== undefined && st !== '') {
        const u = st.toUpperCase();
        if (!['ACTIVE', 'INACTIVE', 'ALL'].includes(u)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['status'],
                message: 'Parâmetro status inválido. Use ACTIVE, INACTIVE ou ALL.',
            });
        }
    }
    const sid = data.sector_id?.trim();
    if (sid !== undefined && sid !== '') {
        if (sid.toUpperCase() !== 'ALL') {
            const r = z.string().uuid().safeParse(sid);
            if (!r.success) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['sector_id'],
                    message: 'sector_id deve ser um UUID válido ou ALL.',
                });
            }
        }
    }
    const rid = data.role_id?.trim();
    if (rid !== undefined && rid !== '') {
        if (!z.string().uuid().safeParse(rid).success) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['role_id'],
                message: 'role_id deve ser um UUID válido.',
            });
        }
    }
    const lu = data.linked_user?.trim().toLowerCase();
    if (lu !== undefined && lu !== '') {
        if (!['linked', 'unlinked', 'all'].includes(lu)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['linked_user'],
                message: 'linked_user deve ser linked, unlinked ou all.',
            });
        }
    }
    const del = data.deleted?.trim().toLowerCase();
    if (del !== undefined && del !== '') {
        if (!['exclude', 'only', 'include'].includes(del)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['deleted'],
                message: 'deleted deve ser exclude, only ou include.',
            });
        }
    }
})
    .transform((data) => {
    const statusRaw = data.status?.trim();
    const status = statusRaw === undefined || statusRaw === ''
        ? undefined
        : statusRaw.toUpperCase();
    const sectorRaw = data.sector_id?.trim();
    const sector_id = sectorRaw === undefined || sectorRaw === ''
        ? undefined
        : sectorRaw.toUpperCase() === 'ALL'
            ? 'ALL'
            : sectorRaw;
    const roleRaw = data.role_id?.trim();
    const role_id = roleRaw === undefined || roleRaw === '' ? undefined : roleRaw;
    const searchRaw = data.search?.trim();
    const search = searchRaw === undefined || searchRaw === '' ? undefined : searchRaw;
    const linkedRaw = data.linked_user?.trim().toLowerCase();
    const linked_user = linkedRaw === undefined || linkedRaw === ''
        ? 'all'
        : linkedRaw;
    const deletedRaw = data.deleted?.trim().toLowerCase();
    const deleted = deletedRaw === undefined || deletedRaw === ''
        ? 'exclude'
        : deletedRaw;
    const limit = Math.min(500, Math.max(1, Number.parseInt(data.limit ?? '200', 10) || 200));
    const offset = Math.max(0, Number.parseInt(data.offset ?? '0', 10) || 0);
    return { search, sector_id, role_id, status, linked_user, deleted, limit, offset };
});
export const uuidParamSchema = z.string().uuid();
//# sourceMappingURL=admin-collaborators.schemas.js.map