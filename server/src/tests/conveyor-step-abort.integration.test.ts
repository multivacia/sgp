/**
 * Integração abort/restore de STEP.
 *
 * - Sem DB (`hasDb === false`): describe inteiro é skip explícito (padrão do projeto).
 * - Com DB mas sem migration 0050 (`aborted_at` ausente): beforeAll falha (fail-fast),
 *   para não passar silenciosamente com `return` nos `it`.
 */
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  hasDatabaseConnectionInEnv,
  loadDotenvFiles,
  loadEnv,
} from '../config/env.js'
import { closePool, getPool } from '../plugins/db.js'
import { AppError } from '../shared/errors/AppError.js'
import { serviceCreateConveyorTimeEntry } from '../modules/conveyors/conveyorAssignments.service.js'
import { servicePatchConveyorStepCompletion } from '../modules/conveyors/conveyor-step-operational.service.js'
import {
  serviceAbortConveyorStep,
  serviceRestoreAbortedConveyorStep,
} from '../modules/conveyors/conveyor-step-abort.service.js'
import { listConveyorOperationalEvents } from '../modules/conveyors/operational-events/conveyor-operational-events.repository.js'
import { serviceCreateConveyorOperationalEvent } from '../modules/conveyors/operational-events/conveyor-operational-events.service.js'
import { lockConveyorAndStepForUpdate } from '../modules/conveyors/lockConveyorAndStepForUpdate.js'

loadDotenvFiles()
const hasDb = hasDatabaseConnectionInEnv(process.env)

let actorWithCreate: string | null = null

