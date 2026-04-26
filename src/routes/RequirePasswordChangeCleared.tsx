import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/use-auth'

/**
 * Bloqueia rotas operacionais enquanto `mustChangePassword` for true.
 * A rota `/app/alterar-senha` fica fora deste wrapper.
 */
export function RequirePasswordChangeCleared() {
  const { user } = useAuth()

  if (user?.mustChangePassword) {
    return <Navigate to="/app/alterar-senha" replace />
  }

  return <Outlet />
}
