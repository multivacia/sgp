import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { createLogger } from '../plugins/logger.js'
import { closePool, getPool } from '../plugins/db.js'
import { hasDatabaseConnectionInEnv, loadDotenvFiles, loadEnv } from '../config/env.js'
import { hashPassword } from '../shared/password/password.js'
import { serviceCreateConveyor } from '../modules/conveyors/conveyors.service.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import { linkAppUserToCollaborator } from './integrationSeedFixtures.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

/**
 * Ajustes da Tati (release tati-kiosk):
 * - item 7: Extra Esteira aparece na jornada e o histórico sobrevive à exclusão lógica
 *   da descrição no catálogo;
 * - item 8: a justificativa padronizada (catálogo) gravada no apontamento é exposta
 *   na jornada (rótulo + complemento).
 */
const COLAB_ROLE_ID = '22222222-2222-2222-2222-222222222222'
const SEED_SECTOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const COLLAB_ID = 'a7a7a7a7-a7a7-a7a7-a7a7-a7a7a7a7a702'
const USER_ID = 'a7a7a7a7-a7a7-a7a7-a7a7-a7a7a7a7a701'
const USER_EMAIL = 'journey-item7-8@sgp-argos.local'

type JourneyBody = {
  extraTimeEntriesSummary: { totalMinutes: number; entriesCount: number }
  recentExtraTimeEntries: Array<{ id: string; description: string; minutes: number; origin: string }>
  recentTimeEntries: Array<{
    id: string
    standardJustificationLabel: string | null
    standardJustificationComplement: string | null
  }>
}

