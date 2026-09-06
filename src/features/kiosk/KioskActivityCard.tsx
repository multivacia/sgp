import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ProductionWorkQueueItem } from '../../domain/production/production.types'
import {
  createProductionTimeEntry,
  PRODUCTION_TIME_ENTRY_ERROR_MESSAGE,
} from '../../services/production/productionApiService'
import { ApiError } from '../../lib/api/apiErrors'
import {
  canSubmitKioskProductionTimeEntry,
  kioskRequiresExcessTimeJustification,
  kioskRequiresOperationalJustification,
  productionOutOfSequenceJustificationError,
  productionPlannedTimeReachedHint,
  productionTimePlannedCoverageLabel,
  productionTimePlannedCoveragePct,
  resolveKioskInitialSessionCompletionPct,
} from '../../domain/production/kioskActivityCardLogic'
import {
  formatAwaitingPreviousActivitiesLabel,
  resolveProductionOperationalStatusDisplay,
  resolveSequenceListBadge,
} from '../../domain/production/production.helpers'
import {
  resolvePreferredJustificationCategory,
} from '../../domain/operational/timeEntryJustificationField'
import {
  emptyJustificationValue,
  type JustificationFieldValue,
} from '../shell/quickTimeEntryDrawerLogic'
import { KioskRegisterSheet } from './KioskRegisterSheet'

function ProgressRing({ pct, label }: { pct: number; label: string }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.max(0, Math.min(1, pct / 100)))
  return (
    <div className="relative h-16 w-16 shrink-0" aria-label={label}>
      <svg
        viewBox="0 0 72 72"
        className="absolute inset-0 h-full w-full -rotate-90"
        aria-hidden
      >
        <circle
          cx={36}
          cy={36}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={6}
        />
        <circle
          cx={36}
          cy={36}
          r={r}
          fill="none"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            stroke: 'var(--color-sgp-gold, #c9a227)',
            transition: 'stroke-dashoffset 0.4s ease',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-1 text-center">
        <span className="text-xs font-bold leading-tight text-white">{pct}%</span>
        <span className="text-[7px] uppercase leading-tight tracking-wide text-slate-500">
          previsto
        </span>
      </div>
    </div>
  )
}

type Props = {
  item: ProductionWorkQueueItem
  onSuccess: () => void
  onSheetOpenChange?: (open: boolean) => void
}

const INITIAL_KIOSK_TIME_ENTRY_FORM = {
  preset: null as number | null,
  minutesCustom: '',
  markAsDone: false,
}

