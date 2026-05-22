import type { OperationalPlanningFactoryIntakeItem } from '../../domain/operational-planning/operational-planning.types'
import {
  buildVisibleFactoryIntakeItems,
  type FactoryIntakeDraftRef,
} from './buildVisibleFactoryIntakeItems'
import { isIsoDateInWeekdays } from './operationalPlanningWeekRange'

export type FactoryIntakeGroupSummary = {
  itemCount: number
  waitingMinutes: number
  reviewCount: number
  executedCount: number
  earliestPlannedDate: string | null
  latestPlannedDate: string | null
}

export type FactoryIntakeGroup = {
  conveyorId: string
  conveyorOperationalPlanId: string
  conveyorName: string
  factoryPlanningStatus: string | null
  items: OperationalPlanningFactoryIntakeItem[]
  summary: FactoryIntakeGroupSummary
}

export type FactoryIntakeReviewFilter = 'all' | 'with_review' | 'without_review'

export type FactoryIntakePeriodFilter = 'all' | 'this_week' | 'no_date' | 'overdue'

export type FactoryIntakeSyncFilter = 'all' | 'with_sync_pending'

export type FactoryIntakeExecutionFilter = 'all' | 'partially_executed'

export type FactoryIntakeFilters = {
  q: string
  review: FactoryIntakeReviewFilter
  period: FactoryIntakePeriodFilter
  sync: FactoryIntakeSyncFilter
  execution: FactoryIntakeExecutionFilter
}

export const DEFAULT_FACTORY_INTAKE_FILTERS: FactoryIntakeFilters = {
  q: '',
  review: 'all',
  period: 'all',
  sync: 'all',
  execution: 'all',
}

export type FactoryIntakeWeekContext = {
  weekMonday: string
  weekFriday: string
  weekdayDates: readonly string[]
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function itemMinutes(item: OperationalPlanningFactoryIntakeItem): number {
  const raw = item.plannedMinutes
  if (raw == null || !Number.isFinite(raw)) return 0
  return Math.max(0, Math.floor(raw))
}

function compareIsoDateNullable(a: string | null, b: string | null): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return a.localeCompare(b)
}

function sortFactoryIntakeItems(
  items: OperationalPlanningFactoryIntakeItem[],
): OperationalPlanningFactoryIntakeItem[] {
  return [...items].sort((a, b) => {
    const dc = compareIsoDateNullable(a.plannedDate, b.plannedDate)
    if (dc !== 0) return dc
    if (a.plannedOrder !== b.plannedOrder) return a.plannedOrder - b.plannedOrder
    const task = a.taskTitle.localeCompare(b.taskTitle, 'pt-BR')
    if (task !== 0) return task
    const sector = a.sectorTitle.localeCompare(b.sectorTitle, 'pt-BR')
    if (sector !== 0) return sector
    return a.activityTitle.localeCompare(b.activityTitle, 'pt-BR')
  })
}

export function summarizeFactoryIntakeGroup(
  items: readonly OperationalPlanningFactoryIntakeItem[],
): FactoryIntakeGroupSummary {
  let waitingMinutes = 0
  let reviewCount = 0
  let executedCount = 0
  let earliestPlannedDate: string | null = null
  let latestPlannedDate: string | null = null

  for (const item of items) {
    waitingMinutes += itemMinutes(item)
    if (item.reviewRequired) reviewCount += 1
    if ((item.realizedMinutes ?? 0) > 0) executedCount += 1
    if (item.plannedDate) {
      if (!earliestPlannedDate || item.plannedDate < earliestPlannedDate) {
        earliestPlannedDate = item.plannedDate
      }
      if (!latestPlannedDate || item.plannedDate > latestPlannedDate) {
        latestPlannedDate = item.plannedDate
      }
    }
  }

  return {
    itemCount: items.length,
    waitingMinutes,
    reviewCount,
    executedCount,
    earliestPlannedDate,
    latestPlannedDate,
  }
}

