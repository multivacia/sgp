import { Link } from 'react-router-dom'
import { labelConveyorOperationalPlanFactoryStatus } from '../../domain/conveyor-operational-plan/conveyorOperationalPlanDisplay'
import type { ConveyorOperationalPlanFactoryStatus } from '../../domain/conveyor-operational-plan/conveyor-operational-plan.types'
import type { OperationalPlanningFactoryIntakeItem } from '../../domain/operational-planning/operational-planning.types'
import { formatFactoryIntakeSuggestedPeriod } from './factoryIntakeGrouping'
import { FactoryIntakeItemCard } from './FactoryIntakeItemCard'
import {
  FACTORY_INTAKE_QUEUE_VISUAL_BADGE_CLASS,
  labelFactoryIntakeOperationalPlanStatus,
  labelFactoryIntakeQueueVisualState,
  summarizeFactoryIntakeQueueGroup,
  type FactoryIntakeQueueGroup,
} from './factoryIntakeQueue'
import { formatPlanningMinutes } from './planningBoardHelpers'

type FactoryIntakeConveyorGroupProps = {
  group: FactoryIntakeQueueGroup
  plannedActivityIds: ReadonlySet<string>
  onAddItem: (item: OperationalPlanningFactoryIntakeItem) => void
}

function factoryStatusLabel(status: string | null): string | null {
  if (!status) return null
  return labelConveyorOperationalPlanFactoryStatus(status as ConveyorOperationalPlanFactoryStatus)
}

export function FactoryIntakeConveyorGroup(props: FactoryIntakeConveyorGroupProps) {
  const { group } = props
  const summary = summarizeFactoryIntakeQueueGroup(group, group.queue)
  const suggestedPeriod = formatFactoryIntakeSuggestedPeriod(summary)
  const factoryLabel = factoryStatusLabel(group.factoryPlanningStatus)
  const planLabel = labelFactoryIntakeOperationalPlanStatus(group.operationalPlanStatus)
  const visualLabel = labelFactoryIntakeQueueVisualState(group.queue.visualState)
  const progress = group.queue.planProgress
  const esteiraUrl = `/app/esteiras/${group.conveyorId}`

  return (
    <section className="rounded-xl border border-violet-500/25 bg-violet-500/[0.05] p-3">
      <header className="border-b border-violet-500/15 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-[14px] font-semibold text-slate-50">{group.conveyorName}</p>
              <span
                className={[
                  'inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
                  FACTORY_INTAKE_QUEUE_VISUAL_BADGE_CLASS[group.queue.visualState],
                ].join(' ')}
              >
                {visualLabel}
              </span>
            </div>
            {planLabel ? (
              <p className="text-[11px] text-slate-400">Plano da esteira: {planLabel}</p>
            ) : null}
            {factoryLabel ? (
              <p className="text-[11px] text-violet-200/90">Fábrica: {factoryLabel}</p>
            ) : null}
            <p className="text-[11px] text-slate-500">Responsável atual: Gestor da Fábrica</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Link
              to={esteiraUrl}
              className="rounded-lg border border-white/[0.10] bg-white/[0.06] px-2.5 py-1 text-[11px] text-slate-200 hover:bg-white/[0.09]"
            >
              Ver esteira
            </Link>
            <Link
              to={esteiraUrl}
              className="rounded-lg border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-100 hover:bg-violet-500/15"
            >
              Ver plano operacional
            </Link>
          </div>
        </div>

        {progress ? (
          <div className="mt-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
              <span>
                Encaixe: {progress.linkedPlanItems}/{progress.totalPlanItems} itens
                {progress.fittedPercent != null ? ` (${progress.fittedPercent}%)` : ''}
              </span>
              <span>{progress.pendingPlanItems} ainda aguardando no plano</span>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
              role="progressbar"
              aria-valuenow={progress.fittedPercent ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
            >
                            <div className="h-full rounded-full bg-violet-400/70 transition-[width]" style={{ width: `${progress.fittedPercent ?? 0}%` }} />
            </div>
          </div>
        ) : null}

        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
          <li>
            {summary.itemCount} {summary.itemCount === 1 ? 'item' : 'itens'} aguardando
          </li>
          <li>{formatPlanningMinutes(summary.waitingMinutes)} aguardando</li>
          {suggestedPeriod ? <li>Período sugerido: {suggestedPeriod}</li> : null}
          {summary.reviewCount > 0 ? (
            <li className="text-amber-400/90">
              {summary.reviewCount} {summary.reviewCount === 1 ? 'revisão' : 'revisões'}
            </li>
          ) : null}
          {summary.executedCount > 0 ? (
            <li className="text-emerald-400/80">
              {summary.executedCount} com apontamento parcial
            </li>
          ) : null}
          {group.queue.draftInWeekCount > 0 ? (
            <li className="text-sky-300/90">
              {group.queue.draftInWeekCount}{' '}
              {group.queue.draftInWeekCount === 1 ? 'item' : 'itens'} no rascunho desta semana
            </li>
          ) : null}
          {group.queue.weekSyncDivergenceCount > 0 ? (
            <li className="text-amber-400/90">
              {group.queue.weekSyncDivergenceCount} pendência
              {group.queue.weekSyncDivergenceCount === 1 ? '' : 's'} de sincronização na semana
            </li>
          ) : null}
        </ul>
      </header>

      <div className="mt-3 space-y-2">
        {group.items.map((item) => (
          <FactoryIntakeItemCard
            key={item.conveyorOperationalPlanItemId}
            item={item}
            blocked={props.plannedActivityIds.has(item.activityNodeId)}
            onAddClick={() => props.onAddItem(item)}
          />
        ))}
      </div>
    </section>
  )
}
