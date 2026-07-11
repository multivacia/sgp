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
  useAdministrativeSessionActivityCoordinator,
} from './session/adminSessionActivityCoordinator'
import { getMe, postLogin, postLogout } from '../services/auth/authApiService'
import {
  SESSION_EXPIRED_USER_MESSAGE,
  SESSION_REVOKED_USER_MESSAGE,
} from './api/apiErrors'

const SESSION_REVOKED_EVENT = 'sgp:session-revoked'
const SESSION_EXPIRED_EVENT = 'sgp:session-expired'

function parseLastActivityAt(sessionIdle: SessionIdlePolicy): number {
  const parsed = Date.parse(sessionIdle.lastActivityAt)
  return Number.isFinite(parsed) ? parsed : Date.now()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [sessionIdle, setSessionIdle] = useState<SessionIdlePolicy | null>(null)
  const [ready, setReady] = useState(false)
  const [sessionEndedMessage, setSessionEndedMessage] = useState<string | null>(
    null,
  )
  const [hasLocalActivitySinceLastServerSync, setHasLocalActivitySinceLastServerSync] =
    useState(false)
  const [isSessionRefreshInFlight, setIsSessionRefreshInFlight] =
    useState(false)
  const mountedRef = useRef(true)
  const userRef = useRef<AuthUser | null>(null)
  const sessionIdleRef = useRef<SessionIdlePolicy | null>(null)
  const authEpochRef = useRef(0)
  const hasLocalActivityRef = useRef(false)
  const localActivityVersionRef = useRef(0)
  const lastLocalActivityAtRef = useRef<number | null>(null)
  const lastSuccessfulServerSyncAtRef = useRef<number | null>(null)
  const refreshRequestIdRef = useRef(0)
  const latestAppliedRefreshRequestIdRef = useRef(0)
  const inFlightSessionRefreshRef = useRef<Promise<boolean> | null>(null)

  const setUserState = useCallback((nextUser: AuthUser | null) => {
    userRef.current = nextUser
    setUser(nextUser)
  }, [])

  const clearLocalActivityState = useCallback(() => {
    hasLocalActivityRef.current = false
    setHasLocalActivitySinceLastServerSync(false)
    lastLocalActivityAtRef.current = null
  }, [])

  const applyAuthenticatedSession = useCallback(
    (session: { user: AuthUser; sessionIdle: SessionIdlePolicy }) => {
      if (!mountedRef.current) return false
      setUserState(session.user)
      sessionIdleRef.current = session.sessionIdle
      setSessionIdle(session.sessionIdle)
      setSessionEndedMessage(null)
      lastSuccessfulServerSyncAtRef.current = parseLastActivityAt(
        session.sessionIdle,
      )
      return true
    },
    [setUserState],
  )

  const clearSessionState = useCallback(
    (message: string | null) => {
      authEpochRef.current += 1
      sessionIdleRef.current = null
      setSessionIdle(null)
      setUserState(null)
      setSessionEndedMessage(message)
      clearLocalActivityState()
      lastSuccessfulServerSyncAtRef.current = null
      refreshRequestIdRef.current += 1
      latestAppliedRefreshRequestIdRef.current = refreshRequestIdRef.current
      inFlightSessionRefreshRef.current = null
      setIsSessionRefreshInFlight(false)
    },
    [clearLocalActivityState, setUserState],
  )

  const markLocalActivity = useCallback((occurredAt: number) => {
    if (!userRef.current || !sessionIdleRef.current) return
    localActivityVersionRef.current += 1
    lastLocalActivityAtRef.current = occurredAt
    if (!hasLocalActivityRef.current) {
      hasLocalActivityRef.current = true
      setHasLocalActivitySinceLastServerSync(true)
    }
  }, [])

  useAdministrativeSessionActivityCoordinator({
    enabled:
      !!user &&
      !!sessionIdle &&
      isAdministrativeSessionPath(location.pathname),
    navigationKey: `${location.pathname}${location.search}${location.hash}`,
    onLocalActivity: markLocalActivity,
  })

  const refreshAdministrativeSession = useCallback(async () => {
    if (inFlightSessionRefreshRef.current) {
      return inFlightSessionRefreshRef.current
    }
    if (!userRef.current) return false

    const requestEpoch = authEpochRef.current
    const requestId = refreshRequestIdRef.current + 1
    refreshRequestIdRef.current = requestId
    const activityVersionAtStart = localActivityVersionRef.current
    setIsSessionRefreshInFlight(true)

    let currentPromise: Promise<boolean> | null = null
    currentPromise = (async () => {
      try {
        const session = await getMe()
        if (
          !mountedRef.current ||
          authEpochRef.current !== requestEpoch ||
          !userRef.current
        ) {
          return false
        }
        if (requestId < latestAppliedRefreshRequestIdRef.current) {
          return false
        }
        latestAppliedRefreshRequestIdRef.current = requestId
        applyAuthenticatedSession(session)
        if (localActivityVersionRef.current === activityVersionAtStart) {
          clearLocalActivityState()
        } else {
          hasLocalActivityRef.current = true
          setHasLocalActivitySinceLastServerSync(true)
        }
        return true
      } catch (error) {
        if (!mountedRef.current || authEpochRef.current !== requestEpoch) {
          return false
        }
        if (error instanceof ApiError && error.status === 401) {
          if (
            error.code !== SESSION_EXPIRED_CODE &&
            error.code !== SESSION_REVOKED_CREDENTIALS_CHANGED_CODE
          ) {
            clearSessionState(null)
          }
          return false
        }
        return false
      } finally {
        if (
          mountedRef.current &&
          authEpochRef.current === requestEpoch
        ) {
          setIsSessionRefreshInFlight(false)
        }
        if (inFlightSessionRefreshRef.current === currentPromise) {
          inFlightSessionRefreshRef.current = null
        }
      }
    })()

    inFlightSessionRefreshRef.current = currentPromise
    return currentPromise
  }, [
    applyAuthenticatedSession,
    clearLocalActivityState,
    clearSessionState,
  ])

  const clearSessionEndedMessage = useCallback(() => {
    setSessionEndedMessage(null)
  }, [])

  const bootstrap = useCallback(async () => {
    const requestEpoch = authEpochRef.current
    try {
      const session = await getMe()
      if (!mountedRef.current || authEpochRef.current !== requestEpoch) return
      applyAuthenticatedSession(session)
      clearLocalActivityState()
    } catch {
      if (!mountedRef.current || authEpochRef.current !== requestEpoch) return
      clearSessionState(null)
    }
  }, [applyAuthenticatedSession, clearLocalActivityState, clearSessionState])

  const refreshUser = useCallback(async () => {
    await refreshAdministrativeSession()
    return userRef.current
  }, [refreshAdministrativeSession])

  useEffect(() => {
    function onSessionRevoked(e: Event) {
      const detail = (e as CustomEvent<{ message?: string }>).detail
      clearSessionState(
        detail?.message?.trim() || SESSION_REVOKED_USER_MESSAGE,
      )
    }
    function onSessionExpired(e: Event) {
      const detail = (e as CustomEvent<{ message?: string }>).detail
      clearSessionState(
        detail?.message?.trim() || SESSION_EXPIRED_USER_MESSAGE,
      )
    }
    window.addEventListener(SESSION_REVOKED_EVENT, onSessionRevoked)
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
    return () => {
      window.removeEventListener(SESSION_REVOKED_EVENT, onSessionRevoked)
      window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
    }
  }, [clearSessionState])

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
      applyAuthenticatedSession(session)
      clearLocalActivityState()
    })
    return session.user
  }, [applyAuthenticatedSession, clearLocalActivityState])

  const logout = useCallback(async () => {
    try {
      await postLogout()
    } finally {
      clearSessionState(null)
    }
  }, [clearSessionState])

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
      hasLocalActivitySinceLastServerSync,
      isSessionRefreshInFlight,
      clearSessionEndedMessage,
      login,
      logout,
      refreshUser,
      refreshAdministrativeSession,
      can,
      canAny,
    }),
    [
      user,
      ready,
      sessionEndedMessage,
      sessionIdle,
      hasLocalActivitySinceLastServerSync,
      isSessionRefreshInFlight,
      clearSessionEndedMessage,
      login,
      logout,
      refreshUser,
      refreshAdministrativeSession,
      can,
      canAny,
    ],
  )

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}
