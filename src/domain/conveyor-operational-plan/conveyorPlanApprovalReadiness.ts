import type {
  ConveyorOperationalPlan,
  ConveyorOperationalPlanItem,
} from './conveyor-operational-plan.types'
import { conveyorPlanItemShowsManualAdjustmentBadge } from './conveyorOperationalPlanDisplay'
import { itemHasReviewReason } from './conveyorPlanReviewDisplay'
import { summarizeConveyorOperationalPlan } from './conveyorPlanSummary'

export type ApprovalChecklistLevel = 'ok' | 'warning' | 'blocker'

export type ApprovalChecklistItem = {
  id: string
  label: string
  level: ApprovalChecklistLevel
  detail?: string
}

export type ConveyorOperationalPlanApprovalReadiness = {
  canApprove: boolean
  blockers: string[]
  warnings: string[]
  checklist: ApprovalChecklistItem[]
}

const STALE_GENERATION_DAYS = 30

function countActive(
  items: readonly ConveyorOperationalPlanItem[],
): ConveyorOperationalPlanItem[] {
  return items.filter((i) => i.status !== 'CANCELLED')
}

function pushChecklist(
  checklist: ApprovalChecklistItem[],
  blockers: string[],
  warnings: string[],
  item: ApprovalChecklistItem,
): void {
  checklist.push(item)
  if (item.level === 'blocker') blockers.push(item.label)
  if (item.level === 'warning') warnings.push(item.label)
}

