import { describe, expect, it } from 'vitest'
import type { ConveyorOperationalEvent } from './conveyorOperationalEvents.types'
import {
  filterOperationalEventsByCategory,
  formatOperationalEventReasonLine,
  getOperationalEventCategory,
  getOperationalEventCategoryLabel,
  getOperationalEventDisplayLabel,
  getOperationalEventSeverity,
  groupOperationalEventsByLocalDate,
  localDayKeyFromIso,
} from './operationalEventTaxonomy'

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

describe('getOperationalEventDisplayLabel', () => {
  it('CONVEYOR_ENTERED_DELAY', () => {
    expect(getOperationalEventDisplayLabel('CONVEYOR_ENTERED_DELAY')).toBe('Esteira entrou em atraso')
  })
  it('CONVEYOR_LEFT_DELAY', () => {
    expect(getOperationalEventDisplayLabel('CONVEYOR_LEFT_DELAY')).toBe('Esteira saiu do atraso')
  })
  it('CONVEYOR_STEP_COMPLETED', () => {
    expect(getOperationalEventDisplayLabel('CONVEYOR_STEP_COMPLETED')).toBe('Atividade concluída')
  })
  it('CONVEYOR_STRUCTURE_ITEM_ADDED', () => {
    expect(getOperationalEventDisplayLabel('CONVEYOR_STRUCTURE_ITEM_ADDED')).toBe(
      'Item incluído na esteira',
    )
  })
  it('CONVEYOR_STEP_REOPENED', () => {
    expect(getOperationalEventDisplayLabel('CONVEYOR_STEP_REOPENED')).toBe('Atividade reaberta')
  })
  it('MANUAL_NOTE', () => {
    expect(getOperationalEventDisplayLabel('MANUAL_NOTE')).toBe('Observação operacional')
  })
  it('desconhecido', () => {
    expect(getOperationalEventDisplayLabel('UNKNOWN_X')).toBe('Evento operacional')
  })
})

describe('getOperationalEventCategory', () => {
  it('atraso', () => {
    expect(getOperationalEventCategory('CONVEYOR_ENTERED_DELAY')).toBe('delay')
    expect(getOperationalEventCategory('CONVEYOR_LEFT_DELAY')).toBe('delay')
  })
  it('conclusão', () => {
    expect(getOperationalEventCategory('CONVEYOR_STEP_COMPLETED')).toBe('completion')
  })
  it('bloqueio futuro', () => {
    expect(getOperationalEventCategory('CONVEYOR_STEP_BLOCKED')).toBe('block')
    expect(getOperationalEventCategory('CONVEYOR_STEP_UNBLOCKED')).toBe('block')
  })
  it('parada futura', () => {
    expect(getOperationalEventCategory('CONVEYOR_STEP_PAUSED')).toBe('pause')
    expect(getOperationalEventCategory('CONVEYOR_STEP_RESUMED')).toBe('pause')
  })
  it('reabertura', () => {
    expect(getOperationalEventCategory('CONVEYOR_STEP_REOPENED')).toBe('reopen')
  })
})

describe('getOperationalEventCategoryLabel', () => {
  it('mapeia categorias de filtro', () => {
    expect(getOperationalEventCategoryLabel('all')).toBe('Todos')
    expect(getOperationalEventCategoryLabel('delay')).toBe('Atrasos')
    expect(getOperationalEventCategoryLabel('completion')).toBe('Conclusões')
    expect(getOperationalEventCategoryLabel('reopen')).toBe('Reaberturas')
  })
})

