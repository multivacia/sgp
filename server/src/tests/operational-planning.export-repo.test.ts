import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPool, closePool } from '../plugins/db.js'
import { hasDatabaseConnectionInEnv, loadDotenvFiles, loadEnv } from '../config/env.js'
import { hashPassword } from '../shared/password/password.js'
import { serviceCreateConveyor } from '../modules/conveyors/conveyors.service.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'
import { listEnrichedItemsForWorkPlanExport } from '../modules/operational-planning/operational-planning.repository.js'
import { mondayOfWeekContaining, fridayAfterMonday } from '../modules/operational-planning/operational-planning.week.js'

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
        titulo: 'Tarefa Export',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'Setor Export',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: [
              { titulo: 'Etapa 1', orderIndex: 1, plannedMinutes: 30, sourceOrigin: 'manual', required: true },
              { titulo: 'Etapa 2', orderIndex: 2, plannedMinutes: 30, sourceOrigin: 'manual', required: true },
              { titulo: 'Etapa 3', orderIndex: 3, plannedMinutes: 30, sourceOrigin: 'manual', required: true },
              { titulo: 'Etapa 4', orderIndex: 4, plannedMinutes: 30, sourceOrigin: 'manual', required: true },
            ],
          },
        ],
      },
    ],
  }
}

