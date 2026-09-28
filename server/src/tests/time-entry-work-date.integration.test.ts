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
import { serviceCreateConveyor } from '../modules/conveyors/conveyors.service.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'
import { serviceCreateConveyorNodeAssignee } from '../modules/conveyors/conveyorAssignments.service.js'
import { hashPassword } from '../shared/password/password.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import { OPERATIONAL_TIMEZONE, operationalToday } from '../shared/operationalWorkDate.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'
import { setConveyorProductionStatusForIntegration } from './integrationConveyorFixtures.js'
import {
  productionSessionCookie,
  seedProductionPinForCollaborator,
  SEED_COLLABORATOR_MARIA_ID,
} from './productionTestHelpers.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const MARIA_APP_USER_ID = '44444444-4444-4444-4444-444444444444'
const MARIA_EMAIL = 'maria@exemplo.com'
const WD_ADMIN_USER_ID = 'da7eda7e-0000-4000-8000-000000000001'
const WD_ADMIN_EMAIL = 'work-date-admin@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'
const DESCRIPTION_ID = 'dddddddd-0000-0000-0000-00000000da7e'
/**
 * ATENÇÃO: nenhuma migration/seed do repositório provisiona esta permissão (usada por
 * `requirePermission` na rota on-behalf). Ela é criada aqui apenas no banco de teste —
 * isto NÃO prova que exista em HML/PRD.
 */
const ON_BEHALF_PERMISSION = 'time_entries.create_on_behalf'

function shiftIsoDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10)
}

/** Mesmo formato que o frontend envia para data passada (`buildEntryAtForWorkDate`). */
function noonSp(iso: string): string {
  return `${iso}T12:00:00-03:00`
}

function conveyorBody(nome: string, steps = 1): PostConveyorBody {
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
        titulo: 'Opção WD',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'Área WD',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: Array.from({ length: steps }, (_, i) => ({
              titulo: `Etapa ${i + 1}`,
              orderIndex: i + 1,
              plannedMinutes: 600,
              sourceOrigin: 'manual' as const,
              required: true,
            })),
          },
        ],
      },
    ],
  }
}

