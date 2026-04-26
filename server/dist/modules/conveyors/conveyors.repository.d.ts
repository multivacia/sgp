import type pg from 'pg';
export type InsertConveyorRow = {
    id: string;
    code: string | null;
    name: string;
    client_name: string | null;
    vehicle: string | null;
    model_version: string | null;
    plate: string | null;
    initial_notes: string | null;
    responsible: string | null;
    estimated_deadline: string | null;
    priority: 'alta' | 'media' | 'baixa';
    origin_register: 'MANUAL' | 'BASE' | 'HYBRID';
    base_ref_snapshot: string | null;
    base_code_snapshot: string | null;
    base_name_snapshot: string | null;
    base_version_snapshot: number | null;
    total_options: number;
    total_areas: number;
    total_steps: number;
    total_planned_minutes: number;
    metadata_json: unknown | null;
    operational_status: ConveyorOperationalStatusDb;
    completed_at: string | null;
};
/** Valores persistidos em `conveyors.operational_status` (CHECK na migração). */
export type ConveyorOperationalStatusDb = 'NO_BACKLOG' | 'EM_REVISAO' | 'PRONTA_LIBERAR' | 'EM_PRODUCAO' | 'CONCLUIDA';
export type ConveyorListRow = {
    id: string;
    code: string | null;
    name: string;
    client_name: string | null;
    responsible: string | null;
    priority: 'alta' | 'media' | 'baixa';
    origin_register: 'MANUAL' | 'BASE' | 'HYBRID';
    created_at: string;
    operational_status: ConveyorOperationalStatusDb;
    completed_at: string | null;
    estimated_deadline: string | null;
    total_steps: number;
};
export type ConveyorDetailRow = {
    id: string;
    code: string | null;
    name: string;
    client_name: string | null;
    vehicle: string | null;
    model_version: string | null;
    plate: string | null;
    initial_notes: string | null;
    responsible: string | null;
    priority: 'alta' | 'media' | 'baixa';
    origin_register: 'MANUAL' | 'BASE' | 'HYBRID';
    base_ref_snapshot: string | null;
    base_code_snapshot: string | null;
    base_name_snapshot: string | null;
    base_version_snapshot: number | null;
    metadata_json: unknown | null;
    operational_status: ConveyorOperationalStatusDb;
    created_at: string;
    completed_at: string | null;
    estimated_deadline: string | null;
    total_options: number;
    total_areas: number;
    total_steps: number;
    total_planned_minutes: number;
};
export type ConveyorNodeFlatRow = {
    id: string;
    parent_id: string | null;
    node_type: 'OPTION' | 'AREA' | 'STEP';
    order_index: number;
    name: string;
    planned_minutes: number | null;
};
/** Atualização atómica de status + completed_at (modo calculado no serviço). */
export type CompletedAtUpdateMode = 'now' | 'clear' | 'keep';
export declare function findConveyorById(pool: pg.Pool, id: string): Promise<ConveyorDetailRow | null>;
export declare function listConveyorNodesByConveyorId(pool: pg.Pool, conveyorId: string): Promise<ConveyorNodeFlatRow[]>;
export declare function updateConveyorOperationalStatus(pool: pg.Pool, conveyorId: string, nextStatus: ConveyorOperationalStatusDb, completedAtMode: CompletedAtUpdateMode): Promise<ConveyorDetailRow | null>;
export type InsertConveyorNodeRow = {
    id: string;
    conveyor_id: string;
    parent_id: string | null;
    root_id: string;
    node_type: 'OPTION' | 'AREA' | 'STEP';
    source_origin: 'manual' | 'reaproveitada' | 'base';
    code: string | null;
    name: string;
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
export declare function insertConveyor(client: pg.PoolClient, row: InsertConveyorRow): Promise<{
    id: string;
    created_at: string;
}>;
export declare function insertConveyorNode(client: pg.PoolClient, row: InsertConveyorNodeRow): Promise<void>;
export declare function newNodeId(): string;
export type ListConveyorsFilters = {
    q?: string;
    priority?: 'alta' | 'media' | 'baixa';
    responsible?: string;
    operationalStatus?: ConveyorOperationalStatusDb;
};
export declare function listConveyors(pool: pg.Pool, filters: ListConveyorsFilters): Promise<ConveyorListRow[]>;
export declare function countActiveTimeEntriesByConveyor(pool: pg.Pool, conveyorId: string): Promise<number>;
/**
 * Remove alocações e nós da esteira (para substituir a estrutura).
 * Exige que não existam apontamentos (`conveyor_time_entries`) ativos.
 */
export declare function deleteConveyorAssigneesAndNodes(client: pg.PoolClient, conveyorId: string): Promise<void>;
export type PatchConveyorDadosFields = {
    name?: string;
    client_name?: string | null;
    vehicle?: string | null;
    model_version?: string | null;
    plate?: string | null;
    initial_notes?: string | null;
    responsible?: string | null;
    estimated_deadline?: string | null;
    priority?: 'alta' | 'media' | 'baixa';
    metadata_json?: unknown | null;
};
export declare function updateConveyorDados(pool: pg.Pool, conveyorId: string, patch: PatchConveyorDadosFields): Promise<ConveyorDetailRow | null>;
export declare function updateConveyorStructureMeta(client: pg.PoolClient, conveyorId: string, row: {
    origin_register: 'MANUAL' | 'BASE' | 'HYBRID';
    base_ref_snapshot: string | null;
    base_code_snapshot: string | null;
    base_name_snapshot: string | null;
    base_version_snapshot: number | null;
    metadata_json: unknown | null;
    total_options: number;
    total_areas: number;
    total_steps: number;
    total_planned_minutes: number;
}): Promise<void>;
//# sourceMappingURL=conveyors.repository.d.ts.map