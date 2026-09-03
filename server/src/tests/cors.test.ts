import { describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import type pg from 'pg'
import { createApp } from '../app.js'
import { createLogger } from '../plugins/logger.js'
import { corsOptions } from '../config/cors.js'
import type { Env } from '../config/env.js'

const ALLOWED_ORIGIN = 'http://localhost:5173'

const baseEnv: Env = {
  nodeEnv: 'test',
  port: 4000,
  pgPoolConfig: { connectionString: 'postgres://localhost/test' },
  corsOrigin: ALLOWED_ORIGIN,
  logLevel: 'error',
  jwtSecret: 'test-jwt-secret-minimum-16-chars',
  jwtExpiresDays: 7,
  authCookieName: 'sgp_auth',
  loginMaxFailedAttempts: 5,
  loginLockoutMinutes: 15,
  argosPolicyMode: 'balanced',
  argosIngestTimeoutMs: 120_000,
  documentDraftAdapter: 'local',
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

describe('corsOptions', () => {
  it('mantém origin, credentials, methods e allowedHeaders inalterados (regressão)', () => {
    const options = corsOptions(ALLOWED_ORIGIN)
    expect(options.origin).toBe(ALLOWED_ORIGIN)
    expect(options.credentials).toBe(true)
    expect(options.methods).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])
    expect(options.allowedHeaders).toEqual([
      'Content-Type',
      'Authorization',
      'X-User-Email',
      'Idempotency-Key',
    ])
  })

  it('expõe Content-Disposition ao navegador', () => {
    const options = corsOptions(ALLOWED_ORIGIN)
    expect(options.exposedHeaders).toEqual(['Content-Disposition'])
  })
})

describe('CORS em requisição real (app)', () => {
  it('GET com Origin permitido: Access-Control-Expose-Headers inclui Content-Disposition', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', ALLOWED_ORIGIN)
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN)
    expect(res.headers['access-control-allow-credentials']).toBe('true')
    expect(res.headers['access-control-expose-headers']).toContain('Content-Disposition')
  })

  it('preflight OPTIONS: Access-Control-Allow-Methods/Headers permanecem como configurado (regressão)', async () => {
    const res = await request(app)
      .options('/api/v1/health')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'Content-Type')
    expect(res.status).toBeLessThan(400)
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN)
    const allowedMethods = String(res.headers['access-control-allow-methods'] ?? '')
    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
      expect(allowedMethods).toContain(method)
    }
    const allowedHeaders = String(res.headers['access-control-allow-headers'] ?? '')
    for (const header of ['Content-Type', 'Authorization', 'X-User-Email', 'Idempotency-Key']) {
      expect(allowedHeaders).toContain(header)
    }
  })
})
