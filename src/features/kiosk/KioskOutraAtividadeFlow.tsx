import { useCallback, useEffect, useRef, useState } from 'react'
import type { TimeEntryCandidateItem } from '../../domain/my-activities/my-activities.types'
import type { ProductionCollaboratorSummary } from '../../domain/production/production.types'
import {
  createProductionUnassignedTimeEntry,
  listProductionTimeEntryCandidates,
  PRODUCTION_TIME_ENTRY_CANDIDATES_ERROR_MESSAGE,
  PRODUCTION_TIME_ENTRY_ERROR_MESSAGE,
} from '../../services/production/productionApiService'
import { ApiError } from '../../lib/api/apiErrors'
import { JustificationSelect } from '../../components/operational/JustificationSelect'
import { emptyJustificationValue, type JustificationFieldValue } from '../shell/quickTimeEntryDrawerLogic'
import {
  buildKioskUnassignedTimeEntryPayload,
  candidateNeedsExceptionJustification,
  candidateNeedsOutOfSequenceJustification,
  canSubmitKioskOutraAtividadeForm,
  formatCandidateContextLine,
  isValidKioskOutraAtividadeMinutes,
  KIOSK_OUTRA_ATIVIDADE_SEARCH_MIN_CHARS,
  parseKioskMinutes,
} from './kioskOutraAtividadeFlowLogic'

const PRESETS = [15, 30, 45, 60] as const
const SEARCH_DEBOUNCE_MS = 300

type Step = 'search' | 'form' | 'review' | 'success'

type Props = {
  collaborator: ProductionCollaboratorSummary
  onClose: () => void
  onSuccess: () => void
}