describe.skipIf(!hasDb)('listEnrichedItemsForWorkPlanExport (integração)', () => {
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

  it('ordena por data → colaborador → plannedOrder, exclui item soft-deleted e resolve metadados da esteira/equipe', async () => {
    const label = `Export ${randomUUID().slice(0, 8)}`
    const created = await serviceCreateConveyor(pool, conveyorBodyWithSteps(label))
    const conveyorId = created.id
    // IDs únicos gerados antes do try: cleanup no finally é seguro/idempotente mesmo se o
    // INSERT correspondente nunca chegar a rodar (assert/erro antes disso).
    const anaId = randomUUID()
    const zecaId = randomUUID()
    const teamId = randomUUID()
    const planId = randomUUID()
    // Semana bem distante e exclusiva deste teste — evita colisão com outras execuções.
    const weekStart = mondayOfWeekContaining('2031-03-10')
    const weekEnd = fridayAfterMonday(weekStart)

    try {
      await pool.query(
        `UPDATE conveyors
         SET code = $2, client_name = $3, vehicle = $4, plate = $5, estimated_deadline = $6::date
         WHERE id = $1::uuid`,
        [conveyorId, 'OS-EXPORT-1', 'Cliente Export', 'Fusca 1979', 'EXP1234', '2026-09-20'],
      )

      const stepsRes = await pool.query<{ id: string; name: string }>(
        `SELECT id::text, name FROM conveyor_nodes
         WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
         ORDER BY order_index`,
        [conveyorId],
      )
      const steps = stepsRes.rows
      expect(steps.length).toBe(4)
      const [step1, step2, step3, step4] = steps.map((s) => s.id)

      await pool.query(
        `INSERT INTO collaborators (id, full_name, status, is_active) VALUES ($1::uuid, $2, 'ACTIVE', true)`,
        [anaId, `Ana Export ${anaId.slice(0, 6)}`],
      )
      await pool.query(
        `INSERT INTO collaborators (id, full_name, status, is_active) VALUES ($1::uuid, $2, 'ACTIVE', true)`,
        [zecaId, `Zeca Export ${zecaId.slice(0, 6)}`],
      )
      const teamName = `Team Export ${teamId.slice(0, 6)}`
      await pool.query(`INSERT INTO teams (id, name, is_active) VALUES ($1::uuid, $2, true)`, [
        teamId,
        teamName,
      ])

      const laterDate = weekEnd
      const earlierDate = weekStart

      await pool.query(
        `INSERT INTO operational_work_plans (id, week_start_date, week_end_date, status, created_by)
         VALUES ($1::uuid, $2::date, $3::date, 'DRAFT', $4::uuid)`,
        [planId, weekStart, weekEnd, GOV_ADMIN_USER_ID],
      )

      async function insertItem(args: {
        stepId: string
        collaboratorId: string
        teamId?: string | null
        date: string
        order: number
        minutes: number
        deleted?: boolean
      }) {
        const id = randomUUID()
        await pool.query(
          `INSERT INTO operational_work_plan_items (
             id, work_plan_id, conveyor_id, activity_node_id, assigned_collaborator_id,
             assigned_team_id, planned_date, planned_order, planned_minutes, status, deleted_at
           ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::uuid, $7::date, $8, $9, 'PLANNED', $10)`,
          [
            id,
            planId,
            conveyorId,
            args.stepId,
            args.collaboratorId,
            args.teamId ?? null,
            args.date,
            args.order,
            args.minutes,
            args.deleted ? new Date() : null,
          ],
        )
        return id
      }

      // item1: Maria, data posterior (última) — deve aparecer por último.
      await insertItem({
        stepId: step1,
        collaboratorId: MARIA_COLLABORATOR_ID,
        date: laterDate,
        order: 0,
        minutes: 90,
      })
      // item2: Ana + equipe, data mais cedo, ordem 0 — deve ser o primeiro.
      await insertItem({
        stepId: step2,
        collaboratorId: anaId,
        teamId,
        date: earlierDate,
        order: 0,
        minutes: 60,
      })
      // item4: Zeca, mesma data mais cedo, ordem 1 — deve vir depois de Ana no mesmo dia.
      await insertItem({
        stepId: step4,
        collaboratorId: zecaId,
        date: earlierDate,
        order: 1,
        minutes: 45,
      })
      // item3: soft-deleted — NÃO deve aparecer.
      await insertItem({
        stepId: step3,
        collaboratorId: MARIA_COLLABORATOR_ID,
        date: earlierDate,
        order: 2,
        minutes: 30,
        deleted: true,
      })

      const rows = await listEnrichedItemsForWorkPlanExport(pool, planId)

      expect(rows.length).toBe(3)
      expect(rows.map((r) => r.activity_node_id)).toEqual([step2, step4, step1])
      expect(rows.map((r) => r.assigned_collaborator_name)).toEqual([
        expect.stringContaining('Ana Export'),
        expect.stringContaining('Zeca Export'),
        'Maria Silva',
      ])

      const anaRow = rows[0]!
      expect(anaRow.conveyor_code).toBe('OS-EXPORT-1')
      expect(anaRow.conveyor_client_name).toBe('Cliente Export')
      expect(anaRow.conveyor_vehicle).toBe('Fusca 1979')
      expect(anaRow.conveyor_plate).toBe('EXP1234')
      expect(anaRow.conveyor_estimated_deadline).toBe('2026-09-20')
      expect(anaRow.assigned_team_name).toBe(teamName)
      expect(anaRow).not.toHaveProperty('realized_minutes')

      const zecaRow = rows[1]!
      expect(zecaRow.assigned_team_name).toBeNull()
    } finally {
      // Limpeza garantida mesmo se alguma asserção falhar acima. Todos os IDs foram gerados
      // por este teste (randomUUID acima) — seguro remover mesmo que o INSERT correspondente
      // nunca tenha rodado.
      await pool.query(`DELETE FROM operational_work_plan_items WHERE work_plan_id = $1::uuid`, [
        planId,
      ])
      await pool.query(`DELETE FROM operational_work_plans WHERE id = $1::uuid`, [planId])
      await pool.query(`DELETE FROM conveyor_node_assignees WHERE conveyor_id = $1::uuid`, [
        conveyorId,
      ])
      await pool.query(`DELETE FROM conveyor_nodes WHERE conveyor_id = $1::uuid`, [conveyorId])
      await pool.query(`DELETE FROM conveyors WHERE id = $1::uuid`, [conveyorId])
      await pool.query(`DELETE FROM teams WHERE id = $1::uuid`, [teamId])
      await pool.query(`DELETE FROM collaborators WHERE id = ANY($1::uuid[])`, [[anaId, zecaId]])
    }
  })
})
