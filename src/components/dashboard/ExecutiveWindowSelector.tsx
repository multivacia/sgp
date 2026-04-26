import {
  EXECUTIVE_WINDOW_DAY_OPTIONS,
  type ExecutiveWindowDays,
} from '../../lib/dashboard/executiveDashboardWindow'

type Props = {
  value: ExecutiveWindowDays
  onChange: (days: ExecutiveWindowDays) => void
  disabled?: boolean
}

export function ExecutiveWindowSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
        Janela (conclusões)
      </span>
      <div
        className="inline-flex flex-wrap rounded-lg border border-white/10 bg-sgp-void/60 p-0.5"
        role="radiogroup"
        aria-label="Dias da janela para conclusões no dashboard gerencial"
        title="Recorte temporal para concluídas: usa completed_at nos últimos N dias. Não altera o recorte «Ativas»."
      >
        {EXECUTIVE_WINDOW_DAY_OPTIONS.map((d) => {
          const active = value === d
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(d)}
              className={[
                'rounded-md px-2.5 py-1.5 text-[11px] font-bold tabular-nums transition-colors',
                active
                  ? 'bg-white/12 text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:bg-white/[0.06] hover:text-slate-300',
                disabled && 'cursor-not-allowed opacity-50',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {d}d
            </button>
          )
        })}
      </div>
    </div>
  )
}
