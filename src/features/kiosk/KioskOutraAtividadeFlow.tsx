import { useEffect, useState } from 'react'
import type { ProductionCollaboratorSummary } from '../../domain/production/production.types'
import type { TimeEntryCandidateItem } from '../../domain/my-activities/my-activities.types'
import { ApiError } from '../../lib/api/apiErrors'
import {
  createProductionUnassignedTimeEntry,
  listProductionTimeEntryCandidates,
} from '../../services/production/productionApiService'
import {
  JustificationSelect,
  validateJustificationSelectValue,
} from '../../components/operational/JustificationSelect'
import {
  buildTimeEntryPayload,
  candidateNeedsOutOfSequenceJustification,
  emptyJustificationValue,
  type JustificationFieldValue,
} from '../shell/quickTimeEntryDrawerLogic'
import { ProductionCollaboratorAvatar } from '../production/ProductionCollaboratorAvatar'

type Phase = 'form' | 'confirm' | 'success'

type Props = {
  collaborator: ProductionCollaboratorSummary
  onClose: () => void
}

const SEARCH_DEBOUNCE_MS = 300
const MINUTE_PRESETS = [15, 30, 45, 60] as const

function candidateCode(candidate: TimeEntryCandidateItem): string {
  return candidate.conveyorCode?.trim() || 'Sem código'
}

