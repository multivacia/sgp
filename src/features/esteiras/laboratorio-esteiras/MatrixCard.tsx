import { formatMinutesToHoursLabel } from '../../../domain/collaborator-health/collaboratorOperationalHealthDisplay'

type Props = {
  name: string
  activityCount: number
  totalMinutes: number
  onSelect: () => void
}

export function MatrixCard({ name, activityCount, totalMinutes, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-semantic-surface-panel-raised p-3.5 text-left transition hover:border-sgp-gold/35 hover:bg-semantic-surface-panel-hover active:scale-[0.99]"
    >
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-black/30 text-2xl"
        aria-hidden
      >
        🧩
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-heading text-sm font-semibold text-slate-50">{name}</p>
        <p className="mt-1 text-xs text-slate-400">
          <span className="tabular-nums">{activityCount}</span>{' '}
          {activityCount === 1 ? 'atividade' : 'atividades'}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-sgp-gold">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          {formatMinutesToHoursLabel(totalMinutes)}
        </p>
      </div>
      <span className="shrink-0 text-slate-500" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </span>
    </button>
  )
}
