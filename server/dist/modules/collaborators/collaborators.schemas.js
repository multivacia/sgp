import { z } from 'zod';
/** Avatar opcional: vazio ou null ignorados; se preenchido, deve ser http(s). */
const avatarUrlFieldSchema = z
    .union([z.string(), z.null()])
    .optional()
    .superRefine((val, ctx) => {
    if (val === undefined || val === null)
        return;
    const t = val.trim();
    if (t === '')
        return;
    if (!/^https?:\/\/.+/i.test(t)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'URL do avatar deve começar por http:// ou https://.',
        });
    }
});
/** Query string da listagem: status e sector_id validados antes do SQL. */
export const listCollaboratorsQuerySchema = z
    .object({
    status: z.string().optional(),
    sector_id: z.string().optional(),
    search: z.string().optional(),
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
    const searchRaw = data.search?.trim();
    const search = searchRaw === undefined || searchRaw === '' ? undefined : searchRaw;
    return { status, sector_id, search };
});
const uuidTrimmed = z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().uuid({ message: 'Identificador inválido (UUID esperado).' }));
export const createCollaboratorBodySchema = z
    .object({
    fullName: z
        .string()
        .transform((s) => s.trim())
        .pipe(z.string().min(1, { message: 'Nome é obrigatório.' })),
    code: z.string().optional(),
    registrationCode: z.string().optional(),
    nickname: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    jobTitle: z.string().optional(),
    avatarUrl: avatarUrlFieldSchema,
    sectorId: uuidTrimmed,
    roleId: uuidTrimmed,
    notes: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
export const patchCollaboratorBodySchema = z
    .object({
    fullName: z.string().optional(),
    code: z.string().optional(),
    registrationCode: z.string().optional(),
    nickname: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    jobTitle: z.string().optional(),
    avatarUrl: avatarUrlFieldSchema,
    sectorId: z.string().optional(),
    roleId: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
})
    .superRefine((data, ctx) => {
    if (data.fullName !== undefined) {
        const t = data.fullName.trim();
        if (!t) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['fullName'],
                message: 'Nome não pode ficar vazio.',
            });
        }
    }
    if (data.sectorId !== undefined) {
        const t = data.sectorId.trim();
        if (!t) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['sectorId'],
                message: 'Escolha um setor.',
            });
        }
        else if (!z.string().uuid().safeParse(t).success) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['sectorId'],
                message: 'Setor inválido.',
            });
        }
    }
    if (data.roleId !== undefined) {
        const t = data.roleId.trim();
        if (!t) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['roleId'],
                message: 'Escolha uma função / papel operacional.',
            });
        }
        else if (!z.string().uuid().safeParse(t).success) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['roleId'],
                message: 'Função / papel operacional inválido.',
            });
        }
    }
});
export const uuidParamSchema = z.string().uuid();
//# sourceMappingURL=collaborators.schemas.js.map