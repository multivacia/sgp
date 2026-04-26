/** Usuário autenticado (sessão real via cookie httpOnly + JWT). */
export type AuthUser = {
  userId: string
  email: string
  role: string | null
  roleId: string | null
  collaboratorId: string | null
  isActive: boolean
  avatarUrl: string | null
  mustChangePassword: boolean
  passwordChangedAt: string | null
  /** Permissões efetivas (papel); fonte de verdade: servidor. */
  permissions: string[]
}
