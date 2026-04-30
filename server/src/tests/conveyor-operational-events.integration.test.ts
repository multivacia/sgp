import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  hasDatabaseConnectionInEnv,
  loadDotenvFiles,
  loadEnv,
} from '../config/env.js'
import { closePool, getPool } from '../plugins/db.js'
import {
  listConveyorOperationalEvents,
} from '../modules/conveyors/operational-events/conveyor-operational-events.repository.js'
import { serviceCreateConveyorOperationalEvent } from '../modules/conveyors/operational-events/conveyor-operational-events.service.js'

loadDotenvFiles()
const hasDb = hasDatabaseConnectionInEnv(process.env)

let tableAvailable = false

describe.skipIf(!hasDb)('conveyor operational events (integração)', () => {
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    const probe = await pool.query<{ ok: string }>(
      `SELECT CASE
         WHEN to_regclass('public.conveyor_operational_events') IS NOT NULL
         THEN '1' ELSE '0'
       END AS ok`,
    )
    tableAvailable = probe.rows[0]?.ok === '1'
  })

  afterAll(async () => {
    await closePool()
  })

  it.skipIf(!tableAvailable)('insert cria evento', async () => {
    const conveyorId = randomUUID()
    await pool.query(
      `INSERT INTO conveyors (
         id, name, origin_register, total_options, total_areas, total_steps, total_planned_minutes
       ) VALUES (
         $1::uuid, 'Conveyor Event Log', 'MANUAL', 1, 1, 1, 60
       )`,
      [conveyorId],
    )

    const out = await serviceCreateConveyorOperationalEvent(pool, {
      conveyorId,
      eventType: 'MANUAL_NOTE',
      source: 'SYSTEM',
      occurredAt: '2026-04-28T10:00:00.000Z',
      reason: 'teste',
    })
    expect(out.created).toBe(true)
    expect(out.event.conveyor_id).toBe(conveyorId)
  })

  it.skipIf(!tableAvailable)('insert com mesma idempotencyKey não duplica', async () => {
    const conveyorId = randomUUID()
    await pool.query(
      `INSERT INTO conveyors (
         id, name, origin_register, total_options, total_areas, total_steps, total_planned_minutes
       ) VALUES (
         $1::uuid, 'Conveyor Event Idempotent', 'MANUAL', 1, 1, 1, 60
       )`,
      [conveyorId],
    )

    const key = `idem-${randomUUID()}`
    const a = await serviceCreateConveyorOperationalEvent(pool, {
      conveyorId,
      eventType: 'MANUAL_NOTE',
      source: 'SYSTEM',
      occurredAt: '2026-04-28T10:00:00.000Z',
      idempotencyKey: key,
    })
    const b = await serviceCreateConveyorOperationalEvent(pool, {
      conveyorId,
      eventType: 'MANUAL_NOTE',
      source: 'SYSTEM',
      occurredAt: '2026-04-28T10:00:00.000Z',
      idempotencyKey: key,
    })
    expect(a.event.id).toBe(b.event.id)
    expect(b.created).toBe(false)
  })

  it.skipIf(!tableAvailable)('list retorna por conveyor ordenado desc e respeita limit', async () => {
    const conveyorId = randomUUID()
    await pool.query(
      `INSERT INTO conveyors (
         id, name, origin_register, total_options, total_areas, total_steps, total_planned_minutes
       ) VALUES (
         $1::uuid, 'Conveyor Event List', 'MANUAL', 1, 1, 1, 60
       )`,
      [conveyorId],
    )

    await serviceCreateConveyorOperationalEvent(pool, {
      conveyorId,
      eventType: 'MANUAL_NOTE',
      source: 'SYSTEM',
      occurredAt: '2026-04-28T08:00:00.000Z',
    })
    await serviceCreateConveyorOperationalEvent(pool, {
      conveyorId,
      eventType: 'MANUAL_NOTE',
      source: 'SYSTEM',
      occurredAt: '2026-04-28T09:00:00.000Z',
    })

    const rows = await listConveyorOperationalEvents(pool, { conveyorId, limit: 1 })
    expect(rows).toHaveLength(1)
    expect(rows[0]!.occurred_at.toISOString()).toBe('2026-04-28T09:00:00.000Z')
  })
})

