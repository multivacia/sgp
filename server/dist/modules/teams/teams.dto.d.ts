/** Equipe — JSON camelCase nas rotas `/api/v1/teams`. */
export type TeamApi = {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    /** Só em listagens quando solicitado. */
    activeMemberCount?: number;
};
export type TeamMemberApi = {
    id: string;
    teamId: string;
    collaboratorId: string;
    collaboratorFullName: string;
    collaboratorEmail: string | null;
    collaboratorStatus: string;
    collaboratorIsActive: boolean;
    collaboratorDeletedAt: string | null;
    role: string | null;
    isPrimary: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};
export type TeamRow = {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    deleted_at: Date | null;
    created_at: Date;
    updated_at: Date;
};
export type TeamListRow = TeamRow & {
    active_member_count: string;
};
export type TeamMemberRow = {
    id: string;
    team_id: string;
    collaborator_id: string;
    role: string | null;
    is_primary: boolean;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    collaborator_full_name: string;
    collaborator_email: string | null;
    collaborator_status: string;
    collaborator_is_active: boolean;
    collaborator_deleted_at: Date | null;
};
export declare function rowToTeamApi(row: TeamRow): TeamApi;
export declare function listRowToTeamApi(row: TeamListRow): TeamApi;
export declare function rowToTeamMemberApi(row: TeamMemberRow): TeamMemberApi;
//# sourceMappingURL=teams.dto.d.ts.map