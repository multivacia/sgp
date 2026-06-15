import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { ProductionCollaboratorSummary } from '../../domain/production/production.types'
import { isValidProductionPin } from '../../domain/production/production.helpers'
import { ApiError } from '../../lib/api/apiErrors'
import { useProductionAuth } from '../../lib/use-production-auth'
import {
  listProductionCollaborators,
  PRODUCTION_LOGIN_ERROR_MESSAGE,
} from '../../services/production/productionApiService'
import { ProductionCollaboratorAvatar } from './ProductionCollaboratorAvatar'

type PinLocationState = {
  collaborator?: ProductionCollaboratorSummary
}

const COLLABORATOR_DISABLED_MSG =
  'Esse colaborador não está habilitado para login no modo produção.'

export function ProductionPinPage() {
  const { collaboratorId } = useParams<{ collaboratorId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as PinLocationState | null)?.collaborator
  const { login, isAuthenticated, isLoading: sessionLoading, mustChangePin } =
    useProductionAuth()

  const [collaborator, setCollaborator] =
    useState<ProductionCollaboratorSummary | null>(state ?? null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resolving, setResolving] = useState(!state)
  const [collaboratorDisabled, setCollaboratorDisabled] = useState(false)
  const pinRef = useRef<HTMLInputElement>(null)

  const resolveCollaborator = useCallback(async () => {
    if (!collaboratorId) return
    setResolving(true)
    try {
      const data = await listProductionCollaborators()
      const found = data.items.find((c) => c.id === collaboratorId) ?? null
      if (!found) {
        setCollaboratorDisabled(true)
      } else if (found.productionCredentialStatus !== 'READY') {
        setCollaboratorDisabled(true)
      }
      setCollaborator(found)
    } catch {
      setCollaborator(null)
    } finally {
      setResolving(false)
    }
  }, [collaboratorId])

  useEffect(() => {
    if (state) {
      setCollaborator(state)
      setResolving(false)
      if (state.productionCredentialStatus !== 'READY') {
        setCollaboratorDisabled(true)
      }
      return
    }
    void resolveCollaborator()
  }, [state, resolveCollaborator])

  useEffect(() => {
    if (collaborator) {
      pinRef.current?.focus()
    }
  }, [collaborator])

  if (!sessionLoading && isAuthenticated) {
    if (mustChangePin) {
      return <Navigate to="/app/producao/change-pin" replace />
    }
    return <Navigate to="/app/producao/app" replace />
  }

  if (!collaboratorId) {
    return <Navigate to="/app/producao" replace />
  }

  if (!resolving && collaboratorDisabled) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 py-8 text-center">
        <p className="text-base text-red-300">{COLLABORATOR_DISABLED_MSG}</p>
        <button
          type="button"
          onClick={() => navigate('/app/producao')}
          className="sgp-cta-secondary min-h-12 px-8 text-base"
        >
          Voltar à seleção
        </button>
      </div>
    )
  }

  if (!resolving && !collaborator) {
    return <Navigate to="/app/producao" replace />
  }

  function handlePinChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    setPin(digits)
    setError(null)
  }

  async function submitPin() {
    if (!collaborator) return
    if (!isValidProductionPin(pin)) {
      setError('Digite um PIN de 4 a 8 dígitos.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await login(collaborator.id, pin)
      setPin('')
      if (result.mustChangePin) {
        navigate('/app/producao/change-pin', { replace: true })
      } else {
        navigate('/app/producao/app', { replace: true })
      }
    } catch (err) {
      // Limpar campo imediatamente — nunca persistir PIN.
      setPin('')
      setError(
        err instanceof ApiError
          ? err.message
          : PRODUCTION_LOGIN_ERROR_MESSAGE,
      )
      pinRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await submitPin()
  }

  if (resolving || !collaborator) {
    return (
      <p className="py-16 text-center text-slate-400">Carregando…</p>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <ProductionCollaboratorAvatar collaborator={collaborator} size="lg" />
        <div>
          <p className="text-xl text-slate-200">{collaborator.fullName}</p>
          <p className="mt-2 text-base text-slate-400">
            Digite seu PIN para continuar
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="sr-only" htmlFor="production-pin">
          PIN operacional
        </label>
        <input
          id="production-pin"
          ref={pinRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          autoFocus
          value={pin}
          onChange={(e) => handlePinChange(e.target.value)}
          placeholder="• • • •"
          disabled={loading}
          className="min-h-14 w-full rounded-xl border border-white/15 bg-sgp-night/60 px-4 text-center text-2xl tracking-[0.35em] text-white placeholder:text-slate-600 focus:border-sgp-gold/50 focus:outline-none focus:ring-2 focus:ring-sgp-gold/25"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'pin-error' : undefined}
        />

        {error ? (
          <p id="pin-error" className="text-center text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading || !isValidProductionPin(pin)}
          className="sgp-cta-primary min-h-14 w-full text-base disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => navigate('/app/producao')}
          className="sgp-cta-secondary min-h-12 w-full text-base"
        >
          Voltar
        </button>
      </form>
    </div>
  )
}
