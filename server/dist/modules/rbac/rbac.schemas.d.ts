import { z } from 'zod';
export declare const putRolePermissionsBodySchema: z.ZodObject<{
    permissionCodes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    permissionCodes: string[];
}, {
    permissionCodes?: string[] | undefined;
}>;
export type PutRolePermissionsBody = z.infer<typeof putRolePermissionsBodySchema>;
//# sourceMappingURL=rbac.schemas.d.ts.map