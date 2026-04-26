import type pg from 'pg';
type DbClient = pg.Pool | pg.PoolClient;
import type { ListTeamsQuery } from './teams.schemas.js';
import type { TeamListRow, TeamMemberRow, TeamRow } from './teams.dto.js';
export declare function buildTeamListWhere(q: ListTeamsQuery): {
    sql: string;
    values: unknown[];
};
export declare function countTeams(pool: pg.Pool, q: ListTeamsQuery): Promise<number>;
export declare function listTeams(pool: pg.Pool, q: ListTeamsQuery): Promise<TeamListRow[]>;
export declare function findTeamById(pool: pg.Pool, id: string): Promise<TeamRow | null>;
export declare function insertTeam(pool: pg.Pool, input: {
    name: string;
    description: string | null;
    is_active: boolean;
}): Promise<TeamRow>;
export declare function updateTeam(pool: pg.Pool, id: string, patch: {
    name?: string;
    description?: string | null;
    is_active?: boolean;
}): Promise<TeamRow | null>;
export declare function softDeleteTeam(pool: pg.Pool, id: string): Promise<TeamRow | null>;
export declare function listActiveMembersForTeam(pool: pg.Pool, teamId: string): Promise<TeamMemberRow[]>;
export declare function findMemberById(pool: DbClient, teamId: string, memberId: string): Promise<TeamMemberRow | null>;
export type CollaboratorEligibilityRow = {
    id: string;
    status: string;
    is_active: boolean;
    deleted_at: Date | null;
};
export declare function findCollaboratorEligibility(pool: pg.Pool, collaboratorId: string): Promise<CollaboratorEligibilityRow | null>;
export declare function clearPrimaryForTeam(client: DbClient, teamId: string, exceptMemberId?: string): Promise<void>;
export declare function insertTeamMember(client: DbClient, input: {
    team_id: string;
    collaborator_id: string;
    role: string | null;
    is_primary: boolean;
}): Promise<TeamMemberRow>;
export declare function updateTeamMember(pool: DbClient, teamId: string, memberId: string, patch: {
    role?: string | null;
    is_primary?: boolean;
    is_active?: boolean;
}): Promise<TeamMemberRow | null>;
export declare function softDeactivateTeamMember(pool: pg.Pool, teamId: string, memberId: string): Promise<TeamMemberRow | null>;
export {};
//# sourceMappingURL=teams.repository.d.ts.map