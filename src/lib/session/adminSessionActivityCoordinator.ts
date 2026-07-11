import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { SessionIdlePolicy } from '../../domain/auth/sessionIdle.types'
import type { AuthUser } from '../auth-store'

export const ADMIN_SESSION_ACTIVITY_EVENTS = [
  'pointerdown',
  'keydown',
  'scroll',
  'touchstart',
] as const

export const ADMIN_SESSION_SYNC_CHANNEL_NAME = 'sgp-admin-session'
export const ADMIN_SESSION_SYNC_STORAGE_KEY = 'sgp.admin.session.sync'
export const ADMIN_SESSION_KEEPALIVE_LOCK_KEY = 'sgp.admin.session.keepalive-lock'
export const ADMIN_SESSION_KEEPALIVE_LOCK_MS = 30_000
export const ADMIN_SESSION_KEEPALIVE_MIN_WINDOW_MS = 15_000
export const ADMIN_SESSION_KEEPALIVE_MAX_WINDOW_MS = 60_000

type SessionSyncEvent =
  | {
      type: 'activity'
      eventId: string
      sourceTabId: string
      occurredAt: number
      sessionIdle: SessionIdlePolicy
    }
  | {
      type: 'session-idle'
      eventId: string
      sourceTabId: string
      occurredAt: number
      sessionIdle: SessionIdlePolicy
    }
  | {
      type: 'logout' | 'expired' | 'revoked'
      eventId: string
      sourceTabId: string
      occurredAt: number
      message?: string
    }

type KeepaliveLock = {
  sourceTabId: string
  token: string
  expiresAt: number
}

type SessionIdleSource =
  | 'optimistic'
  | 'official'
  | 'remote-activity'
  | 'remote-official'

type SessionEndReason = 'logout' | 'expired' | 'revoked'

type KeepaliveSession = {
  user: AuthUser
  sessionIdle: SessionIdlePolicy
}

type UseAdministrativeSessionActivityCoordinatorParams = {
  enabled: boolean
  navigationKey: string
  sessionIdle: SessionIdlePolicy | null
  refreshSession: () => Promise<KeepaliveSession | null>
  onSessionIdle: (
    sessionIdle: SessionIdlePolicy,
    source: SessionIdleSource,
  ) => boolean
  onKeepaliveSession: (session: KeepaliveSession) => boolean
  onSessionEnded: (reason: SessionEndReason, message?: string) => void
}

type UseAdministrativeSessionActivityCoordinatorResult = {
  publishOfficialSessionIdle: (sessionIdle: SessionIdlePolicy) => void
  publishSessionEnded: (reason: SessionEndReason, message?: string) => void
}

