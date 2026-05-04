import type { CollaboratorOperationalHealthSummaryTotals } from '../../../domain/collaborator-health/collaboratorOperationalHealth.types'

type CardProps = {
  title: string
  value: string | number
  subtitle?: string
}

function SummaryCard({ title, value, subtitle }: CardProps) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-sgp-app-panel-deep/80 p-4 shadow-inner ring-1 ring-white/[0.04]">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-100">{value}</p>
      {subtitle ? <p className="mt-1 text-xs leading-snug text-slate-500">{subtitle}</p> : null}
    </div>
  )
}

type Props = {
  totals: CollaboratorOperationalHealthSummaryTotals
}

export function CollaboratorHealthSummaryCards({ totals }: Props) {
  const overload = totals.overloaded + totals.criticalOverloaded
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <SummaryCard title="Colaboradores analisados" value={totals.collaboratorsAnalyzed} />
      <SummaryCard
        title="Sobrecarga"
        value={overload}
        subtitle="com carga pendente acima da capacidade da janela"
      />
      <SummaryCard
        title="Baixa ocupação"
        value={totals.lowOccupation}
        subtitle="com pendência e apontamentos recentes abaixo de 15% da capacidade da janela"
      />
      <SummaryCard
        title="Sem apontamento recente"
        value={totals.withoutRecentTimeEntries}
        subtitle="sem registos na janela de dias selecionada"
      />
      <SummaryCard
        title="Sem etapas abertas"
        value={totals.withoutOpenAssignments}
        subtitle="sem etapas abertas atribuídas neste recorte"
      />
      <SummaryCard
        title="Carga via time"
        value={totals.withTeamAssignments}
        subtitle="com etapas alcançadas por membership de equipa"
      />
    </div>
  )
}
