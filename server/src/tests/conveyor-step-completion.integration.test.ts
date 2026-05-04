import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  hasDatabaseConnectionInEnv,
  loadDotenvFiles,
  loadEnv,
} from '../config/env.js'
import { closePool, getPool } from '../plugins/db.js'
import { serviceCreateConveyorTimeEntry } from '../modules/conveyors/conveyorAssignments.service.js'
import { servicePatchConveyorStepCompletion } from '../modules/conveyors/conveyor-step-operational.service.js'
import { serviceGetConveyorNodeWorkload } from '../modules/conveyors/conveyorNodeWorkload.service.js'
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
         id, conveyor_id, parent_id, root_id, node_type, source_origin, name, order_index, level_depth, planned_minutes,
         operational_status, operational_completed_at, operational_completed_by
       ) VALUES
         ($1::uuid, $4::uuid, NULL, $1::uuid, 'OPTION', 'manual', 'OP', 1, 0, NULL, NULL, NULL, NULL),
         ($2::uuid, $4::uuid, $1::uuid, $1::uuid, 'AREA', 'manual', 'AR', 1, 1, NULL, NULL, NULL, NULL),
         ($3::uuid, $4::uuid, $2::uuid, $1::uuid, 'STEP', 'manual', 'ST', 1, 2, $5::int, 'PENDING', NULL, NULL)`,
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

  it.skipIf(!tablesAvailable)(
    'conclusão explícita persiste COMPLETED e cria CONVEYOR_STEP_COMPLETED',
    async () => {
      const seed = await seedConveyorWithStep(15)
      const u = await pool.query<{ id: string }>(`SELECT id::text AS id FROM app_users LIMIT 1`)
      const actorId = u.rows[0]?.id
      if (!actorId) throw new Error('Esperado ≥1 app_users para actor.')
      const first = await servicePatchConveyorStepCompletion(pool, {
        conveyorId: seed.conveyorId,
        stepNodeId: seed.stepId,
        actorAppUserId: actorId,
        action: 'COMPLETE',
        note: 'teste',
      })
      expect(first.idempotent).toBe(false)
      const st = await pool.query<{ operational_status: string }>(
        `SELECT operational_status FROM conveyor_nodes WHERE id = $1::uuid`,
        [seed.stepId],
      )
      expect(st.rows[0]?.operational_status).toBe('COMPLETED')
      const events = await listConveyorOperationalEvents(pool, {
        conveyorId: seed.conveyorId,
        eventType: 'CONVEYOR_STEP_COMPLETED',
        limit: 10,
      })
      expect(events).toHaveLength(1)

      const second = await servicePatchConveyorStepCompletion(pool, {
        conveyorId: seed.conveyorId,
        stepNodeId: seed.stepId,
        actorAppUserId: actorId,
        action: 'COMPLETE',
      })
      expect(second.idempotent).toBe(true)
      const eventsAfter = await listConveyorOperationalEvents(pool, {
        conveyorId: seed.conveyorId,
        eventType: 'CONVEYOR_STEP_COMPLETED',
        limit: 10,
      })
      expect(eventsAfter).toHaveLength(1)
    },
  )

  it.skipIf(!tablesAvailable)(
    'reabertura explícita: REOPENED, evento CONVEYOR_STEP_REOPENED e ciclo concluir → reabrir → concluir',
    async () => {
      const seed = await seedConveyorWithStep(100)
      const u = await pool.query<{ id: string }>(`SELECT id::text AS id FROM app_users LIMIT 1`)
      const actorId = u.rows[0]?.id
      if (!actorId) throw new Error('Esperado ≥1 app_users para actor.')

      await serviceCreateConveyorTimeEntry(pool, {
        conveyorId: seed.conveyorId,
        conveyorNodeId: seed.stepId,
        collaboratorId: seed.collaboratorId,
        minutes: 30,
      })

      const w0 = await serviceGetConveyorNodeWorkload(pool, seed.conveyorId)
      const step0 = w0?.steps.find((s) => s.stepId === seed.stepId)
      expect(step0?.operationalStatus).toBe('PENDING')
      expect(step0?.pendingMinutes).toBe(70)

      await servicePatchConveyorStepCompletion(pool, {
        conveyorId: seed.conveyorId,
        stepNodeId: seed.stepId,
        actorAppUserId: actorId,
        action: 'COMPLETE',
      })

      const w1 = await serviceGetConveyorNodeWorkload(pool, seed.conveyorId)
      const step1 = w1?.steps.find((s) => s.stepId === seed.stepId)
      expect(step1?.operationalStatus).toBe('COMPLETED')
      expect(step1?.pendingMinutes).toBe(0)

      const reopen = await servicePatchConveyorStepCompletion(pool, {
        conveyorId: seed.conveyorId,
        stepNodeId: seed.stepId,
        actorAppUserId: actorId,
        action: 'REOPEN',
        note: 'volta',
      })
      expect(reopen.idempotent).toBe(false)

      const stRe = await pool.query<{
        operational_status: string
        operational_completed_at: string | null
        operational_completed_by: string | null
      }>(
        `SELECT operational_status, operational_completed_at::text, operational_completed_by::text
         FROM conveyor_nodes WHERE id = $1::uuid`,
        [seed.stepId],
      )
      expect(stRe.rows[0]?.operational_status).toBe('REOPENED')
      expect(stRe.rows[0]?.operational_completed_at).toBeNull()
      expect(stRe.rows[0]?.operational_completed_by).toBeNull()

      const reopenEvents = await listConveyorOperationalEvents(pool, {
        conveyorId: seed.conveyorId,
        eventType: 'CONVEYOR_STEP_REOPENED',
        limit: 10,
      })
      expect(reopenEvents).toHaveLength(1)
      expect(reopenEvents[0]?.reason).toBe('EXPLICITLY_REOPENED')
      expect(reopenEvents[0]?.new_value).toBe('REOPENED')

      const w2 = await serviceGetConveyorNodeWorkload(pool, seed.conveyorId)
      const step2 = w2?.steps.find((s) => s.stepId === seed.stepId)
      expect(step2?.operationalStatus).toBe('REOPENED')
      expect(step2?.pendingMinutes).toBe(70)

      const thirdComplete = await servicePatchConveyorStepCompletion(pool, {
        conveyorId: seed.conveyorId,
        stepNodeId: seed.stepId,
        actorAppUserId: actorId,
        action: 'COMPLETE',
      })
      expect(thirdComplete.idempotent).toBe(false)

      const completedTwice = await listConveyorOperationalEvents(pool, {
        conveyorId: seed.conveyorId,
        eventType: 'CONVEYOR_STEP_COMPLETED',
        limit: 10,
      })
      expect(completedTwice.length).toBeGreaterThanOrEqual(2)
    },
  )

  it.skipIf(!tablesAvailable)('REOPEN com etapa não concluída falha', async () => {
    const seed = await seedConveyorWithStep(20)
    const u = await pool.query<{ id: string }>(`SELECT id::text AS id FROM app_users LIMIT 1`)
    const actorId = u.rows[0]?.id
    if (!actorId) throw new Error('Esperado ≥1 app_users para actor.')
    await expect(
      servicePatchConveyorStepCompletion(pool, {
        conveyorId: seed.conveyorId,
        stepNodeId: seed.stepId,
        actorAppUserId: actorId,
        action: 'REOPEN',
      }),
    ).rejects.toMatchObject({ statusCode: 422 })
  })
})

