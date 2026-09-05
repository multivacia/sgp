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
import {
  productionSessionCookie,
  seedProductionPinForCollaborator,
  SEED_COLLABORATOR_MARIA_ID,
} from './productionTestHelpers.js'
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const SEED_ROLE_ID = '22222222-2222-2222-2222-222222222222'
const SEED_SECTOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const OTHER_COLLAB_ID = 'eeeeeeee-0000-0000-0000-000000000001'
const DESCRIPTION_ID = 'ffffffff-0000-0000-0000-000000000001'

async function seedDescription(pool: ReturnType<typeof getPool>): Promise<void> {
  await pool.query(
    `
    INSERT INTO operational_extra_time_entry_descriptions (
      id, description, normalized_description, sort_order, is_active
    ) VALUES ($1::uuid, 'Reunião de alinhamento', 'reuniao de alinhamento', 10, true)
    ON CONFLICT (id) DO UPDATE SET
      is_active = true,
      deleted_at = NULL
    `,
    [DESCRIPTION_ID],
  )
}

describe.skipIf(!hasDb)('production extra time entries (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let env: ReturnType<typeof loadEnv>

  beforeAll(async () => {
    env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)

    await ensureMariaCollaboratorSeedForIntegration(pool)
    await seedDescription(pool)

    await pool.query(
      `
      INSERT INTO collaborators (id, code, full_name, email, sector_id, role_id, status, is_active)
      VALUES ($1::uuid, 'COL-XTE-OTHER', 'Colab XTE Outro', 'xte-other@sgp.local',
              $2::uuid, $3::uuid, 'ACTIVE', true)
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        status = EXCLUDED.status,
        is_active = EXCLUDED.is_active,
        deleted_at = NULL
      `,
      [OTHER_COLLAB_ID, SEED_SECTOR_ID, SEED_ROLE_ID],
    )

    await seedProductionPinForCollaborator(pool, SEED_COLLABORATOR_MARIA_ID, '2468', true, false)
    await seedProductionPinForCollaborator(pool, OTHER_COLLAB_ID, '1357', true, false)
  })

  afterAll(async () => {
    await closePool()
  })

  describe('GET /api/v1/production/extra-time-entries/descriptions', () => {
    it('sem sessão → 401', async () => {
      const res = await request(app).get(
        '/api/v1/production/extra-time-entries/descriptions',
      )
      expect(res.status).toBe(401)
    })

    it('com sessão válida → 200 com descrições ativas', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .get('/api/v1/production/extra-time-entries/descriptions')
        .set('Cookie', cookie)
      expect(res.status).toBe(200)
      const items = res.body.data as Array<{ id: string; description: string }>
      expect(items.some((i) => i.id === DESCRIPTION_ID)).toBe(true)
    })
  })

  describe('GET /api/v1/production/extra-time-entries', () => {
    it('sem sessão → 401', async () => {
      const res = await request(app).get('/api/v1/production/extra-time-entries?limit=5')
      expect(res.status).toBe(401)
    })

    it('com must_change_pin=true → 403 PRODUCTION_PIN_CHANGE_REQUIRED', async () => {
      await seedProductionPinForCollaborator(pool, OTHER_COLLAB_ID, '1357', true, true)
      const cookie = productionSessionCookie(OTHER_COLLAB_ID)
      const res = await request(app)
        .get('/api/v1/production/extra-time-entries?limit=5')
        .set('Cookie', cookie)
      expect(res.status).toBe(403)
      expect(res.body.error?.code).toBe('PRODUCTION_PIN_CHANGE_REQUIRED')
      // Restaura para não afetar os demais testes deste arquivo.
      await seedProductionPinForCollaborator(pool, OTHER_COLLAB_ID, '1357', true, false)
    })

    it('retorna últimos apontamentos do colaborador da sessão, isolado de outro colaborador', async () => {
      const mariaCookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const otherCookie = productionSessionCookie(OTHER_COLLAB_ID)

      const createRes = await request(app)
        .post('/api/v1/production/extra-time-entries')
        .set('Cookie', mariaCookie)
        .send({ descriptionId: DESCRIPTION_ID, minutes: 15 })
      expect(createRes.status).toBe(201)

      const mariaList = await request(app)
        .get('/api/v1/production/extra-time-entries?limit=5')
        .set('Cookie', mariaCookie)
      expect(mariaList.status).toBe(200)
      const mariaIds = (mariaList.body.data as Array<{ id: string }>).map((i) => i.id)
      expect(mariaIds).toContain(createRes.body.data.id)

      const otherList = await request(app)
        .get('/api/v1/production/extra-time-entries?limit=5')
        .set('Cookie', otherCookie)
      expect(otherList.status).toBe(200)
      const otherIds = (otherList.body.data as Array<{ id: string }>).map((i) => i.id)
      expect(otherIds).not.toContain(createRes.body.data.id)
    })

    it('respeita limit e ordena por entry_date DESC, created_at DESC', async () => {
      const cookie = productionSessionCookie(OTHER_COLLAB_ID)
      for (let i = 0; i < 3; i += 1) {
        const res = await request(app)
          .post('/api/v1/production/extra-time-entries')
          .set('Cookie', cookie)
          .send({ descriptionId: DESCRIPTION_ID, minutes: 10 + i })
        expect(res.status).toBe(201)
      }
      const res = await request(app)
        .get('/api/v1/production/extra-time-entries?limit=2')
        .set('Cookie', cookie)
      expect(res.status).toBe(200)
      expect((res.body.data as unknown[]).length).toBeLessThanOrEqual(2)
    })
  })

  describe('POST /api/v1/production/extra-time-entries', () => {
    it('sem sessão → 401', async () => {
      const res = await request(app)
        .post('/api/v1/production/extra-time-entries')
        .send({ descriptionId: DESCRIPTION_ID, minutes: 10 })
      expect(res.status).toBe(401)
    })

    it('com must_change_pin=true → 403 PRODUCTION_PIN_CHANGE_REQUIRED', async () => {
      await seedProductionPinForCollaborator(pool, OTHER_COLLAB_ID, '1357', true, true)
      const cookie = productionSessionCookie(OTHER_COLLAB_ID)
      const res = await request(app)
        .post('/api/v1/production/extra-time-entries')
        .set('Cookie', cookie)
        .send({ descriptionId: DESCRIPTION_ID, minutes: 10 })
      expect(res.status).toBe(403)
      expect(res.body.error?.code).toBe('PRODUCTION_PIN_CHANGE_REQUIRED')
      await seedProductionPinForCollaborator(pool, OTHER_COLLAB_ID, '1357', true, false)
    })

    it('rejeita entryDate futura com 422', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
      const futureIso = future.toISOString().slice(0, 10)
      const res = await request(app)
        .post('/api/v1/production/extra-time-entries')
        .set('Cookie', cookie)
        .send({ descriptionId: DESCRIPTION_ID, minutes: 10, entryDate: futureIso })
      expect(res.status).toBe(422)
    })

    it('aceita data retroativa', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/extra-time-entries')
        .set('Cookie', cookie)
        .send({ descriptionId: DESCRIPTION_ID, minutes: 10, entryDate: '2020-01-01' })
      expect(res.status).toBe(201)
      expect(res.body.data.entryDate).toBe('2020-01-01')
    })

    it('rejeita minutes <= 0', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/extra-time-entries')
        .set('Cookie', cookie)
        .send({ descriptionId: DESCRIPTION_ID, minutes: 0 })
      expect(res.status).toBe(422)
    })

    it('rejeita minutes não inteiro', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/extra-time-entries')
        .set('Cookie', cookie)
        .send({ descriptionId: DESCRIPTION_ID, minutes: 10.5 })
      expect(res.status).toBe(422)
    })

    it('rejeita notes acima de 500 caracteres', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/extra-time-entries')
        .set('Cookie', cookie)
        .send({ descriptionId: DESCRIPTION_ID, minutes: 10, notes: 'x'.repeat(501) })
      expect(res.status).toBe(422)
    })

    it('rejeita descriptionId inexistente/inativo', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/extra-time-entries')
        .set('Cookie', cookie)
        .send({ descriptionId: '99999999-9999-9999-9999-999999999999', minutes: 10 })
      expect(res.status).toBe(422)
    })

    it('cria apontamento gravando created_by_collaborator_id, origin=PRODUCTION e created_by_user_id NULL', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/extra-time-entries')
        .set('Cookie', cookie)
        .send({ descriptionId: DESCRIPTION_ID, minutes: 42, notes: '  Nota de teste  ' })
      expect(res.status).toBe(201)
      const data = res.body.data as Record<string, unknown>
      expect(data.minutes).toBe(42)
      expect(data.notes).toBe('Nota de teste')

      const row = await pool.query<{
        collaborator_id: string
        created_by_collaborator_id: string
        created_by_user_id: string | null
        origin: string
      }>(
        `SELECT collaborator_id::text, created_by_collaborator_id::text,
                created_by_user_id::text, origin
         FROM operational_extra_time_entries WHERE id = $1::uuid`,
        [data.id as string],
      )
      expect(row.rows[0]?.collaborator_id).toBe(SEED_COLLABORATOR_MARIA_ID)
      expect(row.rows[0]?.created_by_collaborator_id).toBe(SEED_COLLABORATOR_MARIA_ID)
      expect(row.rows[0]?.created_by_user_id).toBeNull()
      expect(row.rows[0]?.origin).toBe('PRODUCTION')
    })
  })
})
