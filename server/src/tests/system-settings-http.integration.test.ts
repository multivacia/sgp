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
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import { hashPassword } from '../shared/password/password.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import { resetSystemSettingsCacheForTests } from '../modules/system-settings/system-settings.service.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const SUPER_ADMIN_USER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const SUPER_ADMIN_EMAIL = 'super-admin-test@sgp-argos.local'
const ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'
const SUPER_ADMIN_ROLE_ID = '66666666-6666-6666-6666-666666666666'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'

describe.skipIf(!hasDb)('API system-settings', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    const hash = await hashPassword('GoodPass1!')
    await pool.query(
      `
      INSERT INTO app_users (
        id, email, password_hash, is_active, role_id, must_change_password, password_changed_at,
        failed_login_count, locked_until
      ) VALUES
        ($1::uuid, $2, $3, true, $4::uuid, false, now(), 0, NULL),
        ($5::uuid, $6, $3, true, $7::uuid, false, now(), 0, NULL)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        is_active = true,
        role_id = EXCLUDED.role_id,
        must_change_password = false,
        failed_login_count = 0,
        locked_until = NULL
      `,
      [
        SUPER_ADMIN_USER_ID,
        SUPER_ADMIN_EMAIL,
        hash,
        SUPER_ADMIN_ROLE_ID,
        ADMIN_USER_ID,
        ADMIN_EMAIL,
        ADMIN_ROLE_ID,
      ],
    )
  })

  afterAll(async () => {
    await closePool()
  })

  it('usuário não autenticado recebe 401', async () => {
    const res = await request(app).get('/api/v1/system-settings')
    expect(res.status).toBe(401)
  })

  it('ADMIN comum recebe 403 ao listar', async () => {
    const cookie = await sessionCookieForUser(pool, ADMIN_USER_ID, ADMIN_EMAIL)
    const res = await request(app).get('/api/v1/system-settings').set('Cookie', cookie)
    expect(res.status).toBe(403)
    expect(res.body.error?.code).toBe(ErrorCodes.FORBIDDEN)
  })

  it('SUPER_ADMIN lista apenas chaves allowlist', async () => {
    resetSystemSettingsCacheForTests()
    const cookie = await sessionCookieForUser(pool, SUPER_ADMIN_USER_ID, SUPER_ADMIN_EMAIL)
    const res = await request(app).get('/api/v1/system-settings').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.data.map((item: { key: string }) => item.key)).toEqual([
      'SESSION_IDLE_TIMEOUT_MINUTES',
      'SESSION_IDLE_WARNING_MINUTES',
    ])
    expect(res.body.meta?.count).toBe(2)
  })

  it('ADMIN comum não altera SESSION_IDLE_TIMEOUT_MINUTES', async () => {
    const cookie = await sessionCookieForUser(pool, ADMIN_USER_ID, ADMIN_EMAIL)
    const res = await request(app)
      .patch('/api/v1/system-settings/SESSION_IDLE_TIMEOUT_MINUTES')
      .set('Cookie', cookie)
      .send({ value: 45 })
    expect(res.status).toBe(403)
  })

  it('SUPER_ADMIN altera valor válido', async () => {
    resetSystemSettingsCacheForTests()
    const cookie = await sessionCookieForUser(pool, SUPER_ADMIN_USER_ID, SUPER_ADMIN_EMAIL)
    const res = await request(app)
      .patch('/api/v1/system-settings/SESSION_IDLE_TIMEOUT_MINUTES')
      .set('Cookie', cookie)
      .send({ value: 45 })
    expect(res.status).toBe(200)
    expect(res.body.data?.value).toBe('45')
    expect(res.body.data?.minValue).toBe(5)
    expect(res.body.data?.maxValue).toBe(480)
  })

  it('PATCH rejeita chave desconhecida', async () => {
    const cookie = await sessionCookieForUser(pool, SUPER_ADMIN_USER_ID, SUPER_ADMIN_EMAIL)
    const res = await request(app)
      .patch('/api/v1/system-settings/UNKNOWN_KEY')
      .set('Cookie', cookie)
      .send({ value: 30 })
    expect(res.status).toBe(404)
  })

  it('PATCH rejeita valor abaixo do mínimo', async () => {
    const cookie = await sessionCookieForUser(pool, SUPER_ADMIN_USER_ID, SUPER_ADMIN_EMAIL)
    const res = await request(app)
      .patch('/api/v1/system-settings/SESSION_IDLE_TIMEOUT_MINUTES')
      .set('Cookie', cookie)
      .send({ value: 0 })
    expect(res.status).toBe(422)
  })

  it('PATCH rejeita valor acima do máximo', async () => {
    const cookie = await sessionCookieForUser(pool, SUPER_ADMIN_USER_ID, SUPER_ADMIN_EMAIL)
    const res = await request(app)
      .patch('/api/v1/system-settings/SESSION_IDLE_TIMEOUT_MINUTES')
      .set('Cookie', cookie)
      .send({ value: 481 })
    expect(res.status).toBe(422)
  })

  it('SUPER_ADMIN altera SESSION_IDLE_WARNING_MINUTES válido', async () => {
    resetSystemSettingsCacheForTests()
    const cookie = await sessionCookieForUser(pool, SUPER_ADMIN_USER_ID, SUPER_ADMIN_EMAIL)
    const res = await request(app)
      .patch('/api/v1/system-settings/SESSION_IDLE_WARNING_MINUTES')
      .set('Cookie', cookie)
      .send({ value: 7 })
    expect(res.status).toBe(200)
    expect(res.body.data?.value).toBe('7')
  })

  it('PATCH rejeita warning menor que 1', async () => {
    const cookie = await sessionCookieForUser(pool, SUPER_ADMIN_USER_ID, SUPER_ADMIN_EMAIL)
    const res = await request(app)
      .patch('/api/v1/system-settings/SESSION_IDLE_WARNING_MINUTES')
      .set('Cookie', cookie)
      .send({ value: 0 })
    expect(res.status).toBe(422)
  })

  it('PATCH rejeita warning maior que 30', async () => {
    const cookie = await sessionCookieForUser(pool, SUPER_ADMIN_USER_ID, SUPER_ADMIN_EMAIL)
    const res = await request(app)
      .patch('/api/v1/system-settings/SESSION_IDLE_WARNING_MINUTES')
      .set('Cookie', cookie)
      .send({ value: 31 })
    expect(res.status).toBe(422)
  })

  it('PATCH rejeita warning maior ou igual ao timeout atual', async () => {
    const cookie = await sessionCookieForUser(pool, SUPER_ADMIN_USER_ID, SUPER_ADMIN_EMAIL)
    const res = await request(app)
      .patch('/api/v1/system-settings/SESSION_IDLE_WARNING_MINUTES')
      .set('Cookie', cookie)
      .send({ value: 45 })
    expect(res.status).toBe(422)
  })

  it('PATCH de timeout rejeita valor menor ou igual ao warning atual', async () => {
    const cookie = await sessionCookieForUser(pool, SUPER_ADMIN_USER_ID, SUPER_ADMIN_EMAIL)
    const res = await request(app)
      .patch('/api/v1/system-settings/SESSION_IDLE_TIMEOUT_MINUTES')
      .set('Cookie', cookie)
      .send({ value: 7 })
    expect(res.status).toBe(422)
  })

  it('PATCH rejeita string vazia', async () => {
    const cookie = await sessionCookieForUser(pool, SUPER_ADMIN_USER_ID, SUPER_ADMIN_EMAIL)
    const res = await request(app)
      .patch('/api/v1/system-settings/SESSION_IDLE_TIMEOUT_MINUTES')
      .set('Cookie', cookie)
      .send({ value: '' })
    expect(res.status).toBe(422)
  })

  it('SUPER_ADMIN também respeita timeout de sessão', async () => {
    resetSystemSettingsCacheForTests()
    const now = Date.now()
    const cookie = await sessionCookieForUser(pool, SUPER_ADMIN_USER_ID, SUPER_ADMIN_EMAIL, {
      authenticatedAtMs: now - 5 * 60_000,
      lastActivityAtMs: now - 50 * 60_000,
    })
    const res = await request(app).get('/api/v1/system-settings').set('Cookie', cookie)
    expect(res.status).toBe(401)
    expect(res.body.error?.code).toBe(ErrorCodes.SESSION_EXPIRED)
  })
})
