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
const COLAB_ONLY_USER_ID = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a101'
const COLAB_ONLY_EMAIL = 'journey-colab-only@sgp-argos.local'

describe.skipIf(!hasDb)('GET /api/v1/my-operational-journey (integração)', () => {
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
  })

  afterAll(async () => {
    await closePool()
  })

  it('sem cookie → 401', async () => {
    const res = await request(app).get('/api/v1/my-operational-journey')
    expect(res.status).toBe(401)
  })

  it('sem collaborator_id → 422', async () => {
    await pool.query(
      `UPDATE app_users SET collaborator_id = NULL WHERE id = $1::uuid`,
      [COLAB_ONLY_USER_ID],
    )
    const res = await request(app)
      .get('/api/v1/my-operational-journey')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, COLAB_ONLY_USER_ID, COLAB_ONLY_EMAIL),
      )
    expect(res.status).toBe(422)
    expect(String(res.body?.error?.message ?? '')).toContain('colaborador')
  })

  it('com collaborator_id → 200 e envelope operacional', async () => {
    await pool.query(
      `UPDATE app_users SET collaborator_id = NULL WHERE collaborator_id = $1::uuid AND id <> $2::uuid`,
      [COLAB_SEED, COLAB_ONLY_USER_ID],
    )
    await pool.query(
      `UPDATE app_users SET collaborator_id = $1::uuid WHERE id = $2::uuid`,
      [COLAB_SEED, COLAB_ONLY_USER_ID],
    )
    const res = await request(app)
      .get('/api/v1/my-operational-journey?periodPreset=7d')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, COLAB_ONLY_USER_ID, COLAB_ONLY_EMAIL),
      )
    expect(res.status).toBe(200)
    expect(res.body.data.meta.semanticsVersion).toBe('1.5')
    expect(res.body.data.collaborator.id).toBe(COLAB_SEED)
    expect(typeof res.body.data.load.assignmentCount).toBe('number')
    expect(Array.isArray(res.body.data.assignmentsOpen)).toBe(true)
    expect(Array.isArray(res.body.data.recentTimeEntries)).toBe(true)
  })
})