describe.skipIf(!hasDb)('data de realização do apontamento (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let mariaCookie: string
  let adminCookie: string
  let today: string
  let yesterday: string
  let tomorrow: string

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    await ensureMariaCollaboratorSeedForIntegration(pool)
    await seedProductionPinForCollaborator(pool, SEED_COLLABORATOR_MARIA_ID, '2468', true)

    const hash = await hashPassword('WorkDateAdmin1!')
    await pool.query(
      `INSERT INTO app_users (
          id, email, password_hash, is_active, role_id, must_change_password, password_changed_at
        ) VALUES ($1::uuid, $2, $3, true, $4::uuid, false, now())
        ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id, is_active = true`,
      [WD_ADMIN_USER_ID, WD_ADMIN_EMAIL, hash, ADMIN_ROLE_ID],
    )
    await pool.query(
      `INSERT INTO app_permissions (code, name)
       SELECT $1::varchar, 'Apontamentos: registar em nome de colaborador'
       WHERE NOT EXISTS (SELECT 1 FROM app_permissions WHERE code = $1::varchar)`,
      [ON_BEHALF_PERMISSION],
    )
    await pool.query(
      `INSERT INTO app_role_permissions (role_id, permission_id)
       SELECT $1::uuid, p.id FROM app_permissions p
       WHERE p.code = $2
         AND NOT EXISTS (
           SELECT 1 FROM app_role_permissions rp
           WHERE rp.role_id = $1::uuid AND rp.permission_id = p.id
         )`,
      [ADMIN_ROLE_ID, ON_BEHALF_PERMISSION],
    )
    await pool.query(
      `INSERT INTO operational_extra_time_entry_descriptions (id, description, normalized_description, is_active)
       VALUES ($1::uuid, 'Organização WD', 'organizacao wd', true)
       ON CONFLICT (id) DO UPDATE SET is_active = true, deleted_at = NULL`,
      [DESCRIPTION_ID],
    )

    mariaCookie = await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL)
    adminCookie = await sessionCookieForUser(pool, WD_ADMIN_USER_ID, WD_ADMIN_EMAIL)
    today = operationalToday()
    yesterday = shiftIsoDate(today, -1)
    tomorrow = shiftIsoDate(today, 1)
  })

  afterAll(async () => {
    await closePool()
  })

  async function conveyorWithMariaAssigned(steps = 1): Promise<{
    conveyorId: string
    stepIds: string[]
  }> {
    const conv = await serviceCreateConveyor(pool, conveyorBody(`WD ${randomUUID().slice(0, 8)}`, steps))
    await setConveyorProductionStatusForIntegration(pool, conv.id)
    const r = await pool.query<{ id: string }>(
      `SELECT id FROM conveyor_nodes
       WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
       ORDER BY order_index`,
      [conv.id],
    )
    const stepIds = r.rows.map((x) => x.id)
    await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId: conv.id,
      conveyorNodeId: stepIds[0]!,
      collaboratorId: SEED_COLLABORATOR_MARIA_ID,
      isPrimary: true,
    })
    return { conveyorId: conv.id, stepIds }
  }

  async function entryDays(entryId: string): Promise<{ workDay: string; createdDay: string }> {
    const r = await pool.query<{ work_day: string; created_day: string }>(
      `SELECT (entry_at AT TIME ZONE '${OPERATIONAL_TIMEZONE}')::date::text AS work_day,
              (created_at AT TIME ZONE '${OPERATIONAL_TIMEZONE}')::date::text AS created_day
       FROM conveyor_time_entries WHERE id = $1::uuid`,
      [entryId],
    )
    const row = r.rows[0]
    if (!row) throw new Error('apontamento não encontrado')
    return { workDay: row.work_day, createdDay: row.created_day }
  }

  /** Total diário no mesmo critério de `operational-planning` (dia civil de SP). */
  async function dailyMinutes(conveyorId: string, day: string): Promise<number> {
    const r = await pool.query<{ s: string }>(
      `SELECT COALESCE(SUM(minutes), 0)::text AS s FROM conveyor_time_entries
       WHERE deleted_at IS NULL AND conveyor_id = $1::uuid
         AND (entry_at AT TIME ZONE '${OPERATIONAL_TIMEZONE}')::date = $2::date`,
      [conveyorId, day],
    )
    return Number(r.rows[0]!.s)
  }

  async function countEntries(conveyorId: string): Promise<number> {
    const r = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM conveyor_time_entries WHERE conveyor_id = $1::uuid`,
      [conveyorId],
    )
    return Number(r.rows[0]!.n)
  }

  function timeEntriesPath(conveyorId: string, stepId: string) {
    return `/api/v1/conveyors/${conveyorId}/steps/${stepId}/time-entries`
  }

  function dayWindow(day: string) {
    return {
      from: `${day}T00:00:00.000-03:00`,
      to: `${day}T23:59:59.999-03:00`,
    }
  }

  it('web: sem entryAt e com "hoje" mantém o comportamento atual (dia de hoje)', async () => {
    const { conveyorId, stepIds } = await conveyorWithMariaAssigned()
    const tp = timeEntriesPath(conveyorId, stepIds[0]!)
    const r1 = await request(app).post(tp).set('Cookie', mariaCookie).send({ minutes: 11 })
    expect(r1.status).toBe(201)
    const r2 = await request(app)
      .post(tp)
      .set('Cookie', mariaCookie)
      .send({ minutes: 13, entryAt: new Date().toISOString() })
    expect(r2.status).toBe(201)
    expect((await entryDays(r1.body.data.id)).workDay).toBe(today)
    expect((await entryDays(r2.body.data.id)).workDay).toBe(today)
    expect(await dailyMinutes(conveyorId, today)).toBe(24)
  })

  it('web: apontado hoje com data de ontem soma em ontem, não em hoje; created_at preserva hoje', async () => {
    const { conveyorId, stepIds } = await conveyorWithMariaAssigned()
    const tp = timeEntriesPath(conveyorId, stepIds[0]!)
    const r = await request(app)
      .post(tp)
      .set('Cookie', mariaCookie)
      .send({ minutes: 47, entryAt: noonSp(yesterday), entryMode: 'manual' })
    expect(r.status).toBe(201)
    const days = await entryDays(r.body.data.id)
    expect(days.workDay).toBe(yesterday)
    expect(days.createdDay).toBe(today)
    expect(await dailyMinutes(conveyorId, yesterday)).toBe(47)
    expect(await dailyMinutes(conveyorId, today)).toBe(0)

    const y = dayWindow(yesterday)
    const jy = await request(app)
      .get('/api/v1/my-operational-journey')
      .query({ periodPreset: 'custom', from: y.from, to: y.to, conveyorId })
      .set('Cookie', mariaCookie)
    expect(jy.status).toBe(200)
    expect(jy.body.data.execution.realizedMinutesInPeriod).toBe(47)

    const t = dayWindow(today)
    const jt = await request(app)
      .get('/api/v1/my-operational-journey')
      .query({ periodPreset: 'custom', from: t.from, to: t.to, conveyorId })
      .set('Cookie', mariaCookie)
    expect(jt.status).toBe(200)
    expect(jt.body.data.execution.realizedMinutesInPeriod).toBe(0)
  })

  it('web: data pura (YYYY-MM-DD) é tratada como meio-dia de SP e não desloca o dia', async () => {
    const { conveyorId, stepIds } = await conveyorWithMariaAssigned()
    const r = await request(app)
      .post(timeEntriesPath(conveyorId, stepIds[0]!))
      .set('Cookie', mariaCookie)
      .send({ minutes: 5, entryAt: yesterday })
    expect(r.status).toBe(201)
    expect((await entryDays(r.body.data.id)).workDay).toBe(yesterday)
  })

  it('web: data futura é rejeitada pelo backend (sem passar pela interface) e nada é gravado', async () => {
    const { conveyorId, stepIds } = await conveyorWithMariaAssigned()
    const tp = timeEntriesPath(conveyorId, stepIds[0]!)
    for (const entryAt of [noonSp(tomorrow), `${tomorrow}T00:00:00-03:00`, tomorrow]) {
      const r = await request(app).post(tp).set('Cookie', mariaCookie).send({ minutes: 9, entryAt })
      expect(r.status).toBe(422)
      expect(r.body.error.code).toBe(ErrorCodes.TIME_ENTRY_FUTURE_DATE)
    }
    const withDone = await request(app)
      .post(tp)
      .set('Cookie', mariaCookie)
      .send({ minutes: 9, entryAt: noonSp(tomorrow), markAsDone: true })
    expect(withDone.status).toBe(422)
    expect(await countEntries(conveyorId)).toBe(0)
    const st = await pool.query<{ s: string | null }>(
      `SELECT operational_status AS s FROM conveyor_nodes WHERE id = $1::uuid`,
      [stepIds[0]],
    )
    expect(st.rows[0]?.s ?? 'PENDING').not.toBe('COMPLETED')
  })

  it('web: data passada + concluir atividade preserva a conclusão', async () => {
    const { conveyorId, stepIds } = await conveyorWithMariaAssigned()
    const r = await request(app)
      .post(timeEntriesPath(conveyorId, stepIds[0]!))
      .set('Cookie', mariaCookie)
      .send({ minutes: 20, entryAt: noonSp(yesterday), markAsDone: true })
    expect(r.status).toBe(201)
    expect((await entryDays(r.body.data.id)).workDay).toBe(yesterday)
    const st = await pool.query<{ s: string }>(
      `SELECT operational_status AS s FROM conveyor_nodes WHERE id = $1::uuid`,
      [stepIds[0]],
    )
    expect(st.rows[0]?.s).toBe('COMPLETED')
  })

  it('gerencial (em nome do colaborador): grava no dia escolhido e rejeita futuro', async () => {
    const { conveyorId, stepIds } = await conveyorWithMariaAssigned()
    const path = `${timeEntriesPath(conveyorId, stepIds[0]!)}/on-behalf`
    const ok = await request(app)
      .post(path)
      .set('Cookie', adminCookie)
      .send({
        targetCollaboratorId: SEED_COLLABORATOR_MARIA_ID,
        minutes: 33,
        entryAt: noonSp(yesterday),
        reason: 'Colaborador esqueceu de apontar',
      })
    expect(ok.status).toBe(201)
    const days = await entryDays(ok.body.data.id)
    expect(days.workDay).toBe(yesterday)
    expect(days.createdDay).toBe(today)
    expect(await dailyMinutes(conveyorId, today)).toBe(0)

    const list = await request(app)
      .get(timeEntriesPath(conveyorId, stepIds[0]!))
      .set('Cookie', adminCookie)
    expect(list.status).toBe(200)
    const listed = (list.body.data as Array<{ id: string; entryAt: string; createdAt: string }>).find(
      (e) => e.id === ok.body.data.id,
    )
    expect(listed?.entryAt).toBe(new Date(noonSp(yesterday)).toISOString())

    const future = await request(app)
      .post(path)
      .set('Cookie', adminCookie)
      .send({
        targetCollaboratorId: SEED_COLLABORATOR_MARIA_ID,
        minutes: 33,
        entryAt: noonSp(tomorrow),
        reason: 'x',
      })
    expect(future.status).toBe(422)
    expect(future.body.error.code).toBe(ErrorCodes.TIME_ENTRY_FUTURE_DATE)
  })

  it('Kiosk atividade planejada: grava no dia escolhido; sem data = hoje; futuro rejeitado', async () => {
    const { conveyorId, stepIds } = await conveyorWithMariaAssigned()
    const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
    const past = await request(app)
      .post('/api/v1/production/time-entries')
      .set('Cookie', cookie)
      .send({ conveyorId, stepNodeId: stepIds[0], minutes: 25, entryAt: noonSp(yesterday) })
    expect(past.status).toBe(201)
    expect((await entryDays(past.body.data.id)).workDay).toBe(yesterday)

    const now = await request(app)
      .post('/api/v1/production/time-entries')
      .set('Cookie', cookie)
      .send({ conveyorId, stepNodeId: stepIds[0], minutes: 10 })
    expect(now.status).toBe(201)
    expect((await entryDays(now.body.data.id)).workDay).toBe(today)

    expect(await dailyMinutes(conveyorId, yesterday)).toBe(25)
    expect(await dailyMinutes(conveyorId, today)).toBe(10)

    const future = await request(app)
      .post('/api/v1/production/time-entries')
      .set('Cookie', cookie)
      .send({ conveyorId, stepNodeId: stepIds[0], minutes: 10, entryAt: noonSp(tomorrow) })
    expect(future.status).toBe(422)
    expect(future.body.error.code).toBe(ErrorCodes.TIME_ENTRY_FUTURE_DATE)
  })

  it('Kiosk "Outra atividade": grava no dia escolhido e rejeita futuro', async () => {
    const { conveyorId, stepIds } = await conveyorWithMariaAssigned(2)
    await pool.query(
      `UPDATE conveyor_nodes SET operational_status = 'COMPLETED' WHERE id = $1::uuid`,
      [stepIds[0]],
    )
    const j = await pool.query<{ id: string; label: string }>(
      `SELECT id::text AS id, label FROM operational_time_entry_justifications
       WHERE is_active = true AND COALESCE(requires_complement, false) = false
       ORDER BY sort_order LIMIT 1`,
    )
    const just = j.rows[0]!
    const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
    const body = {
      conveyorId,
      stepNodeId: stepIds[1],
      minutes: 18,
      exceptionJustificationId: just.id,
      exceptionJustification: just.label,
    }
    const past = await request(app)
      .post('/api/v1/production/time-entries/unassigned-exception')
      .set('Cookie', cookie)
      .send({ ...body, entryAt: noonSp(yesterday) })
    expect(past.status).toBe(201)
    expect((await entryDays(past.body.data.id)).workDay).toBe(yesterday)

    const future = await request(app)
      .post('/api/v1/production/time-entries/unassigned-exception')
      .set('Cookie', cookie)
      .send({ ...body, entryAt: noonSp(tomorrow) })
    expect(future.status).toBe(422)
    expect(future.body.error.code).toBe(ErrorCodes.TIME_ENTRY_FUTURE_DATE)
  })

  it('Extra esteira web: dia escolhido, padrão hoje (SP), futuro rejeitado; jornada soma no dia', async () => {
    const past = await request(app)
      .post('/api/v1/me/extra-time-entries')
      .set('Cookie', mariaCookie)
      .send({ descriptionId: DESCRIPTION_ID, minutes: 14, entryDate: yesterday })
    expect(past.status).toBe(201)
    expect(past.body.data.entryDate).toBe(yesterday)

    const noDate = await request(app)
      .post('/api/v1/me/extra-time-entries')
      .set('Cookie', mariaCookie)
      .send({ descriptionId: DESCRIPTION_ID, minutes: 6 })
    expect(noDate.status).toBe(201)
    expect(noDate.body.data.entryDate).toBe(today)

    const future = await request(app)
      .post('/api/v1/me/extra-time-entries')
      .set('Cookie', mariaCookie)
      .send({ descriptionId: DESCRIPTION_ID, minutes: 6, entryDate: tomorrow })
    expect(future.status).toBe(422)

    const sums = await pool.query<{ day: string; s: string }>(
      `SELECT entry_date::text AS day, SUM(minutes)::text AS s
       FROM operational_extra_time_entries
       WHERE id = ANY($1::uuid[]) GROUP BY entry_date`,
      [[past.body.data.id, noDate.body.data.id]],
    )
    const byDay = Object.fromEntries(sums.rows.map((r) => [r.day, Number(r.s)]))
    expect(byDay[yesterday]).toBe(14)
    expect(byDay[today]).toBe(6)
  })

  it('Extra esteira Kiosk: mesma regra do web (dia escolhido, padrão hoje, futuro rejeitado)', async () => {
    const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
    const past = await request(app)
      .post('/api/v1/production/extra-time-entries')
      .set('Cookie', cookie)
      .send({ descriptionId: DESCRIPTION_ID, minutes: 12, entryDate: yesterday })
    expect(past.status).toBe(201)
    expect(past.body.data.entryDate).toBe(yesterday)

    const noDate = await request(app)
      .post('/api/v1/production/extra-time-entries')
      .set('Cookie', cookie)
      .send({ descriptionId: DESCRIPTION_ID, minutes: 4 })
    expect(noDate.status).toBe(201)
    expect(noDate.body.data.entryDate).toBe(today)

    const future = await request(app)
      .post('/api/v1/production/extra-time-entries')
      .set('Cookie', cookie)
      .send({ descriptionId: DESCRIPTION_ID, minutes: 4, entryDate: tomorrow })
    expect(future.status).toBe(422)
  })
})
