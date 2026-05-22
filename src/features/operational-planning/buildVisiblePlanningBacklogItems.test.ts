import { describe, expect, it } from 'vitest'
import { buildVisiblePlanningBacklogItems } from './buildVisiblePlanningBacklogItems'

type Bl = { activityNodeId: string; label: string }

function bl(id: string, label: string): Bl {
  return { activityNodeId: id, label }
}

function plan(activityNodeId: string, extra?: { removed?: boolean; cancelled?: boolean }) {
  return { activityNodeId, ...extra }
}

describe('buildVisiblePlanningBacklogItems', () => {
  const backlog = [bl('a', 'A'), bl('b', 'B'), bl('c', 'C')]

  it('backlog A,B,C + plano com B → A,C', () => {
    expect(buildVisiblePlanningBacklogItems(backlog, [plan('b')])).toEqual([bl('a', 'A'), bl('c', 'C')])
  })

  it('backlog A,B,C + plano vazio → A,B,C', () => {
    expect(buildVisiblePlanningBacklogItems(backlog, [])).toEqual(backlog)
  })

  it('backlog A,B,C + plano com B na segunda → A,C', () => {
    expect(
      buildVisiblePlanningBacklogItems(backlog, [
        { activityNodeId: 'b', plannedDate: '2026-05-12' },
      ]),
    ).toEqual([bl('a', 'A'), bl('c', 'C')])
  })

  it('backlog A,B,C + plano com B na sexta → A,C', () => {
    expect(
      buildVisiblePlanningBacklogItems(backlog, [
        { activityNodeId: 'b', plannedDate: '2026-05-16' },
      ]),
    ).toEqual([bl('a', 'A'), bl('c', 'C')])
  })

  it('item removido/cancelado no plano não esconde do backlog', () => {
    expect(buildVisiblePlanningBacklogItems(backlog, [plan('b', { removed: true })])).toEqual(backlog)
    expect(buildVisiblePlanningBacklogItems(backlog, [plan('b', { cancelled: true })])).toEqual(backlog)
  })

  it('múltiplos itens planejados escondem todos correspondentes', () => {
    expect(buildVisiblePlanningBacklogItems(backlog, [plan('a'), plan('c')])).toEqual([bl('b', 'B')])
  })

  it('não muta os arrays de entrada', () => {
    const blCopy = [...backlog]
    const planCopy = [plan('b')]
    buildVisiblePlanningBacklogItems(blCopy, planCopy)
    expect(blCopy).toEqual(backlog)
    expect(planCopy).toEqual([plan('b')])
  })
})
