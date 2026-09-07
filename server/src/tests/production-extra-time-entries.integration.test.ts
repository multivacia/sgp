import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { createLogger } from '../plugins/logger.js'
import { closePool, getPool } from '../plugins/db.js'
import { hasDatabaseConnectionInEnv, loadDotenvFiles, loadEnv } from '../config/env.js'
import {
  productionSessionCookie,
  seedProductionPinForCollaborator,
  SEED_COLLABORATOR_MARIA_ID,
} from './productionTestHelpers.js'
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const DESCRIPTION_ID = 'dddddddd-0000-0000-0000-000000000001'

describe.skipIf(!hasDb)('production extra time entries (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let env: ReturnType<typeof loadEnv>

  beforeAll(async () => {
    env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)

    await ensureMariaCollaboratorSeedForIntegration(pool)
    await seedProductionPinForCollaborator(pool, SEED_COLLABORATOR_MARIA_ID, '2468', true)

    await pool.query(
      `
      INSERT INTO operational_extra_time_entry_descriptions (id, description, normalized_description, is_active)
      VALUES ($1::uuid, 'Limpeza de bancada', 'limpeza de bancada', true)
      ON CONFLICT (id) DO UPDATE SET is_active = true, deleted_at = NULL
      `,
      [DESCRIPTION_ID],
    )
  })

  afterAll(async () => {
    await closePool()
  })

  describe('GET /api/v1/production/extra-time-entries/descriptions', () => {
    it('sem cookie → 401', async () => {
      const res = await request(app).get(
        '/api/v1/production/extra-time-entries/descriptions',
      )
      expect(res.status).toBe(401)
    })

    it('com sessão production → 200 e inclui a descrição semeada', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .get('/api/v1/production/extra-time-entries/descriptions')
        .set('Cookie', cookie)
      expect(res.status).toBe(200)
      const items = res.body.data as Array<{ id: string }>
      expect(items.some((i) => i.id === DESCRIPTION_ID)).toBe(true)
    })
  })

  describe('POST /api/v1/production/extra-time-entries', () => {
    it('sem cookie → 401', async () => {
      const res = await request(app)
        .post('/api/v1/production/extra-time-entries')
        .send({ descriptionId: DESCRIPTION_ID, minutes: 15 })
      expect(res.status).toBe(401)
    })

    it('payload inválido (minutes < 1) → 422', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/extra-time-entries')
        .set('Cookie', cookie)
        .send({ descriptionId: DESCRIPTION_ID, minutes: 0 })
      expect(res.status).toBe(422)
    })

    it('descrição inexistente/inativa → 422', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/extra-time-entries')
        .set('Cookie', cookie)
        .send({ descriptionId: '99999999-9999-9999-9999-999999999999', minutes: 15 })
      expect(res.status).toBe(422)
    })

    it('cria apontamento com origin=PRODUCTION e collaborator vindo da sessão', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/extra-time-entries')
        .set('Cookie', cookie)
        .send({ descriptionId: DESCRIPTION_ID, minutes: 20, notes: 'Teste kiosk' })
      expect(res.status).toBe(201)
      const entryId = (res.body.data as { id: string }).id

      const row = await pool.query<{
        collaborator_id: string
        created_by_collaborator_id: string | null
        created_by_user_id: string | null
        origin: string
      }>(
        `SELECT collaborator_id::text, created_by_collaborator_id::text,
                created_by_user_id::text, origin
         FROM operational_extra_time_entries WHERE id = $1::uuid`,
        [entryId],
      )
      expect(row.rows[0]?.collaborator_id).toBe(SEED_COLLABORATOR_MARIA_ID)
      expect(row.rows[0]?.created_by_collaborator_id).toBe(SEED_COLLABORATOR_MARIA_ID)
      expect(row.rows[0]?.created_by_user_id).toBeNull()
      expect(row.rows[0]?.origin).toBe('PRODUCTION')
    })
  })
})
