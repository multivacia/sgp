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

/** Só roda testes de mutação se o role da BD tiver INSERT em `teams` (migração aplicada com o mesmo owner da app). */
let teamsDdlWritable = false

const GOV_ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const GOV_ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'

const MARIA_APP_USER_ID = '44444444-4444-4444-4444-444444444444'
const MARIA_EMAIL = 'maria@exemplo.com'

const MARIA_COLLAB_ID = '3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c'

describe.skipIf(!hasDb)('teams (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    const c = await pool.connect()
    try {
      await c.query('BEGIN')
      await c.query(
        `INSERT INTO teams (name, description, is_active) VALUES ('_sgp_teams_perm_probe', null, true)`,
      )
      teamsDdlWritable = true
    } catch {
      teamsDdlWritable = false
    } finally {
      await c.query('ROLLBACK')
      c.release()
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
  })

  afterAll(async () => {
    await closePool()
  })

  it('GET /api/v1/teams sem sessão → 401', async () => {
    const res = await request(app).get('/api/v1/teams')
    expect(res.status).toBe(401)
  })

  it('GET /api/v1/teams com COLABORADOR (Maria) → 403', async () => {
    const res = await request(app)
      .get('/api/v1/teams')
      .set('Cookie', await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL))
    expect(res.status).toBe(403)
  })

  it.skipIf(!teamsDdlWritable)(
    'CRUD mínimo com ADMIN: criar equipe, membro, remoção semântica',
    async () => {
    const cookie = await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL)

    const create = await request(app)
      .post('/api/v1/teams')
      .set('Cookie', cookie)
      .send({ name: `Equipe teste ${Date.now()}`, isActive: true })
    expect(create.status).toBe(201)
    const teamId = create.body.data?.id as string
    expect(teamId).toMatch(/^[0-9a-f-]{36}$/i)

    const members0 = await request(app)
      .get(`/api/v1/teams/${teamId}/members`)
      .set('Cookie', cookie)
    expect(members0.status).toBe(200)
    expect(Array.isArray(members0.body.data)).toBe(true)
    expect(members0.body.data.length).toBe(0)

    const add = await request(app)
      .post(`/api/v1/teams/${teamId}/members`)
      .set('Cookie', cookie)
      .send({ collaboratorId: MARIA_COLLAB_ID, role: 'Teste', isPrimary: true })
    expect(add.status).toBe(201)
    const memberId = add.body.data?.id as string
    expect(memberId).toMatch(/^[0-9a-f-]{36}$/i)

    const del = await request(app)
      .delete(`/api/v1/teams/${teamId}/members/${memberId}`)
      .set('Cookie', cookie)
    expect(del.status).toBe(200)
    expect(del.body.data?.isActive).toBe(false)
  },
  )
})
