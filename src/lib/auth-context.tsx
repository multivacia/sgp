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
import type { SessionIdlePolicy } from '../domain/auth/sessionIdle.types'
import { getMe, postLogin, postLogout } from '../services/auth/authApiService'
import {
  SESSION_EXPIRED_USER_MESSAGE,
  SESSION_REVOKED_USER_MESSAGE,
} from './api/apiErrors'

const SESSION_REVOKED_EVENT = 'sgp:session-revoked'
const SESSION_EXPIRED_EVENT = 'sgp:session-expired'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [sessionIdle, setSessionIdle] = useState<SessionIdlePolicy | null>(null)
  const [ready, setReady] = useState(false)
  const [sessionEndedMessage, setSessionEndedMessage] = useState<string | null>(
    null,
  )

  const clearSessionEndedMessage = useCallback(() => {
    setSessionEndedMessage(null)
  }, [])

  const bootstrap = useCallback(async () => {
    try {
      const session = await getMe()
      setUser(session.user)
      setSessionIdle(session.sessionIdle)
      setSessionEndedMessage(null)
    } catch {
      setUser(null)
      setSessionIdle(null)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const session = await getMe()
      setUser(session.user)
      setSessionIdle(session.sessionIdle)
      setSessionEndedMessage(null)
      return session.user
    } catch {
      setUser(null)
      setSessionIdle(null)
      return null
    }
  }, [])

  useEffect(() => {
    function onSessionRevoked(e: Event) {
      const detail = (e as CustomEvent<{ message?: string }>).detail
      setUser(null)
      setSessionIdle(null)
      setSessionEndedMessage(
        detail?.message?.trim() || SESSION_REVOKED_USER_MESSAGE,
      )
    }
    function onSessionExpired(e: Event) {
      const detail = (e as CustomEvent<{ message?: string }>).detail
      setUser(null)
      setSessionIdle(null)
      setSessionEndedMessage(
        detail?.message?.trim() || SESSION_EXPIRED_USER_MESSAGE,
      )
    }
    window.addEventListener(SESSION_REVOKED_EVENT, onSessionRevoked)
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
    return () => {
      window.removeEventListener(SESSION_REVOKED_EVENT, onSessionRevoked)
      window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
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
    const session = await postLogin(email, password)
    flushSync(() => {
      setUser(session.user)
      setSessionIdle(session.sessionIdle)
      setSessionEndedMessage(null)
    })
    return session.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await postLogout()
    } finally {
      setUser(null)
      setSessionIdle(null)
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
      sessionIdle,
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
      sessionIdle,
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
