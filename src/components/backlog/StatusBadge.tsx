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

const FALLBACK_STYLE =
  'border-slate-400 bg-slate-100 text-slate-800 ring-1 ring-slate-300'

const NORMALIZED_BACKLOG_STATUS_MAP: Record<string, BacklogStatus> = {
  em_elaboracao: 'em_elaboracao',
  aguardando_planejamento: 'aguardando_planejamento',
  em_planejamento: 'em_planejamento',
  a_iniciar: 'a_iniciar',
  em_andamento: 'em_andamento',
  finalizada: 'finalizada',
  cancelada: 'cancelada',
}

export function normalizeBacklogStatusValue(
  status: BacklogStatus | string,
): BacklogStatus | null {
  const normalized = status.trim().toLowerCase()
  return NORMALIZED_BACKLOG_STATUS_MAP[normalized] ?? null
}

function fallbackStatusLabel(status: string): string {
  const trimmed = status.trim()
  return trimmed.length > 0 ? trimmed : 'Status desconhecido'
}

type Props = {
  status: BacklogStatus | string
}

export function StatusBadge({ status }: Props) {
  const normalizedStatus = normalizeBacklogStatusValue(status)
  const visualStatus = normalizedStatus ?? 'status_desconhecido'
  const badgeClass = normalizedStatus ? styles[normalizedStatus] : FALLBACK_STYLE
  const label = normalizedStatus
    ? BACKLOG_STATUS_LABELS[normalizedStatus]
    : fallbackStatusLabel(status)

  return (
    <span
      data-backlog-status-badge=""
      data-backlog-status={visualStatus}
      data-backlog-status-raw={status}
      className={`sgp-chip transition-colors duration-200 ${badgeClass}`}
    >
      {label}
    </span>
  )
}
