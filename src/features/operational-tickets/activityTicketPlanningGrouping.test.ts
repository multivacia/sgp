import { describe, expect, it } from 'vitest'
import type { ActivityTicketPlanningSource } from './activityTicketPlanningSource'
import {
  comparePlanningTicketSources,
  formatConveyorGroupHeader,
  groupPlanningActivityTicketSources,
} from './activityTicketPlanningGrouping'

function item(
  partial: Partial<ActivityTicketPlanningSource> & Pick<ActivityTicketPlanningSource, 'activityNodeId'>,
): ActivityTicketPlanningSource {
  return {
    conveyorId: 'c1',
    conveyorTitle: 'Esteira A',
    activityTitle: 'Atividade',
    taskTitle: 'Tarefa 1',
    sectorTitle: 'Setor',
    plannedDate: '2026-05-19',
    plannedOrder: 0,
    plannedMinutes: 60,
    assignedCollaboratorName: 'João',
    ...partial,
  }
}

describe('groupPlanningActivityTicketSources', () => {
  it('agrupa por responsável', () => {
    const sources = [
      item({ activityNodeId: 'a1', assignedCollaboratorName: 'Maria' }),
      item({ activityNodeId: 'a2', assignedCollaboratorName: 'João' }),
      item({ activityNodeId: 'a3', assignedCollaboratorName: 'João' }),
    ]

    const slots = groupPlanningActivityTicketSources(sources, 'responsible')
    const headers = slots.filter((s) => s.kind === 'header').map((s) => s.label)

    expect(headers.some((h) => h.includes('MARIA'))).toBe(true)
    expect(headers.some((h) => h.includes('JOÃO'))).toBe(true)
    expect(slots.filter((s) => s.kind === 'source')).toHaveLength(3)
  })

  it('agrupa por tarefa/esteira com cabeçalhos de esteira e tarefa', () => {
    const sources = [
      item({ activityNodeId: 'a1', conveyorTitle: 'Gol', taskTitle: 'Bancos' }),
      item({ activityNodeId: 'a2', conveyorTitle: 'Gol', taskTitle: 'Bancos' }),
      item({ activityNodeId: 'a3', conveyorTitle: 'Fusca', taskTitle: 'Teto' }),
    ]

    const slots = groupPlanningActivityTicketSources(sources, 'task')
    const headers = slots.filter((s) => s.kind === 'header').map((s) => s.label)

    expect(headers).toContain(formatConveyorGroupHeader('Fusca'))
    expect(headers).toContain(formatConveyorGroupHeader('Gol'))
    expect(headers.some((h) => h.includes('BANCOS'))).toBe(true)
    expect(headers.some((h) => h.includes('TETO'))).toBe(true)
  })
})

describe('comparePlanningTicketSources', () => {
  it('ordena por data, ordem e hierarquia', () => {
    const a = item({ activityNodeId: 'a1', plannedDate: '2026-05-18', plannedOrder: 1 })
    const b = item({ activityNodeId: 'a2', plannedDate: '2026-05-19', plannedOrder: 0 })

    expect(comparePlanningTicketSources(a, b)).toBeLessThan(0)
  })
})
