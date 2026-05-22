import { Link } from 'react-router-dom'
import { formatPlanningMinutes } from './planningBoardHelpers'
import {
  planningDeviationKindLabel,
  type PlanningDeviationItem,
} from './planningDeviationIndicators'
import { resolvePlanningItemOperationalStatusLabel } from './planningExecutionHelpers'
import { weekdayLabelsPt } from './operationalPlanningWeekRange'

function formatPlannedDayLabel(
  plannedDate: string | undefined,
  weekdayDates: readonly string[],
): string | null {
  if (!plannedDate?.trim()) return null
  const labels = weekdayLabelsPt()
  const idx = weekdayDates.indexOf(plannedDate)
  const day = plannedDate.slice(8, 10)
  const month = plannedDate.slice(5, 7)
  if (idx >= 0 && idx < labels.length) {
    return `${labels[idx]} ${day}/${month}`
  }
  return `${day}/${month}`
}

function formatEntryDateTime(iso: string | undefined): string | null {
  if (!iso?.trim()) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type PlanningPrincipalDeviationsPanelProps = {
  deviations: readonly PlanningDeviationItem[]
  weekdayDates: readonly string[]
}

export function PlanningPrincipalDeviationsPanel({
  deviations,
  weekdayDates,
}: PlanningPrincipalDeviationsPanelProps) {
  if (deviations.length === 0) {
    return (
      <div className="mb-4 rounded-xl border border-white/[0.05] bg-white/[0.015] px-4 py-3">
        <p className="text-[12px] font-medium text-slate-400">Principais desvios</p>
        <p className="mt-2 text-[12px] text-slate-500">
          Nenhum desvio relevante na visão atual.
        </p>
      </div>
    )
  }

  return (
    <div className="mb-4 rounded-xl border border-white/[0.05] bg-white/[0.015] px-4 py-3">
      <p className="text-[12px] font-medium text-slate-400">Principais desvios</p>
      <p className="mt-1 text-[10px] text-slate-600">
        Até 10 itens, ordenados por severidade (fora do plano → acima → atingiu sem concluir →
        sem execução).
      </p>
      <ul className="mt-3 space-y-2">
        {deviations.map((deviation) => (
          <li
            key={
              deviation.entryId ??
              `${deviation.kind}-${deviation.conveyorId}-${deviation.activityTitle}-${deviation.plannedDate ?? ''}`
            }
            className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-[12px]"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-medium text-amber-200/90">
                {planningDeviationKindLabel(deviation.kind)}
              </p>
              {deviation.kind === 'OUTSIDE_PLAN' && deviation.outsidePlanMinutes != null ? (
                <p className="shrink-0 font-semibold tabular-nums text-slate-100">
                  {formatPlanningMinutes(deviation.outsidePlanMinutes)}
                </p>
              ) : null}
            </div>
            <p className="mt-1 font-medium text-slate-100">{deviation.conveyorTitle}</p>
            <p className="mt-0.5 text-slate-400">
              {[deviation.taskTitle, deviation.sectorTitle, deviation.activityTitle]
                .filter(Boolean)
                .join(' · ')}
            </p>

            {deviation.kind === 'PLANNED_WITHOUT_EXECUTION' ? (
              <p className="mt-2 text-slate-400">
                {formatPlannedDayLabel(deviation.plannedDate, weekdayDates) ?? '—'}
                {deviation.assigneeName ? ` · ${deviation.assigneeName}` : ' · Sem responsável'}
                {' · '}
                Planejado: {formatPlanningMinutes(deviation.plannedMinutes ?? 0)}
              </p>
            ) : null}

            {deviation.kind === 'OVER_PLANNED' ? (
              <p className="mt-2 text-slate-400">
                Planejado: {formatPlanningMinutes(deviation.plannedMinutes ?? 0)} · Realizado:{' '}
                {formatPlanningMinutes(deviation.realizedMinutes ?? 0)}
                {deviation.differenceMinutes != null && deviation.differenceMinutes > 0
                  ? ` · +${formatPlanningMinutes(deviation.differenceMinutes)}`
                  : null}
              </p>
            ) : null}

            {deviation.kind === 'REACHED_PLANNED_NOT_COMPLETED' ? (
              <p className="mt-2 text-slate-400">
                Planejado: {formatPlanningMinutes(deviation.plannedMinutes ?? 0)} · Realizado:{' '}
                {formatPlanningMinutes(deviation.realizedMinutes ?? 0)}
                {deviation.operationalStatusLabel || deviation.operationalStatus
                  ? ` · Status: ${
                      deviation.operationalStatusLabel ??
                      resolvePlanningItemOperationalStatusLabel(deviation.operationalStatus) ??
                      deviation.operationalStatus
                    }`
                  : null}
              </p>
            ) : null}

            {deviation.kind === 'OUTSIDE_PLAN' ? (
              <p className="mt-2 text-slate-400">
                {deviation.collaboratorName ?? '—'}
                {formatEntryDateTime(deviation.entryAt)
                  ? ` · ${formatEntryDateTime(deviation.entryAt)}`
                  : null}
              </p>
            ) : null}

            <Link
              to={`/esteiras/${deviation.conveyorId}`}
              className="mt-2 inline-block text-[11px] font-medium text-sgp-gold/90 hover:text-sgp-gold"
            >
              Abrir esteira
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
