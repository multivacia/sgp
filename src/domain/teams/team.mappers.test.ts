import { describe, expect, it } from 'vitest'
import { teamMemberCreateToApiBody, teamMemberFromApiJson, teamMemberUpdateToApiBody } from './team.mappers'

describe('teamMember suggestionOrder mapping', () => {
  it('reads suggestionOrder and collaboratorCode from the API', () => {
    const row = teamMemberFromApiJson({
      id: 'm1',
      teamId: 't1',
      collaboratorId: 'c1',
      collaboratorFullName: 'João',
      collaboratorCode: 'J1',
      collaboratorEmail: null,
      collaboratorStatus: 'ACTIVE',
      collaboratorIsActive: true,
      collaboratorDeletedAt: null,
      role: null,
      isPrimary: true,
      suggestionOrder: 3,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(row.suggestionOrder).toBe(3)
    expect(row.collaboratorCode).toBe('J1')
  })

  it('defaults missing suggestionOrder to 1', () => {
    const row = teamMemberFromApiJson({
      id: 'm1',
      teamId: 't1',
      collaboratorId: 'c1',
      collaboratorFullName: 'João',
      collaboratorStatus: 'ACTIVE',
      collaboratorIsActive: true,
      isPrimary: false,
      isActive: true,
    })
    expect(row.suggestionOrder).toBe(1)
    expect(row.collaboratorCode).toBeNull()
  })

  it('sends suggestionOrder on create and update bodies', () => {
    expect(
      teamMemberCreateToApiBody({ collaboratorId: 'c1', suggestionOrder: 4 }),
    ).toMatchObject({ collaboratorId: 'c1', suggestionOrder: 4 })
    expect(teamMemberUpdateToApiBody({ suggestionOrder: 2 })).toEqual({ suggestionOrder: 2 })
  })
})
