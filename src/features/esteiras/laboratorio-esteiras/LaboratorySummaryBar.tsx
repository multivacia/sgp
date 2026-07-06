import { formatMinutesToHoursLabel } from '../../../domain/collaborator-health/collaboratorOperationalHealthDisplay'

type Props = {
  matrixCount: number
  activityCount: number
  totalMinutes: number
}

export function LaboratorySummaryBar({ matrixCount, activityCount, totalMinutes }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/[0.08] bg-black/40 p-3">
      <SummaryCell
        icon="layers"
        value={String(matrixCount)}
        label={matrixCount === 1 ? 'matriz selecionada' : 'matrizes selecionadas'}
      />
      <SummaryCell
        icon="clipboard"
        value={String(activityCount)}
        label={activityCount === 1 ? 'atividade' : 'atividades'}
      />
      <SummaryCell
        icon="clock"
        value={formatMinutesToHoursLabel(totalMinutes)}
        label="tempo previsto"
      />
    </div>
  )
}

function SummaryCell({
  icon,
  value,
  label,
}: {
  icon: 'layers' | 'clipboard' | 'clock'
  value: string
  label: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-sgp-gold" aria-hidden>
        {icon === 'layers' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        ) : icon === 'clipboard' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="8" y="2" width="8" height="4" rx="1" />
            <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        )}
      </span>
      <span className="font-heading text-lg font-bold tabular-nums text-white">{value}</span>
      <span className="text-[10px] leading-tight text-slate-400">{label}</span>
    </div>
  )
}
