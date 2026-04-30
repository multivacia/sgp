import { describe, expect, it } from 'vitest'
import {
  createConveyorOperationalEventBodySchema,
  listConveyorOperationalEventsQuerySchema,
} from './conveyor-operational-events.schemas.js'

describe('conveyor operational events schemas', () => {
  it('aceita eventType válido', () => {
    const out = createConveyorOperationalEventBodySchema.parse({
      conveyorId: '11111111-1111-1111-1111-111111111111',
      eventType: 'MANUAL_NOTE',
      source: 'USER_ACTION',
      occurredAt: '2026-04-28T10:00:00.000Z',
    })
    expect(out.eventType).toBe('MANUAL_NOTE')
  })

  it('rejeita eventType inválido', () => {
    expect(() =>
      createConveyorOperationalEventBodySchema.parse({
        conveyorId: '11111111-1111-1111-1111-111111111111',
        eventType: 'UNKNOWN_EVENT',
        source: 'SYSTEM',
        occurredAt: '2026-04-28T10:00:00.000Z',
      }),
    ).toThrow()
  })

  it('query limit default 50 e max 200', () => {
    expect(listConveyorOperationalEventsQuerySchema.parse({}).limit).toBe(50)
    expect(listConveyorOperationalEventsQuerySchema.parse({ limit: '200' }).limit).toBe(
      200,
    )
    expect(() => listConveyorOperationalEventsQuerySchema.parse({ limit: '201' })).toThrow()
  })
})

