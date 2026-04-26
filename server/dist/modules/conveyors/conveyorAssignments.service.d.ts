import type pg from 'pg';
import { type AssigneeCreatedDto, type AssigneeListItemDto, type TimeEntryCreatedDto, type TimeEntryListItemDto } from './conveyorAssignments.dto.js';
export declare function collaboratorActiveForOperations(pool: pg.Pool, collaboratorId: string): Promise<boolean>;
/**
 * Validação de domínio (defesa em profundidade junto aos triggers).
 * Nó inexistente → 404; regras operacionais (conveyor / tipo) → 422.
 */
export declare function assertNodeIsStepForConveyor(pool: pg.Pool, conveyorId: string, conveyorNodeId: string): Promise<void>;
export type CreateNodeAssigneeInput = {
    conveyorId: string;
    conveyorNodeId: string;
    type?: 'COLLABORATOR' | 'TEAM';
    collaboratorId?: string;
    teamId?: string;
    isPrimary: boolean;
    assignmentOrigin?: 'manual' | 'base' | 'reaproveitada';
    orderIndex?: number;
    metadataJson?: unknown | null;
};
export declare function serviceCreateConveyorNodeAssignee(pool: pg.Pool, input: CreateNodeAssigneeInput): Promise<AssigneeCreatedDto>;
export declare function serviceListConveyorNodeAssignees(pool: pg.Pool, conveyorId: string, conveyorNodeId: string): Promise<AssigneeListItemDto[]>;
export declare function serviceDeleteConveyorNodeAssignee(pool: pg.Pool, conveyorId: string, conveyorNodeId: string, assigneeId: string): Promise<{
    deleted: true;
    id: string;
}>;
export type CreateTimeEntryInput = {
    conveyorId: string;
    conveyorNodeId: string;
    collaboratorId: string;
    conveyorNodeAssigneeId?: string | null;
    entryAt?: Date;
    minutes: number;
    notes?: string | null;
    entryMode?: 'manual' | 'guided' | 'imported';
    metadataJson?: unknown | null;
};
export type CreateTimeEntryForAppUserInput = {
    appUserId: string;
    conveyorId: string;
    conveyorNodeId: string;
    minutes: number;
    notes?: string | null;
    entryAt?: Date;
    entryMode?: 'manual' | 'guided' | 'imported';
};
export type CreateTimeEntryOnBehalfInput = {
    actorAppUserId: string;
    conveyorId: string;
    conveyorNodeId: string;
    targetCollaboratorId: string;
    entryAt?: Date;
    minutes: number;
    notes?: string | null;
    reason: string;
};
/**
 * Apontamento pelo colaborador autenticado (`app_users.collaborator_id`).
 * Exige alocação ativa no STEP; ignora qualquer collaboratorId no cliente.
 */
export declare function serviceCreateConveyorTimeEntryForAppUser(pool: pg.Pool, input: CreateTimeEntryForAppUserInput): Promise<TimeEntryCreatedDto>;
export declare function serviceCreateConveyorTimeEntry(pool: pg.Pool, input: CreateTimeEntryInput): Promise<TimeEntryCreatedDto>;
/**
 * Apontamento em nome de outro colaborador — exige alocação ativa do alvo no STEP.
 * `entry_mode` permanece `manual`; delegação em `metadata_json` + auditoria.
 */
export declare function serviceCreateConveyorTimeEntryOnBehalf(pool: pg.Pool, input: CreateTimeEntryOnBehalfInput): Promise<TimeEntryCreatedDto>;
export declare function serviceListConveyorTimeEntries(pool: pg.Pool, conveyorId: string, conveyorNodeId: string): Promise<TimeEntryListItemDto[]>;
export declare function serviceDeleteConveyorTimeEntry(pool: pg.Pool, conveyorId: string, conveyorNodeId: string, timeEntryId: string): Promise<{
    deleted: true;
    id: string;
}>;
export declare function serviceDeleteConveyorTimeEntryAsAppUser(pool: pg.Pool, input: {
    appUserId: string;
    conveyorId: string;
    conveyorNodeId: string;
    timeEntryId: string;
}): Promise<{
    deleted: true;
    id: string;
}>;
//# sourceMappingURL=conveyorAssignments.service.d.ts.map