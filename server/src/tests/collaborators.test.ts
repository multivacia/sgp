import { randomUUID } from 'node:crypto'
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
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

/** Seed `0001_seed_base.sql` */
const SEED_COLLAB_ID = '3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c'
const SEED_SECTOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const SEED_ROLE_ID = '22222222-2222-2222-2222-222222222222'

const MARIA_APP_USER_ID = '44444444-4444-4444-4444-444444444444'
const MARIA_EMAIL = 'maria@exemplo.com'

/** Utilizador com papel ADMIN para mutações legadas em `/collaborators`. */
const GOV_ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const GOV_ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'

/** Apenas COLABORADOR — sem permissão de governança. */
const COLAB_ONLY_USER_ID = '66666666-6666-6666-6666-666666666666'
const COLAB_ONLY_EMAIL = 'colaborador-only@sgp-argos.local'

describe.skipIf(!hasDb)('collaborators (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    await ensureMariaCollaboratorSeedForIntegration(pool)
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
  })

  it('GET /api/v1/collaborators sem sessão → 401', async () => {
    const res = await request(app).get('/api/v1/collaborators')
    expect(res.status).toBe(401)
  })

  it('GET /api/v1/collaborators retorna lista e meta.total', async () => {
    const res = await request(app)
      .get('/api/v1/collaborators')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(typeof res.body.meta?.total).toBe('number')
  })

  it('GET /api/v1/collaborators?search=Maria filtra', async () => {
    const res = await request(app)
      .get('/api/v1/collaborators')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    const total = res.body.meta?.total as number
    if (total === 0) return
    const r2 = await request(app)
      .get('/api/v1/collaborators?search=Maria')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(r2.status).toBe(200)
    expect(r2.body.data.length).toBeLessThanOrEqual(total)
  })

  it('GET /api/v1/collaborators com search em cargo/setor/perfil (ILIKE)', async () => {
    const byJob = await request(app)
      .get('/api/v1/collaborators?search=Costureira')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(byJob.status).toBe(200)
    const byRole = await request(app)
      .get('/api/v1/collaborators?search=Colaborador')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(byRole.status).toBe(200)
  })

  it('GET /api/v1/collaborators?status=ACTIVE', async () => {
    const res = await request(app)
      .get('/api/v1/collaborators?status=ACTIVE')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    for (const row of res.body.data) {
      expect(row.status).toBe('ACTIVE')
    }
  })

  it('GET /api/v1/collaborators?sector_id filtra por setor', async () => {
    const res = await request(app)
      .get(`/api/v1/collaborators?sector_id=${SEED_SECTOR_ID}`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(res.status).toBe(200)
    for (const row of res.body.data) {
      expect(row.sector_id).toBe(SEED_SECTOR_ID)
    }
  })

  it('GET /api/v1/collaborators?sector_id=abc retorna 422', async () => {
    const res = await request(app)
      .get('/api/v1/collaborators?sector_id=abc')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(res.status).toBe(422)
    expect(res.body.error?.code).toBe('VALIDATION_ERROR')
  })

  it('GET /api/v1/collaborators?status=FOO retorna 422', async () => {
    const res = await request(app)
      .get('/api/v1/collaborators?status=FOO')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(res.status).toBe(422)
    expect(res.body.error?.code).toBe('VALIDATION_ERROR')
  })

  it('GET /api/v1/collaborators/:id sucesso', async () => {
    const res = await request(app)
      .get(`/api/v1/collaborators/${SEED_COLLAB_ID}`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(res.status).toBe(200)
    expect(res.body.data?.id).toBe(SEED_COLLAB_ID)
  })

  it('GET /api/v1/collaborators/:id 404', async () => {
    const res = await request(app)
      .get('/api/v1/collaborators/00000000-0000-0000-0000-000000000099')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(res.status).toBe(404)
    expect(res.body.error?.code).toBe('NOT_FOUND')
  })

  it('GET /api/v1/collaborators/:collaboratorId/operational-health-snapshot sem sessão → 401', async () => {
    const res = await request(app).get(
      `/api/v1/collaborators/${SEED_COLLAB_ID}/operational-health-snapshot`,
    )
    expect(res.status).toBe(401)
  })

  it('GET operational-health-snapshot colaborador inexistente → 404', async () => {
    const res = await request(app)
      .get(
        '/api/v1/collaborators/00000000-0000-0000-0000-000000000099/operational-health-snapshot',
      )
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(res.status).toBe(404)
    expect(res.body.error?.code).toBe('NOT_FOUND')
  })

  it('GET operational-health-snapshot sucesso (envelope + capacity.source em maiúsculas)', async () => {
    const res = await request(app)
      .get(
        `/api/v1/collaborators/${SEED_COLLAB_ID}/operational-health-snapshot?referenceDate=2026-04-28&recentDays=3`,
      )
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(res.status).toBe(200)
    const d = res.body.data
    expect(d?.snapshotVersion).toBe('collaborator_operational_health_snapshot_v1')
    expect(d?.schemaVersion).toBe('1.0.1')
    expect(d?.referenceDate).toBe('2026-04-28')
    expect(d?.recentDays).toBe(3)
    expect(d?.collaborator?.id).toBe(SEED_COLLAB_ID)
    expect(typeof d?.collaborator?.isActive).toBe('boolean')
    expect(['OVERRIDE', 'DEFAULT', 'FALLBACK', 'MISSING']).toContain(d?.capacity?.source)
    expect(typeof d?.capacity?.resolvedDailyMinutes).toBe('number')
    expect(d?.capacity?.windowCapacityMinutes).toBe(
      d.capacity.resolvedDailyMinutes * 3,
    )
    expect(d?.recentTimeEntries?.windowFrom).toBe('2026-04-26T00:00:00.000Z')
    expect(d?.recentTimeEntries?.windowToExclusive).toBe('2026-04-29T00:00:00.000Z')
    expect(d?.workload?.openDistinctSteps).toBeTypeOf('number')
    expect(Array.isArray(d?.dataQuality?.warnings)).toBe(true)
    for (const w of d.dataQuality.warnings as { code: string; message: string }[]) {
      expect(w).toEqual({ code: w.code, message: w.message })
    }
  })

  it('GET operational-health-snapshot colaborador novo sem esteiras → NO_OPEN_ASSIGNMENTS', async () => {
    const code = `COL-OH-${randomUUID().slice(0, 8)}`
    const post = await request(app)
      .post('/api/v1/collaborators')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({
        fullName: `Snapshot OH vazio ${code}`,
        code,
        sectorId: SEED_SECTOR_ID,
        roleId: SEED_ROLE_ID,
      })
    expect(post.status).toBe(201)
    const id = post.body.data?.id as string
    const snap = await request(app)
      .get(`/api/v1/collaborators/${id}/operational-health-snapshot?referenceDate=2026-04-28`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
    expect(snap.status).toBe(200)
    const codes = (snap.body.data?.dataQuality?.warnings ?? []).map(
      (w: { code: string }) => w.code,
    )
    expect(codes).toContain('NO_OPEN_ASSIGNMENTS')
  })

  it('GET operational-health-snapshot colaborador inativo → COLLABORATOR_INACTIVE', async () => {
    const code = `COL-OH-IN-${randomUUID().slice(0, 8)}`
    const post = await request(app)
      .post('/api/v1/collaborators')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({
        fullName: `Snapshot OH inativo ${code}`,
        code,
        sectorId: SEED_SECTOR_ID,
        roleId: SEED_ROLE_ID,
      })
    expect(post.status).toBe(201)
    const id = post.body.data?.id as string
    const inact = await request(app)
      .post(`/api/v1/collaborators/${id}/inactivate`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
    expect(inact.status).toBe(200)
    const snap = await request(app)
      .get(`/api/v1/collaborators/${id}/operational-health-snapshot`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
    expect(snap.status).toBe(200)
    expect(snap.body.data?.collaborator?.isActive).toBe(false)
    const codes = (snap.body.data?.dataQuality?.warnings ?? []).map(
      (w: { code: string }) => w.code,
    )
    expect(codes).toContain('COLLABORATOR_INACTIVE')
    expect(codes).toContain('NO_OPEN_ASSIGNMENTS')
  })

  it('GET /api/v1/collaborators/operational-health-summary sem sessão → 401', async () => {
    const res = await request(app).get('/api/v1/collaborators/operational-health-summary')
    expect(res.status).toBe(401)
  })

  it('GET operational-health-summary sucesso (contrato compacto + meta)', async () => {
    const res = await request(app)
      .get(
        '/api/v1/collaborators/operational-health-summary?limit=2&referenceDate=2026-04-28&recentDays=3',
      )
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(res.status).toBe(200)
    const d = res.body.data
    expect(d?.summaryVersion).toBe('collaborator_operational_health_summary_v1')
    expect(d?.schemaVersion).toBe('1.0.0')
    expect(d?.referenceDate).toBe('2026-04-28')
    expect(d?.recentDays).toBe(3)
    expect(d?.totals?.collaboratorsAnalyzed).toBe(d?.rows?.length ?? 0)
    expect(res.body.meta?.limit).toBe(2)
    expect(res.body.meta?.returned).toBeLessThanOrEqual(2)
    expect(typeof res.body.meta?.hasMore).toBe('boolean')
    const row0 = d?.rows?.[0] as
      | {
          collaborator: { fullName: string }
          deterministicStatus: { status: string; score: number }
          signals: unknown[]
          dataQuality: { warnings: unknown[] }
        }
      | undefined
    if (row0) {
      expect(row0.collaborator.fullName.length).toBeGreaterThan(0)
      expect(['healthy', 'attention', 'critical', 'unknown']).toContain(
        row0.deterministicStatus.status,
      )
      expect(typeof row0.deterministicStatus.score).toBe('number')
      expect(Array.isArray(row0.signals)).toBe(true)
      expect(Array.isArray(row0.dataQuality.warnings)).toBe(true)
    }
  })

  it('POST /api/v1/collaborators com sessão COLABORADOR → 403', async () => {
    const res = await request(app)
      .post('/api/v1/collaborators')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, COLAB_ONLY_USER_ID, COLAB_ONLY_EMAIL),
      )
      .send({
        fullName: 'Sem permissão',
        code: `COL-${randomUUID().slice(0, 8)}`,
        sectorId: SEED_SECTOR_ID,
        roleId: SEED_ROLE_ID,
      })
    expect(res.status).toBe(403)
  })

  it('POST /api/v1/collaborators sucesso e PATCH', async () => {
    const code = `COL-IT-${randomUUID().slice(0, 8)}`
    const post = await request(app)
      .post('/api/v1/collaborators')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({
        fullName: `Integração Vitest ${code}`,
        code,
        sectorId: SEED_SECTOR_ID,
        roleId: SEED_ROLE_ID,
      })
    expect(post.status).toBe(201)
    const id = post.body.data?.id as string
    expect(id).toBeTruthy()

    const patch = await request(app)
      .patch(`/api/v1/collaborators/${id}`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ fullName: `Integração Vitest Atualizado ${code}` })
    expect(patch.status).toBe(200)
    expect(patch.body.data?.full_name).toBe(`Integração Vitest Atualizado ${code}`)
  })

  it('POST /api/v1/collaborators conflito de código → 409', async () => {
    const res = await request(app)
      .post('/api/v1/collaborators')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({
        fullName: 'Duplicado',
        code: 'COL-001',
        sectorId: SEED_SECTOR_ID,
        roleId: SEED_ROLE_ID,
      })
    expect(res.status).toBe(409)
    expect(res.body.error?.code).toBe('CONFLICT')
    expect(res.body.error?.message).toContain('código')
  })

  it('POST /api/v1/collaborators/:id/activate e inactivate', async () => {
    const code = `COL-ACT-${randomUUID().slice(0, 8)}`
    const post = await request(app)
      .post('/api/v1/collaborators')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({
        fullName: `Ciclo status ${code}`,
        code,
        sectorId: SEED_SECTOR_ID,
        roleId: SEED_ROLE_ID,
      })
    expect(post.status).toBe(201)
    const id = post.body.data?.id as string

    const inact = await request(app)
      .post(`/api/v1/collaborators/${id}/inactivate`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
    expect(inact.status).toBe(200)
    expect(inact.body.data?.status).toBe('INACTIVE')

    const act = await request(app)
      .post(`/api/v1/collaborators/${id}/activate`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
    expect(act.status).toBe(200)
    expect(act.body.data?.status).toBe('ACTIVE')
  })

  it('GET /api/v1/roles e /api/v1/sectors', async () => {
    const [r, s] = await Promise.all([
      request(app)
        .get('/api/v1/roles')
        .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      ),
      request(app)
        .get('/api/v1/sectors')
        .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      ),
    ])
    expect(r.status).toBe(200)
    expect(s.status).toBe(200)
    expect(Array.isArray(r.body.data)).toBe(true)
    expect(Array.isArray(s.body.data)).toBe(true)
  })

  it('rota inexistente → 404 envelope ROUTE_NOT_FOUND', async () => {
    const res = await request(app).get('/api/v1/nao-existe-rota-test')
    expect(res.status).toBe(404)
    expect(res.body.error?.code).toBe('ROUTE_NOT_FOUND')
    expect(res.body.error?.message).toBe('Rota não encontrada.')
    expect(res.body.error?.details).toEqual({})
  })
})
