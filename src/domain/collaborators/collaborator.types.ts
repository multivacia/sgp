export type CollaboratorStatus = 'active' | 'inactive'

/** Modelo de domínio — único formato consumido pela UI de Colaboradores. */
export type Collaborator = {
  id: string
  code?: string
  registrationCode?: string
  fullName: string
  nickname?: string
  email?: string
  phone?: string
  jobTitle?: string
  avatarUrl?: string
  sectorId?: string
  sectorName?: string
  roleId?: string
  roleName?: string
  status: CollaboratorStatus
  notes?: string
  createdAt?: string
  updatedAt?: string
}

/** Colaborador na governança (GET /admin/collaborators) — inclui soft delete e vínculo com utilizador. */
export type AdminCollaborator = Collaborator & {
  deletedAt: string | null
  linkedUserId: string | null
  linkedUserEmail: string | null
  linkedUserDisplayName: string | null
}

export type Sector = {
  id: string
  name: string
}

export type Role = {
  id: string
  name: string
}

export type CollaboratorListFilter = {
  /** `all` ou omitido = sem filtro de status */
  status?: 'all' | 'active' | 'inactive'
  /** Setor por id (API) ou nome (mock com setor textual) */
  sectorKey?: string
  /** Busca textual (API: query `search`; mock aplica no repositório em memória) */
  search?: string
}

export type AdminCollaboratorListParams = {
  search?: string
  sectorId?: string
  /** Papel operacional (`collaborators.role_id`). */
  roleId?: string
  status?: 'ACTIVE' | 'INACTIVE' | 'ALL'
  linkedUser?: 'linked' | 'unlinked' | 'all'
  deleted?: 'exclude' | 'only' | 'include'
  limit?: number
  offset?: number
}

export type CollaboratorCreateInput = {
  fullName: string
  sectorId: string
  roleId: string
  sectorName?: string
  /** URL do avatar; `null` limpa o campo na API. */
  avatarUrl?: string | null
  notes?: string
  status?: CollaboratorStatus
}

export type CollaboratorUpdateInput = {
  fullName?: string
  sectorName?: string
  sectorId?: string
  /** URL do avatar; `null` limpa o campo na API. */
  avatarUrl?: string | null
  roleId?: string
  notes?: string
  status?: CollaboratorStatus
}

export type ServiceMutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; code?: string }
