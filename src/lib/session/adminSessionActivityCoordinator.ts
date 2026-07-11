import { useEffect, useRef } from 'react'

export const ADMIN_SESSION_ACTIVITY_EVENTS = [
  'pointerdown',
  'keydown',
  'scroll',
  'touchstart',
] as const

type UseAdministrativeSessionActivityCoordinatorParams = {
  enabled: boolean
  navigationKey: string
  onLocalActivity: (occurredAt: number) => void
}

export function isAdministrativeSessionPath(pathname: string) {
  return (
    pathname.startsWith('/app') &&
    !pathname.startsWith('/app/producao') &&
    !pathname.startsWith('/app/kiosk')
  )
}

export function useAdministrativeSessionActivityCoordinator({
  enabled,
  navigationKey,
  onLocalActivity,
}: UseAdministrativeSessionActivityCoordinatorParams): void {
  const previousNavigationKeyRef = useRef<string | null>(null)
  const onLocalActivityRef = useRef(onLocalActivity)

  useEffect(() => {
    onLocalActivityRef.current = onLocalActivity
  }, [onLocalActivity])

  useEffect(() => {
    if (!enabled) {
      previousNavigationKeyRef.current = navigationKey
      return
    }
    if (
      previousNavigationKeyRef.current !== null &&
      previousNavigationKeyRef.current !== navigationKey
    ) {
      onLocalActivityRef.current(Date.now())
    }
    previousNavigationKeyRef.current = navigationKey
  }, [enabled, navigationKey])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const onActivity = () => {
      onLocalActivityRef.current(Date.now())
    }

    for (const eventName of ADMIN_SESSION_ACTIVITY_EVENTS) {
      window.addEventListener(eventName, onActivity, { passive: true })
    }
    return () => {
      for (const eventName of ADMIN_SESSION_ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onActivity)
      }
    }
  }, [enabled])
}
