import type pg from 'pg'
import type { CollaboratorApi } from './collaborators.dto.js'
import type { CollaboratorOperationalHealthSummaryQuery } from './collaborator-operational-health.schemas.js'
import { listCollaboratorsForOperationalHealthSummary } from './collaborators.repository.js'
import {
  collaboratorOperationalHealthReferenceDateOrTodayUtc,
  serviceGetCollaboratorOperationalHealthSnapshot,
  type CollaboratorOperationalHealthSnapshotV1,
} from './collaborator-operational-health.service.js'

export const COLLABORATOR_OPERATIONAL_HEALTH_SUMMARY_SCHEMA_VERSION = '1.0.0' as const
export const COLLABORATOR_OPERATIONAL_HEALTH_SUMMARY_VERSION =
  'collaborator_operational_health_summary_v1' as const

export type CollaboratorOperationalHealthSummarySignalV1 = {
  code: string
  severity: 'info' | 'warning' | 'critical'
  message: string
}

export type CollaboratorOperationalHealthSummaryRowV1 = {
  collaborator: {
    id: string
    fullName: string
    code: string | null
    status: string | null
    isActive: boolean
    sectorId: string | null
    sectorName: string | null
  }
  capacity: {
    resolvedDailyMinutes: number
    source: 'OVERRIDE' | 'DEFAULT' | 'FALLBACK' | 'MISSING'
    windowCapacityMinutes: number
  }
  workload: {
    openStepsCount: number
    plannedOpenMinutes: number
    pendingOpenMinutes: number
    realizedMinutesByCollaborator: number
    capacityUsagePercent: number
    teamMembershipStepsCount: number
  }
  recentTimeEntries: {
    entryCount: number
    totalMinutes: number
    lastEntryAt: string | null
    daysSinceLastEntry: number | null
  }
  deterministicStatus: {
    status: 'healthy' | 'attention' | 'critical' | 'unknown'
    riskLevel: 'low' | 'medium' | 'high' | 'critical' | 'unknown'
    score: number
  }
  signals: CollaboratorOperationalHealthSummarySignalV1[]
  dataQuality: { warnings: Array<{ code: string; message: string }> }
}

export type CollaboratorOperationalHealthSummaryTotalsV1 = {
  collaboratorsAnalyzed: number
  activeCollaborators: number
  inactiveCollaboratorsIncluded: number
  withoutOpenAssignments: number
  withTeamAssignments: number
  withCapacityFallback: number
  overloaded: number
  criticalOverloaded: number
  lowOccupation: number
  withoutRecentTimeEntries: number
}

export type CollaboratorOperationalHealthSummaryV1 = {
  schemaVersion: typeof COLLABORATOR_OPERATIONAL_HEALTH_SUMMARY_SCHEMA_VERSION
  summaryVersion: typeof COLLABORATOR_OPERATIONAL_HEALTH_SUMMARY_VERSION
  generatedAt: string
  referenceDate: string
  recentDays: number
  totals: CollaboratorOperationalHealthSummaryTotalsV1
  rows: CollaboratorOperationalHealthSummaryRowV1[]
}

/** Dias inteiros entre o dia UTC de `lastEntryAtIso` e o dia `referenceDate` (YYYY-MM-DD). */
export function collaboratorSummaryDaysSinceLastEntryUtc(
  lastEntryAtIso: string | null,
  referenceDate: string,
): number | null {
  if (!lastEntryAtIso) return null
  const [y, m, d] = referenceDate.split('-').map((v) => Number(v))
  const refDay = Date.UTC(y, m - 1, d)
  const last = new Date(lastEntryAtIso)
  const lastDay = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate())
  return Math.max(0, Math.round((refDay - lastDay) / 86_400_000))
}

function capacityUsagePercentDeterministic(
  pendingOpenMinutes: number,
  windowCapacityMinutes: number,
): number {
  if (windowCapacityMinutes <= 0) {
    return pendingOpenMinutes > 0 ? 999 : 0
  }
  return Math.min(999, Math.round((100 * pendingOpenMinutes) / windowCapacityMinutes))
}

