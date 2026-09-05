import { describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import { loadPlanningSuggestionFactsForSteps } from '../modules/operational-planning/operational-planning.repository.js'

describe('loadPlanningSuggestionFactsForSteps', () => {
  it('loads assignees and members in at most two queries for N steps', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({
        rows: [
          {
            activity_node_id: 'step-1',
            assignment_type: 'TEAM',
            collaborator_id: null,
            collaborator_code: null,
            collaborator_full_name: null,
            collaborator_is_active: null,
            collaborator_status: null,
            collaborator_deleted_at: null,
            team_id: 'team-1',
            team_name: 'Time',
            team_is_active: true,
            team_deleted_at: null,
            is_primary: false,
            order_index: 0,
            created_at: new Date('2026-01-01T00:00:00.000Z'),
          },
          {
            activity_node_id: 'step-2',
            assignment_type: 'TEAM',
            collaborator_id: null,
            collaborator_code: null,
            collaborator_full_name: null,
            collaborator_is_active: null,
            collaborator_status: null,
            collaborator_deleted_at: null,
            team_id: 'team-1',
            team_name: 'Time',
            team_is_active: true,
            team_deleted_at: null,
            is_primary: false,
            order_index: 0,
            created_at: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
    const pool = { query } as unknown as pg.Pool
    const ids = Array.from({ length: 10 }, (_, i) => `00000000-0000-4000-8000-0000000000${String(i).padStart(2, '0')}`)
    const out = await loadPlanningSuggestionFactsForSteps(pool, ids)
    expect(out.queryCount).toBe(2)
    expect(query).toHaveBeenCalledTimes(2)
  })
})
