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
import { sessionCookieForUser } from './sessionTestCookie.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const GOV_ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const GOV_ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'
const COLAB_ONLY_USER_ID = '66666666-6666-6666-6666-666666666666'
const COLAB_ONLY_EMAIL = 'colaborador-only@sgp-argos.local'
const SEED_ROLE_COLAB_ID = '22222222-2222-2222-2222-222222222222'
const GESTOR_ROLE_ID = '33333333-3333-3333-3333-333333333333'
const GESTOR_USER_ID = '88888888-8888-8888-8888-888888888888'
const GESTOR_EMAIL = 'gestor-rbac-test@sgp-argos.local'

describe.skipIf(!hasDb)('GET /api/v1/dashboard (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
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
      [COLAB_ONLY_USER_ID, COLAB_ONLY_EMAIL, hash, SEED_ROLE_COLAB_ID],
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

  describe('auth', () => {
    it('GET /dashboard/operational sem sessão → 401', async () => {
      const res = await request(app).get('/api/v1/dashboard/operational')
      expect(res.status).toBe(401)
      expect(res.body.error?.code).toBeDefined()
    })

    it('GET /dashboard/executive sem sessão → 401', async () => {
      const res = await request(app).get('/api/v1/dashboard/executive')
      expect(res.status).toBe(401)
    })

    it('GET /dashboard/operational com papel COLABORADOR → 403', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/operational')
        .set(
          'Cookie',
          await sessionCookieForUser(pool, COLAB_ONLY_USER_ID, COLAB_ONLY_EMAIL),
        )
      expect(res.status).toBe(403)
    })

    it('GET /dashboard/executive com papel GESTOR → 403 (só ADMIN)', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/executive')
        .set(
          'Cookie',
          await sessionCookieForUser(pool, GESTOR_USER_ID, GESTOR_EMAIL),
        )
      expect(res.status).toBe(403)
    })

    it('GET /dashboard/operational com papel GESTOR → 200', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/operational')
        .set(
          'Cookie',
          await sessionCookieForUser(pool, GESTOR_USER_ID, GESTOR_EMAIL),
        )
      expect(res.status).toBe(200)
    })
  })

  describe('operational', () => {
    it('envelope e estrutura principais', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/operational')
        .set(
          'Cookie',
          await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
        )

      expect(res.status).toBe(200)
      expect(res.body.data).toBeDefined()
      expect(res.body.meta).toBeDefined()

      const d = res.body.data
      expect(typeof d.meta?.generatedAt).toBe('string')
      expect(d.meta?.scope).toBe('snapshot_atual')
      expect(d.meta?.bucketRule).toBe('shared_operationalBucket_ts')

      expect(d.conveyorsByBucket).toBeDefined()
      for (const k of ['no_backlog', 'em_revisao', 'em_andamento', 'em_atraso', 'concluidas']) {
        expect(typeof d.conveyorsByBucket[k]).toBe('number')
      }

      expect(d.assignees).toMatchObject({
        totalAllocations: expect.any(Number),
        primaryAllocations: expect.any(Number),
        supportAllocations: expect.any(Number),
      })

      expect(d.plannedVsRealized).toMatchObject({
        plannedMinutesConveyorTotal: expect.any(Number),
        plannedMinutesStepNodes: expect.any(Number),
        realizedMinutesTotal: expect.any(Number),
        notes: expect.any(String),
      })

      expect(Array.isArray(d.overdueHighlight)).toBe(true)
      expect(Array.isArray(d.collaboratorLoad)).toBe(true)
      expect(Array.isArray(d.recentTimeEntries)).toBe(true)
    })
  })

  describe('executive', () => {
    it('days na query define meta.completedWithinDays e totals', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/executive')
        .query({ days: 7 })
        .set(
          'Cookie',
          await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
        )

      expect(res.status).toBe(200)
      const d = res.body.data
      expect(d.meta.completedWithinDays).toBe(7)
      expect(d.meta.scope).toContain('7')
      expect(typeof d.totals.activeConveyors).toBe('number')
      expect(typeof d.totals.completedInWindow).toBe('number')
      expect(typeof d.totals.overdueConveyors).toBe('number')
      expect(
        d.totals.delayRateVsActive === null || typeof d.totals.delayRateVsActive === 'number',
      ).toBe(true)
      expect(Array.isArray(d.topOverdueConveyors)).toBe(true)
      expect(d.plannedVsRealized).toMatchObject({
        plannedMinutesConveyorTotal: expect.any(Number),
        plannedMinutesStepNodes: expect.any(Number),
        realizedMinutesTotal: expect.any(Number),
        notes: expect.any(String),
      })
    })

    it('omitindo days usa default 30 (schema)', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/executive')
        .set(
          'Cookie',
          await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
        )

      expect(res.status).toBe(200)
      expect(res.body.data.meta.completedWithinDays).toBe(30)
    })

    it('days fora de 1–365 → 422 (Zod)', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/executive')
        .query({ days: 400 })
        .set(
          'Cookie',
          await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
        )

      expect(res.status).toBe(422)
      expect(res.body.error?.code).toBe(ErrorCodes.VALIDATION_ERROR)
    })
  })
})