function isLowRecentOccupation(input: {
  openStepsCount: number
  windowCapacityMinutes: number
  totalMinutes: number
  pendingOpenMinutes: number
}): boolean {
  const { openStepsCount, windowCapacityMinutes, totalMinutes, pendingOpenMinutes } = input
  return (
    openStepsCount > 0 &&
    windowCapacityMinutes > 0 &&
    pendingOpenMinutes > 0 &&
    totalMinutes < windowCapacityMinutes * 0.15
  )
}

function warningToSignal(
  w: { code: string; message: string },
): CollaboratorOperationalHealthSummarySignalV1 {
  let severity: CollaboratorOperationalHealthSummarySignalV1['severity'] = 'info'
  if (w.code === 'COLLABORATOR_INACTIVE') severity = 'warning'
  else if (w.code === 'CAPACITY_FALLBACK_USED') severity = 'warning'
  else if (w.code === 'TEAM_ASSIGNMENTS_INCLUDED') severity = 'info'
  else if (w.code === 'NO_OPEN_ASSIGNMENTS') severity = 'info'
  return { code: w.code, severity, message: w.message }
}

function severityRank(s: CollaboratorOperationalHealthSummarySignalV1['severity']): number {
  if (s === 'critical') return 0
  if (s === 'warning') return 1
  return 2
}

function sortSignalsDeterministic(
  signals: CollaboratorOperationalHealthSummarySignalV1[],
): CollaboratorOperationalHealthSummarySignalV1[] {
  return [...signals].sort((a, b) => {
    const dr = severityRank(a.severity) - severityRank(b.severity)
    if (dr !== 0) return dr
    return a.code.localeCompare(b.code)
  })
}

export function computeSummaryDeterministicStatus(input: {
  windowCapacityMinutes: number
  pendingOpenMinutes: number
  openStepsCount: number
  entryCount: number
  isActive: boolean
  warningCodes: string[]
}): CollaboratorOperationalHealthSummaryRowV1['deterministicStatus'] {
  const { windowCapacityMinutes: wc, pendingOpenMinutes: pending, openStepsCount, entryCount } =
    input

  const criticalOverload = wc > 0 && pending > 2 * wc
  const overload = wc > 0 && pending > wc
  const ambiguousCapacity = wc <= 0 && pending === 0 && openStepsCount === 0
  const brokenCapacity = wc <= 0 && pending > 0

  let score = 78
  let status: CollaboratorOperationalHealthSummaryRowV1['deterministicStatus']['status'] =
    'healthy'
  let riskLevel: CollaboratorOperationalHealthSummaryRowV1['deterministicStatus']['riskLevel'] =
    'low'

  if (brokenCapacity) {
    return { status: 'critical', riskLevel: 'critical', score: 12 }
  }
  if (ambiguousCapacity) {
    return { status: 'unknown', riskLevel: 'unknown', score: 55 }
  }
  if (criticalOverload) {
    return { status: 'critical', riskLevel: 'critical', score: 18 }
  }
  if (overload) {
    score = 34
    status = 'critical'
    riskLevel = 'high'
  } else if (wc > 0 && pending > Math.floor(wc * 0.75)) {
    score = 52
    status = 'attention'
    riskLevel = 'medium'
  }

  if (!input.isActive) {
    score = Math.min(score, 38)
    if (status === 'healthy') {
      status = 'attention'
      riskLevel = 'medium'
    } else if (status === 'attention') {
      riskLevel = 'high'
    }
  }

  if (entryCount === 0 && openStepsCount > 0) {
    score -= 14
    if (score < 40 && status === 'healthy') {
      status = 'attention'
      riskLevel = 'medium'
    }
  }

  if (input.warningCodes.includes('CAPACITY_FALLBACK_USED')) {
    score -= 4
  }

  score = Math.max(0, Math.min(100, Math.round(score)))

  if (status === 'healthy' && score < 62) {
    status = 'attention'
    if (riskLevel === 'low') riskLevel = 'medium'
  }

  return { status, riskLevel, score }
}

