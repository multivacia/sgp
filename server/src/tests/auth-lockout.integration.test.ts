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
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import { hashPassword } from '../shared/password/password.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const LOCKOUT_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const LOCKOUT_EMAIL = 'lockout-test@sgp-argos.local'
const SEED_ROLE_ID = '22222222-2222-2222-2222-222222222222'

describe.skipIf(!hasDb)('lockout por tentativas de login', () => {
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
      [LOCKOUT_USER_ID, LOCKOUT_EMAIL, hash, SEED_ROLE_ID],
    )
  })

  afterAll(async () => {
    await closePool()
  })

  it('falhas consecutivas incrementam; ao atingir o limiar responde 403 ACCOUNT_TEMPORARILY_LOCKED', async () => {
    const wrong = { email: LOCKOUT_EMAIL, password: 'Wrong1!' }
    for (let i = 0; i < 4; i += 1) {
      const res = await request(app).post('/api/v1/auth/login').send(wrong)
      expect(res.status).toBe(401)
    }
    const blocked = await request(app).post('/api/v1/auth/login').send(wrong)
    expect(blocked.status).toBe(403)
    expect(blocked.body.error?.code).toBe(ErrorCodes.ACCOUNT_TEMPORARILY_LOCKED)
    expect(blocked.body.error?.message).toContain('Tente novamente')
  })

  it('com conta bloqueada, senha correta ainda não entra (403)', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: LOCKOUT_EMAIL,
      password: 'GoodPass1!',
    })
    expect(res.status).toBe(403)
    expect(res.body.error?.code).toBe(ErrorCodes.ACCOUNT_TEMPORARILY_LOCKED)
  })

  it('após expirar bloqueio, login correto limpa contador e autentica', async () => {
    await pool.query(
      `
      UPDATE app_users
      SET locked_until = now() - interval '1 minute'
      WHERE id = $1::uuid
      `,
      [LOCKOUT_USER_ID],
    )
    const res = await request(app).post('/api/v1/auth/login').send({
      email: LOCKOUT_EMAIL,
      password: 'GoodPass1!',
    })
    expect(res.status).toBe(200)
    const row = await pool.query<{ c: string; l: Date | null }>(
      `SELECT failed_login_count::text AS c, locked_until AS l FROM app_users WHERE id = $1::uuid`,
      [LOCKOUT_USER_ID],
    )
    expect(row.rows[0]?.c).toBe('0')
    expect(row.rows[0]?.l).toBeNull()
  })

  it('e-mail inexistente não altera contador do utilizador de teste', async () => {
    const before = await pool.query<{ c: string }>(
      `SELECT failed_login_count::text AS c FROM app_users WHERE id = $1::uuid`,
      [LOCKOUT_USER_ID],
    )
    const c0 = before.rows[0]?.c
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'nope-not-there@sgp-argos.local',
      password: 'x',
    })
    expect(res.status).toBe(401)
    const after = await pool.query<{ c: string }>(
      `SELECT failed_login_count::text AS c FROM app_users WHERE id = $1::uuid`,
      [LOCKOUT_USER_ID],
    )
    expect(after.rows[0]?.c).toBe(c0)
  })
})
