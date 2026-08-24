import { useCallback, useEffect, useMemo, useState } from 'react'
import type { StepAbortReasonOption } from '../../domain/conveyors/stepAbortReasons'
import { listActiveStepAbortReasonsForSelection } from '../../services/conveyors/stepAbortReasonsSelectionApiService'

type Props = {
  open: boolean
  stepName: string
  busy: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: (payload: { reasonCode: string; reasonText: string | null }) => void
}

/**
 * Modal de confirmação de dispensa de STEP.
 * Carrega motivos ativos da API; sem pré-seleção; complemento conforme catálogo.
 */
export function AbortConveyorStepDialog({
  open,
  stepName,
  busy,
  error = null,
  onCancel,
  onConfirm,
}: Props) {
  const [reasons, setReasons] = useState<StepAbortReasonOption[]>([])
  const [loadingReasons, setLoadingReasons] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reasonCode, setReasonCode] = useState('')
  const [reasonText, setReasonText] = useState('')

  const loadReasons = useCallback(async () => {
    setLoadingReasons(true)
    setLoadError(null)
    try {
      const data = await listActiveStepAbortReasonsForSelection()
      setReasons(data)
      if (data.length === 0) {
        setLoadError('Não há motivos de dispensa ativos cadastrados.')
      }
    } catch {
      setReasons([])
      setLoadError('Não foi possível carregar os motivos de dispensa.')
    } finally {
      setLoadingReasons(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setReasonCode('')
    setReasonText('')
    void loadReasons()
  }, [open, loadReasons])

  const selected = useMemo(
    () => reasons.find((r) => r.code === reasonCode) ?? null,
    [reasons, reasonCode],
  )

  const requiresComplement = Boolean(selected?.requiresComplement)

  useEffect(() => {
    if (!requiresComplement) setReasonText('')
  }, [requiresComplement])

  const canConfirm =
    !busy &&
    !loadingReasons &&
    !loadError &&
    reasons.length > 0 &&
    Boolean(reasonCode) &&
    (!requiresComplement || reasonText.trim().length > 0)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal
      aria-labelledby="abort-step-title"
      onClick={() => {
        if (busy) return
        onCancel()
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-gradient-to-b from-sgp-app-panel/95 to-sgp-app-panel-deep/98 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.05]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="abort-step-title"
          className="font-heading text-lg font-bold tracking-tight text-slate-50"
        >
          Dispensar atividade?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          A atividade <span className="text-slate-200">{stepName}</span> deixa de bloquear a
          sequência e some das filas apontáveis. Horas já apontadas são preservadas. Não é
          conclusão.
        </p>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Motivo
          <select
            value={reasonCode}
            disabled={busy || loadingReasons || Boolean(loadError) || reasons.length === 0}
            onChange={(e) => setReasonCode(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 focus:border-sgp-gold/35 focus:outline-none focus:ring-1 focus:ring-sgp-gold/25 disabled:opacity-50"
          >
            <option value="">
              {loadingReasons ? 'Carregando motivos…' : 'Selecione um motivo...'}
            </option>
            {reasons.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        {requiresComplement ? (
          <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Complemento obrigatório
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              maxLength={2000}
              rows={3}
              disabled={busy}
              className="mt-2 w-full resize-y rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sgp-gold/35 focus:outline-none focus:ring-1 focus:ring-sgp-gold/25 disabled:opacity-50"
              placeholder="Descreva o motivo…"
            />
          </label>
        ) : null}
        {loadError ? (
          <p
            className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/[0.08] px-3 py-2 text-sm text-rose-100/95"
            role="alert"
          >
            {loadError}
          </p>
        ) : null}
        {error ? (
          <p
            className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/[0.08] px-3 py-2 text-sm text-rose-100/95"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-sgp-gold/30 hover:bg-white/[0.07] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() =>
              onConfirm({
                reasonCode,
                reasonText: requiresComplement ? reasonText.trim() : null,
              })
            }
            className="rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-2.5 text-sm font-bold text-rose-100 shadow-inner transition hover:border-rose-400/50 hover:bg-rose-500/[0.14] disabled:opacity-50"
          >
            {busy ? 'Dispensando…' : 'Confirmar dispensa'}
          </button>
        </div>
      </div>
    </div>
  )
}
