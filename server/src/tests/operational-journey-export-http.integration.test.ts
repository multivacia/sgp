import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import ExcelJS from 'exceljs'
import { createApp } from '../app.js'
import { createLogger } from '../plugins/logger.js'
import { closePool, getPool } from '../plugins/db.js'
import { hasDatabaseConnectionInEnv, loadDotenvFiles, loadEnv } from '../config/env.js'
import { hashPassword } from '../shared/password/password.js'
import { serviceCreateConveyor } from '../modules/conveyors/conveyors.service.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'
import { sessionCookieForUser } from './sessionTestCookie.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const EXPORT_PATH = '/api/v1/collaborators/operational-journey/export.xlsx'

const COLAB_ROLE_ID = '22222222-2222-2222-2222-222222222222'
const GESTOR_ROLE_ID = '33333333-3333-3333-3333-333333333333'
const COLAB_ONLY_USER_ID = 'e7e7e7e7-e7e7-4e7e-8e7e-e7e7e7e7e701'
const COLAB_ONLY_EMAIL = 'journey-export-colab-only-e7@sgp-argos.local'
const GESTOR_USER_ID = 'e7e7e7e7-e7e7-4e7e-8e7e-e7e7e7e7e702'
const GESTOR_EMAIL = 'journey-export-gestor-e7@sgp-argos.local'

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
        titulo: 'Tarefa Export',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'Setor Export',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: [
              {
                titulo: 'Atividade Export',
                orderIndex: 1,
                plannedMinutes: 20,
                plannedQuantity: 3,
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

function binary(req: request.Test): request.Test {
  return req.buffer(true).parse((response, callback) => {
    const chunks: Buffer[] = []
    response.on('data', (chunk: Buffer) => chunks.push(chunk))
    response.on('end', () => callback(null, Buffer.concat(chunks)))
  })
}

function durationMinutes(value: ExcelJS.CellValue): number {
  if (value instanceof Date) return Math.round((value.getTime() - Date.UTC(1899, 11, 30)) / 60000)
  return Math.round(Number(value) * 1440)
}

describe.skipIf(!hasDb)('GET /collaborators/operational-journey/export.xlsx (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  const suffix = randomUUID().slice(0, 8)
  const ana = { id: randomUUID(), name: `Export Ana ${suffix}` }
  const bruno = { id: randomUUID(), name: `Export Bruno ${suffix}` }
  let conveyorId = ''

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    const hash = await hashPassword('JourneyExport1!')
    for (const [id, email, role] of [
      [COLAB_ONLY_USER_ID, COLAB_ONLY_EMAIL, COLAB_ROLE_ID],
      [GESTOR_USER_ID, GESTOR_EMAIL, GESTOR_ROLE_ID],
    ] as const) {
      await pool.query(
        `INSERT INTO app_users (
            id, email, password_hash, is_active, role_id, must_change_password, password_changed_at
          ) VALUES ($1::uuid, $2, $3, true, $4::uuid, false, now())
          ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id, is_active = true, email = EXCLUDED.email`,
        [id, email, hash, role],
      )
    }
    for (const c of [ana, bruno]) {
      await pool.query(
        `INSERT INTO collaborators (id, full_name, code, status, is_active)
         VALUES ($1::uuid, $2, $3, 'ACTIVE', true)`,
        [c.id, c.name, `EXP-${c.id.slice(0, 6)}`],
      )
    }
    const created = await serviceCreateConveyor(pool, conveyorBody(`Export jornada ${suffix}`))
    conveyorId = created.id
    const step = await pool.query<{ id: string; planned_quantity: number }>(
      `SELECT id::text, planned_quantity FROM conveyor_nodes
       WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL`,
      [conveyorId],
    )
    const stepId = step.rows[0]!.id
    const insertEntry = (cid: string, nodeId: string, collaboratorId: string, minutes: number) =>
      pool.query(
        `INSERT INTO conveyor_time_entries (
           id, conveyor_id, conveyor_node_id, collaborator_id, entry_at, minutes, entry_mode
         ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, now(), $5, 'manual')`,
        [randomUUID(), cid, nodeId, collaboratorId, minutes],
      )
    await insertEntry(conveyorId, stepId, ana.id, 30)
    await insertEntry(conveyorId, stepId, ana.id, 15)
    await insertEntry(conveyorId, stepId, bruno.id, 40)

    // Apontamento em esteira removida: não aparece no histórico, logo não entra nos totais.
    const removed = await serviceCreateConveyor(pool, conveyorBody(`Export removida ${suffix}`))
    const removedStep = await pool.query<{ id: string }>(
      `SELECT id::text FROM conveyor_nodes WHERE conveyor_id = $1::uuid AND node_type = 'STEP'`,
      [removed.id],
    )
    await insertEntry(removed.id, removedStep.rows[0]!.id, ana.id, 100)
    await pool.query(`UPDATE conveyors SET deleted_at = now() WHERE id = $1::uuid`, [removed.id])
  })

  afterAll(async () => {
    await closePool()
  })

  it('quantidade informada na criação compõe o previsto (20 min × 3)', async () => {
    const r = await pool.query<{ planned_quantity: number; total_planned_minutes: number }>(
      `SELECT n.planned_quantity, c.total_planned_minutes
       FROM conveyor_nodes n JOIN conveyors c ON c.id = n.conveyor_id
       WHERE n.conveyor_id = $1::uuid AND n.node_type = 'STEP'`,
      [conveyorId],
    )
    expect(r.rows[0]!.planned_quantity).toBe(3)
    expect(r.rows[0]!.total_planned_minutes).toBe(60)
  })

  it('sem cookie → 401; sem collaborators_admin.view → 403', async () => {
    const noAuth = await request(app).get(`${EXPORT_PATH}?collaboratorIds=${ana.id}`)
    expect(noAuth.status).toBe(401)
    const colab = await request(app)
      .get(`${EXPORT_PATH}?collaboratorIds=${ana.id}`)
      .set('Cookie', await sessionCookieForUser(pool, COLAB_ONLY_USER_ID, COLAB_ONLY_EMAIL))
    expect(colab.status).toBe(403)
  })

  it('collaboratorIds ausente ou inválido → 422; inexistente → 404', async () => {
    const cookie = await sessionCookieForUser(pool, GESTOR_USER_ID, GESTOR_EMAIL)
    expect((await request(app).get(EXPORT_PATH).set('Cookie', cookie)).status).toBe(422)
    expect(
      (await request(app).get(`${EXPORT_PATH}?collaboratorIds=abc`).set('Cookie', cookie)).status,
    ).toBe(422)
    expect(
      (
        await request(app)
          .get(`${EXPORT_PATH}?collaboratorIds=00000000-0000-0000-0000-000000000001`)
          .set('Cookie', cookie)
      ).status,
    ).toBe(404)
  })

  it('totais da tela ignoram apontamento de esteira removida (mesmo critério do histórico)', async () => {
    const res = await request(app)
      .get(`/api/v1/collaborators/${ana.id}/operational-journey?periodPreset=7d`)
      .set('Cookie', await sessionCookieForUser(pool, GESTOR_USER_ID, GESTOR_EMAIL))
    expect(res.status).toBe(200)
    const listed = (res.body.data.recentTimeEntries as Array<{ minutes: number }>).reduce(
      (s, e) => s + e.minutes,
      0,
    )
    expect(listed).toBe(45)
    expect(res.body.data.execution.realizedMinutesInPeriod).toBe(45)
    expect(res.body.data.execution.realizedMinutesTotal).toBe(45)
  })

  it('vários colaboradores: XLSX com identificação, período, apontamentos e totais iguais aos da tela', async () => {
    const cookie = await sessionCookieForUser(pool, GESTOR_USER_ID, GESTOR_EMAIL)
    const res = await binary(
      request(app)
        .get(`${EXPORT_PATH}?collaboratorIds=${bruno.id},${ana.id}&periodPreset=7d`)
        .set('Cookie', cookie),
    )
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    expect(String(res.headers['content-disposition'])).toMatch(
      /jornada-2-colaboradores-\d{4}-\d{2}-\d{2}-a-\d{4}-\d{2}-\d{2}\.xlsx/,
    )

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(res.body as ArrayBuffer)
    expect(wb.worksheets.map((s) => s.name)).toEqual(['Resumo', 'Apontamentos', 'Extra esteira'])

    const resumo = wb.getWorksheet('Resumo')!
    expect(String(resumo.getCell(2, 1).value)).toMatch(/^Período: \d{2}\/\d{2}\/\d{4} a \d{2}\/\d{2}\/\d{4}/)
    // Ordenado por nome: Ana, Bruno, Total geral.
    expect(resumo.getCell(9, 1).value).toBe(ana.name)
    expect(resumo.getCell(9, 2).value).toBe(`EXP-${ana.id.slice(0, 6)}`)
    expect(resumo.getCell(9, 4).value).toBe(2)
    expect(durationMinutes(resumo.getCell(9, 5).value)).toBe(45)
    expect(resumo.getCell(10, 1).value).toBe(bruno.name)
    expect(durationMinutes(resumo.getCell(10, 5).value)).toBe(40)
    expect(resumo.getCell(11, 1).value).toBe('Total geral')
    expect(resumo.getCell(11, 4).value).toBe(3)
    expect(durationMinutes(resumo.getCell(11, 5).value)).toBe(85)

    // Mesmos totais que a tela devolve para cada colaborador.
    for (const [c, row] of [
      [ana, 9],
      [bruno, 10],
    ] as const) {
      const j = await request(app)
        .get(`/api/v1/collaborators/${c.id}/operational-journey?periodPreset=7d`)
        .set('Cookie', cookie)
      expect(durationMinutes(resumo.getCell(row, 5).value)).toBe(
        j.body.data.execution.realizedMinutesInPeriod,
      )
      expect(resumo.getCell(row, 8).value).toBe(j.body.data.load.assignmentCount)
    }

    const ap = wb.getWorksheet('Apontamentos')!
    const rows: Array<[unknown, unknown, unknown]> = []
    ap.eachRow((row, n) => {
      if (n > 3) rows.push([row.getCell(1).value, row.getCell(8).value, row.getCell(10).value])
    })
    expect(rows.filter((r) => r[0] === ana.name).map((r) => r[2])).toEqual([30, 15])
    expect(rows.find((r) => r[0] === `Subtotal — ${ana.name}`)?.[2]).toBe(45)
    expect(rows.find((r) => r[0] === `Subtotal — ${bruno.name}`)?.[2]).toBe(40)
    expect(rows.find((r) => r[0] === 'Total geral')?.[2]).toBe(85)
    expect(rows.filter((r) => r[0] === ana.name).every((r) => r[1] === 'Atividade Export')).toBe(true)
  })

  it('um colaborador (compatibilidade): sem linha de total geral', async () => {
    const res = await binary(
      request(app)
        .get(`${EXPORT_PATH}?collaboratorIds=${ana.id}`)
        .set('Cookie', await sessionCookieForUser(pool, GESTOR_USER_ID, GESTOR_EMAIL)),
    )
    expect(res.status).toBe(200)
    expect(String(res.headers['content-disposition'])).toContain('jornada-colaborador-')
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(res.body as ArrayBuffer)
    const resumo = wb.getWorksheet('Resumo')!
    expect(resumo.getCell(9, 1).value).toBe(ana.name)
    expect(resumo.getCell(10, 1).value).toBeNull()
  })
})
