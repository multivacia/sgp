import { describe, expect, it } from 'vitest'
import {
  buildPlanningBacklogExecutionLookup,
  buildPlanningExecutionDisplayLines,
  resolvePlanningItemExecutionSummary,
  resolvePlanningItemOperationalStatusLabel,
  resolvePlanningItemProgress,
  resolvePlanningItemRealizedForCard,
  resolvePlanningItemRealizedFromLookup,
} from './planningExecutionHelpers'

describe('resolvePlanningItemExecutionSummary', () => {
  it('planned 120, realized null -> unknown', () => {
    const s = resolvePlanningItemExecutionSummary({
      plannedMinutes: 120,
      realizedMinutes: null,
    })
    expect(s.state).toBe('unknown')
    expect(s.realizedMinutes).toBeNull()
    expect(s.pendingMinutes).toBeNull()
    expect(s.executionRatio).toBeNull()
    expect(s.isRealizedAvailable).toBe(false)
  })

  it('planned 120, realized 0 -> not_started', () => {
    const s = resolvePlanningItemExecutionSummary({
      plannedMinutes: 120,
      realizedMinutes: 0,
    })
    expect(s.state).toBe('not_started')
    expect(s.realizedMinutes).toBe(0)
    expect(s.pendingMinutes).toBe(120)
    expect(s.executionRatio).toBe(0)
  })

  it('planned 120, realized 45 -> in_progress, pending 75', () => {
    const s = resolvePlanningItemExecutionSummary({
      plannedMinutes: 120,
      realizedMinutes: 45,
    })
    expect(s.state).toBe('in_progress')
    expect(s.pendingMinutes).toBe(75)
    expect(s.executionRatio).toBeCloseTo(0.375)
  })

  it('planned 120, realized 120 -> reached_planned without auto complete', () => {
    const s = resolvePlanningItemExecutionSummary({
      plannedMinutes: 120,
      realizedMinutes: 120,
    })
    expect(s.state).toBe('reached_planned')
    expect(s.isOperationallyCompleted).toBe(false)
    expect(s.pendingMinutes).toBe(0)
  })

  it('planned 120, realized 150 -> over_planned', () => {
    const s = resolvePlanningItemExecutionSummary({
      plannedMinutes: 120,
      realizedMinutes: 150,
    })
    expect(s.state).toBe('over_planned')
    expect(s.pendingMinutes).toBe(0)
  })

  it('planned 0, realized 0 -> no_planned_minutes', () => {
    const s = resolvePlanningItemExecutionSummary({
      plannedMinutes: 0,
      realizedMinutes: 0,
    })
    expect(s.state).toBe('no_planned_minutes')
  })

  it('operationalStatus COMPLETED -> completed', () => {
    const s = resolvePlanningItemExecutionSummary({
      plannedMinutes: 120,
      realizedMinutes: 30,
      operationalStatus: 'COMPLETED',
    })
    expect(s.state).toBe('completed')
    expect(s.isOperationallyCompleted).toBe(true)
  })

  it('operationalStatus REOPENED stays in_progress when partial realized', () => {
    const s = resolvePlanningItemExecutionSummary({
      plannedMinutes: 120,
      realizedMinutes: 45,
      operationalStatus: 'REOPENED',
    })
    expect(s.state).toBe('in_progress')
    expect(resolvePlanningItemOperationalStatusLabel('REOPENED')).toBe('Reaberta')
  })

  it('missing fields do not throw', () => {
    expect(() =>
      resolvePlanningItemExecutionSummary({
        plannedMinutes: null,
      }),
    ).not.toThrow()
    const s = resolvePlanningItemExecutionSummary({ plannedMinutes: null })
    expect(s.plannedMinutes).toBe(0)
    expect(s.state).toBe('no_planned_minutes')
  })

  it('does not mutate input', () => {
    const input = { plannedMinutes: 60, realizedMinutes: 10 }
    const copy = { ...input }
    resolvePlanningItemExecutionSummary(input)
    expect(input).toEqual(copy)
  })
})