export function summarizeConveyorOperationalPlanApprovalReadiness(
  plan: ConveyorOperationalPlan,
  items: readonly ConveyorOperationalPlanItem[],
  dailyCapacityMinutes: number,
): ConveyorOperationalPlanApprovalReadiness {
  const checklist: ApprovalChecklistItem[] = []
  const blockers: string[] = []
  const warnings: string[] = []
  const active = countActive(items)
  const summary = summarizeConveyorOperationalPlan(plan, [...items])

  if (active.length === 0) {
    pushChecklist(checklist, blockers, warnings, {
      id: 'active-items',
      label: 'Plano possui itens ativos',
      level: 'blocker',
      detail: 'Adicione ou restaure ao menos um item antes de aprovar.',
    })
  } else {
    pushChecklist(checklist, blockers, warnings, {
      id: 'active-items',
      label: 'Plano possui itens ativos',
      level: 'ok',
      detail: `${active.length} item(ns) ativo(s).`,
    })
  }

  const reviewItems = active.filter((i) => i.reviewRequired || i.status === 'NEEDS_REVIEW')
  if (reviewItems.length > 0) {
    pushChecklist(checklist, blockers, warnings, {
      id: 'no-review',
      label: 'Nenhum item ativo precisa revisão',
      level: 'blocker',
      detail: `${reviewItems.length} item(ns) com revisão pendente.`,
    })
  } else {
    pushChecklist(checklist, blockers, warnings, {
      id: 'no-review',
      label: 'Nenhum item ativo precisa revisão',
      level: 'ok',
    })
  }

  const missingDate = active.filter((i) => !i.plannedDate?.trim())
  if (missingDate.length > 0) {
    pushChecklist(checklist, blockers, warnings, {
      id: 'planned-date',
      label: 'Todos os itens ativos possuem data planejada',
      level: 'blocker',
      detail: `${missingDate.length} item(ns) sem data.`,
    })
  } else if (active.length > 0) {
    pushChecklist(checklist, blockers, warnings, {
      id: 'planned-date',
      label: 'Todos os itens ativos possuem data planejada',
      level: 'ok',
    })
  }

  const missingMinutes = active.filter(
    (i) =>
      itemHasReviewReason(i, 'MISSING_PLANNED_MINUTES') ||
      itemHasReviewReason(i, 'ZERO_PLANNED_MINUTES') ||
      i.plannedMinutes == null ||
      i.plannedMinutes === 0,
  )
  if (missingMinutes.length > 0) {
    pushChecklist(checklist, blockers, warnings, {
      id: 'planned-minutes',
      label: 'Todos os itens ativos possuem tempo planejado maior que zero',
      level: 'blocker',
      detail: `${missingMinutes.length} item(ns) sem tempo válido.`,
    })
  } else if (active.length > 0) {
    pushChecklist(checklist, blockers, warnings, {
      id: 'planned-minutes',
      label: 'Todos os itens ativos possuem tempo planejado maior que zero',
      level: 'ok',
    })
  }

  const missingAssignee = active.filter(
    (i) =>
      itemHasReviewReason(i, 'MISSING_ASSIGNEE') ||
      itemHasReviewReason(i, 'MULTIPLE_TEAMS') ||
      (!i.plannedCollaboratorId && !i.plannedTeamId),
  )
  if (missingAssignee.length > 0) {
    pushChecklist(checklist, blockers, warnings, {
      id: 'assignee',
      label: 'Todos os itens ativos possuem responsável ou equipe',
      level: 'blocker',
      detail: `${missingAssignee.length} item(ns) sem responsável/equipe definido.`,
    })
  } else if (active.length > 0) {
    pushChecklist(checklist, blockers, warnings, {
      id: 'assignee',
      label: 'Todos os itens ativos possuem responsável ou equipe',
      level: 'ok',
    })
  }

  if (summary.cancelledItemsCount > 0) {
    pushChecklist(checklist, blockers, warnings, {
      id: 'cancelled',
      label: 'Itens cancelados no plano',
      level: 'warning',
      detail: `${summary.cancelledItemsCount} item(ns) cancelado(s) não entram na aprovação.`,
    })
  }

  const manuallyAdjusted = active.filter((i) =>
    conveyorPlanItemShowsManualAdjustmentBadge(i, plan.generatedAt),
  )
  if (manuallyAdjusted.length > 0) {
    pushChecklist(checklist, blockers, warnings, {
      id: 'manual-adjustment',
      label: 'Itens gerados com ajuste manual',
      level: 'warning',
      detail: `${manuallyAdjusted.length} item(ns) alterado(s) após a geração.`,
    })
  }

  if (summary.manualItemsCount > 0) {
    pushChecklist(checklist, blockers, warnings, {
      id: 'manual-source',
      label: 'Itens de origem manual',
      level: 'warning',
      detail: `${summary.manualItemsCount} item(ns) adicionado(s) manualmente.`,
    })
  }

  const overCapacity = active.filter((i) => itemHasReviewReason(i, 'OVER_DAILY_CAPACITY'))
  if (overCapacity.length > 0 && reviewItems.length === 0) {
    pushChecklist(checklist, blockers, warnings, {
      id: 'over-capacity',
      label: 'Itens acima da capacidade diária',
      level: 'warning',
      detail: `${overCapacity.length} item(ns) — verifique antes de aprovar.`,
    })
  }

  if (!plan.plannedStartDate?.trim()) {
    pushChecklist(checklist, blockers, warnings, {
      id: 'plan-period',
      label: 'Período planejado definido no plano',
      level: 'warning',
      detail: 'Informe a data de início planejada do plano.',
    })
  } else {
    pushChecklist(checklist, blockers, warnings, {
      id: 'plan-period',
      label: 'Período planejado definido no plano',
      level: 'ok',
    })
  }

  if (plan.generatedAt) {
    const generatedMs = new Date(plan.generatedAt).getTime()
    const ageDays = (Date.now() - generatedMs) / (1000 * 60 * 60 * 24)
    if (ageDays > STALE_GENERATION_DAYS) {
      pushChecklist(checklist, blockers, warnings, {
        id: 'stale-generation',
        label: 'Plano gerado há muito tempo',
        level: 'warning',
        detail: `Última geração há ${Math.floor(ageDays)} dias — considere regenerar.`,
      })
    }
  }

  if (dailyCapacityMinutes > 0) {
    pushChecklist(checklist, blockers, warnings, {
      id: 'daily-capacity',
      label: 'Capacidade diária usada na revisão',
      level: 'ok',
      detail: `${dailyCapacityMinutes} min por dia (configuração operacional).`,
    })
  } else {
    pushChecklist(checklist, blockers, warnings, {
      id: 'daily-capacity',
      label: 'Capacidade diária usada na revisão',
      level: 'warning',
      detail: 'Capacidade diária não configurada; revisão pode estar incompleta.',
    })
  }

  const canApprove = blockers.length === 0 && active.length > 0

  return { canApprove, blockers, warnings, checklist }
}

export function approvalChecklistLevelClass(level: ApprovalChecklistLevel): string {
  switch (level) {
    case 'ok':
      return 'text-emerald-200/90'
    case 'warning':
      return 'text-amber-100/90'
    case 'blocker':
      return 'text-rose-200/90'
    default:
      return 'text-slate-400'
  }
}

export function approvalChecklistLevelSymbol(level: ApprovalChecklistLevel): string {
  switch (level) {
    case 'ok':
      return 'OK'
    case 'warning':
      return '!'
    case 'blocker':
      return '✕'
    default:
      return '·'
  }
}
