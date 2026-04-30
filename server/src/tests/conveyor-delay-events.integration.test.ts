import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  hasDatabaseConnectionInEnv,
  loadDotenvFiles,
  loadEnv,
} from '../config/env.js'
import { closePool, getPool } from '../plugins/db.js'
import { servicePatchConveyorDados, servicePatchConveyorStatus } from '../modules/conveyors/conveyors.service.js'
import { listConveyorOperationalEvents } from '../modules/conveyors/operational-events/conveyor-operational-events.repository.js'

loadDotenvFiles()
const hasDb = hasDatabaseConnectionInEnv(process.env)

let tablesAvailable = false

describe.skipIf(!hasDb)('conveyor delay events (integração leve)', () => {
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    const probe = await pool.query<{ ok: string }>(
      `SELECT CASE
         WHEN to_regclass('public.conveyor_operational_events') IS NOT NULL
          AND to_regclass('public.conveyors') IS NOT NULL
          AND to_regclass('public.conveyor_nodes') IS NOT NULL
         THEN '1' ELSE '0'
       END AS ok`,
    )
    tablesAvailable = probe.rows[0]?.ok === '1'
  })

  afterAll(async () => {
    await closePool()
  })

  async function seedConveyorWithPendingWork(input: {
    deadline: string
    status?: 'EM_PRODUCAO' | 'EM_REVISAO'
  }): Promise<string> {
    const conveyorId = randomUUID()
    const optionId = randomUUID()
    const areaId = randomUUID()
    const stepId = randomUUID()

    await pool.query(
      `INSERT INTO conveyors (
         id, name, origin_register, total_options, total_areas, total_steps, total_planned_minutes,
         operational_status, estimated_deadline
       ) VALUES (
         $1::uuid, 'Conveyor Delay Integration', 'MANUAL', 1, 1, 1, 60, $2::varchar, $3::varchar
       )`,
      [conveyorId, input.status ?? 'EM_PRODUCAO', input.deadline],
    )

    await pool.query(
      `INSERT INTO conveyor_nodes (
         id, conveyor_id, parent_id, root_id, node_type, source_origin, name, order_index, level_depth, planned_minutes
       ) VALUES
         ($1::uuid, $4::uuid, NULL, $1::uuid, 'OPTION', 'manual', 'OP', 1, 0, NULL),
         ($2::uuid, $4::uuid, $1::uuid, $1::uuid, 'AREA', 'manual', 'AR', 1, 1, NULL),
         ($3::uuid, $4::uuid, $2::uuid, $1::uuid, 'STEP', 'manual', 'ST', 1, 2, 60)`,
      [optionId, areaId, stepId, conveyorId],
    )
    return conveyorId
  }

  it.skipIf(!tablesAvailable)(
    'PATCH status para concluída gera CONVEYOR_LEFT_DELAY quando before estava atrasada',
    async () => {
      const conveyorId = await seedConveyorWithPendingWork({
        deadline: '2026-04-01T10:00:00.000Z',
        status: 'EM_PRODUCAO',
      })

      await servicePatchConveyorStatus(pool, conveyorId, 'CONCLUIDA')
      const events = await listConveyorOperationalEvents(pool, {
        conveyorId,
        eventType: 'CONVEYOR_LEFT_DELAY',
        limit: 5,
      })
      expect(events.length).toBeGreaterThan(0)
    },
  )

  it.skipIf(!tablesAvailable)(
    'PATCH prazo vencido gera CONVEYOR_ENTERED_DELAY quando after ficou atrasada',
    async () => {
      const conveyorId = await seedConveyorWithPendingWork({
        deadline: '2099-01-01T10:00:00.000Z',
        status: 'EM_PRODUCAO',
      })

      await servicePatchConveyorDados(pool, conveyorId, {
        prazoEstimado: '2026-04-01T10:00:00.000Z',
      })
      const events = await listConveyorOperationalEvents(pool, {
        conveyorId,
        eventType: 'CONVEYOR_ENTERED_DELAY',
        limit: 5,
      })
      expect(events.length).toBeGreaterThan(0)
    },
  )
})

