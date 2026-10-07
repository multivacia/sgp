/**
 * Saúde operacional: snapshots fictícios por colaborador → linhas/totais calculados pelas
 * funções REAIS do backend (mapSnapshotToOperationalHealthSummaryRow, computeOperationalHealthSummaryTotals,
 * buildCollaboratorOperationalHealthDataQualityWarnings). Sem banco.
 * Saída: { summary, meta, snapshots: { [collaboratorId]: snapshot } }
 */
import {
  COLLABORATOR_OPERATIONAL_HEALTH_SUMMARY_SCHEMA_VERSION,
  COLLABORATOR_OPERATIONAL_HEALTH_SUMMARY_VERSION,
  computeOperationalHealthSummaryTotals,
  mapSnapshotToOperationalHealthSummaryRow,
} from '../../../../server/src/modules/collaborators/collaborator-operational-health-summary.service.js'
import {
  COLLABORATOR_OPERATIONAL_HEALTH_SNAPSHOT_SCHEMA_VERSION,
  COLLABORATOR_OPERATIONAL_HEALTH_SNAPSHOT_VERSION,
} from '../../../../server/src/modules/collaborators/collaborator-operational-health.service.js'
import { buildCollaboratorOperationalHealthDataQualityWarnings } from '../../../../server/src/modules/collaborators/collaborator-operational-health.dataQuality.js'
import { collaboratorApiJson } from '../fixtures/reference.mjs'
import { COLLABORATORS, FIXED_NOW_ISO, TODAY } from '../fixtures/common.mjs'

const RECENT_DAYS = 7
// [openSteps, planned, realized, team, entries, minutes, lastAt, dailyCapacity, source]
const PROFILE: Record<string, [number, number, number, number, number, number, string | null, number, string]> = {
  'col-ana': [0, 0, 0, 0, 0, 0, null, 480, 'DEFAULT'],
  'col-carlos': [9, 3600, 465, 0, 6, 465, '2026-06-30T19:00:00.000Z', 480, 'DEFAULT'],
  'col-bruno': [5, 690, 165, 1, 3, 165, '2026-06-30T17:30:00.000Z', 480, 'DEFAULT'],
  'col-diana': [6, 2400, 175, 2, 2, 70, '2026-06-26T18:00:00.000Z', 480, 'DEFAULT'],
  'col-eduardo': [4, 1800, 40, 0, 1, 40, '2026-06-29T15:00:00.000Z', 360, 'OVERRIDE'],
  'col-fernanda': [2, 300, 45, 0, 0, 0, null, 480, 'FALLBACK'],
}

const windowFrom = '2026-06-24T03:00:00.000Z'
const windowTo = '2026-07-02T03:00:00.000Z'

const snapshots: Record<string, unknown> = {}
const rows = []
for (const c of COLLABORATORS) {
  const api = collaboratorApiJson(c)
  const [open, planned, realized, team, entries, minutes, lastAt, daily, source] = PROFILE[c.id]
  const snap = {
    schemaVersion: COLLABORATOR_OPERATIONAL_HEALTH_SNAPSHOT_SCHEMA_VERSION,
    snapshotVersion: COLLABORATOR_OPERATIONAL_HEALTH_SNAPSHOT_VERSION,
    generatedAt: FIXED_NOW_ISO,
    referenceDate: TODAY,
    recentDays: RECENT_DAYS,
    collaborator: { id: c.id, full_name: c.full_name, code: c.code, status: 'ACTIVE', isActive: true },
    capacity: { referenceDate: TODAY, resolvedDailyMinutes: daily, source, recentDays: RECENT_DAYS, windowCapacityMinutes: daily * 5 },
    workload: {
      openDistinctSteps: open,
      plannedOpenMinutesSum: planned,
      realizedOpenMinutesSum: realized,
      pendingOpenMinutesSum: Math.max(0, planned - realized),
      primaryContributorSteps: open - team,
      supportContributorSteps: 0,
      teamLinkedSteps: team,
      collaboratorDirectSteps: open - team,
    },
    recentTimeEntries: { windowFrom, windowToExclusive: windowTo, totalMinutes: minutes, entryCount: entries, lastEntryAt: lastAt },
    dataQuality: {
      warnings: buildCollaboratorOperationalHealthDataQualityWarnings({
        teamLinkedSteps: team,
        capacitySource: source as never,
        openDistinctSteps: open,
        collaboratorIsActive: true,
      }),
    },
  }
  snapshots[c.id] = snap
  rows.push(mapSnapshotToOperationalHealthSummaryRow(api as never, snap as never))
}

const summary = {
  schemaVersion: COLLABORATOR_OPERATIONAL_HEALTH_SUMMARY_SCHEMA_VERSION,
  summaryVersion: COLLABORATOR_OPERATIONAL_HEALTH_SUMMARY_VERSION,
  generatedAt: FIXED_NOW_ISO,
  referenceDate: TODAY,
  recentDays: RECENT_DAYS,
  totals: computeOperationalHealthSummaryTotals(rows),
  rows,
}
process.stdout.write(JSON.stringify({ summary, meta: { limit: 50, returned: rows.length, hasMore: false }, snapshots }))
