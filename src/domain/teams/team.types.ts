export type Team = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  activeMemberCount?: number
}

export type TeamMember = {
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

export type TeamCreateInput = {
  name: string
  description?: string | null
  isActive?: boolean
}

export type TeamUpdateInput = {
  name?: string
  description?: string | null
  isActive?: boolean
}

export type TeamMemberCreateInput = {
  collaboratorId: string
  role?: string | null
  isPrimary?: boolean
}

export type TeamMemberUpdateInput = {
  role?: string | null
  isPrimary?: boolean
  isActive?: boolean
}

export type TeamListParams = {
  search?: string
  isActive?: 'true' | 'false' | 'all'
  limit?: number
  offset?: number
}
