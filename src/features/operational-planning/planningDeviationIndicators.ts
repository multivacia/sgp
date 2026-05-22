import type {
  OperationalPlanningExecutionOutsidePlanEntry,
  OperationalPlanningExecutionOutsidePlanSummary,
} from '../../domain/operational-planning/operational-planning.types'
import {
  matchesPlanningTextSearch,
  PLANNING_COLLABORATOR_ALL,
  PLANNING_COLLABORATOR_UNASSIGNED,
  PLANNING_CONVEYOR_ALL,
  type PlanningBoardFilters,
} from './planningBoardFilters'
import { formatPlanningMinutes } from './planningBoardHelpers'
import { resolvePlanningItemOperationalStatusLabel } from './planningExecutionHelpers'

export type PlanningDeviationKind =
  | 'OUTSIDE_PLAN'
  | 'PLANNED_WITHOUT_EXECUTION'
  | 'OVER_PLANNED'
  | 'REACHED_PLANNED_NOT_COMPLETED'

/** Item planejado mínimo para classificação de desvio. */
export type PlanningDeviationPlanItem = {
  localKey?: string
  serverItemId?: string
  conveyorId: string
  conveyorTitle: string
  activityTitle: string
  taskTitle?: string
  sectorTitle?: string
  assignedCollaboratorId?: string
  assignedCollaboratorName?: string | null
  plannedDate: string
  plannedMinutes: number | null
  realizedMinutes?: number | null
  activityOperationalStatus?: string | null
  /** Status do item no plano semanal (`operational_work_plan_items.status`). */
  status?: string | null
  removed?: boolean
  cancelled?: boolean
}

export type PlanningDeviationSummary = {
  plannedMinutesTotal: number
  realizedPlannedMinutes: number
  outsidePlanMinutes: number
  totalExecutedMinutes: number
  balanceMinutes: number
  plannedItemsCount: number
  plannedWithoutExecutionCount: number
  completedItemsCount: number
  inProgressItemsCount: number
  reachedPlannedNotCompletedCount: number
  overPlannedCount: number
  outsidePlanActivitiesCount: number
  outsidePlanEntriesCount: number
}

export type PlanningDeviationItem = {
  kind: PlanningDeviationKind
  severity: number
  conveyorId: string
  conveyorTitle: string
  activityTitle: string
  taskTitle?: string
  sectorTitle?: string
  plannedMinutes: number | null
  realizedMinutes: number | null
  differenceMinutes?: number
  plannedDate?: string
  assigneeName?: string | null
  operationalStatus?: string | null
  operationalStatusLabel?: string | null
  entryId?: string
  collaboratorName?: string
  entryAt?: string
  outsidePlanMinutes?: number
}

export type BuildPlanningDeviationOptions = {
  filters?: PlanningBoardFilters
  /** Limite da lista de principais desvios (padrão 10). */
  topDeviationsLimit?: number
}

const DEVIATION_SEVERITY: Record<PlanningDeviationKind, number> = {
  OUTSIDE_PLAN: 1,
  OVER_PLANNED: 2,
  REACHED_PLANNED_NOT_COMPLETED: 3,
  PLANNED_WITHOUT_EXECUTION: 4,
}

const EMPTY_SUMMARY: PlanningDeviationSummary = {
  plannedMinutesTotal: 0,
  realizedPlannedMinutes: 0,
  outsidePlanMinutes: 0,
  totalExecutedMinutes: 0,
  balanceMinutes: 0,
  plannedItemsCount: 0,
  plannedWithoutExecutionCount: 0,
  completedItemsCount: 0,
  inProgressItemsCount: 0,
  reachedPlannedNotCompletedCount: 0,
  overPlannedCount: 0,
  outsidePlanActivitiesCount: 0,
  outsidePlanEntriesCount: 0,
}

function normalizePlannedMinutes(raw: number | null | undefined): number {
  if (raw == null || !Number.isFinite(raw)) return 0
  return Math.max(0, Math.floor(raw))
}

