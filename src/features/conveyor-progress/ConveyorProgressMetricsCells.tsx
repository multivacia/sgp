import {
  formatConveyorProgressDuration,
  formatConveyorProgressPercent,
} from '../../domain/conveyor-progress/conveyorProgressMetrics'

export type MetricsLike = {
  plannedMinutes: number
  realizedMinutes: number
  remainingMinutes: number
  exceededMinutes: number
  progressPercent: number
}

export function DurationCell({
  minutes,
  className = '',
}: {
  minutes: number
  className?: string
}) {
  return (
    <span className={`tabular-nums ${className}`}>
      {formatConveyorProgressDuration(minutes)}
    </span>
  )
}

export function RemainingCell({ minutes }: { minutes: number }) {
  return (
    <DurationCell
      minutes={minutes}
      className={minutes > 0 ? 'text-slate-600' : 'text-slate-400'}
    />
  )
}

export function ExceededCell({ minutes }: { minutes: number }) {
  if (minutes <= 0) {
    return <span className="text-slate-400">—</span>
  }
  return (
    <span className="font-semibold tabular-nums text-amber-600">
      +{formatConveyorProgressDuration(minutes)}
    </span>
  )
}

export function PlannedCell({ minutes }: { minutes: number }) {
  if (minutes <= 0) return <span className="text-slate-400">—</span>
  return <DurationCell minutes={minutes} className="text-slate-700" />
}

export function RealizedCell({ minutes }: { minutes: number }) {
  if (minutes <= 0) return <span className="text-slate-400">0h</span>
  return <DurationCell minutes={minutes} className="font-medium text-slate-800" />
}

export function EvolutionColumn({ metrics }: { metrics: MetricsLike }) {
  if (metrics.plannedMinutes <= 0) {
    return <span className="text-slate-400">—</span>
  }

  const barWidth = Math.min(100, Math.max(0, metrics.progressPercent))
  const exceeded = metrics.exceededMinutes > 0

  return (
    <div className="flex min-w-[7rem] items-center gap-2">
      <span
        className={`shrink-0 text-xs font-semibold tabular-nums ${
          exceeded ? 'text-amber-600' : 'text-slate-700'
        }`}
      >
        {formatConveyorProgressPercent(metrics.progressPercent)}
      </span>
      <span
        className="inline-flex h-2 min-w-[4rem] flex-1 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={metrics.progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span
          className={`h-full rounded-full ${exceeded ? 'bg-amber-500' : 'bg-sgp-gold'}`}
          style={{ width: `${barWidth}%` }}
        />
      </span>
    </div>
  )
}

export function LevelLabel({ children }: { children: string }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </span>
  )
}

export function StatusBadge({
  label,
  variant = 'neutral',
}: {
  label: string
  variant?: 'blue' | 'green' | 'neutral' | 'amber'
}) {
  const styles = {
    blue: 'border-sky-200 bg-sky-50 text-sky-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  }
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${styles[variant]}`}
    >
      {label}
    </span>
  )
}

export function statusBadgeVariant(
  label: string | null,
): 'blue' | 'green' | 'neutral' | 'amber' {
  if (!label) return 'neutral'
  const n = label.toLowerCase()
  if (n.includes('andamento') || n.includes('iniciar')) return 'blue'
  if (n.includes('aberta') || n.includes('pend')) return 'green'
  if (n.includes('conclu') || n.includes('finaliz')) return 'neutral'
  return 'neutral'
}
