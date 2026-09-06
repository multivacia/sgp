import type { ProductionWorkQueueItem } from '../../domain/production/production.types'
import { resolveOutOfSequenceActionLabel } from '../../domain/production/production.helpers'
import { JustificationSelect } from '../../components/operational/JustificationSelect'
import type { JustificationFieldValue } from '../shell/quickTimeEntryDrawerLogic'

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

export type KioskRegisterSheetProps = {
  item: ProductionWorkQueueItem
  preset: number | null
  minutesCustom: string
  sessionPct: number
  markAsDone: boolean
  submitting: boolean
  error: string | null
  confirmLowPct: boolean
  needsOosJustification: boolean
  needsExcessTimeJustification: boolean
  needsOperationalJustification: boolean
  outOfSequenceJustification: JustificationFieldValue
  preferredCategory: string | null
  canSubmit: boolean
  onClose: () => void
  onSelectPreset: (minutes: number) => void
  onCustomInput: (value: string) => void
  onSessionPctChange: (pct: number) => void
  onMarkAsDoneChange: (value: boolean) => void
  onJustificationChange: (next: {
    justificationId: string | null
    justificationComplement: string
    legacyText: string
  }) => void
  onCatalogStateChange: (state: {
    useFallback: boolean
    selectedRequiresComplement: boolean
  }) => void
  onRegister: () => void
  onConfirmLowPct: () => void
  onCancelLowPct: () => void
}

export function KioskRegisterSheet({
  item,
  preset,
  minutesCustom,
  sessionPct,
  markAsDone,
  submitting,
  error,
  confirmLowPct,
  needsOosJustification,
  needsExcessTimeJustification,
  needsOperationalJustification,
  outOfSequenceJustification,
  preferredCategory,
  canSubmit,
  onClose,
  onSelectPreset,
  onCustomInput,
  onSessionPctChange,
  onMarkAsDoneChange,
  onJustificationChange,
  onCatalogStateChange,
  onRegister,
  onConfirmLowPct,
  onCancelLowPct,
}: KioskRegisterSheetProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Registrar apontamento"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-sgp-night p-5 pb-8">
        {confirmLowPct && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-t-3xl bg-black/80 p-6 backdrop-blur-sm">
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
                  onClick={onConfirmLowPct}
                  className="sgp-cta-primary min-h-12 flex-1"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={onCancelLowPct}
                  className="sgp-cta-secondary min-h-12 flex-1"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-base font-semibold text-white">Registrar apontamento</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-white/25 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {needsExcessTimeJustification && !needsOosJustification ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <p className="text-xs font-semibold text-amber-200">
                Tempo acima do previsto — confirme o apontamento.
              </p>
              <p className="mt-1.5 text-xs text-amber-100/80">
                Este apontamento ultrapassa o tempo planejado da atividade. Informe uma
                justificativa para registrar.
              </p>
            </div>
          ) : null}

          {needsOosJustification ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
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

          <div>
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Tempo trabalhado
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onSelectPreset(p)}
                  disabled={submitting}
                  className={[
                    'min-h-[52px] min-w-[52px] rounded-xl border px-4 text-sm font-semibold transition-all',
                    preset === p
                      ? 'border-sgp-gold bg-sgp-gold/15 text-sgp-gold'
                      : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/25 active:scale-95',
                  ].join(' ')}
                >
                  {p} min
                </button>
              ))}
            </div>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={minutesCustom}
              onChange={(e) => onCustomInput(e.target.value)}
              disabled={submitting}
              placeholder="outro (minutos)"
              className={[
                'mt-2 min-h-[52px] w-full rounded-xl border px-3 text-sm text-white tabular-nums placeholder:text-slate-600 focus:outline-none focus:ring-2',
                preset === null && minutesCustom
                  ? 'border-sgp-gold bg-sgp-gold/10 focus:ring-sgp-gold/30'
                  : 'border-white/10 bg-white/[0.04] focus:ring-white/10',
              ].join(' ')}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Evolução da atividade (nesta sessão)
              </p>
              <span className="text-sm font-bold text-sgp-gold">{sessionPct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={sessionPct}
              onChange={(e) => onSessionPctChange(Number(e.target.value))}
              disabled={submitting}
              className="w-full cursor-pointer disabled:cursor-not-allowed"
              style={{ accentColor: 'var(--color-sgp-gold, #c9a227)' }}
              aria-label="Evolução da atividade nesta sessão, independente do tempo trabalhado"
            />
            <p className="mt-1.5 text-center text-sm font-medium text-slate-300">
              {sliderPhrase(sessionPct)}
            </p>
          </div>

          {needsOperationalJustification ? (
            <div>
              <JustificationSelect
                channel="production"
                idPrefix={`kiosk-operational-${item.activityNodeId}`}
                value={outOfSequenceJustification.justificationId ?? ''}
                complement={outOfSequenceJustification.justificationComplement}
                legacyText={outOfSequenceJustification.legacyText}
                required
                preferredCategory={preferredCategory}
                preferredLabelHint={
                  item.hasPreviousPendingStep ? 'outro colaborador' : null
                }
                disabled={submitting}
                onCatalogStateChange={onCatalogStateChange}
                onChange={onJustificationChange}
              />
              <p className="mt-1.5 text-xs text-slate-500">
                {needsExcessTimeJustification && needsOosJustification
                  ? 'Para apontar fora de sequência e acima do tempo previsto, informe o motivo.'
                  : needsExcessTimeJustification
                    ? 'Para apontar acima do tempo previsto, informe o motivo.'
                    : 'Para apontar mesmo assim, informe o motivo.'}
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
                  onChange={(e) => onMarkAsDoneChange(e.target.checked)}
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
            onClick={onRegister}
            disabled={submitting || !canSubmit}
            className={[
              'min-h-14 w-full text-base disabled:cursor-not-allowed disabled:opacity-50',
              needsOperationalJustification ? 'sgp-cta-secondary' : 'sgp-cta-primary',
            ].join(' ')}
          >
            {submitting
              ? 'Registrando…'
              : needsOperationalJustification
                ? 'Registrar apontamento (exceção)'
                : 'Registrar apontamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