describe.skipIf(!hasDb)('jornada — Extra Esteira e justificativas (itens 7 e 8)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let cookie = ''
  let descriptionId = ''
  let extraEntryId = ''
  let timeEntryId = ''
  let conveyorId = ''
  const stamp = Date.now().toString()
  const descriptionText = `Treinamento item7 ${stamp}`

  async function journey(): Promise<JourneyBody> {
    const res = await request(app)
      .get('/api/v1/my-operational-journey?periodPreset=7d&limit=50')
      .set('Cookie', cookie)
    expect(res.status).toBe(200)
    return res.body.data as JourneyBody
  }

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)

    await pool.query(
      `
      INSERT INTO collaborators (id, code, full_name, email, sector_id, role_id, status, is_active)
      VALUES ($1::uuid, 'COL-ITEM78', 'Colab Itens 7 e 8', 'item78@sgp.local',
              $2::uuid, $3::uuid, 'ACTIVE', true)
      ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE', is_active = true, deleted_at = NULL
      `,
      [COLLAB_ID, SEED_SECTOR_ID, COLAB_ROLE_ID],
    )
    const hash = await hashPassword('JourneyItem78!')
    await pool.query(
      `INSERT INTO app_users (id, email, password_hash, is_active, role_id, must_change_password, password_changed_at)
       VALUES ($1::uuid, $2, $3, true, $4::uuid, false, now())
       ON CONFLICT (id) DO UPDATE SET is_active = true, role_id = EXCLUDED.role_id, email = EXCLUDED.email`,
      [USER_ID, USER_EMAIL, hash, COLAB_ROLE_ID],
    )
    await linkAppUserToCollaborator(pool, USER_ID, COLLAB_ID)
    cookie = await sessionCookieForUser(pool, USER_ID, USER_EMAIL)

    const desc = await pool.query<{ id: string }>(
      `INSERT INTO operational_extra_time_entry_descriptions (description, normalized_description)
       VALUES ($1, lower($1)) RETURNING id::text`,
      [descriptionText],
    )
    descriptionId = desc.rows[0]!.id
    const extra = await pool.query<{ id: string }>(
      `INSERT INTO operational_extra_time_entries
         (collaborator_id, created_by_user_id, description_id, entry_date, minutes, notes)
       VALUES ($1::uuid, $2::uuid, $3::uuid, (now() AT TIME ZONE 'America/Sao_Paulo')::date, 37, 'item 7')
       RETURNING id::text`,
      [COLLAB_ID, USER_ID, descriptionId],
    )
    extraEntryId = extra.rows[0]!.id

    const conv = await serviceCreateConveyor(pool, {
      dados: {
        nome: `Item8-${stamp}`,
        cliente: '',
        veiculo: '',
        modeloVersao: '',
        placa: '',
        observacoes: '',
        responsavel: '',
        prazoEstimado: '',
        prioridade: 'media',
        colaboradorId: null,
      },
      originType: 'MANUAL',
      baseId: null,
      baseCode: null,
      baseName: null,
      baseVersion: null,
      options: [
        {
          titulo: 'Opção item 8',
          orderIndex: 1,
          sourceOrigin: 'manual',
          areas: [
            {
              titulo: 'Área item 8',
              orderIndex: 1,
              sourceOrigin: 'manual',
              steps: [
                {
                  titulo: 'Atividade item 8',
                  orderIndex: 1,
                  plannedMinutes: 30,
                  sourceOrigin: 'manual',
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    })
    conveyorId = conv.id
    const step = await pool.query<{ id: string }>(
      `SELECT id::text FROM conveyor_nodes
       WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
       ORDER BY order_index LIMIT 1`,
      [conveyorId],
    )
    const entry = await pool.query<{ id: string }>(
      `INSERT INTO conveyor_time_entries
         (conveyor_id, conveyor_node_id, collaborator_id, entry_at, minutes, notes,
          standard_justification_label_snapshot, standard_justification_category_snapshot,
          standard_justification_complement)
       VALUES ($1::uuid, $2::uuid, $3::uuid, now() - interval '1 hour', 15, 'Ajuste no ponto',
               'Aguardando peça', 'PLANNING', 'Peça chegou às 10h')
       RETURNING id::text`,
      [conveyorId, step.rows[0]!.id, COLLAB_ID],
    )
    timeEntryId = entry.rows[0]!.id
  })

  afterAll(async () => {
    if (timeEntryId) {
      await pool.query(`UPDATE conveyor_time_entries SET deleted_at = now() WHERE id = $1::uuid`, [
        timeEntryId,
      ])
    }
    if (extraEntryId) {
      await pool.query(
        `UPDATE operational_extra_time_entries SET deleted_at = now() WHERE id = $1::uuid`,
        [extraEntryId],
      )
    }
    if (conveyorId) {
      await pool.query(`UPDATE conveyors SET deleted_at = now() WHERE id = $1::uuid`, [conveyorId])
    }
    await closePool()
  })

  it('item 8: justificativa padronizada e complemento aparecem no apontamento da jornada', async () => {
    const body = await journey()
    const found = body.recentTimeEntries.find((e) => e.id === timeEntryId)
    expect(found).toBeDefined()
    expect(found?.standardJustificationLabel).toBe('Aguardando peça')
    expect(found?.standardJustificationComplement).toBe('Peça chegou às 10h')
  })

  it('item 7: Extra Esteira aparece na jornada e sobrevive à exclusão da descrição no catálogo', async () => {
    const before = await journey()
    const listedBefore = before.recentExtraTimeEntries.find((e) => e.id === extraEntryId)
    expect(listedBefore?.description).toBe(descriptionText)
    expect(listedBefore?.minutes).toBe(37)
    expect(before.extraTimeEntriesSummary.totalMinutes).toBeGreaterThanOrEqual(37)

    await pool.query(
      `UPDATE operational_extra_time_entry_descriptions
       SET deleted_at = now(), is_active = false WHERE id = $1::uuid`,
      [descriptionId],
    )

    const after = await journey()
    const listedAfter = after.recentExtraTimeEntries.find((e) => e.id === extraEntryId)
    expect(listedAfter?.description).toBe(descriptionText)
    expect(after.extraTimeEntriesSummary.totalMinutes).toBe(
      before.extraTimeEntriesSummary.totalMinutes,
    )
    expect(after.extraTimeEntriesSummary.entriesCount).toBe(
      before.extraTimeEntriesSummary.entriesCount,
    )
  })
})
