import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../lib/api/apiErrors'
import type { ProductionWorkQueueItem } from '../../domain/production/production.types'
import { formatProductionDate, formatProductionMinutes } from '../../domain/production/production.helpers'
import {
  createProductionTimeEntry,
  PRODUCTION_TIME_ENTRY_ERROR_MESSAGE,
} from '../../services/production/productionApiService'
import { JustificationSelect } from '../../components/operational/JustificationSelect'
import {
  emptyJustificationValue,
  type JustificationFieldValue,
} from '../shell/quickTimeEntryDrawerLogic'
import {
  buildProductionTimeEntryJustificationPayload,
  productionTimeEntryNeedsJustification,
  productionTimeEntryPreferredCategory,
  validateProductionTimeEntryJustification,
} from './productionTimeEntryDialogLogic'

type DialogState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'error'; message: string }
  | { status: 'success' }

type Props = {
  item: ProductionWorkQueueItem
  onClose: () => void
  onSuccess: () => void
}

export function ProductionTimeEntryDialog({ item, onClose, onSuccess }: Props) {
  const [minutes, setMinutes] = useState('')
  const [executedQuantity, setExecutedQuantity] = useState('1')
  const [note, setNote] = useState('')
  const [justification, setJustification] =
    useState<JustificationFieldValue>(emptyJustificationValue())
  const [justificationRequiresComplement, setJustificationRequiresComplement] = useState(false)
  const [justificationUseFallback, setJustificationUseFallback] = useState(false)
  const [state, setState] = useState<DialogState>({ status: 'idle' })
  const minutesRef = useRef<HTMLInputElement>(null)

  const needsJustification = productionTimeEntryNeedsJustification(item)
  const preferredCategory = productionTimeEntryPreferredCategory(item)

  useEffect(() => {
    minutesRef.current?.focus()
  }, [])

  useEffect(() => {
    setJustification(emptyJustificationValue())
  }, [item.workPlanItemId])

  const minutesValue = parseInt(minutes, 10)
  const isMinutesValid = Number.isInteger(minutesValue) && minutesValue > 0
  const executedQuantityValue = parseInt(executedQuantity, 10)
  const isExecutedQuantityValid =
    Number.isInteger(executedQuantityValue) && executedQuantityValue >= 0

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!isMinutesValid || !isExecutedQuantityValid) return

      const justificationError = validateProductionTimeEntryJustification({
        item,
        justification,
        useFallback: justificationUseFallback,
        requiresComplement: justificationRequiresComplement,
      })
      if (justificationError) {
        setState({ status: 'error', message: justificationError })
        return
      }

      setState({ status: 'submitting' })
      try {
        await createProductionTimeEntry({
          conveyorId: item.conveyorId,
          stepNodeId: item.activityNodeId,
          minutes: minutesValue,
          executedQuantity: executedQuantityValue,
          note: note.trim() || null,
          ...buildProductionTimeEntryJustificationPayload(item, justification),
        })
        setState({ status: 'success' })
        onSuccess()
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : PRODUCTION_TIME_ENTRY_ERROR_MESSAGE
        setState({ status: 'error', message: msg })
      }
    },
    [
      isMinutesValid,
      isExecutedQuantityValid,
      minutesValue,
      note,
      item,
      onSuccess,
      executedQuantityValue,
      justification,
      justificationUseFallback,
      justificationRequiresComplement,
    ],
  )

  const isSubmitting = state.status === 'submitting'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Registrar apontamento"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg rounded-t-3xl border border-white/10 bg-sgp-night px-5 py-6 shadow-2xl sm:rounded-2xl sm:px-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white">Registrar apontamento</h2>
            <p className="mt-0.5 truncate text-sm text-slate-400">{item.activityTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Fechar"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <dl className="mb-5 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-white/5 px-4 py-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">Esteira/OS</dt>
            <dd className="truncate font-medium text-slate-200">{item.conveyorTitle}</dd>
          </div>
          {item.taskTitle && (
            <div>
              <dt className="text-xs text-slate-500">Tarefa</dt>
              <dd className="truncate font-medium text-slate-200">{item.taskTitle}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-slate-500">Data planejada</dt>
            <dd className="font-medium text-slate-200">{formatProductionDate(item.plannedDate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Planejado</dt>
            <dd className="font-medium text-slate-200">{formatProductionMinutes(item.plannedMinutes)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Apontado</dt>
            <dd className="font-medium text-slate-200">{formatProductionMinutes(item.realizedMinutes) || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Pendente</dt>
            <dd className="font-medium text-slate-200">{formatProductionMinutes(item.pendingMinutes) || '—'}</dd>
          </div>
        </dl>

        <form onSubmit={(e) => void handleSubmit(e)} noValidate>
          <div className="mb-4">
            <label htmlFor="production-time-entry-minutes" className="mb-1.5 block text-sm font-medium text-slate-300">
              Tempo apontado (minutos)
              <span className="ml-1 text-red-400" aria-hidden="true">*</span>
            </label>
            <input
              ref={minutesRef}
              id="production-time-entry-minutes"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={minutes}
              onChange={(e) => {
                setState({ status: 'idle' })
                setMinutes(e.target.value)
              }}
              disabled={isSubmitting}
              placeholder="Ex.: 60"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder-slate-600 focus:border-sgp-gold focus:outline-none focus:ring-1 focus:ring-sgp-gold disabled:opacity-50"
              aria-required="true"
              aria-invalid={minutes !== '' && !isMinutesValid}
            />
            {minutes !== '' && !isMinutesValid && (
              <p className="mt-1 text-xs text-red-400">
                Informe um número inteiro maior que zero.
              </p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="production-time-entry-qty"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Quantidade executada
            </label>
            <input
              id="production-time-entry-qty"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={executedQuantity}
              onChange={(e) => {
                setState({ status: 'idle' })
                setExecutedQuantity(e.target.value)
              }}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder-slate-600 focus:border-sgp-gold focus:outline-none focus:ring-1 focus:ring-sgp-gold disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-slate-500">
              Unidades concluídas neste apontamento.
            </p>
          </div>

          {needsJustification ? (
            <div className="mb-4">
              <JustificationSelect
                channel="production"
                idPrefix={`production-oos-${item.activityNodeId}`}
                value={justification.justificationId ?? ''}
                complement={justification.justificationComplement}
                legacyText={justification.legacyText}
                preferredCategory={preferredCategory}
                preferredLabelHint={
                  item.hasPreviousPendingStep ? 'outro colaborador' : null
                }
                disabled={isSubmitting}
                onCatalogStateChange={({ useFallback, selectedRequiresComplement }) => {
                  setJustificationUseFallback(useFallback)
                  setJustificationRequiresComplement(selectedRequiresComplement)
                }}
                onChange={(next) => {
                  setState({ status: 'idle' })
                  setJustification({
                    justificationId: next.justificationId,
                    justificationComplement: next.justificationComplement,
                    legacyText: next.legacyText,
                  })
                }}
              />
            </div>
          ) : null}

          <div className="mb-5">
            <label htmlFor="production-time-entry-note" className="mb-1.5 block text-sm font-medium text-slate-300">
              Observação <span className="text-slate-500">(opcional)</span>
            </label>
            <textarea
              id="production-time-entry-note"
              rows={2}
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isSubmitting}
              placeholder="Observação sobre o trabalho realizado..."
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder-slate-600 focus:border-sgp-gold focus:outline-none focus:ring-1 focus:ring-sgp-gold disabled:opacity-50"
            />
          </div>

          {state.status === 'error' && (
            <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {state.message}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={!isMinutesValid || isSubmitting}
              className="sgp-cta-primary min-h-12 flex-1 text-base disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Registrando…' : 'Registrar apontamento'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="sgp-cta-secondary min-h-12 flex-1 text-base disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
