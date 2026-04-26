import { z } from 'zod';
export declare const conveyorStepParamsSchema: z.ZodObject<{
    conveyorId: z.ZodString;
    stepNodeId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    conveyorId: string;
    stepNodeId: string;
}, {
    conveyorId: string;
    stepNodeId: string;
}>;
export declare const assigneeScopedParamsSchema: z.ZodObject<{
    conveyorId: z.ZodString;
    stepNodeId: z.ZodString;
} & {
    assigneeId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    conveyorId: string;
    stepNodeId: string;
    assigneeId: string;
}, {
    conveyorId: string;
    stepNodeId: string;
    assigneeId: string;
}>;
export declare const timeEntryScopedParamsSchema: z.ZodObject<{
    conveyorId: z.ZodString;
    stepNodeId: z.ZodString;
} & {
    timeEntryId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    conveyorId: string;
    stepNodeId: string;
    timeEntryId: string;
}, {
    conveyorId: string;
    stepNodeId: string;
    timeEntryId: string;
}>;
export declare const postAssigneeBodySchema: z.ZodEffects<z.ZodObject<{
    /** Retrocompat: ausente => COLLABORATOR. */
    type: z.ZodOptional<z.ZodEnum<["COLLABORATOR", "TEAM"]>>;
    collaboratorId: z.ZodOptional<z.ZodString>;
    teamId: z.ZodOptional<z.ZodString>;
    isPrimary: z.ZodOptional<z.ZodBoolean>;
    assignmentOrigin: z.ZodOptional<z.ZodEnum<["manual", "base", "reaproveitada"]>>;
    orderIndex: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type?: "COLLABORATOR" | "TEAM" | undefined;
    collaboratorId?: string | undefined;
    teamId?: string | undefined;
    isPrimary?: boolean | undefined;
    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
    orderIndex?: number | undefined;
}, {
    type?: "COLLABORATOR" | "TEAM" | undefined;
    collaboratorId?: string | undefined;
    teamId?: string | undefined;
    isPrimary?: boolean | undefined;
    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
    orderIndex?: number | undefined;
}>, {
    type?: "COLLABORATOR" | "TEAM" | undefined;
    collaboratorId?: string | undefined;
    teamId?: string | undefined;
    isPrimary?: boolean | undefined;
    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
    orderIndex?: number | undefined;
}, {
    type?: "COLLABORATOR" | "TEAM" | undefined;
    collaboratorId?: string | undefined;
    teamId?: string | undefined;
    isPrimary?: boolean | undefined;
    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
    orderIndex?: number | undefined;
}>;
export type PostAssigneeBody = z.infer<typeof postAssigneeBodySchema>;
/** POST time-entries: colaborador vem da sessão (`app_users.collaborator_id`). */
export declare const postTimeEntryBodySchema: z.ZodObject<{
    minutes: z.ZodNumber;
    entryAt: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    notes: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
    entryMode: z.ZodOptional<z.ZodEnum<["manual", "guided", "imported"]>>;
}, "strip", z.ZodTypeAny, {
    minutes: number;
    notes?: string | null | undefined;
    entryAt?: string | undefined;
    entryMode?: "manual" | "guided" | "imported" | undefined;
}, {
    minutes: number;
    notes?: string | null | undefined;
    entryAt?: string | undefined;
    entryMode?: "manual" | "guided" | "imported" | undefined;
}>;
export type PostTimeEntryBody = z.infer<typeof postTimeEntryBodySchema>;
export declare const postTimeEntryOnBehalfBodySchema: z.ZodObject<{
    targetCollaboratorId: z.ZodString;
    minutes: z.ZodNumber;
    entryAt: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    notes: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    minutes: number;
    reason: string;
    targetCollaboratorId: string;
    notes?: string | null | undefined;
    entryAt?: string | undefined;
}, {
    minutes: number;
    reason: string;
    targetCollaboratorId: string;
    notes?: string | null | undefined;
    entryAt?: string | undefined;
}>;
export type PostTimeEntryOnBehalfBody = z.infer<typeof postTimeEntryOnBehalfBodySchema>;
export declare const deleteTimeEntryBodySchema: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason?: string | undefined;
}, {
    reason?: string | undefined;
}>;
export type DeleteTimeEntryBody = z.infer<typeof deleteTimeEntryBodySchema>;
//# sourceMappingURL=conveyorAssignments.schemas.d.ts.map