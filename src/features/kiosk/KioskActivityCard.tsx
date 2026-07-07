import { useState, useCallback } from 'react'
import type { ProductionWorkQueueItem } from '../../domain/production/production.types'
import {
  createProductionTimeEntry,
  PRODUCTION_TIME_ENTRY_ERROR_MESSAGE,
} from '../../services/production/productionApiService'
import { ApiError } from '../../lib/api/apiErrors'
import {
  canSubmitKioskProductionTimeEntry,
  productionOutOfSequenceJustificationError,
  productionPlannedTimeReachedHint,
  productionTimePlannedCoverageLabel,
  productionTimePlannedCoveragePct,
} from '../../domain/production/kioskActivityCardLogic'
import {
  formatAwaitingPreviousActivitiesLabel,
  resolveOutOfSequenceActionLabel,
  resolveProductionOperationalStatusDisplay,
  resolveSequenceListBadge,
} from '../../domain/production/production.helpers'
import { JustificationSelect } from '../../components/operational/JustificationSelect'
import {
  emptyJustificationValue,
  type JustificationFieldValue,
} from '../shell/quickTimeEntryDrawerLogic'

const PRESETS = [15, 30, 45, 60] as const

function sliderPhrase(pct: number): string {
  if (pct === 0) return 'Não iniciado'
  if (pct <= 15) return 'Só começando…'
  if (pct <= 30) return 'Primeiros passos'
  if (pct <= 50) return 'Metade do caminho'
  if (pct <= 65) return 'Mais da metade'
  if (pct <= 80) return 'Quase lá!'
  if (pct <= 95) return 'Reta final!'
  if (pct < 100) return 'Finalizando…'
  return 'Concluído!'
}

function ProgressRing({ pct, label }: { pct: number; label: string }) {
  const r = 40
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.max(0, Math.min(1, pct / 100)))
  return (
    <div className="relative h-24 w-24 shrink-0" aria-label={label}>
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full -rotate-90"
        aria-hidden
      >
        <circle
          cx={50}
          cy={50}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={8}
        />
        <circle
          cx={50}
          cy={50}
          r={r}
          fill="none"
          strokeWidth={8}
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
        <span className="text-sm font-bold leading-tight text-white">{pct}%</span>
        <span className="text-[8px] uppercase leading-tight tracking-wide text-slate-500">
          do tempo previsto
        </span>
      </div>
    </div>
  )
}

type Props = {
  item: ProductionWorkQueueItem
  onSuccess: () => void
}

