import { useEffect, useMemo, useState } from 'react'
import { SessionIdleWarningDialog } from './SessionIdleWarningDialog'
import { useAuth } from '../../lib/use-auth'
import { shouldShowSessionIdleWarning } from '../../features/admin/system-settings/systemSettingsValidation'

export function SessionIdleWarningHost() {
  const { user, sessionIdle, refreshUser, logout } = useAuth()
  const [nowMs, setNowMs] = useState(() => Date.now())

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

  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const open =
    !!user &&
    !!sessionIdle &&
    shouldShowSessionIdleWarning(remainingMs, sessionIdle.idleWarningMinutes)

  async function continueSession() {
    await refreshUser()
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
