import { describe, expect, it } from 'vitest'
import { buildCollaboratorOperationalHealthDataQualityWarnings } from '../modules/collaborators/collaborator-operational-health.dataQuality.js'
import { collaboratorOperationalHealthQuerySchema } from '../modules/collaborators/collaborator-operational-health.schemas.js'
import { collaboratorHealthTimeWindowUtc } from '../modules/collaborators/collaborator-operational-health.service.js'

describe('collaborator-operational-health (unit)', () => {
  it('collaboratorHealthTimeWindowUtc: 7 dias terminando em 2026-05-01', () => {
    const { fromInclusive, toExclusive } = collaboratorHealthTimeWindowUtc('2026-05-01', 7)
    expect(fromInclusive.toISOString()).toBe('2026-04-25T00:00:00.000Z')
    expect(toExclusive.toISOString()).toBe('2026-05-02T00:00:00.000Z')
  })

  it('collaboratorHealthTimeWindowUtc: recentDays=1 é só o dia de referência', () => {
    const { fromInclusive, toExclusive } = collaboratorHealthTimeWindowUtc('2026-05-01', 1)
    expect(fromInclusive.toISOString()).toBe('2026-05-01T00:00:00.000Z')
    expect(toExclusive.toISOString()).toBe('2026-05-02T00:00:00.000Z')
  })

  it('collaboratorOperationalHealthQuerySchema aplica defaults e limites', () => {
    expect(collaboratorOperationalHealthQuerySchema.parse({})).toEqual({
      recentDays: 7,
    })
    expect(
      collaboratorOperationalHealthQuerySchema.parse({
        referenceDate: '2026-04-28',
        recentDays: 30,
      }),
    ).toEqual({ referenceDate: '2026-04-28', recentDays: 30 })
    expect(() =>
      collaboratorOperationalHealthQuerySchema.parse({ recentDays: 0 }),
    ).toThrow()
    expect(() =>
      collaboratorOperationalHealthQuerySchema.parse({ recentDays: 31 }),
    ).toThrow()
  })

  it('buildCollaboratorOperationalHealthDataQualityWarnings: ordem e combinações', () => {
    expect(
      buildCollaboratorOperationalHealthDataQualityWarnings({
        teamLinkedSteps: 1,
        capacitySource: 'FALLBACK',
        openDistinctSteps: 0,
        collaboratorIsActive: false,
      }).map((w) => w.code),
    ).toEqual([
      'TEAM_ASSIGNMENTS_INCLUDED',
      'CAPACITY_FALLBACK_USED',
      'NO_OPEN_ASSIGNMENTS',
      'COLLABORATOR_INACTIVE',
    ])
    expect(
      buildCollaboratorOperationalHealthDataQualityWarnings({
        teamLinkedSteps: 0,
        capacitySource: 'DEFAULT',
        openDistinctSteps: 2,
        collaboratorIsActive: true,
      }),
    ).toEqual([])
    expect(
      buildCollaboratorOperationalHealthDataQualityWarnings({
        teamLinkedSteps: 0,
        capacitySource: 'OVERRIDE',
        openDistinctSteps: 0,
        collaboratorIsActive: true,
      }).map((w) => w.code),
    ).toEqual(['NO_OPEN_ASSIGNMENTS'])
    expect(
      buildCollaboratorOperationalHealthDataQualityWarnings({
        teamLinkedSteps: 0,
        capacitySource: 'MISSING',
        openDistinctSteps: 1,
        collaboratorIsActive: true,
      }).map((w) => w.code),
    ).toEqual([])
  })

  it('cada warning inclui message não vazia', () => {
    const w = buildCollaboratorOperationalHealthDataQualityWarnings({
      teamLinkedSteps: 1,
      capacitySource: 'FALLBACK',
      openDistinctSteps: 0,
      collaboratorIsActive: false,
    })
    for (const row of w) {
      expect(row.message.length).toBeGreaterThan(0)
      expect(row.code).toBeTruthy()
    }
  })
})
