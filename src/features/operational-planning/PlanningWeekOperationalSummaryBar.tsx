import { formatPlanningMinutes } from './planningBoardHelpers'
import type { PlanningWeekOperationalSummary } from './planningWeekOperationalSummary'

type PlanningWeekOperationalSummaryBarProps = {
  summary: PlanningWeekOperationalSummary
  filtersActive: boolean
  weekTotalItems: number
  executionOutsidePlanCount?: number
  executionOutsidePlanMinutes?: number
}

function SummaryMetric({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: 'attention'
}) {
  return (
    <div className="min-w-[88px] rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={[
          'mt-0.5 text-[15px] font-semibold tabular-nums',
          highlight === 'attention' ? 'text-amber-200' : 'text-slate-50',
        ].join(' ')}
      >
        {value}
      </p>
    </div>
  )
}


export function PlanningWeekOperationalSummaryBar({
  summary,
  filtersActive,
  weekTotalItems,
  executionOutsidePlanCount,
  executionOutsidePlanMinutes,
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
          label="Planejado"
          value={formatPlanningMinutes(summary.totalPlannedMinutes)}
        />
        <SummaryMetric
          label="Realizado"
          value={formatPlanningMinutes(summary.totalRealizedMinutes)}
        />
        <SummaryMetric label="Concluídas" value={String(summary.completedItems)} />
        <SummaryMetric label="Em andamento" value={String(summary.inProgressItems)} />
        <SummaryMetric
          label="Sem apontamento"
          value={String(summary.withoutTimeEntryItems)}
        />
        <SummaryMetric
          label="Atenção"
          value={String(summary.attentionItems)}
          highlight={summary.attentionItems > 0 ? 'attention' : undefined}
        />
        {(executionOutsidePlanCount ?? 0) > 0 ? (
          <SummaryMetric
            label="Fora do planejado"
            value={`${executionOutsidePlanCount} · ${formatPlanningMinutes(executionOutsidePlanMinutes ?? 0)}`}
            highlight="attention"
          />
        ) : null}
      </div>
    </div>
  )
}
