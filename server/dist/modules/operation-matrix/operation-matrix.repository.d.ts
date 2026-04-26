import type pg from 'pg';
import type { CatalogLabelEntryApi, MatrixNodeApi, MatrixNodeRow, MatrixNodeTreeApi } from './operation-matrix.dto.js';
export type ListRootFilters = {
    search?: string;
    is_active?: boolean;
};
export declare function buildNestedTree(rows: MatrixNodeRow[]): MatrixNodeTreeApi;
export declare function listRootItems(pool: pg.Pool, filters: ListRootFilters): Promise<MatrixNodeApi[]>;
export declare function findNodeRowById(pool: pg.Pool, id: string, opts?: {
    includeDeleted?: boolean;
}): Promise<MatrixNodeRow | null>;
/** Todos os nós da árvore (ativos), ordenados para montagem da árvore aninhada. */
export declare function listTreeRowsByRootId(pool: pg.Pool, rootId: string): Promise<MatrixNodeRow[]>;
export declare function collaboratorExists(pool: pg.Pool, id: string): Promise<boolean>;
export declare function listExistingTeamIds(pool: pg.Pool, ids: string[]): Promise<Set<string>>;
export declare function nextSiblingOrderIndex(pool: pg.Pool | pg.PoolClient, parentId: string | null): Promise<number>;
export type InsertNodeInput = {
    id: string;
    parent_id: string | null;
    root_id: string;
    node_type: string;
    name: string;
    code: string | null;
    description: string | null;
    order_index: number;
    level_depth: number;
    is_active: boolean;
    planned_minutes: number | null;
    default_responsible_id: string | null;
    required: boolean;
    source_key: string | null;
    metadata_json: unknown | null;
};
export declare function insertNode(client: pg.Pool | pg.PoolClient, input: InsertNodeInput): Promise<MatrixNodeRow>;
export declare function replaceNodeTeamLinks(client: pg.Pool | pg.PoolClient, matrixNodeId: string, teamIds: string[]): Promise<void>;
export type PatchNodeDbInput = {
    name?: string;
    code?: string | null;
    description?: string | null;
    order_index?: number;
    is_active?: boolean;
    planned_minutes?: number | null;
    default_responsible_id?: string | null;
    required?: boolean;
    source_key?: string | null;
    metadata_json?: unknown | null;
};
export declare function updateNode(pool: pg.Pool, id: string, patch: PatchNodeDbInput): Promise<MatrixNodeRow | null>;
export declare function softDeleteCascade(pool: pg.Pool, id: string): Promise<number>;
export declare function restoreCascade(pool: pg.Pool, id: string): Promise<number>;
export declare function listSubtreeRowsForCopy(pool: pg.Pool, rootId: string): Promise<MatrixNodeRow[]>;
export declare function listSubtreeFromNode(pool: pg.Pool, nodeId: string): Promise<MatrixNodeRow[]>;
export declare function swapSiblingOrder(pool: pg.Pool, nodeId: string, direction: 'up' | 'down'): Promise<MatrixNodeRow | null>;
export type LabelCatalogRow = {
    id: string;
    label: string;
    code: string | null;
};
/**
 * Uma entrada por texto distinto por tipo (dedupe por nome normalizado).
 */
export declare function listDistinctLabelCatalogForNodeType(pool: pg.Pool, nodeType: 'TASK' | 'SECTOR' | 'ACTIVITY'): Promise<LabelCatalogRow[]>;
export declare function listMatrixSuggestionCatalogRows(pool: pg.Pool): Promise<{
    options: LabelCatalogRow[];
    areas: LabelCatalogRow[];
    activities: LabelCatalogRow[];
}>;
export declare function labelCatalogRowToApi(row: LabelCatalogRow): CatalogLabelEntryApi;
//# sourceMappingURL=operation-matrix.repository.d.ts.map