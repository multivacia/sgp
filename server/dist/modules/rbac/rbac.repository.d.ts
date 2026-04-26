import type pg from 'pg';
export type PermissionCatalogRow = {
    id: string;
    code: string;
    name: string;
};
export type RoleRow = {
    id: string;
    code: string;
    name: string;
};
export declare function listRoles(pool: pg.Pool): Promise<RoleRow[]>;
export declare function listPermissionsCatalog(pool: pg.Pool): Promise<PermissionCatalogRow[]>;
export declare function findRoleById(pool: pg.Pool, roleId: string): Promise<RoleRow | null>;
export declare function getPermissionCodesForRole(pool: pg.Pool, roleId: string): Promise<string[]>;
export declare function resolvePermissionIdsByCodes(client: pg.Pool | pg.PoolClient, codes: string[]): Promise<Map<string, string>>;
export declare function replaceRolePermissions(client: pg.PoolClient, roleId: string, permissionIds: string[]): Promise<void>;
//# sourceMappingURL=rbac.repository.d.ts.map