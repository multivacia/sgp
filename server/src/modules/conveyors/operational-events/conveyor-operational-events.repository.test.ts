import { describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import {
  listConveyorOperationalEvents,
  existsConveyorOperationalEventByIdempotencyKey,
} from './conveyor-operational-events.repository.js'

describe('conveyor operational events repository', () => {
  it('list respeita limit informado', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] })
    const pool = { query } as unknown as pg.Pool

    await listConveyorOperationalEvents(pool, {
      conveyorId: '11111111-1111-1111-1111-111111111111',
      limit: 12,
    })

    const params = query.mock.calls[0]?.[1] as unknown[]
    expect(params.at(-1)).toBe(12)
  })

  it('list limita para max 200', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] })
    const pool = { query } as unknown as pg.Pool

    await listConveyorOperationalEvents(pool, {
      conveyorId: '11111111-1111-1111-1111-111111111111',
      limit: 999,
    })

    const params = query.mock.calls[0]?.[1] as unknown[]
    expect(params.at(-1)).toBe(200)
  })

  it('existsByIdempotencyKey retorna true/false', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ c: '1' }] })
      .mockResolvedValueOnce({ rows: [{ c: '0' }] })
    const pool = { query } as unknown as pg.Pool

    await expect(existsConveyorOperationalEventByIdempotencyKey(pool, 'k-1')).resolves.toBe(
      true,
    )
    await expect(existsConveyorOperationalEventByIdempotencyKey(pool, 'k-2')).resolves.toBe(
      false,
    )
  })
})

