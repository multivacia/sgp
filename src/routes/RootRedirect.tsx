import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/use-auth'

export function RootRedirect() {
  const { user, ready } = useAuth()

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-sgp-void text-sm text-slate-400">
        Carregando…
      </div>
    )
  }

  const target = user
    ? user.mustChangePassword
      ? '/app/alterar-senha'
      : '/app/backlog'
    : '/login'
  return <Navigate to={target} replace />
}
