import type pg from 'pg';
export type ConveyorNodeRow = {
    id: string;
    conveyor_id: string;
    node_type: 'OPTION' | 'AREA' | 'STEP';
};
export declare function findConveyorNodeById(pool: pg.Pool, nodeId: string): Promise<ConveyorNodeRow | null>;
export type InsertConveyorNodeAssigneeRow = {
    id: string;
    conveyor_id: string;
    conveyor_node_id: string;
    assignment_type: 'COLLABORATOR' | 'TEAM';
    collaborator_id: string | null;
    team_id: string | null;
    is_primary: boolean;
    assignment_origin: 'manual' | 'base' | 'reaproveitada';
    order_index: number;
    metadata_json: unknown | null;
};
/** Pool ou cliente de transação. */
export type PoolOrClient = pg.Pool | pg.PoolClient;
export declare function insertConveyorNodeAssignee(pool: PoolOrClient, row: InsertConveyorNodeAssigneeRow): Promise<{
    id: string;
}>;
export type InsertConveyorTimeEntryRow = {
    id: string;
    conveyor_id: string;
    conveyor_node_id: string;
    collaborator_id: string;
    conveyor_node_assignee_id: string | null;
    entry_at: Date | string;
    minutes: number;
    notes: string | null;
    entry_mode: 'manual' | 'guided' | 'imported';
    metadata_json: unknown | null;
};
export declare function insertConveyorTimeEntry(pool: PoolOrClient, row: InsertConveyorTimeEntryRow): Promise<{
    id: string;
}>;
export declare function newAssignmentId(): string;
export type ConveyorNodeAssigneeRow = {
    id: string;
    conveyor_id: string;
    conveyor_node_id: string;
    assignment_type: 'COLLABORATOR' | 'TEAM';
    collaborator_id: string | null;
    team_id: string | null;
    is_primary: boolean;
    assignment_origin: 'manual' | 'base' | 'reaproveitada';
    order_index: number;
    created_at: Date;
    updated_at: Date;
};
export type ConveyorNodeAssigneeListRow = {
    id: string;
    assignment_type: 'COLLABORATOR' | 'TEAM';
    collaborator_id: string | null;
    team_id: string | null;
    collaborator_name: string | null;
    team_name: string | null;
    is_primary: boolean;
    assignment_origin: 'manual' | 'base' | 'reaproveitada';
    order_index: number;
    created_at: Date;
    updated_at: Date;
};
export declare function findConveyorNodeAssigneeById(pool: pg.Pool, id: string): Promise<ConveyorNodeAssigneeRow | null>;
/** Alocação ativa do colaborador no STEP (para apontamento autenticado). */
export declare function findAssigneeIdForStepAndCollaborator(pool: pg.Pool, conveyorId: string, conveyorNodeId: string, collaboratorId: string): Promise<string | null>;
export declare function listConveyorNodeAssigneesByStep(pool: pg.Pool, conveyorId: string, conveyorNodeId: string): Promise<ConveyorNodeAssigneeListRow[]>;
export declare function softDeleteConveyorNodeAssignee(pool: pg.Pool, args: {
    id: string;
    conveyorId: string;
    conveyorNodeId: string;
}): Promise<boolean>;
export type ConveyorTimeEntryRow = {
    id: string;
    conveyor_id: string;
    conveyor_node_id: string;
    collaborator_id: string;
    conveyor_node_assignee_id: string | null;
    entry_at: Date;
    minutes: number;
    notes: string | null;
    entry_mode: 'manual' | 'guided' | 'imported';
    metadata_json: unknown | null;
    created_at: Date;
    updated_at: Date;
};
export type ConveyorTimeEntryListRow = {
    id: string;
    collaborator_id: string;
    collaborator_name: string | null;
    conveyor_node_assignee_id: string | null;
    minutes: number;
    notes: string | null;
    entry_mode: 'manual' | 'guided' | 'imported';
    metadata_json: unknown | null;
    recorded_by_user_email: string | null;
    entry_at: Date;
    created_at: Date;
    updated_at: Date;
};
export declare function findConveyorTimeEntryById(pool: pg.Pool, id: string): Promise<ConveyorTimeEntryRow | null>;
export declare function listConveyorTimeEntriesByStep(pool: pg.Pool, conveyorId: string, conveyorNodeId: string): Promise<ConveyorTimeEntryListRow[]>;
export declare function softDeleteConveyorTimeEntry(pool: PoolOrClient, args: {
    id: string;
    conveyorId: string;
    conveyorNodeId: string;
}): Promise<boolean>;
//# sourceMappingURL=conveyorAssignments.repository.d.ts.map