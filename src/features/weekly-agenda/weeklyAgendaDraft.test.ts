import { describe, expect, it } from 'vitest'
import { buildSavePayload, recalculateOrders, type DraftPlanItem } from './weeklyAgendaDraft'

function item(
  localKey: string,
  collaboratorId: string,
  date: string,
  order: number,
): DraftPlanItem {
  return {
    localKey,
    conveyorId: 'c',
    activityNodeId: `act-${localKey}`,
    conveyorTitle: 'ET',
    activityTitle: 'Atividade',
    taskTitle: 'Tarefa',
    sectorTitle: 'Setor',
    assignedCollaboratorId: collaboratorId,
    assignedCollaboratorName: null,
    plannedDate: date,
    plannedOrder: order,
    plannedMinutes: 60,
    notes: null,
  }
}

describe('recalculateOrders', () => {
  it('normalizes plannedOrder to 0..n-1 per collaborator/day group', () => {
    const input = [
      item('a', 'col-1', '2026-06-29', 5),
      item('b', 'col-1', '2026-06-29', 2),
      item('c', 'col-1', '2026-06-30', 3),
      item('d', 'col-2', '2026-06-29', 1),
    ]
    const out = recalculateOrders(input)
    const monCol1 = out
      .filter((i) => i.assignedCollaboratorId === 'col-1' && i.plannedDate === '2026-06-29')
      .sort((a, b) => a.plannedOrder - b.plannedOrder)
    expect(monCol1.map((i) => i.plannedOrder)).toEqual([0, 1])
    const tueCol1 = out.filter(
      (i) => i.assignedCollaboratorId === 'col-1' && i.plannedDate === '2026-06-30',
    )
    expect(tueCol1[0]?.plannedOrder).toBe(0)
  })
})

describe('buildSavePayload', () => {
  it('maps draft items to API save shape with normalized orders', () => {
    const payload = buildSavePayload('2026-06-29', '2026-07-03', [
      item('a', 'col-1', '2026-06-29', 9),
      item('b', 'col-1', '2026-06-29', 1),
    ])
    expect(payload.weekStartDate).toBe('2026-06-29')
    expect(payload.items).toHaveLength(2)
    expect(payload.items.map((i) => i.plannedOrder).sort()).toEqual([0, 1])
    expect(payload.items[0]).toMatchObject({
      conveyorId: 'c',
      activityNodeId: expect.any(String),
      assignedCollaboratorId: 'col-1',
      plannedDate: '2026-06-29',
    })
  })
})
