/** Item de listagem GET /admin/users (JSON camelCase). */
export type AdminUserListItem = {
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

export type EligibleCollaboratorOption = {
  id: string
  fullName: string
  email: string | null
  code: string | null
}

/** Resposta única de POST /admin/users/:id/reset-password. */
export type AdminPasswordResetResult = {
  temporaryPassword: string
  mustChangePassword: true
  user: AdminUserListItem
}
