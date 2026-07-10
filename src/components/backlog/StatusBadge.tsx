import type { BacklogStatus } from '../../mocks/backlog'
import { BACKLOG_STATUS_LABELS } from '../../lib/sgp-semantica-labels'

const styles: Record<BacklogStatus, string> = {
  em_elaboracao:
    'border-slate-300 bg-slate-100 text-slate-800 ring-1 ring-slate-300',
  aguardando_planejamento:
    'border-sky-300 bg-sky-50 text-sky-800 ring-1 ring-sky-200',
  em_planejamento:
    'border-amber-400 bg-amber-100 text-amber-900 ring-1 ring-amber-300',
  a_iniciar:
    'border-indigo-300 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200',
  em_andamento:
    'border-teal-300 bg-teal-50 text-teal-800 ring-1 ring-teal-200',
  finalizada:
    'border-emerald-300 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200',
  cancelada:
    'border-rose-300 bg-rose-50 text-rose-800 ring-1 ring-rose-200',
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
