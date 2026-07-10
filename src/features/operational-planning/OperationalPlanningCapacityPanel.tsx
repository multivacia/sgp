import type {
  CollaboratorPlanningCapacitySummary,
  CollaboratorPlanningCapacityStatus,
  OperationalPlanningCapacityPayload,
} from '../../domain/operational-planning/operational-planning.types'
import { formatHumanMinutes } from '../../lib/formatters'

const STATUS_LABELS: Record<CollaboratorPlanningCapacityStatus, string> = {
  SEM_CAPACIDADE_CADASTRADA: 'Sem capacidade cadastrada',
  DISPONIVEL: 'Disponível',
  PROXIMO_DO_LIMITE: 'Próximo do limite',
  ACIMA_DA_CAPACIDADE: 'Acima da capacidade',
  SOBRECARGA_CRITICA: 'Sobrecarga crítica',
}

const STATUS_TONE_CLASSNAME: Record<CollaboratorPlanningCapacityStatus, string> = {
  SEM_CAPACIDADE_CADASTRADA: 'border-rose-400/25 bg-rose-500/10 text-rose-100',
  DISPONIVEL: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100',
  PROXIMO_DO_LIMITE: 'border-amber-400/25 bg-amber-500/10 text-amber-100',
  ACIMA_DA_CAPACIDADE: 'border-orange-400/25 bg-orange-500/10 text-orange-100',
  SOBRECARGA_CRITICA: 'border-rose-400/25 bg-rose-500/15 text-rose-100',
}

function formatOccupancyPct(value: number | null): string {
  if (value == null) return '—'
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  })}%`
}

function formatMetricMinutes(value: number | null): string {
  if (value == null) return '—'
  return formatHumanMinutes(value)
}

function capacityMessage(summary: CollaboratorPlanningCapacitySummary): string | null {
  if (summary.status === 'SEM_CAPACIDADE_CADASTRADA') {
    return 'Sem capacidade cadastrada. Revise a carga horária diária do colaborador.'
  }
  if (
    summary.status === 'ACIMA_DA_CAPACIDADE' ||
    summary.status === 'SOBRECARGA_CRITICA'
  ) {
    return 'Planejamento acima da capacidade. Ainda assim, o plano pode ser salvo e publicado.'
  }
  return null
}

function metricLabel(summary: CollaboratorPlanningCapacitySummary): 'Disponível' | 'Excesso' {
  return summary.overloadMinutes > 0 ? 'Excesso' : 'Disponível'
}

export function OperationalPlanningCapacityPanel(props: {
  capacity: OperationalPlanningCapacityPayload | null | undefined
}) {
  const collaborators = props.capacity?.collaborators ?? []
  if (collaborators.length === 0) return null

  return (
    <section className="mt-8 space-y-4" aria-label="Capacidade e sobrealocação do planejamento">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-100">
            Capacidade e sobrealocação do planejamento
          </h2>
          <p className="mt-1 text-[12px] text-slate-500">
            Colaboradores com ao menos um item ativo atribuído na semana carregada.
          </p>
        </div>
        <p className="text-[12px] text-slate-500">
          {props.capacity?.summary.collaboratorsCount ?? collaborators.length} colaborador(es) ·{' '}
          {formatHumanMinutes(props.capacity?.summary.totalPlannedMinutes ?? 0)} planejados
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {collaborators.map((summary) => {
          const message = capacityMessage(summary)
          const label = STATUS_LABELS[summary.status]
          const overloadOrAvailabilityLabel = metricLabel(summary)
          const overloadOrAvailabilityValue =
            overloadOrAvailabilityLabel === 'Excesso'
              ? summary.overloadMinutes
              : summary.availableMinutes

          return (
            <article
              key={summary.collaboratorId}
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-[14px] font-semibold text-slate-50">
                    {summary.collaboratorName}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-500">{summary.collaboratorId}</p>
                </div>
                <span
                  className={[
                    'inline-flex rounded-full border px-3 py-1 text-[11px] font-medium',
                    STATUS_TONE_CLASSNAME[summary.status],
                  ].join(' ')}
                >
                  {label}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-slate-500">Capacidade</dt>
                  <dd className="mt-1 text-[14px] font-semibold text-slate-50">
                    {formatMetricMinutes(summary.capacityMinutes)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-slate-500">Planejado</dt>
                  <dd className="mt-1 text-[14px] font-semibold text-slate-50">
                    {formatHumanMinutes(summary.plannedMinutes)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-slate-500">
                    {overloadOrAvailabilityLabel}
                  </dt>
                  <dd className="mt-1 text-[14px] font-semibold text-slate-50">
                    {formatMetricMinutes(overloadOrAvailabilityValue)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-slate-500">Ocupação</dt>
                  <dd className="mt-1 text-[14px] font-semibold text-slate-50">
                    {formatOccupancyPct(summary.occupancyPct)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[11px] uppercase tracking-wide text-slate-500">Status</dt>
                  <dd className="mt-1 text-[14px] font-semibold text-slate-50">{label}</dd>
                </div>
              </dl>

              {message ? (
                <p
                  className={[
                    'mt-4 rounded-lg border px-3 py-2 text-[12px] leading-relaxed',
                    summary.status === 'SEM_CAPACIDADE_CADASTRADA'
                      ? 'border-rose-400/25 bg-rose-500/10 text-rose-100'
                      : 'border-orange-400/25 bg-orange-500/10 text-orange-100',
                  ].join(' ')}
                >
                  {message}
                </p>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
