import { z } from 'zod';
export const conveyorStepParamsSchema = z.object({
    conveyorId: z.string().uuid(),
    stepNodeId: z.string().uuid(),
});
export const assigneeScopedParamsSchema = conveyorStepParamsSchema.extend({
    assigneeId: z.string().uuid(),
});
export const timeEntryScopedParamsSchema = conveyorStepParamsSchema.extend({
    timeEntryId: z.string().uuid(),
});
export const postAssigneeBodySchema = z.object({
    /** Retrocompat: ausente => COLLABORATOR. */
    type: z.enum(['COLLABORATOR', 'TEAM']).optional(),
    collaboratorId: z.string().uuid().optional(),
    teamId: z.string().uuid().optional(),
    isPrimary: z.boolean().optional(),
    assignmentOrigin: z.enum(['manual', 'base', 'reaproveitada']).optional(),
    orderIndex: z.number().int().min(0).optional(),
}).superRefine((a, ctx) => {
    const t = a.type ?? 'COLLABORATOR';
    if (t === 'COLLABORATOR') {
        if (!a.collaboratorId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'collaboratorId é obrigatório para assignee COLLABORATOR.',
                path: ['collaboratorId'],
            });
        }
        if (a.teamId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'teamId não é permitido para assignee COLLABORATOR.',
                path: ['teamId'],
            });
        }
        return;
    }
    if (!a.teamId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'teamId é obrigatório para assignee TEAM.',
            path: ['teamId'],
        });
    }
    if (a.collaboratorId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'collaboratorId não é permitido para assignee TEAM.',
            path: ['collaboratorId'],
        });
    }
    if (a.isPrimary === true) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Assignee TEAM não pode ser principal.',
            path: ['isPrimary'],
        });
    }
});
const isoDateTime = z
    .string()
    .min(1)
    .refine((s) => !Number.isNaN(Date.parse(s)), 'Data/hora inválida.');
/** POST time-entries: colaborador vem da sessão (`app_users.collaborator_id`). */
export const postTimeEntryBodySchema = z.object({
    minutes: z.number().int().positive(),
    entryAt: isoDateTime.optional(),
    notes: z.union([z.string(), z.null()]).optional(),
    entryMode: z.enum(['manual', 'guided', 'imported']).optional(),
});
export const postTimeEntryOnBehalfBodySchema = z.object({
    targetCollaboratorId: z.string().uuid(),
    minutes: z.number().int().positive(),
    entryAt: isoDateTime.optional(),
    notes: z.union([z.string(), z.null()]).optional(),
    reason: z
        .string()
        .min(1, 'Indique o motivo.')
        .max(4000),
});
export const deleteTimeEntryBodySchema = z.object({
    reason: z.string().optional(),
});
//# sourceMappingURL=conveyorAssignments.schemas.js.map