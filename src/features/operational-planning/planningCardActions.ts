import type { ConveyorNodeStepOperationalStatus } from '../../domain/conveyors/conveyor.types'
import type { TimeEntryCandidateItem } from '../../domain/my-activities/my-activities.types'
import type { OperationalPlanningPlanItem } from '../../domain/operational-planning/operational-planning.types'
import {
  canCompleteStep,
  canReopenStep,
} from '../../domain/conveyors/stepOperationalStatus'

export type PlanningCardStepStatus = ConveyorNodeStepOperationalStatus | string | null | undefined

export type PlanningCardActionItem = {
  conveyorId: string
  activityNodeId: string
  conveyorTitle: string
  activityTitle: string
  taskTitle: string
  sectorTitle: string
  plannedMinutes: number | null
  realizedMinutes?: number | null
  activityOperationalStatus?: string | null
  isOutOfSequence?: boolean
}

function normalizeStatus(status: PlanningCardStepStatus): string | null {
  const key = status?.trim()
  return key || null
}

export function canPointTimeOnPlanningStep(status: PlanningCardStepStatus): boolean {
  const key = normalizeStatus(status)
  return key !== 'COMPLETED' && key !== 'ABORTED'
}

export function canCompletePlanningStep(
  status: PlanningCardStepStatus,
  hasPermission: boolean,
): boolean {
  return canCompleteStep(
    { operationalStatus: (normalizeStatus(status) ?? 'PENDING') as ConveyorNodeStepOperationalStatus },
    hasPermission,
  )
}

export function canReopenPlanningStep(
  status: PlanningCardStepStatus,
  hasPermission: boolean,
): boolean {
  return canReopenStep(
    { operationalStatus: (normalizeStatus(status) ?? 'PENDING') as ConveyorNodeStepOperationalStatus },
    hasPermission,
  )
}

export function planningApontamentoCandidate(
  item: PlanningCardActionItem,
): TimeEntryCandidateItem {
  const planned = item.plannedMinutes ?? 0
  const realized =
    item.realizedMinutes != null && Number.isFinite(item.realizedMinutes)
      ? Math.max(0, Math.floor(item.realizedMinutes))
      : 0
  const pending = Math.max(0, planned - realized)
  return {
    conveyorId: item.conveyorId,
    conveyorCode: null,
    conveyorName: item.conveyorTitle,
    clientName: null,
    vehicleLabel: null,
    plate: null,
    stepNodeId: item.activityNodeId,
    stepName: item.activityTitle,
    activityTitle: item.activityTitle,
    taskTitle: item.taskTitle,
    areaName: item.sectorTitle,
    sectorTitle: item.sectorTitle,
    roleInStep: 'support',
    assignmentType: 'COLLABORATOR',
    plannedMinutes: item.plannedMinutes,
    realizedMinutes: realized,
    pendingMinutes: pending,
    isAssignedToMe: true,
    requiresJustification: false,
    isOutOfSequence: Boolean(item.isOutOfSequence),
    hasPreviousPendingStep: Boolean(item.isOutOfSequence),
    requiresOutOfSequenceJustification: Boolean(item.isOutOfSequence),
    previousOpenCount: 0,
    previousOpenActivities: [],
    awaitingPreviousActivities: [],
    canCompleteStep: true,
  }
}

export function mergePlanningExecutionFromServerItems<
  T extends {
    activityNodeId: string
    realizedMinutes?: number | null
    activityOperationalStatus?: string | null
  },
>(drafts: readonly T[], serverItems: readonly OperationalPlanningPlanItem[]): T[] {
  const byActivity = new Map(serverItems.map((i) => [i.activityNodeId, i]))
  return drafts.map((d) => {
    const s = byActivity.get(d.activityNodeId)
    if (!s) return d
    return {
      ...d,
      realizedMinutes: s.realizedMinutes,
      activityOperationalStatus: s.activityOperationalStatus,
    }
  })
}

/** Máximo de páginas percorridas ao procurar o candidato do cartão ("Apontar"). */
export const PLANNING_CARD_CANDIDATE_MAX_PAGES = 10

/**
 * Procura, nos candidatos de apontamento do usuário (paginados por cursor), a atividade do
 * cartão do planejamento. Usa o nome da atividade como pesquisa para reduzir as páginas
 * (exceto se contiver `&`, que o backend interpreta como "OS & atividade"). Devolve `null`
 * se não encontrar — o chamador mantém o fallback `planningApontamentoCandidate`.
 */
export async function findTimeEntryCandidateForPlanningCard(
  item: Pick<PlanningCardActionItem, 'conveyorId' | 'activityNodeId' | 'activityTitle'>,
  fetchPage: (options: {
    q?: string
    cursor: string | null
  }) => Promise<{ items: TimeEntryCandidateItem[]; nextCursor: string | null }>,
  maxPages = PLANNING_CARD_CANDIDATE_MAX_PAGES,
): Promise<TimeEntryCandidateItem | null> {
  const title = item.activityTitle.trim()
  const q = title.length >= 2 && !title.includes('&') ? title : undefined
  let cursor: string | null = null
  for (let page = 0; page < maxPages; page++) {
    const r = await fetchPage({ q, cursor })
    const found = r.items.find(
      (c) => c.conveyorId === item.conveyorId && c.stepNodeId === item.activityNodeId,
    )
    if (found) return found
    if (!r.nextCursor) return null
    cursor = r.nextCursor
  }
  return null
}
