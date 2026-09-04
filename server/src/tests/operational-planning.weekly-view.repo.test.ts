import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPool, closePool } from '../plugins/db.js'
import { hasDatabaseConnectionInEnv, loadDotenvFiles, loadEnv } from '../config/env.js'
import { hashPassword } from '../shared/password/password.js'
import { serviceCreateConveyor } from '../modules/conveyors/conveyors.service.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'
import { listItemsForWorkPlanWeeklyView } from '../modules/operational-planning/operational-planning.repository.js'
import {
  mondayOfWeekContaining,
  fridayAfterMonday,
} from '../modules/operational-planning/operational-planning.week.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const GOV_ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const GOV_ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'
const MARIA_COLLABORATOR_ID = '3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c'

function conveyorBodyWithSteps(nome: string): PostConveyorBody {
  return {
    dados: {
      nome,
      cliente: 'C',
      veiculo: 'V',
      modeloVersao: '',
      placa: '',
      observacoes: '',
      responsavel: '',
      prazoEstimado: '',
      prioridade: 'media',
      colaboradorId: null,
    },
    originType: 'MANUAL',
    baseId: null,
    baseCode: null,
    baseName: null,
    baseVersion: null,
    options: [
      {
        titulo: 'Tarefa WeeklyView',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'Setor WeeklyView',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: [
              { titulo: 'Etapa 1', orderIndex: 1, plannedMinutes: 30, sourceOrigin: 'manual', required: true },
              { titulo: 'Etapa 2', orderIndex: 2, plannedMinutes: 30, sourceOrigin: 'manual', required: true },
              { titulo: 'Etapa 3', orderIndex: 3, plannedMinutes: 30, sourceOrigin: 'manual', required: true },
            ],
          },
        ],
      },
    ],
  }
}

