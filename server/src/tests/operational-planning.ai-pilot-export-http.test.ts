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
  fridayAfterMonday,
  mondayOfWeekContaining,
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

const EXPORT_PATH = '/api/v1/operational-planning/export-ai-pilot.xlsx'

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
      prioridade: 'alta',
      colaboradorId: null,
    },
    originType: 'MANUAL',
    baseId: null,
    baseCode: null,
    baseName: null,
    baseVersion: null,
    options: [
      {
        titulo: 'Tarefa IA',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'Setor IA',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: [
              { titulo: 'Etapa IA Um', orderIndex: 1, plannedMinutes: 30, sourceOrigin: 'manual', required: true },
              { titulo: 'Etapa IA Dois', orderIndex: 2, plannedMinutes: 20, sourceOrigin: 'manual', required: true },
              { titulo: 'Etapa IA Tres', orderIndex: 3, plannedMinutes: 10, sourceOrigin: 'manual', required: true },
            ],
          },
        ],
      },
    ],
  }
}

function binaryParser(
  response: NodeJS.ReadableStream,
  callback: (err: Error | null, body: Buffer) => void,
): void {
  const chunks: Buffer[] = []
  response.on('data', (chunk: Buffer) => chunks.push(chunk))
  response.on('end', () => callback(null, Buffer.concat(chunks)))
}

function sheetRows(wb: ExcelJS.Workbook, name: string): Record<string, unknown>[] {
  const ws = wb.getWorksheet(name)!
  const headers = (ws.getRow(1).values as unknown[]).slice(1).map(String)
  const out: Record<string, unknown>[] = []
  ws.eachRow((row, n) => {
    if (n === 1) return
    const values = (row.values as unknown[]).slice(1)
    out.push(Object.fromEntries(headers.map((h, i) => [h, values[i]])))
  })
  return out
}

