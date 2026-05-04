import { describe, expect, it } from 'vitest'
import { collaboratorOperationalHealthSummaryQuerySchema } from '../modules/collaborators/collaborator-operational-health.schemas.js'
import {
  collaboratorSummaryDaysSinceLastEntryUtc,
  computeOperationalHealthSummaryTotals,
  computeSummaryDeterministicStatus,
  mapSnapshotToOperationalHealthSummaryRow,
} from '../modules/collaborators/collaborator-operational-health-summary.service.js'
import type { CollaboratorOperationalHealthSnapshotV1 } from '../modules/collaborators/collaborator-operational-health.service.js'

const baseSnap = (): CollaboratorOperationalHealthSnapshotV1 => ({
  schemaVersion: '1.0.1',
  snapshotVersion: 'collaborator_operational_health_snapshot_v1',
  generatedAt: '2026-05-01T00:00:00.000Z',
  referenceDate: '2026-05-03',
  recentDays: 7,
  collaborator: {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    full_name: 'Teste',
    code: 'T1',
    status: 'ACTIVE',
    isActive: true,
  },
  capacity: {
    referenceDate: '2026-05-03',
    resolvedDailyMinutes: 480,
    source: 'DEFAULT',
    recentDays: 7,
    windowCapacityMinutes: 480 * 7,
  },
  workload: {
    openDistinctSteps: 2,
    plannedOpenMinutesSum: 100,
    realizedOpenMinutesSum: 20,
    pendingOpenMinutesSum: 80,
    primaryContributorSteps: 1,
    supportContributorSteps: 0,
    teamLinkedSteps: 0,
    collaboratorDirectSteps: 1,
  },
  recentTimeEntries: {
    windowFrom: '2026-04-27T00:00:00.000Z',
    windowToExclusive: '2026-05-04T00:00:00.000Z',
    totalMinutes: 120,
    entryCount: 3,
    lastEntryAt: '2026-05-02T12:00:00.000Z',
  },
  dataQuality: { warnings: [] },
})

const baseCollab = () => ({
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  code: 'T1' as string | null,
  full_name: 'Teste',
  email: null,
  phone: null,
  job_title: null,
  avatar_url: null,
  sector_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  sector_name: 'Costura',
  role_id: null,
  role_name: null,
  registration_code: null,
  nickname: null,
  status: 'ACTIVE',
  is_active: true,
  notes: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
})

describe('collaborator-operational-health-summary (unit)', () => {
  it('collaboratorSummaryDaysSinceLastEntryUtc', () => {
    expect(
      collaboratorSummaryDaysSinceLastEntryUtc('2026-05-01T10:00:00.000Z', '2026-05-03'),
    ).toBe(2)
    expect(collaboratorSummaryDaysSinceLastEntryUtc(null, '2026-05-03')).toBeNull()
  })

  it('collaboratorOperationalHealthSummaryQuerySchema defaults', () => {
    expect(collaboratorOperationalHealthSummaryQuerySchema.parse({})).toEqual({
      recentDays: 7,
      limit: 50,
      includeInactive: false,
    })
    expect(
      collaboratorOperationalHealthSummaryQuerySchema.parse({
        includeInactive: 'true',
        limit: '10',
      }),
    ).toMatchObject({ includeInactive: true, limit: 10 })
    expect(() =>
      collaboratorOperationalHealthSummaryQuerySchema.parse({ limit: 201 }),
    ).toThrow()
  })

  it('computeSummaryDeterministicStatus: sobrecarga crítica', () => {
    const o = computeSummaryDeterministicStatus({
      windowCapacityMinutes: 100,
      pendingOpenMinutes: 250,
      openStepsCount: 1,
      entryCount: 1,
      isActive: true,
      warningCodes: [],
    })
    expect(o.status).toBe('critical')
    expect(o.riskLevel).toBe('critical')
    expect(o.score).toBeLessThanOrEqual(25)
  })

  it('computeOperationalHealthSummaryTotals agrega linhas', () => {
    const snap = baseSnap()
    const row = mapSnapshotToOperationalHealthSummaryRow(baseCollab(), snap)
    const rowInactive = {
      ...row,
      collaborator: { ...row.collaborator, isActive: false },
    }
    const t = computeOperationalHealthSummaryTotals([row, rowInactive])
    expect(t.collaboratorsAnalyzed).toBe(2)
    expect(t.activeCollaborators).toBe(1)
    expect(t.inactiveCollaboratorsIncluded).toBe(1)
    expect(t.withoutOpenAssignments).toBe(0)
  })

  it('mapSnapshotToOperationalHealthSummaryRow: workload e sinais ordenados', () => {
    const snap = baseSnap()
    snap.dataQuality.warnings = [
      { code: 'TEAM_ASSIGNMENTS_INCLUDED', message: 'm1' },
      { code: 'CAPACITY_FALLBACK_USED', message: 'm2' },
    ]
    snap.workload.teamLinkedSteps = 1
    snap.capacity.source = 'FALLBACK'
    const row = mapSnapshotToOperationalHealthSummaryRow(baseCollab(), snap)
    expect(row.workload.teamMembershipStepsCount).toBe(1)
    expect(row.capacity.source).toBe('FALLBACK')
    const codes = row.signals.map((s) => s.code)
    expect(codes.indexOf('CAPACITY_FALLBACK_USED')).toBeLessThan(codes.indexOf('TEAM_ASSIGNMENTS_INCLUDED'))
  })
})
