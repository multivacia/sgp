/** Item de listagem GET /admin/collaborators (JSON camelCase). */
export type AdminCollaboratorListItem = {
    id: string;
    fullName: string;
    email: string | null;
    sectorId: string | null;
    sectorName: string | null;
    isActive: boolean;
    avatarUrl: string | null;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
    linkedUserId: string | null;
    linkedUserEmail: string | null;
    linkedUserDisplayName: string | null;
    code: string | null;
    registrationCode: string | null;
    nickname: string | null;
    roleId: string | null;
    roleName: string | null;
    status: string;
    notes: string | null;
};
export type AdminCollaboratorListRow = {
    id: string;
    code: string | null;
    registration_code: string | null;
    nickname: string | null;
    full_name: string;
    email: string | null;
    phone: string | null;
    job_title: string | null;
    avatar_url: string | null;
    sector_id: string | null;
    role_id: string | null;
    status: string;
    is_active: boolean;
    notes: string | null;
    deleted_at: Date | null;
    created_at: Date;
    updated_at: Date;
    sector_name: string | null;
    role_name: string | null;
    linked_user_id: string | null;
    linked_user_email: string | null;
};
export declare function rowToAdminCollaboratorListItem(row: AdminCollaboratorListRow): AdminCollaboratorListItem;
//# sourceMappingURL=admin-collaborators.dto.d.ts.map