import type pg from 'pg';
export type SectorAdminRow = {
    id: string;
    name: string;
    is_active: boolean;
    created_at: Date;
};
export type CollaboratorFunctionRow = {
    id: string;
    code: string;
    name: string;
    is_active: boolean;
    is_collaborator_function: boolean;
    created_at: Date;
};
export declare function listSectorsAdmin(pool: pg.Pool): Promise<SectorAdminRow[]>;
export declare function findSectorById(pool: pg.Pool, id: string): Promise<SectorAdminRow | null>;
export declare function sectorNameExists(pool: pg.Pool, name: string, excludeId?: string): Promise<boolean>;
export declare function insertSector(pool: pg.Pool, name: string): Promise<SectorAdminRow>;
export declare function updateSector(pool: pg.Pool, id: string, patch: {
    name?: string;
    is_active?: boolean;
}): Promise<SectorAdminRow | null>;
export declare function deleteSector(pool: pg.Pool, id: string): Promise<boolean>;
export declare function listCollaboratorFunctions(pool: pg.Pool): Promise<CollaboratorFunctionRow[]>;
export declare function findCollaboratorFunctionById(pool: pg.Pool, id: string): Promise<CollaboratorFunctionRow | null>;
export declare function roleCodeExists(pool: pg.Pool, code: string, excludeId?: string): Promise<boolean>;
export declare function insertCollaboratorFunction(pool: pg.Pool, code: string, name: string): Promise<CollaboratorFunctionRow>;
export declare function updateCollaboratorFunction(pool: pg.Pool, id: string, patch: {
    name?: string;
    code?: string;
    is_active?: boolean;
}): Promise<CollaboratorFunctionRow | null>;
export declare function countUsersWithRole(pool: pg.Pool, roleId: string): Promise<number>;
export declare function countCollaboratorsWithRole(pool: pg.Pool, roleId: string): Promise<number>;
//# sourceMappingURL=operational-settings.repository.d.ts.map