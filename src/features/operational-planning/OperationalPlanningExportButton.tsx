import {
  isOperationalPlanningExportButtonDisabled,
  resolveOperationalPlanningExportButtonLabel,
  type OperationalPlanningExportButtonState,
} from './operationalPlanningExportFlow'

export type { OperationalPlanningExportButtonState } from './operationalPlanningExportFlow'

export type OperationalPlanningExportButtonProps = {
  state: OperationalPlanningExportButtonState
  disabled: boolean
  onClick: () => void
  testId?: string
}

export function OperationalPlanningExportButton(props: OperationalPlanningExportButtonProps) {
  const label = resolveOperationalPlanningExportButtonLabel(props.state)
  const isDisabled = isOperationalPlanningExportButtonDisabled(props)
  return (
    <button
      type="button"
      data-testid={props.testId}
      disabled={isDisabled}
      onClick={props.onClick}
      className="rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-[13px] font-medium text-slate-100 hover:bg-white/[0.09] disabled:opacity-50"
    >
      {label}
    </button>
  )
}
