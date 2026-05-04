import type {
  CollaboratorHealthRiskLevel,
  CollaboratorHealthStatus,
  CollaboratorHealthSignalSeverity,
  CollaboratorOperationalHealthCapacitySource,
  CollaboratorOperationalHealthDeterministicStatus,
  CollaboratorOperationalHealthSignal,
  CollaboratorOperationalHealthSnapshot,
  CollaboratorOperationalHealthSnapshotCollaborator,
  CollaboratorOperationalHealthSummary,
  CollaboratorOperationalHealthSummaryRow,
  CollaboratorOperationalHealthWarning,
} from './collaboratorOperationalHealth.types'

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function bool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function nullableStr(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') return v
  return null
}

function parseCapacitySource(v: unknown): CollaboratorOperationalHealthCapacitySource {
  const s = str(v)
  if (s === 'OVERRIDE' || s === 'DEFAULT' || s === 'FALLBACK' || s === 'MISSING') return s
  return 'MISSING'
}

function parseRisk(v: unknown): CollaboratorHealthRiskLevel {
  const s = str(v)
  if (s === 'low' || s === 'medium' || s === 'high' || s === 'critical' || s === 'unknown') return s
  return 'unknown'
}

function parseStatus(v: unknown): CollaboratorHealthStatus {
  const s = str(v)
  if (s === 'healthy' || s === 'attention' || s === 'critical' || s === 'unknown') return s
  return 'unknown'
}

function parseSeverity(v: unknown): CollaboratorHealthSignalSeverity {
  const s = str(v)
  if (s === 'info' || s === 'warning' || s === 'critical') return s
  return 'info'
}

function parseWarnings(raw: unknown): CollaboratorOperationalHealthWarning[] {
  if (!isRecord(raw) || !Array.isArray(raw.warnings)) return []
  return raw.warnings.map((w) => {
    if (!isRecord(w)) return { code: '', message: '' }
    return { code: str(w.code), message: str(w.message) }
  })
}

function parseSignals(raw: unknown): CollaboratorOperationalHealthSignal[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((s) => {
      if (!isRecord(s)) return null
      return {
        code: str(s.code),
        severity: parseSeverity(s.severity),
        message: str(s.message),
      }
    })
    .filter((x): x is CollaboratorOperationalHealthSignal => x !== null)
}

function parseSnapshotCollaborator(raw: unknown): CollaboratorOperationalHealthSnapshotCollaborator {
  if (!isRecord(raw)) {
    return { id: '', fullName: '', code: null, status: '', isActive: false }
  }
  const fullName = str(raw.fullName || raw.full_name, '')
  return {
    id: str(raw.id),
    fullName,
    code: nullableStr(raw.code),
    status: str(raw.status, ''),
    isActive: bool(raw.isActive ?? raw.is_active),
  }
}

export function collaboratorOperationalHealthSnapshotFromApi(
  raw: unknown,
): CollaboratorOperationalHealthSnapshot {
  if (!isRecord(raw)) {
    throw new Error('Resposta de snapshot inválida.')
  }
  const collab = parseSnapshotCollaborator(raw.collaborator)
  const cap = isRecord(raw.capacity) ? raw.capacity : {}
  const wl = isRecord(raw.workload) ? raw.workload : {}
  const rte = isRecord(raw.recentTimeEntries) ? raw.recentTimeEntries : {}
  const dq = isRecord(raw.dataQuality) ? raw.dataQuality : {}

  return {
    schemaVersion: str(raw.schemaVersion),
    snapshotVersion: str(raw.snapshotVersion),
    generatedAt: str(raw.generatedAt),
    referenceDate: str(raw.referenceDate),
    recentDays: num(raw.recentDays, 7),
    collaborator: collab,
    capacity: {
      referenceDate: str(cap.referenceDate || raw.referenceDate),
      resolvedDailyMinutes: num(cap.resolvedDailyMinutes),
      source: parseCapacitySource(cap.source),
      recentDays: num(cap.recentDays || raw.recentDays, 7),
      windowCapacityMinutes: num(cap.windowCapacityMinutes),
    },
    workload: {
      openDistinctSteps: num(wl.openDistinctSteps),
      plannedOpenMinutesSum: num(wl.plannedOpenMinutesSum),
      realizedOpenMinutesSum: num(wl.realizedOpenMinutesSum),
      pendingOpenMinutesSum: num(wl.pendingOpenMinutesSum),
      primaryContributorSteps: num(wl.primaryContributorSteps),
      supportContributorSteps: num(wl.supportContributorSteps),
      teamLinkedSteps: num(wl.teamLinkedSteps),
      collaboratorDirectSteps: num(wl.collaboratorDirectSteps),
    },
    recentTimeEntries: {
      windowFrom: str(rte.windowFrom),
      windowToExclusive: str(rte.windowToExclusive),
      totalMinutes: num(rte.totalMinutes),
      entryCount: num(rte.entryCount),
      lastEntryAt: nullableStr(rte.lastEntryAt),
    },
    dataQuality: { warnings: parseWarnings(dq) },
  }
}

