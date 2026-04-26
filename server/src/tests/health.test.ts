import { describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import type pg from 'pg'
import { createApp } from '../app.js'
import { createLogger } from '../plugins/logger.js'
import type { Env } from '../config/env.js'

const baseEnv: Env = {
  nodeEnv: 'test',
  port: 4000,
  pgPoolConfig: { connectionString: 'postgres://localhost/test' },
  corsOrigin: '*',
  logLevel: 'error',
  jwtSecret: 'test-jwt-secret-minimum-16-chars',
  jwtExpiresDays: 7,
  authCookieName: 'sgp_auth',
  loginMaxFailedAttempts: 5,
  loginLockoutMinutes: 15,
  argosPolicyMode: 'balanced',
  argosIngestTimeoutMs: 120_000,
  documentDraftMaxFileBytes: 15 * 1024 * 1024,
  argosRemoteRequired: false,
  argosUseMinimalStub: false,
  supportEmailSubjectPrefix: '[SGP]',
  smtpPort: 587,
  smtpSecure: false,
  smtpRequireTls: true,
}

const mockPool = {
  query: vi.fn(async (sql: string) => {
    if (String(sql).includes('SELECT 1')) {
      return { rows: [{ ok: 1 }], rowCount: 1 }
    }
    return { rows: [], rowCount: 0 }
  }),
} as unknown as pg.Pool

const app = createApp(mockPool, createLogger('silent'), baseEnv)

const infraTokenValid = '01234567890123456789012345678901'
const infraTokenWrong = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'

const prodEnvWithInfraToken: Env = {
  ...baseEnv,
  nodeEnv: 'production',
  healthInfraToken: infraTokenValid,
}

const prodAppWithInfra = createApp(
  mockPool,
  createLogger('silent'),
  prodEnvWithInfraToken,
)

const prodEnvWithoutInfra: Env = {
  ...baseEnv,
  nodeEnv: 'production',
}

const prodAppWithoutInfra = createApp(
  mockPool,
  createLogger('silent'),
  prodEnvWithoutInfra,
)

describe('health', () => {
  it('GET /api/v1/health retorna envelope', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body.data?.ok).toBe(true)
    expect(res.body.meta).toBeDefined()
  })

  it('GET /api/v1/health/db consulta o pool (não-produção: público)', async () => {
    const res = await request(app).get('/api/v1/health/db')
    expect(res.status).toBe(200)
    expect(res.body.data?.database).toBe('connected')
    expect(mockPool.query).toHaveBeenCalled()
  })

  it('produção sem HEALTH_INFRA_TOKEN: GET /health/db sem sessão → 401', async () => {
    const res = await request(prodAppWithoutInfra).get('/api/v1/health/db')
    expect(res.status).toBe(401)
  })

  it('produção com HEALTH_INFRA_TOKEN: GET /health/db com X-SGP-Infra-Token válido → 200', async () => {
    const res = await request(prodAppWithInfra)
      .get('/api/v1/health/db')
      .set('X-SGP-Infra-Token', infraTokenValid)
    expect(res.status).toBe(200)
    expect(res.body.data?.database).toBe('connected')
  })

  it('produção com HEALTH_INFRA_TOKEN: sem header → 401', async () => {
    const res = await request(prodAppWithInfra).get('/api/v1/health/db')
    expect(res.status).toBe(401)
  })

  it('produção com HEALTH_INFRA_TOKEN: token inválido → 401', async () => {
    const res = await request(prodAppWithInfra)
      .get('/api/v1/health/db')
      .set('X-SGP-Infra-Token', infraTokenWrong)
    expect(res.status).toBe(401)
  })

  it('GET /api/v1/health permanece 200 em app produção', async () => {
    const res = await request(prodAppWithInfra).get('/api/v1/health')
    expect(res.status).toBe(200)
  })
})
