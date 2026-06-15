export type AdminCollaboratorProductionPin = {
  hasCredential: boolean
  enabled: boolean
  mustChange: boolean
  locked: boolean
}

/** Item de listagem GET /admin/collaborators (JSON camelCase). */
export type AdminCollaboratorListItem = {
  id: string
  fullName: string
  email: string | null
  sectorId: string | null
  sectorName: string | null
  isActive: boolean
  avatarUrl: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  linkedUserId: string | null
  linkedUserEmail: string | null
  linkedUserDisplayName: string | null
  code: string | null
  registrationCode: string | null
  nickname: string | null
  roleId: string | null
  roleName: string | null
  status: string
  notes: string | null
  productionPin: AdminCollaboratorProductionPin
}

export type AdminCollaboratorListRow = {
  id: string
  code: string | null
  registration_code: string | null
  nickname: string | null
  full_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  avatar_url: string | null
  sector_id: string | null
  role_id: string | null
  status: string
  is_active: boolean
  notes: string | null
  deleted_at: Date | null
  created_at: Date
  updated_at: Date
  sector_name: string | null
  role_name: string | null
  linked_user_id: string | null
  linked_user_email: string | null
  pin_has_credential: boolean
  pin_enabled: boolean | null
  pin_must_change: boolean | null
  pin_locked_until: Date | null
}

export function rowToAdminCollaboratorListItem(
  row: AdminCollaboratorListRow,
): AdminCollaboratorListItem {
  const email = row.linked_user_email?.trim() || null
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
    productionPin: {
      hasCredential: row.pin_has_credential === true,
      enabled: row.pin_enabled === true,
      mustChange: row.pin_must_change === true,
      locked:
        row.pin_locked_until != null &&
        row.pin_locked_until.getTime() > Date.now(),
    },
  }
}
