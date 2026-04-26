import type { BacklogStatus } from '../../mocks/backlog'
import { BACKLOG_STATUS_LABELS } from '../../lib/sgp-semantica-labels'

const styles: Record<BacklogStatus, string> = {
  no_backlog:
    'border-white/14 bg-white/[0.07] text-slate-300 ring-1 ring-white/[0.06]',
  em_revisao:
    'border-amber-400/45 bg-amber-500/18 text-amber-50 ring-1 ring-amber-500/18',
  pronta_liberar:
    'border-sgp-blue-bright/50 bg-sgp-blue/28 text-sky-100 ring-1 ring-sgp-blue/22',
  em_producao:
    'border-white/12 bg-sgp-navy/55 text-slate-100 ring-1 ring-white/[0.08]',
  concluida:
    'border-emerald-400/45 bg-emerald-500/16 text-emerald-50 ring-1 ring-emerald-500/18',
}

type Props = {
  status: BacklogStatus
}

export function StatusBadge({ status }: Props) {
  return (
    <span
      className={`sgp-chip transition-colors duration-200 ${styles[status]}`}
    >
      {BACKLOG_STATUS_LABELS[status]}
    </span>
  )
}
