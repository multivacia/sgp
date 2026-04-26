export function rowToCollaboratorApi(row) {
    return {
        id: row.id,
        code: row.code,
        full_name: row.full_name,
        email: row.email,
        phone: row.phone,
        job_title: row.job_title,
        avatar_url: row.avatar_url,
        sector_id: row.sector_id,
        sector_name: row.sector_name,
        role_id: row.role_id,
        role_name: row.role_name,
        registration_code: row.registration_code,
        nickname: row.nickname,
        status: row.status,
        is_active: row.is_active,
        notes: row.notes,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
    };
}
//# sourceMappingURL=collaborators.dto.js.map