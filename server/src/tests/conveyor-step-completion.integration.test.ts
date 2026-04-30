import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  hasDatabaseConnectionInEnv,
  loadDotenvFiles,
  loadEnv,
} from '../config/env.js'
import { closePool, getPool } from '../plugins/db.js'
import { serviceCreateConveyorTimeEntry } from '../modules/conveyors/conveyorAssignments.service.js'
import { listConveyorOperationalEvents } from '../modules/conveyors/operational-events/conveyor-operational-events.repository.js'

loadDotenvFiles()
const hasDb = hasDatabaseConnectionInEnv(process.env)

let tablesAvailable = false

describe.skipIf(!hasDb)('conveyor step completed (integração leve)', () => {
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    const probe = await pool.query<{ ok: string }>(
      `SELECT CASE
         WHEN to_regclass('public.conveyor_operational_events') IS NOT NULL
          AND to_regclass('public.conveyors') IS NOT NULL
          AND to_regclass('public.conveyor_nodes') IS NOT NULL
          AND to_regclass('public.conveyor_time_entries') IS NOT NULL
         THEN '1' ELSE '0'
       END AS ok`,
    )
    tablesAvailable = probe.rows[0]?.ok === '1'
  })

  afterAll(async () => {
    await closePool()
  })

  async function seedConveyorWithStep(plannedMinutes: number): Promise<{
    conveyorId: string
    stepId: string
    collaboratorId: string
  }> {
    const conveyorId = randomUUID()
    const optionId = randomUUID()
    const areaId = randomUUID()
    const stepId = randomUUID()
    const collaboratorId = randomUUID()

    await pool.query(
      `INSERT INTO collaborators (id, full_name, status, is_active)
       VALUES ($1::uuid, 'Colab Step Completion', 'ACTIVE', true)`,
      [collaboratorId],
    )
    await pool.query(
      `INSERT INTO conveyors (
         id, name, origin_register, total_options, total_areas, total_steps, total_planned_minutes
       ) VALUES (
         $1::uuid, 'Conveyor Step Completion', 'MANUAL', 1, 1, 1, $2::int
       )`,
      [conveyorId, plannedMinutes],
    )
    await pool.query(
      `INSERT INTO conveyor_nodes (
         id, conveyor_id, parent_id, root_id, node_type, source_origin, name, order_index, level_depth, planned_minutes
       ) VALUES
         ($1::uuid, $4::uuid, NULL, $1::uuid, 'OPTION', 'manual', 'OP', 1, 0, NULL),
         ($2::uuid, $4::uuid, $1::uuid, $1::uuid, 'AREA', 'manual', 'AR', 1, 1, NULL),
         ($3::uuid, $4::uuid, $2::uuid, $1::uuid, 'STEP', 'manual', 'ST', 1, 2, $5::int)`,
      [optionId, areaId, stepId, conveyorId, plannedMinutes],
    )
    return { conveyorId, stepId, collaboratorId }
  }

  it.skipIf(!tablesAvailable)(
    'apontamento abaixo do planejado não gera evento',
    async () => {
      const seed = await seedConveyorWithStep(100)
      await serviceCreateConveyorTimeEntry(pool, {
        conveyorId: seed.conveyorId,
        conveyorNodeId: seed.stepId,
        collaboratorId: seed.collaboratorId,
        minutes: 40,
      })
      const events = await listConveyorOperationalEvents(pool, {
        conveyorId: seed.conveyorId,
        eventType: 'CONVEYOR_STEP_COMPLETED',
        limit: 10,
      })
      expect(events).toHaveLength(0)
    },
  )

  it.skipIf(!tablesAvailable)(
    'apontamento que atinge/supera planned não gera evento nesta V1',
    async () => {
      const seed = await seedConveyorWithStep(60)
      await serviceCreateConveyorTimeEntry(pool, {
        conveyorId: seed.conveyorId,
        conveyorNodeId: seed.stepId,
        collaboratorId: seed.collaboratorId,
        minutes: 60,
      })
      await serviceCreateConveyorTimeEntry(pool, {
        conveyorId: seed.conveyorId,
        conveyorNodeId: seed.stepId,
        collaboratorId: seed.collaboratorId,
        minutes: 10,
      })
      const events = await listConveyorOperationalEvents(pool, {
        conveyorId: seed.conveyorId,
        eventType: 'CONVEYOR_STEP_COMPLETED',
        limit: 10,
      })
      expect(events).toHaveLength(0)
    },
  )
})

