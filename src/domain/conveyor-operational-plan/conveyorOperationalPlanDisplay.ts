import type {
  ConveyorOperationalPlanFactoryStatus,
  ConveyorOperationalPlanItem,
  ConveyorOperationalPlanItemStatus,
  ConveyorOperationalPlanStatus,
} from './conveyor-operational-plan.types'
import type { ConveyorOperationalPlanSummary } from './conveyorPlanSummary'

export const CONVEYOR_OPERATIONAL_PLAN_STATUS_LABELS: Record<
  ConveyorOperationalPlanStatus,
  string
> = {
  DRAFT: 'Rascunho',
  APPROVED: 'Aprovado',
  WAITING_FACTORY_PLANNING: 'Aguardando encaixe na fábrica',
  PARTIALLY_PLANNED_IN_FACTORY: 'Parcialmente planejado na fábrica',
  FULLY_PLANNED_IN_FACTORY: 'Planejado na fábrica',
  IN_EXECUTION: 'Em execução',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

export const CONVEYOR_OPERATIONAL_PLAN_FACTORY_STATUS_LABELS: Record<
  ConveyorOperationalPlanFactoryStatus,
  string
> = {
  NOT_SCHEDULED: 'Não agendado',
  PARTIALLY_SCHEDULED: 'Parcialmente agendado',
  FULLY_SCHEDULED: 'Agendado',
  DIVERGED: 'Divergente',
  REVIEW_REQUIRED: 'Requer revisão',
}

export const CONVEYOR_OPERATIONAL_PLAN_ITEM_STATUS_LABELS: Record<
  ConveyorOperationalPlanItemStatus,
  string
> = {
  PLANNED: 'Planejado',
  NEEDS_REVIEW: 'Precisa revisão',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

export const CONVEYOR_OPERATIONAL_PLAN_ITEM_SOURCE_LABELS: Record<
  ConveyorOperationalPlanItem['sourceKind'],
  string
> = {
  GENERATED: 'Gerado automaticamente',
  MANUAL: 'Manual',
  IMPORTED: 'Importado',
}

export const CONVEYOR_PLAN_STATUS_BADGE_CLASS: Record<ConveyorOperationalPlanStatus, string> = {
  DRAFT: 'border-white/12 bg-white/[0.06] text-slate-200',
  APPROVED: 'border-emerald-400/35 bg-emerald-500/12 text-emerald-100',
  WAITING_FACTORY_PLANNING: 'border-sky-400/35 bg-sky-500/12 text-sky-100',
  PARTIALLY_PLANNED_IN_FACTORY: 'border-violet-400/35 bg-violet-500/12 text-violet-100',
  FULLY_PLANNED_IN_FACTORY: 'border-violet-400/35 bg-violet-500/12 text-violet-100',
  IN_EXECUTION: 'border-sgp-gold/35 bg-sgp-gold/12 text-amber-50',
  COMPLETED: 'border-emerald-400/35 bg-emerald-500/12 text-emerald-100',
  CANCELLED: 'border-white/10 bg-white/[0.04] text-slate-400',
}

export const CONVEYOR_PLAN_ITEM_STATUS_BADGE_CLASS: Record<
  ConveyorOperationalPlanItemStatus,
  string
> = {
  PLANNED: 'border-white/10 bg-white/[0.04] text-slate-300',
  NEEDS_REVIEW: 'border-amber-400/40 bg-amber-500/15 text-amber-100',
  IN_PROGRESS: 'border-sgp-gold/35 bg-sgp-gold/12 text-amber-50',
  COMPLETED: 'border-emerald-400/35 bg-emerald-500/12 text-emerald-100',
  CANCELLED: 'border-white/10 bg-white/[0.04] text-slate-500',
}

export function labelConveyorOperationalPlanStatus(
  status: ConveyorOperationalPlanStatus,
): string {
  return CONVEYOR_OPERATIONAL_PLAN_STATUS_LABELS[status] ?? status
}

export function canCreateConveyorOperationalPlan(
  operationalStatus: string,
): boolean {
  return operationalStatus === 'PRONTA_LIBERAR' || operationalStatus === 'EM_PRODUCAO'
}

export function showApproveConveyorOperationalPlanButton(
  status: ConveyorOperationalPlanStatus,
): boolean {
  return status === 'DRAFT'
}

export function showSendToFactoryConveyorOperationalPlanButton(
  status: ConveyorOperationalPlanStatus,
): boolean {
  return status === 'APPROVED'
}

export function showWaitingFactoryPlanningMessage(
  status: ConveyorOperationalPlanStatus,
): boolean {
  return status === 'WAITING_FACTORY_PLANNING'
}

export function canEditConveyorOperationalPlanItems(
  status: ConveyorOperationalPlanStatus,
): boolean {
  return status === 'DRAFT'
}

export function showGenerateConveyorOperationalPlanItemsButton(
  status: ConveyorOperationalPlanStatus,
): boolean {
  return status === 'DRAFT'
}

export function labelConveyorOperationalPlanFactoryStatus(
  status: ConveyorOperationalPlanFactoryStatus,
): string {
  return CONVEYOR_OPERATIONAL_PLAN_FACTORY_STATUS_LABELS[status] ?? status
}

export function labelConveyorOperationalPlanItemSource(
  sourceKind: ConveyorOperationalPlanItem['sourceKind'],
): string {
  return CONVEYOR_OPERATIONAL_PLAN_ITEM_SOURCE_LABELS[sourceKind] ?? sourceKind
}

/** Indica ajuste manual em item gerado (sem alterar source_kind). */
export function conveyorPlanItemShowsManualAdjustmentBadge(
  item: ConveyorOperationalPlanItem,
  planGeneratedAt: string | null,
): boolean {
  if (item.sourceKind !== 'GENERATED' || !planGeneratedAt) return false
  const generatedMs = new Date(planGeneratedAt).getTime()
  const updatedMs = new Date(item.updatedAt).getTime()
  if (Number.isNaN(generatedMs) || Number.isNaN(updatedMs)) return false
  return updatedMs > generatedMs
}

export const CONVEYOR_PLAN_ITEM_MANUAL_ADJUSTMENT_LABEL = 'Ajustado manualmente'

export function labelConveyorOperationalPlanItemStatus(
  item: ConveyorOperationalPlanItem,
): string {
  if (item.reviewRequired && item.status !== 'CANCELLED') {
    return 'Precisa revisão'
  }
  return CONVEYOR_OPERATIONAL_PLAN_ITEM_STATUS_LABELS[item.status] ?? item.status
}

export function conveyorOperationalPlanItemStatusBadgeClass(
  item: ConveyorOperationalPlanItem,
): string {
  if (item.reviewRequired && item.status !== 'CANCELLED') {
    return CONVEYOR_PLAN_ITEM_STATUS_BADGE_CLASS.NEEDS_REVIEW
  }
  return CONVEYOR_PLAN_ITEM_STATUS_BADGE_CLASS[item.status] ?? CONVEYOR_PLAN_ITEM_STATUS_BADGE_CLASS.PLANNED
}

export function formatConveyorOperationalPlanPeriod(
  start: string | null,
  end: string | null,
): string {
  if (!start && !end) return '—'
  if (start && end && start !== end) return `${start} → ${end}`
  return start ?? end ?? '—'
}

export function formatConveyorPlanGeneratedAt(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getConveyorOperationalPlanStateMessage(
  status: ConveyorOperationalPlanStatus,
  summary: ConveyorOperationalPlanSummary,
): string {
  switch (status) {
    case 'DRAFT':
      if (summary.activeItemsCount === 0) {
        return 'Plano em rascunho. Gere os itens a partir da estrutura da esteira ou adicione manualmente.'
      }
      if (summary.reviewRequiredItemsCount > 0) {
        return 'Resolva os itens com revisão antes de aprovar o plano.'
      }
      return 'Plano pronto para aprovação. Revise o checklist antes de aprovar — a execução não inicia automaticamente.'
    case 'APPROVED':
      return 'Plano aprovado pelo gestor da esteira. Envie para o Planejamento da Fábrica quando estiver pronto — isso cria uma demanda de encaixe, sem iniciar execução.'
    case 'WAITING_FACTORY_PLANNING':
      return 'Aguardando encaixe no Planejamento da Fábrica. O gestor da fábrica precisa encaixar as atividades na agenda semanal.'
    case 'PARTIALLY_PLANNED_IN_FACTORY':
      return 'Parte do plano já foi encaixada na fábrica.'
    case 'FULLY_PLANNED_IN_FACTORY':
      return 'Plano totalmente encaixado na fábrica.'
    case 'IN_EXECUTION':
      return 'Plano em execução na fábrica.'
    case 'COMPLETED':
      return 'Plano concluído.'
    case 'CANCELLED':
      return 'Plano cancelado.'
    default:
      return ''
  }
}

export const CONVEYOR_PLAN_EMPTY_STATE_MESSAGE =
  'Esta esteira ainda não possui Plano Operacional.'

export const CONVEYOR_PLAN_EMPTY_STATE_HINT =
  'Crie um plano para organizar a execução da esteira antes do encaixe na fábrica.'

export function showFactoryPlanningFollowUpLink(
  status: ConveyorOperationalPlanStatus,
): boolean {
  return (
    status === 'PARTIALLY_PLANNED_IN_FACTORY' ||
    status === 'FULLY_PLANNED_IN_FACTORY' ||
    status === 'IN_EXECUTION'
  )
}
