import type pg from 'pg';
import type { MatrixNodeApi, MatrixNodeTreeApi, MatrixSuggestionCatalogApi } from './operation-matrix.dto.js';
import type { CreateMatrixNodeBody, PatchMatrixNodeBody } from './operation-matrix.schemas.js';
import { type ListRootFilters } from './operation-matrix.repository.js';
export declare function serviceListRootItems(pool: pg.Pool, filters: ListRootFilters): Promise<MatrixNodeApi[]>;
export declare function serviceListSuggestionCatalog(pool: pg.Pool): Promise<MatrixSuggestionCatalogApi>;
export declare function serviceGetTree(pool: pg.Pool, itemId: string): Promise<MatrixNodeTreeApi>;
export declare function serviceCreateNode(pool: pg.Pool, body: CreateMatrixNodeBody): Promise<MatrixNodeApi>;
export declare function servicePatchNode(pool: pg.Pool, id: string, body: PatchMatrixNodeBody): Promise<MatrixNodeApi | null>;
export declare function serviceDeleteNode(pool: pg.Pool, id: string): Promise<{
    removedCount: number;
}>;
export declare function serviceRestoreNode(pool: pg.Pool, id: string): Promise<{
    restoredCount: number;
}>;
export declare function serviceReorder(pool: pg.Pool, id: string, direction: 'up' | 'down'): Promise<MatrixNodeApi | null>;
/** ITEM → nova matriz raiz completa (novo ITEM raiz). */
export declare function serviceDuplicateItemAsNewRoot(pool: pg.Pool, itemId: string): Promise<MatrixNodeTreeApi>;
/** TASK / SECTOR / ACTIVITY → duplica subárvore como irmão (mesmo pai). */
export declare function serviceDuplicateSubtreeUnderSameParent(pool: pg.Pool, nodeId: string): Promise<MatrixNodeTreeApi>;
export declare function serviceDuplicate(pool: pg.Pool, nodeId: string): Promise<MatrixNodeTreeApi>;
//# sourceMappingURL=operation-matrix.service.d.ts.map