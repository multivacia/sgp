import type { ConveyorOperationalPlanFactoryStatus } from '../../domain/conveyor-operational-plan/conveyor-operational-plan.types'
import { labelConveyorOperationalPlanStatus } from '../../domain/conveyor-operational-plan/conveyorOperationalPlanDisplay'
import type { ConveyorOperationalPlanStatus } from '../../domain/conveyor-operational-plan/conveyor-operational-plan.types'
import { isPlanningItemSyncDiverged } from '../../domain/operational-planning/planningSyncIssues'
import type {
  OperationalPlanningFactoryIntakeItem,
  OperationalPlanningPlanItem,
} from '../../domain/operational-planning/operational-planning.types'
import type { FactoryIntakeDraftRef } from './buildVisibleFactoryIntakeItems'
import {
  buildVisibleFactoryIntakeGroups,
  DEFAULT_FACTORY_INTAKE_FILTERS,
  filterFactoryIntakeGroups,
  type FactoryIntakeFilters,
  type FactoryIntakeGroup,
  type FactoryIntakeGroupSummary,
  type FactoryIntakeWeekContext,
} from './factoryIntakeGrouping'

export type FactoryIntakeQueueVisualState =
  | 'waiting'
  | 'partially_fitted'
  | 'with_issues'
  | 'ready'

export type FactoryIntakePlanProgress = {
  totalPlanItems: number
  linkedPlanItems: number
  pendingPlanItems: number
  fittedPercent: number | null
}

export type FactoryIntakeQueueGroupMeta = {
  draftInWeekCount: number
  weekSyncDivergenceCount: number
  planProgress: FactoryIntakePlanProgress | null
  visualState: FactoryIntakeQueueVisualState
}

export type FactoryIntakeQueueGroup = FactoryIntakeGroup & {
  operationalPlanStatus: string | null
  queue: FactoryIntakeQueueGroupMeta
}

export type FactoryIntakeQueueSummary = FactoryIntakeGroupSummary & {
  draftInWeekCount: number
  weekSyncDivergenceCount: number
}

const FACTORY_STATUS_WITH_ISSUES: readonly ConveyorOperationalPlanFactoryStatus[] = [
  'DIVERGED',
  'REVIEW_REQUIRED',
]

export const FACTORY_INTAKE_QUEUE_VISUAL_LABELS: Record<FactoryIntakeQueueVisualState, string> = {
  waiting: 'Aguardando encaixe',
  partially_fitted: 'Parcialmente encaixada',
  with_issues: 'Com pendências',
  ready: 'Pronta para encaixe',
}

export const FACTORY_INTAKE_QUEUE_VISUAL_BADGE_CLASS: Record<FactoryIntakeQueueVisualState, string> =
  {
    waiting: 'border-sky-400/35 bg-sky-500/12 text-sky-100',
    partially_fitted: 'border-violet-400/35 bg-violet-500/12 text-violet-100',
    with_issues: 'border-amber-400/35 bg-amber-500/12 text-amber-100',
    ready: 'border-emerald-400/35 bg-emerald-500/12 text-emerald-100',
  }

export function labelFactoryIntakeQueueVisualState(state: FactoryIntakeQueueVisualState): string {
  return FACTORY_INTAKE_QUEUE_VISUAL_LABELS[state]
}

export function labelFactoryIntakeOperationalPlanStatus(status: string | null): string | null {
  if (!status) return null
  return labelConveyorOperationalPlanStatus(status as ConveyorOperationalPlanStatus)
}

export function buildFactoryIntakePlanProgress(
  item: Pick<
    OperationalPlanningFactoryIntakeItem,
    'totalPlanItems' | 'linkedPlanItems' | 'pendingPlanItems'
  >,
): FactoryIntakePlanProgress | null {
  const total = item.totalPlanItems
  if (!Number.isFinite(total) || total <= 0) return null
  const linked = Math.max(0, Math.floor(item.linkedPlanItems))
  const pending = Math.max(0, Math.floor(item.pendingPlanItems))
  const fittedPercent = total > 0 ? Math.round((linked / total) * 100) : null
  return {
    totalPlanItems: total,
    linkedPlanItems: linked,
    pendingPlanItems: pending,
    fittedPercent,
  }
}

