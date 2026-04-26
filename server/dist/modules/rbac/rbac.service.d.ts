import type pg from 'pg';
import { type PermissionCatalogRow, type RoleRow } from './rbac.repository.js';
import type { PutRolePermissionsBody } from './rbac.schemas.js';
/** Permissões que o papel ADMIN deve manter sempre (V1.5). */
export declare const ADMIN_REQUIRED_PERMISSION_CODES: readonly ["rbac.manage_role_permissions", "users.view", "users.edit", "users.reset_password", "users.force_password_change", "audit.view"];
export declare function serviceListRbacRoles(pool: pg.Pool): Promise<RoleRow[]>;
export declare function serviceListRbacPermissionsCatalog(pool: pg.Pool): Promise<PermissionCatalogRow[]>;
export declare function serviceGetRolePermissionCodes(pool: pg.Pool, roleId: string): Promise<{
    role: RoleRow;
    permissionCodes: string[];
}>;
export declare function servicePutRolePermissions(pool: pg.Pool, actorUserId: string, roleId: string, body: PutRolePermissionsBody): Promise<{
    permissionCodes: string[];
}>;
//# sourceMappingURL=rbac.service.d.ts.map