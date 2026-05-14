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
import { hashPassword } from '../shared/password/password.js'
import { sessionCookieForUser } from './sessionTestCookie.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const GOV_ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const GOV_ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'

describe.skipIf(!hasDb)('operation-matrix (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    const hash = await hashPassword('CollabGovTest1!')
    await pool.query(
      `INSERT INTO app_users (
          id, email, password_hash, is_active, role_id, must_change_password, password_changed_at
        ) VALUES (
          $1::uuid, $2, $3, true, $4::uuid, false, now()
        )
        ON CONFLICT (id) DO UPDATE SET
          role_id = EXCLUDED.role_id,
          is_active = true,
          email = EXCLUDED.email`,
      [GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL, hash, ADMIN_ROLE_ID],
    )
  })

  afterAll(async () => {
    await closePool()
  })

  it('GET /api/v1/operation-matrix/items sem sessão → 401', async () => {
    const res = await request(app).get('/api/v1/operation-matrix/items')
    expect(res.status).toBe(401)
  })

  it('GET /api/v1/operation-matrix/items retorna lista', async () => {
    const res = await request(app)
      .get('/api/v1/operation-matrix/items')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(typeof res.body.meta?.total).toBe('number')
  })

  it('GET /api/v1/operation-matrix/suggestion-catalog retorna três coleções enxutas', async () => {
    const res = await request(app)
      .get('/api/v1/operation-matrix/suggestion-catalog')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
    expect(res.status).toBe(200)
    const d = res.body.data as {
      options?: unknown
      areas?: unknown
      activities?: unknown
    }
    expect(Array.isArray(d.options)).toBe(true)
    expect(Array.isArray(d.areas)).toBe(true)
    expect(Array.isArray(d.activities)).toBe(true)
    expect(typeof res.body.meta?.optionCount).toBe('number')
    expect(typeof res.body.meta?.areaCount).toBe('number')
    expect(typeof res.body.meta?.activityCount).toBe('number')
    for (const row of [
      ...(d.options as { id?: unknown; label?: unknown; code?: unknown }[]),
      ...(d.areas as { id?: unknown; label?: unknown; code?: unknown }[]),
      ...(d.activities as { id?: unknown; label?: unknown; code?: unknown }[]),
    ]) {
      expect(typeof row.id).toBe('string')
      expect(typeof row.label).toBe('string')
      expect(row.code === null || typeof row.code === 'string').toBe(true)
    }
  })

  it('fluxo: criar ITEM → TASK → SECTOR → ACTIVITY, árvore aninhada, PATCH e DELETE', async () => {
    const itemName = `Mtx test ${randomUUID().slice(0, 8)}`

    const rItem = await request(app)
      .post('/api/v1/operation-matrix/nodes')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({
        nodeType: 'ITEM',
        name: itemName,
        isActive: true,
      })
    expect(rItem.status).toBe(201)
    const itemId = rItem.body.data?.id as string
    expect(itemId).toBeTruthy()

    const rTask = await request(app)
      .post('/api/v1/operation-matrix/nodes')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({
        nodeType: 'TASK',
        parentId: itemId,
        name: 'Tarefa A',
      })
    expect(rTask.status).toBe(201)
    const taskId = rTask.body.data?.id as string

    const rSec = await request(app)
      .post('/api/v1/operation-matrix/nodes')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({
        nodeType: 'SECTOR',
        parentId: taskId,
        name: 'Setor A',
      })
    expect(rSec.status).toBe(201)
    const sectorId = rSec.body.data?.id as string

    const rAct = await request(app)
      .post('/api/v1/operation-matrix/nodes')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({
        nodeType: 'ACTIVITY',
        parentId: sectorId,
        name: 'Atividade A',
        plannedMinutes: 30,
        required: true,
      })
    expect(rAct.status).toBe(201)

    const rTree = await request(app)
      .get(`/api/v1/operation-matrix/items/${itemId}/tree`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
    expect(rTree.status).toBe(200)
    const tree = rTree.body.data
    expect(tree.node_type).toBe('ITEM')
    expect(tree.children?.length).toBeGreaterThanOrEqual(1)
    expect(tree.children[0].node_type).toBe('TASK')

    const rPatch = await request(app)
      .patch(`/api/v1/operation-matrix/nodes/${sectorId}`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ name: 'Setor A renomeado' })
    expect(rPatch.status).toBe(200)
    expect(rPatch.body.data?.name).toBe('Setor A renomeado')

    const rBad = await request(app)
      .patch(`/api/v1/operation-matrix/nodes/${taskId}`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ plannedMinutes: 10 })
    expect(rBad.status).toBe(422)

    const rDel = await request(app)
      .delete(`/api/v1/operation-matrix/nodes/${itemId}`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
    expect(rDel.status).toBe(200)
    expect(rDel.body.data?.removedCount).toBeGreaterThan(0)

    const rGone = await request(app)
      .get(`/api/v1/operation-matrix/items/${itemId}/tree`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
    expect(rGone.status).toBe(404)
  })

  it('ACTIVITY aceita teamIds, valida team inexistente e preserva teams na duplicação', async () => {
    const teamId = randomUUID()
    await pool.query(
      `INSERT INTO teams (id, name, is_active) VALUES ($1::uuid, $2, true)`,
      [teamId, `Team matrix ${teamId.slice(0, 8)}`],
    )

    const rItem = await request(app)
      .post('/api/v1/operation-matrix/nodes')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({
        nodeType: 'ITEM',
        name: `Mtx teams ${randomUUID().slice(0, 8)}`,
        isActive: true,
      })
    expect(rItem.status).toBe(201)
    const itemId = rItem.body.data?.id as string

    const rTask = await request(app)
      .post('/api/v1/operation-matrix/nodes')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({
        nodeType: 'TASK',
        parentId: itemId,
        name: 'Opção teams',
      })
    expect(rTask.status).toBe(201)
    const taskId = rTask.body.data?.id as string

    const rSector = await request(app)
      .post('/api/v1/operation-matrix/nodes')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({
        nodeType: 'SECTOR',
        parentId: taskId,
        name: 'Área teams',
      })
    expect(rSector.status).toBe(201)
    const sectorId = rSector.body.data?.id as string

    const rAct = await request(app)
      .post('/api/v1/operation-matrix/nodes')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({
        nodeType: 'ACTIVITY',
        parentId: sectorId,
        name: 'Etapa teams',
        teamIds: [teamId],
      })
    expect(rAct.status).toBe(201)
    const activityId = rAct.body.data?.id as string
    expect(rAct.body.data?.team_ids).toEqual([teamId])

    const rBadTeam = await request(app)
      .patch(`/api/v1/operation-matrix/nodes/${activityId}`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({
        teamIds: [randomUUID()],
      })
    expect(rBadTeam.status).toBe(422)

    const rDup = await request(app)
      .post(`/api/v1/operation-matrix/nodes/${activityId}/duplicate`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
    expect(rDup.status).toBe(201)

    const rTree = await request(app)
      .get(`/api/v1/operation-matrix/items/${itemId}/tree`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
    expect(rTree.status).toBe(200)

    const task = rTree.body.data?.children?.find((n: { node_type?: string }) => n.node_type === 'TASK')
    const sector = task?.children?.find((n: { node_type?: string }) => n.node_type === 'SECTOR')
    const activities = (sector?.children ?? []).filter(
      (n: { node_type?: string }) => n.node_type === 'ACTIVITY',
    )
    expect(activities.length).toBeGreaterThanOrEqual(2)
    for (const act of activities) {
      expect(Array.isArray(act.team_ids)).toBe(true)
      expect(act.team_ids).toContain(teamId)
    }
  })

  it('POST /operation-matrix/items/:id/duplicate sem sessão → 401', async () => {
    const res = await request(app).post(
      `/api/v1/operation-matrix/items/${randomUUID()}/duplicate`,
    )
    expect(res.status).toBe(401)
  })

  it('POST /operation-matrix/items/:id/duplicate matriz ausente → 404', async () => {
    const res = await request(app)
      .post(`/api/v1/operation-matrix/items/${randomUUID()}/duplicate`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
    expect(res.status).toBe(404)
  })

  it('POST /operation-matrix/items/:id/duplicate duplica matriz só com ITEM raiz', async () => {
    const cookie = await sessionCookieForUser(
      pool,
      GOV_ADMIN_USER_ID,
      GOV_ADMIN_EMAIL,
    )
    const nm = `SoloItem ${randomUUID().slice(0, 8)}`
    const rItem = await request(app)
      .post('/api/v1/operation-matrix/nodes')
      .set('Cookie', cookie)
      .send({ nodeType: 'ITEM', name: nm, isActive: true })
    expect(rItem.status).toBe(201)
    const id = rItem.body.data?.id as string

    const rDup = await request(app)
      .post(`/api/v1/operation-matrix/items/${id}/duplicate`)
      .set('Cookie', cookie)
    expect(rDup.status).toBe(201)
    expect(rDup.body.data?.name).toBe(`${nm} (Cópia)`)
    const tid = rDup.body.data?.id as string

    const tr = await request(app)
      .get(`/api/v1/operation-matrix/items/${tid}/tree`)
      .set('Cookie', cookie)
    expect(tr.status).toBe(200)
    expect(tr.body.data?.children?.length ?? 0).toBe(0)

    await request(app)
      .delete(`/api/v1/operation-matrix/nodes/${tid}`)
      .set('Cookie', cookie)
    await request(app)
      .delete(`/api/v1/operation-matrix/nodes/${id}`)
      .set('Cookie', cookie)
  })

  it('POST /operation-matrix/items/:id/duplicate: cópia nomeada, estrutura, ordem, planned_minutes, equipe, is_active', async () => {
    const cookie = await sessionCookieForUser(
      pool,
      GOV_ADMIN_USER_ID,
      GOV_ADMIN_EMAIL,
    )
    const teamId = randomUUID()
    await pool.query(
      `INSERT INTO teams (id, name, is_active) VALUES ($1::uuid, $2, true)`,
      [teamId, `Team itemdup ${teamId.slice(0, 6)}`],
    )

    const baseName = `ItemDup ${randomUUID().slice(0, 8)}`
    const rItem = await request(app)
      .post('/api/v1/operation-matrix/nodes')
      .set('Cookie', cookie)
      .send({
        nodeType: 'ITEM',
        name: baseName,
        isActive: false,
      })
    expect(rItem.status).toBe(201)
    const itemId = rItem.body.data?.id as string

    const rTask1 = await request(app)
      .post('/api/v1/operation-matrix/nodes')
      .set('Cookie', cookie)
      .send({ nodeType: 'TASK', parentId: itemId, name: 'Zebra' })
    const rTask2 = await request(app)
      .post('/api/v1/operation-matrix/nodes')
      .set('Cookie', cookie)
      .send({ nodeType: 'TASK', parentId: itemId, name: 'Alpha' })
    expect(rTask1.status).toBe(201)
    expect(rTask2.status).toBe(201)
    const task1Id = rTask1.body.data?.id as string

    const rSec = await request(app)
      .post('/api/v1/operation-matrix/nodes')
      .set('Cookie', cookie)
      .send({ nodeType: 'SECTOR', parentId: task1Id, name: 'S1' })
    expect(rSec.status).toBe(201)
    const sectorId = rSec.body.data?.id as string

    const rAct = await request(app)
      .post('/api/v1/operation-matrix/nodes')
      .set('Cookie', cookie)
      .send({
        nodeType: 'ACTIVITY',
        parentId: sectorId,
        name: 'Act77',
        plannedMinutes: 77,
        teamIds: [teamId],
      })
    expect(rAct.status).toBe(201)

    const rTreeBefore = await request(app)
      .get(`/api/v1/operation-matrix/items/${itemId}/tree`)
      .set('Cookie', cookie)
    expect(rTreeBefore.status).toBe(200)
    const origOrder =
      rTreeBefore.body.data?.children?.map((c: { name: string }) => c.name) ?? []

    const rDup1 = await request(app)
      .post(`/api/v1/operation-matrix/items/${itemId}/duplicate`)
      .set('Cookie', cookie)
    expect(rDup1.status).toBe(201)
    expect(rDup1.body.data?.name).toBe(`${baseName} (Cópia)`)
    expect(typeof rDup1.body.data?.id).toBe('string')
    const newId1 = rDup1.body.data?.id as string
    expect(newId1).not.toBe(itemId)

    const rDup2 = await request(app)
      .post(`/api/v1/operation-matrix/items/${itemId}/duplicate`)
      .set('Cookie', cookie)
    expect(rDup2.status).toBe(201)
    expect(rDup2.body.data?.name).toBe(`${baseName} (Cópia 2)`)

    const rTreeNew = await request(app)
      .get(`/api/v1/operation-matrix/items/${newId1}/tree`)
      .set('Cookie', cookie)
    expect(rTreeNew.status).toBe(200)
    const rootNew = rTreeNew.body.data
    expect(rootNew?.children?.map((c: { name: string }) => c.name)).toEqual(
      origOrder,
    )
    const zebra = rootNew?.children?.find(
      (c: { name: string }) => c.name === 'Zebra',
    )
    const act = zebra?.children?.[0]?.children?.find(
      (n: { node_type?: string }) => n.node_type === 'ACTIVITY',
    )
    expect(act?.planned_minutes).toBe(77)
    expect(act?.team_ids).toContain(teamId)

    const rBad = await request(app)
      .post(`/api/v1/operation-matrix/items/${task1Id}/duplicate`)
      .set('Cookie', cookie)
    expect(rBad.status).toBe(404)

    const newId2 = rDup2.body.data?.id as string
    for (const nid of [newId2, newId1, itemId]) {
      await request(app)
        .delete(`/api/v1/operation-matrix/nodes/${nid}`)
        .set('Cookie', cookie)
    }
    await pool.query(
      `DELETE FROM matrix_node_assignment_teams WHERE team_id = $1::uuid`,
      [teamId],
    )
    await pool.query(`DELETE FROM teams WHERE id = $1::uuid`, [teamId])
  })

  it('GET /operation-matrix/items/:id/export.xlsx sem sessão → 401', async () => {
    const res = await request(app).get(
      `/api/v1/operation-matrix/items/${randomUUID()}/export.xlsx`,
    )
    expect(res.status).toBe(401)
  })

  it('GET /operation-matrix/items/:id/export.xlsx matriz ausente → 404', async () => {
    const res = await request(app)
      .get(`/api/v1/operation-matrix/items/${randomUUID()}/export.xlsx`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
    expect(res.status).toBe(404)
  })

  it('GET /operation-matrix/items/:id/export.xlsx gera XLSX com hierarquia, ordem, tempo e equipe', async () => {
    const ExcelJS = (await import('exceljs')).default
    const cookie = await sessionCookieForUser(
      pool,
      GOV_ADMIN_USER_ID,
      GOV_ADMIN_EMAIL,
    )
    const teamId = randomUUID()
    const teamName = `Team export ${teamId.slice(0, 6)}`
    await pool.query(
      `INSERT INTO teams (id, name, is_active) VALUES ($1::uuid, $2, true)`,
      [teamId, teamName],
    )

    const baseName = `Export ${randomUUID().slice(0, 8)}`
    const rItem = await request(app)
      .post('/api/v1/operation-matrix/nodes')
      .set('Cookie', cookie)
      .send({
        nodeType: 'ITEM',
        name: baseName,
        code: 'MX-EXP',
        description: 'Descrição export',
        isActive: true,
      })
    expect(rItem.status).toBe(201)
    const itemId = rItem.body.data?.id as string

    const rTask1 = await request(app)
      .post('/api/v1/operation-matrix/nodes')
      .set('Cookie', cookie)
      .send({ nodeType: 'TASK', parentId: itemId, name: 'Alpha' })
    const rTask2 = await request(app)
      .post('/api/v1/operation-matrix/nodes')
      .set('Cookie', cookie)
      .send({ nodeType: 'TASK', parentId: itemId, name: 'Zebra' })
    expect(rTask1.status).toBe(201)
    expect(rTask2.status).toBe(201)
    const task1Id = rTask1.body.data?.id as string
    const task2Id = rTask2.body.data?.id as string

    const rSec = await request(app)
      .post('/api/v1/operation-matrix/nodes')
      .set('Cookie', cookie)
      .send({ nodeType: 'SECTOR', parentId: task1Id, name: 'Setor A' })
    expect(rSec.status).toBe(201)
    const sectorId = rSec.body.data?.id as string

    const rSecZ = await request(app)
      .post('/api/v1/operation-matrix/nodes')
      .set('Cookie', cookie)
      .send({ nodeType: 'SECTOR', parentId: task2Id, name: 'Setor Z' })
    expect(rSecZ.status).toBe(201)
    const sectorZId = rSecZ.body.data?.id as string

    const rAct = await request(app)
      .post('/api/v1/operation-matrix/nodes')
      .set('Cookie', cookie)
      .send({
        nodeType: 'ACTIVITY',
        parentId: sectorId,
        name: 'Atividade A',
        plannedMinutes: 77,
        teamIds: [teamId],
      })
    expect(rAct.status).toBe(201)

    const rActZ = await request(app)
      .post('/api/v1/operation-matrix/nodes')
      .set('Cookie', cookie)
      .send({
        nodeType: 'ACTIVITY',
        parentId: sectorZId,
        name: 'Atividade Z',
        plannedMinutes: 12,
      })
    expect(rActZ.status).toBe(201)

    const res = await request(app)
      .get(`/api/v1/operation-matrix/items/${itemId}/export.xlsx`)
      .set('Cookie', cookie)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk: Buffer) => chunks.push(chunk))
        response.on('end', () => callback(null, Buffer.concat(chunks)))
      })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    expect(String(res.headers['content-disposition'] ?? '')).toMatch(
      /matriz-Export-[a-f0-9-]+-\d{4}-\d{2}-\d{2}\.xlsx/i,
    )

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(res.body as Buffer)
    expect(workbook.worksheets.map((ws) => ws.name)).toEqual([
      'Resumo',
      'Estrutura',
      'Leitura Operacional',
      'Validação',
    ])

    const resumo = workbook.getWorksheet('Resumo')
    const resumoValues = resumo
      ?.getSheetValues()
      .slice(2)
      .map((row) => (Array.isArray(row) ? row[2] : undefined))
    expect(resumoValues).toContain(baseName)
    expect(resumoValues).toContain('MX-EXP')
    expect(resumoValues).toContain('Descrição export')

    const estrutura = workbook.getWorksheet('Estrutura')
    const estruturaRows = (estrutura?.getSheetValues() ?? [])
      .slice(2)
      .filter((row) => Array.isArray(row))
      .filter((row) => !String(row[1] ?? '').startsWith('TAREFA '))
      .map((row) => ({
        taskOrder: row[1],
        task: row[2],
        sectorOrder: row[3],
        sector: row[4],
        activityOrder: row[5],
        activity: row[6],
        minutes: row[7],
        team: row[9],
      }))
    expect(estruturaRows.map((r) => r.task)).toEqual(['Alpha', 'Zebra'])
    expect(estrutura?.getRow(2).getCell(1).value).toBe('TAREFA 1 — Alpha')
    expect(estruturaRows[0]).toMatchObject({
      taskOrder: 1,
      sectorOrder: 1,
      activityOrder: 1,
      sector: 'Setor A',
      activity: 'Atividade A',
      minutes: 77,
      team: teamName,
    })

    const validacao = workbook.getWorksheet('Validação')
    expect(validacao?.getCell('A1').value).toContain(baseName)
    expect(validacao?.getCell('A3').value).toContain('validação manual')
    expect(validacao?.getRow(5).getCell(1).value).toBe('Seq.')
    expect(validacao?.getRow(6).getCell(1).value).toBe('TAREFA 1 — Alpha')
    expect(validacao?.getRow(7).getCell(1).value).toBe('1.1.1')
    expect(validacao?.getRow(7).getCell(7).value).toBe('☐')
    expect(validacao?.getRow(7).getCell(8).value).toBe('☐')
    expect(validacao?.getRow(7).getCell(9).value).toBe('')
    expect(validacao?.pageSetup.orientation).toBe('landscape')
    expect(validacao?.pageSetup.paperSize).toBe(9)
    expect(validacao?.pageSetup.fitToWidth).toBe(1)
    expect(validacao?.pageSetup.printTitlesRow).toBe('5:5')

    const leitura = workbook.getWorksheet('Leitura Operacional')
    const pathCell = leitura?.getRow(2).getCell(1).value
    expect(String(pathCell)).toContain('Alpha > Setor A > Atividade A')

    await request(app)
      .delete(`/api/v1/operation-matrix/nodes/${itemId}`)
      .set('Cookie', cookie)
    await pool.query(
      `DELETE FROM matrix_node_assignment_teams WHERE team_id = $1::uuid`,
      [teamId],
    )
    await pool.query(`DELETE FROM teams WHERE id = $1::uuid`, [teamId])
  })
})
