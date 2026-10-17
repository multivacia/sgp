import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { createLogger } from '../plugins/logger.js'
import { closePool, getPool } from '../plugins/db.js'
import { hasDatabaseConnectionInEnv, loadDotenvFiles, loadEnv } from '../config/env.js'
import { hashPassword } from '../shared/password/password.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import { detectarTipoImagem, validarImagem } from '../modules/v2-etapa-imagens/v2-etapa-imagens.logic.js'

loadDotenvFiles()
const hasDb = hasDatabaseConnectionInEnv(process.env)

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBPVP8 ')])

describe('SGP+ V2 — fotos das etapas (regras)', () => {
  it('aceita só WebP/JPEG/PNG pelo conteúdo, até 1 MB, e o tipo informado tem de conferir', () => {
    expect(detectarTipoImagem(PNG)).toBe('image/png')
    expect(detectarTipoImagem(WEBP)).toBe('image/webp')
    expect(validarImagem(PNG, 'image/png')).toBeNull()
    expect(validarImagem(Buffer.from('<svg onload=alert(1)>'), 'image/png')).toMatch(/não é uma imagem/)
    expect(validarImagem(PNG, 'image/webp')).toMatch(/não confere/)
    expect(validarImagem(Buffer.concat([PNG, Buffer.alloc(1024 * 1024)]), 'image/png')).toMatch(/1 MB/)
    expect(validarImagem({}, 'image/png')).toMatch(/Envie/)
  })
})

const GESTOR_ID = 'b2b2b2b2-0000-4000-8000-000000000f01'
const GESTOR_EMAIL = 'gestor-v2-fotos@sgp-argos.local'
const COLAB_ID = 'b2b2b2b2-0000-4000-8000-000000000f02'
const COLAB_EMAIL = 'colab-v2-fotos@sgp-argos.local'

describe.skipIf(!hasDb)('SGP+ V2 — /api/v1/v2/etapa-imagens (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let gestor: string
  let colab: string
  let taskId: string
  let itemId: string

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    const hash = await hashPassword('V2Fotos!2026')
    for (const [id, email, role] of [
      [GESTOR_ID, GESTOR_EMAIL, '33333333-3333-3333-3333-333333333333'],
      [COLAB_ID, COLAB_EMAIL, '22222222-2222-2222-2222-222222222222'],
    ])
      await pool.query(
        `INSERT INTO app_users (id, email, password_hash, is_active, role_id, must_change_password, password_changed_at)
         VALUES ($1::uuid, $2, $3, true, $4::uuid, false, now())
         ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id, is_active = true`,
        [id, email, hash, role],
      )
    gestor = await sessionCookieForUser(pool, GESTOR_ID, GESTOR_EMAIL)
    colab = await sessionCookieForUser(pool, COLAB_ID, COLAB_EMAIL)
    const item = await pool.query<{ id: string }>(
      `INSERT INTO matrix_nodes (parent_id, root_id, node_type, name) VALUES (NULL, gen_random_uuid(), 'ITEM', 'Matriz teste fotos V2 ' || gen_random_uuid()) RETURNING id`,
    )
    itemId = item.rows[0].id
    await pool.query('UPDATE matrix_nodes SET root_id = id WHERE id = $1', [itemId])
    const task = await pool.query<{ id: string }>(
      `INSERT INTO matrix_nodes (parent_id, root_id, node_type, name, level_depth) VALUES ($1, $1, 'TASK', '15 - BANCOS DIANTEIROS', 1) RETURNING id`,
      [itemId],
    )
    taskId = task.rows[0].id
  })

  afterAll(async () => {
    await pool.query('DELETE FROM v2_etapa_imagens WHERE matrix_node_id = $1', [taskId])
    await pool.query('DELETE FROM matrix_nodes WHERE id = $1', [taskId])
    await pool.query('DELETE FROM matrix_nodes WHERE id = $1', [itemId])
    await closePool()
  })

  it('gestora grava, todos leem a mesma imagem, colaborador não troca, etapa errada e arquivo falso são recusados', async () => {
    const put = await request(app).put(`/api/v1/v2/etapa-imagens/${taskId}`).set('Cookie', gestor).set('Content-Type', 'image/png').send(PNG)
    expect(put.status).toBe(200)

    const lista = await request(app).get('/api/v1/v2/etapa-imagens').set('Cookie', colab)
    expect(lista.status).toBe(200)
    expect(lista.body.data).toContainEqual(expect.objectContaining({ matrixNodeId: taskId, nome: '15 - BANCOS DIANTEIROS' }))

    const img = await request(app).get(`/api/v1/v2/etapa-imagens/${taskId}`).set('Cookie', colab).buffer(true)
    expect(img.status).toBe(200)
    expect(img.headers['content-type']).toBe('image/png')
    expect(Buffer.compare(img.body as Buffer, PNG)).toBe(0)

    expect((await request(app).put(`/api/v1/v2/etapa-imagens/${taskId}`).set('Cookie', colab).set('Content-Type', 'image/png').send(PNG)).status).toBe(403)
    expect((await request(app).put(`/api/v1/v2/etapa-imagens/${itemId}`).set('Cookie', gestor).set('Content-Type', 'image/png').send(PNG)).status).toBe(422)
    expect((await request(app).put(`/api/v1/v2/etapa-imagens/${taskId}`).set('Cookie', gestor).set('Content-Type', 'image/png').send(Buffer.from('não é imagem'))).status).toBe(422)
    const grande = await request(app).put(`/api/v1/v2/etapa-imagens/${taskId}`).set('Cookie', gestor).set('Content-Type', 'image/png').send(Buffer.concat([PNG, Buffer.alloc(1024 * 1024)]))
    expect(grande.status).toBe(413)
    expect((await request(app).get(`/api/v1/v2/etapa-imagens/${taskId}`)).status).toBe(401)

    expect((await request(app).delete(`/api/v1/v2/etapa-imagens/${taskId}`).set('Cookie', gestor)).status).toBe(204)
    expect((await request(app).get(`/api/v1/v2/etapa-imagens/${taskId}`).set('Cookie', colab)).status).toBe(404)
  })
})