function factoryStatusHasIssues(status: string | null): boolean {
  if (!status) return false
  return (FACTORY_STATUS_WITH_ISSUES as readonly string[]).includes(status)
}

function groupHasItemSyncIssues(group: FactoryIntakeGroup): boolean {
  return group.items.some((it) => it.syncStatus === 'DIVERGED')
}

export function resolveFactoryIntakeGroupVisualState(input: {
  summary: FactoryIntakeGroupSummary
  planProgress: FactoryIntakePlanProgress | null
  weekSyncDivergenceCount: number
  factoryPlanningStatus: string | null
  hasItemSyncIssues: boolean
}): FactoryIntakeQueueVisualState {
  const hasReview = input.summary.reviewCount > 0
  const hasIssues =
    hasReview ||
    input.weekSyncDivergenceCount > 0 ||
    factoryStatusHasIssues(input.factoryPlanningStatus) ||
    input.hasItemSyncIssues

  if (hasIssues) return 'with_issues'

  const linked = input.planProgress?.linkedPlanItems ?? 0
  const pending =
    input.planProgress?.pendingPlanItems ?? input.summary.itemCount
  if (linked > 0 && pending > 0) return 'partially_fitted'

  const allDated = input.summary.itemCount > 0 && input.summary.earliestPlannedDate != null
  if (!hasReview && input.weekSyncDivergenceCount === 0 && allDated) return 'ready'

  return 'waiting'
}

export function countFactoryIntakeDraftItemsForGroup<
  TDraft extends FactoryIntakeDraftRef,
>(
  planId: string,
  intakeItems: readonly OperationalPlanningFactoryIntakeItem[],
  draftItems: readonly TDraft[],
): number {
  const draftIds = new Set(
    draftItems
      .map((d) => d.conveyorOperationalPlanItemId)
      .filter((id): id is string => Boolean(id)),
  )
  if (draftIds.size === 0) return 0
  return intakeItems.filter(
    (it) =>
      it.conveyorOperationalPlanId === planId &&
      draftIds.has(it.conveyorOperationalPlanItemId),
  ).length
}

export function countWeekSyncDivergencesForFactoryIntakeGroup(
  group: Pick<FactoryIntakeGroup, 'conveyorId' | 'conveyorOperationalPlanId'>,
  weekPlanItems: readonly Pick<
    OperationalPlanningPlanItem,
    'conveyorId' | 'conveyorOperationalPlanItemId' | 'syncStatus'
  >[],
  intakePlanItemIds: ReadonlySet<string>,
): number {
  return weekPlanItems.filter((it) => {
    if (!isPlanningItemSyncDiverged(it)) return false
    if (it.conveyorId !== group.conveyorId) return false
    const copId = it.conveyorOperationalPlanItemId
    if (!copId) return false
    return intakePlanItemIds.has(copId)
  }).length
}

export function summarizeFactoryIntakeQueueGroup(
  group: FactoryIntakeGroup,
  meta: FactoryIntakeQueueGroupMeta,
): FactoryIntakeQueueSummary {
  return {
    ...group.summary,
    draftInWeekCount: meta.draftInWeekCount,
    weekSyncDivergenceCount: meta.weekSyncDivergenceCount,
  }
}

export function enrichFactoryIntakeQueueGroup<
  TDraft extends FactoryIntakeDraftRef,
