import { useEffect, useState } from 'react'
import type { AdminCollaborator } from '../../../../domain/collaborators/collaborator.types'
import type { CollaboratorCapacityResolved } from '../../../../domain/operational-capacity'
import {
  hoursToMinutes,
  minutesToDecimalHours,
  minutesToHoursLabel,
} from '../../../../features/admin/operational-capacity/operationalCapacity.helpers'

type Props = {
  collaborator: AdminCollaborator
  resolved: CollaboratorCapacityResolved | null
  defaultDailyMinutes: number
  saving: boolean
  onClose: () => void
  onSave: (input: {
    dailyMinutes: number
    effectiveFrom: string | null
    effectiveTo: string | null
  }) => Promise<void>
  onRestoreDefault: () => Promise<void>
}

function parseHoursInput(raw: string): number | null {
  const t = raw.replace(',', '.').trim()
  if (!t) return null
  const n = Number.parseFloat(t)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

export function CapacityOverrideModal({
  collaborator,
  resolved,
  defaultDailyMinutes,
  saving,
  onClose,
  onSave,
  onRestoreDefault,
}: Props) {
  const initialOverride =
    resolved?.overrideDailyMinutes != null ? resolved.overrideDailyMinutes : null
  const [hoursStr, setHoursStr] = useState(() =>
    String(minutesToDecimalHours(initialOverride ?? defaultDailyMinutes)).replace('.', ','),
  )
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const latest = resolved?.overrides?.[0]
    setFrom(latest?.effectiveFrom?.trim() ? latest.effectiveFrom.slice(0, 10) : '')
    setTo(latest?.effectiveTo?.trim() ? latest.effectiveTo.slice(0, 10) : '')
  }, [resolved])

  const hasActiveOverride =
    resolved?.source === 'override' && resolved.overrideDailyMinutes != null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-sgp-navy/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/[0.1] bg-gradient-to-b from-sgp-navy to-sgp-void p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-heading text-lg font-bold text-slate-100">Ajuste de capacidade</h2>
        <p className="mt-2 text-sm text-slate-300">{collaborator.fullName}</p>
        <p className="mt-1 text-xs text-slate-500">
          Padrão atual da organização:{' '}
          <span className="font-semibold text-slate-400">
            {minutesToHoursLabel(defaultDailyMinutes)}/dia
          </span>
        </p>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Capacidade individual (horas/dia)
          <input
            type="text"
            inputMode="decimal"
            value={hoursStr}
            onChange={(e) => {
              setHoursStr(e.target.value)
              setErr(null)
            }}
            className="sgp-input-app mt-1.5 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
          />
        </label>

        <details className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-slate-500">
          <summary className="cursor-pointer font-semibold text-slate-400">
            Vigência opcional (datas)
          </summary>
          <p className="mt-2 text-[11px] leading-relaxed">
            Se ambas vazias, o ajuste aplica-se enquanto estiver ativo. Formato AAAA-MM-DD.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="block text-[10px] font-semibold uppercase text-slate-500">
              De
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="sgp-input-app mt-1 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-2 py-2 text-sm text-slate-200"
              />
            </label>
            <label className="block text-[10px] font-semibold uppercase text-slate-500">
              Até
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="sgp-input-app mt-1 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-2 py-2 text-sm text-slate-200"
              />
            </label>
          </div>
        </details>

        {err ? (
          <p className="mt-3 text-sm text-rose-200/90" role="alert">
            {err}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-white/[0.06] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/12 px-4 py-2 text-sm font-bold text-slate-300"
          >
            Cancelar
          </button>
          {hasActiveOverride ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void onRestoreDefault()}
              className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-100/95 disabled:opacity-40"
            >
              Restaurar padrão
            </button>
          ) : null}
          <button
            type="button"
            disabled={saving}
            className="sgp-cta-primary !px-4 !py-2 text-sm disabled:opacity-40"
            onClick={() => {
              const h = parseHoursInput(hoursStr)
              if (h == null) {
                setErr('Informe um número positivo de horas.')
                return
              }
              const minutes = hoursToMinutes(h)
              if (minutes < 1 || minutes > 1440) {
                setErr('Valor inválido para minutos diários.')
                return
              }
              void onSave({
                dailyMinutes: minutes,
                effectiveFrom: from.trim() || null,
                effectiveTo: to.trim() || null,
              })
            }}
          >
            {saving ? 'A guardar…' : 'Guardar ajuste'}
          </button>
        </div>
      </div>
    </div>
  )
}
