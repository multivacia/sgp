import { createContext } from 'react'
import type { SessionIdlePolicy } from '../domain/auth/sessionIdle.types'
import type { AuthUser } from './auth-store'

export type AuthContextValue = {
  user: AuthUser | null
  /** `false` até concluir GET /auth/me no arranque. */
  ready: boolean
  /** Mensagem a mostrar no login quando a sessão foi invalidada por credenciais alteradas. */
  sessionEndedMessage: string | null
  /** Política de inatividade devolvida pelo servidor (GET /auth/me, login). */
  sessionIdle: SessionIdlePolicy | null
  /** Houve atividade local desde a última sincronização oficial com o backend. */
  hasLocalActivitySinceLastServerSync: boolean
  /** Há revalidação/renovação da sessão administrativa em andamento. */
  isSessionRefreshInFlight: boolean
  clearSessionEndedMessage: () => void
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  /** Revalida GET /auth/me (ex.: após troca de senha). Devolve o utilizador atualizado ou `null` se sessão inválida. */
  refreshUser: () => Promise<AuthUser | null>
  /** Fluxo único de renovação/revalidação usado pelo limiar do aviso e pelo botão "Continuar conectado". */
  refreshAdministrativeSession: () => Promise<boolean>
  /** RBAC fino: verifica permissão explícita (espelha o servidor). */
  can: (permissionCode: string) => boolean
  canAny: (permissionCodes: string[]) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
