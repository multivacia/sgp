import { formatMinutesToHoursLabel } from '../../../domain/collaborator-health/collaboratorOperationalHealthDisplay'
import type { LabActivityItem } from './laboratorioEsteiras.types'

type Props = {
  activity: LabActivityItem
  included: boolean
  onToggle: (activityId: string) => void
  onEdit: (activity: LabActivityItem) => void
  /** Sobrescreve nome/tempo após edição local no modal. */
  override?: { name?: string; plannedMinutes?: number }
}

export function MatrixActivityRow({
  activity,
  included,
  onToggle,
  onEdit,
  override,
}: Props) {
  const name = override?.name ?? activity.name
  const minutes = override?.plannedMinutes ?? activity.plannedMinutes

  return (
    <div className="flex items-center gap-2 border-b border-white/[0.04] py-2.5 last:border-b-0">
      <button
        type="button"
        role="checkbox"
        aria-checked={included}
        aria-label={`${included ? 'Desmarcar' : 'Marcar'} ${name}`}
        onClick={() => onToggle(activity.id)}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
          included
            ? 'border-sgp-gold bg-sgp-gold text-sgp-void'
            : 'border-white/15 bg-black/30 text-transparent'
        }`}
      >
        {included ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 12l5 5L19 7" />
          </svg>
        ) : null}
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-100">{name}</p>
      </div>

      <span className="shrink-0 text-xs tabular-nums text-slate-400">
        {formatMinutesToHoursLabel(minutes)}
      </span>

      <button
        type="button"
        aria-label={`Editar ${name}`}
        onClick={() => onEdit(activity)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:border-sgp-gold/30 hover:text-sgp-gold"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      </button>
    </div>
  )
}
