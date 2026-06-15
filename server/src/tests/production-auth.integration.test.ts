import jwt from 'jsonwebtoken'
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
import { sessionCookieForUser } from './sessionTestCookie.js'
import {
  productionSessionCookie,
  seedProductionPinForCollaborator,
  SEED_COLLABORATOR_MARIA_ID,
} from './productionTestHelpers.js'
import { PRODUCTION_JWT_SCOPE } from '../modules/production/production-auth.jwt.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const PROD_TEST_COLLAB_ID = '44444444-4444-4444-4444-444444444444'
const PROD_DISABLED_COLLAB_ID = '55555555-5555-5555-5555-555555555555'
const PROD_NO_CRED_COLLAB_ID = '77777777-7777-7777-7777-777777777777'
const PROD_MUST_CHANGE_COLLAB_ID = '88888888-8888-8888-8888-888888888888'
const SEED_ROLE_ID = '22222222-2222-2222-2222-222222222222'
const SEED_SECTOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const ADMIN_USER_ID = '99999999-9999-9999-9999-999999999999'
const ADMIN_EMAIL = 'production-auth-admin@sgp-argos.local'

describe.skipIf(!hasDb)('production auth (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let env: ReturnType<typeof loadEnv>

  beforeAll(async () => {
    env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)

    await pool.query(
      `
      INSERT INTO collaborators (
        id, code, full_name, email, sector_id, role_id, status, is_active
      ) VALUES
        ($1::uuid, 'COL-PROD-TEST', 'Colaborador Produção Teste', 'prod-test@sgp.local',
         $3::uuid, $4::uuid, 'ACTIVE', true),
        ($2::uuid, 'COL-PROD-OFF', 'Colaborador Produção Off', 'prod-off@sgp.local',
         $3::uuid, $4::uuid, 'INACTIVE', false),
        ($5::uuid, 'COL-PROD-NOCRED', 'Colaborador Sem Credencial', 'prod-nocred@sgp.local',
         $3::uuid, $4::uuid, 'ACTIVE', true),
        ($6::uuid, 'COL-PROD-MUSTCHG', 'Colaborador Troca PIN', 'prod-mustchg@sgp.local',
         $3::uuid, $4::uuid, 'ACTIVE', true)
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        status = EXCLUDED.status,
        is_active = EXCLUDED.is_active,
        deleted_at = NULL
      `,
      [
        PROD_TEST_COLLAB_ID,
        PROD_DISABLED_COLLAB_ID,
        SEED_SECTOR_ID,
        SEED_ROLE_ID,
        PROD_NO_CRED_COLLAB_ID,
        PROD_MUST_CHANGE_COLLAB_ID,
      ],
    )

    await seedProductionPinForCollaborator(pool, SEED_COLLABORATOR_MARIA_ID, '2468', true)
    await seedProductionPinForCollaborator(pool, PROD_TEST_COLLAB_ID, '1357', true)
    await seedProductionPinForCollaborator(pool, PROD_DISABLED_COLLAB_ID, '1357', true)
    await seedProductionPinForCollaborator(
      pool,
      PROD_MUST_CHANGE_COLLAB_ID,
      '1234',
      true,
      true,
    )

    await pool.query(
      `DELETE FROM collaborator_production_credentials WHERE collaborator_id = $1::uuid`,
      [PROD_NO_CRED_COLLAB_ID],
    )

    await pool.query(
      `
      UPDATE collaborator_production_credentials
      SET enabled = false
      WHERE collaborator_id = $1::uuid
      `,
      [PROD_DISABLED_COLLAB_ID],
    )

    const { hashPassword } = await import('../shared/password/password.js')
    const hash = await hashPassword('AdminProd1!')
    await pool.query(
      `
      INSERT INTO app_users (
        id, email, password_hash, is_active, role_id, must_change_password, password_changed_at
      ) VALUES ($1::uuid, $2, $3, true, $4::uuid, false, now())
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        is_active = true
      `,
      [ADMIN_USER_ID, ADMIN_EMAIL, hash, SEED_ROLE_ID],
    )
  })

  afterAll(async () => {
    await closePool()
  })

  it('tabelas de produção existem', async () => {
    const cred = await pool.query(
      `SELECT to_regclass('public.collaborator_production_credentials') AS t`,
    )
    const ev = await pool.query(
      `SELECT to_regclass('public.production_auth_events') AS t`,
    )
    expect(cred.rows[0]?.t).toBe('collaborator_production_credentials')
    expect(ev.rows[0]?.t).toBe('production_auth_events')
  })

  describe('GET /production/collaborators', () => {
    it('retorna lista mínima ordenada por nome (sem kiosk token configurado)', async () => {
      // Em dev/test PRODUCTION_KIOSK_TOKEN não está definido → rota aberta.
      const res = await request(app).get('/api/v1/production/collaborators')
      expect(res.status).toBe(200)
      const items = res.body.data.items as Array<Record<string, unknown>>
      expect(items.length).toBeGreaterThanOrEqual(2)
      const names = items.map((i) => i.fullName as string)
      const sorted = [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'))
      expect(names).toEqual(sorted)
      for (const item of items) {
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('fullName')
        expect(item).toHaveProperty('name')
        expect(item).toHaveProperty('displayName')
        expect(item).toHaveProperty('avatarUrl')
        expect(item).toHaveProperty('initials')
        expect(item).toHaveProperty('productionCredentialStatus')
        expect(item).not.toHaveProperty('email')
        expect(item).not.toHaveProperty('phone')
        expect(item).not.toHaveProperty('pin_hash')
        expect(item).not.toHaveProperty('pinHash')
        expect(item).not.toHaveProperty('userId')
      }
      const ids = items.map((i) => i.id)
      expect(ids).toContain(SEED_COLLABORATOR_MARIA_ID)
      expect(ids).toContain(PROD_TEST_COLLAB_ID)
      expect(ids).toContain(PROD_NO_CRED_COLLAB_ID)
      expect(ids).not.toContain(PROD_DISABLED_COLLAB_ID)

      const noCred = items.find((i) => i.id === PROD_NO_CRED_COLLAB_ID)
      expect(noCred?.productionCredentialStatus).toBe('NEEDS_INITIAL_PIN')
    })

    describe('com kiosk token configurado', () => {
      const KIOSK_TOKEN = 'sgp-kiosk-test-token-r1s3'

      let appWithKiosk: ReturnType<typeof createApp>

      beforeAll(() => {
        const envWithKiosk = { ...env, productionKioskToken: KIOSK_TOKEN }
        appWithKiosk = createApp(pool, createLogger('silent'), envWithKiosk)
      })

      it('header correto retorna a lista', async () => {
        const res = await request(appWithKiosk)
          .get('/api/v1/production/collaborators')
          .set('X-SGP-Kiosk-Token', KIOSK_TOKEN)
        expect(res.status).toBe(200)
        expect(Array.isArray(res.body.data.items)).toBe(true)
      })

      it('header ausente retorna 403 com código PRODUCTION_KIOSK_REQUIRED', async () => {
        const res = await request(appWithKiosk).get(
          '/api/v1/production/collaborators',
        )
        expect(res.status).toBe(403)
        expect(res.body.error?.code).toBe(ErrorCodes.PRODUCTION_KIOSK_REQUIRED)
        expect(res.body.data).toBeUndefined()
      })

      it('header incorreto retorna 403', async () => {
        const res = await request(appWithKiosk)
          .get('/api/v1/production/collaborators')
          .set('X-SGP-Kiosk-Token', 'token-errado')
        expect(res.status).toBe(403)
        expect(res.body.error?.code).toBe(ErrorCodes.PRODUCTION_KIOSK_REQUIRED)
      })

      it('não vaza detalhes internos na mensagem de erro', async () => {
        const res = await request(appWithKiosk).get(
          '/api/v1/production/collaborators',
        )
        expect(res.body.error?.message).toBe(
          'Este dispositivo não está autorizado para o modo produção.',
        )
        expect(res.body.error?.message).not.toContain(KIOSK_TOKEN)
      })
    })
  })

  describe('POST /production/auth/login', () => {
    it('login correto retorna 200, scope, status AUTHENTICATED e cookie de produção', async () => {
      const res = await request(app)
        .post('/api/v1/production/auth/login')
        .send({ collaboratorId: PROD_TEST_COLLAB_ID, pin: '1357' })
      expect(res.status).toBe(200)
      expect(res.body.data.scope).toBe('PRODUCTION_MODE')
      expect(res.body.data.status).toBe('AUTHENTICATED')
      expect(res.body.data.mustChangePin).toBe(false)
      expect(res.body.data.collaborator.id).toBe(PROD_TEST_COLLAB_ID)
      const setCookie = res.headers['set-cookie'] as string[] | undefined
      expect(setCookie?.some((c) => c.startsWith('sgp_production_auth='))).toBe(true)
      expect(setCookie?.some((c) => c.startsWith(`${env.authCookieName}=`))).toBeFalsy()
    })

    it('login com must_change_pin retorna PIN_CHANGE_REQUIRED', async () => {
      const res = await request(app)
        .post('/api/v1/production/auth/login')
        .send({ collaboratorId: PROD_MUST_CHANGE_COLLAB_ID, pin: '1234' })
      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('PIN_CHANGE_REQUIRED')
      expect(res.body.data.mustChangePin).toBe(true)
    })

    it('PIN errado retorna 401 genérico e incrementa failed_attempts', async () => {
      await pool.query(
        `
        UPDATE collaborator_production_credentials
        SET failed_attempts = 0, locked_until = NULL
        WHERE collaborator_id = $1::uuid
        `,
        [PROD_TEST_COLLAB_ID],
      )
      const res = await request(app)
        .post('/api/v1/production/auth/login')
        .send({ collaboratorId: PROD_TEST_COLLAB_ID, pin: '0000' })
      expect(res.status).toBe(401)
      expect(res.body.error?.code).toBe(ErrorCodes.PRODUCTION_PIN_INVALID)
      expect(res.body.error?.message).toContain('PIN inválido')
      const row = await pool.query<{ c: string }>(
        `SELECT failed_attempts::text AS c FROM collaborator_production_credentials WHERE collaborator_id = $1::uuid`,
        [PROD_TEST_COLLAB_ID],
      )
      expect(row.rows[0]?.c).toBe('1')
    })

    it('muitas falhas bloqueiam temporariamente', async () => {
      await pool.query(
        `
        UPDATE collaborator_production_credentials
        SET failed_attempts = 4, locked_until = NULL
        WHERE collaborator_id = $1::uuid
        `,
        [PROD_TEST_COLLAB_ID],
      )
      const res = await request(app)
        .post('/api/v1/production/auth/login')
        .send({ collaboratorId: PROD_TEST_COLLAB_ID, pin: '0000' })
      expect(res.status).toBe(403)
      expect(res.body.error?.code).toBe(ErrorCodes.PRODUCTION_PIN_LOCKED)
      await pool.query(
        `
        UPDATE collaborator_production_credentials
        SET failed_attempts = 0, locked_until = NULL
        WHERE collaborator_id = $1::uuid
        `,
        [PROD_TEST_COLLAB_ID],
      )
    })

    it('colaborador inativo ou credencial disabled falham com mensagem genérica', async () => {
      const inactive = await request(app)
        .post('/api/v1/production/auth/login')
        .send({ collaboratorId: PROD_DISABLED_COLLAB_ID, pin: '1357' })
      expect(inactive.status).toBe(401)
      expect(inactive.body.error?.code).toBe(ErrorCodes.PRODUCTION_PIN_INVALID)

      const missing = await request(app)
        .post('/api/v1/production/auth/login')
        .send({
          collaboratorId: '66666666-6666-6666-6666-666666666666',
          pin: '1234',
        })
      expect(missing.status).toBe(401)
      expect(missing.body.error?.code).toBe(ErrorCodes.PRODUCTION_PIN_INVALID)
    })

    it('grava eventos de sucesso e falha', async () => {
      await request(app)
        .post('/api/v1/production/auth/login')
        .send({ collaboratorId: SEED_COLLABORATOR_MARIA_ID, pin: '2468' })
      const success = await pool.query<{ n: string }>(
        `
        SELECT COUNT(*)::text AS n FROM production_auth_events
        WHERE collaborator_id = $1::uuid AND event_type = 'PRODUCTION_LOGIN_SUCCESS'
        `,
        [SEED_COLLABORATOR_MARIA_ID],
      )
      expect(Number(success.rows[0]?.n)).toBeGreaterThanOrEqual(1)
    })
  })

  async function resetProdTestCredentialLockout(): Promise<void> {
    await pool.query(
      `
      UPDATE collaborator_production_credentials
      SET failed_attempts = 0, locked_until = NULL
      WHERE collaborator_id = $1::uuid
      `,
      [PROD_TEST_COLLAB_ID],
    )
  }

  describe('GET /production/auth/session', () => {
    it('sem cookie retorna 401', async () => {
      const res = await request(app).get('/api/v1/production/auth/session')
      expect(res.status).toBe(401)
      expect(res.body.error?.code).toBe(ErrorCodes.PRODUCTION_AUTH_REQUIRED)
    })

    it('com cookie production válido retorna sessão', async () => {
      await resetProdTestCredentialLockout()
      const cookie = productionSessionCookie(PROD_TEST_COLLAB_ID)
      const res = await request(app)
        .get('/api/v1/production/auth/session')
        .set('Cookie', cookie)
      expect(res.status).toBe(200)
      expect(res.body.data.scope).toBe('PRODUCTION_MODE')
      expect(res.body.data.collaborator.id).toBe(PROD_TEST_COLLAB_ID)
    })

    it('cookie admin não autentica', async () => {
      const adminCookie = await sessionCookieForUser(
        pool,
        ADMIN_USER_ID,
        ADMIN_EMAIL,
      )
      const res = await request(app)
        .get('/api/v1/production/auth/session')
        .set('Cookie', adminCookie)
      expect(res.status).toBe(401)
    })

    it('JWT sem scope PRODUCTION_MODE é rejeitado', async () => {
      const badToken = jwt.sign(
        {
          sub: PROD_TEST_COLLAB_ID,
          scope: 'ADMIN',
          authAtMs: Date.now(),
          lastActMs: Date.now(),
        },
        env.productionJwtSecret,
        { expiresIn: '1h' },
      )
      const res = await request(app)
        .get('/api/v1/production/auth/session')
        .set('Cookie', `${env.productionAuthCookieName}=${badToken}`)
      expect(res.status).toBe(401)
      expect(res.body.error?.code).toBe(ErrorCodes.PRODUCTION_AUTH_INVALID)
    })
  })

  describe('POST /production/auth/logout', () => {
    it('limpa cookie production e não remove admin', async () => {
      await resetProdTestCredentialLockout()
      const login = await request(app)
        .post('/api/v1/production/auth/login')
        .send({ collaboratorId: PROD_TEST_COLLAB_ID, pin: '1357' })
      expect(login.status).toBe(200)
      const setCookie = login.headers['set-cookie']
      const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
      const prodCookie = cookies.find((c) => c.startsWith('sgp_production_auth='))!
      expect(prodCookie).toBeDefined()
      const adminCookie = await sessionCookieForUser(
        pool,
        ADMIN_USER_ID,
        ADMIN_EMAIL,
      )
      const res = await request(app)
        .post('/api/v1/production/auth/logout')
        .set('Cookie', [prodCookie, adminCookie])
      expect(res.status).toBe(204)
      const cleared = res.headers['set-cookie'] as string[] | undefined
      expect(cleared?.some((c) => c.startsWith('sgp_production_auth='))).toBe(true)

      const sessionAfter = await request(app)
        .get('/api/v1/production/auth/session')
        .set('Cookie', adminCookie)
      expect(sessionAfter.status).toBe(401)

      const adminMe = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', adminCookie)
      expect(adminMe.status).toBe(200)
    })

    it('logout idempotente sem sessão', async () => {
      const res = await request(app).post('/api/v1/production/auth/logout')
      expect(res.status).toBe(204)
    })
  })

  describe('POST /production/auth/change-pin', () => {
    async function loginMustChangeCollaborator(): Promise<string[]> {
      const login = await request(app)
        .post('/api/v1/production/auth/login')
        .send({ collaboratorId: PROD_MUST_CHANGE_COLLAB_ID, pin: '1234' })
      expect(login.status).toBe(200)
      const setCookie = login.headers['set-cookie']
      return Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
    }

    it('bloqueia fila enquanto must_change_pin = true', async () => {
      const cookies = await loginMustChangeCollaborator()
      const res = await request(app)
        .get('/api/v1/production/me/work-queue')
        .set('Cookie', cookies)
      expect(res.status).toBe(403)
      expect(res.body.error?.code).toBe(ErrorCodes.PRODUCTION_PIN_CHANGE_REQUIRED)
    })

    it('change-pin valida, rejeita 1234 e libera acesso', async () => {
      const cookies = await loginMustChangeCollaborator()

      const rejectDefault = await request(app)
        .post('/api/v1/production/auth/change-pin')
        .set('Cookie', cookies)
        .send({ newPin: '1234', confirmPin: '1234' })
      expect(rejectDefault.status).toBe(400)
      expect(rejectDefault.body.error?.code).toBe(
        ErrorCodes.PRODUCTION_DEFAULT_PIN_NOT_ALLOWED,
      )

      const change = await request(app)
        .post('/api/v1/production/auth/change-pin')
        .set('Cookie', cookies)
        .send({ newPin: '9876', confirmPin: '9876' })
      expect(change.status).toBe(204)

      const row = await pool.query<{ must_change_pin: boolean; pin_changed_at: Date | null }>(
        `
        SELECT must_change_pin, pin_changed_at
        FROM collaborator_production_credentials
        WHERE collaborator_id = $1::uuid
        `,
        [PROD_MUST_CHANGE_COLLAB_ID],
      )
      expect(row.rows[0]?.must_change_pin).toBe(false)
      expect(row.rows[0]?.pin_changed_at).not.toBeNull()

      const session = await request(app)
        .get('/api/v1/production/auth/session')
        .set('Cookie', cookies)
      expect(session.status).toBe(200)
      expect(session.body.data.mustChangePin).toBe(false)

      const queue = await request(app)
        .get('/api/v1/production/me/work-queue')
        .set('Cookie', cookies)
      expect(queue.status).toBe(200)

      const loginNewPin = await request(app)
        .post('/api/v1/production/auth/login')
        .send({ collaboratorId: PROD_MUST_CHANGE_COLLAB_ID, pin: '9876' })
      expect(loginNewPin.status).toBe(200)
      expect(loginNewPin.body.data.status).toBe('AUTHENTICATED')
    })
  })

  describe('isolamento admin ↔ produção', () => {
    it('cookie production não acessa /auth/me', async () => {
      const cookie = productionSessionCookie(PROD_TEST_COLLAB_ID)
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookie)
      expect(res.status).toBe(401)
    })

    it('admin JWT no cookie production não passa em requireProductionAuth', async () => {
      const adminCookie = await sessionCookieForUser(
        pool,
        ADMIN_USER_ID,
        ADMIN_EMAIL,
      )
      const token = adminCookie.split('=').slice(1).join('=')
      const res = await request(app)
        .get('/api/v1/production/auth/session')
        .set('Cookie', `${env.productionAuthCookieName}=${token}`)
      expect(res.status).toBe(401)
    })
  })
})

describe('production JWT scope constant', () => {
  it('scope fixo PRODUCTION_MODE', () => {
    expect(PRODUCTION_JWT_SCOPE).toBe('PRODUCTION_MODE')
  })
})
