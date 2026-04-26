import type pg from 'pg';
import type { AdminCollaboratorListItem } from './admin-collaborators.dto.js';
import type { ListAdminCollaboratorsQuery } from './admin-collaborators.schemas.js';
import type { CreateCollaboratorBody, PatchCollaboratorBody } from '../collaborators/collaborators.schemas.js';
export declare function serviceListAdmin(pool: pg.Pool, filters: ListAdminCollaboratorsQuery): Promise<{
    data: AdminCollaboratorListItem[];
    total: number;
}>;
export declare function serviceGetAdminById(pool: pg.Pool, id: string): Promise<AdminCollaboratorListItem | null>;
export declare function serviceCreateAdmin(pool: pg.Pool, body: CreateCollaboratorBody): Promise<AdminCollaboratorListItem>;
export declare function servicePatchAdmin(pool: pg.Pool, id: string, body: PatchCollaboratorBody): Promise<AdminCollaboratorListItem>;
export declare function serviceActivateAdmin(pool: pg.Pool, id: string): Promise<AdminCollaboratorListItem>;
export declare function serviceInactivateAdmin(pool: pg.Pool, id: string): Promise<AdminCollaboratorListItem>;
export declare function serviceSoftDeleteAdmin(pool: pg.Pool, id: string): Promise<AdminCollaboratorListItem>;
export declare function serviceRestoreAdmin(pool: pg.Pool, id: string): Promise<AdminCollaboratorListItem>;
//# sourceMappingURL=admin-collaborators.service.d.ts.map