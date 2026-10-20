/**
 * Dashboard — período por Data inicial / Data final (dias civis de São Paulo, inclusivos).
 * Usa datas de 2033 para não colidir com outros dados da base de teste; limpa o próprio
 * recorte antes de semear.
 */
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { createLogger } from '../plugins/logger.js'
import { closePool, getPool } from '../plugins/db.js'
import { hasDatabaseConnectionInEnv, loadDotenvFiles, loadEnv } from '../config/env.js'
import { hashPassword } from '../shared/password/password.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import {
  ensureMariaCollaboratorSeedForIntegration,
  MARIA_COLLABORATOR_ID,
} from './integrationSeedFixtures.js'
import { createScenarioConveyor } from './listingPaginationFixtures.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const GOV_ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const GOV_ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'

/** Lançamentos semeados: instante (`entry_at`), minutos e, opcionalmente, quando foi gravado. */
const ENTRIES: Array<{ at: string; minutes: number; createdAt?: string }> = [
  { at: '2033-09-30T23:59:59.999-03:00', minutes: 1 }, // véspera da data inicial
  { at: '2033-10-01T00:00:00.000-03:00', minutes: 2 }, // exatamente o início da data inicial
  { at: '2033-10-05T12:00:00-03:00', minutes: 4, createdAt: '2033-10-25T10:00:00-03:00' }, // retroativo
  { at: '2033-10-20T23:59:59.999-03:00', minutes: 8 }, // último instante da data final
  { at: '2033-10-21T00:00:00.000-03:00', minutes: 16 }, // dia seguinte à data final
  { at: '2033-12-31T23:30:00-03:00', minutes: 32 }, // 2034-01-01 em UTC; 31/12 em SP
  { at: '2034-01-01T00:10:00-03:00', minutes: 64 },
]

/** Esteiras FINALIZADA com `completed_at` nas fronteiras. */
const COMPLETIONS = [
  '2033-09-30T23:59:59.999-03:00',
  '2033-10-01T00:00:00.000-03:00',
  '2033-10-20T23:59:59.999-03:00',
  '2033-10-21T00:00:00.000-03:00',
]

