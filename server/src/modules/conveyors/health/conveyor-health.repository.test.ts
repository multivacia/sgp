import { describe, expect, it } from 'vitest'
import {
  rollupTeamExecutionFromAssignmentRows,
  truncateNoteForRecentActivity,
} from './conveyor-health.repository.js'
import { RECENT_ACTIVITY_NOTE_PREVIEW_MAX_CHARS } from './conveyor-health.argos-types.js'

describe('truncateNoteForRecentActivity', () => {
  it('retorna null quando vazio', () => {
    expect(truncateNoteForRecentActivity(null)).toEqual({
      preview: null,
      truncated: false,
    })
  })

  it('trunca texto longo', () => {
    const long = 'x'.repeat(RECENT_ACTIVITY_NOTE_PREVIEW_MAX_CHARS + 40)
    const r = truncateNoteForRecentActivity(long)
    expect(r.preview?.length).toBe(RECENT_ACTIVITY_NOTE_PREVIEW_MAX_CHARS)
    expect(r.truncated).toBe(true)
  })
})

describe('rollupTeamExecutionFromAssignmentRows', () => {
  it('agrega por team e soma STEPs distintos', () => {
    const rows = [
      {
        team_id: 't1',
        team_name: 'Time A',
        step_id: 's1',
        planned_minutes: 30,
        step_realized: 10,
      },
      {
        team_id: 't1',
        team_name: 'Time A',
        step_id: 's2',
        planned_minutes: 20,
        step_realized: 5,
      },
    ]
    const out = rollupTeamExecutionFromAssignmentRows(rows)
    expect(out).toHaveLength(1)
    expect(out[0]!.teamId).toBe('t1')
    expect(out[0]!.assignedSteps).toBe(2)
    expect(out[0]!.plannedMinutes).toBe(50)
    expect(out[0]!.realizedMinutes).toBe(15)
  })
})
