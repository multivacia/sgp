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
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const COLAB_SEED = '3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c'

const COLAB_ROLE_ID = '22222222-2222-2222-2222-222222222222'
const GESTOR_ROLE_ID = '33333333-3333-3333-3333-333333333333'
/** Utilizador só com papel COLABORADOR (sem `collaborators_admin.view`). */
const COLAB_ONLY_USER_ID = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a101'
const COLAB_ONLY_EMAIL = 'journey-colab-only@sgp-argos.local'

const GESTOR_USER_ID = '88888888-8888-8888-8888-888888888888'
const GESTOR_EMAIL = 'gestor-rbac-test@sgp-argos.local'

describe.skipIf(!hasDb)('GET /collaborators/:id/operational-journey (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    await ensureMariaCollaboratorSeedForIntegration(pool)
    const hash = await hashPassword('JourneyColabOnly1!')
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
      [COLAB_ONLY_USER_ID, COLAB_ONLY_EMAIL, hash, COLAB_ROLE_ID],
    )
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
      [GESTOR_USER_ID, GESTOR_EMAIL, hash, GESTOR_ROLE_ID],
    )
  })

  afterAll(async () => {
    await closePool()
  })

  it('sem cookie → 401', async () => {
    const res = await request(app).get(
      `/api/v1/collaborators/${COLAB_SEED}/operational-journey`,
    )
    expect(res.status).toBe(401)
  })

  it('COLABORADOR (sem collaborators_admin.view) → 403', async () => {
    const res = await request(app)
      .get(`/api/v1/collaborators/${COLAB_SEED}/operational-journey`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, COLAB_ONLY_USER_ID, COLAB_ONLY_EMAIL),
      )
    expect(res.status).toBe(403)
  })

  it('GESTOR com collaborators_admin.view → 200 e envelope', async () => {
    const res = await request(app)
      .get(`/api/v1/collaborators/${COLAB_SEED}/operational-journey`)
      .set('Cookie', await sessionCookieForUser(pool, GESTOR_USER_ID, GESTOR_EMAIL))
    expect(res.status).toBe(200)
    expect(res.body.data.meta.semanticsVersion).toBe('1.5')
    expect(res.body.data.collaborator.id).toBe(COLAB_SEED)
    expect(typeof res.body.data.load.assignmentCount).toBe('number')
    expect(typeof res.body.data.execution.realizedMinutesTotal).toBe('number')
    expect(typeof res.body.data.execution.realizedMinutesInPeriod).toBe('number')
    expect(res.body.data.coberturaTempo).toBeTruthy()
    expect(
      res.body.data.coberturaTempo.ratio === null ||
        typeof res.body.data.coberturaTempo.ratio === 'number',
    ).toBe(true)
    expect(res.body.data.signals.pendenciaTempo.count).toBeGreaterThanOrEqual(0)
    expect(res.body.data.risk.overdueCount).toBeGreaterThanOrEqual(0)
    expect(res.body.data.risk.byBucket).toBeTruthy()
    expect(Array.isArray(res.body.data.assignmentsOpen)).toBe(true)
    expect(Array.isArray(res.body.data.assignmentsAtRisk)).toBe(true)
    expect(Array.isArray(res.body.data.recentTimeEntries)).toBe(true)
  })

  it('UUID inválido → 422 (validação)', async () => {
    const res = await request(app)
      .get('/api/v1/collaborators/not-a-uuid/operational-journey')
      .set('Cookie', await sessionCookieForUser(pool, GESTOR_USER_ID, GESTOR_EMAIL))
    expect(res.status).toBe(422)
  })

  it('colaborador inexistente → 404', async () => {
    const res = await request(app)
      .get(
        `/api/v1/collaborators/00000000-0000-0000-0000-000000000001/operational-journey`,
      )
      .set('Cookie', await sessionCookieForUser(pool, GESTOR_USER_ID, GESTOR_EMAIL))
    expect(res.status).toBe(404)
  })
})
