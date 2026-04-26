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
})
