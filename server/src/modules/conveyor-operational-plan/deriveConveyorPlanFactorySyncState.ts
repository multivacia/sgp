/**
 * Compara item do Plano Operacional da Esteira com item semanal vinculado na fábrica (R6-S2).
 * Função pura — sem I/O.
 */

export type ConveyorPlanFactorySyncStatus = 'PENDING' | 'SYNCED' | 'DIVERGED'

export type ConveyorPlanFactorySyncDifferenceCode =
  | 'FACTORY_ITEM_MISSING'
  | 'PLANNED_DATE_CHANGED'
  | 'PLANNED_MINUTES_CHANGED'
  | 'ASSIGNEE_CHANGED'
  | 'TEAM_CHANGED'
  | 'PLAN_ITEM_CANCELLED'
  | 'PLAN_ITEM_NEEDS_REVIEW'
  | 'FACTORY_ITEM_CANCELLED'

export type ConveyorPlanFactorySyncDifference = {
  code: ConveyorPlanFactorySyncDifferenceCode
  message: string
  planValue: string | null
  factoryValue: string | null
}

export type ConveyorPlanItemSyncInput = {
  plannedDate: string | null
  plannedMinutes: number | null
  plannedCollaboratorId: string | null
  plannedTeamId: string | null
  status: string
  reviewRequired: boolean
  /** Indica vínculo explícito (origin_work_plan_item_id ou encaixe ativo na fábrica). */
  hasFactoryLink: boolean
}

export type FactoryWorkPlanItemSyncInput = {
  plannedDate: string
  plannedMinutes: number | null
  assignedCollaboratorId: string | null
  assignedTeamId: string | null
  status: string
}

export type DeriveConveyorPlanFactorySyncStateInput = {
  planItem: ConveyorPlanItemSyncInput
  factoryItem: FactoryWorkPlanItemSyncInput | null
}

export type DeriveConveyorPlanFactorySyncStateResult = {
  syncStatus: ConveyorPlanFactorySyncStatus
  reviewRequired: boolean
  differences: ConveyorPlanFactorySyncDifference[]
}

const DIFFERENCE_MESSAGES: Record<ConveyorPlanFactorySyncDifferenceCode, string> = {
  FACTORY_ITEM_MISSING: 'Item da fábrica vinculado não foi encontrado ou foi removido.',
  PLANNED_DATE_CHANGED: 'Data do plano da esteira difere da data da fábrica.',
  PLANNED_MINUTES_CHANGED: 'Minutos planejados diferem entre o plano da esteira e a fábrica.',
  ASSIGNEE_CHANGED: 'Colaborador planejado difere do responsável na fábrica.',
  TEAM_CHANGED: 'Equipe planejada difere da equipe na fábrica.',
  PLAN_ITEM_CANCELLED: 'Item cancelado no plano da esteira, mas ainda ativo na fábrica.',
  PLAN_ITEM_NEEDS_REVIEW: 'Item do plano da esteira precisa de revisão.',
  FACTORY_ITEM_CANCELLED: 'Item cancelado na fábrica, mas ainda ativo no plano da esteira.',
}

function normId(value: string | null | undefined): string | null {
  const t = value?.trim()
  return t ? t : null
}

function normDate(value: string | null | undefined): string | null {
  const t = value?.trim().slice(0, 10)
  return t && t.length >= 10 ? t : null
}

function normMinutes(value: number | null | undefined): number | null {
  if (value == null) return null
  if (!Number.isFinite(value)) return null
  return Math.max(0, Math.floor(value))
}

function minutesLabel(value: number | null): string | null {
  if (value == null) return null
  return String(value)
}

function isActiveFactoryStatus(status: string): boolean {
  return status !== 'CANCELLED'
}

function isActivePlanStatus(status: string): boolean {
  return status !== 'CANCELLED' && status !== 'COMPLETED'
}

