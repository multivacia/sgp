import type { CollaboratorOperationalHealthSignal } from '../../../domain/collaborator-health/collaboratorOperationalHealth.types'
import { getCollaboratorHealthSignalLabel } from '../../../domain/collaborator-health/collaboratorOperationalHealthDisplay'

const SEV: Record<string, string> = {
  info: 'border-slate-500/25 bg-slate-500/10 text-slate-200/90',
  warning: 'border-amber-500/35 bg-amber-500/10 text-amber-100/90',
  critical: 'border-rose-500/40 bg-rose-500/10 text-rose-100/90',
}

type Props = {
  signals: CollaboratorOperationalHealthSignal[]
  /** Máximo de chips visíveis; resto vira "+N". */
  maxVisible?: number
  className?: string
}

export function CollaboratorHealthSignalsList({
  signals,
  maxVisible = 2,
  className = '',
}: Props) {
  if (!signals.length) {
    return <span className="text-xs text-slate-500">—</span>
  }
  const visible = signals.slice(0, maxVisible)
  const rest = signals.length - visible.length
  return (
    <div className={['flex flex-wrap items-center gap-1', className].filter(Boolean).join(' ')}>
      {visible.map((s) => (
        <span
          key={`${s.code}-${s.severity}`}
          title={s.message}
          className={[
            'max-w-[10rem] truncate rounded border px-1.5 py-0.5 text-[10px] font-semibold',
            SEV[s.severity] ?? SEV.info,
          ].join(' ')}
        >
          {getCollaboratorHealthSignalLabel(s.code)}
        </span>
      ))}
      {rest > 0 ? (
        <span className="rounded border border-white/12 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
          +{rest}
        </span>
      ) : null}
    </div>
  )
}
