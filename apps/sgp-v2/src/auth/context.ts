import { createContext, useContext } from 'react'

/** Subconjunto de GET /api/v1/auth/me usado pela V2. */
export type SessionUser = {
  userId: string
  email: string
  role: string | null
  collaboratorId: string | null
  permissions: string[]
  mustChangePassword: boolean
}

export type SessionState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: SessionUser }

type SessionValue = {
  state: SessionState
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const SessionContext = createContext<SessionValue | null>(null)

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession fora do SessionProvider')
  return ctx
}
