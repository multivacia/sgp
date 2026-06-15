import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
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
import {
  serviceCreateConveyorNodeAssignee,
} from '../modules/conveyors/conveyorAssignments.service.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import { ensureMariaCollaboratorSeedForIntegration, linkAppUserToCollaborator, MARIA_APP_USER_EMAIL, MARIA_APP_USER_ID, MARIA_COLLABORATOR_ID } from './integrationSeedFixtures.js'
import { setConveyorProductionStatusForIntegration } from './integrationConveyorFixtures.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const COLAB_SEED = MARIA_COLLABORATOR_ID
const MARIA_EMAIL = MARIA_APP_USER_EMAIL
const GOV_ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const GOV_ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'

import { hashPassword } from '../shared/password/password.js'

function minimalConveyorBody(nome: string, steps = 1): PostConveyorBody {
  const stepRows = Array.from({ length: steps }, (_, i) => ({
    titulo: `Etapa ${i + 1}`,
    orderIndex: i + 1,
    plannedMinutes: 30,
    sourceOrigin: 'manual' as const,
    required: true,
  }))
  return {
    dados: {
      nome,
      cliente: 'Cliente',
      veiculo: 'V',
      modeloVersao: '',
      placa: 'ABC1D23',
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
            steps: stepRows,
          },
        ],
      },
    ],
  }
}