function buildExtraSignals(input: {
  windowCapacityMinutes: number
  pendingOpenMinutes: number
  openStepsCount: number
  entryCount: number
  lowOccupation: boolean
}): CollaboratorOperationalHealthSummarySignalV1[] {
  const out: CollaboratorOperationalHealthSummarySignalV1[] = []
  const { windowCapacityMinutes: wc, pendingOpenMinutes: pending, openStepsCount, entryCount } =
    input

  if (wc > 0 && pending > 2 * wc) {
    out.push({
      code: 'PENDING_CRITICAL_OVER_WINDOW',
      severity: 'critical',
      message:
        'Pendência estimada em STEPs abertos excede o dobro da capacidade agregada na janela (minutos).',
    })
  } else if (wc > 0 && pending > wc) {
    out.push({
      code: 'PENDING_OVER_WINDOW_CAPACITY',
      severity: 'warning',
      message:
        'Pendência estimada em STEPs abertos excede a capacidade agregada na janela (minutos).',
    })
  }

  if (entryCount === 0 && openStepsCount > 0) {
    out.push({
      code: 'NO_RECENT_TIME_ENTRIES_WITH_OPEN_WORK',
      severity: 'warning',
      message:
        'Existem STEPs abertos atribuídos, mas não há apontamentos na janela de dias recentes.',
    })
  }

  if (input.lowOccupation) {
    out.push({
      code: 'LOW_RECENT_TIME_OCCUPATION',
      severity: 'info',
      message:
        'Com STEPs abertos e pendência, o tempo apontado na janela recente está abaixo de 15% da capacidade da janela.',
    })
  }

  return out
}

export function mapSnapshotToOperationalHealthSummaryRow(
  collaborator: CollaboratorApi,
  snapshot: CollaboratorOperationalHealthSnapshotV1,
): CollaboratorOperationalHealthSummaryRowV1 {
  const referenceDate = snapshot.referenceDate
  const wc = snapshot.capacity.windowCapacityMinutes
  const pending = snapshot.workload.pendingOpenMinutesSum
  const openSteps = snapshot.workload.openDistinctSteps
  const planned = snapshot.workload.plannedOpenMinutesSum
  const realized = snapshot.workload.realizedOpenMinutesSum
  const teamN = snapshot.workload.teamLinkedSteps
  const entryCount = snapshot.recentTimeEntries.entryCount
  const totalMinutes = snapshot.recentTimeEntries.totalMinutes
  const lastAt = snapshot.recentTimeEntries.lastEntryAt

  const lowOccup = isLowRecentOccupation({
    openStepsCount: openSteps,
    windowCapacityMinutes: wc,
    totalMinutes,
    pendingOpenMinutes: pending,
  })

  const warningCodes = snapshot.dataQuality.warnings.map((w) => w.code)
  const deterministicStatus = computeSummaryDeterministicStatus({
    windowCapacityMinutes: wc,
    pendingOpenMinutes: pending,
    openStepsCount: openSteps,
    entryCount,
    isActive: collaborator.is_active,
    warningCodes,
  })

  const fromWarnings = snapshot.dataQuality.warnings.map(warningToSignal)
  const extra = buildExtraSignals({
    windowCapacityMinutes: wc,
    pendingOpenMinutes: pending,
    openStepsCount: openSteps,
    entryCount,
    lowOccupation: lowOccup,
  })
  const signals = sortSignalsDeterministic([...fromWarnings, ...extra])

  return {
    collaborator: {
      id: collaborator.id,
      fullName: collaborator.full_name,
      code: collaborator.code,
      status: collaborator.status,
      isActive: collaborator.is_active,
      sectorId: collaborator.sector_id,
      sectorName: collaborator.sector_name,
    },
    capacity: {
      resolvedDailyMinutes: snapshot.capacity.resolvedDailyMinutes,
      source: snapshot.capacity.source,
      windowCapacityMinutes: wc,
    },
    workload: {
      openStepsCount: openSteps,
      plannedOpenMinutes: planned,
      pendingOpenMinutes: pending,
      realizedMinutesByCollaborator: realized,
      capacityUsagePercent: capacityUsagePercentDeterministic(pending, wc),
      teamMembershipStepsCount: teamN,
    },
    recentTimeEntries: {
      entryCount,
      totalMinutes,
      lastEntryAt: lastAt,
      daysSinceLastEntry: collaboratorSummaryDaysSinceLastEntryUtc(lastAt, referenceDate),
    },
    deterministicStatus,
    signals,
    dataQuality: { warnings: snapshot.dataQuality.warnings },
  }
}

