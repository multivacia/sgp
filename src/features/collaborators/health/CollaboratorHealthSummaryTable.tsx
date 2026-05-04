import type { CollaboratorOperationalHealthSummaryRow } from '../../../domain/collaborator-health/collaboratorOperationalHealth.types'
import {
  formatLastEntryRelativeDays,
  formatMinutesToHoursLabel,
  formatPercentLabel,
  getCollaboratorHealthRiskLabel,
} from '../../../domain/collaborator-health/collaboratorOperationalHealthDisplay'
import { CollaboratorHealthSignalsList } from './CollaboratorHealthSignalsList'
import { CollaboratorHealthStatusBadge } from './CollaboratorHealthStatusBadge'

type Props = {
  rows: CollaboratorOperationalHealthSummaryRow[]
  onOpenDetail: (collaboratorId: string) => void
}

export function CollaboratorHealthSummaryTable({ rows, onOpenDetail }: Props) {
  return (
    <div className="sgp-table-shell overflow-x-auto">
      <table className="min-w-[72rem] w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <th className="px-3 py-3">Colaborador</th>
            <th className="px-3 py-3">Estado</th>
            <th className="px-3 py-3">Risco</th>
            <th className="px-3 py-3">Carga pendente</th>
            <th className="px-3 py-3">Capacidade da janela</th>
            <th className="px-3 py-3">Uso</th>
            <th className="px-3 py-3">Etapas abertas</th>
            <th className="px-3 py-3">Apontamentos recentes</th>
            <th className="px-3 py-3">Último apontamento</th>
            <th className="px-3 py-3">Sinais</th>
            <th className="px-3 py-3 text-right">Detalhe</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const c = row.collaborator
            const ds = row.deterministicStatus
            const rte = row.recentTimeEntries
            const wl = row.workload
            const cap = row.capacity
            const apontLabel = `${formatMinutesToHoursLabel(rte.totalMinutes)} · ${rte.entryCount} reg.`
            return (
              <tr
                key={c.id}
                className="border-b border-white/[0.05] text-slate-200 hover:bg-white/[0.02]"
              >
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-slate-100">{c.fullName}</span>
                    <span className="text-xs text-slate-500">
                      {[c.code ? `Cód. ${c.code}` : null, c.sectorName].filter(Boolean).join(' · ') ||
                        '—'}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <CollaboratorHealthStatusBadge status={ds.status} />
                </td>
                <td className="px-3 py-3 text-slate-300">{getCollaboratorHealthRiskLabel(ds.riskLevel)}</td>
                <td className="px-3 py-3 tabular-nums text-slate-300">
                  {formatMinutesToHoursLabel(wl.pendingOpenMinutes)}
                </td>
                <td className="px-3 py-3 tabular-nums text-slate-300">
                  {formatMinutesToHoursLabel(cap.windowCapacityMinutes)}
                </td>
                <td className="px-3 py-3 tabular-nums text-slate-300">
                  {formatPercentLabel(wl.capacityUsagePercent)}
                </td>
                <td className="px-3 py-3 tabular-nums text-slate-300">{wl.openStepsCount}</td>
                <td className="px-3 py-3 text-xs text-slate-400">{apontLabel}</td>
                <td className="px-3 py-3 text-xs text-slate-400">
                  {formatLastEntryRelativeDays(rte.daysSinceLastEntry)}
                </td>
                <td className="px-3 py-3">
                  <CollaboratorHealthSignalsList signals={row.signals} maxVisible={2} />
                </td>
                <td className="px-3 py-3 text-right">
                  <button
                    type="button"
                    className="text-xs font-semibold text-sgp-gold/95 underline-offset-2 hover:underline"
                    onClick={() => onOpenDetail(c.id)}
                  >
                    Ver detalhe
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
