import type pg from 'pg';
import type { MyActivityItemApi } from './my-activities.dto.js';
export type GetMyActivitiesQuery = {
    userId: string;
};
export declare function serviceListMyActivities(pool: pg.Pool, query: GetMyActivitiesQuery): Promise<{
    items: MyActivityItemApi[];
    resolvedCollaboratorId: string;
}>;
/** Lista atividades alocadas (mesmo shape que Minhas atividades), por id de colaborador. */
export declare function serviceListActivitiesForCollaborator(pool: pg.Pool, collaboratorId: string, options?: {
    conveyorId?: string | null;
}): Promise<MyActivityItemApi[]>;
//# sourceMappingURL=my-activities.service.d.ts.map