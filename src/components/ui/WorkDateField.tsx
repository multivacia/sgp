import {
  WORK_DATE_FIELD_LABEL,
  operationalTodayIso,
  shiftIsoDate,
  validateWorkDate,
} from '../../domain/operational/workDate'

type Props = {
  id: string
  value: string
  onChange: (iso: string) => void
  disabled?: boolean
  /** `kiosk` = alvos de toque maiores (tablet fixo). */
  variant?: 'app' | 'kiosk'
  className?: string
}

/**
 * Campo «Data em que o trabalho foi realizado»: atalhos Hoje/Ontem + calendário.
 * Datas futuras bloqueadas (`max`) e sinalizadas; o backend valida de novo.
 */
export function WorkDateField({
  id,
  value,
  onChange,
  disabled = false,
  variant = 'app',
  className,
}: Props) {
  const today = operationalTodayIso()
  const yesterday = shiftIsoDate(today, -1)
  const error = validateWorkDate(value)
  const kiosk = variant === 'kiosk'

  const shortcuts = [
    { iso: today, label: 'Hoje' },
    { iso: yesterday, label: 'Ontem' },
  ]

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={
          kiosk
            ? 'mb-1.5 block text-sm font-medium text-slate-300'
            : 'block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500'
        }
      >
        {WORK_DATE_FIELD_LABEL}
      </label>
      <div className={`flex flex-wrap items-center gap-2 ${kiosk ? '' : 'mt-1.5'}`}>
        {shortcuts.map((s) => {
          const active = value === s.iso
          return (
            <button
              key={s.label}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onChange(s.iso)}
              className={[
                kiosk
                  ? 'min-h-12 rounded-xl border px-4 text-sm font-semibold transition-all'
                  : 'rounded-lg border px-3 py-2 text-xs font-semibold transition',
                active
                  ? 'border-sgp-gold bg-sgp-gold/15 text-sgp-gold'
                  : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/25',
                'disabled:opacity-50',
              ].join(' ')}
            >
              {s.label}
            </button>
          )
        })}
        <input
          id={id}
          type="date"
          value={value}
          max={today}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          className={
            kiosk
              ? 'min-h-12 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-base text-white focus:border-sgp-gold focus:outline-none focus:ring-1 focus:ring-sgp-gold disabled:opacity-50'
              : 'min-w-0 flex-1 rounded-xl border border-[color:var(--semantic-border-glass-strong)] bg-sgp-app-panel-deep/90 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-sgp-blue-bright/25 disabled:opacity-50'
          }
        />
      </div>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  )
}
