import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from './api/apiErrors'
import { ProductionAuthContext } from './production-auth-context-instance'
import type { ProductionCollaboratorSummary } from '../domain/production/production.types'
import {
  changeProductionPin,
  getProductionSession,
  loginProduction,
  logoutProduction,
} from '../services/production/productionApiService'

const SESSION_EXPIRED_MSG =
  'Sua sessão de produção expirou. Selecione seu nome novamente.'

const NETWORK_ERROR_MSG =
  'Não foi possível validar a sessão agora.'

export function ProductionAuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [collaborator, setCollaborator] =
    useState<ProductionCollaboratorSummary | null>(null)
  const [mustChangePin, setMustChangePin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<
    string | null
  >(null)

  const clearSessionExpiredMessage = useCallback(() => {
    setSessionExpiredMessage(null)
  }, [])

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const session = await getProductionSession()
      setCollaborator(session.collaborator)
      setMustChangePin(session.mustChangePin === true)
      return true
    } catch (e) {
      setCollaborator(null)
      setMustChangePin(false)
      if (e instanceof ApiError) {
        if (e.status === 401) {
          setSessionExpiredMessage(SESSION_EXPIRED_MSG)
          navigate('/app/producao', { replace: true })
        } else {
          setSessionExpiredMessage(NETWORK_ERROR_MSG)
        }
      }
      return false
    }
  }, [navigate])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const session = await getProductionSession()
        if (!cancelled) {
          setCollaborator(session.collaborator)
          setMustChangePin(session.mustChangePin === true)
        }
      } catch (e) {
        if (!cancelled) {
          setCollaborator(null)
          setMustChangePin(false)
          if (e instanceof ApiError && e.status !== 401) {
            // Erro de rede na verificação inicial: silencioso.
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (collaboratorId: string, pin: string) => {
    const session = await loginProduction(collaboratorId, pin)
    setCollaborator(session.collaborator)
    setMustChangePin(session.mustChangePin === true)
    setSessionExpiredMessage(null)
    return { mustChangePin: session.mustChangePin === true }
  }, [])

  const changePin = useCallback(async (newPin: string, confirmPin: string) => {
    await changeProductionPin(newPin, confirmPin)
    setMustChangePin(false)
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutProduction()
    } finally {
      setCollaborator(null)
      setMustChangePin(false)
      setSessionExpiredMessage(null)
      navigate('/app/producao', { replace: true })
    }
  }, [navigate])

  const value = useMemo(
    () => ({
      collaborator,
      isLoading,
      isAuthenticated: collaborator !== null,
      mustChangePin,
      sessionExpiredMessage,
      clearSessionExpiredMessage,
      login,
      changePin,
      logout,
      refreshSession,
    }),
    [
      collaborator,
      isLoading,
      mustChangePin,
      sessionExpiredMessage,
      clearSessionExpiredMessage,
      login,
      changePin,
      logout,
      refreshSession,
    ],
  )

  return (
    <ProductionAuthContext.Provider value={value}>
      {children}
    </ProductionAuthContext.Provider>
  )
}