describe('resolvePlanningItemProgress', () => {
  it('caps bar at 100% and flags over planned', () => {
    const summary = resolvePlanningItemExecutionSummary({
      plannedMinutes: 100,
      realizedMinutes: 150,
    })
    const progress = resolvePlanningItemProgress(summary)
    expect(progress.showBar).toBe(true)
    expect(progress.percent).toBe(100)
    expect(progress.isOverPlanned).toBe(true)
    expect(progress.overLabel).toBe('Acima do planejado')
  })

  it('planned 0 hides bar with label', () => {
    const summary = resolvePlanningItemExecutionSummary({
      plannedMinutes: 0,
      realizedMinutes: 0,
    })
    const progress = resolvePlanningItemProgress(summary)
    expect(progress.showBar).toBe(false)
    expect(progress.emptyLabel).toBe('Sem tempo previsto')
  })
})

describe('buildPlanningExecutionDisplayLines', () => {
  it('shows unavailable when realized is missing', () => {
    const lines = buildPlanningExecutionDisplayLines(
      resolvePlanningItemExecutionSummary({ plannedMinutes: 90 }),
    )
    expect(lines.unavailableLine).toBe('Realizado indisponível')
    expect(lines.realizedLine).toBeNull()
  })

  it('shows sem apontamento for zero realized', () => {
    const lines = buildPlanningExecutionDisplayLines(
      resolvePlanningItemExecutionSummary({ plannedMinutes: 90, realizedMinutes: 0 }),
    )
    expect(lines.realizedLine).toBe('Sem apontamento')
  })
})

describe('resolvePlanningItemRealizedForCard', () => {
  it('prefers realizedMinutes from weekly item', () => {
    const lookup = buildPlanningBacklogExecutionLookup([
      { activityNodeId: 'a1', realizedMinutes: 99 },
    ])
    expect(
      resolvePlanningItemRealizedForCard(
        { activityNodeId: 'a1', realizedMinutes: 30 },
        lookup,
      ),
    ).toBe(30)
  })

  it('falls back to backlog lookup when weekly realized is absent', () => {
    const lookup = buildPlanningBacklogExecutionLookup([
      { activityNodeId: 'a1', realizedMinutes: 45 },
    ])
    expect(resolvePlanningItemRealizedForCard({ activityNodeId: 'a1' }, lookup)).toBe(45)
  })

  it('returns null when neither weekly nor backlog has data', () => {
    expect(
      resolvePlanningItemRealizedForCard({ activityNodeId: 'missing' }, new Map()),
    ).toBeNull()
  })

  it('treats weekly realized 0 as sem apontamento source', () => {
    expect(
      resolvePlanningItemRealizedForCard(
        { activityNodeId: 'a1', realizedMinutes: 0 },
        new Map(),
      ),
    ).toBe(0)
  })
})

describe('buildPlanningBacklogExecutionLookup', () => {
  it('maps activityNodeId to realized minutes', () => {
    const lookup = buildPlanningBacklogExecutionLookup([
      { activityNodeId: 'a1', realizedMinutes: 45 },
      { activityNodeId: 'a2', realizedMinutes: 0 },
    ])
    expect(resolvePlanningItemRealizedFromLookup('a1', lookup)).toBe(45)
    expect(resolvePlanningItemRealizedFromLookup('a2', lookup)).toBe(0)
    expect(resolvePlanningItemRealizedFromLookup('missing', lookup)).toBeNull()
  })
})

describe('resolvePlanningItemOperationalStatusLabel', () => {
  it('maps known statuses', () => {
    expect(resolvePlanningItemOperationalStatusLabel('PENDING')).toBe('Aberta')
    expect(resolvePlanningItemOperationalStatusLabel('IN_PROGRESS')).toBe('Em andamento')
    expect(resolvePlanningItemOperationalStatusLabel('COMPLETED')).toBe('Concluída')
    expect(resolvePlanningItemOperationalStatusLabel('ABORTED')).toBe('Dispensada')
  })

  it('returns null for empty or unknown', () => {
    expect(resolvePlanningItemOperationalStatusLabel(null)).toBeNull()
    expect(resolvePlanningItemOperationalStatusLabel('FOO')).toBeNull()
  })
})
