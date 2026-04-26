import { z } from 'zod';
export declare const uuidParamSchema: z.ZodString;
export declare const listTeamsQuerySchema: z.ZodEffects<z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    is_active: z.ZodOptional<z.ZodEnum<["true", "false", "all"]>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    offset: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    is_active?: "true" | "false" | "all" | undefined;
    search?: string | undefined;
}, {
    is_active?: "true" | "false" | "all" | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    search?: string | undefined;
}>, {
    search: string | undefined;
    isActiveFilter: "true" | "false" | "all";
    limit: number;
    offset: number;
}, {
    is_active?: "true" | "false" | "all" | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    search?: string | undefined;
}>;
export declare const createTeamBodySchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isActive?: boolean | undefined;
    description?: string | null | undefined;
}, {
    name: string;
    isActive?: boolean | undefined;
    description?: string | null | undefined;
}>;
export declare const patchTeamBodySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>>;
    isActive: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    isActive?: boolean | undefined;
    name?: string | undefined;
    description?: string | null | undefined;
}, {
    isActive?: boolean | undefined;
    name?: string | undefined;
    description?: string | null | undefined;
}>;
export declare const createTeamMemberBodySchema: z.ZodObject<{
    collaboratorId: z.ZodString;
    role: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
    isPrimary: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    collaboratorId: string;
    role?: string | null | undefined;
    isPrimary?: boolean | undefined;
}, {
    collaboratorId: string;
    role?: string | null | undefined;
    isPrimary?: boolean | undefined;
}>;
export declare const patchTeamMemberBodySchema: z.ZodObject<{
    role: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
    isPrimary: z.ZodOptional<z.ZodBoolean>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isActive?: boolean | undefined;
    role?: string | null | undefined;
    isPrimary?: boolean | undefined;
}, {
    isActive?: boolean | undefined;
    role?: string | null | undefined;
    isPrimary?: boolean | undefined;
}>;
export type ListTeamsQuery = z.infer<typeof listTeamsQuerySchema>;
export type CreateTeamBody = z.infer<typeof createTeamBodySchema>;
export type PatchTeamBody = z.infer<typeof patchTeamBodySchema>;
export type CreateTeamMemberBody = z.infer<typeof createTeamMemberBodySchema>;
export type PatchTeamMemberBody = z.infer<typeof patchTeamMemberBodySchema>;
//# sourceMappingURL=teams.schemas.d.ts.map