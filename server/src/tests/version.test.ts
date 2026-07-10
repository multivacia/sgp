import { afterEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import type pg from 'pg'
import { createApp } from '../app.js'
import type { Env } from '../config/env.js'
import { createLogger } from '../plugins/logger.js'

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
  query: vi.fn(async () => ({ rows: [], rowCount: 0 })),
} as unknown as pg.Pool

const originalEnv = {
  APP_VERSION: process.env.APP_VERSION,
  APP_RELEASE_NAME: process.env.APP_RELEASE_NAME,
  APP_ENV: process.env.APP_ENV,
  GIT_SHA: process.env.GIT_SHA,
  BUILD_TIME: process.env.BUILD_TIME,
}

afterEach(() => {
  process.env.APP_VERSION = originalEnv.APP_VERSION
  process.env.APP_RELEASE_NAME = originalEnv.APP_RELEASE_NAME
  process.env.APP_ENV = originalEnv.APP_ENV
  process.env.GIT_SHA = originalEnv.GIT_SHA
  process.env.BUILD_TIME = originalEnv.BUILD_TIME
  vi.clearAllMocks()
})

describe('version endpoint', () => {
  it('GET /api/v1/version retorna envelope público sem usar banco', async () => {
    process.env.APP_VERSION = '9.9.9'
    process.env.APP_RELEASE_NAME = 'release-test'
    process.env.APP_ENV = 'homologation'
    process.env.GIT_SHA = 'abc123def456'
    process.env.BUILD_TIME = '2026-07-09T22:37:00Z'

    const app = createApp(mockPool, createLogger('silent'), baseEnv)
    const response = await request(app).get('/api/v1/version')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        product: 'SGP+',
        version: '9.9.9',
        releaseName: 'release-test',
        environment: 'homologation',
        buildTime: '2026-07-09T22:37:00Z',
        commit: 'abc123def456',
      },
      meta: {
        public: true,
      },
    })
    expect(mockPool.query).not.toHaveBeenCalled()
  })
})
