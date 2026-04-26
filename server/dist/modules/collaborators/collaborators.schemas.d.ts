import { z } from 'zod';
/** Query string da listagem: status e sector_id validados antes do SQL. */
export declare const listCollaboratorsQuerySchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    status: z.ZodOptional<z.ZodString>;
    sector_id: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    sector_id?: string | undefined;
    search?: string | undefined;
}, {
    status?: string | undefined;
    sector_id?: string | undefined;
    search?: string | undefined;
}>, {
    status?: string | undefined;
    sector_id?: string | undefined;
    search?: string | undefined;
}, {
    status?: string | undefined;
    sector_id?: string | undefined;
    search?: string | undefined;
}>, {
    status: "ACTIVE" | "INACTIVE" | "ALL" | undefined;
    sector_id: string | undefined;
    search: string | undefined;
}, {
    status?: string | undefined;
    sector_id?: string | undefined;
    search?: string | undefined;
}>;
export declare const createCollaboratorBodySchema: z.ZodObject<{
    fullName: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    registrationCode: z.ZodOptional<z.ZodString>;
    nickname: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    jobTitle: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>, string | null | undefined, string | null | undefined>;
    sectorId: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    roleId: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "INACTIVE"]>>;
}, "strip", z.ZodTypeAny, {
    fullName: string;
    sectorId: string;
    roleId: string;
    status?: "ACTIVE" | "INACTIVE" | undefined;
    code?: string | undefined;
    email?: string | undefined;
    registrationCode?: string | undefined;
    nickname?: string | undefined;
    phone?: string | undefined;
    jobTitle?: string | undefined;
    avatarUrl?: string | null | undefined;
    notes?: string | undefined;
}, {
    fullName: string;
    sectorId: string;
    roleId: string;
    status?: "ACTIVE" | "INACTIVE" | undefined;
    code?: string | undefined;
    email?: string | undefined;
    registrationCode?: string | undefined;
    nickname?: string | undefined;
    phone?: string | undefined;
    jobTitle?: string | undefined;
    avatarUrl?: string | null | undefined;
    notes?: string | undefined;
}>;
export declare const patchCollaboratorBodySchema: z.ZodEffects<z.ZodObject<{
    fullName: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    registrationCode: z.ZodOptional<z.ZodString>;
    nickname: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    jobTitle: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>, string | null | undefined, string | null | undefined>;
    sectorId: z.ZodOptional<z.ZodString>;
    roleId: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "INACTIVE"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "ACTIVE" | "INACTIVE" | undefined;
    code?: string | undefined;
    email?: string | undefined;
    fullName?: string | undefined;
    registrationCode?: string | undefined;
    nickname?: string | undefined;
    phone?: string | undefined;
    jobTitle?: string | undefined;
    avatarUrl?: string | null | undefined;
    sectorId?: string | undefined;
    roleId?: string | undefined;
    notes?: string | undefined;
}, {
    status?: "ACTIVE" | "INACTIVE" | undefined;
    code?: string | undefined;
    email?: string | undefined;
    fullName?: string | undefined;
    registrationCode?: string | undefined;
    nickname?: string | undefined;
    phone?: string | undefined;
    jobTitle?: string | undefined;
    avatarUrl?: string | null | undefined;
    sectorId?: string | undefined;
    roleId?: string | undefined;
    notes?: string | undefined;
}>, {
    status?: "ACTIVE" | "INACTIVE" | undefined;
    code?: string | undefined;
    email?: string | undefined;
    fullName?: string | undefined;
    registrationCode?: string | undefined;
    nickname?: string | undefined;
    phone?: string | undefined;
    jobTitle?: string | undefined;
    avatarUrl?: string | null | undefined;
    sectorId?: string | undefined;
    roleId?: string | undefined;
    notes?: string | undefined;
}, {
    status?: "ACTIVE" | "INACTIVE" | undefined;
    code?: string | undefined;
    email?: string | undefined;
    fullName?: string | undefined;
    registrationCode?: string | undefined;
    nickname?: string | undefined;
    phone?: string | undefined;
    jobTitle?: string | undefined;
    avatarUrl?: string | null | undefined;
    sectorId?: string | undefined;
    roleId?: string | undefined;
    notes?: string | undefined;
}>;
export type CreateCollaboratorBody = z.infer<typeof createCollaboratorBodySchema>;
export type PatchCollaboratorBody = z.infer<typeof patchCollaboratorBodySchema>;
export declare const uuidParamSchema: z.ZodString;
//# sourceMappingURL=collaborators.schemas.d.ts.map