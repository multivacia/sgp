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
import { sessionCookieForUser } from './sessionTestCookie.js'
import {
  serviceCreateConveyor,
  serviceDeleteConveyor,
} from '../modules/conveyors/conveyors.service.js'
import { AppError } from '../shared/errors/AppError.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'
import { serviceCreateConveyorTimeEntry } from '../modules/conveyors/conveyorAssignments.service.js'
import { serviceCreateConveyorOperationalEvent } from '../modules/conveyors/operational-events/conveyor-operational-events.service.js'
import type { ConveyorOperationalStatusDb } from '../modules/conveyors/conveyors.repository.js'
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const MARIA_APP_USER_ID = '44444444-4444-4444-4444-444444444444'
const MARIA_EMAIL = 'maria@exemplo.com'
const COLAB_SEED = '3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c'

function minimalConveyorBody(nome: string): PostConveyorBody {
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
                sourceOrigin: 'manual',
                required: true,
              },
            ],
          },
        ],
      },
    ],
  }
}

describe.skipIf(!hasDb)('DELETE /api/v1/conveyors/:id (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    await ensureMariaCollaboratorSeedForIntegration(pool)
  })

  async function anyActiveAppUserId(): Promise<string> {
    const r = await pool.query<{ id: string }>(
      `SELECT id::text FROM app_users WHERE deleted_at IS NULL AND is_active = true LIMIT 1`,
    )
    return r.rows[0]?.id ?? MARIA_APP_USER_ID
  }

  async function managerCookie(): Promise<string> {
    const r = await pool.query<{ id: string; email: string }>(
      `
      SELECT u.id::text, u.email::text
      FROM app_users u
      INNER JOIN app_role_permissions arp ON arp.role_id = u.role_id
      INNER JOIN app_permissions p ON p.id = arp.permission_id
      WHERE p.code = 'conveyors.create'
        AND u.deleted_at IS NULL
        AND u.is_active = true
      LIMIT 1
      `,
    )
    const row = r.rows[0]
    if (!row) {
      throw new Error('Nenhum utilizador com conveyors.create na base de testes.')
    }
    return sessionCookieForUser(pool, row.id, row.email)
  }

  afterAll(async () => {
    await closePool()
  })

  async function createBacklogConveyor(label: string): Promise<string> {
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`${label} ${randomUUID().slice(0, 8)}`),
    )
    expect(created.operationalStatus).toBe('NO_BACKLOG')
    return created.id
  }

  async function firstStepId(conveyorId: string): Promise<string> {
    const r = await pool.query<{ id: string }>(
      `SELECT id::text FROM conveyor_nodes
       WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
       ORDER BY order_index LIMIT 1`,
      [conveyorId],
    )
    const id = r.rows[0]?.id
    if (!id) throw new Error('STEP não encontrado')
    return id
  }

  async function deleteConveyorHttp(conveyorId: string, cookie: string) {
    return request(app)
      .delete(`/api/v1/conveyors/${conveyorId}`)
      .set('Cookie', cookie)
  }

  async function patchConveyorStatusHttp(
    conveyorId: string,
    operationalStatus: ConveyorOperationalStatusDb,
  ) {
    return request(app)
      .patch(`/api/v1/conveyors/${conveyorId}/status`)
      .set('Cookie', await managerCookie())
      .send({ operationalStatus })
  }

  it('DELETE sem auth → 401', async () => {
    const res = await request(app).delete(`/api/v1/conveyors/${randomUUID()}`)
    expect(res.status).toBe(401)
  })

  it('DELETE sem conveyors.create (COLABORADOR) → 403', async () => {
    const id = await createBacklogConveyor('del-403')
    const res = await deleteConveyorHttp(
      id,
      await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
    )
    expect(res.status).toBe(403)
  })

  it('DELETE inexistente → 404', async () => {
    const res = await deleteConveyorHttp(randomUUID(), await managerCookie())
    expect(res.status).toBe(404)
    expect(res.body.error?.code).toBe('NOT_FOUND')
  })

  it('DELETE NO_BACKLOG sem dependências → 204 e remove esteira, nós e assignees', async () => {
    const id = await createBacklogConveyor('del-ok')
    const stepId = await firstStepId(id)
    await pool.query(
      `INSERT INTO conveyor_node_assignees (
          id, conveyor_id, conveyor_node_id, collaborator_id, is_primary, order_index, assignment_origin
        ) VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, true, 0, 'manual')`,
      [id, stepId, COLAB_SEED],
    )

    const res = await deleteConveyorHttp(id, await managerCookie())
    expect(res.status).toBe(204)

    const cv = await pool.query(`SELECT 1 FROM conveyors WHERE id = $1::uuid`, [id])
    expect(cv.rowCount).toBe(0)
    const nodes = await pool.query(
      `SELECT 1 FROM conveyor_nodes WHERE conveyor_id = $1::uuid`,
      [id],
    )
    expect(nodes.rowCount).toBe(0)
    const assignees = await pool.query(
      `SELECT 1 FROM conveyor_node_assignees WHERE conveyor_id = $1::uuid`,
      [id],
    )
    expect(assignees.rowCount).toBe(0)
  })

  it('DELETE EM_REVISAO → 409', async () => {
    const id = await createBacklogConveyor('del-revisao')
    const patch = await patchConveyorStatusHttp(id, 'EM_REVISAO')
    expect(patch.status).toBe(200)
    const res = await deleteConveyorHttp(id, await managerCookie())
    expect(res.status).toBe(409)
    expect(res.body.error?.message).toBe(
      'Somente esteiras no backlog podem ser excluídas.',
    )
    expect(res.body.error?.code).toBe('CONVEYOR_DELETE_STATUS_NOT_ALLOWED')
  })

  it('DELETE EM_PRODUCAO → 409', async () => {
    const id = await createBacklogConveyor('del-prod')
    for (const st of ['EM_REVISAO', 'PRONTA_LIBERAR', 'EM_PRODUCAO'] as const) {
      const p = await patchConveyorStatusHttp(id, st)
      expect(p.status).toBe(200)
    }
    const res = await deleteConveyorHttp(id, await managerCookie())
    expect(res.status).toBe(409)
    expect(res.body.error?.code).toBe('CONVEYOR_DELETE_STATUS_NOT_ALLOWED')
  })

  it('DELETE CONCLUIDA → 409', async () => {
    const id = await createBacklogConveyor('del-conc')
    for (const st of [
      'EM_REVISAO',
      'PRONTA_LIBERAR',
      'EM_PRODUCAO',
      'CONCLUIDA',
    ] as const) {
      const p = await patchConveyorStatusHttp(id, st)
      expect(p.status).toBe(200)
    }
    const res = await deleteConveyorHttp(id, await managerCookie())
    expect(res.status).toBe(409)
    expect(res.body.error?.code).toBe('CONVEYOR_DELETE_STATUS_NOT_ALLOWED')
  })

  it('DELETE com apontamento de horas → 409', async () => {
    const id = await createBacklogConveyor('del-te')
    const stepId = await firstStepId(id)
    await pool.query(
      `INSERT INTO conveyor_node_assignees (
          id, conveyor_id, conveyor_node_id, collaborator_id, is_primary, order_index, assignment_origin
        ) VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, true, 0, 'manual')`,
      [id, stepId, COLAB_SEED],
    )
    await serviceCreateConveyorTimeEntry(pool, {
      conveyorId: id,
      conveyorNodeId: stepId,
      collaboratorId: COLAB_SEED,
      minutes: 15,
      entryMode: 'manual',
    })
    const res = await deleteConveyorHttp(id, await managerCookie())
    expect(res.status).toBe(409)
    expect(res.body.error?.message).toBe(
      'Esta esteira já possui movimentações e não pode ser excluída.',
    )
    expect(res.body.error?.code).toBe('CONVEYOR_DELETE_HAS_DEPENDENCIES')
  })

  it('DELETE com plano operacional da esteira → 409', async () => {
    const id = await createBacklogConveyor('del-cop')
    await pool.query(
      `INSERT INTO conveyor_operational_plans (conveyor_id, status)
       VALUES ($1::uuid, 'DRAFT')`,
      [id],
    )
    const res = await deleteConveyorHttp(id, await managerCookie())
    expect(res.status).toBe(409)
    expect(res.body.error?.code).toBe('CONVEYOR_DELETE_HAS_DEPENDENCIES')
  })

  it('DELETE com item de planejamento semanal → 409', async () => {
    const id = await createBacklogConveyor('del-week')
    const stepId = await firstStepId(id)
    const weekStart = `2026-${String(Math.floor(Math.random() * 8) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}`
    const plan = await pool.query<{ id: string }>(
      `INSERT INTO operational_work_plans (
          week_start_date, week_end_date, status, created_by
        ) VALUES ($2::date, ($2::date + 4), 'DRAFT', $1::uuid)
        RETURNING id::text`,
      [(await anyActiveAppUserId()), weekStart],
    )
    const planId = plan.rows[0]?.id
    if (!planId) throw new Error('plano semanal não criado')
    await pool.query(
      `INSERT INTO operational_work_plan_items (
          work_plan_id, conveyor_id, activity_node_id, planned_date, planned_order, status
        ) VALUES ($1::uuid, $2::uuid, $3::uuid, ($4::date + 1), 1, 'PLANNED')`,
      [planId, id, stepId, weekStart],
    )
    const res = await deleteConveyorHttp(id, await managerCookie())
    expect(res.status).toBe(409)
    expect(res.body.error?.code).toBe('CONVEYOR_DELETE_HAS_DEPENDENCIES')
  })

  it('DELETE com evento operacional e análise ARGOS sem outras deps → 204', async () => {
    const id = await createBacklogConveyor('del-cascade')
    await serviceCreateConveyorOperationalEvent(pool, {
      conveyorId: id,
      eventType: 'MANUAL_NOTE',
      source: 'USER_ACTION',
      occurredAt: new Date().toISOString(),
      reason: 'teste delete',
    })
    await pool.query(
      `INSERT INTO conveyor_health_analyses (
          conveyor_id, request_id, correlation_id, policy, analysis_json
        ) VALUES ($1::uuid, gen_random_uuid(), gen_random_uuid(), 'balanced', '{}'::jsonb)`,
      [id],
    )

    const res = await deleteConveyorHttp(id, await managerCookie())
    expect(res.status).toBe(204)

    const ev = await pool.query(
      `SELECT 1 FROM conveyor_operational_events WHERE conveyor_id = $1::uuid`,
      [id],
    )
    expect(ev.rowCount).toBe(0)
    const ha = await pool.query(
      `SELECT 1 FROM conveyor_health_analyses WHERE conveyor_id = $1::uuid`,
      [id],
    )
    expect(ha.rowCount).toBe(0)
  })
})