export function deriveConveyorPlanFactorySyncState(
  input: DeriveConveyorPlanFactorySyncStateInput,
): DeriveConveyorPlanFactorySyncStateResult {
  const { planItem, factoryItem } = input
  const differences: ConveyorPlanFactorySyncDifference[] = []

  if (!planItem.hasFactoryLink) {
    return {
      syncStatus: 'PENDING',
      reviewRequired: planItem.reviewRequired,
      differences: [],
    }
  }

  if (!factoryItem) {
    differences.push({
      code: 'FACTORY_ITEM_MISSING',
      message: DIFFERENCE_MESSAGES.FACTORY_ITEM_MISSING,
      planValue: null,
      factoryValue: null,
    })
    return {
      syncStatus: 'DIVERGED',
      reviewRequired: true,
      differences,
    }
  }

  if (planItem.reviewRequired) {
    differences.push({
      code: 'PLAN_ITEM_NEEDS_REVIEW',
      message: DIFFERENCE_MESSAGES.PLAN_ITEM_NEEDS_REVIEW,
      planValue: 'true',
      factoryValue: null,
    })
  }

  const planCancelled = planItem.status === 'CANCELLED'
  const factoryCancelled = factoryItem.status === 'CANCELLED'

  if (planCancelled && isActiveFactoryStatus(factoryItem.status)) {
    differences.push({
      code: 'PLAN_ITEM_CANCELLED',
      message: DIFFERENCE_MESSAGES.PLAN_ITEM_CANCELLED,
      planValue: planItem.status,
      factoryValue: factoryItem.status,
    })
  }

  if (factoryCancelled && isActivePlanStatus(planItem.status)) {
    differences.push({
      code: 'FACTORY_ITEM_CANCELLED',
      message: DIFFERENCE_MESSAGES.FACTORY_ITEM_CANCELLED,
      planValue: planItem.status,
      factoryValue: factoryItem.status,
    })
  }

  const planDate = normDate(planItem.plannedDate)
  const factoryDate = normDate(factoryItem.plannedDate)
  if (planDate !== factoryDate) {
    differences.push({
      code: 'PLANNED_DATE_CHANGED',
      message: DIFFERENCE_MESSAGES.PLANNED_DATE_CHANGED,
      planValue: planDate,
      factoryValue: factoryDate,
    })
  }

  const planMinutes = normMinutes(planItem.plannedMinutes)
  const factoryMinutes = normMinutes(factoryItem.plannedMinutes)
  if (planMinutes !== factoryMinutes) {
    differences.push({
      code: 'PLANNED_MINUTES_CHANGED',
      message: DIFFERENCE_MESSAGES.PLANNED_MINUTES_CHANGED,
      planValue: minutesLabel(planMinutes),
      factoryValue: minutesLabel(factoryMinutes),
    })
  }

  const planCollaborator = normId(planItem.plannedCollaboratorId)
  const factoryCollaborator = normId(factoryItem.assignedCollaboratorId)
  if (planCollaborator !== factoryCollaborator) {
    differences.push({
      code: 'ASSIGNEE_CHANGED',
      message: DIFFERENCE_MESSAGES.ASSIGNEE_CHANGED,
      planValue: planCollaborator,
      factoryValue: factoryCollaborator,
    })
  }

  const planTeam = normId(planItem.plannedTeamId)
  const factoryTeam = normId(factoryItem.assignedTeamId)
  if (planTeam !== factoryTeam) {
    differences.push({
      code: 'TEAM_CHANGED',
      message: DIFFERENCE_MESSAGES.TEAM_CHANGED,
      planValue: planTeam,
      factoryValue: factoryTeam,
    })
  }

  if (differences.length > 0) {
    return {
      syncStatus: 'DIVERGED',
      reviewRequired: true,
      differences,
    }
  }

  return {
    syncStatus: 'SYNCED',
    reviewRequired: planItem.reviewRequired,
    differences: [],
  }
}
