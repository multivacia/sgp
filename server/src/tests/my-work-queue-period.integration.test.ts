import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { createLogger } from '../plugins/logger.js'
import { closePool, getPool } from '../plugins/db.js'
import { hasDatabaseConnectionInEnv, loadDotenvFiles, loadEnv } from '../config/env.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import { linkAppUserToCollaborator } from './integrationSeedFixtures.js'
import { serviceCreateConveyor } from '../modules/conveyors/conveyors.service.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'
import {
  fridayAfterMonday,
  mondayOfWeekContaining,
} from '../modules/operational-planning/operational-planning.week.js'
import {
  servicePublishOperationalWeekPlan,
  serviceSaveOperationalWeekPlan,
} from '../modules/operational-planning/operational-planning.service.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const SEED_ROLE_ID = '22222222-2222-2222-2222-222222222222'
const SEED_SECTOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const PQ_COLLAB_ID = 'aaaaaaaa-bbbb-cccc-dddd-0000000000a1'
const PQ_USER_ID = 'aaaaaaaa-bbbb-cccc-dddd-0000000000a2'
const PQ_USER_EMAIL = 'wq-period-test@sgp-argos.local'

/** Semanas distantes para não colidir com outros testes (2031). */
const DAY_W1 = '2031-03-04'
const DAY_W2 = '2031-03-12'
const DAY_W3 = '2031-03-19'

function conveyorBody(nome: string): PostConveyorBody {
  return {
    dados: {
      nome,
      cliente: 'C-PQ',
      veiculo: 'V-PQ',
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
        titulo: 'Opção PQ',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'Área PQ',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: [
              { titulo: 'PQ Semana 1', orderIndex: 1, plannedMinutes: 30, sourceOrigin: 'manual', required: true },
              { titulo: 'PQ Semana 2', orderIndex: 2, plannedMinutes: 20, sourceOrigin: 'manual', required: true },
              { titulo: 'PQ Semana 3', orderIndex: 3, plannedMinutes: 10, sourceOrigin: 'manual', required: true },
            ],
          },
        ],
      },
    ],
  }
}

