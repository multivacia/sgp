/** Equipe — JSON camelCase nas rotas `/api/v1/teams`. */
export type TeamApi = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  /** Só em listagens quando solicitado. */
  activeMemberCount?: number
}

export type TeamMemberApi = {
  id: string
  teamId: string
  collaboratorId: string
  collaboratorFullName: string
  collaboratorEmail: string | null
  collaboratorStatus: string
  collaboratorIsActive: boolean
  collaboratorDeletedAt: string | null
  role: string | null
  isPrimary: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type TeamRow = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  deleted_at: Date | null
  created_at: Date
  updated_at: Date
}

export type TeamListRow = TeamRow & { active_member_count: string }

export type TeamMemberRow = {
  id: string
  team_id: string
  collaborator_id: string
  role: string | null
  is_primary: boolean
  is_active: boolean
  created_at: Date
  updated_at: Date
  collaborator_full_name: string
  collaborator_email: string | null
  collaborator_status: string
  collaborator_is_active: boolean
  collaborator_deleted_at: Date | null
}

export function rowToTeamApi(row: TeamRow): TeamApi {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export function listRowToTeamApi(row: TeamListRow): TeamApi {
  const base = rowToTeamApi(row)
  return {
    ...base,
    activeMemberCount: Number(row.active_member_count ?? 0),
  }
}

export function rowToTeamMemberApi(row: TeamMemberRow): TeamMemberApi {
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
  }
}
