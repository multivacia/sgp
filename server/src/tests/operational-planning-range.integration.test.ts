import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import ExcelJS from 'exceljs'
import { createApp } from '../app.js'
import { createLogger } from '../plugins/logger.js'
import { closePool, getPool } from '../plugins/db.js'
import { hasDatabaseConnectionInEnv, loadDotenvFiles, loadEnv } from '../config/env.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import {
  ensureMariaCollaboratorSeedForIntegration,
  MARIA_APP_USER_EMAIL,
  MARIA_APP_USER_ID,
} from './integrationSeedFixtures.js'
import { serviceCreateConveyor } from '../modules/conveyors/conveyors.service.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'
import {
  fridayAfterMonday,
  mondayOfWeekContaining,
} from '../modules/operational-planning/operational-planning.week.js'
import {
  servicePublishOperationalWeekPlan,
  serviceSaveOperationalWeekPlan,
} from '../modules/operational-planning/operational-planning.service.js'
import { PLANNING_AI_SHEET_NAMES } from '../modules/operational-planning/operational-planning.ai-export.js'

loadDotenvFiles()
const hasDb = hasDatabaseConnectionInEnv(process.env)

const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'
const SEED_ROLE_ID = '22222222-2222-2222-2222-222222222222'
const SEED_SECTOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const PR_ADMIN_ID = 'aaaaaaaa-bbbb-cccc-dddd-0000000000b1'
const PR_ADMIN_EMAIL = 'planning-range-admin@sgp-argos.local'
const PR_COLLAB_ID = 'aaaaaaaa-bbbb-cccc-dddd-0000000000b2'

/** Semanas distantes (2032) para não colidir com outros testes. */
const W1_DAY = '2032-04-06' // terça
const W2_DAY = '2032-04-14' // quarta (semana seguinte)
const W3_DAY = '2032-04-21' // fora do período pesquisado

function body(nome: string): PostConveyorBody {
  return {
    dados: {
      nome, cliente: 'Cliente PR', veiculo: 'V-PR', modeloVersao: '', placa: 'PRR1R11',
      observacoes: '', responsavel: '', prazoEstimado: '2032-04-30', prioridade: 'alta', colaboradorId: null,
    },
    originType: 'MANUAL', baseId: null, baseCode: null, baseName: null, baseVersion: null,
    options: [{
      titulo: 'Bancos', orderIndex: 1, sourceOrigin: 'manual',
      areas: [{
        titulo: 'Tapeçaria', orderIndex: 1, sourceOrigin: 'manual',
        steps: [
          { titulo: 'PR Corte', orderIndex: 1, plannedMinutes: 120, sourceOrigin: 'manual', required: true },
          { titulo: 'PR Costura', orderIndex: 2, plannedMinutes: 90, sourceOrigin: 'manual', required: true },
          { titulo: 'PR Montagem', orderIndex: 3, plannedMinutes: 60, sourceOrigin: 'manual', required: true },
          { titulo: 'PR Backlog livre', orderIndex: 4, plannedMinutes: 45, sourceOrigin: 'manual', required: true },
        ],
      }],
    }],
  }
}

/** Células `[h]:mm` voltam como fração de dia (número) ou como Date (época 30/12/1899). */
function durationMinutes(value: unknown): number {
  if (value instanceof Date) return Math.round((value.getTime() - Date.UTC(1899, 11, 30)) / 60_000)
  return Math.round(Number(value) * 1440)
}

