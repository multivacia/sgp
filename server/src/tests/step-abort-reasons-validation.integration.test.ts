/**
 * Integração: motivo inexistente / inativo / personalizado / replay pós-desativação.
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
import { setConveyorProductionStatusForIntegration } from './integrationConveyorFixtures.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const GOV_ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const GOV_ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'

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

describe.skipIf(!hasDb)('step abort reasons — validação dinâmica HTTP', () => {
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
      throw new Error('Fail-fast: migration 0051 ausente.')
    }

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

  async function seedStep(): Promise<{ conveyorId: string; stepId: string }> {
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`dyn-abort ${randomUUID().slice(0, 8)}`),
    )
    await setConveyorProductionStatusForIntegration(pool, created.id)
    const step = await pool.query<{ id: string }>(
      `SELECT id::text FROM conveyor_nodes
        WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
        ORDER BY order_index, id LIMIT 1`,
      [created.id],
    )
    const stepId = step.rows[0]?.id
    if (!stepId) throw new Error('STEP ausente')
    return { conveyorId: created.id, stepId }
  }

  async function readStep(stepId: string) {
    const r = await pool.query<{
      operational_status: string | null
      abort_reason_code: string | null
      abort_reason_label_snapshot: string | null
      abort_reason_text: string | null
    }>(
      `SELECT operational_status, abort_reason_code, abort_reason_label_snapshot, abort_reason_text
         FROM conveyor_nodes WHERE id = $1::uuid`,
      [stepId],
    )
    return r.rows[0]
  }

  it('motivo inexistente → 400 inválido; estado preservado', async () => {
    const { conveyorId, stepId } = await seedStep()
    const before = await readStep(stepId)
    const res = await request(app)
      .post(`/api/v1/conveyors/${conveyorId}/steps/${stepId}/abort`)
      .set('Cookie', await adminCookie())
      .set('Idempotency-Key', randomUUID())
      .send({ reasonCode: 'CODIGO_INEXISTENTE_XYZ' })
    expect(res.status).toBe(400)
    expect(res.body?.error?.message).toMatch(/Motivo de dispensa inválido/i)
    const after = await readStep(stepId)
    expect(after?.operational_status).toBe(before?.operational_status)
  })

  it('motivo inativo → 400 mensagem explícita; estado preservado', async () => {
    const code = `INAT_${randomUUID().slice(0, 8).toUpperCase().replace(/-/g, '_')}`
    createdCodes.push(code)
    await pool.query(
      `INSERT INTO conveyor_step_abort_reasons (code, label, requires_complement, sort_order, is_active)
       VALUES ($1, 'Inativo teste', false, 200, false)`,
      [code],
    )
    const { conveyorId, stepId } = await seedStep()
    const before = await readStep(stepId)
    const res = await request(app)
      .post(`/api/v1/conveyors/${conveyorId}/steps/${stepId}/abort`)
      .set('Cookie', await adminCookie())
      .set('Idempotency-Key', randomUUID())
      .send({ reasonCode: code })
    expect(res.status).toBe(400)
    expect(res.body?.error?.message).toMatch(/Motivo de dispensa inativo/i)
    const after = await readStep(stepId)
    expect(after?.operational_status).toBe(before?.operational_status)
  })

  it('motivo personalizado ativo grava snapshot; complemento obrigatório respeitado', async () => {
    const code = `CUST_${randomUUID().slice(0, 8).toUpperCase().replace(/-/g, '_')}`
    createdCodes.push(code)
    await pool.query(
      `INSERT INTO conveyor_step_abort_reasons (code, label, requires_complement, sort_order, is_active)
       VALUES ($1, 'Personalizado snapshot', true, 15, true)`,
      [code],
    )
    const { conveyorId, stepId } = await seedStep()

    const missing = await request(app)
      .post(`/api/v1/conveyors/${conveyorId}/steps/${stepId}/abort`)
      .set('Cookie', await adminCookie())
      .set('Idempotency-Key', randomUUID())
      .send({ reasonCode: code })
    expect(missing.status).toBe(400)
    expect(missing.body?.error?.message).toMatch(/complemento/i)

    const ok = await request(app)
      .post(`/api/v1/conveyors/${conveyorId}/steps/${stepId}/abort`)
      .set('Cookie', await adminCookie())
      .set('Idempotency-Key', randomUUID())
      .send({ reasonCode: code, reasonText: 'Detalhe obrigatório' })
    expect(ok.status).toBe(200)
    const row = await readStep(stepId)
    expect(row?.operational_status).toBe('ABORTED')
    expect(row?.abort_reason_code).toBe(code)
    expect(row?.abort_reason_label_snapshot).toBe('Personalizado snapshot')
    expect(row?.abort_reason_text).toBe('Detalhe obrigatório')
  })

  it('replay idempotente permanece válido após desativar o motivo', async () => {
    const code = `REPLAY_${randomUUID().slice(0, 8).toUpperCase().replace(/-/g, '_')}`
    createdCodes.push(code)
    await pool.query(
      `INSERT INTO conveyor_step_abort_reasons (code, label, requires_complement, sort_order, is_active)
       VALUES ($1, 'Replay motivo', false, 16, true)`,
      [code],
    )
    const { conveyorId, stepId } = await seedStep()
    const key = randomUUID()

    const first = await request(app)
      .post(`/api/v1/conveyors/${conveyorId}/steps/${stepId}/abort`)
      .set('Cookie', await adminCookie())
      .set('Idempotency-Key', key)
      .send({ reasonCode: code })
    expect(first.status).toBe(200)
    expect(first.body?.meta?.stepAbortIdempotent).toBe(false)

    await pool.query(
      `UPDATE conveyor_step_abort_reasons SET is_active = false, updated_at = now() WHERE code = $1`,
      [code],
    )

    const eventsBefore = await pool.query<{ c: string }>(
      `SELECT count(*)::text AS c FROM conveyor_operational_events
        WHERE conveyor_id = $1::uuid AND node_id = $2::uuid AND event_type = 'CONVEYOR_STEP_ABORTED'`,
      [conveyorId, stepId],
    )

    const replay = await request(app)
      .post(`/api/v1/conveyors/${conveyorId}/steps/${stepId}/abort`)
      .set('Cookie', await adminCookie())
      .set('Idempotency-Key', key)
      .send({ reasonCode: code })
    expect(replay.status).toBe(200)
    expect(replay.body?.meta?.stepAbortIdempotent).toBe(true)

    const eventsAfter = await pool.query<{ c: string }>(
      `SELECT count(*)::text AS c FROM conveyor_operational_events
        WHERE conveyor_id = $1::uuid AND node_id = $2::uuid AND event_type = 'CONVEYOR_STEP_ABORTED'`,
      [conveyorId, stepId],
    )
    expect(eventsAfter.rows[0]?.c).toBe(eventsBefore.rows[0]?.c)
  })
})
