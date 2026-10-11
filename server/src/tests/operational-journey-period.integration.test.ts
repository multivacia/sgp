import { randomUUID } from 'node:crypto'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { cleanupSeededPlanItems, seedPublishedPlanItem } from './plannedActivityTestHelpers.js'
import { createApp } from '../app.js'
import { createLogger } from '../plugins/logger.js'
import { closePool, getPool } from '../plugins/db.js'
import {
  hasDatabaseConnectionInEnv,
  loadDotenvFiles,
  loadEnv,
} from '../config/env.js'
import { serviceCreateConveyor } from '../modules/conveyors/conveyors.service.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'
import { serviceCreateConveyorNodeAssignee } from '../modules/conveyors/conveyorAssignments.service.js'
import { hashPassword } from '../shared/password/password.js'
import { operationalToday } from '../shared/operationalWorkDate.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'
import { setConveyorProductionStatusForIntegration } from './integrationConveyorFixtures.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const COLAB_ROLE_ID = '22222222-2222-2222-2222-222222222222'
const SEED_SECTOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const DESCRIPTION_ID = 'dddddddd-0000-0000-0000-0000000fe71d'

function shiftIsoDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10)
}

function conveyorBody(nome: string): PostConveyorBody {
  return {
    dados: {
      nome,
      cliente: 'C',
      veiculo: 'V',
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
        titulo: 'Opção JP',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'Área JP',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: [
              {
                titulo: 'Etapa JP',
                orderIndex: 1,
                plannedMinutes: 6000,
                sourceOrigin: 'manual',
                required: true,
              },
            ],
          },
        ],
      },
    ],
  }
}

/**
 * Jornada (API real): o recorte de período usa o dia civil de São Paulo tanto para
 * apontamentos de atividade (`entry_at`) quanto para extra esteira (`entry_date`).
 * Cada execução usa um colaborador novo para os totais serem exatos.
 */
