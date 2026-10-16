import {
  resolveTimeEntryJustificationLines,
  type TimeEntryJustificationSource,
} from '../../domain/operational/timeEntryJustificationDisplay'

type Props = {
  entry: TimeEntryJustificationSource
  /** `dark` para superfícies escuras do app; `light` para tabelas claras e impressão. */
  tone?: 'dark' | 'light'
  className?: string
}

/** Justificativas do apontamento como texto visível (não depende de tooltip/hover). */
export function TimeEntryJustificationNote({ entry, tone = 'dark', className }: Props) {
  const lines = resolveTimeEntryJustificationLines(entry)
  if (lines.length === 0) return null
  const textClass = tone === 'dark' ? 'text-slate-300' : 'text-slate-700'
  return (
    <div className={['mt-1 space-y-0.5 text-[11px] leading-snug', className ?? ''].join(' ')}>
      {lines.map((line) => (
        <p key={line.kind}>
          <span className="font-semibold text-slate-500">{line.label}: </span>
          <span className={textClass}>{line.text}</span>
        </p>
      ))}
    </div>
  )
}
