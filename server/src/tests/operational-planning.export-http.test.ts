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

const EXPORT_PATH = '/api/v1/operational-planning/week/export.xlsx'

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
        titulo: 'Tarefa ExportHTTP',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'Setor ExportHTTP',
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

describe.skipIf(!hasDb)('GET /operational-planning/week/export.xlsx (integração)', () => {
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
    const weekStart = mondayOfWeekContaining('2099-06-01')
    const res = await request(app)
      .get(`${EXPORT_PATH}?weekStart=${weekStart}`)
      .set('Cookie', await adminCookie())
    expect(res.status).not.toBe(500)
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
    expect(res.headers['content-type']).not.toContain('spreadsheetml')
  })

  it('plano sem itens → erro de domínio, não gera arquivo vazio', async () => {
    const weekStart = mondayOfWeekContaining('2098-04-06')
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
      // Limpeza garantida mesmo se alguma asserção falhar acima — remove itens E o plano.
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

  it('fluxo completo: rascunho → publicado → revisão não publicada, com Content-Type/Content-Disposition/workbook corretos', async () => {
    const cookie = await adminCookie()
    const label = `ExportHTTP ${randomUUID().slice(0, 8)}`
    const created = await serviceCreateConveyor(pool, conveyorBodyWithSteps(label))
    const conveyorId = created.id
    const weekStart = mondayOfWeekContaining('2097-05-05')

    try {
      await pool.query(
        `UPDATE conveyors
         SET client_name = $2, vehicle = $3, plate = $4, estimated_deadline = $5::date
         WHERE id = $1::uuid`,
        [conveyorId, 'Cliente HTTP', 'Onix 2020', 'HTTP1234', '2026-12-31'],
      )

      const stepsRes = await pool.query<{ id: string }>(
        `SELECT id::text FROM conveyor_nodes
         WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
         ORDER BY order_index`,
        [conveyorId],
      )
      const [step1, step2] = stepsRes.rows.map((r) => r.id)
      expect(step1).toBeTruthy()
      expect(step2).toBeTruthy()

      const weekEnd = fridayAfterMonday(weekStart)

      // Idempotência entre execuções repetidas na mesma base: limpa estado residual da semana.
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

      // Marca a 2ª etapa como concluída diretamente (rótulo "Concluída" no export).
      await pool.query(
        `UPDATE conveyor_nodes SET operational_status = 'COMPLETED' WHERE id = $1::uuid`,
        [step2],
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
      expect(String(draftExport.headers['content-disposition'])).toContain(
        `planejamento-semanal-${weekStart}-a-${weekEnd}-rascunho.xlsx`,
      )

      const draftBuffer = await readXlsxBuffer(draftExport)
      const draftWorkbook = new ExcelJS.Workbook()
      await draftWorkbook.xlsx.load(draftBuffer)
      expect(draftWorkbook.worksheets.map((ws) => ws.name)).toEqual(['Planejamento', 'Capacidade'])

      const planningSheet = draftWorkbook.getWorksheet('Planejamento')
      const planningValues = (planningSheet?.getSheetValues() ?? [])
        .flatMap((r) => (Array.isArray(r) ? r : []))
        .map((v) => String(v ?? ''))

      // Metadados da esteira resolvidos (não UUID).
      expect(planningValues).toContain('Cliente HTTP')
      expect(planningValues).toContain('Onix 2020')
      expect(planningValues).toContain('HTTP1234')
      expect(planningValues).toContain('Maria Silva')
      expect(planningValues.some((v) => v.includes('Etapa Um'))).toBe(true)
      expect(planningValues.some((v) => v.includes('Etapa Dois'))).toBe(true)
      // Status mapeado: aberta (PENDING) e concluída (COMPLETED).
      expect(planningValues).toContain('Aberta')
      expect(planningValues).toContain('Concluída')
      // Texto começando com "=" protegido.
      expect(planningValues).toContain("'=SUM(A1:A9)")
      expect(planningValues.includes('=SUM(A1:A9)')).toBe(false)

      // Nenhuma coluna visível contém UUID.
      const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
      for (const v of planningValues) {
        expect(uuidRe.test(v)).toBe(false)
      }

      // Nenhuma coluna de execução/tempo real/excedido/quantidade/tempo unitário.
      const forbidden = /realizad|excedid|quantidade|unit[áa]rio/i
      for (const v of planningValues) {
        expect(forbidden.test(v)).toBe(false)
      }

      // Ordenação: item da data mais cedo (weekStart, Etapa Um) antes do de weekEnd (Etapa Dois).
      // Header na linha 7 (ver PLANNING_HEADER_ROW); primeira linha de dados = 8.
      const headerRowIndex = 7
      const firstDataRow = planningSheet?.getRow(headerRowIndex + 1)
      expect(String(firstDataRow?.getCell(13).value)).toBe('Etapa Um')

      // Aba Capacidade: colaborador com plannedMinutes = 0 em algum dia da semana aparece.
      const capacitySheet = draftWorkbook.getWorksheet('Capacidade')
      const capacityRows = (capacitySheet?.getSheetValues() ?? []).slice(4)
      const mariaCapacityRows = capacityRows.filter(
        (r) => Array.isArray(r) && String(r[3] ?? '') === 'Maria Silva',
      )
      expect(mariaCapacityRows.length).toBeGreaterThanOrEqual(1)

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
        `planejamento-semanal-${weekStart}-a-${weekEnd}-publicado.xlsx`,
      )

      // 3) REVISÃO NÃO PUBLICADA (nova revisão a partir do published)
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
        `planejamento-semanal-${weekStart}-a-${weekEnd}-revisao-nao-publicada.xlsx`,
      )
    } finally {
      // Limpeza garantida mesmo se alguma asserção falhar acima.
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
    }
  })
})
