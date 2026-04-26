import type pg from 'pg';
export type CollaboratorBriefRow = {
    id: string;
    full_name: string | null;
};
export declare function findCollaboratorBrief(pool: pg.Pool, collaboratorId: string): Promise<CollaboratorBriefRow | null>;
export declare function sumRealizedMinutesTotalForCollaborator(pool: pg.Pool, collaboratorId: string, conveyorId: string | null): Promise<number>;
export declare function sumRealizedMinutesInPeriodForCollaborator(pool: pg.Pool, args: {
    collaboratorId: string;
    from: Date;
    to: Date;
    conveyorId: string | null;
}): Promise<number>;
export type TimeEntryHistoryRow = {
    id: string;
    conveyor_id: string;
    conveyor_name: string;
    conveyor_node_id: string;
    step_name: string;
    minutes: number;
    entry_at: Date;
    notes: string | null;
};
export declare function listTimeEntriesForCollaboratorInPeriod(pool: pg.Pool, args: {
    collaboratorId: string;
    from: Date;
    to: Date;
    conveyorId: string | null;
    limit: number;
}): Promise<TimeEntryHistoryRow[]>;
//# sourceMappingURL=operational-journey.repository.d.ts.map