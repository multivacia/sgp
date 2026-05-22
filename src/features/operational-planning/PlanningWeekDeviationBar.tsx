import { formatPlanningMinutes } from './planningBoardHelpers'
import {
  formatPlanningDeviationBalance,
  type PlanningDeviationSummary,
} from './planningDeviationIndicators'

type PlanningWeekDeviationBarProps = {
  summary: PlanningDeviationSummary
  filtersActive: boolean
  outsidePlanFilterNote?: string | null
}

function DeviationMetric({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: 'attention' | 'balance-positive' | 'balance-negative'
}) {
  const valueClass =
    highlight === 'attention'
      ? 'text-amber-200'
      : highlight === 'balance-positive'
        ? 'text-sky-200'
        : highlight === 'balance-negative'
          ? 'text-violet-200'
          : 'text-slate-50'

  return (
    <div className="min-w-[88px] rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={['mt-0.5 text-[15px] font-semibold tabular-nums', valueClass].join(' ')}>
        {value}
      </p>
    </div>
  )
}

export function PlanningWeekDeviationBar({
  summary,
  filtersActive,
  outsidePlanFilterNote,
}: PlanningWeekDeviationBarProps) {
  const balanceHighlight =
    summary.balanceMinutes > 0
      ? 'balance-positive'
      : summary.balanceMinutes < 0
        ? 'balance-negative'
        : undefined

  return (
    <div className="mb-4 rounded-xl border border-white/[0.05] bg-white/[0.015] px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[12px] font-medium text-slate-400">Desvios da semana</p>
        {filtersActive ? (
          <p className="text-[10px] text-slate-500">Indicadores da visão filtrada</p>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <DeviationMetric
          label="Planejado"
          value={formatPlanningMinutes(summary.plannedMinutesTotal)}
        />
        <DeviationMetric
          label="Realizado no plano"
          value={formatPlanningMinutes(summary.realizedPlannedMinutes)}
        />
        <DeviationMetric
          label="Fora do plano"
          value={formatPlanningMinutes(summary.outsidePlanMinutes)}
          highlight={summary.outsidePlanMinutes > 0 ? 'attention' : undefined}
        />
        <DeviationMetric
          label="Saldo"
          value={formatPlanningDeviationBalance(summary.balanceMinutes)}
          highlight={balanceHighlight}
        />
        <DeviationMetric
          label="Sem execução"
          value={String(summary.plannedWithoutExecutionCount)}
          highlight={summary.plannedWithoutExecutionCount > 0 ? 'attention' : undefined}
        />
        <DeviationMetric
          label="Acima do planejado"
          value={String(summary.overPlannedCount)}
          highlight={summary.overPlannedCount > 0 ? 'attention' : undefined}
        />
        <DeviationMetric
          label="Atingiu sem concluir"
          value={String(summary.reachedPlannedNotCompletedCount)}
          highlight={
            summary.reachedPlannedNotCompletedCount > 0 ? 'attention' : undefined
          }
        />
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-slate-600">
        Indicadores de desvio são informativos e não bloqueiam a operação.
        {outsidePlanFilterNote ? ` ${outsidePlanFilterNote}` : null}
      </p>
    </div>
  )
}
