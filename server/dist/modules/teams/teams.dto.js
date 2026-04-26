export function rowToTeamApi(row) {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        isActive: row.is_active,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
    };
}
export function listRowToTeamApi(row) {
    const base = rowToTeamApi(row);
    return {
        ...base,
        activeMemberCount: Number(row.active_member_count ?? 0),
    };
}
export function rowToTeamMemberApi(row) {
    return {
        id: row.id,
        teamId: row.team_id,
        collaboratorId: row.collaborator_id,
        collaboratorFullName: row.collaborator_full_name,
        collaboratorEmail: row.collaborator_email,
        collaboratorStatus: row.collaborator_status,
        collaboratorIsActive: row.collaborator_is_active,
        collaboratorDeletedAt: row.collaborator_deleted_at
            ? row.collaborator_deleted_at.toISOString()
            : null,
        role: row.role,
        isPrimary: row.is_primary,
        isActive: row.is_active,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
    };
}
//# sourceMappingURL=teams.dto.js.map