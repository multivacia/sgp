import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'
import { useLocation } from 'react-router-dom'
import type { SessionIdlePolicy } from '../domain/auth/sessionIdle.types'
import {
  ApiError,
  SESSION_EXPIRED_CODE,
  SESSION_REVOKED_CREDENTIALS_CHANGED_CODE,
} from './api/apiErrors'
import { AuthContext } from './auth-context-instance'
import type { AuthUser } from './auth-store'
import {
  isAdministrativeSessionPath,
  shouldReplaceSessionIdle,
  useAdministrativeSessionActivityCoordinator,
} from './session/adminSessionActivityCoordinator'
import { getMe, postLogin, postLogout } from '../services/auth/authApiService'
import {
  SESSION_EXPIRED_USER_MESSAGE,
  SESSION_REVOKED_USER_MESSAGE,
} from './api/apiErrors'

const SESSION_REVOKED_EVENT = 'sgp:session-revoked'
const SESSION_EXPIRED_EVENT = 'sgp:session-expired'

export function AuthProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [sessionIdle, setSessionIdle] = useState<SessionIdlePolicy | null>(null)
  const [ready, setReady] = useState(false)
  const [sessionEndedMessage, setSessionEndedMessage] = useState<string | null>(
    null,
  )
  const mountedRef = useRef(true)
  const userRef = useRef<AuthUser | null>(null)
  const sessionIdleRef = useRef<SessionIdlePolicy | null>(null)
  const authEpochRef = useRef(0)

  const setUserState = useCallback((nextUser: AuthUser | null) => {
    userRef.current = nextUser
    setUser(nextUser)
  }, [])

  const replaceSessionIdle = useCallback((nextSessionIdle: SessionIdlePolicy) => {
    const currentSessionIdle = sessionIdleRef.current
    if (!shouldReplaceSessionIdle(currentSessionIdle, nextSessionIdle)) {
      return false
    }
    sessionIdleRef.current = nextSessionIdle
    setSessionIdle(nextSessionIdle)
    return true
  }, [])

  const clearSessionState = useCallback((message: string | null) => {
    authEpochRef.current += 1
    sessionIdleRef.current = null
    setSessionIdle(null)
    setUserState(null)
    setSessionEndedMessage(message)
  }, [setUserState])

  const applyAuthenticatedSession = useCallback(
    (session: { user: AuthUser; sessionIdle: SessionIdlePolicy }) => {
      if (!mountedRef.current) return false
      setUserState(session.user)
      setSessionEndedMessage(null)
      return replaceSessionIdle(session.sessionIdle)
    },
    [replaceSessionIdle, setUserState],
  )

  const clearSessionEndedMessage = useCallback(() => {
    setSessionEndedMessage(null)
  }, [])

  const refreshSessionSnapshot = useCallback(async () => {
    const requestEpoch = authEpochRef.current
    try {
      const session = await getMe()
      if (
        !mountedRef.current ||
        authEpochRef.current !== requestEpoch ||
        !userRef.current
      ) {
        return null
      }
      return session
    } catch (error) {
      if (!mountedRef.current || authEpochRef.current !== requestEpoch) {
        return null
      }
      if (error instanceof ApiError && error.status === 401) {
        if (
          error.code !== SESSION_EXPIRED_CODE &&
          error.code !== SESSION_REVOKED_CREDENTIALS_CHANGED_CODE
        ) {
          clearSessionState(null)
        }
        return null
      }
      return null
    }
  }, [clearSessionState])

  const administrativeSession = useAdministrativeSessionActivityCoordinator({
    enabled:
      !!user &&
      !!sessionIdle &&
      isAdministrativeSessionPath(location.pathname),
    navigationKey: `${location.pathname}${location.search}${location.hash}`,
    sessionIdle,
    refreshSession: refreshSessionSnapshot,
    onSessionIdle(nextSessionIdle) {
      return replaceSessionIdle(nextSessionIdle)
    },
    onKeepaliveSession(session) {
      return applyAuthenticatedSession(session)
    },
    onSessionEnded(reason, message) {
      if (reason === 'revoked') {
        clearSessionState(message?.trim() || SESSION_REVOKED_USER_MESSAGE)
        return
      }
      if (reason === 'expired') {
        clearSessionState(message?.trim() || SESSION_EXPIRED_USER_MESSAGE)
        return
      }
      clearSessionState(null)
    },
  })

  const bootstrap = useCallback(async () => {
    const requestEpoch = authEpochRef.current
    try {
      const session = await getMe()
      if (!mountedRef.current || authEpochRef.current !== requestEpoch) return
      applyAuthenticatedSession(session)
      administrativeSession.publishOfficialSessionIdle(session.sessionIdle)
    } catch {
      if (!mountedRef.current || authEpochRef.current !== requestEpoch) return
      clearSessionState(null)
    }
  }, [administrativeSession, applyAuthenticatedSession, clearSessionState])

  const refreshUser = useCallback(async () => {
    const requestEpoch = authEpochRef.current
    try {
      const session = await getMe()
      if (!mountedRef.current || authEpochRef.current !== requestEpoch) {
        return userRef.current
      }
      applyAuthenticatedSession(session)
      administrativeSession.publishOfficialSessionIdle(session.sessionIdle)
      return session.user
    } catch (error) {
      if (!mountedRef.current || authEpochRef.current !== requestEpoch) {
        return userRef.current
      }
      if (error instanceof ApiError && error.status === 401) {
        if (
          error.code !== SESSION_EXPIRED_CODE &&
          error.code !== SESSION_REVOKED_CREDENTIALS_CHANGED_CODE
        ) {
          clearSessionState(null)
        }
        return null
      }
      return userRef.current
    }
  }, [administrativeSession, applyAuthenticatedSession, clearSessionState])

  useEffect(() => {
    function onSessionRevoked(e: Event) {
      const detail = (e as CustomEvent<{ message?: string }>).detail
      const message =
        detail?.message?.trim() || SESSION_REVOKED_USER_MESSAGE
      clearSessionState(message)
      administrativeSession.publishSessionEnded(
        'revoked',
        message,
      )
    }
    function onSessionExpired(e: Event) {
      const detail = (e as CustomEvent<{ message?: string }>).detail
      const message =
        detail?.message?.trim() || SESSION_EXPIRED_USER_MESSAGE
      clearSessionState(message)
      administrativeSession.publishSessionEnded(
        'expired',
        message,
      )
    }
    window.addEventListener(SESSION_REVOKED_EVENT, onSessionRevoked)
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
    return () => {
      window.removeEventListener(SESSION_REVOKED_EVENT, onSessionRevoked)
      window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
    }
  }, [administrativeSession, clearSessionState])

  useEffect(() => {
    mountedRef.current = true
    let cancelled = false
    void (async () => {
      await bootstrap()
      if (!cancelled) setReady(true)
    })()
    return () => {
      cancelled = true
      mountedRef.current = false
    }
  }, [bootstrap])

  const login = useCallback(async (email: string, password: string) => {
    const session = await postLogin(email, password)
    authEpochRef.current += 1
    flushSync(() => {
      setUserState(session.user)
      sessionIdleRef.current = session.sessionIdle
      setSessionIdle(session.sessionIdle)
      setSessionEndedMessage(null)
    })
    administrativeSession.publishOfficialSessionIdle(session.sessionIdle)
    return session.user
  }, [administrativeSession, setUserState])

  const logout = useCallback(async () => {
    try {
      await postLogout()
    } finally {
      clearSessionState(null)
      administrativeSession.publishSessionEnded('logout')
    }
  }, [administrativeSession, clearSessionState])

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
