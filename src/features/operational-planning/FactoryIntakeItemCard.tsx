import type { OperationalPlanningFactoryIntakeItem } from '../../domain/operational-planning/operational-planning.types'
import { formatPlanningMinutes } from './planningBoardHelpers'

type FactoryIntakeItemCardProps = {
  item: OperationalPlanningFactoryIntakeItem
  blocked: boolean
  onAddClick: () => void
}

function formatAssignee(item: OperationalPlanningFactoryIntakeItem): string {
  return (
    item.plannedCollaboratorName ??
    item.plannedTeamName ??
    (item.plannedCollaboratorId || item.plannedTeamId ? '—' : 'Sem responsável')
  )
}

function formatStepStatus(status: string | null): string | null {
  if (!status) return null
  const labels: Record<string, string> = {
    NOT_STARTED: 'Não iniciado',
    IN_PROGRESS: 'Em andamento',
    COMPLETED: 'Concluído',
    BLOCKED: 'Bloqueado',
    CANCELLED: 'Cancelado',
  }
  return labels[status] ?? status
}

export function FactoryIntakeItemCard(props: FactoryIntakeItemCardProps) {
  const { item } = props
  const stepStatus = formatStepStatus(item.activityOperationalStatus)

  return (
    <article className="rounded-lg border border-violet-500/15 bg-violet-500/[0.04] p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-slate-100">
            {item.taskTitle} · {item.sectorTitle}
          </p>
          <p className="truncate text-[12px] text-slate-300">{item.activityTitle}</p>
          {item.plannedDate ? (
            <p className="mt-1 text-[11px] text-slate-500">Sugerido: {item.plannedDate}</p>
          ) : (
            <p className="mt-1 text-[11px] text-slate-600">Sem data sugerida</p>
          )}
          <p className="mt-1 text-[11px] text-slate-500">
            {formatPlanningMinutes(item.plannedMinutes ?? 0)} · {formatAssignee(item)}
          </p>
          {stepStatus ? (
            <p className="mt-1 text-[11px] text-slate-500">STEP: {stepStatus}</p>
          ) : null}
          {item.reviewRequired ? (
            <p className="mt-1 text-[11px] text-amber-400/90">Revisão necessária</p>
          ) : null}
          {(item.realizedMinutes ?? 0) > 0 ? (
            <p className="mt-1 text-[11px] text-emerald-400/80">
              {formatPlanningMinutes(item.realizedMinutes)} realizados
            </p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={props.blocked}
          className="shrink-0 rounded-lg border border-white/[0.10] bg-white/[0.06] px-2 py-1 text-[11px] text-slate-200 disabled:opacity-40"
          onClick={props.onAddClick}
        >
          Adicionar à semana
        </button>
      </div>
    </article>
  )
}
