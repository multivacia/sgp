import { Link } from 'react-router-dom'
import type {
  ConveyorOperationalPlan,
  ConveyorOperationalPlanGenerationPreview,
  ConveyorOperationalPlanItem,
} from '../../../domain/conveyor-operational-plan/conveyor-operational-plan.types'
import type { ConveyorPlanStepOption } from '../../../domain/conveyor-operational-plan/collectConveyorPlanStepOptions'
import { summarizeConveyorOperationalPlanApprovalReadiness } from '../../../domain/conveyor-operational-plan/conveyorPlanApprovalReadiness'
import {
  CONVEYOR_PLAN_FIRST_GENERATION_INTRO,
  CONVEYOR_PLAN_REGENERATION_INTRO,
  isConveyorPlanRegeneration,
  labelGenerateConveyorPlanItemsButton,
} from '../../../domain/conveyor-operational-plan/conveyorPlanGenerationPreviewDisplay'
import {
  canEditConveyorOperationalPlanItems,
  showApproveConveyorOperationalPlanButton,
  showFactoryPlanningFollowUpLink,
  showGenerateConveyorOperationalPlanItemsButton,
  showSendToFactoryConveyorOperationalPlanButton,
  showWaitingFactoryPlanningMessage,
} from '../../../domain/conveyor-operational-plan/conveyorOperationalPlanDisplay'
import { ConveyorOperationalPlanApprovalChecklist } from './ConveyorOperationalPlanApprovalChecklist'
import { ConveyorOperationalPlanGenerationPreviewPanel } from './ConveyorOperationalPlanGenerationPreviewPanel'

type Props = {
  plan: ConveyorOperationalPlan
  items: ConveyorOperationalPlanItem[]
  canEdit: boolean
  busy: boolean
  activeItemsCount: number
  generateStartDate: string
  setGenerateStartDate: (v: string) => void
  generationPreview: ConveyorOperationalPlanGenerationPreview | null
  previewLoading: boolean
  onRequestGenerate: () => void
  onConfirmRegeneration: () => void
  onDismissGenerationPreview: () => void
  onApprove: () => void
  onSendToFactory: () => void
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
  onAddItem: () => void
  dailyCapacityMinutes: number
}

