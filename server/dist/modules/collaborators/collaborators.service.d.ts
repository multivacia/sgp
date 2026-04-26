import type pg from 'pg';
import type { CollaboratorApi } from './collaborators.dto.js';
import type { CreateCollaboratorBody, PatchCollaboratorBody } from './collaborators.schemas.js';
import { type InsertInput, type ListFilters, type PatchInput } from './collaborators.repository.js';
export declare function mapCreateBody(body: CreateCollaboratorBody): InsertInput;
export declare function mapPatchBody(body: PatchCollaboratorBody): PatchInput;
export declare function serviceList(pool: pg.Pool, filters: ListFilters): Promise<{
    data: CollaboratorApi[];
    total: number;
}>;
export declare function serviceGetById(pool: pg.Pool, id: string): Promise<CollaboratorApi | null>;
export declare function serviceCreate(pool: pg.Pool, body: CreateCollaboratorBody): Promise<CollaboratorApi>;
export declare function servicePatch(pool: pg.Pool, id: string, body: PatchCollaboratorBody): Promise<CollaboratorApi | null>;
export declare function serviceActivate(pool: pg.Pool, id: string): Promise<CollaboratorApi | null>;
export declare function serviceInactivate(pool: pg.Pool, id: string): Promise<CollaboratorApi | null>;
//# sourceMappingURL=collaborators.service.d.ts.map