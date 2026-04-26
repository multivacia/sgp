import type { ConveyorNodeAssigneeListRow, ConveyorNodeAssigneeRow, ConveyorTimeEntryListRow, ConveyorTimeEntryRow } from './conveyorAssignments.repository.js';
export type AssigneeCreatedDto = {
    id: string;
    conveyorId: string;
    stepNodeId: string;
    type: 'COLLABORATOR' | 'TEAM';
    collaboratorId: string | null;
    teamId: string | null;
    isPrimary: boolean;
    assignmentOrigin: 'manual' | 'base' | 'reaproveitada';
    orderIndex: number;
    createdAt: string;
};
export type AssigneeListItemDto = {
    id: string;
    type: 'COLLABORATOR' | 'TEAM';
    collaboratorId: string | null;
    collaboratorName: string | null;
    teamId: string | null;
    teamName: string | null;
    isPrimary: boolean;
    assignmentOrigin: 'manual' | 'base' | 'reaproveitada';
    orderIndex: number;
    createdAt: string;
    updatedAt: string;
};
/** Campos derivados de `metadata_json` interno — nunca expor o JSON bruto. */
export type TimeEntryDelegationPublic = {
    isDelegated: boolean;
    recordedByAppUserId: string | null;
    /** Email do utilizador que registou (equivalente legível a “nome” na conta). */
    recordedByUserEmail: string | null;
    delegationReason: string | null;
};
export type TimeEntryCreatedDto = TimeEntryDelegationPublic & {
    id: string;
    conveyorId: string;
    stepNodeId: string;
    collaboratorId: string;
    conveyorNodeAssigneeId: string | null;
    minutes: number;
    notes: string | null;
    entryMode: 'manual' | 'guided' | 'imported';
    entryAt: string;
    createdAt: string;
};
export type TimeEntryListItemDto = TimeEntryDelegationPublic & {
    id: string;
    collaboratorId: string;
    collaboratorName: string | null;
    conveyorNodeAssigneeId: string | null;
    minutes: number;
    notes: string | null;
    entryMode: 'manual' | 'guided' | 'imported';
    entryAt: string;
    createdAt: string;
    updatedAt: string;
};
export declare function assigneeRowToCreated(row: ConveyorNodeAssigneeRow): AssigneeCreatedDto;
export declare function assigneeListRowToDto(row: ConveyorNodeAssigneeListRow): AssigneeListItemDto;
export declare function timeEntryRowToCreated(row: ConveyorTimeEntryRow, recordedByUserEmail: string | null): TimeEntryCreatedDto;
export declare function timeEntryListRowToDto(row: ConveyorTimeEntryListRow): TimeEntryListItemDto;
//# sourceMappingURL=conveyorAssignments.dto.d.ts.map