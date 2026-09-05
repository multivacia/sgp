import { useCallback, useEffect, useState } from 'react'
import type {
  ExtraTimeEntryDescriptionOption,
  ExtraTimeEntryItem,
} from '../../domain/my-activities/extraTimeEntries.types'
import { ApiError } from '../../lib/api/apiErrors'
import { formatHumanMinutes } from '../../lib/formatters'
import {
  createProductionExtraTimeEntry,
  listProductionExtraTimeEntries,
  listProductionExtraTimeEntryDescriptions,
  PRODUCTION_EXTRA_TIME_ENTRY_ERROR_MESSAGE,
} from '../../services/production/productionApiService'
import {
  NOTES_MAX_LENGTH,
  todayIsoDate,
  validateKioskExtraActivityForm,
} from './kioskExtraActivityModalLogic'

type Props = {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function KioskExtraActivityModal({ open, onClose, onSuccess }: Props) {
  const [descriptions, setDescriptions] = useState<ExtraTimeEntryDescriptionOption[]>([])
  const [descriptionsLoading, setDescriptionsLoading] = useState(false)
  const [descriptionsError, setDescriptionsError] = useState<string | null>(null)

  const [history, setHistory] = useState<ExtraTimeEntryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const [descriptionId, setDescriptionId] = useState('')
  const [entryDate, setEntryDate] = useState(todayIsoDate())
  const [minutesStr, setMinutesStr] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setDescriptions([])
    setDescriptionsLoading(false)
    setDescriptionsError(null)
    setHistory([])
    setHistoryLoading(false)
    setHistoryError(null)
    setDescriptionId('')
    setEntryDate(todayIsoDate())
    setMinutesStr('')
    setNotes('')
    setSubmitting(false)
    setSubmitError(null)
  }, [])

  const loadDescriptions = useCallback(async () => {
    setDescriptionsLoading(true)
    setDescriptionsError(null)
    try {
      const rows = await listProductionExtraTimeEntryDescriptions()
      setDescriptions(rows)
    } catch (e) {
      setDescriptionsError(
        e instanceof ApiError ? e.message : 'Não foi possível carregar as opções.',
      )
      setDescriptions([])
    } finally {
      setDescriptionsLoading(false)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const items = await listProductionExtraTimeEntries({ limit: 5 })
      setHistory(items)
    } catch (e) {
      setHistoryError(
        e instanceof ApiError ? e.message : 'Não foi possível carregar o histórico.',
      )
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  // Reinicia todo o estado (formulário + histórico) sempre que o modal muda de
  // estado aberto/fechado — nunca deve reter dado de abertura anterior nem
  // sobreviver a logout/troca de colaborador no mesmo tablet.
  useEffect(() => {
    resetForm()
    if (open) {
      void loadDescriptions()
      void loadHistory()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const validationError = validateKioskExtraActivityForm({
    descriptionId,
    entryDate,
    minutesStr,
    notes,
  })
  const canSubmit = !validationError && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    const err = validateKioskExtraActivityForm({ descriptionId, entryDate, minutesStr, notes })
    if (err) {
      setSubmitError(err)
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await createProductionExtraTimeEntry({
        descriptionId,
        entryDate,
        minutes: Number.parseInt(minutesStr, 10),
        notes: notes.trim() || undefined,
      })
      onClose()
      onSuccess?.()
    } catch (e2) {
      setSubmitError(
        e2 instanceof ApiError ? e2.message : PRODUCTION_EXTRA_TIME_ENTRY_ERROR_MESSAGE,
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kiosk-extra-activity-title"
      onClick={() => {
        if (!submitting) onClose()
      }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-sgp-navy to-sgp-void shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sgp-gold">
              Apontamento
            </p>
            <h2
              id="kiosk-extra-activity-title"
              className="mt-1 font-heading text-lg font-bold text-white"
            >
              Atividade extra esteira
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100 disabled:opacity-50"
          >
            Fechar
          </button>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
        >
          <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Tipo de atividade
            <select
              value={descriptionId}
              onChange={(e) => {
                setDescriptionId(e.target.value)
                setSubmitError(null)
              }}
              disabled={submitting || descriptionsLoading || descriptions.length === 0}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-sgp-gold/25"
            >
              <option value="" disabled>
                Selecione um tipo...
              </option>
              {descriptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.description}
                </option>
              ))}
            </select>
          </label>
          {descriptionsLoading ? (
            <p className="mt-1.5 text-xs text-slate-500">Carregando opções…</p>
          ) : null}
          {descriptionsError ? (
            <p role="alert" className="mt-1.5 text-xs text-rose-300">
              {descriptionsError}
            </p>
          ) : null}
          {!descriptionsLoading && !descriptionsError && descriptions.length === 0 ? (
            <p className="mt-1.5 text-xs text-slate-500">
              Não há opções ativas configuradas.
            </p>
          ) : null}

          <label className="mt-4 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Data
            <input
              type="date"
              value={entryDate}
              max={todayIsoDate()}
              onChange={(e) => {
                setEntryDate(e.target.value)
                setSubmitError(null)
              }}
              disabled={submitting}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-sgp-gold/25"
            />
          </label>

          <label className="mt-4 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Tempo (minutos)
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={minutesStr}
              onChange={(e) => {
                setMinutesStr(e.target.value)
                setSubmitError(null)
              }}
              disabled={submitting}
              placeholder="Ex.: 30"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white tabular-nums placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-sgp-gold/25"
            />
          </label>

          <label className="mt-4 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Observação (opcional)
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
                setSubmitError(null)
              }}
              disabled={submitting}
              rows={3}
              maxLength={NOTES_MAX_LENGTH}
              placeholder="Notas sobre a atividade…"
              className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-sgp-gold/25"
            />
          </label>

          {submitError ? (
            <p role="alert" className="mt-3 text-sm text-rose-200">
              {submitError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="sgp-cta-primary mt-5 min-h-12 w-full text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Registrando…' : 'Registrar apontamento'}
          </button>

          <div className="mt-6 border-t border-white/[0.06] pt-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Últimos apontamentos
            </p>
            {historyLoading ? (
              <p className="mt-2 text-sm text-slate-500">Carregando…</p>
            ) : historyError ? (
              <p role="alert" className="mt-2 text-sm text-rose-300">
                {historyError}
              </p>
            ) : history.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Sem apontamentos recentes.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {history.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-slate-100">{item.description}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.entryDate} · {formatHumanMinutes(item.minutes)}
                    </p>
                    {item.notes ? (
                      <p className="mt-1 text-xs text-slate-500">{item.notes}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
