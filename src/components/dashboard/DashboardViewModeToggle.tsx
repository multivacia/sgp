export type DashboardViewMode = 'cards' | 'charts'

type Props = {
  value: DashboardViewMode
  onChange: (mode: DashboardViewMode) => void
}

export function DashboardViewModeToggle({ value, onChange }: Props) {
  return (
    <div
      className="inline-flex rounded-lg border border-white/10 bg-sgp-void/60 p-0.5"
      role="radiogroup"
      aria-label="Modo de visualização do dashboard"
    >
      {(
        [
          ['cards', 'Cards'],
          ['charts', 'Gráficos'],
        ] as const
      ).map(([k, label]) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          onClick={() => onChange(k)}
          className={[
            'rounded-md px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors',
            value === k
              ? 'bg-white/10 text-slate-100 shadow-sm'
              : 'text-slate-500 hover:text-slate-300',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
