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
import { serviceCreateConveyor } from '../modules/conveyors/conveyors.service.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'
import {
  serviceCreateConveyorNodeAssignee,
  serviceCreateConveyorTimeEntry,
} from '../modules/conveyors/conveyorAssignments.service.js'
import type { ConveyorOperationalStatusDb } from '../modules/conveyors/conveyors.repository.js'
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const GOV_ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const GOV_ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'
const COLAB_SEED = '3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c'

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

describe.skipIf(!hasDb)('conveyor lifecycle return (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
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
  })

  afterAll(async () => {
    await closePool()
  })

  async function managerCookie(): Promise<string> {
    return sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL)
  }

  async function createConveyorId(): Promise<string> {
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`lifecycle ${randomUUID().slice(0, 8)}`),
    )
    return created.id
  }

  async function firstStepId(conveyorId: string): Promise<string> {
    const r = await pool.query<{ id: string }>(
      `SELECT id::text FROM conveyor_nodes
       WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
       ORDER BY order_index LIMIT 1`,
      [conveyorId],
    )
    const id = r.rows[0]?.id
    if (!id) throw new Error('STEP não encontrado')
    return id
  }

  async function patchStatus(
    conveyorId: string,
    operationalStatus: ConveyorOperationalStatusDb,
  ) {
    return request(app)
      .patch(`/api/v1/conveyors/${conveyorId}/status`)
      .set('Cookie', await managerCookie())
      .send({ operationalStatus })
  }

  async function advanceToPlanning(conveyorId: string) {
    for (const st of [
      'AGUARDANDO_PLANEJAMENTO',
      'EM_PLANEJAMENTO',
    ] as const) {
      const r = await patchStatus(conveyorId, st)
      expect(r.status).toBe(200)
    }
  }

  async function advanceToReady(conveyorId: string) {
    await advanceToPlanning(conveyorId)
    const r = await patchStatus(conveyorId, 'A_INICIAR')
    expect(r.status).toBe(200)
  }

  async function advanceToInProgress(conveyorId: string) {
    await advanceToReady(conveyorId)
    await pool.query(
      `UPDATE conveyors SET operational_status = 'EM_ANDAMENTO' WHERE id = $1::uuid`,
      [conveyorId],
    )
  }

  async function seedTimeEntry(conveyorId: string): Promise<void> {
    const stepId = await firstStepId(conveyorId)
    await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId,
      conveyorNodeId: stepId,
      collaboratorId: COLAB_SEED,
      isPrimary: true,
    })
    await serviceCreateConveyorTimeEntry(pool, {
      conveyorId,
      conveyorNodeId: stepId,
      collaboratorId: COLAB_SEED,
      minutes: 15,
      entryMode: 'manual',
    })
  }

  async function countTimeEntries(conveyorId: string): Promise<number> {
    const r = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM conveyor_time_entries
       WHERE conveyor_id = $1::uuid AND deleted_at IS NULL`,
      [conveyorId],
    )
    return Number(r.rows[0]?.n ?? 0)
  }

  async function latestLifecycleEvent(conveyorId: string, eventType: string) {
    const r = await pool.query<{
      event_type: string
      previous_value: string | null
      new_value: string | null
      reason: string | null
      created_by: string | null
    }>(
      `SELECT event_type, previous_value, new_value, reason, created_by::text
       FROM conveyor_operational_events
       WHERE conveyor_id = $1::uuid AND event_type = $2
       ORDER BY occurred_at DESC
       LIMIT 1`,
      [conveyorId, eventType],
    )
    return r.rows[0] ?? null
  }

  it('return-to-backlog a partir de EM_PLANEJAMENTO', async () => {
    const id = await createConveyorId()
    await advanceToPlanning(id)
    const res = await request(app)
      .post(`/api/v1/conveyors/${id}/return-to-backlog`)
      .set('Cookie', await managerCookie())
      .send({ reason: 'Cliente pediu para parar' })
    expect(res.status).toBe(200)
    expect(res.body.data.operationalStatus).toBe('AGUARDANDO_PLANEJAMENTO')
  })

  it('return-to-backlog a partir de A_INICIAR', async () => {
    const id = await createConveyorId()
    await advanceToReady(id)
    const res = await request(app)
      .post(`/api/v1/conveyors/${id}/return-to-backlog`)
      .set('Cookie', await managerCookie())
      .send({ reason: 'Parar produção temporariamente' })
    expect(res.status).toBe(200)
    expect(res.body.data.operationalStatus).toBe('AGUARDANDO_PLANEJAMENTO')
  })

  it('return-to-backlog a partir de EM_ANDAMENTO', async () => {
    const id = await createConveyorId()
    await advanceToInProgress(id)
    const res = await request(app)
      .post(`/api/v1/conveyors/${id}/return-to-backlog`)
      .set('Cookie', await managerCookie())
      .send({ reason: 'Retirar da fábrica por ora' })
    expect(res.status).toBe(200)
    expect(res.body.data.operationalStatus).toBe('AGUARDANDO_PLANEJAMENTO')
  })

  it('return-to-backlog com apontamentos existentes', async () => {
    const id = await createConveyorId()
    await advanceToInProgress(id)
    await seedTimeEntry(id)
    const before = await countTimeEntries(id)
    expect(before).toBeGreaterThan(0)
    const res = await request(app)
      .post(`/api/v1/conveyors/${id}/return-to-backlog`)
      .set('Cookie', await managerCookie())
      .send({ reason: 'Cliente pediu pausa' })
    expect(res.status).toBe(200)
    expect(await countTimeEntries(id)).toBe(before)
  })

  it('return-to-planning a partir de A_INICIAR', async () => {
    const id = await createConveyorId()
    await advanceToReady(id)
    const res = await request(app)
      .post(`/api/v1/conveyors/${id}/return-to-planning`)
      .set('Cookie', await managerCookie())
      .send({ reason: 'Trocar colaborador' })
    expect(res.status).toBe(200)
    expect(res.body.data.operationalStatus).toBe('EM_PLANEJAMENTO')
  })

  it('return-to-planning a partir de EM_ANDAMENTO com apontamentos', async () => {
    const id = await createConveyorId()
    await advanceToInProgress(id)
    await seedTimeEntry(id)
    const before = await countTimeEntries(id)
    const res = await request(app)
      .post(`/api/v1/conveyors/${id}/return-to-planning`)
      .set('Cookie', await managerCookie())
      .send({ reason: 'Reorganizar sequência' })
    expect(res.status).toBe(200)
    expect(res.body.data.operationalStatus).toBe('EM_PLANEJAMENTO')
    expect(await countTimeEntries(id)).toBe(before)
  })

  it('bloqueia return-to-backlog sem motivo', async () => {
    const id = await createConveyorId()
    await advanceToPlanning(id)
    const res = await request(app)
      .post(`/api/v1/conveyors/${id}/return-to-backlog`)
      .set('Cookie', await managerCookie())
      .send({ reason: '  ' })
    expect(res.status).toBe(422)
    expect(res.body.error?.code).toBe('CONVEYOR_RETURN_REASON_REQUIRED')
  })

  it('bloqueia return-to-planning sem motivo', async () => {
    const id = await createConveyorId()
    await advanceToReady(id)
    const res = await request(app)
      .post(`/api/v1/conveyors/${id}/return-to-planning`)
      .set('Cookie', await managerCookie())
      .send({ reason: 'ab' })
    expect(res.status).toBe(422)
    expect(res.body.error?.code).toBe('CONVEYOR_RETURN_REASON_REQUIRED')
  })

  it('bloqueia return-to-backlog a partir de FINALIZADA', async () => {
    const id = await createConveyorId()
    await advanceToInProgress(id)
    await patchStatus(id, 'FINALIZADA')
    const res = await request(app)
      .post(`/api/v1/conveyors/${id}/return-to-backlog`)
      .set('Cookie', await managerCookie())
      .send({ reason: 'Tentativa inválida' })
    expect(res.status).toBe(422)
    expect(res.body.error?.code).toBe('CONVEYOR_RETURN_TO_BACKLOG_STATUS_NOT_ALLOWED')
  })

  it('bloqueia return-to-planning a partir de FINALIZADA', async () => {
    const id = await createConveyorId()
    await advanceToInProgress(id)
    await patchStatus(id, 'FINALIZADA')
    const res = await request(app)
      .post(`/api/v1/conveyors/${id}/return-to-planning`)
      .set('Cookie', await managerCookie())
      .send({ reason: 'Tentativa inválida' })
    expect(res.status).toBe(422)
    expect(res.body.error?.code).toBe('CONVEYOR_RETURN_TO_PLANNING_STATUS_NOT_ALLOWED')
  })

  it('bloqueia ambas a partir de CANCELADA', async () => {
    const id = await createConveyorId()
    await advanceToPlanning(id)
    await patchStatus(id, 'CANCELADA')
    const backlog = await request(app)
      .post(`/api/v1/conveyors/${id}/return-to-backlog`)
      .set('Cookie', await managerCookie())
      .send({ reason: 'Motivo qualquer' })
    expect(backlog.status).toBe(422)
    expect(backlog.body.error?.code).toBe('CONVEYOR_RETURN_TO_BACKLOG_STATUS_NOT_ALLOWED')
    const planning = await request(app)
      .post(`/api/v1/conveyors/${id}/return-to-planning`)
      .set('Cookie', await managerCookie())
      .send({ reason: 'Motivo qualquer' })
    expect(planning.status).toBe(422)
    expect(planning.body.error?.code).toBe('CONVEYOR_RETURN_TO_PLANNING_STATUS_NOT_ALLOWED')
  })

  it('registra evento CONVEYOR_RETURNED_TO_BACKLOG', async () => {
    const id = await createConveyorId()
    await advanceToReady(id)
    const res = await request(app)
      .post(`/api/v1/conveyors/${id}/return-to-backlog`)
      .set('Cookie', await managerCookie())
      .send({ reason: 'Cliente pediu para parar por enquanto' })
    expect(res.status).toBe(200)
    const ev = await latestLifecycleEvent(id, 'CONVEYOR_RETURNED_TO_BACKLOG')
    expect(ev).toBeTruthy()
    expect(ev?.previous_value).toBe('A_INICIAR')
    expect(ev?.new_value).toBe('AGUARDANDO_PLANEJAMENTO')
    expect(ev?.reason).toBe('Cliente pediu para parar por enquanto')
    expect(ev?.created_by).toBe(GOV_ADMIN_USER_ID)
  })

  it('registra evento CONVEYOR_RETURNED_TO_PLANNING', async () => {
    const id = await createConveyorId()
    await advanceToInProgress(id)
    const res = await request(app)
      .post(`/api/v1/conveyors/${id}/return-to-planning`)
      .set('Cookie', await managerCookie())
      .send({ reason: 'Necessário replanejar responsáveis' })
    expect(res.status).toBe(200)
    const ev = await latestLifecycleEvent(id, 'CONVEYOR_RETURNED_TO_PLANNING')
    expect(ev).toBeTruthy()
    expect(ev?.previous_value).toBe('EM_ANDAMENTO')
    expect(ev?.new_value).toBe('EM_PLANEJAMENTO')
    expect(ev?.reason).toBe('Necessário replanejar responsáveis')
    expect(ev?.created_by).toBe(GOV_ADMIN_USER_ID)
  })
})
