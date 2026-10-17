import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { createLogger } from '../plugins/logger.js'
import { closePool, getPool } from '../plugins/db.js'
import { hasDatabaseConnectionInEnv, loadDotenvFiles, loadEnv } from '../config/env.js'
import { hashPassword } from '../shared/password/password.js'
import { sessionCookieForUser } from './sessionTestCookie.js'

loadDotenvFiles()
const hasDb = hasDatabaseConnectionInEnv(process.env)

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')
const GESTOR_ID = 'd3d3d3d3-0000-4000-8000-000000000f01'
const COLAB_ID = 'd3d3d3d3-0000-4000-8000-000000000f02'
const CV = 'd3d3d3d3-0000-4000-8000-000000000c01'

describe.skipIf(!hasDb)('SGP+ V2 — /api/v1/v2/esteiras/:id/fotos (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let gestor: string
  let colab: string

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    const hash = await hashPassword('V2Carro!2026')
    for (const [id, email, role] of [
      [GESTOR_ID, 'gestor-v2-carro@sgp-argos.local', '33333333-3333-3333-3333-333333333333'],
      [COLAB_ID, 'colab-v2-carro@sgp-argos.local', '22222222-2222-2222-2222-222222222222'],
    ])
      await pool.query(
        `INSERT INTO app_users (id, email, password_hash, is_active, role_id, must_change_password, password_changed_at)
         VALUES ($1::uuid, $2, $3, true, $4::uuid, false, now())
         ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id, is_active = true`,
        [id, email, hash, role],
      )
    gestor = await sessionCookieForUser(pool, GESTOR_ID, 'gestor-v2-carro@sgp-argos.local')
    colab = await sessionCookieForUser(pool, COLAB_ID, 'colab-v2-carro@sgp-argos.local')
    await pool.query(
      `INSERT INTO conveyors (id, name, priority, origin_register, total_options, total_areas, total_steps, total_planned_minutes)
       VALUES ($1, 'Gol fotos V2', 'media', 'MANUAL', 0, 0, 0, 0) ON CONFLICT (id) DO NOTHING`,
      [CV],
    )
  })

  afterAll(async () => {
    await pool.query('DELETE FROM conveyors WHERE id = $1', [CV])
    await closePool()
  })

  it('gestora inclui e remove; todos veem; colaborador não inclui; arquivo falso e esteira inexistente recusados; limite de 10', async () => {
    const add = await request(app).post(`/api/v1/v2/esteiras/${CV}/fotos`).set('Cookie', gestor).set('Content-Type', 'image/png').send(PNG)
    expect(add.status).toBe(201)
    const fotoId = add.body.data.id as string

    const lista = await request(app).get(`/api/v1/v2/esteiras/${CV}/fotos`).set('Cookie', colab)
    expect(lista.body.data).toEqual([expect.objectContaining({ id: fotoId })])
    const img = await request(app).get(`/api/v1/v2/esteiras/${CV}/fotos/${fotoId}`).set('Cookie', colab).buffer(true)
    expect(img.headers['content-type']).toBe('image/png')
    expect(Buffer.compare(img.body as Buffer, PNG)).toBe(0)

    expect((await request(app).post(`/api/v1/v2/esteiras/${CV}/fotos`).set('Cookie', colab).set('Content-Type', 'image/png').send(PNG)).status).toBe(403)
    expect((await request(app).post(`/api/v1/v2/esteiras/${CV}/fotos`).set('Cookie', gestor).set('Content-Type', 'image/png').send(Buffer.from('falso'))).status).toBe(422)
    expect((await request(app).post('/api/v1/v2/esteiras/d3d3d3d3-0000-4000-8000-000000000999/fotos').set('Cookie', gestor).set('Content-Type', 'image/png').send(PNG)).status).toBe(404)

    for (let i = 0; i < 9; i++) await request(app).post(`/api/v1/v2/esteiras/${CV}/fotos`).set('Cookie', gestor).set('Content-Type', 'image/png').send(PNG)
    expect((await request(app).post(`/api/v1/v2/esteiras/${CV}/fotos`).set('Cookie', gestor).set('Content-Type', 'image/png').send(PNG)).status).toBe(422)

    expect((await request(app).delete(`/api/v1/v2/esteiras/${CV}/fotos/${fotoId}`).set('Cookie', gestor)).status).toBe(204)
    expect((await request(app).get(`/api/v1/v2/esteiras/${CV}/fotos/${fotoId}`).set('Cookie', colab)).status).toBe(404)
  })
})
