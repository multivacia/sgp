import { useEffect, useMemo, useRef, useState } from 'react'
import { SessionIdleWarningDialog } from './SessionIdleWarningDialog'
import { useAuth } from '../../lib/use-auth'
import { shouldShowSessionIdleWarning } from '../../features/admin/system-settings/systemSettingsValidation'

export function SessionIdleWarningHost() {
  const {
    user,
    sessionIdle,
    hasLocalActivitySinceLastServerSync,
    isSessionRefreshInFlight,
    refreshAdministrativeSession,
    logout,
  } = useAuth()
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [open, setOpen] = useState(false)
  const lastAutoRefreshAttemptExpiryRef = useRef<string | null>(null)
  const latestUserRef = useRef(user)
  const latestSessionIdleRef = useRef(sessionIdle)
  const keepDialogOpenWhileRefreshingRef = useRef(false)
  const pendingOpenStateTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (pendingOpenStateTimerRef.current) {
        window.clearTimeout(pendingOpenStateTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    latestUserRef.current = user
    latestSessionIdleRef.current = sessionIdle
  }, [sessionIdle, user])

  useEffect(() => {
    if (!user || !sessionIdle) return

    const tick = () => {
      setNowMs(Date.now())
    }

    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [user, sessionIdle])

  const remainingMs = useMemo(() => {
    if (!user || !sessionIdle) return 0
    return Date.parse(sessionIdle.idleExpiresAt) - nowMs
  }, [nowMs, sessionIdle, user])

  const withinWarningWindow =
    !!user &&
    !!sessionIdle &&
    shouldShowSessionIdleWarning(remainingMs, sessionIdle.idleWarningMinutes)

  useEffect(() => {
    if (!user || !sessionIdle) {
      lastAutoRefreshAttemptExpiryRef.current = null
      keepDialogOpenWhileRefreshingRef.current = false
      if (pendingOpenStateTimerRef.current) {
        window.clearTimeout(pendingOpenStateTimerRef.current)
      }
      pendingOpenStateTimerRef.current = window.setTimeout(() => {
        setOpen(false)
        pendingOpenStateTimerRef.current = null
      }, 0)
      return
    }

    if (!withinWarningWindow) {
      lastAutoRefreshAttemptExpiryRef.current = null
      keepDialogOpenWhileRefreshingRef.current = false
      if (pendingOpenStateTimerRef.current) {
        window.clearTimeout(pendingOpenStateTimerRef.current)
      }
      pendingOpenStateTimerRef.current = window.setTimeout(() => {
        setOpen(false)
        pendingOpenStateTimerRef.current = null
      }, 0)
      return
    }

    if (!hasLocalActivitySinceLastServerSync) {
      if (pendingOpenStateTimerRef.current) {
        window.clearTimeout(pendingOpenStateTimerRef.current)
      }
      pendingOpenStateTimerRef.current = window.setTimeout(() => {
        setOpen(true)
        pendingOpenStateTimerRef.current = null
      }, 0)
      return
    }

    if (
      !isSessionRefreshInFlight &&
      lastAutoRefreshAttemptExpiryRef.current !== sessionIdle.idleExpiresAt
    ) {
      const attemptedExpiry = sessionIdle.idleExpiresAt
      keepDialogOpenWhileRefreshingRef.current = open
      lastAutoRefreshAttemptExpiryRef.current = attemptedExpiry
      if (!open) {
        if (pendingOpenStateTimerRef.current) {
          window.clearTimeout(pendingOpenStateTimerRef.current)
        }
        pendingOpenStateTimerRef.current = window.setTimeout(() => {
          setOpen(false)
          pendingOpenStateTimerRef.current = null
        }, 0)
      }
      void refreshAdministrativeSession().then((refreshed) => {
        const currentUser = latestUserRef.current
        const currentSessionIdle = latestSessionIdleRef.current
        if (
          refreshed ||
          !currentUser ||
          !currentSessionIdle ||
          currentSessionIdle.idleExpiresAt !== attemptedExpiry
        ) {
          return
        }
        if (
          shouldShowSessionIdleWarning(
            Date.parse(currentSessionIdle.idleExpiresAt) - Date.now(),
            currentSessionIdle.idleWarningMinutes,
          )
        ) {
          keepDialogOpenWhileRefreshingRef.current = true
          if (pendingOpenStateTimerRef.current) {
            window.clearTimeout(pendingOpenStateTimerRef.current)
          }
          pendingOpenStateTimerRef.current = window.setTimeout(() => {
            setOpen(true)
            pendingOpenStateTimerRef.current = null
          }, 0)
        }
      })
      return
    }

    if (!keepDialogOpenWhileRefreshingRef.current) {
      if (pendingOpenStateTimerRef.current) {
        window.clearTimeout(pendingOpenStateTimerRef.current)
      }
      pendingOpenStateTimerRef.current = window.setTimeout(() => {
        setOpen(false)
        pendingOpenStateTimerRef.current = null
      }, 0)
    }
  }, [
    hasLocalActivitySinceLastServerSync,
    isSessionRefreshInFlight,
    open,
    refreshAdministrativeSession,
    sessionIdle,
    user,
    withinWarningWindow,
  ])

  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000))

  async function continueSession() {
    keepDialogOpenWhileRefreshingRef.current = true
    await refreshAdministrativeSession()
  }

  return (
    <SessionIdleWarningDialog
      open={open}
      remainingSeconds={remainingSeconds}
      onContinue={() => void continueSession()}
      onLogout={() => void logout()}
    />
  )
}
