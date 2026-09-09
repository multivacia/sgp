import { formatPlanningMinutes } from './planningBoardHelpers'
import type { PlanningWeekOperationalSummary } from './planningWeekOperationalSummary'

/** Labels visíveis no Resumo operacional (apresentação). */
export const PLANNING_OPERATIONAL_SUMMARY_VISIBLE_LABELS = [
  'Planejado',
  'Realizado',
  'Concluídas',
  'Em andamento',
  'Sem apontamento',
] as const

/** Cards retirados do Resumo operacional nesta tela (conceitos permanecem no domínio). */
export const PLANNING_OPERATIONAL_SUMMARY_HIDDEN_LABELS = [
  'Atenção',
  'Fora do planejado',
] as const

type PlanningWeekOperationalSummaryBarProps = {
  summary: PlanningWeekOperationalSummary
  filtersActive: boolean
  weekTotalItems: number
}

function SummaryMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-[88px] rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-slate-50">{value}</p>
    </div>
  )
}

export function PlanningWeekOperationalSummaryBar({
  summary,
  filtersActive,
  weekTotalItems,
}: PlanningWeekOperationalSummaryBarProps) {
  return (
    <div className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[12px] font-medium text-slate-400">Resumo operacional</p>
        {filtersActive ? (
          <p className="text-[10px] text-slate-500">
            Resumo da visão filtrada
            {weekTotalItems > 0 ? (
              <>
                {' '}
                · Total da semana: {weekTotalItems} atividades
              </>
            ) : null}
          </p>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <SummaryMetric
          label={PLANNING_OPERATIONAL_SUMMARY_VISIBLE_LABELS[0]}
          value={formatPlanningMinutes(summary.totalPlannedMinutes)}
        />
        <SummaryMetric
          label={PLANNING_OPERATIONAL_SUMMARY_VISIBLE_LABELS[1]}
          value={formatPlanningMinutes(summary.totalRealizedMinutes)}
        />
        <SummaryMetric
          label={PLANNING_OPERATIONAL_SUMMARY_VISIBLE_LABELS[2]}
          value={String(summary.completedItems)}
        />
        <SummaryMetric
          label={PLANNING_OPERATIONAL_SUMMARY_VISIBLE_LABELS[3]}
          value={String(summary.inProgressItems)}
        />
        <SummaryMetric
          label={PLANNING_OPERATIONAL_SUMMARY_VISIBLE_LABELS[4]}
          value={String(summary.withoutTimeEntryItems)}
        />
      </div>
    </div>
  )
}
