import { describe, expect, it } from 'vitest'
import {
  buildPlanningSuggestionContext,
  compareCollaboratorCodeThenId,
  compareTeamMemberSequence,
} from '../modules/operational-planning/planningSuggestionContext.js'

describe('buildPlanningSuggestionContext', () => {
  it('uses the primary direct assignee even when another name would sort first', () => {
    const ctx = buildPlanningSuggestionContext({
      directAssignees: [
        {
          id: 'bruno',
          code: 'B1',
          fullName: 'Ana',
          isPrimary: false,
          orderIndex: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          isEligible: true,
        },
        {
          id: 'carla',
          code: 'C1',
          fullName: 'Carla',
          isPrimary: true,
          orderIndex: 2,
          createdAt: '2026-01-02T00:00:00.000Z',
          isEligible: true,
        },
      ],
      teamAssignees: [],
      membersByTeamId: new Map(),
    })
    expect(ctx.responsibleCollaboratorId).toBe('carla')
  })

  it('uses first direct by order_index when there is no primary', () => {
    const ctx = buildPlanningSuggestionContext({
      directAssignees: [
        {
          id: 'second',
          code: 'S1',
          fullName: 'Ana',
          isPrimary: false,
          orderIndex: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          isEligible: true,
        },
        {
          id: 'first',
          code: 'F1',
          fullName: 'Zulmira',
          isPrimary: false,
          orderIndex: 0,
          createdAt: '2026-01-02T00:00:00.000Z',
          isEligible: true,
        },
      ],
      teamAssignees: [],
      membersByTeamId: new Map(),
    })
    expect(ctx.responsibleCollaboratorId).toBe('first')
  })

  it('uses the first eligible team only and does not union members', () => {
    const ctx = buildPlanningSuggestionContext({
      directAssignees: [],
      teamAssignees: [
        {
          id: 'team-b',
          name: 'B',
          isPrimary: false,
          orderIndex: 1,
          createdAt: '2026-01-02T00:00:00.000Z',
          isEligible: true,
        },
        {
          id: 'team-a',
          name: 'A',
          isPrimary: false,
          orderIndex: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          isEligible: true,
        },
      ],
      membersByTeamId: new Map([
        [
          'team-a',
          [
            {
              teamId: 'team-a',
              id: 'lead-a',
              code: 'LA',
              fullName: 'Lead A',
              isPrimary: true,
              suggestionOrder: 1,
              isEligible: true,
            },
          ],
        ],
        [
          'team-b',
          [
            {
              teamId: 'team-b',
              id: 'lead-b',
              code: 'LB',
              fullName: 'Lead B',
              isPrimary: true,
              suggestionOrder: 1,
              isEligible: true,
            },
          ],
        ],
      ]),
    })
    expect(ctx.effectiveTeamId).toBe('team-a')
    expect(ctx.multipleTeamsAssigned).toBe(true)
    expect(ctx.responsibleCollaboratorId).toBe('lead-a')
    expect(ctx.members.map((m) => m.id)).toEqual(['lead-a'])
  })

  it('ignores ineligible collaborators and inactive memberships', () => {
    const ctx = buildPlanningSuggestionContext({
      directAssignees: [
        {
          id: 'gone',
          code: 'G1',
          fullName: 'Gone',
          isPrimary: true,
          orderIndex: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          isEligible: false,
        },
      ],
      teamAssignees: [
        {
          id: 'team-a',
          name: 'A',
          isPrimary: false,
          orderIndex: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          isEligible: true,
        },
      ],
      membersByTeamId: new Map([
        [
          'team-a',
          [
            {
              teamId: 'team-a',
              id: 'inactive',
              code: 'I1',
              fullName: 'Inativo',
              isPrimary: true,
              suggestionOrder: 1,
              isEligible: false,
            },
            {
              teamId: 'team-a',
              id: 'ok',
              code: 'O1',
              fullName: 'Ok',
              isPrimary: false,
              suggestionOrder: 2,
              isEligible: true,
            },
          ],
        ],
      ]),
    })
    expect(ctx.responsibleCollaboratorId).toBe('ok')
    expect(ctx.members.map((m) => m.id)).toEqual(['ok'])
  })

  it('sorts members by primary, suggestionOrder, code, then id — never name', () => {
    const sorted = [
      {
        id: 'id-b',
        code: 'B1',
        fullName: 'Ana',
        isPrimary: false,
        suggestionOrder: 1,
      },
      {
        id: 'id-a',
        code: 'A1',
        fullName: 'Zulmira',
        isPrimary: false,
        suggestionOrder: 1,
      },
      {
        id: 'lead',
        code: 'Z9',
        fullName: 'Lead',
        isPrimary: true,
        suggestionOrder: 9,
      },
    ].sort(compareTeamMemberSequence)
    expect(sorted.map((m) => m.id)).toEqual(['lead', 'id-a', 'id-b'])
  })

  it('empty codes sort after filled codes', () => {
    expect(
      compareCollaboratorCodeThenId({ id: '2', code: null }, { id: '1', code: 'A' }),
    ).toBeGreaterThan(0)
  })
})
