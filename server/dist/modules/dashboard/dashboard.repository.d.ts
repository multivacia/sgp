import type pg from 'pg';
import type { ConveyorRowForBucket } from './dashboard.dto.js';
export declare function listConveyorsForDashboard(pool: pg.Pool): Promise<ConveyorRowForBucket[]>;
export declare function countAssigneeRoles(pool: pg.Pool): Promise<{
    total: number;
    primary: number;
    support: number;
}>;
export declare function sumConveyorPlannedMinutes(pool: pg.Pool): Promise<number>;
export declare function sumStepPlannedMinutes(pool: pg.Pool): Promise<number>;
export declare function sumRealizedMinutes(pool: pg.Pool): Promise<number>;
/** Soma global de minutos apontados com `entry_at` no intervalo (inclusivo nas extremidades via query). */
export declare function sumRealizedMinutesBetween(pool: pg.Pool, from: Date, to: Date): Promise<number>;
export type CollaboratorAggRow = {
    collaborator_id: string;
    full_name: string | null;
    assignment_count: string;
    primary_count: string;
    support_count: string;
    planned_minutes_steps: string;
};
export declare function listCollaboratorLoadAggregates(pool: pg.Pool): Promise<CollaboratorAggRow[]>;
export declare function sumRealizedMinutesByCollaborator(pool: pg.Pool): Promise<Map<string, number>>;
export type RecentEntryRow = {
    id: string;
    conveyor_id: string;
    conveyor_name: string;
    conveyor_node_id: string;
    step_name: string;
    collaborator_id: string;
    collaborator_name: string | null;
    minutes: number;
    entry_at: Date;
    notes: string | null;
};
export declare function listRecentTimeEntries(pool: pg.Pool, limit: number): Promise<RecentEntryRow[]>;
export declare function countActiveConveyors(pool: pg.Pool): Promise<number>;
export declare function countCompletedInWindow(pool: pg.Pool, days: number): Promise<number>;
//# sourceMappingURL=dashboard.repository.d.ts.map