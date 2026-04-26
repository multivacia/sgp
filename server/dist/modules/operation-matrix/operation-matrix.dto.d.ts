export type MatrixNodeType = 'ITEM' | 'TASK' | 'SECTOR' | 'ACTIVITY';
export type MatrixNodeApi = {
    id: string;
    parent_id: string | null;
    root_id: string;
    node_type: MatrixNodeType;
    code: string | null;
    name: string;
    description: string | null;
    order_index: number;
    level_depth: number;
    is_active: boolean;
    planned_minutes: number | null;
    default_responsible_id: string | null;
    team_ids: string[];
    required: boolean;
    source_key: string | null;
    metadata_json: unknown | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
};
export type MatrixNodeTreeApi = MatrixNodeApi & {
    children: MatrixNodeTreeApi[];
};
/** Entrada mínima para autocomplete (Opção=TASK, Área=SECTOR, Atividade=ACTIVITY). */
export type CatalogLabelEntryApi = {
    id: string;
    label: string;
    code: string | null;
};
/** @deprecated usar CatalogLabelEntryApi */
export type MatrixActivityCatalogEntryApi = CatalogLabelEntryApi;
/** Catálogo consolidado para sugestões locais em Matrizes (sem árvore). */
export type MatrixSuggestionCatalogApi = {
    options: CatalogLabelEntryApi[];
    areas: CatalogLabelEntryApi[];
    activities: CatalogLabelEntryApi[];
};
export type MatrixNodeRow = {
    id: string;
    parent_id: string | null;
    root_id: string;
    node_type: string;
    code: string | null;
    name: string;
    description: string | null;
    order_index: number;
    level_depth: number;
    is_active: boolean;
    planned_minutes: number | null;
    default_responsible_id: string | null;
    team_ids: string[];
    required: boolean;
    source_key: string | null;
    metadata_json: unknown | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
};
export declare function rowToMatrixNodeApi(row: MatrixNodeRow): MatrixNodeApi;
//# sourceMappingURL=operation-matrix.dto.d.ts.map