>(
  group: FactoryIntakeGroup,
  context: {
    intakeItems: readonly OperationalPlanningFactoryIntakeItem[]
    draftItems: readonly TDraft[]
    weekPlanItems: readonly Pick<
      OperationalPlanningPlanItem,
      'conveyorId' | 'conveyorOperationalPlanItemId' | 'syncStatus'
    >[]
  },
): FactoryIntakeQueueGroup {
  const first = group.items[0]
  const planProgress = first ? buildFactoryIntakePlanProgress(first) : null
  const intakePlanItemIds = new Set(
    context.intakeItems
      .filter((it) => it.conveyorOperationalPlanId === group.conveyorOperationalPlanId)
      .map((it) => it.conveyorOperationalPlanItemId),
  )
  const weekSyncDivergenceCount = countWeekSyncDivergencesForFactoryIntakeGroup(
    group,
    context.weekPlanItems,
    intakePlanItemIds,
  )
  const draftInWeekCount = countFactoryIntakeDraftItemsForGroup(
    group.conveyorOperationalPlanId,
    context.intakeItems,
    context.draftItems,
  )
  const visualState = resolveFactoryIntakeGroupVisualState({
    summary: group.summary,
    planProgress,
    weekSyncDivergenceCount,
    factoryPlanningStatus: group.factoryPlanningStatus,
    hasItemSyncIssues: groupHasItemSyncIssues(group),
  })

  return {
    ...group,
    operationalPlanStatus: first?.operationalPlanStatus ?? null,
    queue: {
      draftInWeekCount,
      weekSyncDivergenceCount,
      planProgress,
      visualState,
    },
  }
}

export function enrichFactoryIntakeQueueGroups<
  TDraft extends FactoryIntakeDraftRef,
>(
  groups: readonly FactoryIntakeGroup[],
  context: {
    intakeItems: readonly OperationalPlanningFactoryIntakeItem[]
    draftItems: readonly TDraft[]
    weekPlanItems: readonly Pick<
      OperationalPlanningPlanItem,
      'conveyorId' | 'conveyorOperationalPlanItemId' | 'syncStatus'
    >[]
  },
): FactoryIntakeQueueGroup[] {
  return groups.map((group) => enrichFactoryIntakeQueueGroup(group, context))
}

function groupMatchesSyncFilter(
  group: FactoryIntakeQueueGroup,
  sync: FactoryIntakeFilters['sync'],
): boolean {
  if (sync === 'all') return true
  return (
    group.queue.weekSyncDivergenceCount > 0 ||
    groupHasItemSyncIssues(group) ||
    factoryStatusHasIssues(group.factoryPlanningStatus)
  )
}

function groupMatchesExecutionFilter(
  group: FactoryIntakeQueueGroup,
  execution: FactoryIntakeFilters['execution'],
): boolean {
  if (execution === 'all') return true
  return group.summary.executedCount > 0
}

function factoryIntakeGroupKey(group: Pick<FactoryIntakeGroup, 'conveyorId' | 'conveyorOperationalPlanId'>): string {
  return `${group.conveyorId}|${group.conveyorOperationalPlanId}`
}

export function filterFactoryIntakeQueueGroups(
  groups: readonly FactoryIntakeQueueGroup[],
  filters: FactoryIntakeFilters,
  week: FactoryIntakeWeekContext,
): FactoryIntakeQueueGroup[] {
  const matchingKeys = new Set(
    filterFactoryIntakeGroups(groups, filters, week).map(factoryIntakeGroupKey),
  )
  return groups.filter(
    (group) =>
      matchingKeys.has(factoryIntakeGroupKey(group)) &&
      groupMatchesSyncFilter(group, filters.sync) &&
      groupMatchesExecutionFilter(group, filters.execution),
  )
}

export function buildVisibleFactoryIntakeQueueGroups<
  TDraft extends FactoryIntakeDraftRef,
>(
  intakeItems: readonly OperationalPlanningFactoryIntakeItem[],
  draftItems: readonly TDraft[],
  filters: FactoryIntakeFilters,
  week: FactoryIntakeWeekContext,
  weekPlanItems: readonly Pick<
    OperationalPlanningPlanItem,
    'conveyorId' | 'conveyorOperationalPlanItemId' | 'syncStatus'
  >[],
): FactoryIntakeQueueGroup[] {
  const visibleGroups = buildVisibleFactoryIntakeGroups(
    intakeItems,
    draftItems,
    { ...DEFAULT_FACTORY_INTAKE_FILTERS, q: '', review: 'all', period: 'all' },
    week,
  )
  const enriched = enrichFactoryIntakeQueueGroups(visibleGroups, {
    intakeItems,
    draftItems,
    weekPlanItems,
  })
  return filterFactoryIntakeQueueGroups(enriched, filters, week)
}
