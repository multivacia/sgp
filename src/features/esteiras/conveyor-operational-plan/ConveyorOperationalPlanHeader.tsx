import type { ReactNode } from 'react'
import type { ConveyorOperationalPlan } from '../../../domain/conveyor-operational-plan/conveyor-operational-plan.types'
import {
  CONVEYOR_OPERATIONAL_PLAN_FACTORY_STATUS_LABELS,
  CONVEYOR_PLAN_STATUS_BADGE_CLASS,
  formatConveyorOperationalPlanPeriod,
  formatConveyorPlanGeneratedAt,
  getConveyorOperationalPlanStateMessage,
  labelConveyorOperationalPlanStatus,
} from '../../../domain/conveyor-operational-plan/conveyorOperationalPlanDisplay'
import type { ConveyorOperationalPlanSummary } from '../../../domain/conveyor-operational-plan/conveyorPlanSummary'
import { formatConveyorPlanCurrentResponsibility } from '../../../domain/conveyor-operational-plan/conveyorPlanResponsibility'
import { formatMinutosHumanos } from '../../../lib/formatters'
import { ConveyorPlanBadge } from './ConveyorPlanBadge'

type Props = {
  plan: ConveyorOperationalPlan
  summary: ConveyorOperationalPlanSummary
  dailyCapacityMinutes: number
}

export function ConveyorOperationalPlanHeader({ plan, summary, dailyCapacityMinutes }: Props) {
  const generatedLabel = formatConveyorPlanGeneratedAt(plan.generatedAt)
  const stateMessage = getConveyorOperationalPlanStateMessage(plan.status, summary)

  return (
    <header className="space-y-4 border-b border-white/[0.08] pb-5">
      <div>
        <h2 className="text-base font-semibold text-slate-100">Plano Operacional da Esteira</h2>
        <p className="mt-1 text-[12px] text-slate-500">
          Trajeto previsto do início ao fim desta esteira antes do encaixe na agenda da fábrica.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ConveyorPlanBadge
          label={labelConveyorOperationalPlanStatus(plan.status)}
          className={CONVEYOR_PLAN_STATUS_BADGE_CLASS[plan.status]}
        />
        {plan.factoryPlanningStatus ? (
          <ConveyorPlanBadge
            label={
              CONVEYOR_OPERATIONAL_PLAN_FACTORY_STATUS_LABELS[plan.factoryPlanningStatus]
            }
            className="border-white/10 bg-white/[0.04] text-slate-400"
          />
        ) : null}
      </div>

      <p className="text-[13px] leading-relaxed text-slate-300">{stateMessage}</p>

      <p className="text-[12px] font-medium text-sgp-gold/90">
        {formatConveyorPlanCurrentResponsibility(plan)}
      </p>

      <dl className="grid gap-3 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Período planejado">
          {formatConveyorOperationalPlanPeriod(plan.plannedStartDate, plan.plannedEndDate)}
        </Metric>
        <Metric label="Itens ativos">{summary.activeItemsCount}</Metric>
        <Metric label="Minutos planejados">
          {formatMinutosHumanos(summary.totalPlannedMinutes)}
        </Metric>
        <Metric label="Capacidade diária">{dailyCapacityMinutes} min</Metric>
        {summary.firstPlannedDate && summary.lastPlannedDate ? (
          <Metric label="Datas nos itens" className="sm:col-span-2">
            {summary.firstPlannedDate}
            {summary.firstPlannedDate !== summary.lastPlannedDate
              ? ` → ${summary.lastPlannedDate}`
              : ''}
          </Metric>
        ) : null}
        {generatedLabel ? <Metric label="Última geração">{generatedLabel}</Metric> : null}
      </dl>
    </header>
  )
}

function Metric({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-slate-100">{children}</dd>
    </div>
  )
}