export function computeOperationalHealthSummaryTotals(
  rows: CollaboratorOperationalHealthSummaryRowV1[],
): CollaboratorOperationalHealthSummaryTotalsV1 {
  let activeCollaborators = 0
  let inactiveCollaboratorsIncluded = 0
  let withoutOpenAssignments = 0
  let withTeamAssignments = 0
  let withCapacityFallback = 0
  let overloaded = 0
  let criticalOverloaded = 0
  let lowOccupation = 0
  let withoutRecentTimeEntries = 0

  for (const r of rows) {
    if (r.collaborator.isActive) activeCollaborators += 1
    else inactiveCollaboratorsIncluded += 1

    const wc = r.capacity.windowCapacityMinutes
    const pending = r.workload.pendingOpenMinutes
    const openSteps = r.workload.openStepsCount
    const teamN = r.workload.teamMembershipStepsCount

    if (openSteps === 0) withoutOpenAssignments += 1
    if (teamN > 0) withTeamAssignments += 1
    if (r.capacity.source === 'FALLBACK') withCapacityFallback += 1
    if (wc > 0 && pending > wc) overloaded += 1
    if (wc > 0 && pending > 2 * wc) criticalOverloaded += 1
    if (
      openSteps > 0 &&
      wc > 0 &&
      pending > 0 &&
      r.recentTimeEntries.totalMinutes < wc * 0.15
    ) {
      lowOccupation += 1
    }
    if (r.recentTimeEntries.entryCount === 0) withoutRecentTimeEntries += 1
  }

  return {
    collaboratorsAnalyzed: rows.length,
    activeCollaborators,
    inactiveCollaboratorsIncluded,
    withoutOpenAssignments,
    withTeamAssignments,
    withCapacityFallback,
    overloaded,
    criticalOverloaded,
    lowOccupation,
    withoutRecentTimeEntries,
  }
}

export async function serviceGetCollaboratorsOperationalHealthSummary(
  pool: pg.Pool,
  query: CollaboratorOperationalHealthSummaryQuery,
): Promise<{
  summary: CollaboratorOperationalHealthSummaryV1
  meta: { limit: number; returned: number; hasMore: boolean }
}> {
  const referenceDate = collaboratorOperationalHealthReferenceDateOrTodayUtc(query.referenceDate)
  const recentDays = query.recentDays ?? 7
  const limit = query.limit ?? 50
  const includeInactive = query.includeInactive ?? false

  const snapshotQuery = {
    referenceDate: query.referenceDate,
    recentDays: query.recentDays ?? 7,
  }

  const fetchSize = limit + 1
  const page = await listCollaboratorsForOperationalHealthSummary(pool, {
    includeInactive,
    limit: fetchSize,
    offset: 0,
  })

  const hasMore = page.length > limit
  const slice = page.slice(0, limit)

  const rows: CollaboratorOperationalHealthSummaryRowV1[] = []
  for (const c of slice) {
    const snap = await serviceGetCollaboratorOperationalHealthSnapshot(pool, c.id, snapshotQuery)
    rows.push(mapSnapshotToOperationalHealthSummaryRow(c, snap))
  }

  const totals = computeOperationalHealthSummaryTotals(rows)

  const summary: CollaboratorOperationalHealthSummaryV1 = {
    schemaVersion: COLLABORATOR_OPERATIONAL_HEALTH_SUMMARY_SCHEMA_VERSION,
    summaryVersion: COLLABORATOR_OPERATIONAL_HEALTH_SUMMARY_VERSION,
    generatedAt: new Date().toISOString(),
    referenceDate,
    recentDays,
    totals,
    rows,
  }

  return {
    summary,
    meta: { limit, returned: rows.length, hasMore },
  }
}
