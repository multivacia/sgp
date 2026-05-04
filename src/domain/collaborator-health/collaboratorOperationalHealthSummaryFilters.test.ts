import { describe, expect, it } from 'vitest'
import { filterCollaboratorHealthSummaryRows } from './collaboratorOperationalHealthSummaryFilters'
import type { CollaboratorOperationalHealthSummaryRow } from './collaboratorOperationalHealth.types'

function row(
  id: string,
  name: string,
  code: string | null,
  status: CollaboratorOperationalHealthSummaryRow['deterministicStatus']['status'],
): CollaboratorOperationalHealthSummaryRow {
  return {
    collaborator: {
      id,
      fullName: name,
      code,
      status: 'ACTIVE',
      isActive: true,
      sectorId: null,
      sectorName: null,
    },
    capacity: { resolvedDailyMinutes: 480, source: 'DEFAULT', windowCapacityMinutes: 3360 },
    workload: {
      openStepsCount: 1,
      plannedOpenMinutes: 60,
      pendingOpenMinutes: 40,
      realizedMinutesByCollaborator: 20,
      capacityUsagePercent: 10,
      teamMembershipStepsCount: 0,
    },
    recentTimeEntries: {
      entryCount: 1,
      totalMinutes: 30,
      lastEntryAt: null,
      daysSinceLastEntry: null,
    },
    deterministicStatus: { status, riskLevel: 'low', score: 80 },
    signals: [],
    dataQuality: { warnings: [] },
  }
}

describe('filterCollaboratorHealthSummaryRows', () => {
  const rows = [
    row('1', 'Ana Costa', 'COL-A', 'healthy'),
    row('2', 'Bruno Silva', 'COL-B', 'critical'),
    row('3', 'Carla Mendes', 'COL-X1', 'attention'),
  ]

  it('filtra por estado', () => {
    expect(filterCollaboratorHealthSummaryRows(rows, { search: '', status: 'critical' })).toHaveLength(1)
    expect(filterCollaboratorHealthSummaryRows(rows, { search: '', status: 'all' })).toHaveLength(3)
  })

  it('filtra por busca local', () => {
    expect(filterCollaboratorHealthSummaryRows(rows, { search: 'ana', status: 'all' })).toHaveLength(1)
    expect(filterCollaboratorHealthSummaryRows(rows, { search: 'col-x1', status: 'all' })).toHaveLength(1)
  })
})
