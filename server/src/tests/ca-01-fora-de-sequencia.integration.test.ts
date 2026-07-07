/**
 * CA-01 — "Fora de sequência" por dono do planejamento (cenário João/Maria).
 * Fonte: docs/releases/ca-01-fora-de-sequencia.integration.test.ts
 */
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { hasDatabaseConnectionInEnv, loadDotenvFiles, loadEnv } from '../config/env.js'
import { closePool, getPool } from '../plugins/db.js'
import { servicePatchConveyorStepCompletion } from '../modules/conveyors/conveyor-step-operational.service.js'
import { serviceAnalyzeConveyorActivitySequence } from '../modules/conveyors/conveyorActivitySequence.service.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import { linkAppUserToCollaborator } from './integrationSeedFixtures.js'
import { setConveyorProductionStatusForIntegration } from './integrationConveyorFixtures.js'

loadDotenvFiles()
const hasDb = hasDatabaseConnectionInEnv(process.env)
let tablesAvailable = false

const describeCa01 = hasDb ? describe : describe.skip

describeCa01('CA-01 fora de sequência por dono do plano (João/Maria)', () => {
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    pool = getPool(loadEnv())
    const probe = await pool.query<{ ok: string }>(
      `SELECT CASE
         WHEN to_regclass('public.conveyors') IS NOT NULL
          AND to_regclass('public.conveyor_nodes') IS NOT NULL
          AND to_regclass('public.operational_work_plans') IS NOT NULL
          AND to_regclass('public.operational_work_plan_items') IS NOT NULL
         THEN '1' ELSE '0' END AS ok`,
    )
    tablesAvailable = probe.rows[0]?.ok === '1'
  })

  afterAll(async () => {
    await closePool()
  })

  async function seedScenario() {
    const conveyorId = randomUUID()
    const optionId = randomUUID()
    const areaId = randomUUID()
    const funilariaId = randomUUID()
    const pinturaId = randomUUID()

    const joaoCollab = randomUUID()
    const mariaCollab = randomUUID()
    const joaoAppUser = randomUUID()
    const workPlanId = randomUUID()
    const weekOffset = 500 + Math.floor(Math.random() * 5000)

    await pool.query(
      `INSERT INTO collaborators (id, code, full_name, status, is_active) VALUES
         ($1::uuid, $3, $5, 'ACTIVE', true),
         ($2::uuid, $4, $6, 'ACTIVE', true)`,
      [
        joaoCollab,
        mariaCollab,
        `COL-CA01-J-${joaoCollab.slice(0, 8)}`,
        `COL-CA01-M-${mariaCollab.slice(0, 8)}`,
        `João Teste ${joaoCollab.slice(0, 8)}`,
        `Maria Teste ${mariaCollab.slice(0, 8)}`,
      ],
    )

    await pool.query(
      `INSERT INTO app_users (id, email, is_active)
       VALUES ($1::uuid, $2, true)`,
      [joaoAppUser, `joao+${joaoAppUser}@teste.local`],
    )
    await linkAppUserToCollaborator(pool, joaoAppUser, joaoCollab)

    await pool.query(
      `INSERT INTO conveyors (id, name, origin_register, priority, total_options, total_areas, total_steps, total_planned_minutes)
       VALUES ($1::uuid, 'CA-01 João/Maria', 'MANUAL', 'media', 1, 1, 2, 240)`,
      [conveyorId],
    )
    await pool.query(
      `INSERT INTO conveyor_nodes (
         id, conveyor_id, parent_id, root_id, node_type, source_origin, name,
         order_index, level_depth, planned_minutes, operational_status
       ) VALUES
         ($1::uuid, $5::uuid, NULL,      $1::uuid, 'OPTION', 'manual', 'Tarefa',   1, 0, NULL, NULL),
         ($2::uuid, $5::uuid, $1::uuid,  $1::uuid, 'AREA',   'manual', 'Setor',    1, 1, NULL, NULL),
         ($3::uuid, $5::uuid, $2::uuid,  $1::uuid, 'STEP',   'manual', 'Funilaria',1, 2, 120,  'PENDING'),
         ($4::uuid, $5::uuid, $2::uuid,  $1::uuid, 'STEP',   'manual', 'Pintura',  2, 2, 120,  'PENDING')`,
      [optionId, areaId, funilariaId, pinturaId, conveyorId],
    )

    await setConveyorProductionStatusForIntegration(pool, conveyorId, 'EM_ANDAMENTO')

    await pool.query(
      `INSERT INTO conveyor_node_assignees (
         id, conveyor_id, conveyor_node_id, collaborator_id, is_primary, order_index, assignment_origin
       ) VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, true, 0, 'manual')`,
      [conveyorId, pinturaId, joaoCollab],
    )

    await pool.query(
      `INSERT INTO operational_work_plans (id, week_start_date, week_end_date, status, created_by, published_at)
       VALUES ($1::uuid, CURRENT_DATE + $3::int, CURRENT_DATE + $3::int + 6, 'PUBLISHED', $2::uuid, now())`,
      [workPlanId, joaoAppUser, weekOffset],
    )

    return {
      conveyorId,
      funilariaId,
      pinturaId,
      joaoCollab,
      mariaCollab,
      joaoAppUser,
      workPlanId,
      plannedDateOffset: weekOffset,
    }
  }

  async function planItem(
    s: Awaited<ReturnType<typeof seedScenario>>,
    activityNodeId: string,
    collaboratorId: string,
    plannedOrder: number,
  ) {
    await pool.query(
      `INSERT INTO operational_work_plan_items
         (id, work_plan_id, conveyor_id, activity_node_id, assigned_collaborator_id, planned_date, planned_order, status)
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4::uuid, CURRENT_DATE + $5::int, $6, 'PLANNED')`,
      [s.workPlanId, s.conveyorId, activityNodeId, collaboratorId, s.plannedDateOffset, plannedOrder],
    )
  }

  it(
    'João conclui a Pintura com a Funilaria pendente da Maria com justificativa',
    async () => {
      expect(tablesAvailable).toBe(true)
      const s = await seedScenario()
      await planItem(s, s.funilariaId, s.mariaCollab, 1)
      await planItem(s, s.pinturaId, s.joaoCollab, 2)

      const seq = await serviceAnalyzeConveyorActivitySequence(
        pool,
        s.conveyorId,
        s.pinturaId,
        s.joaoCollab,
      )
      expect(seq.hasPreviousPendingStep).toBe(true)
      expect(seq.isOutOfSequence).toBe(true)
      expect(seq.awaitingOthersActivities.map((a) => a.activityTitle)).toContain('Funilaria')

      const res = await servicePatchConveyorStepCompletion(pool, {
        conveyorId: s.conveyorId,
        stepNodeId: s.pinturaId,
        actorAppUserId: s.joaoAppUser,
        action: 'COMPLETE',
        outOfSequenceJustification: 'Prioridade operacional',
      })
      expect(res.idempotent).toBe(false)

      const st = await pool.query<{ operational_status: string }>(
        `SELECT operational_status FROM conveyor_nodes WHERE id = $1::uuid`,
        [s.pinturaId],
      )
      expect(st.rows[0]?.operational_status).toBe('COMPLETED')
    },
  )

  it(
    'João é bloqueado (422) por pendência própria e conclui informando justificativa',
    async () => {
      expect(tablesAvailable).toBe(true)
      const s = await seedScenario()
      await planItem(s, s.funilariaId, s.joaoCollab, 1)
      await planItem(s, s.pinturaId, s.joaoCollab, 2)

      const seq = await serviceAnalyzeConveyorActivitySequence(pool, s.conveyorId, s.pinturaId, s.joaoCollab)
      expect(seq.isOutOfSequence).toBe(true)

      await expect(
        servicePatchConveyorStepCompletion(pool, {
          conveyorId: s.conveyorId,
          stepNodeId: s.pinturaId,
          actorAppUserId: s.joaoAppUser,
          action: 'COMPLETE',
        }),
      ).rejects.toMatchObject({
        statusCode: 422,
        code: ErrorCodes.STEP_COMPLETION_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION,
      })

      const ok = await servicePatchConveyorStepCompletion(pool, {
        conveyorId: s.conveyorId,
        stepNodeId: s.pinturaId,
        actorAppUserId: s.joaoAppUser,
        action: 'COMPLETE',
        outOfSequenceJustification: 'Liberado pelo líder para adiantar a pintura.',
      })
      expect(ok.idempotent).toBe(false)
    },
  )

  it(
    'predecessora não planejada ainda gera pendência estrutural',
    async () => {
      expect(tablesAvailable).toBe(true)
      const s = await seedScenario()
      await planItem(s, s.pinturaId, s.joaoCollab, 1)

      const seq = await serviceAnalyzeConveyorActivitySequence(pool, s.conveyorId, s.pinturaId, s.joaoCollab)
      expect(seq.hasPreviousPendingStep).toBe(true)
      expect(seq.isOutOfSequence).toBe(true)
    },
  )
})