describe.skipIf(!hasDb)('POST admin time-entries markAsDone (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    await ensureMariaCollaboratorSeedForIntegration(pool)
    const hashGov = await hashPassword('CollabGovTest1!')
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
      [GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL, hashGov, ADMIN_ROLE_ID],
    )
    await linkAppUserToCollaborator(pool, MARIA_APP_USER_ID, COLAB_SEED)
  })

  beforeEach(async () => {
    await linkAppUserToCollaborator(pool, MARIA_APP_USER_ID, COLAB_SEED)
  })

  afterAll(async () => {
    await closePool()
  })

  async function stepIds(conveyorId: string): Promise<string[]> {
    const r = await pool.query<{ id: string }>(
      `SELECT id FROM conveyor_nodes
       WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
       ORDER BY order_index`,
      [conveyorId],
    )
    return r.rows.map((x) => x.id)
  }

  async function stepStatus(stepId: string): Promise<string | null> {
    const r = await pool.query<{ operational_status: string | null }>(
      `SELECT operational_status FROM conveyor_nodes WHERE id = $1::uuid`,
      [stepId],
    )
    return r.rows[0]?.operational_status ?? null
  }

  async function setupConveyorForTimeEntry(conveyorId: string, stepIdsToAssign: string[]) {
    await setConveyorProductionStatusForIntegration(pool, conveyorId)
    for (let i = 0; i < stepIdsToAssign.length; i += 1) {
      await assignCollaborator(conveyorId, stepIdsToAssign[i]!, i === 0)
    }
  }

  async function mariaCookie() {
    return sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL)
  }

  async function assignCollaborator(conveyorId: string, stepId: string, isPrimary = true) {
    await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId,
      conveyorNodeId: stepId,
      collaboratorId: COLAB_SEED,
      isPrimary,
    })
  }

  it('PATCH completion altera operational_status para COMPLETED', async () => {
    const tag = randomUUID().slice(0, 8)
    const created = await serviceCreateConveyor(pool, minimalConveyorBody(`Patch ${tag}`))
    const [stepId] = await stepIds(created.id)
    await setupConveyorForTimeEntry(created.id, [stepId])

    const patch = await request(app)
      .patch(`/api/v1/conveyors/${created.id}/steps/${stepId}/completion`)
      .set('Cookie', await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL))
      .send({ action: 'COMPLETE' })
    expect(patch.status).toBe(200)
    expect(await stepStatus(stepId)).toBe('COMPLETED')
  })

  it('colaborador alocado conclui via PATCH sem conveyors.create', async () => {
    const tag = randomUUID().slice(0, 8)
    const created = await serviceCreateConveyor(pool, minimalConveyorBody(`ColabPatch ${tag}`))
    const [stepId] = await stepIds(created.id)
    await setupConveyorForTimeEntry(created.id, [stepId])

    const patch = await request(app)
      .patch(`/api/v1/conveyors/${created.id}/steps/${stepId}/completion`)
      .set('Cookie', await mariaCookie())
      .send({ action: 'COMPLETE' })
    expect(patch.status).toBe(200)
    expect(await stepStatus(stepId)).toBe('COMPLETED')
  })

  it('markAsDone=false não conclui STEP', async () => {
    const tag = randomUUID().slice(0, 8)
    const created = await serviceCreateConveyor(pool, minimalConveyorBody(`NoDone ${tag}`))
    const [stepId] = await stepIds(created.id)
    await setupConveyorForTimeEntry(created.id, [stepId])

    const res = await request(app)
      .post(`/api/v1/conveyors/${created.id}/steps/${stepId}/time-entries`)
      .set('Cookie', await mariaCookie())
      .send({ minutes: 30, executedQuantity: 1, markAsDone: false })
    expect(res.status).toBe(201)
    expect(await stepStatus(stepId)).not.toBe('COMPLETED')
  })

  it('markAsDone=true salva apontamento e conclui STEP na mesma transação', async () => {
    const tag = randomUUID().slice(0, 8)
    const created = await serviceCreateConveyor(pool, minimalConveyorBody(`Done ${tag}`))
    const [stepId] = await stepIds(created.id)
    await setupConveyorForTimeEntry(created.id, [stepId])

    const res = await request(app)
      .post(`/api/v1/conveyors/${created.id}/steps/${stepId}/time-entries`)
      .set('Cookie', await mariaCookie())
      .send({ minutes: 15, executedQuantity: 1, markAsDone: true })
    expect(res.status).toBe(201)

    const row = await pool.query<{ operational_status: string | null; mark_as_done: boolean }>(
      `
      SELECT cn.operational_status, te.mark_as_done
      FROM conveyor_nodes cn
      JOIN conveyor_time_entries te ON te.conveyor_node_id = cn.id
      WHERE cn.id = $1::uuid
      ORDER BY te.created_at DESC LIMIT 1
      `,
      [stepId],
    )
    expect(row.rows[0]?.operational_status).toBe('COMPLETED')
    expect(row.rows[0]?.mark_as_done).toBe(true)
  })

  it('tempo e quantidade iguais ao planejado sem markAsDone não concluem', async () => {
    const tag = randomUUID().slice(0, 8)
    const created = await serviceCreateConveyor(pool, minimalConveyorBody(`Planned ${tag}`))
    const [stepId] = await stepIds(created.id)
    await setupConveyorForTimeEntry(created.id, [stepId])

    const res = await request(app)
      .post(`/api/v1/conveyors/${created.id}/steps/${stepId}/time-entries`)
      .set('Cookie', await mariaCookie())
      .send({ minutes: 30, executedQuantity: 1 })
    expect(res.status).toBe(201)
    expect(await stepStatus(stepId)).not.toBe('COMPLETED')
  })

  it('fora de sequência sem justificativa é rejeitado com markAsDone', async () => {
    const tag = randomUUID().slice(0, 8)
    const created = await serviceCreateConveyor(pool, minimalConveyorBody(`OOS ${tag}`, 2))
    const [first, second] = await stepIds(created.id)
    await setupConveyorForTimeEntry(created.id, [first, second])

    const res = await request(app)
      .post(`/api/v1/conveyors/${created.id}/steps/${second}/time-entries`)
      .set('Cookie', await mariaCookie())
      .send({ minutes: 10, markAsDone: true })
    expect(res.status).toBe(422)

    const entries = await pool.query(`SELECT id FROM conveyor_time_entries WHERE conveyor_node_id = $1::uuid`, [
      second,
    ])
    expect(entries.rowCount).toBe(0)
    expect(await stepStatus(second)).not.toBe('COMPLETED')
  })

  it('fora de sequência com justificativa aponta e conclui', async () => {
    const tag = randomUUID().slice(0, 8)
    const created = await serviceCreateConveyor(pool, minimalConveyorBody(`OOSok ${tag}`, 2))
    const [first, second] = await stepIds(created.id)
    await setupConveyorForTimeEntry(created.id, [first, second])

    const res = await request(app)
      .post(`/api/v1/conveyors/${created.id}/steps/${second}/time-entries`)
      .set('Cookie', await mariaCookie())
      .send({
        minutes: 10,
        markAsDone: true,
        outOfSequenceJustification: 'Prioridade operacional.',
      })
    expect(res.status).toBe(201)
    expect(await stepStatus(second)).toBe('COMPLETED')
  })

  it('após concluir primeira, segunda deixa de estar fora de sequência', async () => {
    const tag = randomUUID().slice(0, 8)
    const created = await serviceCreateConveyor(pool, minimalConveyorBody(`Seq ${tag}`, 2))
    const [first, second] = await stepIds(created.id)
    await setupConveyorForTimeEntry(created.id, [first, second])

    const done = await request(app)
      .post(`/api/v1/conveyors/${created.id}/steps/${first}/time-entries`)
      .set('Cookie', await mariaCookie())
      .send({ minutes: 15, markAsDone: true })
    expect(done.status).toBe(201)
    expect(await stepStatus(first)).toBe('COMPLETED')

    const seq = await request(app)
      .get(`/api/v1/conveyors/${created.id}/steps/${second}/sequence-check`)
      .set('Cookie', await mariaCookie())
    expect(seq.status).toBe(200)
    expect(seq.body.data.isOutOfSequence).toBe(false)
  })

  it('time-entry-candidates expõe canCompleteStep', async () => {
    const tag = randomUUID().slice(0, 8)
    const created = await serviceCreateConveyor(pool, minimalConveyorBody(`Cand ${tag}`))
    const [stepId] = await stepIds(created.id)
    await setupConveyorForTimeEntry(created.id, [stepId])

    const list = await request(app)
      .get(`/api/v1/me/time-entry-candidates?q=${encodeURIComponent(tag)}`)
      .set('Cookie', await mariaCookie())
    expect(list.status).toBe(200)
    const row = list.body.data.find(
      (x: { conveyorId: string; stepNodeId: string }) =>
        x.conveyorId === created.id && x.stepNodeId === stepId,
    )
    expect(row?.canCompleteStep).toBe(true)
  })
})