export function KioskOutraAtividadeFlow({ collaborator, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('form')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<TimeEntryCandidateItem[]>([])
  const [selected, setSelected] = useState<TimeEntryCandidateItem | null>(null)
  const [minutesInput, setMinutesInput] = useState('30')
  const [justification, setJustification] = useState<JustificationFieldValue>(
    emptyJustificationValue(),
  )
  const [justificationUseFallback, setJustificationUseFallback] = useState(false)
  const [justificationRequiresComplement, setJustificationRequiresComplement] =
    useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const query = search.trim()
    if (query.length < 2) {
      setResults([])
      setLoading(false)
      setSearchError(null)
      return
    }

    let active = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      setSearchError(null)
      void listProductionTimeEntryCandidates({
        q: query,
        limit: 50,
        includeUnassigned: true,
      })
        .then((items) => {
          if (!active) return
          setResults(items.filter((item) => item.isAssignedToMe === false))
        })
        .catch((requestError: unknown) => {
          if (!active) return
          setResults([])
          setSearchError(
            requestError instanceof ApiError
              ? requestError.message
              : 'Não foi possível buscar outras atividades.',
          )
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [search])

  useEffect(() => {
    if (phase !== 'success') return
    const timer = window.setTimeout(onClose, 3000)
    return () => window.clearTimeout(timer)
  }, [phase, onClose])

  const minutes = Number.parseInt(minutesInput, 10)
  const minutesValid = Number.isInteger(minutes) && minutes >= 1

  function resetSelection() {
    setSelected(null)
    setSearch('')
    setResults([])
    setMinutesInput('30')
    setJustification(emptyJustificationValue())
    setJustificationUseFallback(false)
    setJustificationRequiresComplement(false)
    setError(null)
    setPhase('form')
  }

  function selectCandidate(candidate: TimeEntryCandidateItem) {
    setSelected(candidate)
    setSearch('')
    setResults([])
    setMinutesInput('30')
    setJustification(emptyJustificationValue())
    setJustificationUseFallback(false)
    setJustificationRequiresComplement(false)
    setError(null)
  }

  function validateForm(): string | null {
    if (!selected) return 'Selecione uma atividade.'
    if (!minutesValid) return 'Informe minutos válidos (maior que zero).'
    return validateJustificationSelectValue({
      useFallback: justificationUseFallback,
      justificationId: justification.justificationId,
      legacyText: justification.legacyText,
      requiresComplement: justificationRequiresComplement,
      complement: justification.justificationComplement,
    })
  }

  function goToConfirmation() {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setPhase('confirm')
  }

  async function submit() {
    if (!selected || submitting) return
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      setPhase('form')
      return
    }

    const payload = buildTimeEntryPayload({
      candidate: selected,
      minutes,
      executedQuantity: 0,
      description: '',
      operationalJustification: justification,
      markAsDone: false,
    })

    setSubmitting(true)
    setError(null)
    try {
      await createProductionUnassignedTimeEntry({
        conveyorId: selected.conveyorId,
        stepNodeId: selected.stepNodeId,
        minutes,
        exceptionJustification: payload.exceptionJustification,
        exceptionJustificationId: payload.exceptionJustificationId,
        exceptionJustificationComplement:
          payload.exceptionJustificationComplement,
        outOfSequenceJustification: payload.outOfSequenceJustification,
        outOfSequenceJustificationId: payload.outOfSequenceJustificationId,
        outOfSequenceJustificationComplement:
          payload.outOfSequenceJustificationComplement,
      })
      setPhase('success')
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'Não foi possível registrar o apontamento em outra atividade.',
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
      aria-labelledby="kiosk-other-activity-title"
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
                    id="kiosk-other-activity-title"
                    className="font-heading text-lg font-bold text-white"
                  >
                    Atividade em que não estou alocado
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
                  Você está apontando horas em uma atividade pela qual não é
                  responsável.
                </p>
              </div>

              {phase === 'form' ? (
                <div className="mt-6 space-y-6">
                  {!selected ? (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Buscar atividade por nome ou código
                        <input
                          type="search"
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Digite pelo menos 2 caracteres"
                          autoComplete="off"
                          className="sgp-input-app mt-2 min-h-14 w-full rounded-xl border border-white/10 bg-sgp-navy-deep px-4 text-base text-white"
                        />
                      </label>

                      {search.trim().length > 0 &&
                      search.trim().length < 2 ? (
                        <p className="mt-2 text-sm text-slate-500">
                          Digite pelo menos 2 caracteres para buscar.
                        </p>
                      ) : null}
                      {loading ? (
                        <p className="mt-3 text-sm text-slate-400">
                          Buscando atividades…
                        </p>
                      ) : null}
                      {searchError ? (
                        <p
                          role="alert"
                          className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                        >
                          {searchError}
                        </p>
                      ) : null}
                      {!loading &&
                      !searchError &&
                      search.trim().length >= 2 &&
                      results.length === 0 ? (
                        <p className="mt-3 text-sm text-slate-400">
                          Nenhuma atividade fora da sua alocação foi encontrada.
                        </p>
                      ) : null}
                      {results.length > 0 ? (
                        <ul className="mt-4 space-y-3">
                          {results.map((candidate) => (
                            <li
                              key={`${candidate.conveyorId}-${candidate.stepNodeId}`}
                            >
                              <button
                                type="button"
                                onClick={() => selectCandidate(candidate)}
                                className="min-h-20 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition active:scale-[0.99]"
                              >
                                <span className="text-xs font-bold uppercase tracking-wider text-sgp-gold">
                                  {candidateCode(candidate)}
                                </span>
                                <span className="mt-1 block text-base font-semibold text-white">
                                  {candidate.stepName}
                                </span>
                                <span className="mt-1 block text-sm text-slate-400">
                                  {candidate.conveyorName} ·{' '}
                                  {candidate.areaName}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <div className="rounded-2xl border border-sgp-gold/35 bg-sgp-gold/[0.07] p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-sgp-gold">
                              {candidateCode(selected)}
                            </p>
                            <p className="mt-1 text-lg font-semibold text-white">
                              {selected.stepName}
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                              {selected.conveyorName} · {selected.areaName}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={resetSelection}
                            disabled={submitting}
                            className="min-h-11 shrink-0 rounded-xl border border-white/15 px-4 text-sm font-semibold text-slate-300"
                          >
                            Trocar
                          </button>
                        </div>
                      </div>

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

                      <JustificationSelect
                        channel="production"
                        idPrefix="kiosk-other-activity"
                        value={justification.justificationId ?? ''}
                        complement={justification.justificationComplement}
                        legacyText={justification.legacyText}
                        required
                        placeholder="Selecione uma justificativa..."
                        disabled={submitting}
                        onCatalogStateChange={({
                          useFallback,
                          selectedRequiresComplement,
                        }) => {
                          setJustificationUseFallback(useFallback)
                          setJustificationRequiresComplement(
                            selectedRequiresComplement,
                          )
                        }}
                        onChange={(next) => {
                          setJustification({
                            justificationId: next.justificationId,
                            justificationComplement:
                              next.justificationComplement,
                            legacyText: next.legacyText,
                          })
                          setError(null)
                        }}
                      />

                      {candidateNeedsOutOfSequenceJustification(selected) ? (
                        <p className="rounded-xl border border-sky-400/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                          Esta atividade está fora da sequência. A mesma
                          justificativa será usada para registrar a exceção de
                          sequência.
                        </p>
                      ) : null}

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
                        disabled={submitting || !minutesValid}
                        className="sgp-cta-primary min-h-14 w-full text-base disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Revisar apontamento
                      </button>
                    </>
                  )}
                </div>
              ) : selected ? (
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
                        Atividade em que não está alocado
                      </dd>
                    </div>
                    <div className="py-4">
                      <dt className="text-xs uppercase tracking-wider text-slate-500">
                        Atividade
                      </dt>
                      <dd className="mt-1 text-white">
                        {candidateCode(selected)} · {selected.stepName}
                      </dd>
                      <dd className="mt-1 text-sm text-slate-400">
                        {selected.conveyorName} · {selected.areaName}
                      </dd>
                    </div>
                    <div className="py-4">
                      <dt className="text-xs uppercase tracking-wider text-slate-500">
                        Tempo
                      </dt>
                      <dd className="mt-1 text-white">{minutes} minutos</dd>
                    </div>
                    <div className="py-4">
                      <dt className="text-xs uppercase tracking-wider text-slate-500">
                        Justificativa
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap text-white">
                        {justification.legacyText}
                      </dd>
                    </div>
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
                        : 'Confirmar apontamento em outra atividade'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </main>
        </>
      )}
    </div>
  )
}
