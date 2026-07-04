import { randomUUID } from 'node:crypto'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { createLogger } from '../plugins/logger.js'
import { closePool, getPool } from '../plugins/db.js'
import {
  hasDatabaseConnectionInEnv,
  loadDotenvFiles,
  loadEnv,
} from '../config/env.js'
import { hashPassword } from '../shared/password/password.js'
import { sessionCookieForUser } from './sessionTestCookie.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const GOV_ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const GOV_ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'

function minimalValidBody() {
  return {
    dados: {
      nome: `Esteira patch ${randomUUID().slice(0, 8)}`,
      cliente: 'Cliente X',
      veiculo: 'V1',
      modeloVersao: '',
      placa: '',
      observacoes: '',
      responsavel: '',
      prazoEstimado: '',
      prioridade: 'media' as const,
      colaboradorId: null,
    },
    originType: 'MANUAL' as const,
    baseId: null,
    baseCode: null,
    baseName: null,
    baseVersion: null,
    options: [
      {
        titulo: 'Opção A',
        orderIndex: 1,
        sourceOrigin: 'manual' as const,
        areas: [
          {
            titulo: 'Área 1',
            orderIndex: 1,
            sourceOrigin: 'manual' as const,
            steps: [
              {
                titulo: 'Etapa 1',
                orderIndex: 1,
                plannedMinutes: 30,
                sourceOrigin: 'manual' as const,
                required: true,
              },
            ],
          },
        ],
      },
    ],
  }
}

