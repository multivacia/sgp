import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'
import { AuthContext } from './auth-context-instance'
import type { AuthUser } from './auth-store'
import { getMe, postLogin, postLogout } from '../services/auth/authApiService'
import { SESSION_REVOKED_USER_MESSAGE } from './api/apiErrors'

const SESSION_REVOKED_EVENT = 'sgp:session-revoked'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)
  const [sessionEndedMessage, setSessionEndedMessage] = useState<string | null>(
    null,
  )

  const clearSessionEndedMessage = useCallback(() => {
    setSessionEndedMessage(null)
  }, [])

  const bootstrap = useCallback(async () => {
    try {
      const u = await getMe()
      setUser(u)
      setSessionEndedMessage(null)
    } catch {
      setUser(null)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const u = await getMe()
      setUser(u)
      setSessionEndedMessage(null)
      return u
    } catch {
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    function onSessionRevoked(e: Event) {
      const detail = (e as CustomEvent<{ message?: string }>).detail
      setUser(null)
      setSessionEndedMessage(
        detail?.message?.trim() || SESSION_REVOKED_USER_MESSAGE,
      )
    }
    window.addEventListener(SESSION_REVOKED_EVENT, onSessionRevoked)
    return () => {
      window.removeEventListener(SESSION_REVOKED_EVENT, onSessionRevoked)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await bootstrap()
      if (!cancelled) setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [bootstrap])

  const login = useCallback(async (email: string, password: string) => {
    const u = await postLogin(email, password)
    /** Garante que o estado autenticado está aplicado antes de navegar (RequireAuth). */
    flushSync(() => {
      setUser(u)
      setSessionEndedMessage(null)
    })
    return u
  }, [])

  const logout = useCallback(async () => {
    try {
      await postLogout()
    } finally {
      setUser(null)
      setSessionEndedMessage(null)
    }
  }, [])

  const can = useCallback(
    (permissionCode: string) =>
      user?.permissions?.includes(permissionCode) ?? false,
    [user],
  )

  const canAny = useCallback(
    (permissionCodes: string[]) =>
      permissionCodes.some((c) => user?.permissions?.includes(c) ?? false),
    [user],
  )

  const value = useMemo(
    () => ({
      user,
      ready,
      sessionEndedMessage,
      clearSessionEndedMessage,
      login,
      logout,
      refreshUser,
      can,
      canAny,
    }),
    [
      user,
      ready,
      sessionEndedMessage,
      clearSessionEndedMessage,
      login,
      logout,
      refreshUser,
      can,
      canAny,
    ],
  )

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}
