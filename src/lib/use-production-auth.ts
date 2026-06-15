import { useContext } from 'react'
import { ProductionAuthContext } from './production-auth-context-instance'

export function useProductionAuth() {
  const ctx = useContext(ProductionAuthContext)
  if (!ctx) {
    throw new Error(
      'useProductionAuth deve ser usado dentro de ProductionAuthProvider',
    )
  }
  return ctx
}