describe.skipIf(!hasDb)('Planejamento por período e exportação para IA (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let adminCookie: string
  let stepNames: Map<string, string>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    await ensureMariaCollaboratorSeedForIntegration(pool)
    await pool.query(
      `INSERT INTO collaborators (id, code, full_name, email, sector_id, role_id, status, is_active)
       VALUES ($1::uuid, 'COL-PR-TEST', 'Colaborador Período Planejamento', 'pr-test@sgp.local',
               $2::uuid, $3::uuid, 'ACTIVE', true)
       ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE', is_active = true, deleted_at = NULL`,
      [PR_COLLAB_ID, SEED_SECTOR_ID, SEED_ROLE_ID],
    )
    const { hashPassword } = await import('../shared/password/password.js')
    await pool.query(
      `INSERT INTO app_users (id, email, password_hash, is_active, role_id, must_change_password, password_changed_at)
       VALUES ($1::uuid, $2, $3, true, $4::uuid, false, now())
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, is_active = true, role_id = EXCLUDED.role_id`,
      [PR_ADMIN_ID, PR_ADMIN_EMAIL, await hashPassword('PlanRange1!'), ADMIN_ROLE_ID],
    )
    adminCookie = await sessionCookieForUser(pool, PR_ADMIN_ID, PR_ADMIN_EMAIL)

    const conv = await serviceCreateConveyor(pool, body(`PR-${Date.now()}`))
    await pool.query(`UPDATE conveyors SET operational_status = 'EM_ANDAMENTO' WHERE id = $1::uuid`, [conv.id])
    const steps = await pool.query<{ id: string; name: string }>(
      `SELECT id::text, name FROM conveyor_nodes WHERE conveyor_id = $1::uuid AND node_type = 'STEP'
       AND deleted_at IS NULL ORDER BY order_index`,
      [conv.id],
    )
    stepNames = new Map(steps.rows.map((s) => [s.name, s.id]))
    const plan = async (day: string, stepName: string, minutes: number, publish: boolean) => {
      const ws = mondayOfWeekContaining(day)
      await pool.query(
        `UPDATE operational_work_plans SET deleted_at = now() WHERE week_start_date = $1::date AND deleted_at IS NULL`,
        [ws],
      )
      const saved = await serviceSaveOperationalWeekPlan(pool, PR_ADMIN_ID, {
        weekStartDate: ws,
        weekEndDate: fridayAfterMonday(ws),
        items: [{
          conveyorId: conv.id, activityNodeId: stepNames.get(stepName)!, assignedCollaboratorId: PR_COLLAB_ID,
          assignedTeamId: null, plannedDate: day, plannedOrder: 0, plannedMinutes: minutes, notes: null,
          conveyorOperationalPlanItemId: null,
        }],
      })
      if (publish) await servicePublishOperationalWeekPlan(pool, saved.plan!.id, PR_ADMIN_ID)
    }
    await plan(W1_DAY, 'PR Corte', 120, true) // publicado
    await plan(W2_DAY, 'PR Costura', 90, false) // rascunho
    await plan(W3_DAY, 'PR Montagem', 60, true) // fora do período
  })

  afterAll(async () => {
    await closePool()
  })

  it('period-items atravessa semanas (publicado + rascunho) e respeita o período', async () => {
    const res = await request(app)
      .get(`/api/v1/operational-planning/period-items?from=${W1_DAY}&to=${W2_DAY}`)
      .set('Cookie', adminCookie)
    expect(res.status).toBe(200)
    const data = res.body.data as {
      weeks: Array<{ weekStartDate: string; situation: string | null }>
      summary: { plannedItems: number; plannedMinutes: number }
      items: Array<{ activityTitle: string; planSituation: string; plannedDate: string }>
    }
    const mine = data.items.filter((i) => i.activityTitle.startsWith('PR '))
    expect(mine.map((i) => [i.activityTitle, i.planSituation]).sort()).toEqual([
      ['PR Corte', 'PUBLICADO'],
      ['PR Costura', 'RASCUNHO'],
    ])
    expect(data.weeks.map((w) => w.weekStartDate)).toEqual([
      mondayOfWeekContaining(W1_DAY),
      mondayOfWeekContaining(W2_DAY),
    ])
  })

  it('period-items: início > fim → 400; sem recorte → 400; colaborador sem permissão → 403', async () => {
    const bad = await request(app)
      .get(`/api/v1/operational-planning/period-items?from=${W2_DAY}&to=${W1_DAY}`)
      .set('Cookie', adminCookie)
    expect(bad.status).toBe(400)
    const none = await request(app).get('/api/v1/operational-planning/period-items').set('Cookie', adminCookie)
    expect(none.status).toBe(400)
    const maria = await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_APP_USER_EMAIL)
    const forbidden = await request(app)
      .get(`/api/v1/operational-planning/period-items?from=${W1_DAY}&to=${W2_DAY}`)
      .set('Cookie', maria)
    expect(forbidden.status).toBe(403)
  })

  it('export-ai.xlsx (período): abas, cabeçalhos, filtros, congelamento e consistência Planejado × Carga', async () => {
    const res = await request(app)
      .get(`/api/v1/operational-planning/export-ai.xlsx?from=${W1_DAY}&to=${W2_DAY}`)
      .set('Cookie', adminCookie)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = []
        r.on('data', (c: Buffer) => chunks.push(c))
        r.on('end', () => cb(null, Buffer.concat(chunks)))
      })
    expect(res.status).toBe(200)
    expect(res.headers['content-disposition']).toContain(`planejamento-ia-periodo-${W1_DAY}-a-${W2_DAY}.xlsx`)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(res.body as Buffer)
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      PLANNING_AI_SHEET_NAMES.prompt,
      PLANNING_AI_SHEET_NAMES.backlog,
      PLANNING_AI_SHEET_NAMES.planned,
      PLANNING_AI_SHEET_NAMES.load,
      PLANNING_AI_SHEET_NAMES.loadDaily,
    ])
    const prompt = wb.getWorksheet(PLANNING_AI_SHEET_NAMES.prompt)!
    const promptText = prompt.getColumn(1).values.join('\n')
    expect(promptText).toContain('NÃO altere')
    expect(promptText).toContain('saldo')

    const planned = wb.getWorksheet(PLANNING_AI_SHEET_NAMES.planned)!
    expect(planned.getRow(3).getCell(1).value).toBe('Semana (início)')
    expect(planned.views[0]).toMatchObject({ state: 'frozen', ySplit: 3 })
    expect(planned.autoFilter).toBeTruthy()
    const plannedRows: Array<{ collaboratorId: string; activity: string; minutes: number }> = []
    planned.eachRow((row, n) => {
      if (n <= 3) return
      plannedRows.push({
        collaboratorId: String(row.getCell(7).value),
        activity: String(row.getCell(17).value),
        minutes: durationMinutes(row.getCell(20).value),
      })
    })
    const mine = plannedRows.filter((r) => r.activity.startsWith('PR '))
    expect(mine.map((r) => r.activity).sort()).toEqual(['PR Corte', 'PR Costura'])
    expect(plannedRows.some((r) => r.activity === 'PR Montagem')).toBe(false)

    // Carga do colaborador = soma do Planejado do mesmo colaborador.
    const load = wb.getWorksheet(PLANNING_AI_SHEET_NAMES.load)!
    let loadRow: ExcelJS.Row | null = null
    load.eachRow((row, n) => {
      if (n > 3 && row.getCell(1).value === PR_COLLAB_ID) loadRow = row
    })
    expect(loadRow).not.toBeNull()
    const lr = loadRow as unknown as ExcelJS.Row
    const plannedForCollab = plannedRows
      .filter((r) => r.collaboratorId === PR_COLLAB_ID)
      .reduce((s, r) => s + r.minutes, 0)
    expect(durationMinutes(lr.getCell(7).value)).toBe(plannedForCollab)
    expect(plannedForCollab).toBe(210)
    expect(Number(lr.getCell(4).value)).toBe(7) // dias úteis de 06/04 (ter) a 14/04 (qua)
    const saldo = lr.getCell(8).value as { formula?: string } | null
    if (saldo && typeof saldo === 'object') expect(saldo.formula).toMatch(/^\(F\d+-G\d+\)\*1440$/)

    // Backlog: estoque atual elegível, inclui atividade não planejada com prioridade e prazo.
    const backlog = wb.getWorksheet(PLANNING_AI_SHEET_NAMES.backlog)!
    let backlogHit: ExcelJS.Row | null = null
    backlog.eachRow((row, n) => {
      if (n > 3 && row.getCell(2).value === stepNames.get('PR Backlog livre')) backlogHit = row
    })
    expect(backlogHit).not.toBeNull()
    const br = backlogHit as unknown as ExcelJS.Row
    expect(br.getCell(9).value).toBe('Alta')
    expect(br.getCell(14).value).toBe('PR Backlog livre')
    expect(durationMinutes(br.getCell(16).value)).toBe(45)
  })

  it('export-ai.xlsx (semana): usa a semana de weekStart', async () => {
    const res = await request(app)
      .get(`/api/v1/operational-planning/export-ai.xlsx?weekStart=${mondayOfWeekContaining(W3_DAY)}`)
      .set('Cookie', adminCookie)
    expect(res.status).toBe(200)
    expect(res.headers['content-disposition']).toContain(
      `planejamento-ia-semana-${mondayOfWeekContaining(W3_DAY)}-a-${fridayAfterMonday(mondayOfWeekContaining(W3_DAY))}.xlsx`,
    )
  })
})
