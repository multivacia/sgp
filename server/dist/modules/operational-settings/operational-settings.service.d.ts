import type pg from 'pg';
import type { CreateCollaboratorRoleBody, CreateSectorBody, PatchCollaboratorRoleBody, PatchSectorBody } from './operational-settings.schemas.js';
import { type CollaboratorFunctionRow, type SectorAdminRow } from './operational-settings.repository.js';
export declare function serviceListSectorsAdmin(pool: pg.Pool): Promise<SectorAdminRow[]>;
export declare function serviceCreateSector(pool: pg.Pool, body: CreateSectorBody): Promise<SectorAdminRow>;
export declare function servicePatchSector(pool: pg.Pool, id: string, body: PatchSectorBody): Promise<SectorAdminRow>;
export declare function serviceDeleteSector(pool: pg.Pool, id: string): Promise<void>;
export declare function serviceListCollaboratorFunctions(pool: pg.Pool): Promise<CollaboratorFunctionRow[]>;
export declare function serviceCreateCollaboratorFunction(pool: pg.Pool, body: CreateCollaboratorRoleBody): Promise<CollaboratorFunctionRow>;
export declare function servicePatchCollaboratorFunction(pool: pg.Pool, id: string, body: PatchCollaboratorRoleBody): Promise<CollaboratorFunctionRow>;
export declare function serviceDeleteCollaboratorFunction(pool: pg.Pool, id: string): Promise<void>;
//# sourceMappingURL=operational-settings.service.d.ts.map