import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import ExcelJS from 'exceljs'
import { createApp } from '../app.js'
import { createLogger } from '../plugins/logger.js'
import { closePool, getPool } from '../plugins/db.js'
import { hasDatabaseConnectionInEnv, loadDotenvFiles, loadEnv } from '../config/env.js'
import { serviceCreateConveyor } from '../modules/conveyors/conveyors.service.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'
import {
  mondayOfWeekContaining,
  fridayAfterMonday,
} from '../modules/operational-planning/operational-planning.week.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const GOV_ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const GOV_ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'
const MARIA_APP_USER_ID = '44444444-4444-4444-4444-444444444444'
const MARIA_EMAIL = 'maria@exemplo.com'
const MARIA_COLLABORATOR_ID = '3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c'

const EXPORT_PATH = '/api/v1/operational-planning/week/export-weekly-view.xlsx'

function conveyorBodyWithSteps(nome: string): PostConveyorBody {
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
        titulo: 'Tarefa WeeklyViewHTTP',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'Setor WeeklyViewHTTP',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: [
              { titulo: 'Etapa Um', orderIndex: 1, plannedMinutes: 30, sourceOrigin: 'manual', required: true },
              { titulo: 'Etapa Dois', orderIndex: 2, plannedMinutes: 30, sourceOrigin: 'manual', required: true },
            ],
          },
        ],
      },
    ],
  }
}

async function readXlsxBuffer(res: request.Response): Promise<Buffer> {
  return res.body as Buffer
}

