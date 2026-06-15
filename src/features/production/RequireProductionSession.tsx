import { useEffect, useRef } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useProductionAuth } from '../../lib/use-production-auth'

/** Minutos de inatividade antes do logout automático. */
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000

const ACTIVITY_EVENTS = ['click', 'keydown', 'touchstart', 'mousemove'] as const

/**
 * Guarda de rota para a área autenticada do Modo Fábrica.
 * Não usa RequirePermission nem AuthProvider administrativo.
 * Inclui timer de inatividade: após 30 min sem interação, faz logout production.
 */
export function RequireProductionSession() {
  const { isAuthenticated, isLoading, logout } = useProductionAuth()

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutRef = useRef(logout)
  logoutRef.current = logout

  useEffect(() => {
    if (!isAuthenticated) return

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        void logoutRef.current()
      }, INACTIVITY_TIMEOUT_MS)
    }

    resetTimer()
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true })
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer)
      }
    }
  }, [isAuthenticated])

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-sm text-slate-400">
        Carregando sessão de produção…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/app/producao" replace />
  }

  return <Outlet />
}
