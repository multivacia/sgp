import type pg from 'pg';
import type { CollaboratorApi } from './collaborators.dto.js';
export type ListFilters = {
    status?: string;
    sector_id?: string;
    search?: string;
};
export declare function countCollaborators(pool: pg.Pool, filters: ListFilters): Promise<number>;
export declare function listCollaborators(pool: pg.Pool, filters: ListFilters): Promise<CollaboratorApi[]>;
export declare function findCollaboratorById(pool: pg.Pool, id: string): Promise<CollaboratorApi | null>;
export type InsertInput = {
    full_name: string;
    code?: string | null;
    registration_code?: string | null;
    nickname?: string | null;
    email?: string | null;
    phone?: string | null;
    job_title?: string | null;
    avatar_url?: string | null;
    sector_id?: string | null;
    role_id?: string | null;
    notes?: string | null;
    status?: string;
};
export declare function insertCollaborator(pool: pg.Pool, input: InsertInput): Promise<CollaboratorApi>;
export type PatchInput = Partial<InsertInput>;
export declare function updateCollaborator(pool: pg.Pool, id: string, patch: PatchInput): Promise<CollaboratorApi | null>;
export declare function setCollaboratorStatus(pool: pg.Pool, id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<CollaboratorApi | null>;
//# sourceMappingURL=collaborators.repository.d.ts.map