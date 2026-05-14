import { useEffect, useState } from 'react'
import { SessionIdleWarningDialog } from './SessionIdleWarningDialog'
import { useAuth } from '../../lib/use-auth'
import { shouldShowSessionIdleWarning } from '../../features/admin/system-settings/systemSettingsValidation'

export function SessionIdleWarningHost() {
  const { user, sessionIdle, refreshUser, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  useEffect(() => {
    if (!user || !sessionIdle) {
      setOpen(false)
      return
    }

    const tick = () => {
      const remainingMs = Date.parse(sessionIdle.idleExpiresAt) - Date.now()
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000))
      setRemainingSeconds(remainingSec)
      setOpen(shouldShowSessionIdleWarning(remainingMs, sessionIdle.idleWarningMinutes))
    }

    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [user, sessionIdle])

  async function continueSession() {
    const updated = await refreshUser()
    if (updated) {
      setOpen(false)
    }
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
