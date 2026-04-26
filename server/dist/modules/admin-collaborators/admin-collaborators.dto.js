export function rowToAdminCollaboratorListItem(row) {
    const email = row.linked_user_email?.trim() || null;
    return {
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        sectorId: row.sector_id,
        sectorName: row.sector_name,
        isActive: row.is_active,
        avatarUrl: row.avatar_url,
        deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        linkedUserId: row.linked_user_id,
        linkedUserEmail: email,
        linkedUserDisplayName: email,
        code: row.code,
        registrationCode: row.registration_code,
        nickname: row.nickname,
        roleId: row.role_id,
        roleName: row.role_name,
        status: row.status,
        notes: row.notes,
    };
}
//# sourceMappingURL=admin-collaborators.dto.js.map