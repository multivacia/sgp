/** Claims mínimos no JWT (cookie httpOnly). */
export type AuthJwtUser = {
  id: string
  email: string
}

/** Resposta de POST /auth/login e GET /auth/me. */
export type AuthMeUser = {
  userId: string
  email: string
  role: string | null
  roleId: string | null
  collaboratorId: string | null
  isActive: boolean
  avatarUrl: string | null
  mustChangePassword: boolean
  passwordChangedAt: string | null
  /** Permissões efetivas (papel → app_role_permissions), fonte de verdade no servidor. */
  permissions: string[]
}
