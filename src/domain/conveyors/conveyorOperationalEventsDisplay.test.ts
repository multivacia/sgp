import { describe, expect, it } from 'vitest'
import type { ConveyorStructure } from './conveyor.types'
import type { ConveyorOperationalEvent } from './conveyorOperationalEvents.types'
import {
  buildConveyorStepDisplayNameById,
  filterOperationalEvents,
  getOperationalActivityDisplayLine,
} from './conveyorOperationalEventsDisplay'

function ev(partial: Partial<ConveyorOperationalEvent> & Pick<ConveyorOperationalEvent, 'eventType'>): ConveyorOperationalEvent {
  return {
    eventId: 'e1',
    conveyorId: 'c1',
    nodeId: null,
    previousValue: null,
    newValue: null,
    reason: null,
    source: 'USER_ACTION',
    occurredAt: '2026-05-03T15:00:00.000Z',
    createdAt: '2026-05-03T15:00:00.000Z',
    metadataJson: null,
    ...partial,
  }
}

describe('buildConveyorStepDisplayNameById', () => {
  it('mapeia id do STEP para nome', () => {
    const structure: ConveyorStructure = {
      options: [
        {
          id: 'o1',
          name: 'O1',
          orderIndex: 1,
          areas: [
            {
              id: 'a1',
              name: 'A1',
              orderIndex: 1,
              steps: [
                {
                  id: 'step-uuid-1',
                  name: 'Lavagem',
                  orderIndex: 1,
                  plannedMinutes: 10,
                  assignees: [],
                  operationalStatus: 'PENDING',
                  isCompleted: false,
                  completedAt: null,
                  completedByName: null,
                  completionEventId: null,
                },
              ],
            },
          ],
        },
      ],
    }
    const m = buildConveyorStepDisplayNameById(structure)
    expect(m.get('step-uuid-1')).toBe('Lavagem')
  })
})

describe('getOperationalActivityDisplayLine', () => {
  const m = new Map([['s1', 'Polimento']])

  it('com nome', () => {
    expect(getOperationalActivityDisplayLine(ev({ eventType: 'CONVEYOR_STEP_COMPLETED', nodeId: 's1' }), m)).toBe(
      'Atividade: Polimento',
    )
  })
  it('sem nome na estrutura', () => {
    expect(
      getOperationalActivityDisplayLine(ev({ eventType: 'CONVEYOR_STEP_COMPLETED', nodeId: 'missing-id' }), m),
    ).toBe('Atividade vinculada')
  })
  it('sem nodeId', () => {
    expect(getOperationalActivityDisplayLine(ev({ eventType: 'CONVEYOR_ENTERED_DELAY' }), m)).toBeNull()
  })
})

describe('filterOperationalEvents', () => {
  it('delega para categorias', () => {
    const list = [ev({ eventId: '1', eventType: 'CONVEYOR_STEP_COMPLETED' })]
    expect(filterOperationalEvents(list, 'completion')).toHaveLength(1)
    expect(filterOperationalEvents(list, 'delay')).toHaveLength(0)
  })
})
