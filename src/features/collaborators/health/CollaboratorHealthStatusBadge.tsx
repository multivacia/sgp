import type { CollaboratorHealthStatus } from '../../../domain/collaborator-health/collaboratorOperationalHealth.types'
import { getCollaboratorHealthStatusLabel } from '../../../domain/collaborator-health/collaboratorOperationalHealthDisplay'

const STYLES: Record<CollaboratorHealthStatus, string> = {
  healthy:
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-200/95',
  attention:
    'border-amber-500/35 bg-amber-500/10 text-amber-100/95',
  critical:
    'border-rose-500/40 bg-rose-500/12 text-rose-100/95',
  unknown:
    'border-white/14 bg-white/[0.06] text-slate-400',
}

type Props = {
  status: CollaboratorHealthStatus
  className?: string
}

export function CollaboratorHealthStatusBadge({ status, className = '' }: Props) {
  const label = getCollaboratorHealthStatusLabel(status)
  const cn = STYLES[status] ?? STYLES.unknown
  return (
    <span
      className={[
        'inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        cn,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
    </span>
  )
}
