import type { ConveyorProgressSummaryMetrics } from '../../domain/conveyor-progress/conveyorProgressDisplay'
import type { ConveyorProgressItem } from '../../domain/conveyor-progress/conveyorProgress.types'
import {
  formatConveyorProgressDuration,
  formatConveyorProgressPercent,
} from '../../domain/conveyor-progress/conveyorProgressMetrics'
import { labelConveyorOperationalStatus } from '../../domain/conveyors/conveyorOperationalStatus'
import type { ConveyorOperationalStatus } from '../../domain/conveyors/conveyor.types'
import { resolvePlanningItemOperationalStatusLabel } from '../operational-planning/planningExecutionHelpers'
import type { ConveyorProgressFiltersState } from './ConveyorProgressFilters'

type Props = {
  items: ConveyorProgressItem[]
  generatedAt: string
  summary: ConveyorProgressSummaryMetrics
  appliedFilters?: ConveyorProgressFiltersState
}

export function ConveyorProgressPrintView({
  items,
  generatedAt,
  summary,
  appliedFilters,
}: Props) {
  return (
    <div className="conveyor-progress-print-root hidden print:block">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .conveyor-progress-print-root, .conveyor-progress-print-root * { visibility: visible; }
          .conveyor-progress-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 12px 16px;
            font-family: system-ui, sans-serif;
            font-size: 10px;
            color: #111;
            background: #fff;
          }
          .conveyor-progress-print-root table { page-break-inside: auto; }
          .conveyor-progress-print-root tr { page-break-inside: avoid; }
          .conveyor-progress-print-root section { page-break-inside: avoid; margin-bottom: 16px; }
        }
      `}</style>

      <header className="mb-4 border-b border-gray-300 pb-3">
        <h1 className="text-lg font-bold">Evolução das Esteiras</h1>
        <p className="mt-1 text-gray-600">Gerado em: {generatedAt}</p>
        {appliedFilters ? (
          <p className="mt-1 text-gray-500">{describeAppliedFilters(appliedFilters)}</p>
        ) : null}
      </header>

      <div className="mb-4 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700">
        <strong>Resumo geral</strong> ({summary.conveyorCount}{' '}
        {summary.conveyorCount === 1 ? 'esteira' : 'esteiras'}) · Previsto:{' '}
        {formatConveyorProgressDuration(summary.plannedMinutes)} · Realizado:{' '}
        {formatConveyorProgressDuration(summary.realizedMinutes)} · Falta:{' '}
        {formatConveyorProgressDuration(summary.remainingMinutes)} · Excedente:{' '}
        {summary.exceededMinutes > 0
          ? `+${formatConveyorProgressDuration(summary.exceededMinutes)}`
          : '—'}{' '}
        · Evolução média:{' '}
        {summary.plannedMinutes > 0
          ? formatConveyorProgressPercent(summary.averageProgressPercent)
          : '—'}
      </div>

      {items.map((conveyor) => (
        <section key={conveyor.conveyorId} className="mb-6">
          <PrintTableForConveyor conveyor={conveyor} />
        </section>
      ))}
    </div>
  )
}

function PrintTableForConveyor({ conveyor }: { conveyor: ConveyorProgressItem }) {
  const statusLabel = labelConveyorOperationalStatus(
    conveyor.operationalStatus as ConveyorOperationalStatus,
  )

  return (
    <table className="mb-2 w-full border-collapse text-[10px]">
      <thead>
        <tr className="border-b border-gray-300 text-left text-[9px] uppercase text-gray-500">
          <th className="py-1 pr-2">Item</th>
          <th className="py-1 pr-2">Status</th>
          <th className="py-1 pr-2">Previsto</th>
          <th className="py-1 pr-2">Realizado</th>
          <th className="py-1 pr-2">Falta</th>
          <th className="py-1 pr-2">Excedente</th>
          <th className="py-1">Evolução</th>
        </tr>
      </thead>
      <tbody>
        <PrintMetricsRow
          indent={0}
          level="Esteira"
          name={`${conveyor.conveyorCode ? `[${conveyor.conveyorCode}] ` : ''}${conveyor.conveyorName}`}
          status={statusLabel}
          metrics={conveyor}
        />
        {conveyor.tasks.flatMap((task) => [
          <PrintMetricsRow
            key={task.taskId}
            indent={1}
            level="Tarefa"
            name={task.taskName}
            status="—"
            metrics={task}
          />,
          ...task.sectors.flatMap((sector) => [
            <PrintMetricsRow
              key={sector.sectorId}
              indent={2}
              level="Setor"
              name={sector.sectorName}
              status="—"
              metrics={sector}
            />,
            ...sector.activities.flatMap((activity) => [
              <PrintMetricsRow
                key={activity.activityId}
                indent={3}
                level="Atividade"
                name={`${activity.activityName}${activity.collaboratorName ? ` · ${activity.collaboratorName}` : ''}`}
                status={
                  resolvePlanningItemOperationalStatusLabel(activity.status) ??
                  activity.status
                }
                metrics={activity}
              />,
              ...(activity.timeEntries.length > 0
                ? [
                    <tr key={`${activity.activityId}-hdr`} className="bg-gray-50">
                      <td
                        colSpan={7}
                        className="py-1 font-semibold uppercase text-gray-500"
                        style={{ paddingLeft: '4.5rem' }}
                      >
                        Apontamentos analíticos
                      </td>
                    </tr>,
                    ...activity.timeEntries.map((te) => (
                      <tr key={te.timeEntryId} className="border-b border-gray-100">
                        <td className="py-1" style={{ paddingLeft: '5rem' }}>
                          {formatPrintDate(te.entryDate)} · {te.collaboratorName}
                          {te.notes ? ` · ${te.notes}` : ''}
                        </td>
                        <td className="py-1">—</td>
                        <td className="py-1">—</td>
                        <td className="py-1">
                          {formatConveyorProgressDuration(te.durationMinutes)}
                        </td>
                        <td className="py-1">—</td>
                        <td className="py-1">—</td>
                        <td className="py-1">—</td>
                      </tr>
                    )),
                  ]
                : []),
            ]),
          ]),
        ])}
      </tbody>
    </table>
  )
}

function PrintMetricsRow({
  indent,
  level,
  name,
  status,
  metrics,
}: {
  indent: number
  level: string
  name: string
  status: string
  metrics: {
    plannedMinutes: number
    realizedMinutes: number
    remainingMinutes: number
    exceededMinutes: number
    progressPercent: number
  }
}) {
  return (
    <tr className="border-b border-gray-200">
      <td className="py-1" style={{ paddingLeft: `${indent * 1.25 + 0.5}rem` }}>
        <span className="text-gray-400">{level}: </span>
        {name}
      </td>
      <td className="py-1">{status}</td>
      <td className="py-1">{formatConveyorProgressDuration(metrics.plannedMinutes)}</td>
      <td className="py-1">{formatConveyorProgressDuration(metrics.realizedMinutes)}</td>
      <td className="py-1">{formatConveyorProgressDuration(metrics.remainingMinutes)}</td>
      <td className="py-1">
        {metrics.exceededMinutes > 0
          ? `+${formatConveyorProgressDuration(metrics.exceededMinutes)}`
          : '—'}
      </td>
      <td className="py-1">
        {metrics.plannedMinutes > 0
          ? formatConveyorProgressPercent(metrics.progressPercent)
          : '—'}
      </td>
    </tr>
  )
}

function formatPrintDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function describeAppliedFilters(filters: ConveyorProgressFiltersState): string {
  const parts: string[] = []
  if (filters.search) parts.push(`Esteira: ${filters.search}`)
  if (filters.operationalStatus) parts.push(`Status: ${filters.operationalStatus}`)
  if (filters.timeEntryFrom || filters.timeEntryTo) {
    parts.push(`Período: ${filters.timeEntryFrom || '…'} – ${filters.timeEntryTo || '…'}`)
  }
  if (filters.collaboratorId) parts.push('Colaborador filtrado')
  if (filters.onlyExceeded) parts.push('Somente excedidas')
  return parts.length > 0 ? `Filtros: ${parts.join(' · ')}` : ''
}
