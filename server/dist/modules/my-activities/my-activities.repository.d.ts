import type pg from 'pg';
export type MyActivityRawRow = {
    assignee_id: string;
    conveyor_id: string;
    conveyor_code: string | null;
    conveyor_name: string;
    conveyor_status: string;
    estimated_deadline: string | null;
    step_node_id: string;
    step_name: string;
    option_name: string;
    area_name: string;
    is_primary: boolean;
    planned_minutes: string | null;
    realized_minutes: string | null;
    opt_order_index: string;
    area_order_index: string;
    step_order_index: string;
};
export declare function listActivitiesRawForCollaborator(pool: pg.Pool, collaboratorId: string, options?: {
    conveyorId?: string | null;
}): Promise<MyActivityRawRow[]>;
//# sourceMappingURL=my-activities.repository.d.ts.map