describe.skipIf(!hasDb)('listItemsForWorkPlanWeeklyView (integração)', () => {
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    const hash = await hashPassword('CollabGovTest1!')
    await pool.query(
      `INSERT INTO app_users (
          id, email, password_hash, is_active, role_id, must_change_password, password_changed_at
        ) VALUES ($1::uuid, $2, $3, true, $4::uuid, false, now())
        ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id, is_active = true, email = EXCLUDED.email`,
      [GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL, hash, ADMIN_ROLE_ID],
    )
    await pool.query(
      `INSERT INTO collaborators (id, full_name, status, is_active)
       VALUES ('3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c', 'Maria Silva', 'ACTIVE', true)
       ON CONFLICT (id) DO UPDATE SET deleted_at = NULL, is_active = true, status = 'ACTIVE'`,
    )
  })

  afterAll(async () => {
    await closePool()
  })

  it('traz somente itens do plano (sem esteira/tarefa/setor), exclui soft-deleted, sem N+1', async () => {
    const label = `WeeklyViewRepo ${randomUUID().slice(0, 8)}`
    const created = await serviceCreateConveyor(pool, conveyorBodyWithSteps(label))
    const conveyorId = created.id
    const anaId = randomUUID()
    const planId = randomUUID()
    const weekStart = mondayOfWeekContaining('2032-04-05')
    const weekEnd = fridayAfterMonday(weekStart)

    try {
      const stepsRes = await pool.query<{ id: string }>(
        `SELECT id::text FROM conveyor_nodes
         WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
         ORDER BY order_index`,
        [conveyorId],
      )
      const [step1, step2, step3] = stepsRes.rows.map((r) => r.id)

      await pool.query(
        `INSERT INTO collaborators (id, full_name, status, is_active) VALUES ($1::uuid, $2, 'ACTIVE', true)`,
        [anaId, `Ana WeeklyView ${anaId.slice(0, 6)}`],
      )

      await pool.query(
        `INSERT INTO operational_work_plans (id, week_start_date, week_end_date, status, created_by)
         VALUES ($1::uuid, $2::date, $3::date, 'DRAFT', $4::uuid)`,
        [planId, weekStart, weekEnd, GOV_ADMIN_USER_ID],
      )

      async function insertItem(args: {
        stepId: string
        collaboratorId: string
        date: string
        order: number
        minutes: number
        notes?: string | null
        deleted?: boolean
      }) {
        const id = randomUUID()
        await pool.query(
          `INSERT INTO operational_work_plan_items (
             id, work_plan_id, conveyor_id, activity_node_id, assigned_collaborator_id,
             planned_date, planned_order, planned_minutes, status, notes, deleted_at
           ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::date, $7, $8, 'PLANNED', $9, $10)`,
          [
            id,
            planId,
            conveyorId,
            args.stepId,
            args.collaboratorId,
            args.date,
            args.order,
            args.minutes,
            args.notes ?? null,
            args.deleted ? new Date() : null,
          ],
        )
        return id
      }

      await insertItem({ stepId: step1, collaboratorId: anaId, date: weekStart, order: 0, minutes: 60, notes: 'Nota' })
      await insertItem({ stepId: step2, collaboratorId: MARIA_COLLABORATOR_ID, date: weekEnd, order: 0, minutes: 45 })
      await insertItem({ stepId: step3, collaboratorId: anaId, date: weekStart, order: 1, minutes: 30, deleted: true })

      const beforeQueryCount = 0
      void beforeQueryCount

      const rows = await listItemsForWorkPlanWeeklyView(pool, planId)

      expect(rows.length).toBe(2)
      const anaRow = rows.find((r) => r.assigned_collaborator_id === anaId)
      expect(anaRow).toBeTruthy()
      expect(anaRow?.activity_title).toBeTruthy()
      expect(anaRow?.notes).toBe('Nota')
      expect(anaRow?.conveyor_title).toBeTruthy()
      expect(typeof anaRow?.conveyor_title).toBe('string')
      expect(anaRow).toHaveProperty('realized_minutes')
      expect(typeof anaRow?.realized_minutes).toBe('number')
      expect(anaRow?.realized_minutes).toBe(0)

      const mariaRow = rows.find((r) => r.assigned_collaborator_id === MARIA_COLLABORATOR_ID)
      expect(mariaRow?.assigned_collaborator_name).toBe('Maria Silva')
    } finally {
      await pool.query(`DELETE FROM operational_work_plan_items WHERE work_plan_id = $1::uuid`, [planId])
      await pool.query(`DELETE FROM operational_work_plans WHERE id = $1::uuid`, [planId])
      await pool.query(`DELETE FROM conveyor_node_assignees WHERE conveyor_id = $1::uuid`, [conveyorId])
      await pool.query(`DELETE FROM conveyor_nodes WHERE conveyor_id = $1::uuid`, [conveyorId])
      await pool.query(`DELETE FROM conveyors WHERE id = $1::uuid`, [conveyorId])
      await pool.query(`DELETE FROM collaborators WHERE id = $1::uuid`, [anaId])
    }
  })

  it('soma realized_minutes do STEP, ignora deleted_at e não multiplica linhas do plano', async () => {
    const label = `WeeklyViewRealized ${randomUUID().slice(0, 8)}`
    const created = await serviceCreateConveyor(pool, conveyorBodyWithSteps(label))
    const conveyorId = created.id
    const planId = randomUUID()
    const weekStart = mondayOfWeekContaining('2032-05-03')
    const weekEnd = fridayAfterMonday(weekStart)
    const entryIds: string[] = []

    try {
      const stepsRes = await pool.query<{ id: string }>(
        `SELECT id::text FROM conveyor_nodes
         WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
         ORDER BY order_index`,
        [conveyorId],
      )
      const [step1, step2] = stepsRes.rows.map((r) => r.id)

      await pool.query(
        `INSERT INTO operational_work_plans (id, week_start_date, week_end_date, status, created_by)
         VALUES ($1::uuid, $2::date, $3::date, 'DRAFT', $4::uuid)`,
        [planId, weekStart, weekEnd, GOV_ADMIN_USER_ID],
      )

      const itemId = randomUUID()
      await pool.query(
        `INSERT INTO operational_work_plan_items (
           id, work_plan_id, conveyor_id, activity_node_id, assigned_collaborator_id,
           planned_date, planned_order, planned_minutes, status, notes, deleted_at
         ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::date, 0, 60, 'PLANNED', NULL, NULL)`,
        [itemId, planId, conveyorId, step1, MARIA_COLLABORATOR_ID, weekStart],
      )

      const e1 = randomUUID()
      const e2 = randomUUID()
      const eDeleted = randomUUID()
      const eOtherStep = randomUUID()
      entryIds.push(e1, e2, eDeleted, eOtherStep)

      await pool.query(
        `INSERT INTO conveyor_time_entries (
           id, conveyor_id, conveyor_node_id, collaborator_id, entry_at, minutes, entry_mode, deleted_at
         ) VALUES
           ($1::uuid, $5::uuid, $6::uuid, $7::uuid, now(), 30, 'manual', NULL),
           ($2::uuid, $5::uuid, $6::uuid, $7::uuid, now(), 45, 'manual', NULL),
           ($3::uuid, $5::uuid, $6::uuid, $7::uuid, now(), 99, 'manual', now()),
           ($4::uuid, $5::uuid, $8::uuid, $7::uuid, now(), 20, 'manual', NULL)`,
        [e1, e2, eDeleted, eOtherStep, conveyorId, step1, MARIA_COLLABORATOR_ID, step2],
      )

      const rows = await listItemsForWorkPlanWeeklyView(pool, planId)
      expect(rows).toHaveLength(1)
      expect(rows[0]?.realized_minutes).toBe(75)
    } finally {
      if (entryIds.length) {
        await pool.query(`DELETE FROM conveyor_time_entries WHERE id = ANY($1::uuid[])`, [entryIds])
      }
      await pool.query(`DELETE FROM operational_work_plan_items WHERE work_plan_id = $1::uuid`, [planId])
      await pool.query(`DELETE FROM operational_work_plans WHERE id = $1::uuid`, [planId])
      await pool.query(`DELETE FROM conveyor_node_assignees WHERE conveyor_id = $1::uuid`, [conveyorId])
      await pool.query(`DELETE FROM conveyor_nodes WHERE conveyor_id = $1::uuid`, [conveyorId])
      await pool.query(`DELETE FROM conveyors WHERE id = $1::uuid`, [conveyorId])
    }
  })
})
