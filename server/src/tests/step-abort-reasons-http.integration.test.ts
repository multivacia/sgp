/**
 * HTTP: GET /api/v1/conveyors/step-abort-reasons + admin CRUD
 * Usa createApp real (ordem de routers) para garantir que não há colisão com /conveyors/:id.
 */
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
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
import { hashPassword } from '../shared/password/password.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'
import { setConveyorProductionStatusForIntegration } from './integrationConveyorFixtures.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const GOV_ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const GOV_ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'

const MARIA_APP_USER_ID = '44444444-4444-4444-4444-444444444444'
const MARIA_EMAIL = 'maria@exemplo.com'

const SELECTION_PATH = '/api/v1/conveyors/step-abort-reasons'
const ADMIN_BASE = '/api/v1/admin/operational-settings/step-abort-reasons'

function minimalConveyorBody(nome: string): PostConveyorBody {
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
        titulo: 'Opção A',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'Área 1',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: [
              {
                titulo: 'Etapa 1',
                orderIndex: 1,
                plannedMinutes: 30,
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

describe.skipIf(!hasDb)('step abort reasons HTTP (seleção + admin)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  const createdCodes: string[] = []

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)

    const probe = await pool.query<{ ok: string }>(
      `SELECT CASE
         WHEN EXISTS (
           SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = 'conveyor_step_abort_reasons'
         )
         THEN '1' ELSE '0'
       END AS ok`,
    )
    if (probe.rows[0]?.ok !== '1') {
      throw new Error(
        'Fail-fast: migration 0051 ausente (tabela conveyor_step_abort_reasons).',
      )
    }

    await ensureMariaCollaboratorSeedForIntegration(pool)
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

    const perms = await pool.query<{
      user_id: string
      has_create: boolean
      has_ops: boolean
    }>(
      `SELECT au.id::text AS user_id,
              COALESCE(bool_or(p.code = 'conveyors.create'), false) AS has_create,
              COALESCE(bool_or(p.code = 'operational_settings.manage'), false) AS has_ops
         FROM app_users au
         LEFT JOIN app_role_permissions rp ON rp.role_id = au.role_id
         LEFT JOIN app_permissions p ON p.id = rp.permission_id
        WHERE au.id = ANY($1::uuid[])
        GROUP BY au.id`,
      [[GOV_ADMIN_USER_ID, MARIA_APP_USER_ID]],
    )
    const byUser = new Map(perms.rows.map((r) => [r.user_id, r]))
    const admin = byUser.get(GOV_ADMIN_USER_ID)
    const maria = byUser.get(MARIA_APP_USER_ID)
    if (!admin?.has_create || !admin.has_ops) {
      throw new Error(
        'Fail-fast: admin de teste sem conveyors.create e/ou operational_settings.manage.',
      )
    }
    if (maria?.has_create || maria?.has_ops) {
      throw new Error(
        'Fail-fast: Maria possui permissões que invalidam os casos 403.',
      )
    }
  })

  afterAll(async () => {
    if (createdCodes.length) {
      await pool.query(
        `UPDATE conveyor_nodes
            SET abort_reason_code = NULL,
                abort_reason_text = NULL,
                abort_reason_label_snapshot = NULL
          WHERE abort_reason_code = ANY($1::varchar[])`,
        [createdCodes],
      )
      await pool.query(
        `DELETE FROM conveyor_step_abort_reasons WHERE code = ANY($1::varchar[])`,
        [createdCodes],
      )
    }
    await closePool()
  })

  function adminCookie(): Promise<string> {
    return sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL)
  }

  function mariaCookie(): Promise<string> {
    return sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL)
  }

  describe('GET /conveyors/step-abort-reasons', () => {
    it('200 com conveyors.create — ativos ordenados e OUTRO presente', async () => {
      const res = await request(app)
        .get(SELECTION_PATH)
        .set('Cookie', await adminCookie())
      expect(res.status).toBe(200)
      const data = res.body.data as Array<{
        code: string
        label: string
        requiresComplement: boolean
        sortOrder: number
      }>
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThanOrEqual(5)
      const orders = data.map((d) => d.sortOrder)
      expect([...orders].sort((a, b) => a - b)).toEqual(orders)
      const outro = data.find((d) => d.code === 'OUTRO')
      expect(outro?.requiresComplement).toBe(true)
      expect(res.status).not.toBe(422)
    })

    it('401 sem autenticação', async () => {
      const res = await request(app).get(SELECTION_PATH)
      expect(res.status).toBe(401)
    })

    it('403 sem conveyors.create', async () => {
      const res = await request(app)
        .get(SELECTION_PATH)
        .set('Cookie', await mariaCookie())
      expect(res.status).toBe(403)
    })

    it('motivo personalizado ativo aparece e some ao desativar', async () => {
      const code = `SEL_${randomUUID().slice(0, 8).toUpperCase().replace(/-/g, '_')}`
      createdCodes.push(code)
      const create = await request(app)
        .post(ADMIN_BASE)
        .set('Cookie', await adminCookie())
        .send({
          code,
          label: 'Motivo seleção teste',
          requiresComplement: false,
          sortOrder: 5,
          isActive: true,
        })
      expect(create.status).toBe(201)

      const active = await request(app)
        .get(SELECTION_PATH)
        .set('Cookie', await adminCookie())
      expect(active.status).toBe(200)
      expect(
        (active.body.data as Array<{ code: string }>).some((d) => d.code === code),
      ).toBe(true)

      const deact = await request(app)
        .patch(`${ADMIN_BASE}/${code}/deactivate`)
        .set('Cookie', await adminCookie())
      expect(deact.status).toBe(200)

      const after = await request(app)
        .get(SELECTION_PATH)
        .set('Cookie', await adminCookie())
      expect(
        (after.body.data as Array<{ code: string }>).some((d) => d.code === code),
      ).toBe(false)
    })

    it('GET /conveyors/:id com UUID válido continua 200', async () => {
      const created = await serviceCreateConveyor(
        pool,
        minimalConveyorBody(`sel-route ${randomUUID().slice(0, 8)}`),
      )
      await setConveyorProductionStatusForIntegration(pool, created.id)
      const res = await request(app)
        .get(`/api/v1/conveyors/${created.id}`)
        .set('Cookie', await adminCookie())
      expect(res.status).toBe(200)
      expect(res.body?.data?.id).toBe(created.id)
    })
  })

  describe('admin /step-abort-reasons', () => {
    it('401 sem autenticação', async () => {
      expect((await request(app).get(ADMIN_BASE)).status).toBe(401)
      expect((await request(app).post(ADMIN_BASE).send({})).status).toBe(401)
    })

    it('403 sem operational_settings.manage', async () => {
      const cookie = await mariaCookie()
      expect(
        (await request(app).get(ADMIN_BASE).set('Cookie', cookie)).status,
      ).toBe(403)
      expect(
        (
          await request(app)
            .post(ADMIN_BASE)
            .set('Cookie', cookie)
            .send({ code: 'X', label: 'Y' })
        ).status,
      ).toBe(403)
    })

    it('CRUD autorizado: criar, listar, editar, desativar, ativar, duplicidade 409', async () => {
      const code = `ADM_${randomUUID().slice(0, 8).toUpperCase().replace(/-/g, '_')}`
      createdCodes.push(code)
      const cookie = await adminCookie()

      const created = await request(app)
        .post(ADMIN_BASE)
        .set('Cookie', cookie)
        .send({
          code,
          label: 'Admin custom',
          description: 'desc',
          requiresComplement: true,
          sortOrder: 77,
          isActive: true,
        })
      expect(created.status).toBe(201)
      expect(created.body.data.code).toBe(code)
      expect(created.body.data.requiresComplement).toBe(true)

      const listed = await request(app)
        .get(`${ADMIN_BASE}?status=active&q=${code}`)
        .set('Cookie', cookie)
      expect(listed.status).toBe(200)
      expect(
        (listed.body.data as Array<{ code: string }>).some((d) => d.code === code),
      ).toBe(true)

      const patched = await request(app)
        .patch(`${ADMIN_BASE}/${code}`)
        .set('Cookie', cookie)
        .send({ label: 'Admin custom editado', sortOrder: 78 })
      expect(patched.status).toBe(200)
      expect(patched.body.data.code).toBe(code)
      expect(patched.body.data.label).toBe('Admin custom editado')

      const deact = await request(app)
        .patch(`${ADMIN_BASE}/${code}/deactivate`)
        .set('Cookie', cookie)
      expect(deact.status).toBe(200)
      expect(deact.body.data.isActive).toBe(false)

      const inactiveList = await request(app)
        .get(`${ADMIN_BASE}?status=inactive&q=${code}`)
        .set('Cookie', cookie)
      expect(
        (inactiveList.body.data as Array<{ code: string }>).some((d) => d.code === code),
      ).toBe(true)

      const act = await request(app)
        .patch(`${ADMIN_BASE}/${code}/activate`)
        .set('Cookie', cookie)
      expect(act.status).toBe(200)
      expect(act.body.data.isActive).toBe(true)

      const dup = await request(app)
        .post(ADMIN_BASE)
        .set('Cookie', cookie)
        .send({ code, label: 'Duplicado' })
      expect(dup.status).toBe(409)
      expect(dup.body?.error?.message).toMatch(/Já existe um motivo/i)
    })
  })
})
