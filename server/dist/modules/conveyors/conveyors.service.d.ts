import type pg from 'pg';
import type { ConveyorCreatedApi, ConveyorDetailApi, ConveyorListItemApi, ConveyorStructureApi } from './conveyors.dto.js';
import { type ConveyorNodeFlatRow, type ConveyorOperationalStatusDb, type ListConveyorsFilters } from './conveyors.repository.js';
import type { PatchConveyorDadosBody, PatchConveyorStructureBody, PostConveyorBody } from './conveyors.schemas.js';
export declare function buildConveyorStructureFromNodes(rows: ConveyorNodeFlatRow[]): ConveyorStructureApi;
export declare function serviceGetConveyorById(pool: pg.Pool, id: string): Promise<ConveyorDetailApi | null>;
export declare function servicePatchConveyorStatus(pool: pg.Pool, conveyorId: string, nextStatus: ConveyorOperationalStatusDb): Promise<ConveyorDetailApi | null>;
export declare function serviceListConveyors(pool: pg.Pool, filters: ListConveyorsFilters): Promise<ConveyorListItemApi[]>;
export declare function serviceCreateConveyor(pool: pg.Pool, body: PostConveyorBody): Promise<ConveyorCreatedApi>;
export declare function servicePatchConveyorDados(pool: pg.Pool, conveyorId: string, body: PatchConveyorDadosBody): Promise<ConveyorDetailApi | null>;
export declare function serviceReplaceConveyorStructure(pool: pg.Pool, conveyorId: string, body: PatchConveyorStructureBody): Promise<ConveyorDetailApi | null>;
//# sourceMappingURL=conveyors.service.d.ts.map