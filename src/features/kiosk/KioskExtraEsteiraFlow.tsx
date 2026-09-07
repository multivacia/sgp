import { useCallback, useEffect, useState } from 'react'
import type {
  ProductionCollaboratorSummary,
  ProductionExtraTimeEntryDescriptionOption,
} from '../../domain/production/production.types'
import {
  createProductionExtraTimeEntry,
  listProductionExtraTimeEntryDescriptions,
  PRODUCTION_EXTRA_TIME_ENTRY_ERROR_MESSAGE,
} from '../../services/production/productionApiService'
import { ApiError } from '../../lib/api/apiErrors'
import {
  buildKioskExtraEsteiraPayload,
  canSubmitKioskExtraEsteiraForm,
  isValidKioskExtraEsteiraMinutes,
  KIOSK_EXTRA_ESTEIRA_DESCRIPTION_PLACEHOLDER,
  KIOSK_EXTRA_ESTEIRA_NOTES_MAX,
  parseKioskMinutes,
} from './kioskExtraEsteiraFlowLogic'

const PRESETS = [15, 30, 45, 60] as const

type Step = 'form' | 'review' | 'success'

type Props = {
  collaborator: ProductionCollaboratorSummary
  onClose: () => void
  onSuccess: () => void
}

export function KioskExtraEsteiraFlow({ collaborator, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('form')
  const [descriptions, setDescriptions] = useState<ProductionExtraTimeEntryDescriptionOption[]>(
    [],
  )
  const [loadingDescriptions, setLoadingDescriptions] = useState(true)
  const [descriptionId, setDescriptionId] = useState('')
  const [preset, setPreset] = useState<number | null>(null)
  const [minutesCustom, setMinutesCustom] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadingDescriptions(true)
    listProductionExtraTimeEntryDescriptions()
      .then((rows) => {
        if (!cancelled) setDescriptions(rows)
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar as descrições.')
      })
      .finally(() => {
        if (!cancelled) setLoadingDescriptions(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const minutes = preset !== null ? preset : parseKioskMinutes(minutesCustom)
  const minutesValid = isValidKioskExtraEsteiraMinutes(minutes)
  const canGoToReview = canSubmitKioskExtraEsteiraForm({ descriptionId, minutes })
  const selectedDescription = descriptions.find((d) => d.id === descriptionId) ?? null

  function selectPreset(p: number) {
    setPreset(p)
    setMinutesCustom(String(p))
  }

  function handleCustomInput(v: string) {
    setPreset(null)
    setMinutesCustom(v)
  }

  const doSubmit = useCallback(async () => {
    if (!canGoToReview) return
    setSubmitting(true)
    setError(null)
    try {
      await createProductionExtraTimeEntry(
        buildKioskExtraEsteiraPayload({ descriptionId, minutes, notes }),
      )
      setStep('success')
      setTimeout(() => {
        onSuccess()
      }, 2000)
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : PRODUCTION_EXTRA_TIME_ENTRY_ERROR_MESSAGE,
      )
      setStep('review')
    } finally {
      setSubmitting(false)
    }
  }, [canGoToReview, descriptionId, minutes, notes, onSuccess])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Extra esteira"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={submitting ? undefined : onClose}
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-sgp-night shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white">Extra esteira</h2>
            <p className="mt-0.5 truncate text-sm text-slate-400">{collaborator.fullName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Fechar"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {step === 'success' ? (
            <div className="flex flex-col items-center justify-center gap-6 py-10 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <svg
                  className="h-10 w-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xl font-semibold text-white">Apontamento registrado!</p>
                <p className="mt-1 text-sm text-slate-400">Voltando ao Kiosk…</p>
              </div>
            </div>
          ) : step === 'review' ? (
            <div className="flex flex-col gap-4">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 rounded-xl bg-white/5 px-4 py-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Colaborador</dt>
                  <dd className="font-medium text-slate-200">{collaborator.fullName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Tipo</dt>
                  <dd className="font-medium text-slate-200">Extra esteira</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Descrição</dt>
                  <dd className="font-medium text-slate-200">
                    {selectedDescription?.description ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Minutos</dt>
                  <dd className="font-medium text-slate-200">{minutes} min</dd>
                </div>
                {notes.trim() ? (
                  <div>
                    <dt className="text-xs text-slate-500">Observação</dt>
                    <dd className="font-medium text-slate-200">{notes.trim()}</dd>
                  </div>
                ) : null}
              </dl>

              {error ? (
                <p
                  role="alert"
                  className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                >
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => void doSubmit()}
                  disabled={submitting}
                  className="sgp-cta-primary min-h-12 flex-1 text-base disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Registrando…' : 'Confirmar apontamento'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  disabled={submitting}
                  className="sgp-cta-secondary min-h-12 flex-1 text-base disabled:opacity-50"
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div>
                <label
                  htmlFor="kiosk-extra-esteira-description"
                  className="mb-1.5 block text-sm font-medium text-slate-300"
                >
                  Descrição
                  <span className="ml-1 text-red-400" aria-hidden="true">
                    *
                  </span>
                </label>
                <select
                  id="kiosk-extra-esteira-description"
                  value={descriptionId}
                  onChange={(e) => setDescriptionId(e.target.value)}
                  disabled={loadingDescriptions}
                  className="sgp-input-app w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white focus:border-sgp-gold focus:outline-none focus:ring-1 focus:ring-sgp-gold disabled:opacity-50"
                >
                  <option value="">{KIOSK_EXTRA_ESTEIRA_DESCRIPTION_PLACEHOLDER}</option>
                  {descriptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Minutos
                </p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => selectPreset(p)}
                      className={[
                        'min-h-12 rounded-xl border px-4 text-sm font-semibold transition-all',
                        preset === p
                          ? 'border-sgp-gold bg-sgp-gold/15 text-sgp-gold'
                          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/25 active:scale-95',
                      ].join(' ')}
                    >
                      {p} min
                    </button>
                  ))}
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={minutesCustom}
                    onChange={(e) => handleCustomInput(e.target.value)}
                    placeholder="outro"
                    className={[
                      'min-h-12 w-24 rounded-xl border px-3 text-sm text-white tabular-nums placeholder:text-slate-600 focus:outline-none focus:ring-2',
                      preset === null && minutesCustom
                        ? 'border-sgp-gold bg-sgp-gold/10 focus:ring-sgp-gold/30'
                        : 'border-white/10 bg-white/[0.04] focus:ring-white/10',
                    ].join(' ')}
                  />
                </div>
                {minutesCustom && !minutesValid ? (
                  <p className="mt-1.5 text-xs text-red-400">
                    Informe um número inteiro maior que zero.
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="kiosk-extra-esteira-notes"
                  className="mb-1.5 block text-sm font-medium text-slate-300"
                >
                  Observação <span className="text-slate-500">(opcional)</span>
                </label>
                <textarea
                  id="kiosk-extra-esteira-notes"
                  rows={2}
                  maxLength={KIOSK_EXTRA_ESTEIRA_NOTES_MAX}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observação sobre o apontamento..."
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder-slate-600 focus:border-sgp-gold focus:outline-none focus:ring-1 focus:ring-sgp-gold"
                />
              </div>

              {error ? (
                <p
                  role="alert"
                  className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                >
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setStep('review')
                  }}
                  disabled={!canGoToReview}
                  className="sgp-cta-primary min-h-12 flex-1 text-base disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continuar
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="sgp-cta-secondary min-h-12 flex-1 text-base"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
