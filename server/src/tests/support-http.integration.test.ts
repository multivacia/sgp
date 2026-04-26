import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { hasDatabaseConnectionInEnv, loadDotenvFiles, loadEnv, resetEnvCacheForTests } from '../config/env.js'
import { createLogger } from '../plugins/logger.js'
import { closePool, getPool } from '../plugins/db.js'
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import { hashPassword } from '../shared/password/password.js'

loadDotenvFiles()
const hasDb = hasDatabaseConnectionInEnv(process.env)

const MARIA_APP_USER_ID = '44444444-4444-4444-4444-444444444444'
const MARIA_EMAIL = 'maria@exemplo.com'
const USER2_ID = '77777777-7777-7777-7777-777777777777'
const USER2_EMAIL = 'support-user2@sgp-argos.local'
const COLLAB_ROLE_ID = '22222222-2222-2222-2222-222222222222'

describe.skipIf(!hasDb)('support http integration', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let supportTablesReady = false

  beforeAll(async () => {
    process.env.SUPPORT_TICKETS_ENABLED = '1'
    process.env.SUPPORT_EMAIL_ENABLED = '0'
    process.env.SUPPORT_WHATSAPP_ENABLED = '0'
    resetEnvCacheForTests()

    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    try {
      await pool.query('SELECT 1 FROM support_tickets LIMIT 1')
      supportTablesReady = true
    } catch {
      supportTablesReady = false
    }
    await ensureMariaCollaboratorSeedForIntegration(pool)
    const pwdHash = await hashPassword('SupportTestUser2#1')
    await pool.query(
      `
      INSERT INTO app_users (
        id, email, password_hash, is_active, role_id, must_change_password, password_changed_at
      ) VALUES (
        $1::uuid, $2, $3, true, $4::uuid, false, now()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        is_active = true,
        role_id = EXCLUDED.role_id,
        deleted_at = NULL
      `,
      [USER2_ID, USER2_EMAIL, pwdHash, COLLAB_ROLE_ID],
    )
  })

  afterAll(async () => {
    await closePool()
    delete process.env.SUPPORT_TICKETS_ENABLED
    delete process.env.SUPPORT_EMAIL_ENABLED
    delete process.env.SUPPORT_WHATSAPP_ENABLED
    resetEnvCacheForTests()
  })

  it('POST cria ticket e persiste tentativas por canal', async () => {
    if (!supportTablesReady) return
    const res = await request(app)
      .post('/api/v1/support/tickets')
      .set('Cookie', await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL))
      .send({
        category: 'OPERACAO',
        title: 'Não consigo concluir',
        description: 'Fluxo bloqueado para teste',
        isBlocking: true,
        moduleName: 'operation-matrix',
        routePath: '/app/matrizes-operacao/nova',
      })
    expect(res.status).toBe(201)
    expect(res.body.data?.code).toContain('CHM-')

    const ticketId = res.body.data.id as string
    const notif = await pool.query<{ channel: string; status: string }>(
      `
      SELECT channel, status
      FROM support_ticket_notifications
      WHERE ticket_id = $1::uuid
      ORDER BY created_at ASC
      `,
      [ticketId],
    )
    expect(notif.rows.length).toBeGreaterThan(0)
    expect(notif.rows.every((r) => ['FAILED', 'SKIPPED', 'SENT'].includes(r.status))).toBe(true)
  })

  it('GET /support/tickets retorna { items, total } e respeita filtro q', async () => {
    if (!supportTablesReady) return
    const uniqueTitle = `FiltroQ ${Date.now()}`
    await request(app)
      .post('/api/v1/support/tickets')
      .set('Cookie', await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL))
      .send({
        category: 'OPERACAO',
        title: uniqueTitle,
        description: 'para filtro q',
        isBlocking: false,
      })

    const res = await request(app)
      .get('/api/v1/support/tickets')
      .query({ q: uniqueTitle })
      .set('Cookie', await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL))
    expect(res.status).toBe(200)
    expect(res.body.data?.items).toBeDefined()
    expect(Array.isArray(res.body.data.items)).toBe(true)
    expect(res.body.data.total).toBeGreaterThanOrEqual(1)
    expect(res.body.data.items.some((t: { title: string }) => t.title === uniqueTitle)).toBe(true)
  })

  it('GET /my retorna apenas tickets do usuário logado', async () => {
    if (!supportTablesReady) return
    const mariaCreate = await request(app)
      .post('/api/v1/support/tickets')
      .set('Cookie', await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL))
      .send({
        category: 'OPERACAO',
        title: `Ticket Maria ${Date.now()}`,
        description: 'ticket maria',
        isBlocking: false,
      })
    expect(mariaCreate.status).toBe(201)

    const code2 = `CHM-${Date.now()}-${Math.floor(Math.random() * 9999)}`
    await pool.query(
      `
      INSERT INTO support_tickets (
        id, code, status, source, category, severity, title, description,
        created_by_user_id, created_by_collaborator_id, module_name, route_path, context_json
      )
      VALUES (
        $1::uuid, $2, 'OPEN', 'MANUAL', 'OPERACAO', 'MEDIUM', 'Outro usuário', 'externo',
        $3::uuid, NULL, 'shell', '/app/backlog', '{}'::jsonb
      )
      `,
      [randomUUID(), code2, USER2_ID],
    )

    const res = await request(app)
      .get('/api/v1/support/tickets/my')
      .set('Cookie', await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.some((t: { title: string }) => t.title === 'Outro usuário')).toBe(false)
  })

  it('GET /:id permite próprio e bloqueia terceiros (404)', async () => {
    if (!supportTablesReady) return
    const created = await request(app)
      .post('/api/v1/support/tickets')
      .set('Cookie', await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL))
      .send({
        category: 'OPERACAO',
        title: 'Ticket privado',
        description: 'só dono consulta',
        isBlocking: false,
      })
    const ticketId = created.body.data.id as string

    const own = await request(app)
      .get(`/api/v1/support/tickets/${ticketId}`)
      .set('Cookie', await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL))
    expect(own.status).toBe(200)
    expect(own.body.data.id).toBe(ticketId)

    const denied = await request(app)
      .get(`/api/v1/support/tickets/${ticketId}`)
      .set('Cookie', await sessionCookieForUser(pool, USER2_ID, USER2_EMAIL))
    expect(denied.status).toBe(404)
  })
})

describe.skipIf(!hasDb)('support feature flag off', () => {
  it('com SUPPORT_TICKETS_ENABLED=0 retorna resposta consistente sem quebrar outras rotas', async () => {
    if (!hasDb) return
    resetEnvCacheForTests()
    const baseEnv = loadEnv()
    const pool = getPool(baseEnv)
    /** `loadEnv()` chama dotenv com override; o `.env` local pode manter suporte ativo — forçamos off só no `app`. */
    const app = createApp(pool, createLogger('silent'), { ...baseEnv, supportTicketsEnabled: false })

    const supportRes = await request(app)
      .post('/api/v1/support/tickets')
      .set('Cookie', await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL))
      .send({
        category: 'OPERACAO',
        title: 'flag off',
        description: 'flag off',
        isBlocking: false,
      })
    expect(supportRes.status).toBe(404)

    const listRes = await request(app)
      .get('/api/v1/support/tickets')
      .set('Cookie', await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL))
    expect(listRes.status).toBe(404)

    const health = await request(app).get('/api/v1/health')
    expect(health.status).toBe(200)
  })
})