export function KioskActivityCard({ item, onSuccess, onSheetOpenChange }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [preset, setPreset] = useState<number | null>(INITIAL_KIOSK_TIME_ENTRY_FORM.preset)
  const [minutesCustom, setMinutesCustom] = useState(INITIAL_KIOSK_TIME_ENTRY_FORM.minutesCustom)
  const [sessionPct, setSessionPct] = useState(() =>
    resolveKioskInitialSessionCompletionPct(item),
  )
  const [markAsDone, setMarkAsDone] = useState(false)
  const [outOfSequenceJustification, setOutOfSequenceJustification] =
    useState<JustificationFieldValue>(emptyJustificationValue())
  const [justificationUseFallback, setJustificationUseFallback] = useState(false)
  const [justificationRequiresComplement, setJustificationRequiresComplement] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [confirmLowPct, setConfirmLowPct] = useState(false)

  useEffect(() => {
    setSessionPct(resolveKioskInitialSessionCompletionPct(item))
  }, [item.activityNodeId, item.lastSessionCompletionPct])

  function openSheet() {
    setSheetOpen(true)
    onSheetOpenChange?.(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    onSheetOpenChange?.(false)
  }

  const timeCoveragePct = productionTimePlannedCoveragePct(item)
  const timeCoverageLabel = productionTimePlannedCoverageLabel(timeCoveragePct)
  const statusDisplay = resolveProductionOperationalStatusDisplay(item)
  const plannedTimeHint = productionPlannedTimeReachedHint(item)
  const sequenceBadge = resolveSequenceListBadge(item)
  const sequenceHint =
    item.sequenceWarningLabel ??
    formatAwaitingPreviousActivitiesLabel(item.awaitingPreviousActivities)

  const minutes =
    preset !== null ? preset : Number.parseInt(minutesCustom, 10) || 0

  const needsOosJustification = item.requiresOutOfSequenceJustification
  const needsExcessTimeJustification = kioskRequiresExcessTimeJustification(item, minutes)
  const needsOperationalJustification = kioskRequiresOperationalJustification(item, minutes)

  const preferredCategory = needsOosJustification
    ? resolvePreferredJustificationCategory({
        hasPreviousPendingStep: item.hasPreviousPendingStep,
        isOutOfSequence: item.isOutOfSequence,
      })
    : needsExcessTimeJustification
      ? resolvePreferredJustificationCategory({ requiresExcessTime: true })
      : null

  const canSubmit = canSubmitKioskProductionTimeEntry({
    markAsDone,
    minutes,
    sessionPct,
    requiresOperationalJustification: needsOperationalJustification,
    justification: outOfSequenceJustification,
    useFallback: justificationUseFallback,
    requiresComplement: justificationRequiresComplement,
  })

  function resetTimeEntryFields() {
    setPreset(INITIAL_KIOSK_TIME_ENTRY_FORM.preset)
    setMinutesCustom(INITIAL_KIOSK_TIME_ENTRY_FORM.minutesCustom)
    setMarkAsDone(INITIAL_KIOSK_TIME_ENTRY_FORM.markAsDone)
    setError(null)
    setConfirmLowPct(false)
  }

  function selectPreset(p: number) {
    setPreset(p)
    setMinutesCustom(String(p))
    setError(null)
  }

  function handleCustomInput(v: string) {
    setPreset(null)
    setMinutesCustom(v)
    setError(null)
  }

  const doSubmit = useCallback(async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const oos = outOfSequenceJustification.legacyText.trim()
      await createProductionTimeEntry({
        conveyorId: item.conveyorId,
        stepNodeId: item.activityNodeId,
        minutes,
        sessionCompletionPct: sessionPct,
        markAsDone,
        ...(needsOperationalJustification && oos
          ? {
              outOfSequenceJustification: oos,
              ...(outOfSequenceJustification.justificationId
                ? {
                    justificationId: outOfSequenceJustification.justificationId,
                    justificationComplement:
                      outOfSequenceJustification.justificationComplement.trim() ||
                      undefined,
                  }
                : {}),
            }
          : {}),
      })
      setSuccess(true)
      setTimeout(() => {
        resetTimeEntryFields()
        setSuccess(false)
        setSheetOpen(false)
        onSheetOpenChange?.(false)
        onSuccess()
      }, 3000)
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : PRODUCTION_TIME_ENTRY_ERROR_MESSAGE,
      )
    } finally {
      setSubmitting(false)
    }
  }, [
    canSubmit,
    minutes,
    sessionPct,
    markAsDone,
    item,
    onSuccess,
    onSheetOpenChange,
    needsOperationalJustification,
    outOfSequenceJustification,
  ])

  function handleRegister() {
    if (needsOperationalJustification) {
      const justificationErr = productionOutOfSequenceJustificationError({
        justification: outOfSequenceJustification,
        useFallback: justificationUseFallback,
        requiresComplement: justificationRequiresComplement,
      })
      if (justificationErr) {
        setError(justificationErr)
        return
      }
    }
    if (markAsDone && sessionPct < 80) {
      setConfirmLowPct(true)
      return
    }
    void doSubmit()
  }

  if (success) {
    return createPortal(
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-black/80 px-8 py-16 text-center backdrop-blur-sm">
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
          <p className="mt-1 text-sm text-slate-400">
            {markAsDone
              ? 'Atividade concluída. Avançando…'
              : 'Avançando para a próxima atividade…'}
          </p>
        </div>
      </div>,
      document.body,
    )
  }

  return (
    <div className="relative flex flex-col">
      <div className="border-b border-white/[0.07] p-4">
        {(item.isNextRecommended || sequenceBadge.kind !== 'none' || needsOosJustification) && (
          <div className="mb-2 flex flex-wrap gap-2">
            {sequenceBadge.kind === 'recommended' ? (
              <span className="inline-flex items-center rounded-full border border-sgp-gold/40 bg-sgp-gold/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-sgp-gold">
                {sequenceBadge.label}
              </span>
            ) : null}
            {sequenceBadge.kind === 'warning' && sequenceBadge.label ? (
              <span className="inline-flex items-center rounded-full border border-slate-500/40 bg-slate-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                {sequenceBadge.label}
              </span>
            ) : null}
          </div>
        )}
        <div className="flex items-start gap-3">
          <ProgressRing pct={timeCoveragePct} label={timeCoverageLabel} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-base font-semibold leading-snug text-white">
                {item.activityTitle}
              </p>
              <span className={`shrink-0 text-xs font-medium ${statusDisplay.colorClass}`}>
                Status: {statusDisplay.label}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
              {item.sectorTitle ? (
                <span>
                  <span className="text-slate-600">Setor </span>
                  <span className="text-slate-300">{item.sectorTitle}</span>
                </span>
              ) : null}
              {item.taskTitle ? (
                <span>
                  <span className="text-slate-600">Tarefa </span>
                  <span className="text-slate-300">{item.taskTitle}</span>
                </span>
              ) : null}
              <span>
                <span className="text-slate-600">Esteira </span>
                <span className="text-slate-300">{item.conveyorTitle}</span>
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Realizado:{' '}
              <span className="text-slate-300">{item.realizedMinutes} min</span>
              {item.plannedMinutes != null ? (
                <>
                  {' '}
                  · Planejado:{' '}
                  <span className="text-slate-300">{item.plannedMinutes} min</span>
                </>
              ) : null}
            </p>
            {plannedTimeHint ? (
              <p className="mt-1.5 text-xs font-medium text-sky-300/90">{plannedTimeHint}</p>
            ) : null}
            {!item.canTrackTime ? (
              <p className="mt-1.5 text-xs font-medium text-amber-400">
                {item.isActivityCompleted
                  ? 'Atividade concluída'
                  : 'Apontamento bloqueado para esta atividade'}
              </p>
            ) : null}
            {sequenceHint && !needsOosJustification ? (
              <p className="mt-1.5 text-xs font-medium text-slate-400">{sequenceHint}</p>
            ) : null}
          </div>
        </div>
      </div>

      {item.canTrackTime ? (
        <div className="p-4">
          <button
            type="button"
            onClick={openSheet}
            className="sgp-cta-primary min-h-14 w-full text-base"
          >
            Registrar apontamento
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center p-10 text-center">
          <p className="text-sm text-slate-400">
            {item.isActivityCompleted
              ? 'Esta atividade já foi concluída operacionalmente.'
              : 'Apontamento não disponível para esta atividade no momento.'}
          </p>
        </div>
      )}

      {sheetOpen
        ? createPortal(
            <KioskRegisterSheet
              item={item}
              preset={preset}
              minutesCustom={minutesCustom}
              sessionPct={sessionPct}
              markAsDone={markAsDone}
              submitting={submitting}
              error={error}
              confirmLowPct={confirmLowPct}
              needsOosJustification={needsOosJustification}
              needsExcessTimeJustification={needsExcessTimeJustification}
              needsOperationalJustification={needsOperationalJustification}
              outOfSequenceJustification={outOfSequenceJustification}
              preferredCategory={preferredCategory}
              canSubmit={canSubmit}
              onClose={closeSheet}
              onSelectPreset={selectPreset}
              onCustomInput={handleCustomInput}
              onSessionPctChange={setSessionPct}
              onMarkAsDoneChange={setMarkAsDone}
              onJustificationChange={(next) => {
                setOutOfSequenceJustification({
                  justificationId: next.justificationId,
                  justificationComplement: next.justificationComplement,
                  legacyText: next.legacyText,
                })
                setError(null)
              }}
              onCatalogStateChange={({ useFallback, selectedRequiresComplement }) => {
                setJustificationUseFallback(useFallback)
                setJustificationRequiresComplement(selectedRequiresComplement)
              }}
              onRegister={handleRegister}
              onConfirmLowPct={() => {
                setConfirmLowPct(false)
                void doSubmit()
              }}
              onCancelLowPct={() => setConfirmLowPct(false)}
            />,
            document.body,
          )
        : null}
    </div>
  )
}
