import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/use-auth'

export function RequireAuth() {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-sgp-void text-sm text-slate-400">
        Carregando sessão…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
