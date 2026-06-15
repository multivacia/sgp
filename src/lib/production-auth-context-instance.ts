import { createContext } from 'react'
import type { ProductionCollaboratorSummary } from '../domain/production/production.types'

export type ProductionAuthContextValue = {
  collaborator: ProductionCollaboratorSummary | null
  isLoading: boolean
  isAuthenticated: boolean
  mustChangePin: boolean
  /**
   * Mensagem amigável quando a sessão de produção expirou.
   * Exibida na tela de seleção de colaborador após redirecionamento automático.
   * Limpa após a primeira exibição ou ao autenticar novamente.
   */
  sessionExpiredMessage: string | null
  clearSessionExpiredMessage: () => void
  login: (collaboratorId: string, pin: string) => Promise<{ mustChangePin: boolean }>
  changePin: (newPin: string, confirmPin: string) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<boolean>
}

export const ProductionAuthContext =
  createContext<ProductionAuthContextValue | null>(null)
