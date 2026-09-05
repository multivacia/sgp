import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { nextTeamMemberSuggestionOrder } from '../modules/teams/teams.suggestion-order.js'
import {
  createTeamMemberBodySchema,
  patchTeamMemberBodySchema,
} from '../modules/teams/teams.schemas.js'

const MIGRATION = resolve(
  process.cwd(),
  'migrations/0052_team_members_suggestion_order.sql',
)

describe('0052 team_members.suggestion_order migration (SQL)', () => {
  const sql = readFileSync(MIGRATION, 'utf8')

  it('adds INTEGER NOT NULL DEFAULT 1 without uniqueness on suggestion_order', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS suggestion_order INTEGER NOT NULL DEFAULT 1/)
    expect(sql).toMatch(/chk_team_members_suggestion_order_min/)
    expect(sql).toMatch(/CHECK \(suggestion_order >= 1\)/)
    expect(sql).not.toMatch(/UNIQUE[^;]*suggestion_order/i)
    expect(sql).not.toMatch(/CREATE UNIQUE INDEX[\s\S]*suggestion_order/i)
  })

  it('backfills existing rows to 1 without alphabetical order', () => {
    expect(sql).toMatch(/SET suggestion_order = 1/)
    expect(sql.toLowerCase()).not.toContain('order by')
    expect(sql.toLowerCase()).not.toContain('full_name')
  })
})

describe('nextTeamMemberSuggestionOrder', () => {
  it('returns 1 when the team has no members', () => {
    expect(nextTeamMemberSuggestionOrder(null)).toBe(1)
    expect(nextTeamMemberSuggestionOrder(undefined)).toBe(1)
  })

  it('returns max + 1', () => {
    expect(nextTeamMemberSuggestionOrder(3)).toBe(4)
  })
})

describe('team member suggestionOrder schema', () => {
  it('rejects values lower than 1', () => {
    expect(createTeamMemberBodySchema.safeParse({
      collaboratorId: '3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c',
      suggestionOrder: 0,
    }).success).toBe(false)
    expect(patchTeamMemberBodySchema.safeParse({ suggestionOrder: -2 }).success).toBe(false)
  })

  it('accepts repeated values and integers >= 1', () => {
    expect(patchTeamMemberBodySchema.safeParse({ suggestionOrder: 1 }).success).toBe(true)
    expect(patchTeamMemberBodySchema.safeParse({ suggestionOrder: 1 }).success).toBe(true)
  })
})
