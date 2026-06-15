import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  isProductionDefaultInitialPin,
  isValidProductionPin,
} from '../../domain/production/production.helpers'
import { ApiError } from '../../lib/api/apiErrors'
import { useProductionAuth } from '../../lib/use-production-auth'
import { PRODUCTION_CHANGE_PIN_ERROR_MESSAGE } from '../../services/production/productionApiService'
import { ProductionCollaboratorAvatar } from './ProductionCollaboratorAvatar'

export function ProductionChangePinPage() {
  const navigate = useNavigate()
  const {
    collaborator,
    isAuthenticated,
    isLoading,
    mustChangePin,
    changePin,
    logout,
  } = useProductionAuth()

  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const newPinRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    newPinRef.current?.focus()
  }, [])

  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/app/producao" replace />
  }

  if (!isLoading && isAuthenticated && !mustChangePin) {
    return <Navigate to="/app/producao/app" replace />
  }

  function handlePinInput(value: string, setter: (v: string) => void) {
    setter(value.replace(/\D/g, '').slice(0, 8))
    setError(null)
  }

  function validateForm(): string | null {
    if (!isValidProductionPin(newPin)) {
      return 'Digite um PIN de 4 a 8 dígitos.'
    }
    if (!isValidProductionPin(confirmPin)) {
      return 'Confirme o PIN com 4 a 8 dígitos.'
    }
    if (newPin !== confirmPin) {
      return 'A confirmação deve ser igual ao novo PIN.'
    }
    if (isProductionDefaultInitialPin(newPin)) {
      return 'Escolha um PIN diferente do PIN inicial padrão.'
    }
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await changePin(newPin, confirmPin)
      setNewPin('')
      setConfirmPin('')
      navigate('/app/producao/app', { replace: true })
    } catch (err) {
      setNewPin('')
      setConfirmPin('')
      setError(
        err instanceof ApiError
          ? err.message
          : PRODUCTION_CHANGE_PIN_ERROR_MESSAGE,
      )
      newPinRef.current?.focus()
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading || !collaborator) {
    return (
      <p className="py-16 text-center text-slate-400">Carregando…</p>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <ProductionCollaboratorAvatar collaborator={collaborator} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Crie seu PIN de produção
          </h1>
          <p className="mt-2 text-base text-slate-400">
            Este é seu primeiro acesso. Troque o PIN inicial para continuar.
          </p>
          <p className="mt-3 text-lg text-slate-200">{collaborator.fullName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">Novo PIN</span>
          <input
            ref={newPinRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={newPin}
            onChange={(e) => handlePinInput(e.target.value, setNewPin)}
            placeholder="• • • •"
            disabled={submitting}
            className="min-h-14 w-full rounded-xl border border-white/15 bg-sgp-night/60 px-4 text-center text-2xl tracking-[0.35em] text-white placeholder:text-slate-600 focus:border-sgp-gold/50 focus:outline-none focus:ring-2 focus:ring-sgp-gold/25"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">
            Confirmar PIN
          </span>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={confirmPin}
            onChange={(e) => handlePinInput(e.target.value, setConfirmPin)}
            placeholder="• • • •"
            disabled={submitting}
            className="min-h-14 w-full rounded-xl border border-white/15 bg-sgp-night/60 px-4 text-center text-2xl tracking-[0.35em] text-white placeholder:text-slate-600 focus:border-sgp-gold/50 focus:outline-none focus:ring-2 focus:ring-sgp-gold/25"
          />
        </label>

        {error ? (
          <p className="text-center text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={
            submitting ||
            !isValidProductionPin(newPin) ||
            !isValidProductionPin(confirmPin)
          }
          className="sgp-cta-primary min-h-14 w-full text-base disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Alterando…' : 'Alterar PIN'}
        </button>

        <button
          type="button"
          disabled={submitting}
          onClick={() => void logout()}
          className="sgp-cta-secondary min-h-12 w-full text-base"
        >
          Sair
        </button>
      </form>
    </div>
  )
}