describe.skipIf(!hasDb)('Dashboard — período Data inicial/Data final (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let cookie: string

  async function get(path: string, query: Record<string, string>) {
    return request(app)
      .get(`/api/v1/dashboard/${path}?${new URLSearchParams(query).toString()}`)
      .set('Cookie', cookie)
  }

  async function periodMinutes(startDate: string, endDate: string): Promise<number> {
    const res = await get('operational', { startDate, endDate })
    expect(res.status, JSON.stringify(res.body)).toBe(200)
    return res.body.data.plannedVsRealized.realizedMinutesInPeriod
  }

  async function completed(startDate: string, endDate: string): Promise<number> {
    const res = await get('executive', { startDate, endDate })
    expect(res.status, JSON.stringify(res.body)).toBe(200)
    return res.body.data.totals.completedInWindow
  }

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    await ensureMariaCollaboratorSeedForIntegration(pool)
    const hash = await hashPassword('CollabGovTest1!')
    await pool.query(
      `INSERT INTO app_users (
          id, email, password_hash, is_active, role_id, must_change_password, password_changed_at
        ) VALUES ($1::uuid, $2, $3, true, $4::uuid, false, now())
        ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id, is_active = true, email = EXCLUDED.email`,
      [GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL, hash, ADMIN_ROLE_ID],
    )
    cookie = await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL)

    // Recorte exclusivo do teste (2033–2034): remove resíduos de execuções anteriores.
    await pool.query(
      `DELETE FROM conveyor_time_entries
        WHERE entry_at >= '2033-01-01T00:00:00-03:00' AND entry_at < '2035-01-01T00:00:00-03:00'`,
    )
    await pool.query(
      `UPDATE conveyors SET deleted_at = now()
        WHERE deleted_at IS NULL AND completed_at >= '2033-01-01T00:00:00-03:00'
          AND completed_at < '2035-01-01T00:00:00-03:00'`,
    )

    const tag = randomUUID().slice(0, 6)
    const os = await createScenarioConveyor(pool, {
      name: `OS Dashboard ${tag}`,
      tasks: [{ name: 'Período', areas: [1] }],
    })
    for (const e of ENTRIES) {
      await pool.query(
        `INSERT INTO conveyor_time_entries (
           conveyor_id, conveyor_node_id, collaborator_id, entry_at, minutes, created_at
         ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::timestamptz, $5, COALESCE($6::timestamptz, now()))`,
        [os.conveyorId, os.steps[0]!.id, MARIA_COLLABORATOR_ID, e.at, e.minutes, e.createdAt ?? null],
      )
    }
    for (const [i, at] of COMPLETIONS.entries()) {
      const c = await createScenarioConveyor(pool, {
        name: `OS Concluída ${tag} ${i}`,
        status: 'FINALIZADA',
        tasks: [{ name: 'Fim', areas: [1] }],
      })
      await pool.query(`UPDATE conveyors SET completed_at = $2::timestamptz WHERE id = $1::uuid`, [
        c.conveyorId,
        at,
      ])
    }
  })

  afterAll(async () => {
    await closePool()
  })

  it('Operacional: 01/10 a 20/10 inclui início e último instante; exclui véspera e dia seguinte; retroativo conta pela data de realização', async () => {
    expect(await periodMinutes('2033-10-01', '2033-10-20')).toBe(2 + 4 + 8)
  })

  it('Operacional: um único dia, mudança de mês e virada de ano em São Paulo', async () => {
    expect(await periodMinutes('2033-10-20', '2033-10-20')).toBe(8)
    expect(await periodMinutes('2033-10-21', '2033-10-21')).toBe(16)
    expect(await periodMinutes('2033-09-30', '2033-10-01')).toBe(1 + 2)
    expect(await periodMinutes('2033-12-31', '2033-12-31')).toBe(32)
    expect(await periodMinutes('2034-01-01', '2034-01-01')).toBe(64)
    expect(await periodMinutes('2033-12-31', '2034-01-01')).toBe(32 + 64)
  })

  it('Operacional: período só afeta as horas do período; acumulado e situação atual iguais', async () => {
    const res = await get('operational', { startDate: '2033-10-01', endDate: '2033-10-20' })
    const base = await get('operational', {})
    expect(base.body.data.plannedVsRealized.realizedMinutesInPeriod).toBeUndefined()
    expect(res.body.data.plannedVsRealized.realizedMinutesTotal).toBe(
      base.body.data.plannedVsRealized.realizedMinutesTotal,
    )
    expect(res.body.data.conveyorsByBucket).toEqual(base.body.data.conveyorsByBucket)
    expect(res.body.data.assignees).toEqual(base.body.data.assignees)
    expect(res.body.data.meta.period).toEqual({
      startDate: '2033-10-01',
      endDate: '2033-10-20',
      timezone: 'America/Sao_Paulo',
      from: '2033-10-01T03:00:00.000Z',
      to: '2033-10-21T02:59:59.999Z',
    })
    expect(res.body.data.plannedVsRealized.realizedPeriod).toMatchObject({
      preset: 'custom',
      startDate: '2033-10-01',
      endDate: '2033-10-20',
    })
    expect(res.body.data.plannedVsRealized.notes).not.toMatch(/STEP|entry_at|total_planned|conveyor_time_entries|preset/i)
  })

  it('Gerencial: concluídas pelo período (completed_at), incluindo todo o dia final; ativas e totais globais não mudam', async () => {
    expect(await completed('2033-10-01', '2033-10-20')).toBe(2)
    expect(await completed('2033-10-01', '2033-10-01')).toBe(1)
    expect(await completed('2033-10-20', '2033-10-21')).toBe(2)
    expect(await completed('2033-09-30', '2033-10-21')).toBe(4)
    expect(await completed('2033-11-01', '2033-11-30')).toBe(0)

    const ranged = await get('executive', { startDate: '2033-10-01', endDate: '2033-10-20' })
    const legacy = await get('executive', { days: '30' })
    const d = ranged.body.data
    expect(d.meta.period).toMatchObject({ startDate: '2033-10-01', endDate: '2033-10-20' })
    expect(d.meta.completedWithinDays).toBe(20)
    expect(d.totals.activeConveyors).toBe(legacy.body.data.totals.activeConveyors)
    expect(d.totals.overdueConveyors).toBe(legacy.body.data.totals.overdueConveyors)
    expect(d.plannedVsRealized).toEqual(legacy.body.data.plannedVsRealized)
    expect(d.plannedVsRealized.notes).not.toMatch(/STEP|entry_at|total_planned|preset/i)
  })

  it('compatibilidade: chamadas antigas (days / realizedPeriodPreset) seguem válidas; datas têm precedência', async () => {
    const legacyExec = await get('executive', { days: '7' })
    expect(legacyExec.status).toBe(200)
    expect(legacyExec.body.data.meta.completedWithinDays).toBe(7)
    expect(legacyExec.body.data.meta.period).toBeUndefined()

    const legacyOp = await get('operational', { realizedPeriodPreset: '30d' })
    expect(legacyOp.status).toBe(200)
    expect(legacyOp.body.data.plannedVsRealized.realizedPeriod.preset).toBe('30d')

    const both = await get('operational', {
      startDate: '2033-10-20',
      endDate: '2033-10-20',
      realizedPeriodPreset: '30d',
    })
    expect(both.body.data.plannedVsRealized.realizedMinutesInPeriod).toBe(8)
    expect(both.body.data.plannedVsRealized.realizedPeriod.preset).toBe('custom')

    const bothExec = await get('executive', { startDate: '2033-10-01', endDate: '2033-10-01', days: '90' })
    expect(bothExec.body.data.totals.completedInWindow).toBe(1)
    expect(bothExec.body.data.meta.completedWithinDays).toBe(1)
  })

  it('datas inválidas → 400 com mensagem em português (Operacional e Gerencial)', async () => {
    const cases: Array<[Record<string, string>, string]> = [
      [{ endDate: '2033-10-20' }, 'Informe a data inicial.'],
      [{ startDate: '2033-10-01' }, 'Informe a data final.'],
      [{ startDate: '2033-02-30', endDate: '2033-03-01' }, 'Informe uma data válida.'],
      [{ startDate: '01/10/2033', endDate: '2033-10-20' }, 'Informe uma data válida.'],
      [{ startDate: '2033-10-21', endDate: '2033-10-20' }, 'A data inicial não pode ser posterior à data final.'],
    ]
    for (const path of ['operational', 'executive']) {
      for (const [query, message] of cases) {
        const res = await get(path, query)
        expect(res.status, `${path} ${JSON.stringify(query)}`).toBe(400)
        expect(res.body.error?.message).toBe(message)
      }
    }
  })
})
