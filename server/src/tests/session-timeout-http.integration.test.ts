import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { createLogger } from '../plugins/logger.js'
import { closePool, getPool } from '../plugins/db.js'
import {
  hasDatabaseConnectionInEnv,
  loadDotenvFiles,
  loadEnv,
  resetEnvCacheForTests,
} from '../config/env.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import { hashPassword } from '../shared/password/password.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import { resetSystemSettingsCacheForTests } from '../modules/system-settings/system-settings.service.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const SESSION_USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const SESSION_EMAIL = 'session-timeout-test@sgp-argos.local'
const SEED_ROLE_ID = '22222222-2222-2222-2222-222222222222'

describe.skipIf(!hasDb)('timeout de sessão autenticada', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let previousAbsoluteTimeoutHours: string | undefined

  beforeAll(async () => {
    previousAbsoluteTimeoutHours = process.env.SGP_SESSION_ABSOLUTE_TIMEOUT_HOURS
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    const hash = await hashPassword('GoodPass1!')
    await pool.query(
      `
      INSERT INTO app_users (
        id, email, password_hash, is_active, role_id, must_change_password, password_changed_at,
        failed_login_count, locked_until
      ) VALUES (
        $1::uuid, $2, $3, true, $4::uuid, false, now(),
        0, NULL
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        is_active = true,
        role_id = EXCLUDED.role_id,
        must_change_password = false,
        failed_login_count = 0,
        locked_until = NULL
      `,
      [SESSION_USER_ID, SESSION_EMAIL, hash, SEED_ROLE_ID],
    )
  })

  afterAll(async () => {
    if (previousAbsoluteTimeoutHours === undefined) {
      delete process.env.SGP_SESSION_ABSOLUTE_TIMEOUT_HOURS
    } else {
      process.env.SGP_SESSION_ABSOLUTE_TIMEOUT_HOURS = previousAbsoluteTimeoutHours
    }
    resetEnvCacheForTests()
    await closePool()
  })

  it('sessão válida responde 200 em /auth/me', async () => {
    resetSystemSettingsCacheForTests()
    const cookie = await sessionCookieForUser(pool, SESSION_USER_ID, SESSION_EMAIL)
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.data?.user?.email).toBe(SESSION_EMAIL)
  })

  it('expira por inatividade conforme valor da tabela', async () => {
    resetSystemSettingsCacheForTests()
    await pool.query(
      `
      INSERT INTO system_settings (setting_key, setting_value, value_type, description, is_active)
      VALUES ('SESSION_IDLE_TIMEOUT_MINUTES', '10', 'INTEGER', 'teste', true)
      ON CONFLICT (setting_key) DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        is_active = true
      `,
    )
    const now = Date.now()
    const cookie = await sessionCookieForUser(pool, SESSION_USER_ID, SESSION_EMAIL, {
      authenticatedAtMs: now - 5 * 60_000,
      lastActivityAtMs: now - 11 * 60_000,
    })
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', cookie)
    expect(res.status).toBe(401)
    expect(res.body.error?.code).toBe(ErrorCodes.SESSION_EXPIRED)
    expect(res.body.error?.message).toContain('expirou')
  })

  it('expira por limite absoluto da variável de ambiente', async () => {
    resetSystemSettingsCacheForTests()
    const prev = process.env.SGP_SESSION_ABSOLUTE_TIMEOUT_HOURS
    process.env.SGP_SESSION_ABSOLUTE_TIMEOUT_HOURS = '1'
    resetEnvCacheForTests()
    try {
      const env = loadEnv()
      const absoluteApp = createApp(pool, createLogger('silent'), env)
      const now = Date.now()
      const cookie = await sessionCookieForUser(pool, SESSION_USER_ID, SESSION_EMAIL, {
        authenticatedAtMs: now - 2 * 3_600_000,
        lastActivityAtMs: now - 1_000,
      })
      const res = await request(absoluteApp)
        .get('/api/v1/auth/me')
        .set('Cookie', cookie)
      expect(res.status).toBe(401)
      expect(res.body.error?.code).toBe(ErrorCodes.SESSION_EXPIRED)
    } finally {
      if (prev === undefined) {
        delete process.env.SGP_SESSION_ABSOLUTE_TIMEOUT_HOURS
      } else {
        process.env.SGP_SESSION_ABSOLUTE_TIMEOUT_HOURS = prev
      }
      resetEnvCacheForTests()
    }
  })

  it('atualiza lastActivityAt em request autenticada válida', async () => {
    resetSystemSettingsCacheForTests()
    const now = Date.now()
    const cookie = await sessionCookieForUser(pool, SESSION_USER_ID, SESSION_EMAIL, {
      authenticatedAtMs: now - 60_000,
      lastActivityAtMs: now - 60_000,
    })
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', cookie)
    expect(res.status).toBe(200)
    const setCookie = res.headers['set-cookie']
    expect(setCookie).toBeDefined()
    expect(Array.isArray(setCookie) ? setCookie[0] : setCookie).toContain(
      loadEnv().authCookieName,
    )
  })
})
