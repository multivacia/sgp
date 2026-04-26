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

const GOV_ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const GOV_ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'

const COLAB_ONLY_USER_ID = '66666666-6666-6666-6666-666666666666'
const COLAB_ONLY_EMAIL = 'colaborador-only@sgp-argos.local'
const SEED_ROLE_ID = '22222222-2222-2222-2222-222222222222'

const RESET_TARGET_ID = '77777777-7777-7777-7777-777777777777'
const RESET_TARGET_EMAIL = 'reset-gov-target@sgp-argos.local'

describe.skipIf(!hasDb)('governança de senha (admin reset + change-password)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    const hash = await hashPassword('InitialGovTarget1!')
    await pool.query(
      `INSERT INTO app_users (
          id, email, password_hash, is_active, role_id, must_change_password, password_changed_at
        ) VALUES (
          $1::uuid, $2, $3, true, $4::uuid, false, now()
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          is_active = true,
          role_id = EXCLUDED.role_id,
          must_change_password = false`,
      [RESET_TARGET_ID, RESET_TARGET_EMAIL, hash, SEED_ROLE_ID],
    )
  })

  afterAll(async () => {
    await closePool()
  })

  it('POST /admin/users/:id/reset-password (governança) devolve senha temporária e mustChangePassword', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/users/${RESET_TARGET_ID}/reset-password`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
    expect(res.status).toBe(200)
    expect(res.body.data?.temporaryPassword).toBeTruthy()
    expect(typeof res.body.data.temporaryPassword).toBe('string')
    expect(res.body.data.mustChangePassword).toBe(true)
    expect(res.body.data.user?.email).toBe(RESET_TARGET_EMAIL)
  })

  it('utilizador resetado autentica com senha temporária e mustChangePassword no login', async () => {
    const temp = (
      await request(app)
        .post(`/api/v1/admin/users/${RESET_TARGET_ID}/reset-password`)
        .set(
          'Cookie',
          await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
        )
    ).body.data.temporaryPassword as string

    const login = await request(app).post('/api/v1/auth/login').send({
      email: RESET_TARGET_EMAIL,
      password: temp,
    })
    expect(login.status).toBe(200)
    expect(login.body.data?.user?.mustChangePassword).toBe(true)

    const newPass = 'VoluntaryChange2!x'
    const cookie = login.headers['set-cookie'] as string[] | undefined
    const change = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Cookie', cookie ?? [])
      .send({
        currentPassword: temp,
        newPassword: newPass,
        confirmPassword: newPass,
      })
    expect(change.status).toBe(200)
    expect(change.body.data?.user?.mustChangePassword).toBe(false)

    const cookieAfterChange = change.headers['set-cookie'] as
      | string[]
      | undefined
    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', cookieAfterChange ?? [])
    expect(me.status).toBe(200)
    expect(me.body.data?.user?.mustChangePassword).toBe(false)

    await pool.query(
      `UPDATE app_users SET password_hash = $2, must_change_password = false, password_changed_at = now()
       WHERE id = $1::uuid`,
      [RESET_TARGET_ID, await hashPassword('InitialGovTarget1!')],
    )
  })

  it('POST /admin/users/:id/reset-password sem governança → 403', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/users/${RESET_TARGET_ID}/reset-password`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, COLAB_ONLY_USER_ID, COLAB_ONLY_EMAIL),
      )
    expect(res.status).toBe(403)
  })

  it('POST /admin/users/:id/reset-password para a própria conta → 422', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/users/${GOV_ADMIN_USER_ID}/reset-password`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
    expect(res.status).toBe(422)
  })

  it('GET /auth/me com cookie anterior à troca de senha → 401 SESSION_REVOKED_CREDENTIALS_CHANGED', async () => {
    const pwd = 'StaleCookieTest1!z'
    await pool.query(
      `
      UPDATE app_users
      SET
        password_hash = $2,
        password_changed_at = now(),
        must_change_password = false
      WHERE id = $1::uuid
      `,
      [RESET_TARGET_ID, await hashPassword(pwd)],
    )

    const login = await request(app).post('/api/v1/auth/login').send({
      email: RESET_TARGET_EMAIL,
      password: pwd,
    })
    expect(login.status).toBe(200)
    const cookieAfterLogin = login.headers['set-cookie'] as string[] | undefined

    const newPass = 'StaleCookieTest2!z'
    const change = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Cookie', cookieAfterLogin ?? [])
      .send({
        currentPassword: pwd,
        newPassword: newPass,
        confirmPassword: newPass,
      })
    expect(change.status).toBe(200)

    const stale = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', cookieAfterLogin ?? [])
    expect(stale.status).toBe(401)
    expect(stale.body.error?.code).toBe('SESSION_REVOKED_CREDENTIALS_CHANGED')

    const fresh = await request(app)
      .get('/api/v1/auth/me')
      .set(
        'Cookie',
        (change.headers['set-cookie'] as string[] | undefined) ?? [],
      )
    expect(fresh.status).toBe(200)

    await pool.query(
      `UPDATE app_users SET password_hash = $2, must_change_password = false, password_changed_at = now()
       WHERE id = $1::uuid`,
      [RESET_TARGET_ID, await hashPassword('InitialGovTarget1!')],
    )
  })

  it('GET /auth/me após reset administrativo: sessão anterior da vítima → 401', async () => {
    const pwd = 'VictimBeforeReset1!a'
    await pool.query(
      `
      UPDATE app_users
      SET
        password_hash = $2,
        password_changed_at = now(),
        must_change_password = false
      WHERE id = $1::uuid
      `,
      [RESET_TARGET_ID, await hashPassword(pwd)],
    )

    const victim = await request(app).post('/api/v1/auth/login').send({
      email: RESET_TARGET_EMAIL,
      password: pwd,
    })
    expect(victim.status).toBe(200)
    const victimCookie = victim.headers['set-cookie'] as string[] | undefined

    await request(app)
      .post(`/api/v1/admin/users/${RESET_TARGET_ID}/reset-password`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )

    const stale = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', victimCookie ?? [])
    expect(stale.status).toBe(401)
    expect(stale.body.error?.code).toBe('SESSION_REVOKED_CREDENTIALS_CHANGED')

    await pool.query(
      `UPDATE app_users SET password_hash = $2, must_change_password = false, password_changed_at = now()
       WHERE id = $1::uuid`,
      [RESET_TARGET_ID, await hashPassword('InitialGovTarget1!')],
    )
  })
})
