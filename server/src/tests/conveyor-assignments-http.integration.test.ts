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
import { serviceCreateConveyor } from '../modules/conveyors/conveyors.service.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'
import {
  serviceCreateConveyorNodeAssignee,
  serviceCreateConveyorTimeEntry,
} from '../modules/conveyors/conveyorAssignments.service.js'
import { hashPassword } from '../shared/password/password.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const COLAB_SEED = '3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c'

/** Utilizador seed `maria@exemplo.com` (vinculado a COLAB_SEED) — cookie JWT para rotas com `requireAuth`. */
const MARIA_APP_USER_ID = '44444444-4444-4444-4444-444444444444'
const MARIA_EMAIL = 'maria@exemplo.com'

const GOV_ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const GOV_ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'

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

describe.skipIf(!hasDb)('conveyor assignees + time entries HTTP (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    await ensureMariaCollaboratorSeedForIntegration(pool)
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

  async function firstNodeId(
    conveyorId: string,
    nodeType: 'OPTION' | 'AREA' | 'STEP',
  ): Promise<string> {
    const r = await pool.query<{ id: string }>(
      `SELECT id FROM conveyor_nodes
       WHERE conveyor_id = $1::uuid AND node_type = $2 AND deleted_at IS NULL
       ORDER BY order_index, id
       LIMIT 1`,
      [conveyorId, nodeType],
    )
    const row = r.rows[0]
    if (!row) throw new Error(`nó ${nodeType} não encontrado`)
    return row.id
  }

  function assigneesPath(conveyorId: string, stepId: string) {
    return `/api/v1/conveyors/${conveyorId}/steps/${stepId}/assignees`
  }

  function timeEntriesPath(conveyorId: string, stepId: string) {
    return `/api/v1/conveyors/${conveyorId}/steps/${stepId}/time-entries`
  }

  it('POST múltiplos assignees e GET lista ordenada', async () => {
    const colabB = randomUUID()
    await pool.query(
      `INSERT INTO collaborators (id, full_name, status, is_active)
       VALUES ($1::uuid, 'Colab B HTTP', 'ACTIVE', true)`,
      [colabB],
    )

    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`HTTP multi ${randomUUID().slice(0, 8)}`),
    )
    const stepId = await firstNodeId(created.id, 'STEP')

    const p1 = assigneesPath(created.id, stepId)
    const r1 = await request(app)
      .post(p1)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({
        collaboratorId: COLAB_SEED,
        isPrimary: true,
      })
    expect(r1.status).toBe(201)
    expect(r1.body.data.id).toBeTruthy()
    expect(r1.body.data.stepNodeId).toBe(stepId)

    const r2 = await request(app)
      .post(p1)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({
        collaboratorId: colabB,
        isPrimary: false,
      })
    expect(r2.status).toBe(201)

    const list = await request(app).get(p1).set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(list.status).toBe(200)
    expect(list.body.data).toHaveLength(2)
    expect(list.body.data[0].isPrimary).toBe(true)
    expect(list.body.data[0].collaboratorName).toBeTruthy()
  })

  it('POST assignee duplicado → 409', async () => {
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`HTTP dup ${randomUUID().slice(0, 8)}`),
    )
    const stepId = await firstNodeId(created.id, 'STEP')
    const p = assigneesPath(created.id, stepId)

    await request(app)
      .post(p)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ collaboratorId: COLAB_SEED })

    const res = await request(app)
      .post(p)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ collaboratorId: COLAB_SEED })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('CONFLICT')
  })

  it('POST segundo principal ativo → 409', async () => {
    const colabB = randomUUID()
    const colabC = randomUUID()
    await pool.query(
      `INSERT INTO collaborators (id, full_name, status, is_active) VALUES
        ($1::uuid, 'Pri B HTTP', 'ACTIVE', true),
        ($2::uuid, 'Pri C HTTP', 'ACTIVE', true)`,
      [colabB, colabC],
    )

    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`HTTP pri ${randomUUID().slice(0, 8)}`),
    )
    const stepId = await firstNodeId(created.id, 'STEP')
    const p = assigneesPath(created.id, stepId)

    await request(app)
      .post(p)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({
        collaboratorId: COLAB_SEED,
        isPrimary: true,
      })
    await request(app)
      .post(p)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({
        collaboratorId: colabB,
        isPrimary: false,
      })

    const res = await request(app)
      .post(p)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({
        collaboratorId: colabC,
        isPrimary: true,
      })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('CONFLICT')
  })

  it('DELETE assignee → 200 + envelope', async () => {
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`HTTP delA ${randomUUID().slice(0, 8)}`),
    )
    const stepId = await firstNodeId(created.id, 'STEP')
    const post = await request(app)
      .post(assigneesPath(created.id, stepId))
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ collaboratorId: COLAB_SEED })
    const aid = post.body.data.id as string

    const del = await request(app)
      .delete(`${assigneesPath(created.id, stepId)}/${aid}`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
    expect(del.status).toBe(200)
    expect(del.body.data.deleted).toBe(true)
    expect(del.body.data.id).toBe(aid)

    const again = await request(app)
      .delete(`${assigneesPath(created.id, stepId)}/${aid}`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
    expect(again.status).toBe(404)
  })

  it('assignee: nó inexistente → 404; não-STEP → 422; conveyor incompatível → 422', async () => {
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`HTTP valA ${randomUUID().slice(0, 8)}`),
    )
    const stepId = await firstNodeId(created.id, 'STEP')
    const optionId = await firstNodeId(created.id, 'OPTION')

    const missing = await request(app)
      .post(assigneesPath(created.id, randomUUID()))
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ collaboratorId: COLAB_SEED })
    expect(missing.status).toBe(404)

    const notStep = await request(app)
      .post(assigneesPath(created.id, optionId))
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ collaboratorId: COLAB_SEED })
    expect(notStep.status).toBe(422)

    const c2 = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`HTTP valB ${randomUUID().slice(0, 8)}`),
    )
    const wrong = await request(app)
      .post(assigneesPath(c2.id, stepId))
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ collaboratorId: COLAB_SEED })
    expect(wrong.status).toBe(422)
  })

  it('time entry: POST (sessão Maria + alocação); GET; DELETE próprio', async () => {
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`HTTP te ${randomUUID().slice(0, 8)}`),
    )
    const stepId = await firstNodeId(created.id, 'STEP')
    const tp = timeEntriesPath(created.id, stepId)

    const assignee = await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId: created.id,
      conveyorNodeId: stepId,
      collaboratorId: COLAB_SEED,
      isPrimary: true,
    })

    const cookie = await sessionCookieForUser(
      pool,
      MARIA_APP_USER_ID,
      MARIA_EMAIL,
    )

    const r1 = await request(app)
      .post(tp)
      .set('Cookie', cookie)
      .send({ minutes: 12 })
    expect(r1.status).toBe(201)
    expect(r1.body.data.conveyorNodeAssigneeId).toBe(assignee.id)

    const r2 = await request(app)
      .post(tp)
      .set('Cookie', cookie)
      .send({ minutes: 7 })
    expect(r2.status).toBe(201)
    expect(r2.body.data.conveyorNodeAssigneeId).toBe(assignee.id)

    const list = await request(app).get(tp).set('Cookie', cookie)
    expect(list.status).toBe(200)
    expect(list.body.data.length).toBeGreaterThanOrEqual(2)

    const tid = r1.body.data.id as string
    const del = await request(app)
      .delete(`${tp}/${tid}`)
      .set('Cookie', cookie)
    expect(del.status).toBe(200)
    expect(del.body.data.deleted).toBe(true)
  })

  it('time entry: POST sem cookie → 401', async () => {
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`HTTP 401 ${randomUUID().slice(0, 8)}`),
    )
    const stepId = await firstNodeId(created.id, 'STEP')
    await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId: created.id,
      conveyorNodeId: stepId,
      collaboratorId: COLAB_SEED,
      isPrimary: true,
    })
    const res = await request(app)
      .post(timeEntriesPath(created.id, stepId))
      .send({ minutes: 5 })
    expect(res.status).toBe(401)
  })

  it('time entry: minutes inválidos → 422 (Zod ou service)', async () => {
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`HTTP min ${randomUUID().slice(0, 8)}`),
    )
    const stepId = await firstNodeId(created.id, 'STEP')
    const tp = timeEntriesPath(created.id, stepId)
    await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId: created.id,
      conveyorNodeId: stepId,
      collaboratorId: COLAB_SEED,
      isPrimary: true,
    })
    const cookie = await sessionCookieForUser(
      pool,
      MARIA_APP_USER_ID,
      MARIA_EMAIL,
    )

    const z = await request(app)
      .post(tp)
      .set('Cookie', cookie)
      .send({ minutes: 0 })
    expect(z.status).toBe(422)

    const neg = await request(app)
      .post(tp)
      .set('Cookie', cookie)
      .send({ minutes: -1 })
    expect(neg.status).toBe(422)
  })

  it('time entry: nó não-STEP → 422', async () => {
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`HTTP opt ${randomUUID().slice(0, 8)}`),
    )
    const optionId = await firstNodeId(created.id, 'OPTION')
    const res = await request(app)
      .post(timeEntriesPath(created.id, optionId))
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
      .send({ minutes: 10 })
    expect(res.status).toBe(422)
  })

  it('time entry: colaborador não alocado no STEP → 403', async () => {
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`HTTP na ${randomUUID().slice(0, 8)}`),
    )
    const stepId = await firstNodeId(created.id, 'STEP')
    const res = await request(app)
      .post(timeEntriesPath(created.id, stepId))
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
      .send({ minutes: 3 })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('time entry: step inexistente → 404', async () => {
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`HTTP 404te ${randomUUID().slice(0, 8)}`),
    )
    const res = await request(app)
      .post(timeEntriesPath(created.id, randomUUID()))
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
      .send({ minutes: 5 })
    expect(res.status).toBe(404)
  })

  it('serviceCreateTimeEntry compatível com novo retorno (regressão)', async () => {
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`SVC te ${randomUUID().slice(0, 8)}`),
    )
    const stepId = await firstNodeId(created.id, 'STEP')
    const t = await serviceCreateConveyorTimeEntry(pool, {
      conveyorId: created.id,
      conveyorNodeId: stepId,
      collaboratorId: COLAB_SEED,
      minutes: 4,
    })
    expect(t.id).toBeTruthy()
    expect(t.entryAt).toBeTruthy()
    expect(t.stepNodeId).toBe(stepId)
  })
})
