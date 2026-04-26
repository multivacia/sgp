import { describe, expect, it, beforeAll, afterAll } from 'vitest'
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
import { hashPassword } from '../shared/password/password.js'
import { sessionCookieForUser } from './sessionTestCookie.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const GOV_ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const GOV_ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'

const COLAB_ONLY_USER_ID = '66666666-6666-6666-6666-666666666666'
const COLAB_ONLY_EMAIL = 'colaborador-only@sgp-argos.local'
/** Papel apenas colaborador (seed). */
const SEED_ROLE_ID = '22222222-2222-2222-2222-222222222222'

function envelopeValid() {
  return JSON.stringify({
    caller: { systemId: 'sgp-integration-test' },
    policy: {},
    intent: 'conveyor_draft_from_document',
  })
}

describe.skipIf(!hasDb)('POST /api/v1/conveyors/document-draft (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  beforeAll(async () => {
    process.env.SGP_TEST_LOCAL_DOCUMENT_ADAPTER = '1'
    resetEnvCacheForTests()
    const env = loadEnv()
    expect(env.argosIngestUrl).toBeUndefined()
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
      [COLAB_ONLY_USER_ID, COLAB_ONLY_EMAIL, hash, SEED_ROLE_ID],
    )
  })

  afterAll(async () => {
    await closePool()
    delete process.env.SGP_TEST_LOCAL_DOCUMENT_ADAPTER
    resetEnvCacheForTests()
  })

  it('sem sessão → 401', async () => {
    const res = await request(app)
      .post('/api/v1/conveyors/document-draft')
      .field('envelope', envelopeValid())
      .attach('file', Buffer.from('%PDF-1.4 stub'), 'os.pdf')
    expect(res.status).toBe(401)
  })

  it('COLAB_ONLY sem conveyors.create → 403', async () => {
    const res = await request(app)
      .post('/api/v1/conveyors/document-draft')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, COLAB_ONLY_USER_ID, COLAB_ONLY_EMAIL),
      )
      .field('envelope', envelopeValid())
      .attach('file', Buffer.from('%PDF-1.4 stub'), 'os.pdf')
    expect(res.status).toBe(403)
    expect(res.body.error?.code).toBe('FORBIDDEN')
  })

  it('GOV/ADMIN com permissão → 200 e pipeline local (draft 1.0.0)', async () => {
    const res = await request(app)
      .post('/api/v1/conveyors/document-draft')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .field('envelope', envelopeValid())
      .attach('file', Buffer.from('%PDF-1.4 stub'), 'os.pdf')

    expect(res.status).toBe(200)
    expect(res.body.meta?.documentDraftExecutionMode).toBe('local')
    const d = res.body.data
    expect(['completed', 'partial']).toContain(d.status)
    expect(d.strategy).toBe('local_heuristic_pipeline_v1')
    expect(d.specialist).toBe('sgp_argos_local_heuristic_v1')
    expect(d.draft?.schemaVersion).toBe('1.0.0')
    expect(d.document?.contentSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(Array.isArray(d.extractedFacts)).toBe(true)
    expect(Array.isArray(d.warnings)).toBe(true)
  })

  it('422 sem ficheiro', async () => {
    const res = await request(app)
      .post('/api/v1/conveyors/document-draft')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .field('envelope', envelopeValid())

    expect(res.status).toBe(422)
  })

  it('422 intent incorreto', async () => {
    const bad = JSON.stringify({
      caller: { systemId: 'x' },
      policy: {},
      intent: 'wrong_intent',
    })
    const res = await request(app)
      .post('/api/v1/conveyors/document-draft')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .field('envelope', bad)
      .attach('file', Buffer.from('x'), 'x.bin')

    expect(res.status).toBe(422)
  })
})