export function ConveyorOperationalPlanActions(props: Props) {
  const {
    plan,
    items,
    canEdit,
    busy,
    activeItemsCount,
    generateStartDate,
    setGenerateStartDate,
    generationPreview,
    previewLoading,
    onRequestGenerate,
    onConfirmRegeneration,
    onDismissGenerationPreview,
    onApprove,
    onSendToFactory,
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
    onAddItem,
    dailyCapacityMinutes,
  } = props

  const isRegeneration = isConveyorPlanRegeneration(activeItemsCount)
  const approvalReadiness = summarizeConveyorOperationalPlanApprovalReadiness(
    plan,
    items,
    dailyCapacityMinutes,
  )
  const approveAllowed = approvalReadiness.canApprove
  const canEditItems = canEdit && canEditConveyorOperationalPlanItems(plan.status)
  const showGenerate = canEdit && showGenerateConveyorOperationalPlanItemsButton(plan.status)
  const showApprove = canEdit && showApproveConveyorOperationalPlanButton(plan.status)
  const showSend = canEdit && showSendToFactoryConveyorOperationalPlanButton(plan.status)
  const showWaiting = showWaitingFactoryPlanningMessage(plan.status)
  const showFactoryLink = showFactoryPlanningFollowUpLink(plan.status)

  const hasPrimaryAction = showGenerate || showApprove || showSend

  if (!hasPrimaryAction && !canEditItems && !showWaiting && !showFactoryLink) {
    return null
  }

  return (
    <section
      className="space-y-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
      aria-label="Ações do plano"
    >
      <h3 className="text-[13px] font-semibold text-slate-200">Ações</h3>

      {showWaiting ? (
        <p className="rounded-lg border border-sky-400/25 bg-sky-500/10 px-3 py-2 text-[13px] text-sky-100">
          Aguardando encaixe no Planejamento da Fábrica. O gestor da fábrica precisa encaixar as
          atividades na agenda semanal — não há ações pendentes para o gestor da esteira neste card.
        </p>
      ) : null}

      {showFactoryLink ? (
        <p className="text-[13px] text-slate-400">
          <Link
            to="/app/planejamento-semanal"
            className="font-medium text-sgp-gold hover:underline"
          >
            Abrir Planejamento da Semana
          </Link>
          {' '}
          para ver o encaixe na agenda.
        </p>
      ) : null}

      {showGenerate ? (
        <GenerateBlock
          isRegeneration={isRegeneration}
          generateStartDate={generateStartDate}
          setGenerateStartDate={setGenerateStartDate}
          busy={busy}
          previewLoading={previewLoading}
          activeItemsCount={activeItemsCount}
          generationPreview={generationPreview}
          onRequestGenerate={onRequestGenerate}
          onConfirmRegeneration={onConfirmRegeneration}
          onDismissGenerationPreview={onDismissGenerationPreview}
        />
      ) : null}

      {canEditItems ? (
        <AddItemBlock
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
          busy={busy}
          onAddItem={onAddItem}
        />
      ) : null}

      {showApprove ? (
        <ConveyorOperationalPlanApprovalChecklist
          plan={plan}
          items={items}
          dailyCapacityMinutes={dailyCapacityMinutes}
        />
      ) : null}

      {(showApprove || showSend) && (
        <footer className="flex flex-wrap gap-2 border-t border-white/[0.08] pt-4">
          {showApprove ? (
            <button
              type="button"
              disabled={busy || !approveAllowed}
              title={
                !approveAllowed && approvalReadiness.blockers.length > 0
                  ? approvalReadiness.blockers.join(' ')
                  : undefined
              }
              className="rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-4 py-2 text-[13px] font-medium text-emerald-50 hover:bg-emerald-500/25 disabled:opacity-50"
              onClick={onApprove}
            >
              Aprovar plano
            </button>
          ) : null}
          {showSend ? (
            <button
              type="button"
              disabled={busy}
              className="rounded-xl border border-sgp-gold/35 bg-sgp-gold/15 px-4 py-2 text-[13px] font-medium text-slate-50 hover:bg-sgp-gold/25 disabled:opacity-50"
              onClick={onSendToFactory}
            >
              Enviar para planejamento da fábrica
            </button>
          ) : null}
        </footer>
      )}
    </section>
  )
}

