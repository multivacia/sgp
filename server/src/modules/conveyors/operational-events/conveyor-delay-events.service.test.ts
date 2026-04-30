import { beforeEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import { detectAndRecordConveyorDelayTransition } from './conveyor-delay-events.service.js'

const eventServiceMocks = vi.hoisted(() => ({
  createEvent: vi.fn(),
}))

vi.mock('./conveyor-operational-events.service.js', async () => {
  const actual = await vi.importActual<
    typeof import('./conveyor-operational-events.service.js')
  >('./conveyor-operational-events.service.js')
  return {
    ...actual,
    serviceCreateConveyorOperationalEvent: eventServiceMocks.createEvent,
  }
})

describe('detectAndRecordConveyorDelayTransition', () => {
  const base = {
    conveyorId: '11111111-1111-1111-1111-111111111111',
    source: 'SYSTEM' as const,
    occurredAt: new Date('2026-04-28T10:00:00.000Z'),
  }

  beforeEach(() => {
    eventServiceMocks.createEvent.mockReset()
    eventServiceMocks.createEvent.mockResolvedValue({
      created: true,
      event: { id: 'evt-1', metadata_json: {} },
    })
  })

  it('false -> true cria CONVEYOR_ENTERED_DELAY', async () => {
    await detectAndRecordConveyorDelayTransition({} as pg.Pool, {
      ...base,
      before: {
        operationalStatus: 'EM_PRODUCAO',
        estimatedDeadline: '2026-04-29T10:00:00.000Z',
        pendingMinutes: 10,
        now: base.occurredAt,
      },
      after: {
        operationalStatus: 'EM_PRODUCAO',
        estimatedDeadline: '2026-04-27T10:00:00.000Z',
        pendingMinutes: 10,
        now: base.occurredAt,
      },
    })

    expect(eventServiceMocks.createEvent).toHaveBeenCalledTimes(1)
    const payload = eventServiceMocks.createEvent.mock.calls[0]?.[1]
    expect(payload.eventType).toBe('CONVEYOR_ENTERED_DELAY')
    expect(payload.metadataJson.before).toBeTruthy()
    expect(payload.metadataJson.after).toBeTruthy()
  })

  it('true -> false cria CONVEYOR_LEFT_DELAY', async () => {
    await detectAndRecordConveyorDelayTransition({} as pg.Pool, {
      ...base,
      before: {
        operationalStatus: 'EM_PRODUCAO',
        estimatedDeadline: '2026-04-27T10:00:00.000Z',
        pendingMinutes: 10,
        now: base.occurredAt,
      },
      after: {
        operationalStatus: 'CONCLUIDA',
        estimatedDeadline: '2026-04-27T10:00:00.000Z',
        pendingMinutes: 10,
        now: base.occurredAt,
      },
    })

    const payload = eventServiceMocks.createEvent.mock.calls[0]?.[1]
    expect(payload.eventType).toBe('CONVEYOR_LEFT_DELAY')
  })

  it('false -> false não cria', async () => {
    const out = await detectAndRecordConveyorDelayTransition({} as pg.Pool, {
      ...base,
      before: {
        operationalStatus: 'EM_PRODUCAO',
        estimatedDeadline: '2026-04-29T10:00:00.000Z',
        pendingMinutes: 10,
        now: base.occurredAt,
      },
      after: {
        operationalStatus: 'EM_PRODUCAO',
        estimatedDeadline: '2026-04-29T10:00:00.000Z',
        pendingMinutes: 9,
        now: base.occurredAt,
      },
    })
    expect(out).toBeNull()
    expect(eventServiceMocks.createEvent).not.toHaveBeenCalled()
  })

  it('true -> true não cria', async () => {
    const out = await detectAndRecordConveyorDelayTransition({} as pg.Pool, {
      ...base,
      before: {
        operationalStatus: 'EM_PRODUCAO',
        estimatedDeadline: '2026-04-27T10:00:00.000Z',
        pendingMinutes: 10,
        now: base.occurredAt,
      },
      after: {
        operationalStatus: 'EM_PRODUCAO',
        estimatedDeadline: '2026-04-27T10:00:00.000Z',
        pendingMinutes: 5,
        now: base.occurredAt,
      },
    })
    expect(out).toBeNull()
    expect(eventServiceMocks.createEvent).not.toHaveBeenCalled()
  })

  it('mesma idempotencyKey não duplica (delegado para service)', async () => {
    eventServiceMocks.createEvent.mockResolvedValue({
      created: false,
      event: { id: 'evt-existing', metadata_json: {} },
    })
    const out = await detectAndRecordConveyorDelayTransition({} as pg.Pool, {
      ...base,
      before: {
        operationalStatus: 'EM_PRODUCAO',
        estimatedDeadline: '2026-04-29T10:00:00.000Z',
        pendingMinutes: 10,
        now: base.occurredAt,
      },
      after: {
        operationalStatus: 'EM_PRODUCAO',
        estimatedDeadline: '2026-04-27T10:00:00.000Z',
        pendingMinutes: 10,
        now: base.occurredAt,
      },
    })
    expect(out?.created).toBe(false)
  })
})

