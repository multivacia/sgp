/** Contratos alinhados ao backend (após normalização em `collaboratorOperationalHealth.mappers`). */

export type CollaboratorHealthRiskLevel =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'unknown'

export type CollaboratorHealthStatus = 'healthy' | 'attention' | 'critical' | 'unknown'

export type CollaboratorHealthSignalSeverity = 'info' | 'warning' | 'critical'

export type CollaboratorOperationalHealthCapacitySource =
  | 'OVERRIDE'
  | 'DEFAULT'
  | 'FALLBACK'
  | 'MISSING'

export type CollaboratorOperationalHealthWarning = {
  code: string
  message: string
}

export type CollaboratorOperationalHealthSignal = {
  code: string
  severity: CollaboratorHealthSignalSeverity
  message: string
}

export type CollaboratorOperationalHealthDeterministicStatus = {
  status: CollaboratorHealthStatus
  riskLevel: CollaboratorHealthRiskLevel
  score: number
}

export type CollaboratorOperationalHealthSnapshotCollaborator = {
  id: string
  fullName: string
  code: string | null
  status: string
  isActive: boolean
}

export type CollaboratorOperationalHealthSnapshotCapacity = {
  referenceDate: string
  resolvedDailyMinutes: number
  source: CollaboratorOperationalHealthCapacitySource
  recentDays: number
  windowCapacityMinutes: number
}

export type CollaboratorOperationalHealthSnapshotWorkload = {
  openDistinctSteps: number
  plannedOpenMinutesSum: number
  realizedOpenMinutesSum: number
  pendingOpenMinutesSum: number
  primaryContributorSteps: number
  supportContributorSteps: number
  teamLinkedSteps: number
  collaboratorDirectSteps: number
}

export type CollaboratorOperationalHealthSnapshotRecentTimeEntries = {
  windowFrom: string
  windowToExclusive: string
  totalMinutes: number
  entryCount: number
  lastEntryAt: string | null
}

export type CollaboratorOperationalHealthSnapshot = {
  schemaVersion: string
  snapshotVersion: string
  generatedAt: string
  referenceDate: string
  recentDays: number
  collaborator: CollaboratorOperationalHealthSnapshotCollaborator
  capacity: CollaboratorOperationalHealthSnapshotCapacity
  workload: CollaboratorOperationalHealthSnapshotWorkload
  recentTimeEntries: CollaboratorOperationalHealthSnapshotRecentTimeEntries
  dataQuality: { warnings: CollaboratorOperationalHealthWarning[] }
}

export type CollaboratorOperationalHealthSummaryCollaborator = {
  id: string
  fullName: string
  code: string | null
  status: string | null
  isActive: boolean
  sectorId: string | null
  sectorName: string | null
}

export type CollaboratorOperationalHealthSummaryRow = {
  collaborator: CollaboratorOperationalHealthSummaryCollaborator
  capacity: {
    resolvedDailyMinutes: number
    source: CollaboratorOperationalHealthCapacitySource
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
  deterministicStatus: CollaboratorOperationalHealthDeterministicStatus
  signals: CollaboratorOperationalHealthSignal[]
  dataQuality: { warnings: CollaboratorOperationalHealthWarning[] }
}

export type CollaboratorOperationalHealthSummaryTotals = {
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

export type CollaboratorOperationalHealthSummary = {
  schemaVersion: string
  summaryVersion: string
  generatedAt: string
  referenceDate: string
  recentDays: number
  totals: CollaboratorOperationalHealthSummaryTotals
  rows: CollaboratorOperationalHealthSummaryRow[]
}

export type CollaboratorOperationalHealthSummaryParams = {
  referenceDate?: string
  recentDays?: number
  limit?: number
  includeInactive?: boolean
}

export type CollaboratorOperationalHealthSummaryMeta = {
  limit: number
  returned: number
  hasMore: boolean
}

export type CollaboratorOperationalHealthSnapshotParams = {
  referenceDate?: string
  recentDays?: number
}

export type CollaboratorHealthSummaryStatusFilter =
  | 'all'
  | 'critical'
  | 'attention'
  | 'healthy'
  | 'unknown'
