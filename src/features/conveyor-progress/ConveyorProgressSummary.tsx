import type { ConveyorProgressSummaryMetrics } from '../../domain/conveyor-progress/conveyorProgressDisplay'
import {
  formatConveyorProgressDuration,
  formatConveyorProgressPercent,
} from '../../domain/conveyor-progress/conveyorProgressMetrics'
import { ExceededCell, EvolutionColumn } from './ConveyorProgressMetricsCells'

type Props = {
  summary: ConveyorProgressSummaryMetrics
}

export function ConveyorProgressSummary({ summary }: Props) {
  const countLabel =
    summary.conveyorCount === 1
      ? '(1 esteira)'
      : `(${summary.conveyorCount} esteiras)`

  const summaryMetrics = {
    plannedMinutes: summary.plannedMinutes,
    realizedMinutes: summary.realizedMinutes,
    remainingMinutes: summary.remainingMinutes,
    exceededMinutes: summary.exceededMinutes,
    progressPercent: summary.averageProgressPercent,
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
      <span className="font-semibold text-slate-800">
        Resumo geral <span className="font-normal text-slate-500">{countLabel}</span>
      </span>
      <MetricInline label="Previsto" value={formatConveyorProgressDuration(summary.plannedMinutes)} />
      <MetricInline
        label="Realizado"
        value={formatConveyorProgressDuration(summary.realizedMinutes)}
      />
      <MetricInline label="Falta" value={formatConveyorProgressDuration(summary.remainingMinutes)} />
      <span className="flex items-center gap-1.5">
        <span className="text-slate-500">Excedente:</span>
        <ExceededCell minutes={summary.exceededMinutes} />
      </span>
      <span className="flex items-center gap-2">
        <span className="text-slate-500">Evolução média:</span>
        <EvolutionColumn metrics={summaryMetrics} />
      </span>
    </div>
  )
}

function MetricInline({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="text-slate-500">{label}: </span>
      <span className="font-medium tabular-nums text-slate-800">{value}</span>
    </span>
  )
}

export function formatSummaryProgressLabel(summary: ConveyorProgressSummaryMetrics): string {
  return summary.plannedMinutes > 0
    ? formatConveyorProgressPercent(summary.averageProgressPercent)
    : '—'
}
