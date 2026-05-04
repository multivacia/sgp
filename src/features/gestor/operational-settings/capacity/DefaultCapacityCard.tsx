import { useEffect, useState } from 'react'
import type { OperationalCapacitySettings } from '../../../../domain/operational-capacity'
import {
  hoursToMinutes,
  minutesToDecimalHours,
} from '../../../../features/admin/operational-capacity/operationalCapacity.helpers'

type Props = {
  settings: OperationalCapacitySettings | null
  loading: boolean
  saving: boolean
  error: string | null
  onSave: (defaultDailyMinutes: number) => Promise<void>
}

function parseHoursInput(raw: string): number | null {
  const t = raw.replace(',', '.').trim()
  if (!t) return null
  const n = Number.parseFloat(t)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

export function DefaultCapacityCard({
  settings,
  loading,
  saving,
  error,
  onSave,
}: Props) {
  const [hoursStr, setHoursStr] = useState('')
  const [localErr, setLocalErr] = useState<string | null>(null)

  useEffect(() => {
    if (!settings) return
    const h = minutesToDecimalHours(settings.defaultDailyMinutes)
    setHoursStr(String(h).replace('.', ','))
  }, [settings])

  return (
    <div className="sgp-panel sgp-panel-hover">
      <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-slate-200">
        Capacidade padrão
      </h2>
      <p className="mt-2 text-sm text-slate-400">
        Este valor será usado para colaboradores sem ajuste individual. Unidade: horas úteis por
        dia (calendário).
      </p>
      {settings?.updatedAt ? (
        <p className="mt-1 text-xs text-slate-600">
          Última atualização:{' '}
          {new Date(settings.updatedAt).toLocaleString('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Carregando capacidade padrão…</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex min-w-[10rem] flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Horas por dia
            <input
              type="text"
              inputMode="decimal"
              value={hoursStr}
              onChange={(e) => {
                setHoursStr(e.target.value)
                setLocalErr(null)
              }}
              placeholder="ex.: 8 ou 7,5"
              className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
            />
          </label>
          <button
            type="button"
            disabled={saving}
            className="sgp-cta-primary !px-4 !py-2 text-sm disabled:opacity-40"
            onClick={() => {
              const h = parseHoursInput(hoursStr)
              if (h == null) {
                setLocalErr('Informe um número positivo de horas.')
                return
              }
              const minutes = hoursToMinutes(h)
              if (minutes < 1 || minutes > 1440) {
                setLocalErr('A capacidade deve estar entre 1 minuto e 24 horas por dia.')
                return
              }
              void onSave(minutes)
            }}
          >
            {saving ? 'A guardar…' : 'Salvar padrão'}
          </button>
        </div>
      )}

      {localErr ? (
        <p className="mt-2 text-sm text-rose-200/90" role="alert">
          {localErr}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-rose-200/90" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