function normalizeRealizedMinutes(raw: number | null | undefined): number | null {
  if (raw === undefined || raw === null) return null
  if (!Number.isFinite(raw)) return null
  return Math.max(0, Math.floor(raw))
}

function isCancelledPlanItem(item: PlanningDeviationPlanItem): boolean {
  if (item.removed || item.cancelled) return true
  const status = item.status?.trim()
  return status === 'CANCELLED'
}

export function isActivePlanningDeviationItem(item: PlanningDeviationPlanItem): boolean {
  return !isCancelledPlanItem(item)
}

export function classifyPlanningDeviationItem(
  item: PlanningDeviationPlanItem,
): PlanningDeviationKind | null {
  if (!isActivePlanningDeviationItem(item)) return null

  const operationalStatus = item.activityOperationalStatus?.trim() || null
  if (operationalStatus === 'COMPLETED') return null

  const planned = normalizePlannedMinutes(item.plannedMinutes)
  const realized = normalizeRealizedMinutes(item.realizedMinutes)

  if (planned > 0 && realized !== null && realized > planned) {
    return 'OVER_PLANNED'
  }

  if (planned > 0 && realized !== null && realized >= planned) {
    return 'REACHED_PLANNED_NOT_COMPLETED'
  }

  if (realized === null || realized === 0) {
    return 'PLANNED_WITHOUT_EXECUTION'
  }

  return null
}

function realizedMinutesForTotals(item: PlanningDeviationPlanItem): number {
  return normalizeRealizedMinutes(item.realizedMinutes) ?? 0
}

function isInProgressItem(item: PlanningDeviationPlanItem): boolean {
  if (!isActivePlanningDeviationItem(item)) return false
  const operationalStatus = item.activityOperationalStatus?.trim() || null
  if (operationalStatus === 'COMPLETED') return false
  const realized = normalizeRealizedMinutes(item.realizedMinutes)
  if (realized === null || realized <= 0) return false
  return classifyPlanningDeviationItem(item) === null
}

export function filterExecutionOutsidePlanEntries(
  entries: readonly OperationalPlanningExecutionOutsidePlanEntry[],
  filters?: PlanningBoardFilters,
): OperationalPlanningExecutionOutsidePlanEntry[] {
  if (!filters) return [...entries]

  return entries.filter((entry) => {
    if (
      filters.conveyorId &&
      filters.conveyorId !== PLANNING_CONVEYOR_ALL &&
      entry.conveyorId !== filters.conveyorId
    ) {
      return false
    }

    if (filters.collaboratorId === PLANNING_COLLABORATOR_UNASSIGNED) {
      return false
    }

    if (
      filters.collaboratorId &&
      filters.collaboratorId !== PLANNING_COLLABORATOR_ALL &&
      entry.collaboratorId !== filters.collaboratorId
    ) {
      return false
    }

    if (filters.state === 'no_assignee' || filters.state === 'over_capacity') {
      return false
    }

    if (filters.q.trim()) {
      const searchable = {
        conveyorId: entry.conveyorId,
        conveyorTitle: entry.conveyorTitle,
        activityTitle: entry.activityTitle,
        taskTitle: entry.taskTitle,
        sectorTitle: entry.sectorTitle,
        assignedCollaboratorName: entry.collaboratorName,
        plannedDate: '',
        plannedMinutes: null,
      }
      if (!matchesPlanningTextSearch(searchable, filters.q)) {
        return false
      }
    }

    return true
  })
}

function summarizeOutsidePlanFromEntries(
  entries: readonly OperationalPlanningExecutionOutsidePlanEntry[],
): Pick<
  PlanningDeviationSummary,
  'outsidePlanMinutes' | 'outsidePlanEntriesCount' | 'outsidePlanActivitiesCount'
