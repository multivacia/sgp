/** Resposta GET /api/v1/admin/users (item). */
export type AdminUserRow = {
  id: string
  email: string
  roleId: string | null
  roleCode: string | null
  roleName: string | null
  collaboratorId: string | null
  collaboratorName: string | null
  displayName: string
  isActive: boolean
  avatarUrl: string | null
  lastLoginAt: string | null
  mustChangePassword: boolean
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AppRoleOption = {
  id: string
  code: string
  name: string
}

export type EligibleCollaboratorOption = {
  id: string
  fullName: string
  email: string | null
  code: string | null
}

/** GET /api/v1/admin/users/collaborator-linkage-summary */
export type CollaboratorLinkageSummary = {
  unlinkedActiveUserCount: number
}

export type AdminUserCreateInput = {
  email: string
  password: string
  roleId: string
  collaboratorId?: string | null
  avatarUrl?: string | null
  mustChangePassword?: boolean
  isActive?: boolean
}

export type AdminUserUpdateInput = {
  email?: string
  password?: string
  roleId?: string | null
  collaboratorId?: string | null
  avatarUrl?: string | null
  isActive?: boolean
  mustChangePassword?: boolean
}

/** POST /api/v1/admin/users/:id/reset-password */
export type AdminResetPasswordResponse = {
  temporaryPassword: string
  mustChangePassword: true
  user: AdminUserRow
}
