import { useMemo } from 'react'
import type { ConveyorStructure } from '../../../domain/conveyors/conveyor.types'
import type {
  ConveyorOperationalPlanGenerationPreview,
  ConveyorOperationalPlanPayload,
} from '../../../domain/conveyor-operational-plan/conveyor-operational-plan.types'
import type { ConveyorPlanStepOption } from '../../../domain/conveyor-operational-plan/collectConveyorPlanStepOptions'
import {
  CONVEYOR_PLAN_APPROVE_CONFIRM_MESSAGE,
  CONVEYOR_PLAN_SEND_TO_FACTORY_CONFIRM_MESSAGE,
} from '../../../domain/conveyor-operational-plan/conveyorPlanApprovalConfirmations'
import { canEditConveyorOperationalPlanItems } from '../../../domain/conveyor-operational-plan/conveyorOperationalPlanDisplay'
import { summarizeConveyorOperationalPlan } from '../../../domain/conveyor-operational-plan/conveyorPlanSummary'
import { ConveyorOperationalPlanActions } from './ConveyorOperationalPlanActions'
import { ConveyorOperationalPlanHeader } from './ConveyorOperationalPlanHeader'
import { ConveyorOperationalPlanItemsByDate } from './ConveyorOperationalPlanItemsByDate'
import { ConveyorOperationalPlanReviewSummary } from './ConveyorOperationalPlanReviewSummary'
import type { ItemSaveInput } from './ConveyorOperationalPlanItemRow'

type Props = {
  payload: ConveyorOperationalPlanPayload
  structure: ConveyorStructure
  canEdit: boolean
  busy: boolean
  addOpen: boolean
  setAddOpen: (v: boolean) => void
  activityNodeId: string
  setActivityNodeId: (v: string) => void
  plannedDate: string
  setPlannedDate: (v: string) => void
  plannedOrder: number
  setPlannedOrder: (v: number) => void
  plannedMinutes: number | ''
  setPlannedMinutes: (v: number | '') => void
  availableSteps: ConveyorPlanStepOption[]
  setSuccessMessage: (v: string | null) => void
  onApprove: () => void
  onSendToFactory: () => void
  onSaveItem: (itemId: string, input: ItemSaveInput) => Promise<ConveyorOperationalPlanPayload | undefined>
  generateStartDate: string
  setGenerateStartDate: (v: string) => void
  successMessage: string | null
  activeItemsCount: number
  generationPreview: ConveyorOperationalPlanGenerationPreview | null
  previewLoading: boolean
  onDismissGenerationPreview: () => void
  onRequestGenerate: () => void
  onConfirmRegeneration: () => void
  onAddItem: () => void
}

export function ConveyorOperationalPlanBody(props: Props) {
  const {
    payload,
    structure,
    canEdit,
    busy,
    addOpen,
    setAddOpen,
    activityNodeId,
    setActivityNodeId,
    plannedDate,
    setPlannedDate,
    plannedOrder,
    setPlannedOrder,
    plannedMinutes,
    setPlannedMinutes,
    availableSteps,
    setSuccessMessage,
    onApprove,
    onSendToFactory,
    onSaveItem,
    generateStartDate,
    setGenerateStartDate,
    successMessage,
    activeItemsCount,
    generationPreview,
    previewLoading,
    onDismissGenerationPreview,
    onRequestGenerate,
    onConfirmRegeneration,
    onAddItem,
  } = props

  const { plan, items, dailyCapacityMinutes } = payload
  const summary = useMemo(() => summarizeConveyorOperationalPlan(plan, items), [plan, items])
  const canEditItems = canEdit && canEditConveyorOperationalPlanItems(plan.status)

  return (
    <div className="mt-4 space-y-6">
      <ConveyorOperationalPlanHeader
        plan={plan}
        summary={summary}
        dailyCapacityMinutes={dailyCapacityMinutes}
      />

      {successMessage ? (
        <p className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-100">
          {successMessage}
        </p>
      ) : null}

      <ConveyorOperationalPlanReviewSummary items={items} />

      <ConveyorOperationalPlanActions
        plan={plan}
        items={items}
        canEdit={canEdit}
        busy={busy}
        activeItemsCount={activeItemsCount}
        generateStartDate={generateStartDate}
        setGenerateStartDate={setGenerateStartDate}
        generationPreview={generationPreview}
        previewLoading={previewLoading}
        onRequestGenerate={onRequestGenerate}
        onConfirmRegeneration={onConfirmRegeneration}
        onDismissGenerationPreview={onDismissGenerationPreview}
        onApprove={() => {
          if (!window.confirm(CONVEYOR_PLAN_APPROVE_CONFIRM_MESSAGE)) return
          onApprove()
        }}
        onSendToFactory={() => {
          if (!window.confirm(CONVEYOR_PLAN_SEND_TO_FACTORY_CONFIRM_MESSAGE)) return
          onSendToFactory()
        }}
        dailyCapacityMinutes={dailyCapacityMinutes}
        addOpen={addOpen}
        setAddOpen={setAddOpen}
        activityNodeId={activityNodeId}
        setActivityNodeId={setActivityNodeId}
        plannedDate={plannedDate}
        setPlannedDate={setPlannedDate}
        plannedOrder={plannedOrder}
        setPlannedOrder={setPlannedOrder}
        plannedMinutes={plannedMinutes}
        setPlannedMinutes={setPlannedMinutes}
        availableSteps={availableSteps}
        onAddItem={onAddItem}
      />

      <ConveyorOperationalPlanItemsByDate
        items={items}
        structure={structure}
        dailyCapacityMinutes={dailyCapacityMinutes}
        planGeneratedAt={plan.generatedAt}
        canEditItems={canEditItems}
        busy={busy}
        cancelledCount={summary.cancelledItemsCount}
        onSaveItem={async (itemId, input) => {
          const data = await onSaveItem(itemId, input)
          if (data) {
            const msg =
              input.status === 'CANCELLED'
                ? 'Item cancelado.'
                : input.status === 'PLANNED'
                  ? 'Item restaurado.'
                  : 'Item atualizado.'
            setSuccessMessage(msg)
          }
          return data
        }}
      />
    </div>
  )
}
