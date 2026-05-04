import type { AdminCollaborator } from '../../../../domain/collaborators/collaborator.types'
import type { CollaboratorCapacityResolved } from '../../../../domain/operational-capacity'
import { minutesToHoursLabel } from '../../../../features/admin/operational-capacity/operationalCapacity.helpers'

export type CapacityRowModel = {
  collaborator: AdminCollaborator
  resolved: CollaboratorCapacityResolved | null
  failed: boolean
}

function sourceLabel(source: CollaboratorCapacityResolved['source'] | undefined): string {
  switch (source) {
    case 'override':
      return 'Ajuste individual'
    case 'default':
      return 'Padrão global'
    case 'fallback':
      return 'Padrão (fallback)'
    default:
      return '—'
  }
}

type Props = {
  rows: CapacityRowModel[]
  loading: boolean
  emptyMessage?: string
  onEdit: (c: AdminCollaborator) => void
  onRemove: (c: AdminCollaborator) => void
}

export function CollaboratorCapacityOverridesTable({
  rows,
  loading,
  emptyMessage = 'Nenhum colaborador neste filtro.',
  onEdit,
  onRemove,
}: Props) {
  return (
    <div className="mt-4 sgp-table-shell">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr
              className="border-b border-white/[0.08] text-white shadow-inner"
              style={{ background: 'var(--sgp-gradient-header)' }}
            >
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                Colaborador
              </th>
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                Setor
              </th>
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                Padrão (org.)
              </th>
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                Ajuste individual
              </th>
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                Capacidade efetiva
              </th>
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                Origem
              </th>
              <th className="w-40 whitespace-nowrap px-4 py-4 text-right font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  A carregar capacidades…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map(({ collaborator: c, resolved, failed }) => {
                const def =
                  resolved?.defaultDailyMinutes != null
                    ? minutesToHoursLabel(resolved.defaultDailyMinutes)
                    : '—'
                const ov =
                  resolved?.overrideDailyMinutes != null
                    ? minutesToHoursLabel(resolved.overrideDailyMinutes)
                    : '—'
                const eff = resolved
                  ? `${minutesToHoursLabel(resolved.resolvedDailyMinutes)}/dia`
                  : failed
                    ? 'Erro'
                    : '—'

                return (
                  <tr
                    key={c.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 font-medium text-slate-100">{c.fullName}</td>
                    <td className="px-4 py-3 text-slate-400">{c.sectorName ?? '—'}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-300">{def}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-300">{ov}</td>
                    <td className="px-4 py-3 tabular-nums text-emerald-200/90">{eff}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {failed ? 'Indisponível' : sourceLabel(resolved?.source)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-white/12 px-2 py-1 text-[11px] font-bold text-sgp-blue-bright hover:bg-white/[0.04]"
                          onClick={() => onEdit(c)}
                        >
                          Editar
                        </button>
                        {resolved?.source === 'override' ? (
                          <button
                            type="button"
                            className="rounded-md border border-rose-500/30 px-2 py-1 text-[11px] font-bold text-rose-200/90 hover:bg-rose-500/10"
                            onClick={() => onRemove(c)}
                          >
                            Remover
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
