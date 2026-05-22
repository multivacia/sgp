import type { OperationalPlanningPlanItem } from '../../domain/operational-planning/operational-planning.types'
import type { PlanningCardActionItem } from './planningCardActions'
import { PlanningItemQuickActions } from './PlanningItemQuickActions'
import { PlanningPlanCardExecution } from './PlanningPlanCardExecution'
import { PlanningSyncBadge } from './PlanningSyncBadge'

export type PlanningDailyPlanCardItem = PlanningCardActionItem & {
  localKey: string
  plannedDate: string
  assignedCollaboratorId: string
  assignedCollaboratorName: string | null
  isOutOfSequence?: boolean
  syncStatus?: OperationalPlanningPlanItem['syncStatus']
  syncDifferences?: OperationalPlanningPlanItem['syncDifferences']
}

type PlanningDailyPlanCardProps = {
  item: PlanningDailyPlanCardItem
  plannedDateLabel: string
  backlogExecutionLookup: ReadonlyMap<string, number>
  canAlterConveyor: boolean
  actionBusy: boolean
  onPointTime: () => void
  onComplete: () => void
  onReopen: () => void
  onPrintTicket?: () => void
}

export function PlanningDailyPlanCard(props: PlanningDailyPlanCardProps) {
  const { item } = props
  const assigneeLabel =
    item.assignedCollaboratorName?.trim() || 'Sem responsável'

  return (
    <article className="rounded-lg border border-white/[0.08] bg-white/[0.05] p-2.5 text-[11px] ring-1 ring-white/[0.03]">
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-500">
          {item.conveyorTitle}
        </p>
        <p className="mt-0.5 truncate text-[12px] font-semibold text-slate-50">
          {item.activityTitle}
        </p>
        <p className="mt-1 truncate text-[10px] text-slate-500">
          {item.sectorTitle} · {item.taskTitle}
        </p>
        <p className="mt-1 truncate text-[10px] text-slate-400">
          {assigneeLabel} · {props.plannedDateLabel}
        </p>
      </div>
      <PlanningPlanCardExecution
        item={item}
        backlogExecutionLookup={props.backlogExecutionLookup}
        compact
      />
      {item.syncStatus === 'DIVERGED' ? (
        <div className="mt-1.5">
          <PlanningSyncBadge syncDifferences={item.syncDifferences} />
        </div>
      ) : null}
      {item.isOutOfSequence ? (
        <p className="mt-1.5 text-[10px] font-medium text-amber-200/90">Fora de sequência</p>
      ) : null}
      <PlanningItemQuickActions
        item={item}
        canAlterConveyor={props.canAlterConveyor}
        actionBusy={props.actionBusy}
        onPointTime={props.onPointTime}
        onComplete={props.onComplete}
        onReopen={props.onReopen}
        onPrintTicket={props.onPrintTicket}
        className="mt-2"
      />
    </article>
  )
}