type BroadcastChannelLike = {
  postMessage: (message: unknown) => void
  close: () => void
  onmessage: ((event: MessageEvent<unknown>) => void) | null
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `sgp-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function safeReadLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeWriteLocalStorage(key: string, value: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* ignore storage write failures */
  }
}

function safeRemoveLocalStorage(key: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore storage remove failures */
  }
}

function readKeepaliveLock(): KeepaliveLock | null {
  return safeParseJson<KeepaliveLock>(
    safeReadLocalStorage(ADMIN_SESSION_KEEPALIVE_LOCK_KEY),
  )
}

function tryAcquireKeepaliveLock(tabId: string, nowMs: number) {
  if (typeof window === 'undefined') {
    return { acquired: true, token: null as string | null }
  }
  const existing = readKeepaliveLock()
  if (
    existing &&
    existing.expiresAt > nowMs &&
    existing.sourceTabId !== tabId
  ) {
    return { acquired: false, token: null as string | null }
  }

  const token = createId()
  const nextLock: KeepaliveLock = {
    sourceTabId: tabId,
    token,
    expiresAt: nowMs + ADMIN_SESSION_KEEPALIVE_LOCK_MS,
  }
  safeWriteLocalStorage(
    ADMIN_SESSION_KEEPALIVE_LOCK_KEY,
    JSON.stringify(nextLock),
  )
  const confirmed = readKeepaliveLock()
  if (
    confirmed?.sourceTabId === tabId &&
    confirmed.token === token &&
    confirmed.expiresAt >= nextLock.expiresAt
  ) {
    return { acquired: true, token }
  }
  return { acquired: false, token: null as string | null }
}

function releaseKeepaliveLock(tabId: string, token: string | null) {
  if (!token) return
  const current = readKeepaliveLock()
  if (current?.sourceTabId === tabId && current.token === token) {
    safeRemoveLocalStorage(ADMIN_SESSION_KEEPALIVE_LOCK_KEY)
  }
}

function asMs(value: string) {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function getSessionIdleLastActivityMs(sessionIdle: SessionIdlePolicy) {
  return asMs(sessionIdle.lastActivityAt)
}

export function getSessionIdleExpiryMs(sessionIdle: SessionIdlePolicy) {
  return asMs(sessionIdle.idleExpiresAt)
}

export function compareSessionIdleFreshness(
  next: SessionIdlePolicy,
  current: SessionIdlePolicy,
) {
  const lastActivityDiff =
    getSessionIdleLastActivityMs(next) - getSessionIdleLastActivityMs(current)
  if (lastActivityDiff !== 0) return lastActivityDiff
  return getSessionIdleExpiryMs(next) - getSessionIdleExpiryMs(current)
}

export function shouldReplaceSessionIdle(
  current: SessionIdlePolicy | null,
  next: SessionIdlePolicy,
) {
  return current === null || compareSessionIdleFreshness(next, current) >= 0
}

export function buildOptimisticSessionIdle(
  current: SessionIdlePolicy,
  nowMs: number,
): SessionIdlePolicy {
  return {
    ...current,
    lastActivityAt: new Date(nowMs).toISOString(),
    idleExpiresAt: new Date(
      nowMs + current.idleTimeoutMinutes * 60_000,
    ).toISOString(),
  }
}

export function calculateSessionKeepaliveWindowMs(
  sessionIdle: SessionIdlePolicy,
) {
  const idleTimeoutMs = Math.max(sessionIdle.idleTimeoutMinutes, 1) * 60_000
  return Math.min(
    ADMIN_SESSION_KEEPALIVE_MAX_WINDOW_MS,
    Math.max(
      ADMIN_SESSION_KEEPALIVE_MIN_WINDOW_MS,
      Math.floor(idleTimeoutMs / 6),
    ),
  )
}

export function isAdministrativeSessionPath(pathname: string) {
  return (
    pathname.startsWith('/app') &&
    !pathname.startsWith('/app/producao') &&
    !pathname.startsWith('/app/kiosk')
  )
}

function isSessionSyncEvent(value: unknown): value is SessionSyncEvent {
  if (!value || typeof value !== 'object') return false
  const type = (value as { type?: unknown }).type
  const eventId = (value as { eventId?: unknown }).eventId
  const sourceTabId = (value as { sourceTabId?: unknown }).sourceTabId
  const occurredAt = (value as { occurredAt?: unknown }).occurredAt
  if (
    typeof type !== 'string' ||
    typeof eventId !== 'string' ||
    typeof sourceTabId !== 'string' ||
    typeof occurredAt !== 'number'
  ) {
    return false
  }
  if (type === 'activity' || type === 'session-idle') {
    const sessionIdle = (value as { sessionIdle?: unknown }).sessionIdle
    return (
      !!sessionIdle &&
      typeof sessionIdle === 'object' &&
      typeof (sessionIdle as SessionIdlePolicy).idleTimeoutMinutes === 'number' &&
      typeof (sessionIdle as SessionIdlePolicy).idleWarningMinutes === 'number' &&
      typeof (sessionIdle as SessionIdlePolicy).lastActivityAt === 'string' &&
      typeof (sessionIdle as SessionIdlePolicy).idleExpiresAt === 'string'
    )
  }
  return type === 'logout' || type === 'expired' || type === 'revoked'
}

export function useAdministrativeSessionActivityCoordinator({
  enabled,
  navigationKey,
  sessionIdle,
  refreshSession,
  onSessionIdle,
  onKeepaliveSession,
  onSessionEnded,
}: UseAdministrativeSessionActivityCoordinatorParams): UseAdministrativeSessionActivityCoordinatorResult {
  const tabIdRef = useRef(createId())
  const mountedRef = useRef(true)
  const previousNavigationKeyRef = useRef<string | null>(null)
  const sessionIdleRef = useRef(sessionIdle)
  const enabledRef = useRef(enabled)
  const refreshSessionRef = useRef(refreshSession)
  const onSessionIdleRef = useRef(onSessionIdle)
  const onKeepaliveSessionRef = useRef(onKeepaliveSession)
  const onSessionEndedRef = useRef(onSessionEnded)
  const seenEventIdsRef = useRef<Map<string, number>>(new Map())
  const lastKeepaliveStartedAtRef = useRef(0)
  const inFlightKeepaliveRef = useRef<Promise<void> | null>(null)
  const channelRef = useRef<BroadcastChannelLike | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    sessionIdleRef.current = sessionIdle
  }, [sessionIdle])

  useEffect(() => {
    refreshSessionRef.current = refreshSession
  }, [refreshSession])

  useEffect(() => {
    onSessionIdleRef.current = onSessionIdle
  }, [onSessionIdle])

  useEffect(() => {
    onKeepaliveSessionRef.current = onKeepaliveSession
  }, [onKeepaliveSession])

  useEffect(() => {
    onSessionEndedRef.current = onSessionEnded
  }, [onSessionEnded])

  const rememberEventId = useCallback((eventId: string) => {
    const seen = seenEventIdsRef.current
    if (seen.has(eventId)) {
      return false
    }
    seen.set(eventId, Date.now())
    if (seen.size > 100) {
      const entries = [...seen.entries()].sort((a, b) => a[1] - b[1])
      for (const [staleId] of entries.slice(0, seen.size - 100)) {
        seen.delete(staleId)
      }
    }
    return true
  }, [])

  const publishEvent = useCallback((event: SessionSyncEvent) => {
    if (!rememberEventId(event.eventId)) return
    channelRef.current?.postMessage(event)
    safeWriteLocalStorage(
      ADMIN_SESSION_SYNC_STORAGE_KEY,
      JSON.stringify(event),
    )
    safeRemoveLocalStorage(ADMIN_SESSION_SYNC_STORAGE_KEY)
  }, [rememberEventId])

  const maybeStartKeepalive = useCallback((nowMs: number) => {
    const currentPolicy = sessionIdleRef.current
    if (!enabledRef.current || !currentPolicy) return
    if (inFlightKeepaliveRef.current) return

    const keepaliveWindowMs = calculateSessionKeepaliveWindowMs(currentPolicy)
    if (nowMs - lastKeepaliveStartedAtRef.current < keepaliveWindowMs) return

    const lock = tryAcquireKeepaliveLock(tabIdRef.current, nowMs)
    if (!lock.acquired) return

    lastKeepaliveStartedAtRef.current = nowMs
    const keepalivePromise: Promise<void> = (async () => {
      try {
        const session = await refreshSessionRef.current()
        if (!mountedRef.current || !session) return
        const applied = onKeepaliveSessionRef.current(session)
        if (!applied) return
        publishEvent({
          type: 'session-idle',
          eventId: createId(),
          sourceTabId: tabIdRef.current,
          occurredAt: Date.now(),
          sessionIdle: session.sessionIdle,
        })
      } finally {
        releaseKeepaliveLock(tabIdRef.current, lock.token)
        inFlightKeepaliveRef.current = null
      }
    })()
    inFlightKeepaliveRef.current = keepalivePromise
  }, [publishEvent])

  const handleLocalActivity = useCallback((nowMs: number) => {
    const currentPolicy = sessionIdleRef.current
    if (!enabledRef.current || !currentPolicy) return
    const nextPolicy = buildOptimisticSessionIdle(currentPolicy, nowMs)
    const applied = onSessionIdleRef.current(nextPolicy, 'optimistic')
    if (!applied) return
    publishEvent({
      type: 'activity',
      eventId: createId(),
      sourceTabId: tabIdRef.current,
      occurredAt: nowMs,
      sessionIdle: nextPolicy,
    })
    maybeStartKeepalive(nowMs)
  }, [maybeStartKeepalive, publishEvent])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleIncomingEvent = (event: SessionSyncEvent) => {
      if (event.sourceTabId === tabIdRef.current) return
      if (!rememberEventId(event.eventId)) return
      if (event.type === 'activity') {
        if (!enabledRef.current) return
        onSessionIdleRef.current(event.sessionIdle, 'remote-activity')
        return
      }
      if (event.type === 'session-idle') {
        if (!enabledRef.current) return
        onSessionIdleRef.current(event.sessionIdle, 'remote-official')
        return
      }
      onSessionEndedRef.current(event.type, event.message)
    }

    const StorageChannel =
      typeof BroadcastChannel !== 'undefined'
        ? BroadcastChannel
        : null

    if (StorageChannel) {
      const channel = new StorageChannel(
        ADMIN_SESSION_SYNC_CHANNEL_NAME,
      ) as BroadcastChannelLike
      channel.onmessage = (message) => {
        if (isSessionSyncEvent(message.data)) {
          handleIncomingEvent(message.data)
        }
      }
      channelRef.current = channel
    } else {
      channelRef.current = null
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== ADMIN_SESSION_SYNC_STORAGE_KEY) return
      const payload = safeParseJson<unknown>(event.newValue)
      if (isSessionSyncEvent(payload)) {
        handleIncomingEvent(payload)
      }
    }

    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
      channelRef.current?.close()
      channelRef.current = null
    }
  }, [rememberEventId])

  useEffect(() => {
    if (!enabled) {
      previousNavigationKeyRef.current = navigationKey
      return
    }
    if (
      previousNavigationKeyRef.current !== null &&
      previousNavigationKeyRef.current !== navigationKey
    ) {
      handleLocalActivity(Date.now())
    }
    previousNavigationKeyRef.current = navigationKey
  }, [enabled, handleLocalActivity, navigationKey])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const onActivity = () => {
      handleLocalActivity(Date.now())
    }

    for (const eventName of ADMIN_SESSION_ACTIVITY_EVENTS) {
      window.addEventListener(eventName, onActivity, { passive: true })
    }
    return () => {
      for (const eventName of ADMIN_SESSION_ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onActivity)
      }
    }
  }, [enabled, handleLocalActivity])

  const publishOfficialSessionIdle = useCallback(
    (sessionIdlePolicy: SessionIdlePolicy) => {
      publishEvent({
        type: 'session-idle',
        eventId: createId(),
        sourceTabId: tabIdRef.current,
        occurredAt: Date.now(),
        sessionIdle: sessionIdlePolicy,
      })
    },
    [publishEvent],
  )

  const publishSessionEnded = useCallback(
    (reason: SessionEndReason, message?: string) => {
      publishEvent({
        type: reason,
        eventId: createId(),
        sourceTabId: tabIdRef.current,
        occurredAt: Date.now(),
        message,
      })
    },
    [publishEvent],
  )

  return useMemo(
    () => ({
      publishOfficialSessionIdle,
      publishSessionEnded,
    }),
    [publishOfficialSessionIdle, publishSessionEnded],
  )
}
