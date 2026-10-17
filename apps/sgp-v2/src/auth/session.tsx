import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setUnauthorizedHandler } from '../api/client'
import { SessionContext, type SessionState, type SessionUser } from './context'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading' })

  useEffect(() => {
    setUnauthorizedHandler(() => setState({ status: 'anonymous' }))
    api<{ user: SessionUser }>('/auth/me')
      .then(({ user }) => setState({ status: 'authenticated', user }))
      .catch(() => setState({ status: 'anonymous' }))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await api<{ user: SessionUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setState({ status: 'authenticated', user })
  }, [])

  const logout = useCallback(async () => {
    await api<void>('/auth/logout', { method: 'POST' }).catch(() => undefined)
    setState({ status: 'anonymous' })
  }, [])

  const value = useMemo(() => ({ state, login, logout }), [state, login, logout])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