describe.skipIf(!hasDb)('GET /operational-planning/week/export-weekly-view.xlsx (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    await ensureMariaCollaboratorSeedForIntegration(pool)

    const { hashPassword } = await import('../shared/password/password.js')
    const hash = await hashPassword('CollabGovTest1!')
    await pool.query(
      `INSERT INTO app_users (
          id, email, password_hash, is_active, role_id, must_change_password, password_changed_at
        ) VALUES ($1::uuid, $2, $3, true, $4::uuid, false, now())
        ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id, is_active = true, email = EXCLUDED.email`,
      [GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL, hash, ADMIN_ROLE_ID],
    )
  })

  afterAll(async () => {
    await closePool()
  })

  function adminCookie(): Promise<string> {
    return sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL)
  }

  function mariaCookie(): Promise<string> {
    return sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL)
  }

  it('sem sessão → 401', async () => {
    const res = await request(app).get(`${EXPORT_PATH}?weekStart=2026-09-07`)
    expect(res.status).toBe(401)
  })

  it('sem conveyors.create → 403', async () => {
    const res = await request(app)
      .get(`${EXPORT_PATH}?weekStart=2026-09-07`)
      .set('Cookie', await mariaCookie())
    expect(res.status).toBe(403)
  })

  it('weekStart inválido → erro de validação (422)', async () => {
    const res = await request(app)
      .get(`${EXPORT_PATH}?weekStart=not-a-date`)
      .set('Cookie', await adminCookie())
    expect(res.status).toBe(422)
    expect(res.body.error?.code).toBe('VALIDATION_ERROR')
  })

  it('semana sem plano (nem draft nem published) → erro de domínio, não 500', async () => {
    const weekStart = mondayOfWeekContaining('2099-07-06')
    const res = await request(app)
      .get(`${EXPORT_PATH}?weekStart=${weekStart}`)
      .set('Cookie', await adminCookie())
    expect(res.status).not.toBe(500)
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
    expect(res.headers['content-type']).not.toContain('spreadsheetml')
  })

  it('plano sem itens → erro de domínio, não gera arquivo vazio', async () => {
    const weekStart = mondayOfWeekContaining('2098-05-04')
    const weekEnd = fridayAfterMonday(weekStart)
    const cookie = await adminCookie()

    try {
      const postRes = await request(app)
        .post('/api/v1/operational-planning/week')
        .set('Cookie', cookie)
        .send({ weekStartDate: weekStart, weekEndDate: weekEnd, items: [] })
      expect(postRes.status).toBe(200)

      const res = await request(app)
        .get(`${EXPORT_PATH}?weekStart=${weekStart}`)
        .set('Cookie', cookie)
      expect(res.status).not.toBe(500)
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
      expect(res.headers['content-type']).not.toContain('spreadsheetml')
    } finally {
      await pool.query(
        `DELETE FROM operational_work_plan_items WHERE work_plan_id IN (
           SELECT id FROM operational_work_plans WHERE week_start_date = $1::date
         )`,
        [weekStart],
      )
      await pool.query(`DELETE FROM operational_work_plans WHERE week_start_date = $1::date`, [
        weekStart,
      ])
    }
  })

  it('fluxo completo: rascunho → publicado → revisão não publicada, com Content-Type/Content-Disposition/workbook corretos; sem escrita no banco; colaborador alheio ao plano não aparece', async () => {
    const cookie = await adminCookie()
    const label = `WeeklyViewHTTP ${randomUUID().slice(0, 8)}`
    const created = await serviceCreateConveyor(pool, conveyorBodyWithSteps(label))
    const conveyorId = created.id
    const weekStart = mondayOfWeekContaining('2097-06-02')
    const extraCollaboratorIds = [randomUUID(), randomUUID(), randomUUID()]

    try {
      const stepsRes = await pool.query<{ id: string }>(
        `SELECT id::text FROM conveyor_nodes
         WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
         ORDER BY order_index`,
        [conveyorId],
      )
      const [step1, step2] = stepsRes.rows.map((r) => r.id)
      expect(step1).toBeTruthy()
      expect(step2).toBeTruthy()

      // Colaboradores ativos SEM nenhum item no plano — não podem aparecer no arquivo.
      for (const [idx, id] of extraCollaboratorIds.entries()) {
        await pool.query(
          `INSERT INTO collaborators (id, full_name, status, is_active) VALUES ($1::uuid, $2, 'ACTIVE', true)`,
          [id, `Colaborador Alheio ${idx} ${id.slice(0, 6)}`],
        )
      }

      const weekEnd = fridayAfterMonday(weekStart)

      await pool.query(
        `DELETE FROM operational_work_plan_items WHERE work_plan_id IN (
           SELECT id FROM operational_work_plans WHERE week_start_date = $1::date
         )`,
        [weekStart],
      )
      await pool.query(`DELETE FROM operational_work_plans WHERE week_start_date = $1::date`, [
        weekStart,
      ])

      const body = {
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        items: [
          {
            conveyorId,
            activityNodeId: step1,
            assignedCollaboratorId: MARIA_COLLABORATOR_ID,
            plannedDate: weekStart,
            plannedOrder: 0,
            plannedMinutes: 90,
            notes: 'Observação normal',
          },
          {
            conveyorId,
            activityNodeId: step2,
            assignedCollaboratorId: MARIA_COLLABORATOR_ID,
            plannedDate: weekEnd,
            plannedOrder: 0,
            plannedMinutes: 45,
            notes: '=SUM(A1:A9)',
          },
        ],
      }

      const draftRes = await request(app)
        .post('/api/v1/operational-planning/week')
        .set('Cookie', cookie)
        .send(body)
      expect(draftRes.status).toBe(200)
      const planId = draftRes.body.data?.plan?.id as string
      expect(planId).toBeTruthy()

      const beforeCount = await pool.query<{ count: string }>(
        `SELECT count(*)::text FROM operational_work_plan_items WHERE work_plan_id = $1::uuid`,
        [planId],
      )

      // 1) RASCUNHO
      const draftExport = await request(app)
        .get(`${EXPORT_PATH}?weekStart=${weekStart}`)
        .set('Cookie', cookie)
        .buffer(true)
        .parse((response, callback) => {
          const chunks: Buffer[] = []
          response.on('data', (chunk: Buffer) => chunks.push(chunk))
          response.on('end', () => callback(null, Buffer.concat(chunks)))
        })
      expect(draftExport.status).toBe(200)
      expect(draftExport.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      expect(draftExport.headers['access-control-expose-headers']?.toLowerCase() ?? '').toContain(
        'content-disposition',
      )
      expect(String(draftExport.headers['content-disposition'])).toContain(
        `planejamento-semanal-visao-${weekStart}-a-${weekEnd}-rascunho.xlsx`,
      )

      // Nenhuma escrita durante a exportação (somente leitura).
      const afterCount = await pool.query<{ count: string }>(
        `SELECT count(*)::text FROM operational_work_plan_items WHERE work_plan_id = $1::uuid`,
        [planId],
      )
      expect(afterCount.rows[0]?.count).toBe(beforeCount.rows[0]?.count)

      const draftBuffer = await readXlsxBuffer(draftExport)
      const draftWorkbook = new ExcelJS.Workbook()
      await draftWorkbook.xlsx.load(draftBuffer)
      expect(draftWorkbook.worksheets.map((ws) => ws.name)).toEqual(['Visão semanal'])

      const sheet = draftWorkbook.getWorksheet('Visão semanal')
      const values = (sheet?.getSheetValues() ?? [])
        .flatMap((r) => (Array.isArray(r) ? r : []))
        .map((v) => String(v ?? ''))

      expect(values).toContain('Maria Silva')
      expect(values.some((v) => v.includes('Etapa Um'))).toBe(true)
      expect(values.some((v) => v.includes('Etapa Dois'))).toBe(true)
      expect(values).toContain("'=SUM(A1:A9)")
      expect(values.includes('=SUM(A1:A9)')).toBe(false)

      // Colaboradores alheios ao plano NÃO aparecem, mesmo estando ativos.
      for (const [idx] of extraCollaboratorIds.entries()) {
        expect(values.some((v) => v.includes(`Colaborador Alheio ${idx}`))).toBe(false)
      }

      const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
      for (const v of values) {
        expect(uuidRe.test(v)).toBe(false)
      }

      // 2) PUBLICADO
      const publishRes = await request(app)
        .post(`/api/v1/operational-planning/week/${planId}/publish`)
        .set('Cookie', cookie)
      expect(publishRes.status).toBe(200)

      const publishedExport = await request(app)
        .get(`${EXPORT_PATH}?weekStart=${weekStart}`)
        .set('Cookie', cookie)
      expect(publishedExport.status).toBe(200)
      expect(String(publishedExport.headers['content-disposition'])).toContain(
        `planejamento-semanal-visao-${weekStart}-a-${weekEnd}-publicado.xlsx`,
      )

      // 3) REVISÃO NÃO PUBLICADA
      const revisionRes = await request(app)
        .post('/api/v1/operational-planning/week')
        .set('Cookie', cookie)
        .send(body)
      expect(revisionRes.status).toBe(200)

      const revisionExport = await request(app)
        .get(`${EXPORT_PATH}?weekStart=${weekStart}`)
        .set('Cookie', cookie)
      expect(revisionExport.status).toBe(200)
      expect(String(revisionExport.headers['content-disposition'])).toContain(
        `planejamento-semanal-visao-${weekStart}-a-${weekEnd}-revisao-nao-publicada.xlsx`,
      )
    } finally {
      await pool.query(
        `DELETE FROM operational_work_plan_items WHERE work_plan_id IN (
           SELECT id FROM operational_work_plans WHERE week_start_date = $1::date
         )`,
        [weekStart],
      )
      await pool.query(`DELETE FROM operational_work_plans WHERE week_start_date = $1::date`, [
        weekStart,
      ])
      await request(app).delete(`/api/v1/conveyors/${conveyorId}`).set('Cookie', cookie)
      await pool.query(`DELETE FROM collaborators WHERE id = ANY($1::uuid[])`, [
        extraCollaboratorIds,
      ])
    }
  })
})
