import type pg from 'pg';
import { type TeamApi, type TeamMemberApi } from './teams.dto.js';
import type { CreateTeamBody, CreateTeamMemberBody, ListTeamsQuery, PatchTeamBody, PatchTeamMemberBody } from './teams.schemas.js';
export declare function serviceListTeams(pool: pg.Pool, q: ListTeamsQuery): Promise<{
    data: TeamApi[];
    total: number;
}>;
export declare function serviceGetTeam(pool: pg.Pool, id: string): Promise<TeamApi | null>;
export declare function serviceCreateTeam(pool: pg.Pool, body: CreateTeamBody): Promise<TeamApi>;
export declare function servicePatchTeam(pool: pg.Pool, id: string, body: PatchTeamBody): Promise<TeamApi | null>;
export declare function serviceSemanticDeleteTeam(pool: pg.Pool, id: string): Promise<TeamApi | null>;
/** Retorna `null` se a equipe não existir (404 em camada HTTP). */
export declare function serviceListMembers(pool: pg.Pool, teamId: string): Promise<TeamMemberApi[] | null>;
export declare function serviceAddMember(pool: pg.Pool, teamId: string, body: CreateTeamMemberBody): Promise<TeamMemberApi>;
export declare function servicePatchMember(pool: pg.Pool, teamId: string, memberId: string, body: PatchTeamMemberBody): Promise<TeamMemberApi | null>;
/** `DELETE` semântico: inativa a linha de `team_members`. Idempotente se já inativo. */
export declare function serviceSemanticDeleteMember(pool: pg.Pool, teamId: string, memberId: string): Promise<TeamMemberApi | null>;
//# sourceMappingURL=teams.service.d.ts.map