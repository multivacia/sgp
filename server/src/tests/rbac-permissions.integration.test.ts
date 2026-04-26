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

const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'
const GESTOR_ROLE_ID = '33333333-3333-3333-3333-333333333333'

const ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'

const GESTOR_USER_ID = '88888888-8888-8888-8888-888888888888'
const GESTOR_EMAIL = 'gestor-rbac-test@sgp-argos.local'

describe.skipIf(!hasDb)('RBAC permissões V1 (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    const hash = await hashPassword('RbacTest1!')
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
      [ADMIN_USER_ID, ADMIN_EMAIL, hash, ADMIN_ROLE_ID],
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

  it('GET /admin/users com GESTOR → 403 (users.* só ADMIN)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GESTOR_USER_ID, GESTOR_EMAIL),
      )
    expect(res.status).toBe(403)
  })

  it('GET /admin/users com ADMIN → 200', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, ADMIN_USER_ID, ADMIN_EMAIL),
      )
    expect(res.status).toBe(200)
  })

  it('GET /admin/users/:id com ADMIN → 200', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/users/${ADMIN_USER_ID}`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, ADMIN_USER_ID, ADMIN_EMAIL),
      )
    expect(res.status).toBe(200)
    expect(res.body?.data?.id).toBe(ADMIN_USER_ID)
  })

  it('GET /admin/users/:id com GESTOR → 403', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/users/${ADMIN_USER_ID}`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GESTOR_USER_ID, GESTOR_EMAIL),
      )
    expect(res.status).toBe(403)
  })

  it('GET /admin/collaborators com GESTOR → 200', async () => {
    const res = await request(app)
      .get('/api/v1/admin/collaborators')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GESTOR_USER_ID, GESTOR_EMAIL),
      )
    expect(res.status).toBe(200)
  })
})
