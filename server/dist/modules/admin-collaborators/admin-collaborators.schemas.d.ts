import { z } from 'zod';
export declare const listAdminCollaboratorsQuerySchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    sector_id: z.ZodOptional<z.ZodString>;
    role_id: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    linked_user: z.ZodOptional<z.ZodString>;
    deleted: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodString>;
    offset: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    role_id?: string | undefined;
    limit?: string | undefined;
    offset?: string | undefined;
    sector_id?: string | undefined;
    search?: string | undefined;
    linked_user?: string | undefined;
    deleted?: string | undefined;
}, {
    status?: string | undefined;
    role_id?: string | undefined;
    limit?: string | undefined;
    offset?: string | undefined;
    sector_id?: string | undefined;
    search?: string | undefined;
    linked_user?: string | undefined;
    deleted?: string | undefined;
}>, {
    status?: string | undefined;
    role_id?: string | undefined;
    limit?: string | undefined;
    offset?: string | undefined;
    sector_id?: string | undefined;
    search?: string | undefined;
    linked_user?: string | undefined;
    deleted?: string | undefined;
}, {
    status?: string | undefined;
    role_id?: string | undefined;
    limit?: string | undefined;
    offset?: string | undefined;
    sector_id?: string | undefined;
    search?: string | undefined;
    linked_user?: string | undefined;
    deleted?: string | undefined;
}>, {
    search: string | undefined;
    sector_id: string | undefined;
    role_id: string | undefined;
    status: "ACTIVE" | "INACTIVE" | "ALL" | undefined;
    linked_user: "linked" | "unlinked" | "all";
    deleted: "exclude" | "only" | "include";
    limit: number;
    offset: number;
}, {
    status?: string | undefined;
    role_id?: string | undefined;
    limit?: string | undefined;
    offset?: string | undefined;
    sector_id?: string | undefined;
    search?: string | undefined;
    linked_user?: string | undefined;
    deleted?: string | undefined;
}>;
export type ListAdminCollaboratorsQuery = z.infer<typeof listAdminCollaboratorsQuerySchema>;
export declare const uuidParamSchema: z.ZodString;
//# sourceMappingURL=admin-collaborators.schemas.d.ts.map