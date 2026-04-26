import { createContext } from 'react'
import type { AuthUser } from './auth-store'

export type AuthContextValue = {
  user: AuthUser | null
  /** `false` até concluir GET /auth/me no arranque. */
  ready: boolean
  /** Mensagem a mostrar no login quando a sessão foi invalidada por credenciais alteradas. */
  sessionEndedMessage: string | null
  clearSessionEndedMessage: () => void
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  /** Revalida GET /auth/me (ex.: após troca de senha). Devolve o utilizador atualizado ou `null` se sessão inválida. */
  refreshUser: () => Promise<AuthUser | null>
  /** RBAC fino: verifica permissão explícita (espelha o servidor). */
  can: (permissionCode: string) => boolean
  canAny: (permissionCodes: string[]) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