describe.skipIf(!hasDb)('GET /operational-planning/export-ai-pilot.xlsx (integração)', () => {
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

  const adminCookie = () => sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL)

  it('sem sessão → 401', async () => {
    const res = await request(app).get(EXPORT_PATH)
    expect(res.status).toBe(401)
  })

  it('sem conveyors.create → 403', async () => {
    const res = await request(app)
      .get(EXPORT_PATH)
      .set('Cookie', await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL))
    expect(res.status).toBe(403)
  })

  it('data inválida → 422', async () => {
    const res = await request(app).get(`${EXPORT_PATH}?inicio=ontem`).set('Cookie', await adminCookie())
    expect(res.status).toBe(422)
  })

  it('fim antes de inicio → 400', async () => {
    const res = await request(app)
      .get(`${EXPORT_PATH}?inicio=2026-09-25&fim=2026-09-21`)
      .set('Cookie', await adminCookie())
    expect(res.status).toBe(400)
  })

  it('fluxo completo: minutos_ja_alocados = soma das alocações publicadas; rascunho ignorado', async () => {
    const cookie = await adminCookie()
    const created = await serviceCreateConveyor(pool, conveyorBody(`IA ${randomUUID().slice(0, 8)}`))
    const conveyorId = created.id
    const weekStart = mondayOfWeekContaining('2096-03-05')
    const weekEnd = fridayAfterMonday(weekStart)
    const cleanupWeek = async () => {
      await pool.query(
        `DELETE FROM operational_work_plan_items WHERE work_plan_id IN (
           SELECT id FROM operational_work_plans WHERE week_start_date = $1::date)`,
        [weekStart],
      )
      await pool.query(`DELETE FROM operational_work_plans WHERE week_start_date = $1::date`, [weekStart])
    }

    try {
      await cleanupWeek()
      await pool.query(`UPDATE conveyors SET operational_status = 'A_INICIAR' WHERE id = $1::uuid`, [
        conveyorId,
      ])
      const steps = (
        await pool.query<{ id: string }>(
          `SELECT id::text FROM conveyor_nodes
           WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
           ORDER BY order_index`,
          [conveyorId],
        )
      ).rows.map((r) => r.id)
      const [step1, step2, step3] = steps
      await pool.query(`UPDATE conveyor_nodes SET operational_status = 'IN_PROGRESS' WHERE id = $1::uuid`, [step2])
      await pool.query(`UPDATE conveyor_nodes SET operational_status = 'COMPLETED' WHERE id = $1::uuid`, [step3])
      await pool.query(
        `INSERT INTO conveyor_node_assignees
           (conveyor_id, conveyor_node_id, collaborator_id, assignment_type, is_primary, order_index)
         VALUES ($1::uuid, $2::uuid, $3::uuid, 'COLLABORATOR', true, 0)
         ON CONFLICT DO NOTHING`,
        [conveyorId, step1, MARIA_COLLABORATOR_ID],
      )

      const item = (activityNodeId: string, plannedMinutes: number, plannedOrder: number) => ({
        conveyorId,
        activityNodeId,
        assignedCollaboratorId: MARIA_COLLABORATOR_ID,
        plannedDate: weekStart,
        plannedOrder,
        plannedMinutes,
      })

      const draft = await request(app)
        .post('/api/v1/operational-planning/week')
        .set('Cookie', cookie)
        .send({ weekStartDate: weekStart, weekEndDate: weekEnd, items: [item(step1, 90, 0), item(step2, 45, 1)] })
      expect(draft.status).toBe(200)
      const planId = draft.body.data?.plan?.id as string
      const published = await request(app)
        .post(`/api/v1/operational-planning/week/${planId}/publish`)
        .set('Cookie', cookie)
      expect(published.status).toBe(200)

      // Revisão em rascunho com minutos diferentes — não pode entrar nas alocações fixas.
      const revision = await request(app)
        .post('/api/v1/operational-planning/week')
        .set('Cookie', cookie)
        .send({ weekStartDate: weekStart, weekEndDate: weekEnd, items: [item(step1, 400, 0)] })
      expect(revision.status).toBe(200)

      const res = await request(app)
        .get(`${EXPORT_PATH}?inicio=${weekStart}&fim=${weekEnd}`)
        .set('Cookie', cookie)
        .buffer(true)
        .parse(binaryParser)
      if (res.status !== 200) console.log("DBG", String(res.body))
      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toContain('spreadsheetml')
      expect(String(res.headers['content-disposition'])).toContain(
        `piloto-ia-planejamento-${weekStart}-a-${weekEnd}.xlsx`,
      )

      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(res.body as Buffer)

      const activities = sheetRows(wb, 'Atividades').filter((r) => r.esteira_id === conveyorId)
      expect(activities).toEqual([
        expect.objectContaining({ atividade_id: step1, prioridade: 1, status: 'pendente', duracao_minutos: 30, ordem_na_esteira: 1 }),
        expect.objectContaining({ atividade_id: step2, prioridade: 1, status: 'em_andamento', duracao_minutos: 20, ordem_na_esteira: 2 }),
      ])

      const sequences = sheetRows(wb, 'Sequencias').filter((r) => r.atividade_id === step1)
      expect(sequences).toEqual([
        expect.objectContaining({
          colaborador_id: MARIA_COLLABORATOR_ID,
          posicao_sequencia: 1,
          origem: 'designado_direto',
        }),
      ])

      const fixed = sheetRows(wb, 'AlocacoesFixas').filter(
        (r) => r.colaborador_id === MARIA_COLLABORATOR_ID && r.data === weekStart,
      )
      expect(fixed.map((r) => r.duracao_minutos).sort()).toEqual([45, 90])

      const capacity = sheetRows(wb, 'Capacidades').filter((r) => r.colaborador_id === MARIA_COLLABORATOR_ID)
      expect(capacity.map((r) => r.data)).toEqual(
        [0, 1, 2, 3, 4].map((i) => {
          const d = new Date(`${weekStart}T12:00:00Z`)
          d.setUTCDate(d.getUTCDate() + i)
          return d.toISOString().slice(0, 10)
        }),
      )
      const mondayRow = capacity.find((r) => r.data === weekStart)!
      const fixedSum = fixed.reduce((acc, r) => acc + Number(r.duracao_minutos), 0)
      expect(mondayRow.minutos_ja_alocados).toBe(135)
      expect(mondayRow.minutos_ja_alocados).toBe(fixedSum)
      expect(capacity.find((r) => r.data === weekEnd)?.minutos_ja_alocados).toBe(0)
    } finally {
      await cleanupWeek()
      await request(app).delete(`/api/v1/conveyors/${conveyorId}`).set('Cookie', cookie)
    }
  })
})