describe.skipIf(!hasDb)('conveyor step abort / restore (integração)', () => {
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    const probe = await pool.query<{ ok: string }>(
      `SELECT CASE
         WHEN to_regclass('public.conveyor_operational_events') IS NOT NULL
          AND to_regclass('public.conveyors') IS NOT NULL
          AND to_regclass('public.conveyor_nodes') IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = 'conveyor_nodes'
               AND column_name = 'aborted_at'
          )
         THEN '1' ELSE '0'
       END AS ok`,
    )
    const tablesAvailable = probe.rows[0]?.ok === '1'
    if (!tablesAvailable) {
      throw new Error(
        'Fail-fast: migration 0050 ausente (coluna conveyor_nodes.aborted_at). ' +
          'Aplique server/migrations/0050_conveyor_nodes_step_aborted.sql no banco local de testes.',
      )
    }

    const u = await pool.query<{ id: string }>(
      `SELECT au.id::text AS id
         FROM app_users au
         INNER JOIN app_role_permissions rp ON rp.role_id = au.role_id
         INNER JOIN app_permissions p ON p.id = rp.permission_id
        WHERE p.code = 'conveyors.create'
          AND au.deleted_at IS NULL
        LIMIT 1`,
    )
    actorWithCreate = u.rows[0]?.id ?? null
    if (!actorWithCreate) {
      throw new Error('Fail-fast: sem utilizador com permissão conveyors.create no banco de testes.')
    }
  })

  afterAll(async () => {
    await closePool()
  })

  async function seedConveyorWithStep(opts?: {
    plannedMinutes?: number
    operationalStatus?: string
    conveyorOperationalStatus?: string
  }): Promise<{
    conveyorId: string
    stepId: string
    areaId: string
    collaboratorId: string
  }> {
    const plannedMinutes = opts?.plannedMinutes ?? 60
    const conveyorId = randomUUID()
    const optionId = randomUUID()
    const areaId = randomUUID()
    const stepId = randomUUID()
    const collaboratorId = randomUUID()
    const conveyorStatus = opts?.conveyorOperationalStatus ?? 'EM_ANDAMENTO'

    await pool.query(
      `INSERT INTO collaborators (id, full_name, status, is_active)
       VALUES ($1::uuid, $2::text, 'ACTIVE', true)`,
      [collaboratorId, `Colab Abort ${stepId.slice(0, 8)}`],
    )
    await pool.query(
      `INSERT INTO conveyors (
         id, name, origin_register, priority, total_options, total_areas, total_steps, total_planned_minutes,
         operational_status
       ) VALUES (
         $1::uuid, 'Conveyor Abort Test', 'MANUAL', 'media', 1, 1, 1, $2::int, $3::text
       )`,
      [conveyorId, plannedMinutes, conveyorStatus],
    )
    await pool.query(
      `INSERT INTO conveyor_nodes (
         id, conveyor_id, parent_id, root_id, node_type, source_origin, name, order_index, level_depth, planned_minutes,
         operational_status, operational_completed_at, operational_completed_by
       ) VALUES
         ($1::uuid, $4::uuid, NULL, $1::uuid, 'OPTION', 'manual', 'OP', 1, 0, NULL, NULL, NULL, NULL),
         ($2::uuid, $4::uuid, $1::uuid, $1::uuid, 'AREA', 'manual', 'AR', 1, 1, NULL, NULL, NULL, NULL),
         ($3::uuid, $4::uuid, $2::uuid, $1::uuid, 'STEP', 'manual', 'ST', 1, 2, $5::int, $6::varchar, NULL, NULL)`,
      [
        optionId,
        areaId,
        stepId,
        conveyorId,
        plannedMinutes,
        opts?.operationalStatus ?? 'PENDING',
      ],
    )
    return { conveyorId, stepId, areaId, collaboratorId }
  }

  /** Segundo STEP na MESMA esteira, para casos de chave reutilizada entre nós. */
  async function insertSiblingStep(
    conveyorId: string,
    areaId: string,
    plannedMinutes = 30,
  ): Promise<string> {
    const stepId = randomUUID()
    await pool.query(
      `INSERT INTO conveyor_nodes (
         id, conveyor_id, parent_id, root_id, node_type, source_origin, name, order_index, level_depth,
         planned_minutes, operational_status
       )
       SELECT $1::uuid, $2::uuid, $3::uuid, root_id, 'STEP', 'manual', 'ST2', 2, 2, $4::int, 'PENDING'
         FROM conveyor_nodes WHERE id = $3::uuid`,
      [stepId, conveyorId, areaId, plannedMinutes],
    )
    return stepId
  }

  async function insertPlanItem(
    conveyorId: string,
    stepId: string,
  ): Promise<string> {
    const planId = randomUUID()
    const planItemId = randomUUID()
    await pool.query(
      `INSERT INTO conveyor_operational_plans (id, conveyor_id, status)
       VALUES ($1::uuid, $2::uuid, 'APPROVED')`,
      [planId, conveyorId],
    )
    await pool.query(
      `INSERT INTO conveyor_operational_plan_items (
         id, plan_id, conveyor_id, activity_node_id, planned_order, status
       ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 0, 'PLANNED')`,
      [planItemId, planId, conveyorId, stepId],
    )
    return planItemId
  }

  async function setConveyorOperationalStatus(
    conveyorId: string,
    status: 'EM_ANDAMENTO' | 'FINALIZADA' | 'CANCELADA',
  ): Promise<void> {
    await pool.query(
      `UPDATE conveyors SET operational_status = $2::text WHERE id = $1::uuid`,
      [conveyorId, status],
    )
  }

  async function readStepStatus(stepId: string): Promise<string | null> {
    const r = await pool.query<{ operational_status: string | null }>(
      `SELECT operational_status FROM conveyor_nodes WHERE id = $1::uuid`,
      [stepId],
    )
    return r.rows[0]?.operational_status ?? null
  }

  async function readPlanItemStatus(planItemId: string): Promise<string | null> {
    const r = await pool.query<{ status: string }>(
      `SELECT status FROM conveyor_operational_plan_items WHERE id = $1::uuid`,
      [planItemId],
    )
    return r.rows[0]?.status ?? null
  }

  async function countEvents(
    conveyorId: string,
    eventType: 'CONVEYOR_STEP_ABORTED' | 'CONVEYOR_STEP_RESTORED',
  ): Promise<number> {
    const events = await listConveyorOperationalEvents(pool, {
      conveyorId,
      eventType,
      limit: 50,
    })
    return events.length
  }

  it('abort → ABORTED + evento + idempotência mesma key', async () => {
    const seed = await seedConveyorWithStep()
    const key = randomUUID()

    const first = await serviceAbortConveyorStep(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      idempotencyKey: key,
      reasonCode: 'NAO_MAIS_NECESSARIA',
    })
    expect(first.idempotent).toBe(false)

    const st = await pool.query<{
      operational_status: string
      abort_reason_code: string | null
      operational_completed_at: string | null
    }>(
      `SELECT operational_status, abort_reason_code, operational_completed_at::text
         FROM conveyor_nodes WHERE id = $1::uuid`,
      [seed.stepId],
    )
    expect(st.rows[0]?.operational_status).toBe('ABORTED')
    expect(st.rows[0]?.abort_reason_code).toBe('NAO_MAIS_NECESSARIA')
    expect(st.rows[0]?.operational_completed_at).toBeNull()

    const events = await listConveyorOperationalEvents(pool, {
      conveyorId: seed.conveyorId,
      eventType: 'CONVEYOR_STEP_ABORTED',
      limit: 10,
    })
    expect(events).toHaveLength(1)

    const second = await serviceAbortConveyorStep(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      idempotencyKey: key,
      reasonCode: 'NAO_MAIS_NECESSARIA',
    })
    expect(second.idempotent).toBe(true)
    const eventsAfter = await listConveyorOperationalEvents(pool, {
      conveyorId: seed.conveyorId,
      eventType: 'CONVEYOR_STEP_ABORTED',
      limit: 10,
    })
    expect(eventsAfter).toHaveLength(1)
  })

  it('key diferente em STEP já ABORTED → 409', async () => {
    const seed = await seedConveyorWithStep()
    await serviceAbortConveyorStep(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      idempotencyKey: randomUUID(),
      reasonCode: 'ERRO_DE_PLANEJAMENTO',
    })
    await expect(
      serviceAbortConveyorStep(pool, {
        conveyorId: seed.conveyorId,
        stepNodeId: seed.stepId,
        actorAppUserId: actorWithCreate!,
        idempotencyKey: randomUUID(),
        reasonCode: 'ERRO_DE_PLANEJAMENTO',
      }),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('COMPLETED → abort rejeitado 409', async () => {
    const seed = await seedConveyorWithStep()
    await servicePatchConveyorStepCompletion(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      action: 'COMPLETE',
    })
    await expect(
      serviceAbortConveyorStep(pool, {
        conveyorId: seed.conveyorId,
        stepNodeId: seed.stepId,
        actorAppUserId: actorWithCreate!,
        idempotencyKey: randomUUID(),
        reasonCode: 'NAO_MAIS_NECESSARIA',
      }),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('esteira FINALIZADA ou CANCELADA → abort rejeitado 409', async () => {
    for (const conveyorOperationalStatus of ['FINALIZADA', 'CANCELADA'] as const) {
      const seed = await seedConveyorWithStep({ conveyorOperationalStatus })
      await expect(
        serviceAbortConveyorStep(pool, {
          conveyorId: seed.conveyorId,
          stepNodeId: seed.stepId,
          actorAppUserId: actorWithCreate!,
          idempotencyKey: randomUUID(),
          reasonCode: 'NAO_MAIS_NECESSARIA',
        }),
      ).rejects.toMatchObject({ statusCode: 409 })

      const st = await pool.query<{ operational_status: string }>(
        `SELECT operational_status FROM conveyor_nodes WHERE id = $1::uuid`,
        [seed.stepId],
      )
      expect(st.rows[0]?.operational_status).toBe('PENDING')
    }
  })

  it('replay de abort continua 200 mesmo com esteira FINALIZADA após a operação', async () => {
    const seed = await seedConveyorWithStep()
    const key = randomUUID()

    const first = await serviceAbortConveyorStep(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      idempotencyKey: key,
      reasonCode: 'NAO_MAIS_NECESSARIA',
    })
    expect(first.idempotent).toBe(false)

    await setConveyorOperationalStatus(seed.conveyorId, 'FINALIZADA')

    const replay = await serviceAbortConveyorStep(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      idempotencyKey: key,
      reasonCode: 'NAO_MAIS_NECESSARIA',
    })
    expect(replay.idempotent).toBe(true)
    expect(await readStepStatus(seed.stepId)).toBe('ABORTED')
    expect(await countEvents(seed.conveyorId, 'CONVEYOR_STEP_ABORTED')).toBe(1)

    // Chave nova na mesma esteira finalizada continua bloqueada.
    const sibling = await insertSiblingStep(seed.conveyorId, seed.areaId)
    await expect(
      serviceAbortConveyorStep(pool, {
        conveyorId: seed.conveyorId,
        stepNodeId: sibling,
        actorAppUserId: actorWithCreate!,
        idempotencyKey: randomUUID(),
        reasonCode: 'NAO_MAIS_NECESSARIA',
      }),
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(await readStepStatus(sibling)).toBe('PENDING')
  })

  it('replay de restore continua 200 mesmo com esteira FINALIZADA após a operação', async () => {
    const seed = await seedConveyorWithStep()
    const restoreKey = randomUUID()

    await serviceAbortConveyorStep(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      idempotencyKey: randomUUID(),
      reasonCode: 'NAO_MAIS_NECESSARIA',
    })
    const first = await serviceRestoreAbortedConveyorStep(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      idempotencyKey: restoreKey,
    })
    expect(first.idempotent).toBe(false)

    await setConveyorOperationalStatus(seed.conveyorId, 'FINALIZADA')

    const replay = await serviceRestoreAbortedConveyorStep(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      idempotencyKey: restoreKey,
    })
    expect(replay.idempotent).toBe(true)
    expect(await readStepStatus(seed.stepId)).toBe('REOPENED')
    expect(await countEvents(seed.conveyorId, 'CONVEYOR_STEP_RESTORED')).toBe(1)
  })

  it('restore com chave nova em esteira FINALIZADA → 409', async () => {
    const seed = await seedConveyorWithStep()
    await serviceAbortConveyorStep(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      idempotencyKey: randomUUID(),
      reasonCode: 'NAO_MAIS_NECESSARIA',
    })

    await setConveyorOperationalStatus(seed.conveyorId, 'FINALIZADA')

    await expect(
      serviceRestoreAbortedConveyorStep(pool, {
        conveyorId: seed.conveyorId,
        stepNodeId: seed.stepId,
        actorAppUserId: actorWithCreate!,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(await readStepStatus(seed.stepId)).toBe('ABORTED')
    expect(await countEvents(seed.conveyorId, 'CONVEYOR_STEP_RESTORED')).toBe(0)
  })

  it('abort sync cancela conveyor_operational_plan_items e operational_work_plan_items', async () => {
    const seed = await seedConveyorWithStep()
    const planId = randomUUID()
    const planItemId = randomUUID()
    const weekStart = '2099-01-05' // segunda fixa longe de dados reais
    const plannedDate = '2099-01-06'

    await pool.query(
      `INSERT INTO conveyor_operational_plans (
         id, conveyor_id, status
       ) VALUES ($1::uuid, $2::uuid, 'APPROVED')`,
      [planId, seed.conveyorId],
    )
    await pool.query(
      `INSERT INTO conveyor_operational_plan_items (
         id, plan_id, conveyor_id, activity_node_id, planned_order, status
       ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 0, 'PLANNED')`,
      [planItemId, planId, seed.conveyorId, seed.stepId],
    )

    await pool.query(
      `DELETE FROM operational_work_plan_items
        WHERE work_plan_id IN (
          SELECT id FROM operational_work_plans WHERE week_start_date = $1::date
        )`,
      [weekStart],
    )
    await pool.query(`DELETE FROM operational_work_plans WHERE week_start_date = $1::date`, [
      weekStart,
    ])

    const workPlan = await pool.query<{ id: string }>(
      `INSERT INTO operational_work_plans (
         week_start_date, week_end_date, status, created_by, published_at
       ) VALUES ($2::date, ($2::date + 6), 'PUBLISHED', $1::uuid, now())
       RETURNING id::text`,
      [actorWithCreate, weekStart],
    )
    const workPlanId = workPlan.rows[0]?.id
    if (!workPlanId) throw new Error('plano semanal não criado')

    const workItem = await pool.query<{ id: string }>(
      `INSERT INTO operational_work_plan_items (
         work_plan_id, conveyor_id, activity_node_id, assigned_collaborator_id,
         planned_date, planned_order, status
       ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::date, 1, 'PLANNED')
       RETURNING id::text`,
      [workPlanId, seed.conveyorId, seed.stepId, seed.collaboratorId, plannedDate],
    )
    const workItemId = workItem.rows[0]?.id
    if (!workItemId) throw new Error('item semanal não criado')

    await serviceAbortConveyorStep(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      idempotencyKey: randomUUID(),
      reasonCode: 'SUBSTITUIDA_POR_OUTRA',
    })

    const cancelledPlan = await pool.query<{
      status: string
      cancellation_reason: string | null
    }>(
      `SELECT status, cancellation_reason FROM conveyor_operational_plan_items WHERE id = $1::uuid`,
      [planItemId],
    )
    expect(cancelledPlan.rows[0]?.status).toBe('CANCELLED')
    expect(cancelledPlan.rows[0]?.cancellation_reason).toContain('STEP_ABORTED')

    const cancelledWork = await pool.query<{ status: string }>(
      `SELECT status FROM operational_work_plan_items WHERE id = $1::uuid`,
      [workItemId],
    )
    expect(cancelledWork.rows[0]?.status).toBe('CANCELLED')
  })

  it('restore ABORTED → REOPENED sem reativar planos + evento', async () => {
    const seed = await seedConveyorWithStep()
    const planId = randomUUID()
    const planItemId = randomUUID()
    await pool.query(
      `INSERT INTO conveyor_operational_plans (
         id, conveyor_id, status
       ) VALUES ($1::uuid, $2::uuid, 'APPROVED')`,
      [planId, seed.conveyorId],
    )
    await pool.query(
      `INSERT INTO conveyor_operational_plan_items (
         id, plan_id, conveyor_id, activity_node_id, planned_order, status
       ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 0, 'PLANNED')`,
      [planItemId, planId, seed.conveyorId, seed.stepId],
    )

    await serviceAbortConveyorStep(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      idempotencyKey: randomUUID(),
      reasonCode: 'SUBSTITUIDA_POR_OUTRA',
    })
    const cancelled = await pool.query<{ status: string; cancellation_reason: string | null }>(
      `SELECT status, cancellation_reason FROM conveyor_operational_plan_items WHERE id = $1::uuid`,
      [planItemId],
    )
    expect(cancelled.rows[0]?.status).toBe('CANCELLED')
    expect(cancelled.rows[0]?.cancellation_reason).toContain('STEP_ABORTED')

    const restoreKey = randomUUID()
    const restored = await serviceRestoreAbortedConveyorStep(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      idempotencyKey: restoreKey,
    })
    expect(restored.idempotent).toBe(false)

    const st = await pool.query<{
      operational_status: string
      aborted_at: string | null
      abort_reason_code: string | null
    }>(
      `SELECT operational_status, aborted_at::text, abort_reason_code
         FROM conveyor_nodes WHERE id = $1::uuid`,
      [seed.stepId],
    )
    expect(st.rows[0]?.operational_status).toBe('REOPENED')
    expect(st.rows[0]?.aborted_at).toBeNull()
    expect(st.rows[0]?.abort_reason_code).toBeNull()

    const stillCancelled = await pool.query<{ status: string }>(
      `SELECT status FROM conveyor_operational_plan_items WHERE id = $1::uuid`,
      [planItemId],
    )
    expect(stillCancelled.rows[0]?.status).toBe('CANCELLED')

    const events = await listConveyorOperationalEvents(pool, {
      conveyorId: seed.conveyorId,
      eventType: 'CONVEYOR_STEP_RESTORED',
      limit: 5,
    })
    expect(events).toHaveLength(1)

    const replay = await serviceRestoreAbortedConveyorStep(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      idempotencyKey: restoreKey,
    })
    expect(replay.idempotent).toBe(true)
    expect(await countEvents(seed.conveyorId, 'CONVEYOR_STEP_RESTORED')).toBe(1)
  })

  it('OUTRO sem texto → 400; após abort novos apontamentos bloqueados; horas prévias preservadas', async () => {
    const seed = await seedConveyorWithStep()
    await serviceCreateConveyorTimeEntry(pool, {
      conveyorId: seed.conveyorId,
      conveyorNodeId: seed.stepId,
      collaboratorId: seed.collaboratorId,
      minutes: 25,
    })

    await expect(
      serviceAbortConveyorStep(pool, {
        conveyorId: seed.conveyorId,
        stepNodeId: seed.stepId,
        actorAppUserId: actorWithCreate!,
        idempotencyKey: randomUUID(),
        reasonCode: 'OUTRO',
        reasonText: '  ',
      }),
    ).rejects.toMatchObject({ statusCode: 400 })

    await serviceAbortConveyorStep(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      idempotencyKey: randomUUID(),
      reasonCode: 'OUTRO',
      reasonText: 'Pedido especial do cliente',
    })

    const entries = await pool.query<{ minutes: number }>(
      `SELECT minutes FROM conveyor_time_entries WHERE conveyor_node_id = $1::uuid AND deleted_at IS NULL`,
      [seed.stepId],
    )
    expect(entries.rows).toHaveLength(1)
    expect(entries.rows[0]?.minutes).toBe(25)

    await expect(
      serviceCreateConveyorTimeEntry(pool, {
        conveyorId: seed.conveyorId,
        conveyorNodeId: seed.stepId,
        collaboratorId: seed.collaboratorId,
        minutes: 10,
      }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('concorrência real: apontamento × dispensa (dois vencedores de lock)', async () => {
    // Caso A: apontamento obtém lock primeiro → grava; dispensa posterior preserva horas
    {
      const seed = await seedConveyorWithStep()
      const hold = await pool.connect()
      try {
        await hold.query('BEGIN')
        await lockConveyorAndStepForUpdate(hold, seed.conveyorId, seed.stepId)

        const abortPromise = serviceAbortConveyorStep(pool, {
          conveyorId: seed.conveyorId,
          stepNodeId: seed.stepId,
          actorAppUserId: actorWithCreate!,
          idempotencyKey: randomUUID(),
          reasonCode: 'NAO_MAIS_NECESSARIA',
        })

        await new Promise((r) => setTimeout(r, 120))

        await hold.query(
          `INSERT INTO conveyor_time_entries (
             id, conveyor_id, conveyor_node_id, collaborator_id, entry_at, minutes, entry_mode
           ) VALUES (
             $1::uuid, $2::uuid, $3::uuid, $4::uuid, now(), 15, 'manual'
           )`,
          [randomUUID(), seed.conveyorId, seed.stepId, seed.collaboratorId],
        )
        await hold.query('COMMIT')

        await abortPromise

        const st = await pool.query<{ operational_status: string }>(
          `SELECT operational_status FROM conveyor_nodes WHERE id = $1::uuid`,
          [seed.stepId],
        )
        expect(st.rows[0]?.operational_status).toBe('ABORTED')
        const entries = await pool.query<{ n: string }>(
          `SELECT count(*)::text AS n FROM conveyor_time_entries
            WHERE conveyor_node_id = $1::uuid AND deleted_at IS NULL`,
          [seed.stepId],
        )
        expect(Number(entries.rows[0]?.n)).toBe(1)
      } finally {
        try {
          await hold.query('ROLLBACK')
        } catch {
          /* ignore */
        }
        hold.release()
      }
    }

    // Caso B: dispensa obtém lock primeiro → apontamento concurrente rejeita sem gravar
    {
      const seed = await seedConveyorWithStep()
      const hold = await pool.connect()
      try {
        await hold.query('BEGIN')
        await lockConveyorAndStepForUpdate(hold, seed.conveyorId, seed.stepId)

        const timeEntryPromise = serviceCreateConveyorTimeEntry(pool, {
          conveyorId: seed.conveyorId,
          conveyorNodeId: seed.stepId,
          collaboratorId: seed.collaboratorId,
          minutes: 12,
        })

        await new Promise((r) => setTimeout(r, 120))

        await hold.query(
          `UPDATE conveyor_nodes SET
             operational_status = 'ABORTED',
             aborted_at = now(),
             aborted_by = $3::uuid,
             abort_reason_code = 'NAO_MAIS_NECESSARIA',
             updated_at = now()
           WHERE id = $1::uuid AND conveyor_id = $2::uuid`,
          [seed.stepId, seed.conveyorId, actorWithCreate],
        )
        await hold.query('COMMIT')

        await expect(timeEntryPromise).rejects.toMatchObject({ statusCode: 409 })

        const entries = await pool.query<{ n: string }>(
          `SELECT count(*)::text AS n FROM conveyor_time_entries
            WHERE conveyor_node_id = $1::uuid AND deleted_at IS NULL`,
          [seed.stepId],
        )
        expect(Number(entries.rows[0]?.n)).toBe(0)
      } finally {
        try {
          await hold.query('ROLLBACK')
        } catch {
          /* ignore */
        }
        hold.release()
      }
    }
  })

  it('concorrência real: conclusão × dispensa', async () => {
    // Conclusão primeiro → dispensa 409
    {
      const seed = await seedConveyorWithStep()
      const hold = await pool.connect()
      try {
        await hold.query('BEGIN')
        await lockConveyorAndStepForUpdate(hold, seed.conveyorId, seed.stepId)

        const abortPromise = serviceAbortConveyorStep(pool, {
          conveyorId: seed.conveyorId,
          stepNodeId: seed.stepId,
          actorAppUserId: actorWithCreate!,
          idempotencyKey: randomUUID(),
          reasonCode: 'NAO_MAIS_NECESSARIA',
        })

        await new Promise((r) => setTimeout(r, 120))

        await hold.query(
          `UPDATE conveyor_nodes SET
             operational_status = 'COMPLETED',
             operational_completed_at = now(),
             operational_completed_by = $3::uuid,
             updated_at = now()
           WHERE id = $1::uuid AND conveyor_id = $2::uuid`,
          [seed.stepId, seed.conveyorId, actorWithCreate],
        )
        await hold.query('COMMIT')

        await expect(abortPromise).rejects.toMatchObject({ statusCode: 409 })

        const st = await pool.query<{ operational_status: string }>(
          `SELECT operational_status FROM conveyor_nodes WHERE id = $1::uuid`,
          [seed.stepId],
        )
        expect(st.rows[0]?.operational_status).toBe('COMPLETED')
      } finally {
        try {
          await hold.query('ROLLBACK')
        } catch {
          /* ignore */
        }
        hold.release()
      }
    }

    // Dispensa primeiro → conclusão rejeitada e permanece ABORTED
    {
      const seed = await seedConveyorWithStep()
      const hold = await pool.connect()
      try {
        await hold.query('BEGIN')
        await lockConveyorAndStepForUpdate(hold, seed.conveyorId, seed.stepId)

        const completePromise = servicePatchConveyorStepCompletion(pool, {
          conveyorId: seed.conveyorId,
          stepNodeId: seed.stepId,
          actorAppUserId: actorWithCreate!,
          action: 'COMPLETE',
        })

        await new Promise((r) => setTimeout(r, 120))

        await hold.query(
          `UPDATE conveyor_nodes SET
             operational_status = 'ABORTED',
             aborted_at = now(),
             aborted_by = $3::uuid,
             abort_reason_code = 'SOLICITACAO_CLIENTE',
             updated_at = now()
           WHERE id = $1::uuid AND conveyor_id = $2::uuid`,
          [seed.stepId, seed.conveyorId, actorWithCreate],
        )
        await hold.query('COMMIT')

        await expect(completePromise).rejects.toBeInstanceOf(AppError)

        const st = await pool.query<{ operational_status: string }>(
          `SELECT operational_status FROM conveyor_nodes WHERE id = $1::uuid`,
          [seed.stepId],
        )
        expect(st.rows[0]?.operational_status).toBe('ABORTED')
      } finally {
        try {
          await hold.query('ROLLBACK')
        } catch {
          /* ignore */
        }
        hold.release()
      }
    }
  })

  it('abort: chave já usada por evento de OUTRO TIPO no mesmo STEP → 409 sem mutação', async () => {
    const seed = await seedConveyorWithStep()
    const planItemId = await insertPlanItem(seed.conveyorId, seed.stepId)
    const key = randomUUID()

    await serviceCreateConveyorOperationalEvent(pool, {
      conveyorId: seed.conveyorId,
      nodeId: seed.stepId,
      eventType: 'MANUAL_NOTE',
      source: 'USER_ACTION',
      occurredAt: new Date().toISOString(),
      createdBy: actorWithCreate!,
      idempotencyKey: key,
    })

    await expect(
      serviceAbortConveyorStep(pool, {
        conveyorId: seed.conveyorId,
        stepNodeId: seed.stepId,
        actorAppUserId: actorWithCreate!,
        idempotencyKey: key,
        reasonCode: 'NAO_MAIS_NECESSARIA',
      }),
    ).rejects.toMatchObject({ statusCode: 409 })

    expect(await readStepStatus(seed.stepId)).toBe('PENDING')
    expect(await readPlanItemStatus(planItemId)).toBe('PLANNED')
    expect(await countEvents(seed.conveyorId, 'CONVEYOR_STEP_ABORTED')).toBe(0)
  })

  it('abort: chave já usada por CONVEYOR_STEP_ABORTED de OUTRO STEP → 409 sem mutação', async () => {
    const seed = await seedConveyorWithStep()
    const siblingStepId = await insertSiblingStep(seed.conveyorId, seed.areaId)
    const planItemId = await insertPlanItem(seed.conveyorId, siblingStepId)
    const key = randomUUID()

    await serviceAbortConveyorStep(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      idempotencyKey: key,
      reasonCode: 'NAO_MAIS_NECESSARIA',
    })

    await expect(
      serviceAbortConveyorStep(pool, {
        conveyorId: seed.conveyorId,
        stepNodeId: siblingStepId,
        actorAppUserId: actorWithCreate!,
        idempotencyKey: key,
        reasonCode: 'NAO_MAIS_NECESSARIA',
      }),
    ).rejects.toMatchObject({ statusCode: 409 })

    expect(await readStepStatus(siblingStepId)).toBe('PENDING')
    expect(await readPlanItemStatus(planItemId)).toBe('PLANNED')
    expect(await countEvents(seed.conveyorId, 'CONVEYOR_STEP_ABORTED')).toBe(1)
  })

  it('abort: chave já usada por evento de OUTRA ESTEIRA → 409 sem mutação', async () => {
    const seedA = await seedConveyorWithStep()
    const seedB = await seedConveyorWithStep()
    const planItemB = await insertPlanItem(seedB.conveyorId, seedB.stepId)
    const key = randomUUID()

    await serviceAbortConveyorStep(pool, {
      conveyorId: seedA.conveyorId,
      stepNodeId: seedA.stepId,
      actorAppUserId: actorWithCreate!,
      idempotencyKey: key,
      reasonCode: 'ERRO_DE_PLANEJAMENTO',
    })

    await expect(
      serviceAbortConveyorStep(pool, {
        conveyorId: seedB.conveyorId,
        stepNodeId: seedB.stepId,
        actorAppUserId: actorWithCreate!,
        idempotencyKey: key,
        reasonCode: 'ERRO_DE_PLANEJAMENTO',
      }),
    ).rejects.toMatchObject({ statusCode: 409 })

    expect(await readStepStatus(seedB.stepId)).toBe('PENDING')
    expect(await readPlanItemStatus(planItemB)).toBe('PLANNED')
    expect(await countEvents(seedB.conveyorId, 'CONVEYOR_STEP_ABORTED')).toBe(0)
  })

  it('restore: chave do abort reutilizada no restore → 409 e STEP segue ABORTED', async () => {
    const seed = await seedConveyorWithStep()
    const key = randomUUID()

    await serviceAbortConveyorStep(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      idempotencyKey: key,
      reasonCode: 'NAO_MAIS_NECESSARIA',
    })

    await expect(
      serviceRestoreAbortedConveyorStep(pool, {
        conveyorId: seed.conveyorId,
        stepNodeId: seed.stepId,
        actorAppUserId: actorWithCreate!,
        idempotencyKey: key,
      }),
    ).rejects.toMatchObject({ statusCode: 409 })

    expect(await readStepStatus(seed.stepId)).toBe('ABORTED')
    expect(await countEvents(seed.conveyorId, 'CONVEYOR_STEP_RESTORED')).toBe(0)
  })

  it('restore: chave de restore de outra esteira → 409 sem mutação', async () => {
    const seedA = await seedConveyorWithStep()
    const seedB = await seedConveyorWithStep()
    const restoreKey = randomUUID()

    for (const seed of [seedA, seedB]) {
      await serviceAbortConveyorStep(pool, {
        conveyorId: seed.conveyorId,
        stepNodeId: seed.stepId,
        actorAppUserId: actorWithCreate!,
        idempotencyKey: randomUUID(),
        reasonCode: 'NAO_MAIS_NECESSARIA',
      })
    }

    await serviceRestoreAbortedConveyorStep(pool, {
      conveyorId: seedA.conveyorId,
      stepNodeId: seedA.stepId,
      actorAppUserId: actorWithCreate!,
      idempotencyKey: restoreKey,
    })

    await expect(
      serviceRestoreAbortedConveyorStep(pool, {
        conveyorId: seedB.conveyorId,
        stepNodeId: seedB.stepId,
        actorAppUserId: actorWithCreate!,
        idempotencyKey: restoreKey,
      }),
    ).rejects.toMatchObject({ statusCode: 409 })

    expect(await readStepStatus(seedB.stepId)).toBe('ABORTED')
    expect(await countEvents(seedB.conveyorId, 'CONVEYOR_STEP_RESTORED')).toBe(0)
  })

  it('restore: evento de restore existente com estado atual incoerente → 409', async () => {
    const seed = await seedConveyorWithStep()
    const restoreKey = randomUUID()

    await serviceAbortConveyorStep(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      idempotencyKey: randomUUID(),
      reasonCode: 'NAO_MAIS_NECESSARIA',
    })
    await serviceRestoreAbortedConveyorStep(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      idempotencyKey: restoreKey,
    })
    // Novo abort deixa o STEP em ABORTED: incoerente com o fato já registado (REOPENED).
    await serviceAbortConveyorStep(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      idempotencyKey: randomUUID(),
      reasonCode: 'NAO_MAIS_NECESSARIA',
    })

    await expect(
      serviceRestoreAbortedConveyorStep(pool, {
        conveyorId: seed.conveyorId,
        stepNodeId: seed.stepId,
        actorAppUserId: actorWithCreate!,
        idempotencyKey: restoreKey,
      }),
    ).rejects.toMatchObject({ statusCode: 409 })

    expect(await readStepStatus(seed.stepId)).toBe('ABORTED')
    expect(await countEvents(seed.conveyorId, 'CONVEYOR_STEP_RESTORED')).toBe(1)
  })

  it('replay de abort e de restore concluem com pool dedicado max: 1', async () => {
    const env = loadEnv()
    const singlePool = new pg.Pool({ ...env.pgPoolConfig, max: 1 })
    try {
      const seed = await seedConveyorWithStep()
      const abortKey = randomUUID()
      const restoreKey = randomUUID()

      await serviceAbortConveyorStep(singlePool, {
        conveyorId: seed.conveyorId,
        stepNodeId: seed.stepId,
        actorAppUserId: actorWithCreate!,
        idempotencyKey: abortKey,
        reasonCode: 'NAO_MAIS_NECESSARIA',
      })
      const abortReplay = await serviceAbortConveyorStep(singlePool, {
        conveyorId: seed.conveyorId,
        stepNodeId: seed.stepId,
        actorAppUserId: actorWithCreate!,
        idempotencyKey: abortKey,
        reasonCode: 'NAO_MAIS_NECESSARIA',
      })
      expect(abortReplay.idempotent).toBe(true)

      await serviceRestoreAbortedConveyorStep(singlePool, {
        conveyorId: seed.conveyorId,
        stepNodeId: seed.stepId,
        actorAppUserId: actorWithCreate!,
        idempotencyKey: restoreKey,
      })
      const restoreReplay = await serviceRestoreAbortedConveyorStep(singlePool, {
        conveyorId: seed.conveyorId,
        stepNodeId: seed.stepId,
        actorAppUserId: actorWithCreate!,
        idempotencyKey: restoreKey,
      })
      expect(restoreReplay.idempotent).toBe(true)

      expect(await countEvents(seed.conveyorId, 'CONVEYOR_STEP_ABORTED')).toBe(1)
      expect(await countEvents(seed.conveyorId, 'CONVEYOR_STEP_RESTORED')).toBe(1)
    } finally {
      await singlePool.end()
    }
  })

  it('regressão COMPLETE/REOPEN permanece correta', async () => {
    const seed = await seedConveyorWithStep()
    await servicePatchConveyorStepCompletion(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      action: 'COMPLETE',
    })
    let st = await pool.query<{ operational_status: string }>(
      `SELECT operational_status FROM conveyor_nodes WHERE id = $1::uuid`,
      [seed.stepId],
    )
    expect(st.rows[0]?.operational_status).toBe('COMPLETED')

    await servicePatchConveyorStepCompletion(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: actorWithCreate!,
      action: 'REOPEN',
    })
    st = await pool.query<{ operational_status: string }>(
      `SELECT operational_status FROM conveyor_nodes WHERE id = $1::uuid`,
      [seed.stepId],
    )
    expect(st.rows[0]?.operational_status).toBe('REOPENED')
  })
})
