import { useState } from 'react'
import { formatMinutesToHoursLabel } from '../../../domain/collaborator-health/collaboratorOperationalHealthDisplay'
import type { LabActivityItem, LabSectorGroup } from './laboratorioEsteiras.types'
import { MatrixActivityRow } from './MatrixActivityRow'

type Props = {
  group: LabSectorGroup
  index: number
  selectedIds: Set<string>
  activityOverrides: Record<string, { name?: string; plannedMinutes?: number }>
  onToggle: (activityId: string) => void
  onEdit: (activity: LabActivityItem) => void
}

export function MatrixSectorGroup({
  group,
  index,
  selectedIds,
  activityOverrides,
  onToggle,
  onEdit,
}: Props) {
  const [open, setOpen] = useState(true)
  const sectorMinutes = group.activities
    .filter((a) => selectedIds.has(a.id))
    .reduce((n, a) => n + (activityOverrides[a.id]?.plannedMinutes ?? a.plannedMinutes), 0)

  return (
    <section className="rounded-xl border border-white/[0.06] bg-black/25">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-3 text-left"
      >
        <span className="font-heading text-sm font-bold text-sgp-gold">
          {index}. Setor: {group.sectorName}
        </span>
        <span className="ml-auto text-xs tabular-nums text-slate-500">
          {formatMinutesToHoursLabel(sectorMinutes)}
        </span>
        <span className="text-slate-500" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open ? (
        <div className="border-t border-white/[0.04] px-3 pb-2">
          {group.activities.map((act) => (
            <MatrixActivityRow
              key={act.id}
              activity={act}
              included={selectedIds.has(act.id)}
              onToggle={onToggle}
              onEdit={onEdit}
              override={activityOverrides[act.id]}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