function parseDeterministicStatus(raw: unknown): CollaboratorOperationalHealthDeterministicStatus {
  if (!isRecord(raw)) {
    return { status: 'unknown', riskLevel: 'unknown', score: 0 }
  }
  return {
    status: parseStatus(raw.status),
    riskLevel: parseRisk(raw.riskLevel),
    score: num(raw.score),
  }
}

function parseSummaryRow(raw: unknown): CollaboratorOperationalHealthSummaryRow | null {
  if (!isRecord(raw)) return null
  const c = isRecord(raw.collaborator) ? raw.collaborator : {}
  const cap = isRecord(raw.capacity) ? raw.capacity : {}
  const wl = isRecord(raw.workload) ? raw.workload : {}
  const rte = isRecord(raw.recentTimeEntries) ? raw.recentTimeEntries : {}
  const st = raw.deterministicStatus
  const dq = isRecord(raw.dataQuality) ? raw.dataQuality : {}

  return {
    collaborator: {
      id: str(c.id),
      fullName: str(c.fullName || c.full_name),
      code: nullableStr(c.code),
      status: nullableStr(c.status),
      isActive: bool(c.isActive ?? c.is_active, true),
      sectorId: nullableStr(c.sectorId ?? c.sector_id),
      sectorName: nullableStr(c.sectorName ?? c.sector_name),
    },
    capacity: {
      resolvedDailyMinutes: num(cap.resolvedDailyMinutes),
      source: parseCapacitySource(cap.source),
      windowCapacityMinutes: num(cap.windowCapacityMinutes),
    },
    workload: {
      openStepsCount: num(wl.openStepsCount),
      plannedOpenMinutes: num(wl.plannedOpenMinutes),
      pendingOpenMinutes: num(wl.pendingOpenMinutes),
      realizedMinutesByCollaborator: num(wl.realizedMinutesByCollaborator),
      capacityUsagePercent: num(wl.capacityUsagePercent),
      teamMembershipStepsCount: num(wl.teamMembershipStepsCount),
    },
    recentTimeEntries: {
      entryCount: num(rte.entryCount),
      totalMinutes: num(rte.totalMinutes),
      lastEntryAt: nullableStr(rte.lastEntryAt),
      daysSinceLastEntry:
        rte.daysSinceLastEntry === null || rte.daysSinceLastEntry === undefined
          ? null
          : num(rte.daysSinceLastEntry),
    },
    deterministicStatus: parseDeterministicStatus(st),
    signals: parseSignals(raw.signals),
    dataQuality: { warnings: parseWarnings(dq) },
  }
}

function parseTotals(raw: unknown): CollaboratorOperationalHealthSummary['totals'] {
  if (!isRecord(raw)) {
    return {
      collaboratorsAnalyzed: 0,
      activeCollaborators: 0,
      inactiveCollaboratorsIncluded: 0,
      withoutOpenAssignments: 0,
      withTeamAssignments: 0,
      withCapacityFallback: 0,
      overloaded: 0,
      criticalOverloaded: 0,
      lowOccupation: 0,
      withoutRecentTimeEntries: 0,
    }
  }
  return {
    collaboratorsAnalyzed: num(raw.collaboratorsAnalyzed),
    activeCollaborators: num(raw.activeCollaborators),
    inactiveCollaboratorsIncluded: num(raw.inactiveCollaboratorsIncluded),
    withoutOpenAssignments: num(raw.withoutOpenAssignments),
    withTeamAssignments: num(raw.withTeamAssignments),
    withCapacityFallback: num(raw.withCapacityFallback),
    overloaded: num(raw.overloaded),
    criticalOverloaded: num(raw.criticalOverloaded),
    lowOccupation: num(raw.lowOccupation),
    withoutRecentTimeEntries: num(raw.withoutRecentTimeEntries),
  }
}

export function collaboratorOperationalHealthSummaryFromApi(raw: unknown): CollaboratorOperationalHealthSummary {
  if (!isRecord(raw)) {
    throw new Error('Resposta de resumo inválida.')
  }
  const rowsRaw = Array.isArray(raw.rows) ? raw.rows : []
  const rows = rowsRaw.map(parseSummaryRow).filter((r): r is CollaboratorOperationalHealthSummaryRow => r !== null)

  return {
    schemaVersion: str(raw.schemaVersion),
    summaryVersion: str(raw.summaryVersion),
    generatedAt: str(raw.generatedAt),
    referenceDate: str(raw.referenceDate),
    recentDays: num(raw.recentDays, 7),
    totals: parseTotals(raw.totals),
    rows,
  }
}
