import type pg from 'pg';
import type { AdminPasswordResetResult, AdminUserListItem } from './admin-users.types.js';
import { type AdminUserListFilters } from './admin-users.repository.js';
import type { CreateAdminUserBody, PatchAdminUserBody } from './admin-users.schemas.js';
export declare function serviceCollaboratorLinkageSummary(pool: pg.Pool): Promise<{
    unlinkedActiveUserCount: number;
}>;
export declare function serviceListUsers(pool: pg.Pool, filters: AdminUserListFilters): Promise<{
    data: AdminUserListItem[];
    total: number;
}>;
export declare function serviceGetUserById(pool: pg.Pool, id: string): Promise<AdminUserListItem>;
export declare function serviceCreateUser(pool: pg.Pool, actorUserId: string, body: CreateAdminUserBody): Promise<AdminUserListItem>;
export declare function servicePatchUser(pool: pg.Pool, actorUserId: string, id: string, body: PatchAdminUserBody): Promise<AdminUserListItem>;
export declare function serviceActivate(pool: pg.Pool, actorUserId: string, id: string): Promise<AdminUserListItem>;
export declare function serviceInactivate(pool: pg.Pool, actorUserId: string, id: string): Promise<AdminUserListItem>;
export declare function serviceSoftDelete(pool: pg.Pool, actorUserId: string, id: string): Promise<AdminUserListItem>;
export declare function serviceRestore(pool: pg.Pool, actorUserId: string, id: string): Promise<AdminUserListItem>;
export declare function serviceForcePasswordChange(pool: pg.Pool, actorUserId: string, id: string): Promise<AdminUserListItem>;
export declare function serviceResetPassword(pool: pg.Pool, actorUserId: string, id: string): Promise<AdminPasswordResetResult>;
export declare function serviceEligibleCollaborators(pool: pg.Pool, excludeUserId: string | null): Promise<import("./admin-users.types.js").EligibleCollaboratorOption[]>;
//# sourceMappingURL=admin-users.service.d.ts.map