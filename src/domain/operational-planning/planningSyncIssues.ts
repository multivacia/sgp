import type {
  OperationalPlanningPlanItem,
  OperationalPlanningPlanSyncDifference,
} from './operational-planning.types'

export function isPlanningItemSyncDiverged(
  item: Pick<OperationalPlanningPlanItem, 'syncStatus'>,
): boolean {
  return item.syncStatus === 'DIVERGED'
}

export function countPlanningSyncDivergences(
  items: readonly Pick<OperationalPlanningPlanItem, 'syncStatus'>[],
): number {
  return items.filter(isPlanningItemSyncDiverged).length
}

export const APPLYABLE_SYNC_DIFFERENCE_CODES = [
  'PLANNED_DATE_CHANGED',
  'PLANNED_MINUTES_CHANGED',
  'ASSIGNEE_CHANGED',
  'TEAM_CHANGED',
] as const satisfies readonly OperationalPlanningPlanSyncDifference['code'][]

export type ApplyableSyncDifferenceCode = (typeof APPLYABLE_SYNC_DIFFERENCE_CODES)[number]

export function hasApplyableConveyorPlanSyncDifferences(
  differences: readonly OperationalPlanningPlanSyncDifference[],
): boolean {
  return differences.some((d) =>
    (APPLYABLE_SYNC_DIFFERENCE_CODES as readonly string[]).includes(d.code),
  )
}

const SYNC_DIFFERENCE_FIELD_LABELS: Partial<
  Record<OperationalPlanningPlanSyncDifference['code'], string>
> = {
  PLANNED_DATE_CHANGED: 'Data',
  PLANNED_MINUTES_CHANGED: 'Minutos',
  ASSIGNEE_CHANGED: 'Colaborador',
  TEAM_CHANGED: 'Equipe',
}

function formatSyncFieldValue(code: OperationalPlanningPlanSyncDifference['code'], value: string | null): string {
  if (value == null || value === '') return '—'
  if (code === 'PLANNED_MINUTES_CHANGED') return `${value} min`
  return value
}

export function formatPlanningSyncDifferenceFieldLabel(
  code: OperationalPlanningPlanSyncDifference['code'],
): string {
  return SYNC_DIFFERENCE_FIELD_LABELS[code] ?? 'Campo'
}

export function formatPlanningSyncDifferenceShort(
  diff: OperationalPlanningPlanSyncDifference,
): string {
  return diff.message
}

export type PlanningSyncDifferenceComparison = {
  fieldLabel: string
  planDisplay: string
  factoryDisplay: string
}

export function buildPlanningSyncDifferenceComparison(
  diff: OperationalPlanningPlanSyncDifference,
): PlanningSyncDifferenceComparison {
  return {
    fieldLabel: formatPlanningSyncDifferenceFieldLabel(diff.code),
    planDisplay: formatSyncFieldValue(diff.code, diff.planValue),
    factoryDisplay: formatSyncFieldValue(diff.code, diff.factoryValue),
  }
}

export function formatPlanningSyncTooltip(
  differences: readonly OperationalPlanningPlanSyncDifference[],
): string {
  if (differences.length === 0) {
    return 'Pendência de sincronização com o plano da esteira.'
  }
  return differences.map(formatPlanningSyncDifferenceShort).join('\n')
}

export type PlanningSyncIssueListItem = OperationalPlanningPlanItem & {
  syncStatus: 'DIVERGED'
  syncDifferences: OperationalPlanningPlanSyncDifference[]
}

export function listPlanningSyncIssues(
  items: readonly OperationalPlanningPlanItem[],
): PlanningSyncIssueListItem[] {
  return items.filter(
    (item): item is PlanningSyncIssueListItem =>
      item.syncStatus === 'DIVERGED' &&
      Array.isArray(item.syncDifferences) &&
      item.syncDifferences.length >= 0,
  )
}
