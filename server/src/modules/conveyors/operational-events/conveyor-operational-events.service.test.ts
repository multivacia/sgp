import { describe, expect, it, vi, beforeEach } from 'vitest'
import type pg from 'pg'
import {
  loadConveyorOperationalEventsForHealthSnapshot,
  serviceCreateConveyorOperationalEvent,
} from './conveyor-operational-events.service.js'

const repoMocks = vi.hoisted(() => ({
  getByIdempotencyKey: vi.fn(),
  insertEvent: vi.fn(),
  listEvents: vi.fn(),
}))

vi.mock('./conveyor-operational-events.repository.js', async () => {
  const actual = await vi.importActual<
    typeof import('./conveyor-operational-events.repository.js')
  >('./conveyor-operational-events.repository.js')
  return {
    ...actual,
    getConveyorOperationalEventByIdempotencyKey: repoMocks.getByIdempotencyKey,
    insertConveyorOperationalEvent: repoMocks.insertEvent,
    listConveyorOperationalEvents: repoMocks.listEvents,
  }
})

describe('conveyor operational events service', () => {
  beforeEach(() => {
    repoMocks.getByIdempotencyKey.mockReset()
    repoMocks.insertEvent.mockReset()
    repoMocks.listEvents.mockReset()
  })

  it('insert cria evento quando não há idempotência prévia', async () => {
    repoMocks.getByIdempotencyKey.mockResolvedValue(null)
    repoMocks.insertEvent.mockResolvedValue({ id: 'evt-1' })
    const out = await serviceCreateConveyorOperationalEvent({} as pg.Pool, {
      conveyorId: '11111111-1111-1111-1111-111111111111',
      eventType: 'MANUAL_NOTE',
      source: 'SYSTEM',
      occurredAt: '2026-04-28T10:00:00.000Z',
      idempotencyKey: 'k-1',
    })
    expect(out.created).toBe(true)
    expect(out.event.id).toBe('evt-1')
  })

  it('com idempotencyKey repetida não duplica', async () => {
    repoMocks.getByIdempotencyKey.mockResolvedValue({ id: 'evt-existing' })
    const out = await serviceCreateConveyorOperationalEvent({} as pg.Pool, {
      conveyorId: '11111111-1111-1111-1111-111111111111',
      eventType: 'MANUAL_NOTE',
      source: 'SYSTEM',
      occurredAt: '2026-04-28T10:00:00.000Z',
      idempotencyKey: 'k-dup',
    })
    expect(out.created).toBe(false)
    expect(out.event.id).toBe('evt-existing')
    expect(repoMocks.insertEvent).not.toHaveBeenCalled()
  })

  it('erro real de banco propaga', async () => {
    repoMocks.getByIdempotencyKey.mockResolvedValue(null)
    repoMocks.insertEvent.mockRejectedValue(new Error('db exploded'))
    await expect(
      serviceCreateConveyorOperationalEvent({} as pg.Pool, {
        conveyorId: '11111111-1111-1111-1111-111111111111',
        eventType: 'MANUAL_NOTE',
        source: 'SYSTEM',
        occurredAt: '2026-04-28T10:00:00.000Z',
      }),
    ).rejects.toThrow('db exploded')
  })

  it('reader snapshot respeita limit default e max', async () => {
    repoMocks.listEvents.mockResolvedValue([])
    await loadConveyorOperationalEventsForHealthSnapshot(
      {} as pg.Pool,
      '11111111-1111-1111-1111-111111111111',
    )
    expect(repoMocks.listEvents.mock.calls[0]?.[1]).toMatchObject({
      conveyorId: '11111111-1111-1111-1111-111111111111',
      limit: 50,
    })

    await loadConveyorOperationalEventsForHealthSnapshot(
      {} as pg.Pool,
      '11111111-1111-1111-1111-111111111111',
      { limit: 999 },
    )
    expect(repoMocks.listEvents.mock.calls[1]?.[1]).toMatchObject({
      limit: 200,
    })
  })

  it('reader snapshot normaliza payload', async () => {
    repoMocks.listEvents.mockResolvedValue([
      {
        id: 'evt-1',
        conveyor_id: '11111111-1111-1111-1111-111111111111',
        node_id: null,
        event_type: 'conveyor_entered_delay',
        previous_value: 'ON_TIME',
        new_value: 'DEADLINE_EXCEEDED_WITH_PENDING_WORK',
        reason: 'deadline_exceeded_with_pending_work',
        source: 'user_action',
        occurred_at: new Date('2026-04-28T10:00:00.000Z'),
        created_by: null,
        metadata_json: { a: 1 },
        idempotency_key: null,
        created_at: new Date('2026-04-28T10:00:01.000Z'),
      },
    ])
    const out = await loadConveyorOperationalEventsForHealthSnapshot(
      {} as pg.Pool,
      '11111111-1111-1111-1111-111111111111',
      { limit: 10 },
    )
    expect(out[0]).toMatchObject({
      eventId: 'evt-1',
      eventType: 'CONVEYOR_ENTERED_DELAY',
      source: 'USER_ACTION',
      reason: 'DEADLINE_EXCEEDED_WITH_PENDING_WORK',
    })
  })

  it('reader snapshot propaga erro real de banco', async () => {
    repoMocks.listEvents.mockRejectedValue(new Error('reader failed'))
    await expect(
      loadConveyorOperationalEventsForHealthSnapshot(
        {} as pg.Pool,
        '11111111-1111-1111-1111-111111111111',
      ),
    ).rejects.toThrow('reader failed')
  })
})