describe.skipIf(!hasDb)('serviceDeleteConveyor (integração)', () => {
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    await ensureMariaCollaboratorSeedForIntegration(pool)
  })

  afterAll(async () => {
    await closePool()
  })

  async function createBacklogConveyor(label: string): Promise<string> {
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`${label} ${randomUUID().slice(0, 8)}`),
    )
    return created.id
  }

  it('rejeita status diferente de NO_BACKLOG', async () => {
    const id = await createBacklogConveyor('svc-status')
    await pool.query(
      `UPDATE conveyors SET operational_status = 'EM_REVISAO' WHERE id = $1::uuid`,
      [id],
    )
    await expect(serviceDeleteConveyor(pool, id)).rejects.toMatchObject({
      statusCode: 409,
      code: ErrorCodes.CONVEYOR_DELETE_STATUS_NOT_ALLOWED,
      message: 'Somente esteiras no backlog podem ser excluídas.',
    } satisfies Partial<AppError>)
  })

  it('rejeita quando há apontamento ativo', async () => {
    const id = await createBacklogConveyor('svc-te')
    const step = await pool.query<{ id: string }>(
      `SELECT id::text FROM conveyor_nodes WHERE conveyor_id = $1::uuid AND node_type = 'STEP' LIMIT 1`,
      [id],
    )
    const stepId = step.rows[0]?.id
    if (!stepId) throw new Error('step missing')
    await pool.query(
      `INSERT INTO conveyor_node_assignees (
          id, conveyor_id, conveyor_node_id, collaborator_id, is_primary, order_index, assignment_origin
        ) VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, true, 0, 'manual')`,
      [id, stepId, COLAB_SEED],
    )
    await serviceCreateConveyorTimeEntry(pool, {
      conveyorId: id,
      conveyorNodeId: stepId,
      collaboratorId: COLAB_SEED,
      minutes: 10,
      entryMode: 'manual',
    })
    await expect(serviceDeleteConveyor(pool, id)).rejects.toMatchObject({
      code: ErrorCodes.CONVEYOR_DELETE_HAS_DEPENDENCIES,
    })
  })
})
