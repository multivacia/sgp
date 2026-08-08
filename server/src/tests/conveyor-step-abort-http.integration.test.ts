/**
 * HTTP (Supertest) para dispensa/restauração de STEP.
 *
 * - `POST /api/v1/conveyors/:conveyorId/steps/:stepNodeId/abort`
 * - `POST /api/v1/conveyors/:conveyorId/steps/:stepNodeId/restore-aborted`
 *
 * Sem DB: describe é skip explícito. Com DB e sem migration 0050: `beforeAll`
 * falha (fail-fast), para não passar silenciosamente.
 */
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
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
import { servicePatchConveyorStepCompletion } from '../modules/conveyors/conveyor-step-operational.service.js'
import { hashPassword } from '../shared/password/password.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'
import { setConveyorProductionStatusForIntegration } from './integrationConveyorFixtures.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

/** Utilizador COM `conveyors.create` (papel ADMIN seedado). */
const GOV_ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const GOV_ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'

/** Utilizador SEM `conveyors.create` (papel COLABORADOR) — usado no caso 403. */
const MARIA_APP_USER_ID = '44444444-4444-4444-4444-444444444444'
const MARIA_EMAIL = 'maria@exemplo.com'

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

describe.skipIf(!hasDb)('conveyor step abort / restore HTTP (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)

    const probe = await pool.query<{ ok: string }>(
      `SELECT CASE
         WHEN EXISTS (
           SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'conveyor_nodes'
              AND column_name = 'aborted_at'
         )
         THEN '1' ELSE '0'
       END AS ok`,
    )
    if (probe.rows[0]?.ok !== '1') {
      throw new Error(
        'Fail-fast: migration 0050 ausente (coluna conveyor_nodes.aborted_at). ' +
          'Aplique server/migrations/0050_conveyor_nodes_step_aborted.sql no banco local de testes.',
      )
    }

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

    const perms = await pool.query<{ user_id: string; has_create: boolean }>(
      `SELECT au.id::text AS user_id,
              COALESCE(bool_or(p.code = 'conveyors.create'), false) AS has_create
         FROM app_users au
         LEFT JOIN app_role_permissions rp ON rp.role_id = au.role_id
         LEFT JOIN app_permissions p ON p.id = rp.permission_id
        WHERE au.id = ANY($1::uuid[])
        GROUP BY au.id`,
      [[GOV_ADMIN_USER_ID, MARIA_APP_USER_ID]],
    )
    const byUser = new Map(perms.rows.map((r) => [r.user_id, r.has_create]))
    if (byUser.get(GOV_ADMIN_USER_ID) !== true) {
      throw new Error('Fail-fast: utilizador de governança sem permissão conveyors.create.')
    }
    if (byUser.get(MARIA_APP_USER_ID) !== false) {
      throw new Error(
        'Fail-fast: utilizador do caso 403 possui conveyors.create; o teste de negação seria falso-positivo.',
      )
    }
  })

  afterAll(async () => {
    await closePool()
  })

  function abortPath(conveyorId: string, stepNodeId: string): string {
    return `/api/v1/conveyors/${conveyorId}/steps/${stepNodeId}/abort`
  }

  function restorePath(conveyorId: string, stepNodeId: string): string {
    return `/api/v1/conveyors/${conveyorId}/steps/${stepNodeId}/restore-aborted`
  }

  function adminCookie(): Promise<string> {
    return sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL)
  }

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

  async function seedConveyorWithStep(): Promise<{ conveyorId: string; stepId: string }> {
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`HTTP abort ${randomUUID().slice(0, 8)}`),
    )
    await setConveyorProductionStatusForIntegration(pool, created.id)
    const stepId = await firstNodeId(created.id, 'STEP')
    return { conveyorId: created.id, stepId }
  }

  async function readStepStatus(stepId: string): Promise<string | null> {
    const r = await pool.query<{ operational_status: string | null }>(
      `SELECT operational_status FROM conveyor_nodes WHERE id = $1::uuid`,
      [stepId],
    )
    return r.rows[0]?.operational_status ?? null
  }

  async function abortViaHttp(
    conveyorId: string,
    stepId: string,
    idempotencyKey: string,
    reasonCode = 'NAO_MAIS_NECESSARIA',
  ) {
    return request(app)
      .post(abortPath(conveyorId, stepId))
      .set('Cookie', await adminCookie())
      .set('Idempotency-Key', idempotencyKey)
      .send({ reasonCode })
  }

  async function restoreViaHttp(
    conveyorId: string,
    stepId: string,
    idempotencyKey: string,
  ) {
    return request(app)
      .post(restorePath(conveyorId, stepId))
      .set('Cookie', await adminCookie())
      .set('Idempotency-Key', idempotencyKey)
      .send({})
  }

  it('abort 200: envelope com meta stepAbortIdempotent=false e replay=true', async () => {
    const seed = await seedConveyorWithStep()
    const key = randomUUID()

    const first = await abortViaHttp(seed.conveyorId, seed.stepId, key)
    expect(first.status).toBe(200)
    expect(first.body.meta.stepAbortIdempotent).toBe(false)
    expect(first.body.data.id).toBe(seed.conveyorId)
    expect(await readStepStatus(seed.stepId)).toBe('ABORTED')

    const replay = await abortViaHttp(seed.conveyorId, seed.stepId, key)
    expect(replay.status).toBe(200)
    expect(replay.body.meta.stepAbortIdempotent).toBe(true)

    const events = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM conveyor_operational_events
        WHERE conveyor_id = $1::uuid AND event_type = 'CONVEYOR_STEP_ABORTED'`,
      [seed.conveyorId],
    )
    expect(events.rows[0]?.n).toBe('1')
  })

  it('restore 200: envelope com meta stepRestoreAbortedIdempotent=false e replay=true', async () => {
    const seed = await seedConveyorWithStep()
    await abortViaHttp(seed.conveyorId, seed.stepId, randomUUID())
    const restoreKey = randomUUID()

    const first = await restoreViaHttp(seed.conveyorId, seed.stepId, restoreKey)
    expect(first.status).toBe(200)
    expect(first.body.meta.stepRestoreAbortedIdempotent).toBe(false)
    expect(await readStepStatus(seed.stepId)).toBe('REOPENED')

    const replay = await restoreViaHttp(seed.conveyorId, seed.stepId, restoreKey)
    expect(replay.status).toBe(200)
    expect(replay.body.meta.stepRestoreAbortedIdempotent).toBe(true)

    const events = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM conveyor_operational_events
        WHERE conveyor_id = $1::uuid AND event_type = 'CONVEYOR_STEP_RESTORED'`,
      [seed.conveyorId],
    )
    expect(events.rows[0]?.n).toBe('1')
  })

  it('abort 400: Idempotency-Key ausente', async () => {
    const seed = await seedConveyorWithStep()
    const res = await request(app)
      .post(abortPath(seed.conveyorId, seed.stepId))
      .set('Cookie', await adminCookie())
      .send({ reasonCode: 'NAO_MAIS_NECESSARIA' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(await readStepStatus(seed.stepId)).toBe('PENDING')
  })

  it('restore 400: Idempotency-Key ausente', async () => {
    const seed = await seedConveyorWithStep()
    await abortViaHttp(seed.conveyorId, seed.stepId, randomUUID())
    const res = await request(app)
      .post(restorePath(seed.conveyorId, seed.stepId))
      .set('Cookie', await adminCookie())
      .send({})
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(await readStepStatus(seed.stepId)).toBe('ABORTED')
  })

  it('abort 400: Idempotency-Key vazia ou acima de 180 caracteres', async () => {
    const seed = await seedConveyorWithStep()

    const empty = await abortViaHttp(seed.conveyorId, seed.stepId, '   ')
    expect(empty.status).toBe(400)
    expect(empty.body.error.code).toBe('VALIDATION_ERROR')

    const tooLong = await abortViaHttp(seed.conveyorId, seed.stepId, 'k'.repeat(181))
    expect(tooLong.status).toBe(400)
    expect(tooLong.body.error.code).toBe('VALIDATION_ERROR')

    expect(await readStepStatus(seed.stepId)).toBe('PENDING')
  })

  it('restore 400: Idempotency-Key acima de 180 caracteres', async () => {
    const seed = await seedConveyorWithStep()
    await abortViaHttp(seed.conveyorId, seed.stepId, randomUUID())

    const res = await restoreViaHttp(seed.conveyorId, seed.stepId, 'k'.repeat(181))
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(await readStepStatus(seed.stepId)).toBe('ABORTED')
  })

  it('abort 400: corpo inválido (sem reasonCode)', async () => {
    const seed = await seedConveyorWithStep()
    const res = await request(app)
      .post(abortPath(seed.conveyorId, seed.stepId))
      .set('Cookie', await adminCookie())
      .set('Idempotency-Key', randomUUID())
      .send({})
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(await readStepStatus(seed.stepId)).toBe('PENDING')
  })

  it('abort 400: reasonCode fora do catálogo', async () => {
    const seed = await seedConveyorWithStep()
    const res = await abortViaHttp(
      seed.conveyorId,
      seed.stepId,
      randomUUID(),
      'MOTIVO_INEXISTENTE',
    )
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(await readStepStatus(seed.stepId)).toBe('PENDING')
  })

  it('abort 400: reasonCode OUTRO sem reasonText', async () => {
    const seed = await seedConveyorWithStep()
    const res = await request(app)
      .post(abortPath(seed.conveyorId, seed.stepId))
      .set('Cookie', await adminCookie())
      .set('Idempotency-Key', randomUUID())
      .send({ reasonCode: 'OUTRO', reasonText: '   ' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(await readStepStatus(seed.stepId)).toBe('PENDING')
  })

  it('abort e restore 403: utilizador autenticado sem conveyors.create', async () => {
    const seed = await seedConveyorWithStep()
    const cookie = await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL)

    const abortRes = await request(app)
      .post(abortPath(seed.conveyorId, seed.stepId))
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send({ reasonCode: 'NAO_MAIS_NECESSARIA' })
    expect(abortRes.status).toBe(403)

    const restoreRes = await request(app)
      .post(restorePath(seed.conveyorId, seed.stepId))
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send({})
    expect(restoreRes.status).toBe(403)

    expect(await readStepStatus(seed.stepId)).toBe('PENDING')
  })

  it('abort 404: esteira inexistente, STEP inexistente e nó que não é STEP', async () => {
    const seed = await seedConveyorWithStep()
    const optionId = await firstNodeId(seed.conveyorId, 'OPTION')

    const noConveyor = await abortViaHttp(randomUUID(), randomUUID(), randomUUID())
    expect(noConveyor.status).toBe(404)

    const noStep = await abortViaHttp(seed.conveyorId, randomUUID(), randomUUID())
    expect(noStep.status).toBe(404)

    const notStep = await abortViaHttp(seed.conveyorId, optionId, randomUUID())
    expect(notStep.status).toBe(404)
  })

  it('restore 404: esteira inexistente, STEP inexistente e nó que não é STEP', async () => {
    const seed = await seedConveyorWithStep()
    const optionId = await firstNodeId(seed.conveyorId, 'OPTION')

    const noConveyor = await restoreViaHttp(randomUUID(), randomUUID(), randomUUID())
    expect(noConveyor.status).toBe(404)

    const noStep = await restoreViaHttp(seed.conveyorId, randomUUID(), randomUUID())
    expect(noStep.status).toBe(404)

    const notStep = await restoreViaHttp(seed.conveyorId, optionId, randomUUID())
    expect(notStep.status).toBe(404)
  })

  it('abort 409: transição inválida a partir de COMPLETED', async () => {
    const seed = await seedConveyorWithStep()
    await servicePatchConveyorStepCompletion(pool, {
      conveyorId: seed.conveyorId,
      stepNodeId: seed.stepId,
      actorAppUserId: GOV_ADMIN_USER_ID,
      action: 'COMPLETE',
    })

    const res = await abortViaHttp(seed.conveyorId, seed.stepId, randomUUID())
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('CONFLICT')
    expect(await readStepStatus(seed.stepId)).toBe('COMPLETED')
  })

  it('abort 409: Idempotency-Key já usada em outra esteira/nó', async () => {
    const seedA = await seedConveyorWithStep()
    const seedB = await seedConveyorWithStep()
    const key = randomUUID()

    const first = await abortViaHttp(seedA.conveyorId, seedA.stepId, key)
    expect(first.status).toBe(200)

    const conflict = await abortViaHttp(seedB.conveyorId, seedB.stepId, key)
    expect(conflict.status).toBe(409)
    expect(conflict.body.error.code).toBe('CONFLICT')
    expect(await readStepStatus(seedB.stepId)).toBe('PENDING')
  })

  it('restore 409: STEP que não está ABORTED', async () => {
    const seed = await seedConveyorWithStep()
    const res = await restoreViaHttp(seed.conveyorId, seed.stepId, randomUUID())
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('CONFLICT')
    expect(await readStepStatus(seed.stepId)).toBe('PENDING')
  })
})
