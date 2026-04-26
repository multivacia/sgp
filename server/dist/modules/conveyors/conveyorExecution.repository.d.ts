import type pg from 'pg';
export type ConveyorNodeAssigneeInsert = {
    id?: string;
    conveyor_id: string;
    conveyor_node_id: string;
    collaborator_id: string;
    is_primary: boolean;
    assignment_origin: 'manual' | 'base' | 'reaproveitada';
    order_index: number;
    metadata_json: unknown | null;
};
export type ConveyorTimeEntryInsert = {
    id?: string;
    conveyor_id: string;
    conveyor_node_id: string;
    collaborator_id: string;
    conveyor_node_assignee_id: string | null;
    entry_at?: Date | string;
    minutes: number;
    notes: string | null;
    entry_mode: 'manual' | 'guided' | 'imported';
    metadata_json: unknown | null;
};
export declare function insertConveyorNodeAssignee(client: pg.Pool | pg.PoolClient, row: ConveyorNodeAssigneeInsert): Promise<{
    id: string;
}>;
export declare function insertConveyorTimeEntry(client: pg.Pool | pg.PoolClient, row: ConveyorTimeEntryInsert): Promise<{
    id: string;
}>;
export declare function getConveyorNodeForStepValidation(pool: pg.Pool, conveyorNodeId: string): Promise<{
    conveyor_id: string;
    node_type: string;
} | null>;
export declare function collaboratorExistsActive(pool: pg.Pool, id: string): Promise<boolean>;
//# sourceMappingURL=conveyorExecution.repository.d.ts.map