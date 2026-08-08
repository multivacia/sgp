import { useEffect, useState } from 'react'
import type { ProductionCollaboratorSummary } from '../../domain/production/production.types'
import type { ExtraTimeEntryDescriptionOption } from '../../domain/my-activities/extraTimeEntries.types'
import { ApiError } from '../../lib/api/apiErrors'
import {
  createProductionExtraTimeEntry,
  listProductionExtraTimeEntryDescriptions,
} from '../../services/production/productionApiService'
import { ProductionCollaboratorAvatar } from '../production/ProductionCollaboratorAvatar'

type Phase = 'form' | 'confirm' | 'success'

type Props = {
  collaborator: ProductionCollaboratorSummary
  onClose: () => void
}

const MINUTE_PRESETS = [15, 30, 45, 60] as const

export function KioskExtraEsteiraFlow({ collaborator, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('form')
  const [descriptions, setDescriptions] = useState<
    ExtraTimeEntryDescriptionOption[]
  >([])
  const [descriptionId, setDescriptionId] = useState('')
  const [minutesInput, setMinutesInput] = useState('30')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function loadDescriptions() {
      try {
        const items = await listProductionExtraTimeEntryDescriptions()
        if (!active) return
        setDescriptions(items)
      } catch (e) {
        if (!active) return
        setError(
          e instanceof ApiError
            ? e.message
            : 'Não foi possível carregar as descrições de extra esteira.',
        )
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadDescriptions()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (phase !== 'success') return
    const timer = window.setTimeout(onClose, 3000)
    return () => window.clearTimeout(timer)
  }, [phase, onClose])

  const minutes = Number.parseInt(minutesInput, 10)
  const minutesValid = Number.isInteger(minutes) && minutes >= 1
  const selectedDescription =
    descriptions.find((item) => item.id === descriptionId) ?? null

  function goToConfirmation() {
    if (!descriptionId) {
      setError('Selecione uma descrição.')
      return
    }
    if (!minutesValid) {
      setError('Informe minutos válidos (maior que zero).')
      return
    }
    setError(null)
    setPhase('confirm')
  }

  async function submit() {
    if (
      submitting ||
      !selectedDescription ||
      !minutesValid
    ) {
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await createProductionExtraTimeEntry({
        descriptionId: selectedDescription.id,
        minutes,
        notes: notes.trim() || undefined,
      })
      setPhase('success')
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Não foi possível registrar o apontamento em extra esteira.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-sgp-void"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kiosk-extra-title"
    >
      {phase === 'success' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 py-16 text-center">
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
            <p className="text-xl font-semibold text-white">
              Apontamento registrado!
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Voltando para suas atividades…
            </p>
          </div>
        </div>
      ) : (
        <>
          <header className="shrink-0 border-b border-white/[0.08] px-5 py-4">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <ProductionCollaboratorAvatar
                  collaborator={collaborator}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-400">
                    {collaborator.fullName}
                  </p>
                  <h2
                    id="kiosk-extra-title"
                    className="font-heading text-lg font-bold text-white"
                  >
                    Apontamento em extra esteira
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="sgp-cta-secondary min-h-12 px-5 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
            <div className="mx-auto max-w-3xl">
              <div className="rounded-2xl border border-amber-400/35 bg-amber-500/10 px-5 py-4 text-amber-100">
                <p className="font-semibold">
                  Você está apontando horas em extra esteira.
                </p>
              </div>

              {phase === 'form' ? (
                <div className="mt-6 space-y-6">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Descrição
                    <select
                      value={descriptionId}
                      onChange={(event) => {
                        setDescriptionId(event.target.value)
                        setError(null)
                      }}
                      disabled={loading || submitting}
                      className="sgp-input-app mt-2 min-h-14 w-full rounded-xl border border-white/10 bg-sgp-navy-deep px-4 text-base text-white"
                    >
                      <option value="">
                        {loading
                          ? 'Carregando descrições…'
                          : 'Selecione uma descrição...'}
                      </option>
                      {descriptions.map((description) => (
                        <option key={description.id} value={description.id}>
                          {description.description}
                        </option>
                      ))}
                    </select>
                  </label>

                  {!loading && descriptions.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      Não há descrições ativas configuradas.
                    </p>
                  ) : null}

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Tempo trabalhado
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {MINUTE_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setMinutesInput(String(preset))
                            setError(null)
                          }}
                          disabled={submitting}
                          className={[
                            'min-h-14 min-w-20 rounded-xl border px-4 text-base font-bold',
                            minutesInput === String(preset)
                              ? 'border-sgp-gold bg-sgp-gold/15 text-sgp-gold'
                              : 'border-white/10 bg-white/[0.04] text-slate-300',
                          ].join(' ')}
                        >
                          {preset} min
                        </button>
                      ))}
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={minutesInput}
                        onChange={(event) => {
                          setMinutesInput(event.target.value)
                          setError(null)
                        }}
                        disabled={submitting}
                        aria-label="Minutos trabalhados"
                        className="sgp-input-app min-h-14 w-28 rounded-xl border border-white/10 bg-sgp-navy-deep px-4 text-base text-white"
                      />
                    </div>
                  </div>

                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Observação (opcional)
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      disabled={submitting}
                      maxLength={500}
                      rows={3}
                      className="sgp-input-app mt-2 w-full resize-none rounded-xl border border-white/10 bg-sgp-navy-deep px-4 py-3 text-base text-white"
                    />
                  </label>

                  {error ? (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                    >
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={goToConfirmation}
                    disabled={
                      loading ||
                      submitting ||
                      !descriptionId ||
                      !minutesValid
                    }
                    className="sgp-cta-primary min-h-14 w-full text-base disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Revisar apontamento
                  </button>
                </div>
              ) : (
                <div className="mt-6">
                  <h3 className="font-heading text-xl font-bold text-white">
                    Confirme os dados
                  </h3>
                  <dl className="mt-4 divide-y divide-white/[0.08] rounded-2xl border border-white/10 bg-white/[0.03] px-5">
                    <div className="py-4">
                      <dt className="text-xs uppercase tracking-wider text-slate-500">
                        Colaborador
                      </dt>
                      <dd className="mt-1 font-semibold text-white">
                        {collaborator.fullName}
                      </dd>
                    </div>
                    <div className="py-4">
                      <dt className="text-xs uppercase tracking-wider text-slate-500">
                        Tipo
                      </dt>
                      <dd className="mt-1 font-semibold text-amber-200">
                        Extra esteira
                      </dd>
                    </div>
                    <div className="py-4">
                      <dt className="text-xs uppercase tracking-wider text-slate-500">
                        Descrição
                      </dt>
                      <dd className="mt-1 text-white">
                        {selectedDescription?.description}
                      </dd>
                    </div>
                    <div className="py-4">
                      <dt className="text-xs uppercase tracking-wider text-slate-500">
                        Tempo
                      </dt>
                      <dd className="mt-1 text-white">{minutes} minutos</dd>
                    </div>
                    {notes.trim() ? (
                      <div className="py-4">
                        <dt className="text-xs uppercase tracking-wider text-slate-500">
                          Observação
                        </dt>
                        <dd className="mt-1 whitespace-pre-wrap text-white">
                          {notes.trim()}
                        </dd>
                      </div>
                    ) : null}
                  </dl>

                  {error ? (
                    <p
                      role="alert"
                      className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                    >
                      {error}
                    </p>
                  ) : null}

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null)
                        setPhase('form')
                      }}
                      disabled={submitting}
                      className="sgp-cta-secondary min-h-14 text-base disabled:opacity-50"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => void submit()}
                      disabled={submitting}
                      className="sgp-cta-primary min-h-14 text-base disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting
                        ? 'Registrando…'
                        : 'Confirmar apontamento em extra esteira'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </>
      )}
    </div>
  )
}