> {
  let outsidePlanMinutes = 0
  const activityIds = new Set<string>()
  for (const entry of entries) {
    outsidePlanMinutes += Math.max(0, Math.floor(entry.minutes))
    activityIds.add(entry.activityNodeId)
  }
  return {
    outsidePlanMinutes,
    outsidePlanEntriesCount: entries.length,
    outsidePlanActivitiesCount: activityIds.size,
  }
}

export function buildPlanningDeviationSummary(
  items: readonly PlanningDeviationPlanItem[],
  outsidePlanSummary: OperationalPlanningExecutionOutsidePlanSummary,
  outsidePlanEntries: readonly OperationalPlanningExecutionOutsidePlanEntry[],
  options?: BuildPlanningDeviationOptions,
): PlanningDeviationSummary {
  const filteredOutside = filterExecutionOutsidePlanEntries(
    outsidePlanEntries,
    options?.filters,
  )
  const outsideFromEntries = summarizeOutsidePlanFromEntries(filteredOutside)
  const useFilteredOutside =
    options?.filters != null && outsidePlanEntries.length > 0
  const outsidePlanMinutes = useFilteredOutside
    ? outsideFromEntries.outsidePlanMinutes
    : outsidePlanSummary.totalMinutes
  const outsidePlanEntriesCount = useFilteredOutside
    ? outsideFromEntries.outsidePlanEntriesCount
    : outsidePlanSummary.entriesCount
  const outsidePlanActivitiesCount = useFilteredOutside
    ? outsideFromEntries.outsidePlanActivitiesCount
    : outsidePlanSummary.activitiesCount

  if (items.length === 0 && outsidePlanEntriesCount === 0) {
    return { ...EMPTY_SUMMARY }
  }

  let plannedMinutesTotal = 0
  let realizedPlannedMinutes = 0
  let plannedItemsCount = 0
  let plannedWithoutExecutionCount = 0
  let completedItemsCount = 0
  let inProgressItemsCount = 0
  let reachedPlannedNotCompletedCount = 0
  let overPlannedCount = 0

  for (const item of items) {
    if (!isActivePlanningDeviationItem(item)) continue

    plannedItemsCount += 1
    plannedMinutesTotal += normalizePlannedMinutes(item.plannedMinutes)
    realizedPlannedMinutes += realizedMinutesForTotals(item)

    const operationalStatus = item.activityOperationalStatus?.trim() || null
    if (operationalStatus === 'COMPLETED') {
      completedItemsCount += 1
      continue
    }

    const kind = classifyPlanningDeviationItem(item)
    if (kind === 'PLANNED_WITHOUT_EXECUTION') plannedWithoutExecutionCount += 1
    if (kind === 'OVER_PLANNED') overPlannedCount += 1
    if (kind === 'REACHED_PLANNED_NOT_COMPLETED') reachedPlannedNotCompletedCount += 1
    if (isInProgressItem(item)) inProgressItemsCount += 1
  }

  const totalExecutedMinutes = realizedPlannedMinutes + outsidePlanMinutes
  const balanceMinutes = totalExecutedMinutes - plannedMinutesTotal

  return {
    plannedMinutesTotal,
    realizedPlannedMinutes,
    outsidePlanMinutes,
    totalExecutedMinutes,
    balanceMinutes,
    plannedItemsCount,
    plannedWithoutExecutionCount,
    completedItemsCount,
    inProgressItemsCount,
    reachedPlannedNotCompletedCount,
    overPlannedCount,
    outsidePlanActivitiesCount,
    outsidePlanEntriesCount,
  }
}