describe('getOperationalEventSeverity', () => {
  it('por tipo', () => {
    expect(getOperationalEventSeverity('CONVEYOR_ENTERED_DELAY')).toBe('warning')
    expect(getOperationalEventSeverity('CONVEYOR_LEFT_DELAY')).toBe('success')
    expect(getOperationalEventSeverity('CONVEYOR_STEP_COMPLETED')).toBe('success')
    expect(getOperationalEventSeverity('CONVEYOR_STEP_BLOCKED')).toBe('critical')
    expect(getOperationalEventSeverity('CONVEYOR_STEP_UNBLOCKED')).toBe('success')
    expect(getOperationalEventSeverity('CONVEYOR_STEP_PAUSED')).toBe('warning')
    expect(getOperationalEventSeverity('CONVEYOR_STEP_REOPENED')).toBe('warning')
    expect(getOperationalEventSeverity('MANUAL_NOTE')).toBe('info')
    expect(getOperationalEventSeverity('UNKNOWN')).toBe('info')
  })
})

describe('filterOperationalEventsByCategory', () => {
  it('all devolve todos', () => {
    const list = [ev({ eventId: 'a', eventType: 'CONVEYOR_ENTERED_DELAY' }), ev({ eventId: 'b', eventType: 'MANUAL_NOTE' })]
    expect(filterOperationalEventsByCategory(list, 'all')).toHaveLength(2)
  })
  it('filtra por categoria', () => {
    const list = [
      ev({ eventId: '1', eventType: 'CONVEYOR_ENTERED_DELAY' }),
      ev({ eventId: '2', eventType: 'CONVEYOR_STEP_COMPLETED' }),
      ev({ eventId: '3', eventType: 'CONVEYOR_STEP_REOPENED' }),
    ]
    expect(filterOperationalEventsByCategory(list, 'delay')).toHaveLength(1)
    expect(filterOperationalEventsByCategory(list, 'delay')[0]!.eventId).toBe('1')
    expect(filterOperationalEventsByCategory(list, 'reopen')).toHaveLength(1)
    expect(filterOperationalEventsByCategory(list, 'reopen')[0]!.eventId).toBe('3')
  })
})

describe('formatOperationalEventReasonLine', () => {
  it('EXPLICITLY_REOPENED', () => {
    expect(
      formatOperationalEventReasonLine(
        ev({ eventType: 'CONVEYOR_STEP_REOPENED', reason: 'EXPLICITLY_REOPENED' }),
      ),
    ).toBe('Reabertura registrada manualmente.')
  })

  it('CONVEYOR_STRUCTURE_ITEM_ADDED usa motivo completo do metadata', () => {
    expect(
      formatOperationalEventReasonLine(
        ev({
          eventType: 'CONVEYOR_STRUCTURE_ITEM_ADDED',
          reason: 'LATE_STRUCTURE_APPEND',
          metadataJson: { reason: 'Peça complementar solicitada pelo cliente' },
        }),
      ),
    ).toBe('Peça complementar solicitada pelo cliente')
  })

  it('LATE_STRUCTURE_APPEND sem metadata', () => {
    expect(
      formatOperationalEventReasonLine(
        ev({ eventType: 'CONVEYOR_STRUCTURE_ITEM_ADDED', reason: 'LATE_STRUCTURE_APPEND' }),
      ),
    ).toBe('Inclusão tardia de item na estrutura.')
  })
})

describe('groupOperationalEventsByLocalDate', () => {
  it('agrupa e mantém ordem decrescente dentro do dia', () => {
    const later = new Date(2026, 4, 10, 18, 0, 0).toISOString()
    const earlier = new Date(2026, 4, 10, 10, 0, 0).toISOString()
    const list = [
      ev({ eventId: 'later', eventType: 'CONVEYOR_LEFT_DELAY', occurredAt: later }),
      ev({ eventId: 'earlier', eventType: 'CONVEYOR_ENTERED_DELAY', occurredAt: earlier }),
    ]
    const groups = groupOperationalEventsByLocalDate(list, new Date(2026, 4, 15))
    expect(groups).toHaveLength(1)
    expect(groups[0]!.events[0]!.eventId).toBe('later')
    expect(groups[0]!.events[1]!.eventId).toBe('earlier')
    expect(groups[0]!.dateKey).toBe(localDayKeyFromIso(later))
  })
})