export function KioskOutraAtividadeFlow({ collaborator, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TimeEntryCandidateItem[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [candidate, setCandidate] = useState<TimeEntryCandidateItem | null>(null)

  const [preset, setPreset] = useState<number | null>(null)
  const [minutesCustom, setMinutesCustom] = useState('')
  const [note, setNote] = useState('')
  const [exceptionJustification, setExceptionJustification] =
    useState<JustificationFieldValue>(emptyJustificationValue())
  const [exceptionUseFallback, setExceptionUseFallback] = useState(false)
  const [exceptionRequiresComplement, setExceptionRequiresComplement] = useState(false)
  const [oosJustification, setOosJustification] =
    useState<JustificationFieldValue>(emptyJustificationValue())
  const [oosUseFallback, setOosUseFallback] = useState(false)
  const [oosRequiresComplement, setOosRequiresComplement] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = query.trim()
    if (trimmed.length < KIOSK_OUTRA_ATIVIDADE_SEARCH_MIN_CHARS) {
      setResults([])
      setSearching(false)
      setSearchError(null)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(() => {
      listProductionTimeEntryCandidates({ q: trimmed, includeUnassigned: true, limit: 20 })
        .then((res) => {
          setResults(res.items)
          setSearchError(res.unavailableReason)
        })
        .catch((e) => {
          setResults([])
          setSearchError(
            e instanceof ApiError ? e.message : PRODUCTION_TIME_ENTRY_CANDIDATES_ERROR_MESSAGE,
          )
        })
        .finally(() => setSearching(false))
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  function selectCandidate(c: TimeEntryCandidateItem) {
    setCandidate(c)
    setPreset(null)
    setMinutesCustom('')
    setNote('')
    setExceptionJustification(emptyJustificationValue())
    setOosJustification(emptyJustificationValue())
    setError(null)
    setStep('form')
  }

  const minutes = preset !== null ? preset : parseKioskMinutes(minutesCustom)
  const minutesValid = isValidKioskOutraAtividadeMinutes(minutes)
  const needsException = candidate ? candidateNeedsExceptionJustification(candidate) : false
  const needsOos = candidate ? candidateNeedsOutOfSequenceJustification(candidate) : false

  const canGoToReview = canSubmitKioskOutraAtividadeForm({
    candidate,
    minutes,
    exceptionJustification: {
      value: exceptionJustification,
      useFallback: exceptionUseFallback,
      requiresComplement: exceptionRequiresComplement,
    },
    outOfSequenceJustification: {
      value: oosJustification,
      useFallback: oosUseFallback,
      requiresComplement: oosRequiresComplement,
    },
  })

  function selectPreset(p: number) {
    setPreset(p)
    setMinutesCustom(String(p))
  }

  function handleCustomInput(v: string) {
    setPreset(null)
    setMinutesCustom(v)
  }

  const doSubmit = useCallback(async () => {
    if (!candidate || !canGoToReview) return
    setSubmitting(true)
    setError(null)
    try {
      await createProductionUnassignedTimeEntry(
        buildKioskUnassignedTimeEntryPayload({
          candidate,
          minutes,
          note,
          exceptionJustification,
          outOfSequenceJustification: oosJustification,
        }),
      )
      setStep('success')
      setTimeout(() => {
        onSuccess()
      }, 2000)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : PRODUCTION_TIME_ENTRY_ERROR_MESSAGE)
      setStep('review')
    } finally {
      setSubmitting(false)
    }
  }, [candidate, canGoToReview, minutes, note, exceptionJustification, oosJustification, onSuccess])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Outra atividade"
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
            <h2 className="text-lg font-semibold text-white">Outra atividade</h2>
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
          ) : step === 'review' && candidate ? (
            <div className="flex flex-col gap-4">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 rounded-xl bg-white/5 px-4 py-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Colaborador</dt>
                  <dd className="font-medium text-slate-200">{collaborator.fullName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Atividade</dt>
                  <dd className="font-medium text-slate-200">{candidate.activityTitle}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Contexto</dt>
                  <dd className="font-medium text-slate-200">
                    {formatCandidateContextLine(candidate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Minutos</dt>
                  <dd className="font-medium text-slate-200">{minutes} min</dd>
                </div>
                {note.trim() ? (
                  <div>
                    <dt className="text-xs text-slate-500">Observação</dt>
                    <dd className="font-medium text-slate-200">{note.trim()}</dd>
                  </div>
                ) : null}
                {needsException && exceptionJustification.legacyText.trim() ? (
                  <div>
                    <dt className="text-xs text-slate-500">Justificativa (sem alocação)</dt>
                    <dd className="font-medium text-slate-200">
                      {exceptionJustification.legacyText.trim()}
                    </dd>
                  </div>
                ) : null}
                {needsOos && oosJustification.legacyText.trim() ? (
                  <div>
                    <dt className="text-xs text-slate-500">Justificativa (fora de sequência)</dt>
                    <dd className="font-medium text-slate-200">
                      {oosJustification.legacyText.trim()}
                    </dd>
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
          ) : step === 'form' && candidate ? (
            <div className="flex flex-col gap-6">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-sm font-semibold text-white">{candidate.activityTitle}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatCandidateContextLine(candidate)}
                </p>
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

              {needsOos ? (
                <JustificationSelect
                  channel="production"
                  idPrefix={`kiosk-outra-atividade-oos-${candidate.stepNodeId}`}
                  value={oosJustification.justificationId ?? ''}
                  complement={oosJustification.justificationComplement}
                  legacyText={oosJustification.legacyText}
                  required
                  disabled={submitting}
                  onCatalogStateChange={({ useFallback, selectedRequiresComplement }) => {
                    setOosUseFallback(useFallback)
                    setOosRequiresComplement(selectedRequiresComplement)
                  }}
                  onChange={(next) => {
                    setOosJustification({
                      justificationId: next.justificationId,
                      justificationComplement: next.justificationComplement,
                      legacyText: next.legacyText,
                    })
                    setError(null)
                  }}
                />
              ) : null}

              {needsException ? (
                <JustificationSelect
                  channel="production"
                  idPrefix={`kiosk-outra-atividade-exc-${candidate.stepNodeId}`}
                  value={exceptionJustification.justificationId ?? ''}
                  complement={exceptionJustification.justificationComplement}
                  legacyText={exceptionJustification.legacyText}
                  required
                  disabled={submitting}
                  onCatalogStateChange={({ useFallback, selectedRequiresComplement }) => {
                    setExceptionUseFallback(useFallback)
                    setExceptionRequiresComplement(selectedRequiresComplement)
                  }}
                  onChange={(next) => {
                    setExceptionJustification({
                      justificationId: next.justificationId,
                      justificationComplement: next.justificationComplement,
                      legacyText: next.legacyText,
                    })
                    setError(null)
                  }}
                />
              ) : null}

              <div>
                <label
                  htmlFor="kiosk-outra-atividade-note"
                  className="mb-1.5 block text-sm font-medium text-slate-300"
                >
                  Observação <span className="text-slate-500">(opcional)</span>
                </label>
                <textarea
                  id="kiosk-outra-atividade-note"
                  rows={2}
                  maxLength={2000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
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
                  onClick={() => setStep('search')}
                  className="sgp-cta-secondary min-h-12 flex-1 text-base"
                >
                  Voltar à busca
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="kiosk-outra-atividade-search"
                  className="mb-1.5 block text-sm font-medium text-slate-300"
                >
                  Buscar atividade
                </label>
                <input
                  id="kiosk-outra-atividade-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                  placeholder="Digite ao menos 2 caracteres…"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder-slate-600 focus:border-sgp-gold focus:outline-none focus:ring-1 focus:ring-sgp-gold"
                />
              </div>

              {searching ? (
                <p className="text-sm text-slate-400">Buscando…</p>
              ) : query.trim().length < KIOSK_OUTRA_ATIVIDADE_SEARCH_MIN_CHARS ? (
                <p className="text-sm text-slate-500">
                  Digite pelo menos {KIOSK_OUTRA_ATIVIDADE_SEARCH_MIN_CHARS} caracteres para
                  buscar.
                </p>
              ) : searchError ? (
                <p role="alert" className="text-sm text-red-400">
                  {searchError}
                </p>
              ) : results.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma atividade encontrada.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {results.map((c) => (
                    <li key={`${c.conveyorId}-${c.stepNodeId}`}>
                      <button
                        type="button"
                        onClick={() => selectCandidate(c)}
                        className="min-h-14 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:border-sgp-gold/40 active:scale-[0.99]"
                      >
                        <p className="text-sm font-semibold text-white">{c.activityTitle}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {formatCandidateContextLine(c)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={onClose}
                className="sgp-cta-secondary min-h-12 w-full text-base"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