export function KioskActivityCard({ item, onSuccess }: Props) {
  const [preset, setPreset] = useState<number | null>(30)
  const [minutesCustom, setMinutesCustom] = useState('30')
  const [sessionPct, setSessionPct] = useState(50)
  const [markAsDone, setMarkAsDone] = useState(false)
  const [outOfSequenceJustification, setOutOfSequenceJustification] =
    useState<JustificationFieldValue>(emptyJustificationValue())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [confirmLowPct, setConfirmLowPct] = useState(false)

  const timeCoveragePct = productionTimePlannedCoveragePct(item)
  const timeCoverageLabel = productionTimePlannedCoverageLabel(timeCoveragePct)
  const statusDisplay = resolveProductionOperationalStatusDisplay(item)
  const plannedTimeHint = productionPlannedTimeReachedHint(item)
  const needsOosJustification = item.requiresOutOfSequenceJustification
  const sequenceBadge = resolveSequenceListBadge(item)
  const sequenceHint =
    item.sequenceWarningLabel ??
    formatAwaitingPreviousActivitiesLabel(item.awaitingPreviousActivities)

  const minutes =
    preset !== null ? preset : Number.parseInt(minutesCustom, 10) || 0

  const minutesValid = Number.isInteger(minutes) && minutes > 0

  const canSubmit = canSubmitKioskProductionTimeEntry({
    minutesValid,
    requiresOutOfSequenceJustification: item.requiresOutOfSequenceJustification,
    outOfSequenceJustification: outOfSequenceJustification.legacyText,
  })

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
        ...(needsOosJustification && oos
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
        setSuccess(false)
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
    needsOosJustification,
    outOfSequenceJustification,
  ])

  function handleRegister() {
    if (needsOosJustification) {
      const oosErr = productionOutOfSequenceJustificationError(
        outOfSequenceJustification.legacyText,
      )
      if (oosErr) {
        setError(oosErr)
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
    return (
      <div className="flex flex-col items-center justify-center gap-6 px-8 py-16 text-center">
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
      </div>
    )
  }

  return (
    <div className="relative flex flex-col">
      {confirmLowPct && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-sgp-night p-6">
            <p className="text-base font-semibold text-white">Confirmar conclusão?</p>
            <p className="mt-2 text-sm text-slate-300">
              Você marcou como concluída, mas indicou apenas{' '}
              <strong className="text-amber-300">{sessionPct}%</strong> de progresso nesta
              sessão. Confirma mesmo assim?
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmLowPct(false)
                  void doSubmit()
                }}
                className="sgp-cta-primary min-h-12 flex-1"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setConfirmLowPct(false)}
                className="sgp-cta-secondary min-h-12 flex-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border-b border-white/[0.07] p-5">
        {(item.isNextRecommended || sequenceBadge.kind !== 'none' || needsOosJustification) && (
          <div className="mb-3 flex flex-wrap gap-2">
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
        <div className="flex items-start gap-4">
          <ProgressRing pct={timeCoveragePct} label={timeCoverageLabel} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-lg font-semibold leading-snug text-white">
                {item.activityTitle}
              </p>
              <span className={`shrink-0 text-xs font-medium ${statusDisplay.colorClass}`}>
                Status: {statusDisplay.label}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
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
            <p className="mt-1.5 text-xs text-slate-500">
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
              <p className="mt-2 text-xs font-medium text-sky-300/90">{plannedTimeHint}</p>
            ) : null}
            {!item.canTrackTime ? (
              <p className="mt-2 text-xs font-medium text-amber-400">
                {item.isActivityCompleted
                  ? 'Atividade concluída'
                  : 'Apontamento bloqueado para esta atividade'}
              </p>
            ) : null}
            {sequenceHint && !needsOosJustification ? (
              <p className="mt-2 text-xs font-medium text-slate-400">{sequenceHint}</p>
            ) : null}
            {item.canTrackTime && needsOosJustification ? (
              <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                <p className="text-xs font-semibold text-amber-200">
                  {resolveOutOfSequenceActionLabel()} — confirme o apontamento.
                </p>
                {(item.allPreviousOpenActivities ?? item.previousOpenActivities).length > 0 ? (
                  <ul className="mt-1.5 list-inside list-disc text-xs text-amber-100/90">
                    {(item.allPreviousOpenActivities ?? item.previousOpenActivities).map((prev) => (
                      <li key={`${prev.taskTitle}-${prev.sectorTitle}-${prev.activityTitle}`}>
                        {prev.taskTitle} · {prev.sectorTitle} · {prev.activityTitle}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-1.5 text-xs text-amber-100/80">
                  Existem etapas anteriores pendentes. Informe uma justificativa para apontar.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {item.canTrackTime ? (
        <div className="flex flex-col gap-6 p-5">
          <div>
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Tempo trabalhado
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => selectPreset(p)}
                  disabled={submitting}
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
                disabled={submitting}
                placeholder="outro"
                className={[
                  'min-h-12 w-24 rounded-xl border px-3 text-sm text-white tabular-nums placeholder:text-slate-600 focus:outline-none focus:ring-2',
                  preset === null && minutesCustom
                    ? 'border-sgp-gold bg-sgp-gold/10 focus:ring-sgp-gold/30'
                    : 'border-white/10 bg-white/[0.04] focus:ring-white/10',
                ].join(' ')}
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Como está a atividade agora?
              </p>
              <span className="text-sm font-bold text-sgp-gold">{sessionPct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={sessionPct}
              onChange={(e) => setSessionPct(Number(e.target.value))}
              disabled={submitting}
              className="w-full cursor-pointer disabled:cursor-not-allowed"
              style={{ accentColor: 'var(--color-sgp-gold, #c9a227)' }}
              aria-label="Estado atual da atividade nesta sessão"
            />
            <p className="mt-1.5 text-center text-sm font-medium text-slate-300">
              {sliderPhrase(sessionPct)}
            </p>
          </div>

          {needsOosJustification ? (
            <div>
              <JustificationSelect
                channel="production"
                idPrefix={`kiosk-oos-${item.activityNodeId}`}
                value={outOfSequenceJustification.justificationId ?? ''}
                complement={outOfSequenceJustification.justificationComplement}
                legacyText={outOfSequenceJustification.legacyText}
                disabled={submitting}
                onChange={(next) => {
                  setOutOfSequenceJustification({
                    justificationId: next.justificationId,
                    justificationComplement: next.justificationComplement,
                    legacyText: next.legacyText,
                  })
                  setError(null)
                }}
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Para apontar mesmo assim, informe o motivo.
              </p>
            </div>
          ) : null}

          {item.canCompleteStep ? (
            <label className="flex cursor-pointer items-center gap-3">
              <span className="relative inline-flex shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={markAsDone}
                  onChange={(e) => setMarkAsDone(e.target.checked)}
                  disabled={submitting}
                  aria-label="Concluir atividade ao registrar"
                />
                <span className="block h-7 w-12 rounded-full border border-white/15 bg-white/[0.05] transition-colors peer-checked:border-emerald-500/40 peer-checked:bg-emerald-500/20" />
                <span className="absolute left-0.5 top-0.5 block h-6 w-6 rounded-full border border-white/30 bg-white/30 transition-all peer-checked:translate-x-5 peer-checked:border-emerald-400 peer-checked:bg-emerald-400" />
              </span>
              <span className="text-sm text-slate-300">Concluir atividade ao registrar</span>
            </label>
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
            onClick={handleRegister}
            disabled={submitting || !canSubmit}
            className={[
              'min-h-14 w-full text-base disabled:cursor-not-allowed disabled:opacity-50',
              needsOosJustification ? 'sgp-cta-secondary' : 'sgp-cta-primary',
            ].join(' ')}
          >
            {submitting
              ? 'Registrando…'
              : needsOosJustification
                ? 'Registrar apontamento (exceção)'
                : 'Registrar apontamento'}
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
    </div>
  )
}
