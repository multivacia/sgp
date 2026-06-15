import { Navigate, Outlet } from 'react-router-dom'
import { useProductionAuth } from '../../lib/use-production-auth'

/**
 * Impede acesso à fila enquanto a troca de PIN for obrigatória.
 */
export function RequireProductionPinChangeCleared() {
  const { mustChangePin, isLoading } = useProductionAuth()

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-sm text-slate-400">
        Carregando sessão de produção…
      </div>
    )
  }

  if (mustChangePin) {
    return <Navigate to="/app/producao/change-pin" replace />
  }

  return <Outlet />
}
