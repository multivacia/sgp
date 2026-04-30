import { describe, expect, it } from 'vitest'
import { formatConveyorOperationalEvent } from './formatConveyorOperationalEvent'
import type { ConveyorOperationalEvent } from './conveyorOperationalEvents.types'

function base(eventType: ConveyorOperationalEvent['eventType']): ConveyorOperationalEvent {
  return {
    eventId: 'evt-1',
    conveyorId: 'c-1',
    nodeId: null,
    eventType,
    previousValue: null,
    newValue: null,
    reason: 'R',
    source: 'SYSTEM',
    occurredAt: '2026-04-28T10:00:00.000Z',
    createdAt: '2026-04-28T10:00:00.000Z',
    metadataJson: null,
  }
}

describe('formatConveyorOperationalEvent', () => {
  it('formata CONVEYOR_ENTERED_DELAY', () => {
    const out = formatConveyorOperationalEvent(base('CONVEYOR_ENTERED_DELAY'))
    expect(out.label).toBe('Esteira entrou em atraso')
    expect(out.tone).toBe('warning')
  })

  it('formata CONVEYOR_LEFT_DELAY', () => {
    const out = formatConveyorOperationalEvent(base('CONVEYOR_LEFT_DELAY'))
    expect(out.label).toBe('Esteira saiu de atraso')
    expect(out.tone).toBe('success')
  })

  it('formata CONVEYOR_STEP_COMPLETED', () => {
    const out = formatConveyorOperationalEvent(base('CONVEYOR_STEP_COMPLETED'))
    expect(out.label).toBe('Atividade concluída')
    expect(out.tone).toBe('success')
  })

  it('unknown não quebra', () => {
    const out = formatConveyorOperationalEvent(base('OTHER_EVENT'))
    expect(out.label).toBe('OTHER_EVENT')
    expect(out.tone).toBe('neutral')
  })
})