describe.skipIf(!hasDb)('GET /api/v1/me/work-queue — pesquisa por período (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let cookie: string

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    await pool.query(
      `
      INSERT INTO collaborators (id, code, full_name, email, sector_id, role_id, status, is_active)
      VALUES ($1::uuid, 'COL-PQ-TEST', 'Colaborador Período Teste', 'pq-test@sgp.local',
              $2::uuid, $3::uuid, 'ACTIVE', true)
      ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE', is_active = true, deleted_at = NULL
      `,
      [PQ_COLLAB_ID, SEED_SECTOR_ID, SEED_ROLE_ID],
    )
    const { hashPassword } = await import('../shared/password/password.js')
    await pool.query(
      `
      INSERT INTO app_users (id, email, password_hash, is_active, role_id, must_change_password, password_changed_at)
      VALUES ($1::uuid, $2, $3, true, $4::uuid, false, now())
      ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, is_active = true
      `,
      [PQ_USER_ID, PQ_USER_EMAIL, await hashPassword('PeriodoPQ1!'), SEED_ROLE_ID],
    )
    await linkAppUserToCollaborator(pool, PQ_USER_ID, PQ_COLLAB_ID)
    cookie = await sessionCookieForUser(pool, PQ_USER_ID, PQ_USER_EMAIL)

    const conv = await serviceCreateConveyor(pool, conveyorBody(`PQ-${Date.now()}`))
    const steps = await pool.query<{ id: string }>(
      `SELECT id::text FROM conveyor_nodes
       WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
       ORDER BY order_index`,
      [conv.id],
    )
    const days = [DAY_W1, DAY_W2, DAY_W3]
    for (let i = 0; i < days.length; i++) {
      const plannedDate = days[i]!
      const weekStart = mondayOfWeekContaining(plannedDate)
      await pool.query(
        `UPDATE operational_work_plans SET deleted_at = now()
         WHERE week_start_date = $1::date AND deleted_at IS NULL`,
        [weekStart],
      )
      const saved = await serviceSaveOperationalWeekPlan(pool, PQ_USER_ID, {
        weekStartDate: weekStart,
        weekEndDate: fridayAfterMonday(weekStart),
        items: [
          {
            conveyorId: conv.id,
            activityNodeId: steps.rows[i]!.id,
            assignedCollaboratorId: PQ_COLLAB_ID,
            assignedTeamId: null,
            plannedDate,
            plannedOrder: 0,
            plannedMinutes: [30, 20, 10][i]!,
            notes: null,
            conveyorOperationalPlanItemId: null,
          },
        ],
      })
      if (!saved.plan?.id) throw new Error('plano não criado')
      await servicePublishOperationalWeekPlan(pool, saved.plan.id, PQ_USER_ID)
    }
  })

  afterAll(async () => {
    await closePool()
  })

  type QueueBody = {
    data: {
      period: { from: string; to: string } | null
      summary: { plannedItemsToday: number; plannedMinutesToday: number; overload: boolean }
      items: Array<{ activityTitle: string; plannedDate: string }>
    }
  }

  it('sem from/to mantém o modo diário (period null)', async () => {
    const res = await request(app).get(`/api/v1/me/work-queue?date=${DAY_W2}`).set('Cookie', cookie)
    expect(res.status).toBe(200)
    const body = res.body as QueueBody
    expect(body.data.period).toBeNull()
    expect(body.data.items.map((i) => i.activityTitle)).toContain('PQ Semana 2')
    expect(body.data.items.map((i) => i.activityTitle)).not.toContain('PQ Semana 3')
  })

  it('período atravessa planos publicados de semanas diferentes (inclusivo)', async () => {
    const res = await request(app)
      .get(`/api/v1/me/work-queue?from=${DAY_W1}&to=${DAY_W2}`)
      .set('Cookie', cookie)
    expect(res.status).toBe(200)
    const body = res.body as QueueBody
    expect(body.data.period).toEqual({ from: DAY_W1, to: DAY_W2 })
    const titles = body.data.items.map((i) => i.activityTitle).sort()
    expect(titles).toEqual(['PQ Semana 1', 'PQ Semana 2'])
    expect(body.data.summary.plannedItemsToday).toBe(2)
    expect(body.data.summary.plannedMinutesToday).toBe(50)
    expect(body.data.summary.overload).toBe(false)
  })

  it('apenas data inicial: considera do início em diante (janela máxima)', async () => {
    const res = await request(app).get(`/api/v1/me/work-queue?from=${DAY_W2}`).set('Cookie', cookie)
    expect(res.status).toBe(200)
    const body = res.body as QueueBody
    expect(body.data.period?.from).toBe(DAY_W2)
    expect(body.data.items.map((i) => i.activityTitle).sort()).toEqual(['PQ Semana 2', 'PQ Semana 3'])
  })

  it('apenas data final: considera até o fim', async () => {
    const res = await request(app).get(`/api/v1/me/work-queue?to=${DAY_W1}`).set('Cookie', cookie)
    expect(res.status).toBe(200)
    const body = res.body as QueueBody
    expect(body.data.period?.to).toBe(DAY_W1)
    expect(body.data.items.map((i) => i.activityTitle)).toEqual(['PQ Semana 1'])
  })

  it('início > fim → 400', async () => {
    const res = await request(app)
      .get(`/api/v1/me/work-queue?from=${DAY_W3}&to=${DAY_W1}`)
      .set('Cookie', cookie)
    expect(res.status).toBe(400)
  })

  it('período acima de 92 dias → 400', async () => {
    const res = await request(app)
      .get('/api/v1/me/work-queue?from=2031-01-01&to=2031-06-30')
      .set('Cookie', cookie)
    expect(res.status).toBe(400)
  })
})
