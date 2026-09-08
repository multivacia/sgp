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

  it('PATCH dados em EM_ELABORACAO ok sem reason; EM_ANDAMENTO 422 sem e OK com reason+MANUAL_NOTE', async () => {
    const { cid } = await createConveyor()
    const okElab = await request(app)
      .patch(`/api/v1/conveyors/${cid}`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
      .send({ nome: 'Ainda no backlog' })
    expect(okElab.status).toBe(200)

    await pool.query(
      `UPDATE conveyors SET operational_status = 'EM_ANDAMENTO' WHERE id = $1::uuid`,
      [cid],
    )

    const denied = await request(app)
      .patch(`/api/v1/conveyors/${cid}`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
      .send({ nome: 'Sem motivo' })
    expect(denied.status).toBe(422)
    expect(denied.body.error?.code).toBe('VALIDATION_ERROR')

    const userReason = 'Correção de nome solicitada pelo cliente'
    const ok = await request(app)
      .patch(`/api/v1/conveyors/${cid}`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
      .send({ nome: 'Com motivo', reason: userReason })
    expect(ok.status).toBe(200)
    expect(ok.body.data.name).toBe('Com motivo')

    const ev = await pool.query<{
      event_type: string
      reason: string | null
      metadata_json: {
        kind?: string
        section?: string
        changedFields?: string[]
        reason?: string
      } | null
    }>(
      `SELECT event_type, reason, metadata_json FROM conveyor_operational_events
       WHERE conveyor_id = $1::uuid AND event_type = 'MANUAL_NOTE'
       ORDER BY created_at DESC LIMIT 1`,
      [cid],
    )
    expect(ev.rows[0]?.reason).toBe('CONVEYOR_EDIT')
    expect(ev.rows[0]?.metadata_json?.kind).toBe('CONVEYOR_EDIT')
    expect(ev.rows[0]?.metadata_json?.section).toBe('DATA')
    expect(ev.rows[0]?.metadata_json?.changedFields).toContain('nome')
    expect(ev.rows[0]?.metadata_json?.reason).toBe(userReason)
  })

  it('PATCH structure em EM_ANDAMENTO sem reason retorna 422', async () => {
    const { cid } = await createConveyor()
    const det = await request(app)
      .get(`/api/v1/conveyors/${cid}`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
    const optionId = det.body.data.structure.options[0].id as string
    const areaId = det.body.data.structure.options[0].areas[0].id as string
    const stepId = det.body.data.structure.options[0].areas[0].steps[0].id as string

    await pool.query(
      `UPDATE conveyors SET operational_status = 'EM_ANDAMENTO' WHERE id = $1::uuid`,
      [cid],
    )

    const res = await request(app)
      .patch(`/api/v1/conveyors/${cid}/structure`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
      .send({
        originType: 'MANUAL',
        options: [
          {
            id: optionId,
            titulo: 'Opção A',
            orderIndex: 1,
            sourceOrigin: 'manual',
            areas: [
              {
                id: areaId,
                titulo: 'Área 1',
                orderIndex: 1,
                sourceOrigin: 'manual',
                steps: [
                  {
                    id: stepId,
                    titulo: 'Etapa sem motivo',
                    orderIndex: 1,
                    plannedMinutes: 30,
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
    expect(res.status).toBe(422)
    expect(res.body.error?.code).toBe('VALIDATION_ERROR')
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
      .send({
        nome: 'Só dados atualizados',
        reason: 'Atualização cadastral com plano operacional vinculado',
      })
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Só dados atualizados')
    expect(res.body.error?.errorRef).not.toBe('SGP-API-HANDLER-001')
  })

  it('PATCH structure com plano operacional vinculado soft-desativa STEP com deps (não 409)', async () => {
    const { cid, body } = await createConveyor()
    const det = await request(app)
      .get(`/api/v1/conveyors/${cid}`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
    const stepId = det.body.data.structure.options[0].areas[0].steps[0].id as string
    const optionId = det.body.data.structure.options[0].id as string

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

    // Payload sem ids → remoção híbrida do STEP com plano (soft) + insert novo
    const res = await request(app)
      .patch(`/api/v1/conveyors/${cid}/structure`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
      .send({
        originType: body.originType,
        options: body.options,
        reason: 'Reestruturação com plano operacional vinculado',
      })
    expect(res.status).toBe(200)
    expect(res.body.error?.errorRef).not.toBe('SGP-API-HANDLER-001')

    const oldStep = await pool.query<{ is_active: boolean }>(
      `SELECT is_active FROM conveyor_nodes WHERE id = $1::uuid`,
      [stepId],
    )
    expect(oldStep.rows[0]?.is_active).toBe(false)

    // Detalhe não expõe nó inativo
    const activeOptionIds = (res.body.data.structure.options as Array<{ id: string }>).map(
      (o) => o.id,
    )
    expect(activeOptionIds).not.toContain(optionId)
    expect(
      res.body.data.structure.options[0].areas[0].steps.some(
        (s: { id: string }) => s.id === stepId,
      ),
    ).toBe(false)
  })

  it('PATCH structure com ids preserva STEP e emite CONVEYOR_STRUCTURE_UPDATED', async () => {
    const { cid } = await createConveyor()
    const det = await request(app)
      .get(`/api/v1/conveyors/${cid}`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
    const optionId = det.body.data.structure.options[0].id as string
    const areaId = det.body.data.structure.options[0].areas[0].id as string
    const stepId = det.body.data.structure.options[0].areas[0].steps[0].id as string

    const res = await request(app)
      .patch(`/api/v1/conveyors/${cid}/structure`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
      .send({
        originType: 'MANUAL',
        options: [
          {
            id: optionId,
            titulo: 'Opção A',
            orderIndex: 1,
            sourceOrigin: 'manual',
            areas: [
              {
                id: areaId,
                titulo: 'Área 1',
                orderIndex: 1,
                sourceOrigin: 'manual',
                steps: [
                  {
                    id: stepId,
                    titulo: 'Etapa preservada',
                    orderIndex: 1,
                    plannedMinutes: 40,
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
    expect(res.status).toBe(200)
    expect(res.body.data.structure.options[0].areas[0].steps[0].id).toBe(stepId)
    expect(res.body.data.structure.options[0].areas[0].steps[0].name).toBe(
      'Etapa preservada',
    )
    expect(res.body.data.totalPlannedMinutes).toBe(40)

    const ev = await pool.query<{ event_type: string }>(
      `SELECT event_type FROM conveyor_operational_events
       WHERE conveyor_id = $1::uuid AND event_type = 'CONVEYOR_STRUCTURE_UPDATED'
       ORDER BY created_at DESC LIMIT 1`,
      [cid],
    )
    expect(ev.rows[0]?.event_type).toBe('CONVEYOR_STRUCTURE_UPDATED')
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

  it('PATCH structure em EM_ANDAMENTO e FINALIZADA preserva IDs e status da esteira', async () => {
    for (const status of ['EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA'] as const) {
      const { cid } = await createConveyor()
      const det = await request(app)
        .get(`/api/v1/conveyors/${cid}`)
        .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
      const optionId = det.body.data.structure.options[0].id as string
      const areaId = det.body.data.structure.options[0].areas[0].id as string
      const stepId = det.body.data.structure.options[0].areas[0].steps[0].id as string

      await pool.query(
        `UPDATE conveyors SET operational_status = $2 WHERE id = $1::uuid`,
        [cid, status],
      )

      const res = await request(app)
        .patch(`/api/v1/conveyors/${cid}/structure`)
        .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
        .send({
          originType: 'MANUAL',
          reason: `Ajuste estrutural em status ${status}`,
          options: [
            {
              id: optionId,
              titulo: 'Opção A',
              orderIndex: 1,
              sourceOrigin: 'manual',
              areas: [
                {
                  id: areaId,
                  titulo: 'Área 1',
                  orderIndex: 1,
                  sourceOrigin: 'manual',
                  steps: [
                    {
                      id: stepId,
                      titulo: `Etapa ${status}`,
                      orderIndex: 1,
                      plannedMinutes: 55,
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
      expect(res.status).toBe(200)
      expect(res.body.data.operationalStatus).toBe(status)
      expect(res.body.data.structure.options[0].areas[0].steps[0].id).toBe(stepId)
      expect(res.body.data.structure.options[0].areas[0].steps[0].name).toBe(`Etapa ${status}`)

      const ev = await pool.query<{
        reason: string | null
        metadata_json: { reason?: string } | null
      }>(
        `SELECT reason, metadata_json FROM conveyor_operational_events
         WHERE conveyor_id = $1::uuid AND event_type = 'CONVEYOR_STRUCTURE_UPDATED'
         ORDER BY created_at DESC LIMIT 1`,
        [cid],
      )
      expect(ev.rows[0]?.reason).toBe('INCREMENTAL_STRUCTURE_EDIT')
      expect(ev.rows[0]?.metadata_json?.reason).toBe(`Ajuste estrutural em status ${status}`)
    }
  })

  it('PATCH structure com STEP novo em status avançado marca lateAddToWeeklyBacklog', async () => {
    const { cid } = await createConveyor()
    const det = await request(app)
      .get(`/api/v1/conveyors/${cid}`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
    const optionId = det.body.data.structure.options[0].id as string
    const areaId = det.body.data.structure.options[0].areas[0].id as string
    const stepId = det.body.data.structure.options[0].areas[0].steps[0].id as string

    await pool.query(
      `UPDATE conveyors SET operational_status = 'EM_ANDAMENTO' WHERE id = $1::uuid`,
      [cid],
    )

    const res = await request(app)
      .patch(`/api/v1/conveyors/${cid}/structure`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
      .send({
        originType: 'MANUAL',
        reason: 'Inclusão tardia via sync incremental',
        options: [
          {
            id: optionId,
            titulo: 'Opção A',
            orderIndex: 1,
            sourceOrigin: 'manual',
            areas: [
              {
                id: areaId,
                titulo: 'Área 1',
                orderIndex: 1,
                sourceOrigin: 'manual',
                steps: [
                  {
                    id: stepId,
                    titulo: 'Etapa 1',
                    orderIndex: 1,
                    plannedMinutes: 30,
                    sourceOrigin: 'manual',
                    required: true,
                    assignees: [],
                  },
                  {
                    titulo: 'Etapa tardia',
                    orderIndex: 2,
                    plannedMinutes: 15,
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
    expect(res.status).toBe(200)
    const newStepId = (
      res.body.data.structure.options[0].areas[0].steps as Array<{ id: string; name: string }>
    ).find((s) => s.name === 'Etapa tardia')?.id
    expect(newStepId).toBeTruthy()

    const meta = await pool.query<{ metadata_json: { lateAddToWeeklyBacklog?: boolean; lateAddReason?: string } }>(
      `SELECT metadata_json FROM conveyor_nodes WHERE id = $1::uuid`,
      [newStepId],
    )
    expect(meta.rows[0]?.metadata_json?.lateAddToWeeklyBacklog).toBe(true)
    expect(meta.rows[0]?.metadata_json?.lateAddReason).toBe('INCREMENTAL_STRUCTURE_EDIT')

    const ev = await pool.query<{
      reason: string | null
      metadata_json: { reason?: string } | null
    }>(
      `SELECT reason, metadata_json FROM conveyor_operational_events
       WHERE conveyor_id = $1::uuid AND event_type = 'CONVEYOR_STRUCTURE_UPDATED'
       ORDER BY created_at DESC LIMIT 1`,
      [cid],
    )
    expect(ev.rows[0]?.reason).toBe('INCREMENTAL_STRUCTURE_EDIT')
    expect(ev.rows[0]?.metadata_json?.reason).toBe('Inclusão tardia via sync incremental')
  })

  it('PATCH structure com id de outra esteira retorna 422', async () => {
    const a = await createConveyor()
    const b = await createConveyor()
    const detB = await request(app)
      .get(`/api/v1/conveyors/${b.cid}`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
    const foreignStepId = detB.body.data.structure.options[0].areas[0].steps[0].id as string

    const detA = await request(app)
      .get(`/api/v1/conveyors/${a.cid}`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
    const optionId = detA.body.data.structure.options[0].id as string
    const areaId = detA.body.data.structure.options[0].areas[0].id as string

    const res = await request(app)
      .patch(`/api/v1/conveyors/${a.cid}/structure`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
      .send({
        originType: 'MANUAL',
        options: [
          {
            id: optionId,
            titulo: 'Opção A',
            orderIndex: 1,
            sourceOrigin: 'manual',
            areas: [
              {
                id: areaId,
                titulo: 'Área 1',
                orderIndex: 1,
                sourceOrigin: 'manual',
                steps: [
                  {
                    id: foreignStepId,
                    titulo: 'Cross',
                    orderIndex: 1,
                    plannedMinutes: 10,
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
    expect(res.status).toBe(422)
    expect(res.body.error?.code).toBe('VALIDATION_ERROR')
  })

  it('PATCH structure soft-desativa STEP COMPLETED sem time entry', async () => {
    const { cid } = await createConveyor()
    const det = await request(app)
      .get(`/api/v1/conveyors/${cid}`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
    const optionId = det.body.data.structure.options[0].id as string
    const areaId = det.body.data.structure.options[0].areas[0].id as string
    const stepId = det.body.data.structure.options[0].areas[0].steps[0].id as string

    await pool.query(
      `UPDATE conveyor_nodes
          SET operational_status = 'COMPLETED',
              operational_completed_at = now()
        WHERE id = $1::uuid`,
      [stepId],
    )

    const res = await request(app)
      .patch(`/api/v1/conveyors/${cid}/structure`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
      .send({
        originType: 'MANUAL',
        options: [
          {
            id: optionId,
            titulo: 'Opção A',
            orderIndex: 1,
            sourceOrigin: 'manual',
            areas: [
              {
                id: areaId,
                titulo: 'Área 1',
                orderIndex: 1,
                sourceOrigin: 'manual',
                steps: [
                  {
                    titulo: 'Substituto',
                    orderIndex: 1,
                    plannedMinutes: 20,
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
    expect(res.status).toBe(200)
    const row = await pool.query<{
      is_active: boolean
      operational_status: string
      operational_completed_at: Date | null
    }>(
      `SELECT is_active, operational_status, operational_completed_at
         FROM conveyor_nodes WHERE id = $1::uuid`,
      [stepId],
    )
    expect(row.rows[0]?.is_active).toBe(false)
    expect(row.rows[0]?.operational_status).toBe('COMPLETED')
    expect(row.rows[0]?.operational_completed_at).toBeTruthy()
  })
})