function GenerateBlock({
  isRegeneration,
  generateStartDate,
  setGenerateStartDate,
  busy,
  previewLoading,
  activeItemsCount,
  generationPreview,
  onRequestGenerate,
  onConfirmRegeneration,
  onDismissGenerationPreview,
}: {
  isRegeneration: boolean
  generateStartDate: string
  setGenerateStartDate: (v: string) => void
  busy: boolean
  previewLoading: boolean
  activeItemsCount: number
  generationPreview: ConveyorOperationalPlanGenerationPreview | null
  onRequestGenerate: () => void
  onConfirmRegeneration: () => void
  onDismissGenerationPreview: () => void
}) {
  return (
    <div className="space-y-3 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
      <p className="text-[13px] font-medium text-slate-200">
        {isRegeneration
          ? 'Regenerar itens a partir da estrutura da esteira'
          : 'Gerar itens a partir da estrutura da esteira'}
      </p>
      <p className="text-[12px] text-slate-500">
        {isRegeneration ? CONVEYOR_PLAN_REGENERATION_INTRO : CONVEYOR_PLAN_FIRST_GENERATION_INTRO}
      </p>
      <label className="block text-[12px] text-slate-400">
        Data de início planejada
        <input
          type="date"
          className="mt-1 w-full max-w-xs rounded-lg border border-white/10 bg-sgp-base px-2 py-2 text-sm text-slate-100"
          value={generateStartDate}
          onChange={(e) => setGenerateStartDate(e.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={busy || previewLoading || !generateStartDate.trim()}
        className="rounded-lg border border-sgp-gold/35 bg-sgp-gold/15 px-3 py-2 text-[13px] font-medium text-slate-50 hover:bg-sgp-gold/25 disabled:opacity-50"
        onClick={onRequestGenerate}
      >
        {previewLoading
          ? 'Carregando prévia…'
          : labelGenerateConveyorPlanItemsButton(activeItemsCount)}
      </button>
      {generationPreview ? (
        <ConveyorOperationalPlanGenerationPreviewPanel
          preview={generationPreview}
          busy={busy}
          onConfirm={onConfirmRegeneration}
          onCancel={onDismissGenerationPreview}
        />
      ) : null}
    </div>
  )
}

function AddItemBlock({
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
  busy,
  onAddItem,
}: {
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
  busy: boolean
  onAddItem: () => void
}) {
  if (!addOpen) {
    return (
      <button
        type="button"
        disabled={busy || availableSteps.length === 0}
        className="rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-[13px] text-slate-100 hover:bg-white/[0.09] disabled:opacity-50"
        onClick={() => setAddOpen(true)}
      >
        Adicionar atividade ao plano
      </button>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
      <p className="text-[13px] font-medium text-slate-200">Novo item manual</p>
      <label className="block text-[12px] text-slate-400">
        Atividade (STEP)
        <select
          className="mt-1 w-full rounded-lg border border-white/10 bg-sgp-base px-2 py-2 text-sm text-slate-100"
          value={activityNodeId}
          onChange={(e) => {
            const id = e.target.value
            setActivityNodeId(id)
            const step = availableSteps.find((s) => s.id === id)
            if (step?.plannedMinutes != null) setPlannedMinutes(step.plannedMinutes)
          }}
        >
          <option value="">Selecione…</option>
          {availableSteps.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-[12px] text-slate-400">
        Data planejada
        <input
          type="date"
          className="mt-1 w-full rounded-lg border border-white/10 bg-sgp-base px-2 py-2 text-sm text-slate-100"
          value={plannedDate}
          onChange={(e) => setPlannedDate(e.target.value)}
        />
      </label>
      <AddItemOrderMinutes
        plannedOrder={plannedOrder}
        setPlannedOrder={setPlannedOrder}
        plannedMinutes={plannedMinutes}
        setPlannedMinutes={setPlannedMinutes}
      />
      <AddItemFooter busy={busy} activityNodeId={activityNodeId} onAddItem={onAddItem} onCancel={() => setAddOpen(false)} />
    </div>
  )
}

function AddItemOrderMinutes({
  plannedOrder,
  setPlannedOrder,
  plannedMinutes,
  setPlannedMinutes,
}: {
  plannedOrder: number
  setPlannedOrder: (v: number) => void
  plannedMinutes: number | ''
  setPlannedMinutes: (v: number | '') => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block text-[12px] text-slate-400">
        Ordem
        <input
          type="number"
          min={0}
          className="mt-1 w-full rounded-lg border border-white/10 bg-sgp-base px-2 py-2 text-sm text-slate-100"
          value={plannedOrder}
          onChange={(e) => setPlannedOrder(Number(e.target.value) || 0)}
        />
      </label>
      <label className="block text-[12px] text-slate-400">
        Minutos
        <input
          type="number"
          min={0}
          className="mt-1 w-full rounded-lg border border-white/10 bg-sgp-base px-2 py-2 text-sm text-slate-100"
          value={plannedMinutes}
          onChange={(e) =>
            setPlannedMinutes(e.target.value === '' ? '' : Number(e.target.value))
          }
        />
      </label>
    </div>
  )
}

function AddItemFooter({
  busy,
  activityNodeId,
  onAddItem,
  onCancel,
}: {
  busy: boolean
  activityNodeId: string
  onAddItem: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={busy || !activityNodeId}
        className="rounded-lg border border-sgp-gold/35 bg-sgp-gold/15 px-3 py-2 text-[13px] text-slate-50 disabled:opacity-50"
        onClick={onAddItem}
      >
        Salvar item
      </button>
      <button
        type="button"
        className="rounded-lg px-3 py-2 text-[13px] text-slate-400 hover:bg-white/[0.06]"
        onClick={onCancel}
      >
        Cancelar
      </button>
    </div>
  )
}