describe.skipIf(!hasDb)('conveyors PATCH structure/dados (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    const hash = await hashPassword('CollabGovTest1!')
    await pool.query(
      `INSERT INTO app_users (
          id, email, password_hash, is_active, role_id, must_change_password, password_changed_at
        ) VALUES (
          $1::uuid, $2, $3, true, $4::uuid, false, now()
        )
        ON CONFLICT (id) DO UPDATE SET
          role_id = EXCLUDED.role_id,
          is_active = true,
          email = EXCLUDED.email`,
      [GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL, hash, ADMIN_ROLE_ID],
    )
  })

  afterAll(async () => {
    await closePool()
  })

  async function createConveyor() {
    const body = minimalValidBody()
    const post = await request(app)
      .post('/api/v1/conveyors')
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
      .send(body)
    expect(post.status).toBe(201)
    return { cid: post.body.data.id as string, body }
  }

  it('PATCH /api/v1/conveyors/:id atualiza dados cadastrais', async () => {
    const { cid } = await createConveyor()
    const res = await request(app)
      .patch(`/api/v1/conveyors/${cid}`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
      .send({ nome: 'Nome atualizado' })
    if (res.status !== 200) {
      console.error('PATCH dados failed:', res.status, JSON.stringify(res.body, null, 2))
    }
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Nome atualizado')
    expect(res.body.error?.errorRef).not.toBe('SGP-API-HANDLER-001')
  })

  it('PATCH /api/v1/conveyors/:id/structure substitui estrutura em EM_ELABORACAO', async () => {
    const { cid } = await createConveyor()
    const res = await request(app)
      .patch(`/api/v1/conveyors/${cid}/structure`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
      .send({
        originType: 'MANUAL',
        baseId: null,
        baseCode: null,
        baseName: null,
        baseVersion: null,
        matrixRootItemId: null,
        options: [
          {
            titulo: 'Opção A',
            orderIndex: 1,
            sourceOrigin: 'manual',
            areas: [
              {
                titulo: 'Área 1',
                orderIndex: 1,
                sourceOrigin: 'manual',
                steps: [
                  {
                    titulo: 'Etapa renomeada',
                    orderIndex: 1,
                    plannedMinutes: 45,
                    plannedQuantity: 1,
                    sourceOrigin: 'manual',
                    required: true,
                    assignees: [],
                  },
                ],
              },
            ],
          },
        ],
      })
    if (res.status !== 200) {
      console.error('PATCH structure failed:', res.status, JSON.stringify(res.body, null, 2))
    }
    expect(res.status).toBe(200)
    expect(res.body.data.structure.options[0].areas[0].steps[0].name).toBe('Etapa renomeada')
    expect(res.body.data.totalPlannedMinutes).toBe(45)
    expect(res.body.error?.errorRef).not.toBe('SGP-API-HANDLER-001')
  })

  it('POST e PATCH dados ignoram tempo manual nas observações', async () => {
    const body = minimalValidBody()
    body.dados.observacoes =
      'Contexto\n\n[Planeamento] Tempo total previsto: 9999 min'
    const post = await request(app)
      .post('/api/v1/conveyors')
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
      .send(body)
    expect(post.status).toBe(201)
    expect(post.body.data.totals.totalPlannedMinutes).toBe(30)

    const cid = post.body.data.id as string
    const get1 = await request(app)
      .get(`/api/v1/conveyors/${cid}`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
    expect(get1.body.data.totalPlannedMinutes).toBe(30)
    expect(get1.body.data.initialNotes).toBe('Contexto')

    const patch = await request(app)
      .patch(`/api/v1/conveyors/${cid}`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
      .send({
        observacoes: 'Atualizado\n\n[Planeamento] Tempo total previsto: 5000 min',
      })
    expect(patch.status).toBe(200)
    expect(patch.body.data.totalPlannedMinutes).toBe(30)
    expect(patch.body.data.initialNotes).toBe('Atualizado')
  })

  it('PATCH dados com plano operacional vinculado continua permitido', async () => {
    const { cid } = await createConveyor()
    const det = await request(app)
      .get(`/api/v1/conveyors/${cid}`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
    const stepId = det.body.data.structure.options[0].areas[0].steps[0].id as string

    await pool.query(
      `UPDATE conveyors SET operational_status = 'AGUARDANDO_PLANEJAMENTO' WHERE id = $1::uuid`,
      [cid],
    )
    const planId = randomUUID()
    await pool.query(
      `INSERT INTO conveyor_operational_plans (
        id, conveyor_id, status, version, factory_planning_status, created_at, updated_at
      ) VALUES ($1::uuid, $2::uuid, 'DRAFT', 1, 'NOT_SCHEDULED', now(), now())`,
      [planId, cid],
    )
    await pool.query(
      `INSERT INTO conveyor_operational_plan_items (
        id, plan_id, conveyor_id, activity_node_id, planned_date, planned_order,
        planned_minutes, status, source_kind, created_at, updated_at
      ) VALUES (
        $1::uuid, $2::uuid, $3::uuid, $4::uuid, CURRENT_DATE, 0,
        30, 'PLANNED', 'MANUAL', now(), now()
      )`,
      [randomUUID(), planId, cid, stepId],
    )

    const res = await request(app)
      .patch(`/api/v1/conveyors/${cid}`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
      .send({ nome: 'Só dados atualizados' })
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Só dados atualizados')
    expect(res.body.error?.errorRef).not.toBe('SGP-API-HANDLER-001')
  })

  it('PATCH structure com plano operacional vinculado retorna erro de domínio (não 500)', async () => {
    const { cid, body } = await createConveyor()
    const det = await request(app)
      .get(`/api/v1/conveyors/${cid}`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
    const stepId = det.body.data.structure.options[0].areas[0].steps[0].id as string

    await pool.query(
      `UPDATE conveyors SET operational_status = 'AGUARDANDO_PLANEJAMENTO' WHERE id = $1::uuid`,
      [cid],
    )

    const planId = randomUUID()
    await pool.query(
      `INSERT INTO conveyor_operational_plans (
        id, conveyor_id, status, version, factory_planning_status, created_at, updated_at
      ) VALUES ($1::uuid, $2::uuid, 'DRAFT', 1, 'NOT_SCHEDULED', now(), now())`,
      [planId, cid],
    )
    await pool.query(
      `INSERT INTO conveyor_operational_plan_items (
        id, plan_id, conveyor_id, activity_node_id, planned_date, planned_order,
        planned_minutes, status, source_kind, created_at, updated_at
      ) VALUES (
        $1::uuid, $2::uuid, $3::uuid, $4::uuid, CURRENT_DATE, 0,
        30, 'PLANNED', 'MANUAL', now(), now()
      )`,
      [randomUUID(), planId, cid, stepId],
    )

    const res = await request(app)
      .patch(`/api/v1/conveyors/${cid}/structure`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
      .send({
        originType: body.originType,
        options: body.options,
      })
    expect(res.status).toBe(409)
    expect(res.body.error?.code).toBe('CONVEYOR_STRUCTURE_REPLACE_HAS_DEPENDENCIES')
    expect(res.body.error?.errorRef).not.toBe('SGP-API-HANDLER-001')
    expect(res.body.error?.message).toContain('planejamento')
  })

  it('PATCH structure com plannedQuantity inválida retorna 422 específico', async () => {
    const { cid } = await createConveyor()
    const res = await request(app)
      .patch(`/api/v1/conveyors/${cid}/structure`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
      .send({
        originType: 'MANUAL',
        options: [
          {
            titulo: 'Opção A',
            orderIndex: 1,
            sourceOrigin: 'manual',
            areas: [
              {
                titulo: 'Área 1',
                orderIndex: 1,
                sourceOrigin: 'manual',
                steps: [
                  {
                    titulo: 'Etapa 1',
                    orderIndex: 1,
                    plannedMinutes: 30,
                    plannedQuantity: 0,
                    sourceOrigin: 'manual',
                  },
                ],
              },
            ],
          },
        ],
      })
    expect(res.status).toBe(422)
    expect(res.body.error?.errorRef).not.toBe('SGP-API-HANDLER-001')
    expect(res.body.error?.code).toBe('VALIDATION_ERROR')
  })
})