describe.skipIf(!hasDb)('jornada — período em America/Sao_Paulo (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let cookie: string
  let collaboratorId: string
  let conveyorId: string
  let stepId: string

  const today = () => operationalToday()
  const monthStart = () => `${today().slice(0, 7)}-01`
  const lastDayPrevMonth = () => shiftIsoDate(monthStart(), -1)

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    await ensureMariaCollaboratorSeedForIntegration(pool)

    const suffix = randomUUID().slice(0, 8)
    collaboratorId = randomUUID()
    const userId = randomUUID()
    const email = `journey-period-${suffix}@sgp.local`
    await pool.query(
      `INSERT INTO collaborators (id, code, full_name, email, sector_id, role_id, status, is_active)
       VALUES ($1::uuid, $2, $3, $4, $5::uuid, $6::uuid, 'ACTIVE', true)`,
      [collaboratorId, `COL-JP-${suffix}`, `Colab Período ${suffix}`, email, SEED_SECTOR_ID, COLAB_ROLE_ID],
    )
    const hash = await hashPassword('JourneyPeriod1!')
    await pool.query(
      `INSERT INTO app_users (
         id, email, password_hash, is_active, role_id, must_change_password, password_changed_at,
         collaborator_id
       ) VALUES ($1::uuid, $2, $3, true, $4::uuid, false, now(), $5::uuid)`,
      [userId, email, hash, COLAB_ROLE_ID, collaboratorId],
    )
    cookie = await sessionCookieForUser(pool, userId, email)

    await pool.query(
      `INSERT INTO operational_extra_time_entry_descriptions (id, description, normalized_description, is_active)
       VALUES ($1::uuid, 'Período JP', 'periodo jp', true)
       ON CONFLICT (id) DO UPDATE SET is_active = true, deleted_at = NULL`,
      [DESCRIPTION_ID],
    )

    const conv = await serviceCreateConveyor(pool, conveyorBody(`JP ${suffix}`))
    conveyorId = conv.id
    await setConveyorProductionStatusForIntegration(pool, conveyorId)
    const r = await pool.query<{ id: string }>(
      `SELECT id FROM conveyor_nodes
       WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL`,
      [conveyorId],
    )
    stepId = r.rows[0]!.id
    await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId,
      conveyorNodeId: stepId,
      collaboratorId,
      isPrimary: true,
    })
    // Regra apontamento-somente-planejado: a atividade precisa estar planejada.
    await seedPublishedPlanItem(pool, {
      conveyorId,
      stepNodeId: stepId,
      collaboratorId,
      createdByUserId: userId,
    })

    // Fixtures criadas pelas APIs reais de apontamento.
    const te = `/api/v1/conveyors/${conveyorId}/steps/${stepId}/time-entries`
    const post = async (minutes: number, entryAt: string) => {
      const res = await request(app).post(te).set('Cookie', cookie).send({ minutes, entryAt })
      expect(res.status, JSON.stringify(res.body)).toBe(201)
    }
    // 31/08 22:00 em SP — em UTC já é 01/09 01:00 (mês seguinte).
    await post(7, `${lastDayPrevMonth()}T22:00:00-03:00`)
    // 01/09 00:30 em SP — primeiro dia do mês selecionado.
    await post(11, `${monthStart()}T00:30:00-03:00`)

    const extra = async (minutes: number, entryDate: string) => {
      const res = await request(app)
        .post('/api/v1/me/extra-time-entries')
        .set('Cookie', cookie)
        .send({ descriptionId: DESCRIPTION_ID, minutes, entryDate })
      expect(res.status, JSON.stringify(res.body)).toBe(201)
    }
    await extra(13, lastDayPrevMonth())
    await extra(17, monthStart())
  })

  afterAll(async () => {
    await cleanupSeededPlanItems(pool)
    await closePool()
  })

  async function journey(query: Record<string, string>) {
    const res = await request(app)
      .get('/api/v1/my-operational-journey')
      .query({ ...query, conveyorId })
      .set('Cookie', cookie)
    expect(res.status, JSON.stringify(res.body)).toBe(200)
    return res.body.data as {
      period: { from: string; to: string }
      execution: { realizedMinutesInPeriod: number }
      extraTimeEntriesSummary: { totalMinutes: number; entriesCount: number }
      recentTimeEntries: Array<{ minutes: number }>
    }
  }

  it('filtro "mês": começa 00:00 de SP no dia 1; exclui o último dia do mês anterior (atividade e extra)', async () => {
    const data = await journey({ periodPreset: 'month' })
    expect(data.period.from).toBe(new Date(`${monthStart()}T00:00:00.000-03:00`).toISOString())
    expect(data.execution.realizedMinutesInPeriod).toBe(11)
    expect(data.recentTimeEntries.map((e) => e.minutes)).toEqual([11])
    expect(data.extraTimeEntriesSummary.totalMinutes).toBe(17)
    expect(data.extraTimeEntriesSummary.entriesCount).toBe(1)
  })

  it('intervalo personalizado com data pura (YYYY-MM-DD) = dias civis de SP', async () => {
    const onlyPrev = await journey({
      periodPreset: 'custom',
      from: lastDayPrevMonth(),
      to: lastDayPrevMonth(),
    })
    expect(onlyPrev.execution.realizedMinutesInPeriod).toBe(7)
    expect(onlyPrev.extraTimeEntriesSummary.totalMinutes).toBe(13)

    const onlyFirst = await journey({ periodPreset: 'custom', from: monthStart(), to: monthStart() })
    expect(onlyFirst.execution.realizedMinutesInPeriod).toBe(11)
    expect(onlyFirst.extraTimeEntriesSummary.totalMinutes).toBe(17)

    const both = await journey({ periodPreset: 'custom', from: lastDayPrevMonth(), to: monthStart() })
    expect(both.execution.realizedMinutesInPeriod).toBe(18)
    expect(both.extraTimeEntriesSummary.totalMinutes).toBe(30)
  })

  it('intervalo personalizado com limites ISO de SP (formato enviado pelo frontend)', async () => {
    const d = monthStart()
    const data = await journey({
      periodPreset: 'custom',
      from: `${d}T00:00:00.000-03:00`,
      to: `${d}T23:59:59.999-03:00`,
    })
    expect(data.execution.realizedMinutesInPeriod).toBe(11)
    expect(data.extraTimeEntriesSummary.totalMinutes).toBe(17)
  })

  it('apontamento retroativo soma no dia escolhido e não infla o dia do registro', async () => {
    const day = shiftIsoDate(today(), -3)
    const res = await request(app)
      .post(`/api/v1/conveyors/${conveyorId}/steps/${stepId}/time-entries`)
      .set('Cookie', cookie)
      .send({ minutes: 29, entryAt: `${day}T12:00:00-03:00` })
    expect(res.status).toBe(201)

    const onDay = await journey({ periodPreset: 'custom', from: day, to: day })
    expect(onDay.execution.realizedMinutesInPeriod).toBe(
      29 + (day === monthStart() ? 11 : 0) + (day === lastDayPrevMonth() ? 7 : 0),
    )
    const onToday = await journey({ periodPreset: 'custom', from: today(), to: today() })
    expect(onToday.execution.realizedMinutesInPeriod).toBe(
      today() === monthStart() ? 11 : 0,
    )
  })

  it('janela móvel 7d mantém duração de 7×24h terminando agora', async () => {
    const data = await journey({ periodPreset: '7d' })
    const from = new Date(data.period.from).getTime()
    const to = new Date(data.period.to).getTime()
    expect(to - from).toBe(7 * 24 * 60 * 60 * 1000)
  })
})