function planItemToDeviationCard(item: PlanningDeviationPlanItem, kind: PlanningDeviationKind): PlanningDeviationItem {
  const planned = normalizePlannedMinutes(item.plannedMinutes)
  const realized = normalizeRealizedMinutes(item.realizedMinutes) ?? 0
  const operationalStatus = item.activityOperationalStatus?.trim() || null

  return {
    kind,
    severity: DEVIATION_SEVERITY[kind],
    conveyorId: item.conveyorId,
    conveyorTitle: item.conveyorTitle,
    activityTitle: item.activityTitle,
    taskTitle: item.taskTitle,
    sectorTitle: item.sectorTitle,
    plannedMinutes: planned > 0 ? planned : item.plannedMinutes,
    realizedMinutes: realized,
    differenceMinutes:
      kind === 'OVER_PLANNED' ? realized - planned : kind === 'REACHED_PLANNED_NOT_COMPLETED' ? 0 : undefined,
    plannedDate: item.plannedDate,
    assigneeName: item.assignedCollaboratorName,
    operationalStatus,
    operationalStatusLabel: resolvePlanningItemOperationalStatusLabel(operationalStatus),
  }
}

function outsideEntryToDeviationCard(
  entry: OperationalPlanningExecutionOutsidePlanEntry,
): PlanningDeviationItem {
  return {
    kind: 'OUTSIDE_PLAN',
    severity: DEVIATION_SEVERITY.OUTSIDE_PLAN,
    conveyorId: entry.conveyorId,
    conveyorTitle: entry.conveyorTitle,
    activityTitle: entry.activityTitle,
    taskTitle: entry.taskTitle,
    sectorTitle: entry.sectorTitle,
    plannedMinutes: null,
    realizedMinutes: entry.minutes,
    outsidePlanMinutes: entry.minutes,
    entryId: entry.id,
    collaboratorName: entry.collaboratorName,
    entryAt: entry.entryAt,
  }
}

function compareDeviations(a: PlanningDeviationItem, b: PlanningDeviationItem): number {
  if (a.severity !== b.severity) return a.severity - b.severity
  const aMinutes = a.differenceMinutes ?? a.outsidePlanMinutes ?? a.realizedMinutes ?? 0
  const bMinutes = b.differenceMinutes ?? b.outsidePlanMinutes ?? b.realizedMinutes ?? 0
  return bMinutes - aMinutes
}

export function buildPlanningDeviationItems(
  items: readonly PlanningDeviationPlanItem[],
  outsidePlanEntries: readonly OperationalPlanningExecutionOutsidePlanEntry[],
  options?: BuildPlanningDeviationOptions,
): PlanningDeviationItem[] {
  const limit = options?.topDeviationsLimit ?? 10
  const filteredOutside = filterExecutionOutsidePlanEntries(
    outsidePlanEntries,
    options?.filters,
  )

  const deviations: PlanningDeviationItem[] = []

  for (const entry of filteredOutside) {
    deviations.push(outsideEntryToDeviationCard(entry))
  }

  for (const item of items) {
    const kind = classifyPlanningDeviationItem(item)
    if (!kind || kind === 'OUTSIDE_PLAN') continue
    deviations.push(planItemToDeviationCard(item, kind))
  }

  return [...deviations].sort(compareDeviations).slice(0, limit)
}

/** Formata saldo de minutos com sinal explícito (+ / − / 0). */
export function formatPlanningDeviationBalance(minutes: number): string {
  const m = Math.floor(Number.isFinite(minutes) ? minutes : 0)
  if (m === 0) return '0h'
  const sign = m > 0 ? '+' : '−'
  return `${sign}${formatPlanningMinutes(Math.abs(m))}`
}

export function planningDeviationKindLabel(kind: PlanningDeviationKind): string {
  switch (kind) {
    case 'OUTSIDE_PLAN':
      return 'Fora do planejado'
    case 'PLANNED_WITHOUT_EXECUTION':
      return 'Planejado sem execução'
    case 'OVER_PLANNED':
      return 'Acima do planejado'
    case 'REACHED_PLANNED_NOT_COMPLETED':
      return 'Atingiu planejado sem concluir'
    default:
      return kind
  }
}

export function emptyPlanningDeviationSummary(): PlanningDeviationSummary {
  return { ...EMPTY_SUMMARY }
}
