import type {
  ConveyorOperationalPlan,
  ConveyorOperationalPlanItem,
} from '../../../domain/conveyor-operational-plan/conveyor-operational-plan.types'
import { CONVEYOR_PLAN_APPROVAL_CHECKLIST_FOOTNOTE } from '../../../domain/conveyor-operational-plan/conveyorPlanApprovalConfirmations'
import {
  approvalChecklistLevelClass,
  approvalChecklistLevelSymbol,
  summarizeConveyorOperationalPlanApprovalReadiness,
} from '../../../domain/conveyor-operational-plan/conveyorPlanApprovalReadiness'

type Props = {
  plan: ConveyorOperationalPlan
  items: ConveyorOperationalPlanItem[]
  dailyCapacityMinutes: number
}

export function ConveyorOperationalPlanApprovalChecklist({
  plan,
  items,
  dailyCapacityMinutes,
}: Props) {
  const readiness = summarizeConveyorOperationalPlanApprovalReadiness(
    plan,
    items,
    dailyCapacityMinutes,
  )

  return (
    <section
      className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
      aria-label="Checklist para aprovação"
    >
      <div>
        <h3 className="text-[13px] font-semibold text-slate-200">Checklist para aprovação</h3>
        <p className="mt-1 text-[11px] text-slate-500">{CONVEYOR_PLAN_APPROVAL_CHECKLIST_FOOTNOTE}</p>
      </div>

      <ul className="space-y-2">
        {readiness.checklist.map((entry) => (
          <li
            key={entry.id}
            className={`flex gap-2 text-[12px] leading-snug ${approvalChecklistLevelClass(entry.level)}`}
          >
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-current/25 text-[10px] font-bold"
              aria-hidden
            >
              {approvalChecklistLevelSymbol(entry.level)}
            </span>
            <span>
              <span className="text-slate-200">{entry.label}</span>
              {entry.detail ? (
                <span className="mt-0.5 block text-[11px] opacity-80">{entry.detail}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
