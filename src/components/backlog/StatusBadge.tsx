import type { BacklogStatus } from '../../mocks/backlog'
import { BACKLOG_STATUS_LABELS } from '../../lib/sgp-semantica-labels'

const styles: Record<BacklogStatus, string> = {
  em_elaboracao:
    'border-white/14 bg-white/[0.07] text-slate-300 ring-1 ring-white/[0.06]',
  aguardando_planejamento:
    'border-sky-400/45 bg-sky-500/18 text-sky-100 ring-1 ring-sky-500/18',
  em_planejamento:
    'border-amber-400/50 bg-amber-500/20 text-amber-100 ring-1 ring-amber-500/22',
  a_iniciar:
    'border-sgp-blue-bright/50 bg-sgp-blue/28 text-sky-100 ring-1 ring-sgp-blue/22',
  em_andamento:
    'border-white/12 bg-sgp-navy/55 text-slate-100 ring-1 ring-white/[0.08]',
  finalizada:
    'border-emerald-400/45 bg-emerald-500/16 text-emerald-50 ring-1 ring-emerald-500/18',
  cancelada:
    'border-rose-400/40 bg-rose-500/14 text-rose-100 ring-1 ring-rose-500/18',
}

type Props = {
  status: BacklogStatus
}

export function StatusBadge({ status }: Props) {
  return (
    <span
      data-backlog-status-badge=""
      data-backlog-status={status}
      className={`sgp-chip transition-colors duration-200 ${styles[status]}`}
    >
      {BACKLOG_STATUS_LABELS[status]}
    </span>
  )
}
