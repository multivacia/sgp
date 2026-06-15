import { describe, expect, it } from 'vitest'
import type { ConveyorActivityTicketSource } from './activityTicketConveyorSource'
import {
  formatResponsibleGroupHeader,
  formatSectorGroupHeader,
  formatTaskGroupHeader,
  groupConveyorActivityTicketSources,
  resolveResponsibleGroupKey,
} from './activityTicketPrintGrouping'

function source(
  partial: Partial<ConveyorActivityTicketSource> & Pick<ConveyorActivityTicketSource, 'activityNodeId'>,
): ConveyorActivityTicketSource {
  return {
    conveyorId: 'c1',
    conveyorTitle: 'Esteira',
    activityTitle: partial.activityTitle ?? 'Atividade',
    taskTitle: partial.taskTitle ?? 'Tarefa A',
    sectorTitle: partial.sectorTitle ?? 'Setor A',
    plannedMinutes: 60,
    sortTaskOrder: partial.sortTaskOrder ?? 0,
    sortAreaOrder: partial.sortAreaOrder ?? 0,
    sortStepOrder: partial.sortStepOrder ?? 0,
    ...partial,
  }
}

describe('activityTicketPrintGrouping', () => {
  it('agrupa por tarefa', () => {
    const slots = groupConveyorActivityTicketSources(
      [
        source({ activityNodeId: 'a1', taskTitle: 'Bancos', sortStepOrder: 0 }),
        source({ activityNodeId: 'a2', taskTitle: 'Bancos', sortStepOrder: 1 }),
        source({ activityNodeId: 'a3', taskTitle: 'Portas', sortTaskOrder: 1, sortStepOrder: 0 }),
      ],
      'task',
    )

    const headers = slots.filter((s) => s.kind === 'header').map((s) => s.label)
    expect(headers).toEqual(['TAREFA: BANCOS', 'TAREFA: PORTAS'])
    expect(slots.filter((s) => s.kind === 'source')).toHaveLength(3)
  })

  it('atividade sem tarefa cai em Sem tarefa', () => {
    const slots = groupConveyorActivityTicketSources(
      [source({ activityNodeId: 'a1', taskTitle: undefined })],
      'task',
    )
    expect(slots[0]).toEqual({ kind: 'header', label: 'TAREFA: SEM TAREFA' })
  })

  it('agrupa por responsável', () => {
    const slots = groupConveyorActivityTicketSources(
      [
        source({ activityNodeId: 'a1', responsibleName: 'Marcio', teamName: 'Tapeçaria' }),
        source({ activityNodeId: 'a2', responsibleName: 'Ana' }),
      ],
      'responsible',
    )

    expect(slots[0]?.kind === 'header' && slots[0].label).toBe('RESP.: MARCIO')
    expect(slots.filter((s) => s.kind === 'source')).toHaveLength(2)
  })

  it('atividade sem responsável cai em Sem responsável', () => {
    expect(resolveResponsibleGroupKey({})).toBe('Sem responsável')
    expect(formatResponsibleGroupHeader('Sem responsável')).toBe('SEM RESPONSÁVEL')
  })

  it('usa equipe quando não há responsável', () => {
    const key = resolveResponsibleGroupKey({ teamName: 'Tapeçaria' })
    expect(key).toBe('Equipe: Tapeçaria')
    expect(formatResponsibleGroupHeader(key)).toBe('EQUIPE: TAPEÇARIA')
  })

  it('não duplica atividade com responsável e equipe', () => {
    const slots = groupConveyorActivityTicketSources(
      [source({ activityNodeId: 'a1', responsibleName: 'Marcio', teamName: 'Tapeçaria' })],
      'responsible',
    )
    const ticketSources = slots.filter((s) => s.kind === 'source')
    expect(ticketSources).toHaveLength(1)
    expect(ticketSources[0]?.kind === 'source' && ticketSources[0].source.responsibleName).toBe(
      'Marcio',
    )
  })

  it('agrupa por estrutura com cabeçalhos de tarefa e setor', () => {
    const slots = groupConveyorActivityTicketSources(
      [
        source({
          activityNodeId: 'a1',
          taskTitle: 'Bancos',
          sectorTitle: 'Costura',
          sortTaskOrder: 0,
          sortAreaOrder: 0,
        }),
        source({
          activityNodeId: 'a2',
          taskTitle: 'Bancos',
          sectorTitle: 'Montagem',
          sortTaskOrder: 0,
          sortAreaOrder: 1,
        }),
      ],
      'structure',
    )

    expect(slots.map((s) => (s.kind === 'header' ? s.label : s.source.activityNodeId))).toEqual([
      formatTaskGroupHeader('Bancos'),
      formatSectorGroupHeader('Costura'),
      'a1',
      formatSectorGroupHeader('Montagem'),
      'a2',
    ])
  })
})
