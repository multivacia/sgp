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

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const GOV_ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const GOV_ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'

const COLAB_ONLY_USER_ID = '66666666-6666-6666-6666-666666666666'
const COLAB_ONLY_EMAIL = 'colaborador-only@sgp-argos.local'

describe.skipIf(!hasDb)('auditoria administrativa (admin_audit_events)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
  })

  afterAll(async () => {
    await closePool()
  })

  it('GET /admin/audit-events com governança → 200 e lista', async () => {
    const res = await request(app)
      .get('/api/v1/admin/audit-events?limit=5&offset=0')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.meta).toBeDefined()
    expect(typeof res.body.meta.total).toBe('number')
  })

  it('GET /admin/audit-events sem governança → 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/audit-events')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, COLAB_ONLY_USER_ID, COLAB_ONLY_EMAIL),
      )
    expect(res.status).toBe(403)
  })

  it('GET /admin/audit-events sem cookie → 401', async () => {
    const res = await request(app).get('/api/v1/admin/audit-events')
    expect(res.status).toBe(401)
  })

  it('eventos na tabela não contêm campos de segredo (amostra)', async () => {
    const env = loadEnv()
    const pool = getPool(env)
    const r = await pool.query<{ m: unknown }>(
      `SELECT metadata_json AS m FROM admin_audit_events ORDER BY occurred_at DESC LIMIT 20`,
    )
    const text = JSON.stringify(r.rows)
    expect(text.toLowerCase()).not.toContain('password')
    expect(text.toLowerCase()).not.toContain('hash')
    expect(text.toLowerCase()).not.toContain('token')
  })
})
