import type pg from 'pg';
import { type ConveyorNodeAssigneeInsert, type ConveyorTimeEntryInsert } from './conveyorExecution.repository.js';
export declare function serviceInsertConveyorNodeAssignee(pool: pg.Pool, input: ConveyorNodeAssigneeInsert): Promise<{
    id: string;
}>;
export declare function serviceInsertConveyorTimeEntry(pool: pg.Pool, input: ConveyorTimeEntryInsert): Promise<{
    id: string;
}>;
//# sourceMappingURL=conveyorExecution.service.d.ts.map