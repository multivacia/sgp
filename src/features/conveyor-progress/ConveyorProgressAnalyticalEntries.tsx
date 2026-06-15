import { useMemo } from 'react'
import type { TimeEntryAnalyticalItem } from '../../domain/conveyor-progress/conveyorProgress.types'
import { RealizedCell } from './ConveyorProgressMetricsCells'

type Props = {
  entries: readonly TimeEntryAnalyticalItem[]
  indentLevel: number
}

export function ConveyorProgressAnalyticalEntries({ entries, indentLevel }: Props) {
  if (entries.length === 0) {
    return (
      <tr className="border-b border-slate-100 bg-slate-50/50">
        <td
          colSpan={8}
          className="px-3 py-2 text-xs text-slate-500"
          style={{ paddingLeft: `${indentLevel * 1.25 + 2.5}rem` }}
        >
          Nenhum apontamento analítico registrado.
        </td>
      </tr>
    )
  }

  return (
    <>
      <tr className="border-b border-slate-100 bg-slate-50/80">
        <td
          colSpan={8}
          className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
          style={{ paddingLeft: `${indentLevel * 1.25 + 2.5}rem` }}
        >
          Apontamentos analíticos
        </td>
      </tr>
      {entries.map((entry) => (
        <AnalyticalEntryRow key={entry.timeEntryId} entry={entry} indentLevel={indentLevel} />
      ))}
    </>
  )
}

function AnalyticalEntryRow({
  entry,
  indentLevel,
}: {
  entry: TimeEntryAnalyticalItem
  indentLevel: number
}) {
  const dateLabel = useMemo(() => formatEntryDate(entry.entryDate), [entry.entryDate])
  const pad = `${indentLevel * 1.25 + 2.75}rem`

  return (
    <tr className="border-b border-slate-100/80 text-xs text-slate-600 hover:bg-slate-50/60">
      <td className="px-3 py-2" style={{ paddingLeft: pad }}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Apontamento
          </span>
          <span className="tabular-nums text-slate-600">{dateLabel}</span>
          <span className="text-slate-700">{entry.collaboratorName}</span>
          {entry.entryMode ? (
            <span className="rounded border border-slate-200 bg-white px-1.5 py-px text-[9px] font-bold uppercase text-slate-500">
              {entry.entryMode}
            </span>
          ) : null}
        </div>
        {entry.notes ? (
          <p className="mt-0.5 max-w-xl text-[11px] leading-snug text-slate-500">{entry.notes}</p>
        ) : null}
        {entry.executedQuantity != null ? (
          <p className="mt-0.5 text-[11px] text-slate-500">Qtd: {entry.executedQuantity}</p>
        ) : null}
      </td>
      <td className="px-3 py-2 text-slate-400">—</td>
      <td className="px-3 py-2 text-slate-400">—</td>
      <td className="px-3 py-2">
        <RealizedCell minutes={entry.durationMinutes} />
      </td>
      <td className="px-3 py-2 text-slate-400">—</td>
      <td className="px-3 py-2 text-slate-400">—</td>
      <td className="px-3 py-2 text-slate-400">—</td>
      <td className="px-3 py-2" />
    </tr>
  )
}

function formatEntryDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}
