import type pg from 'pg';
import type { AdminCollaboratorListItem } from './admin-collaborators.dto.js';
import type { ListAdminCollaboratorsQuery } from './admin-collaborators.schemas.js';
export declare function buildAdminListWhere(filters: Pick<ListAdminCollaboratorsQuery, 'search' | 'sector_id' | 'role_id' | 'status' | 'linked_user' | 'deleted'>): {
    sql: string;
    values: unknown[];
};
export declare function countAdminCollaborators(pool: pg.Pool, filters: ListAdminCollaboratorsQuery): Promise<number>;
export declare function listAdminCollaborators(pool: pg.Pool, filters: ListAdminCollaboratorsQuery): Promise<AdminCollaboratorListItem[]>;
export declare function findAdminCollaboratorById(pool: pg.Pool, id: string): Promise<AdminCollaboratorListItem | null>;
export declare function softDeleteCollaborator(pool: pg.Pool, id: string): Promise<AdminCollaboratorListItem | null>;
export declare function restoreCollaborator(pool: pg.Pool, id: string): Promise<AdminCollaboratorListItem | null>;
//# sourceMappingURL=admin-collaborators.repository.d.ts.map