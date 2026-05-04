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
    expect(out.category).toBe('delay')
  })

  it('formata CONVEYOR_LEFT_DELAY', () => {
    const out = formatConveyorOperationalEvent(base('CONVEYOR_LEFT_DELAY'))
    expect(out.label).toBe('Esteira saiu do atraso')
    expect(out.tone).toBe('success')
    expect(out.category).toBe('delay')
  })

  it('formata CONVEYOR_STEP_COMPLETED', () => {
    const e = {
      ...base('CONVEYOR_STEP_COMPLETED'),
      reason: 'EXPLICITLY_COMPLETED',
      newValue: 'COMPLETED',
    }
    const out = formatConveyorOperationalEvent(e)
    expect(out.label).toBe('Atividade concluída')
    expect(out.tone).toBe('success')
    expect(out.category).toBe('completion')
    expect(out.description).toContain('explícita')
    expect(out.description.toLowerCase()).not.toContain('atingiu o planejado')
    expect(out.description.toLowerCase()).not.toContain('tempo planejado atingido')
    expect(out.description).toContain('Conclusão registrada manualmente')
  })

  it('formata CONVEYOR_STEP_REOPENED', () => {
    const e = {
      ...base('CONVEYOR_STEP_REOPENED'),
      reason: 'EXPLICITLY_REOPENED',
      newValue: 'REOPENED',
      previousValue: 'COMPLETED',
    }
    const out = formatConveyorOperationalEvent(e)
    expect(out.label).toBe('Atividade reaberta')
    expect(out.category).toBe('reopen')
    expect(out.severity).toBe('warning')
    expect(out.description).toContain('reaberta por ação explícita')
    expect(out.description).toContain('Reabertura registrada manualmente')
  })

  it('CONVEYOR_STEP_BLOCKED preparado', () => {
    const out = formatConveyorOperationalEvent({
      ...base('CONVEYOR_STEP_BLOCKED'),
      eventType: 'CONVEYOR_STEP_BLOCKED',
      reason: null,
    })
    expect(out.label).toBe('Atividade bloqueada')
    expect(out.category).toBe('block')
    expect(out.severity).toBe('critical')
  })

  it('unknown não quebra', () => {
    const out = formatConveyorOperationalEvent({
      ...base('OTHER_EVENT'),
      eventType: 'CUSTOM_X',
      source: 'USER_ACTION',
    })
    expect(out.label).toBe('Evento operacional')
    expect(out.category).toBe('other')
  })

  it('unknown com SYSTEM', () => {
    const out = formatConveyorOperationalEvent(base('OTHER_EVENT'))
    expect(out.label).toBe('Evento operacional')
    expect(out.category).toBe('other')
  })
})
