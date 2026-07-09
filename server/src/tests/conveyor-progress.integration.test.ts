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

describe.skipIf(!hasDb)('GET /api/v1/management/conveyor-progress (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let adminCookie: string

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    adminCookie = await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL)
  })

  afterAll(async () => {
    await closePool()
  })

  it('sem cookie → 401', async () => {
    const res = await request(app).get('/api/v1/management/conveyor-progress')
    expect(res.status).toBe(401)
  })

  it('com sessão admin → 200 e envelope com items', async () => {
    const res = await request(app)
      .get('/api/v1/management/conveyor-progress')
      .set('Cookie', adminCookie)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(Array.isArray(res.body.data.items)).toBe(true)
    expect(res.body.data).toHaveProperty('summary.timeEfficiency')
    expect(res.body.data.summary.timeEfficiency).toHaveProperty('includedInCalculationCount')

    if (res.body.data.items.length > 0) {
      const first = res.body.data.items[0]
      expect(first).toHaveProperty('conveyorId')
      expect(first).toHaveProperty('plannedMinutes')
      expect(first).toHaveProperty('realizedMinutes')
      expect(first).toHaveProperty('remainingMinutes')
      expect(first).toHaveProperty('exceededMinutes')
      expect(first).toHaveProperty('progressPercent')
      expect(first).toHaveProperty('timeEfficiency')
      expect(first.timeEfficiency).toHaveProperty('includedInCalculationCount')
      expect(Array.isArray(first.tasks)).toBe(true)

      const firstActivity = first.tasks[0]?.sectors[0]?.activities[0]
      if (firstActivity) {
        expect(firstActivity).toHaveProperty('timeEfficiency')
        expect(firstActivity.timeEfficiency).toHaveProperty('status')
        expect(firstActivity.timeEfficiency).toHaveProperty('includedInCalculation')
      }
    }
  })

  it('onlyExceeded=true retorna apenas esteiras com excedente', async () => {
    const res = await request(app)
      .get('/api/v1/management/conveyor-progress?onlyExceeded=true')
      .set('Cookie', adminCookie)

    expect(res.status).toBe(200)
    for (const item of res.body.data.items) {
      expect(item.exceededMinutes).toBeGreaterThan(0)
    }
  })
})
