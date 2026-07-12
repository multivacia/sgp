import { useState, useCallback } from 'react'
import type { ProductionCollaboratorSummary } from '../../domain/production/production.types'
import { changeProductionPin } from '../../services/production/productionApiService'
import { ApiError } from '../../lib/api/apiErrors'
import { ProductionCollaboratorAvatar } from '../production/ProductionCollaboratorAvatar'

type Props = {
  collaborator: ProductionCollaboratorSummary
  onSuccess: () => void
  onBack: () => void
}

type Step = 'new' | 'confirm'

const PIN_LENGTH = 4

const KEY_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
] as const

export function KioskChangePin({ collaborator, onSuccess, onBack }: Props) {
  const [step, setStep] = useState<Step>('new')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const activePin = step === 'new' ? newPin : confirmPin
  const setActivePin = step === 'new' ? setNewPin : setConfirmPin

  const submitConfirm = useCallback(
    async (digits: string) => {
      if (digits !== newPin) {
        setConfirmPin('')
        setError('Os PINs não coincidem. Tente novamente.')
        return
      }
      setLoading(true)
      setError(null)
      try {
        await changeProductionPin(digits, digits)
        onSuccess()
      } catch (e) {
        setConfirmPin('')
        setStep('new')
        setNewPin('')
        setError(
          e instanceof ApiError
            ? e.message
            : 'Não foi possível alterar o PIN. Tente novamente.',
        )
        setLoading(false)
      }
    },
    [newPin, onSuccess],
  )

  const pressKey = useCallback(
    (key: string) => {
      if (loading) return
      if (key === '⌫') {
        setActivePin((p) => p.slice(0, -1))
        setError(null)
        return
      }
      if (key === '') return
      setActivePin((prev) => {
        const next = (prev + key).slice(0, PIN_LENGTH)
        if (next.length === PIN_LENGTH) {
          if (step === 'new') {
            setStep('confirm')
            setError(null)
          } else {
            void submitConfirm(next)
          }
        }
        return next
      })
      setError(null)
    },
    [loading, step, setActivePin, submitConfirm],
  )

  const title =
    step === 'new' ? 'Crie seu PIN de 4 dígitos' : 'Confirme seu novo PIN'
  const subtitle =
    step === 'new'
      ? 'Este será seu acesso pessoal ao Modo Fábrica'
      : 'Digite o mesmo PIN novamente para confirmar'

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-6 py-8">
      {/* Avatar + nome */}
      <div className="flex flex-col items-center gap-3 text-center">
        <ProductionCollaboratorAvatar collaborator={collaborator} size="lg" />
        <div>
          <p className="text-xl font-semibold text-white">{collaborator.fullName}</p>
          {collaborator.teamName ? (
            <p className="mt-0.5 text-sm text-slate-400">{collaborator.teamName}</p>
          ) : null}
        </div>
      </div>

      {/* Instruções */}
      <div className="rounded-xl border border-sgp-gold/25 bg-sgp-gold/[0.06] px-5 py-3 text-center max-w-xs">
        <p className="text-sm font-semibold text-sgp-gold">{title}</p>
        <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      </div>

      {/* Indicadores de dígitos */}
      <div className="flex gap-4" role="presentation" aria-label="PIN">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={[
              'h-4 w-4 rounded-full transition-all duration-150',
              i < activePin.length ? 'scale-110 bg-sgp-gold' : 'bg-white/20',
            ].join(' ')}
          />
        ))}
      </div>

      {/* Erro */}
      {error ? (
        <p role="alert" className="text-center text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {/* Teclado on-screen */}
      <div className="w-full max-w-xs space-y-3">
        {KEY_ROWS.map((row, ri) => (
          <div key={ri} className="flex gap-3">
            {row.map((key, ki) => (
              <button
                key={ki}
                type="button"
                onClick={() => pressKey(key)}
                disabled={loading || key === ''}
                aria-label={key === '⌫' ? 'Apagar último dígito' : key || undefined}
                className={[
                  'flex min-h-[72px] flex-1 items-center justify-center rounded-2xl text-2xl font-semibold transition-all',
                  key === ''
                    ? 'invisible pointer-events-none'
                    : key === '⌫'
                      ? 'border border-white/10 bg-white/[0.04] text-slate-400 active:scale-95 active:bg-white/10'
                      : 'border border-white/10 bg-white/[0.06] text-white active:scale-95 active:bg-sgp-gold/20 active:border-sgp-gold/40',
                  loading ? 'cursor-not-allowed opacity-40' : '',
                ].join(' ')}
              >
                {key === '⌫' ? (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
                    />
                  </svg>
                ) : (
                  key
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Voltar — só disponível no primeiro passo */}
      {step === 'new' ? (
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="text-sm text-slate-400 underline underline-offset-2 transition hover:text-slate-200 disabled:opacity-50"
        >
          ← Voltar à seleção
        </button>
      ) : (
        <button
          type="button"
          onClick={() => { setStep('new'); setConfirmPin(''); setError(null) }}
          disabled={loading}
          className="text-sm text-slate-400 underline underline-offset-2 transition hover:text-slate-200 disabled:opacity-50"
        >
          ← Redigitar novo PIN
        </button>
      )}
    </div>
  )
}