export function groupFactoryIntakeItemsByConveyor(
  items: readonly OperationalPlanningFactoryIntakeItem[],
): FactoryIntakeGroup[] {
  const byKey = new Map<string, OperationalPlanningFactoryIntakeItem[]>()

  for (const item of items) {
    const key = `${item.conveyorId}|${item.conveyorOperationalPlanId}`
    const bucket = byKey.get(key)
    if (bucket) bucket.push(item)
    else byKey.set(key, [item])
  }

  const groups: FactoryIntakeGroup[] = []
  for (const groupItems of byKey.values()) {
    const sorted = sortFactoryIntakeItems(groupItems)
    const first = sorted[0]!
    groups.push({
      conveyorId: first.conveyorId,
      conveyorOperationalPlanId: first.conveyorOperationalPlanId,
      conveyorName: first.conveyorName,
      factoryPlanningStatus: first.factoryPlanningStatus,
      items: sorted,
      summary: summarizeFactoryIntakeGroup(sorted),
    })
  }

  return groups.sort((a, b) => {
    const da = compareIsoDateNullable(
      a.summary.earliestPlannedDate,
      b.summary.earliestPlannedDate,
    )
    if (da !== 0) return da
    return a.conveyorName.localeCompare(b.conveyorName, 'pt-BR')
  })
}

function groupMatchesSearch(group: FactoryIntakeGroup, q: string): boolean {
  if (!q) return true
  const haystack = [
    group.conveyorName,
    ...group.items.flatMap((it) => [it.activityTitle, it.taskTitle, it.sectorTitle]),
  ]
    .map(normalizeSearchText)
    .join(' ')
  return haystack.includes(q)
}

function groupMatchesReviewFilter(
  group: FactoryIntakeGroup,
  review: FactoryIntakeReviewFilter,
): boolean {
  if (review === 'all') return true
  if (review === 'with_review') return group.summary.reviewCount > 0
  return group.summary.reviewCount === 0
}

function groupMatchesPeriodFilter(
  group: FactoryIntakeGroup,
  period: FactoryIntakePeriodFilter,
  week: FactoryIntakeWeekContext,
): boolean {
  if (period === 'all') return true

  if (period === 'this_week') {
    return group.items.some(
      (it) => it.plannedDate != null && isIsoDateInWeekdays(it.plannedDate, week.weekdayDates),
    )
  }

  if (period === 'no_date') {
    return group.items.some((it) => !it.plannedDate)
  }

  return group.items.some(
    (it) => it.plannedDate != null && it.plannedDate < week.weekMonday,
  )
}

export function isFactoryIntakeFiltersActive(filters: FactoryIntakeFilters): boolean {
  return (
    filters.q.trim().length > 0 ||
    filters.review !== 'all' ||
    filters.period !== 'all' ||
    filters.sync !== 'all' ||
    filters.execution !== 'all'
  )
}

export function filterFactoryIntakeGroups(
  groups: readonly FactoryIntakeGroup[],
  filters: FactoryIntakeFilters,
  week: FactoryIntakeWeekContext,
): FactoryIntakeGroup[] {
  const q = normalizeSearchText(filters.q)
  return groups.filter(
    (group) =>
      groupMatchesSearch(group, q) &&
      groupMatchesReviewFilter(group, filters.review) &&
      groupMatchesPeriodFilter(group, filters.period, week),
  )
}

export type FactoryIntakeTotals = {
  conveyorCount: number
  itemCount: number
  waitingMinutes: number
}

export function summarizeFactoryIntakeTotals(
  groups: readonly FactoryIntakeGroup[],
): FactoryIntakeTotals {
  let itemCount = 0
  let waitingMinutes = 0
  for (const group of groups) {
    itemCount += group.summary.itemCount
    waitingMinutes += group.summary.waitingMinutes
  }
  return {
    conveyorCount: groups.length,
    itemCount,
    waitingMinutes,
  }
}

export function buildVisibleFactoryIntakeGroups<
  TDraft extends FactoryIntakeDraftRef,
>(
  intakeItems: readonly OperationalPlanningFactoryIntakeItem[],
  draftItems: readonly TDraft[],
  filters: FactoryIntakeFilters,
  week: FactoryIntakeWeekContext,
): FactoryIntakeGroup[] {
  const visible = buildVisibleFactoryIntakeItems(intakeItems, draftItems)
  const grouped = groupFactoryIntakeItemsByConveyor(visible)
  return filterFactoryIntakeGroups(grouped, filters, week)
}

export function formatFactoryIntakeSuggestedPeriod(
  summary: FactoryIntakeGroupSummary,
): string | null {
  const { earliestPlannedDate, latestPlannedDate } = summary
  if (!earliestPlannedDate) return null
  if (!latestPlannedDate || earliestPlannedDate === latestPlannedDate) {
    return earliestPlannedDate
  }
  return `${earliestPlannedDate} → ${latestPlannedDate}`
}
