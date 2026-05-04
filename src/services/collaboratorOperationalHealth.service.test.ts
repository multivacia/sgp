import { describe, expect, it } from 'vitest'
import { buildCollaboratorOperationalHealthSummaryQueryString } from './collaboratorOperationalHealth.service'

describe('collaboratorOperationalHealth.service', () => {
  it('buildCollaboratorOperationalHealthSummaryQueryString', () => {
    expect(buildCollaboratorOperationalHealthSummaryQueryString()).toBe('')
    expect(
      buildCollaboratorOperationalHealthSummaryQueryString({
        referenceDate: '2026-04-28',
        recentDays: 15,
        limit: 100,
        includeInactive: true,
      }),
    ).toBe('?referenceDate=2026-04-28&recentDays=15&limit=100&includeInactive=true')
    expect(
      buildCollaboratorOperationalHealthSummaryQueryString({
        includeInactive: false,
        recentDays: 7,
      }),
    ).toBe('?recentDays=7')
  })
})
