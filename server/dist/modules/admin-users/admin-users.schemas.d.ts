import { z } from 'zod';
export declare const uuidParamSchema: z.ZodString;
export declare const listAdminUsersQuerySchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    role_id: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    role_id?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    search?: string | undefined;
}, {
    role_id?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    search?: string | undefined;
}>, {
    role_id?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    search?: string | undefined;
}, {
    role_id?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    search?: string | undefined;
}>, {
    search: string | undefined;
    roleId: string | undefined;
    limit: number;
    offset: number;
}, {
    role_id?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    search?: string | undefined;
}>;
export declare const createAdminUserBodySchema: z.ZodEffects<z.ZodObject<{
    email: z.ZodString;
    roleId: z.ZodString;
    collaboratorId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
    avatarUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">, z.ZodNull]>>;
    password: z.ZodString;
    mustChangePassword: z.ZodOptional<z.ZodBoolean>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    password: string;
    email: string;
    roleId: string;
    avatarUrl?: string | null | undefined;
    collaboratorId?: string | null | undefined;
    mustChangePassword?: boolean | undefined;
    isActive?: boolean | undefined;
}, {
    password: string;
    email: string;
    roleId: string;
    avatarUrl?: string | null | undefined;
    collaboratorId?: string | null | undefined;
    mustChangePassword?: boolean | undefined;
    isActive?: boolean | undefined;
}>, {
    password: string;
    email: string;
    roleId: string;
    avatarUrl?: string | null | undefined;
    collaboratorId?: string | null | undefined;
    mustChangePassword?: boolean | undefined;
    isActive?: boolean | undefined;
}, {
    password: string;
    email: string;
    roleId: string;
    avatarUrl?: string | null | undefined;
    collaboratorId?: string | null | undefined;
    mustChangePassword?: boolean | undefined;
    isActive?: boolean | undefined;
}>;
export declare const patchAdminUserBodySchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    roleId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
    collaboratorId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
    avatarUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">, z.ZodNull]>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    mustChangePassword: z.ZodOptional<z.ZodBoolean>;
    password: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    password?: string | undefined;
    email?: string | undefined;
    avatarUrl?: string | null | undefined;
    roleId?: string | null | undefined;
    collaboratorId?: string | null | undefined;
    mustChangePassword?: boolean | undefined;
    isActive?: boolean | undefined;
}, {
    password?: unknown;
    email?: string | undefined;
    avatarUrl?: string | null | undefined;
    roleId?: string | null | undefined;
    collaboratorId?: string | null | undefined;
    mustChangePassword?: boolean | undefined;
    isActive?: boolean | undefined;
}>, {
    password?: string | undefined;
    email?: string | undefined;
    avatarUrl?: string | null | undefined;
    roleId?: string | null | undefined;
    collaboratorId?: string | null | undefined;
    mustChangePassword?: boolean | undefined;
    isActive?: boolean | undefined;
}, {
    password?: unknown;
    email?: string | undefined;
    avatarUrl?: string | null | undefined;
    roleId?: string | null | undefined;
    collaboratorId?: string | null | undefined;
    mustChangePassword?: boolean | undefined;
    isActive?: boolean | undefined;
}>, {
    password?: string | undefined;
    email?: string | undefined;
    avatarUrl?: string | null | undefined;
    roleId?: string | null | undefined;
    collaboratorId?: string | null | undefined;
    mustChangePassword?: boolean | undefined;
    isActive?: boolean | undefined;
}, {
    password?: unknown;
    email?: string | undefined;
    avatarUrl?: string | null | undefined;
    roleId?: string | null | undefined;
    collaboratorId?: string | null | undefined;
    mustChangePassword?: boolean | undefined;
    isActive?: boolean | undefined;
}>;
export declare const eligibleCollaboratorsQuerySchema: z.ZodEffects<z.ZodObject<{
    excludeUserId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    excludeUserId?: string | undefined;
}, {
    excludeUserId?: string | undefined;
}>, {
    excludeUserId: string | null;
}, {
    excludeUserId?: string | undefined;
}>;
export type CreateAdminUserBody = z.infer<typeof createAdminUserBodySchema>;
export type PatchAdminUserBody = z.infer<typeof patchAdminUserBodySchema>;
//# sourceMappingURL=admin-users.schemas.d.ts.map