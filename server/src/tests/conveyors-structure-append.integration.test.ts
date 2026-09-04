/**
 * HTTP (Supertest) — inclusão tardia de item em esteira EM_ANDAMENTO.
 * POST /api/v1/conveyors/:id/structure/items
 *
 * Sem DB: describe é skip explícito via `describe.skipIf(!hasDb)`.
 *
 * Provas de listagem do backlog operacional via HTTP (elegibilidade A6 no
 * Planejamento da Semana) também dependem de DB e ficam fora deste arquivo;
 * a cobertura unitária do fragmento SQL / helper puro está em
 * `operational-planning.backlog-eligibility.test.ts`.
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

function appendBody(titulo = 'Item tardio') {
  return {
    appendKind: 'OPTION' as const,
    reason: 'Necessidade operacional emergencial',
    originType: 'MANUAL' as const,
    matrixRootItemId: null,
    option: {
      titulo,
      orderIndex: 1,
      sourceOrigin: 'manual' as const,
      areas: [
        {
          titulo: 'Setor tardio',
          orderIndex: 1,
          sourceOrigin: 'manual' as const,
          steps: [
            {
              titulo: 'Atividade tardia',
              orderIndex: 1,
              plannedMinutes: 45,
              sourceOrigin: 'manual' as const,
              required: true,
            },
          ],
        },
      ],
    },
  }
}

function appendAreaBody(targetParentNodeId: string, titulo = 'Setor tardio AREA') {
  return {
    appendKind: 'AREA' as const,
    targetParentNodeId,
    reason: 'Necessidade de novo setor',
    originType: 'MANUAL' as const,
    matrixRootItemId: null,
    area: {
      titulo,
      orderIndex: 1,
      sourceOrigin: 'manual' as const,
      steps: [
        {
          titulo: 'Atividade do setor',
          orderIndex: 1,
          plannedMinutes: 20,
          sourceOrigin: 'manual' as const,
          required: true,
        },
      ],
    },
  }
}

function appendStepBody(targetParentNodeId: string, titulo = 'Atividade tardia STEP') {
  return {
    appendKind: 'STEP' as const,
    targetParentNodeId,
    reason: 'Necessidade de nova atividade',
    originType: 'MANUAL' as const,
    matrixRootItemId: null,
    step: {
      titulo,
      orderIndex: 1,
      plannedMinutes: 10,
      sourceOrigin: 'manual' as const,
      required: true,
    },
  }
}

describe.skipIf(!hasDb)('conveyor structure append HTTP (integração)', () => {
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
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          is_active = true,
          role_id = EXCLUDED.role_id,
          must_change_password = false`,
      [GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL, hash, ADMIN_ROLE_ID],
    )

    const perms = await pool.query<{ user_id: string; has_create: boolean }>(
      `SELECT au.id::text AS user_id,
              COALESCE(bool_or(p.code = 'conveyors.create'), false) AS has_create
         FROM app_users au
         LEFT JOIN app_role_permissions rp ON rp.role_id = au.role_id
         LEFT JOIN app_permissions p ON p.id = rp.permission_id
        WHERE au.id = ANY($1::uuid[])
        GROUP BY au.id`,
      [[GOV_ADMIN_USER_ID, MARIA_APP_USER_ID]],
    )
    const byUser = new Map(perms.rows.map((r) => [r.user_id, r.has_create]))
    if (byUser.get(GOV_ADMIN_USER_ID) !== true) {
      throw new Error('Fail-fast: utilizador de governança sem permissão conveyors.create.')
    }
    if (byUser.get(MARIA_APP_USER_ID) !== false) {
      throw new Error(
        'Fail-fast: utilizador do caso 403 possui conveyors.create; o teste de negação seria falso-positivo.',
      )
    }
  })

  afterAll(async () => {
    await closePool()
  })

  function adminCookie(): Promise<string> {
    return sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL)
  }

  function mariaCookie(): Promise<string> {
    return sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL)
  }

  async function seedEmAndamento() {
    const created = await serviceCreateConveyor(pool, minimalConveyorBody(`Append ${randomUUID().slice(0, 8)}`))
    await setConveyorProductionStatusForIntegration(pool, created.id, 'EM_ANDAMENTO')
    return created.id
  }

  it('append feliz: 200, totais, meta, sem COP items, preserva IDs existentes', async () => {
    const cid = await seedEmAndamento()
    const cookie = await adminCookie()
    const before = await request(app)
      .get(`/api/v1/conveyors/${cid}`)
      .set('Cookie', cookie)
    expect(before.status).toBe(200)
    const beforeOptId = before.body.data.structure.options[0].id as string
    const beforeTotals = {
      totalOptions: before.body.data.totalOptions as number,
      totalAreas: before.body.data.totalAreas as number,
      totalSteps: before.body.data.totalSteps as number,
      totalPlannedMinutes: before.body.data.totalPlannedMinutes as number,
    }

    const key = randomUUID()
    const res = await request(app)
      .post(`/api/v1/conveyors/${cid}/structure/items`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send(appendBody())

    expect(res.status).toBe(200)
    expect(res.body.meta.structureItemAppendIdempotent).toBe(false)
    expect(res.body.meta.appendKind).toBe('OPTION')
    expect(res.body.meta.addedOptionId).toBeTruthy()
    expect(res.body.meta.addedNodeId).toBe(res.body.meta.addedOptionId)
    expect(Array.isArray(res.body.meta.addedStepIds)).toBe(true)
    expect(res.body.meta.addedStepIds.length).toBe(1)
    // Append bem-sucedido NÃO altera ciclo de vida da esteira
    expect(res.body.data.operationalStatus).toBe('EM_ANDAMENTO')
    expect(res.body.data.structure.options.some((o: { id: string }) => o.id === beforeOptId)).toBe(
      true,
    )
    expect(res.body.data.totalOptions).toBe(beforeTotals.totalOptions + 1)
    expect(res.body.data.totalAreas).toBe(beforeTotals.totalAreas + 1)
    expect(res.body.data.totalSteps).toBe(beforeTotals.totalSteps + 1)
    expect(res.body.data.totalPlannedMinutes).toBe(beforeTotals.totalPlannedMinutes + 45)

    const stepId = res.body.meta.addedStepIds[0] as string
    const metaRow = await pool.query<{ metadata_json: unknown }>(
      `SELECT metadata_json FROM conveyor_nodes WHERE id = $1::uuid`,
      [stepId],
    )
    const meta = metaRow.rows[0]?.metadata_json as Record<string, unknown>
    expect(meta.lateAddToWeeklyBacklog).toBe(true)
    expect(typeof meta.lateAddReason).toBe('string')

    const conveyorStatus = await pool.query<{ operational_status: string }>(
      `SELECT operational_status FROM conveyors WHERE id = $1::uuid`,
      [cid],
    )
    expect(conveyorStatus.rows[0]?.operational_status).toBe('EM_ANDAMENTO')

    // GET detail não expõe metadata_json bruto nos nós (A7)
    const detailJson = JSON.stringify(res.body.data.structure)
    expect(detailJson).not.toContain('lateAddToWeeklyBacklog')

    const cop = await pool.query(
      `SELECT COUNT(*)::int AS n FROM conveyor_operational_plan_items
        WHERE activity_node_id = $1::uuid AND deleted_at IS NULL`,
      [stepId],
    )
    expect(cop.rows[0]?.n).toBe(0)

    const ev = await pool.query(
      `SELECT reason, event_type FROM conveyor_operational_events
        WHERE conveyor_id = $1::uuid AND event_type = 'CONVEYOR_STRUCTURE_ITEM_ADDED'`,
      [cid],
    )
    expect(ev.rows).toHaveLength(1)
    expect(ev.rows[0]?.reason).toBe('LATE_STRUCTURE_APPEND')

    const replay = await request(app)
      .post(`/api/v1/conveyors/${cid}/structure/items`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send(appendBody())
    expect(replay.status).toBe(200)
    expect(replay.body.meta.structureItemAppendIdempotent).toBe(true)
    expect(replay.body.meta.addedOptionId).toBe(res.body.meta.addedOptionId)
    expect(replay.body.data.totalOptions).toBe(res.body.data.totalOptions)
    expect(replay.body.data.operationalStatus).toBe('EM_ANDAMENTO')
  })

  it('status inválido (não EM_ANDAMENTO) → 422', async () => {
    const created = await serviceCreateConveyor(pool, minimalConveyorBody(`Elab ${randomUUID().slice(0, 8)}`))
    const res = await request(app)
      .post(`/api/v1/conveyors/${created.id}/structure/items`)
      .set('Cookie', await adminCookie())
      .set('Idempotency-Key', randomUUID())
      .send(appendBody())
    expect(res.status).toBe(422)
  })

  it('sem conveyors.create → 403', async () => {
    const cid = await seedEmAndamento()
    const res = await request(app)
      .post(`/api/v1/conveyors/${cid}/structure/items`)
      .set('Cookie', await mariaCookie())
      .set('Idempotency-Key', randomUUID())
      .send(appendBody())
    expect(res.status).toBe(403)
  })

  it('Idempotency-Key ausente → 400', async () => {
    const cid = await seedEmAndamento()
    const res = await request(app)
      .post(`/api/v1/conveyors/${cid}/structure/items`)
      .set('Cookie', await adminCookie())
      .send(appendBody())
    expect(res.status).toBe(400)
  })

  it('motivo inválido → 400', async () => {
    const cid = await seedEmAndamento()
    const res = await request(app)
      .post(`/api/v1/conveyors/${cid}/structure/items`)
      .set('Cookie', await adminCookie())
      .set('Idempotency-Key', randomUUID())
      .send({ ...appendBody(), reason: 'ab' })
    expect(res.status).toBe(400)
  })

  it('mesma key com payload diferente → 409', async () => {
    const cid = await seedEmAndamento()
    const cookie = await adminCookie()
    const key = randomUUID()
    const first = await request(app)
      .post(`/api/v1/conveyors/${cid}/structure/items`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send(appendBody('Primeiro'))
    expect(first.status).toBe(200)

    const second = await request(app)
      .post(`/api/v1/conveyors/${cid}/structure/items`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send(appendBody('Segundo diferente'))
    expect(second.status).toBe(409)
  })

  it('append AREA sob OPTION: 200, totais, meta sem addedOptionId', async () => {
    const cid = await seedEmAndamento()
    const cookie = await adminCookie()
    const before = await request(app).get(`/api/v1/conveyors/${cid}`).set('Cookie', cookie)
    expect(before.status).toBe(200)
    const optionId = before.body.data.structure.options[0].id as string
    const beforeTotals = {
      totalOptions: before.body.data.totalOptions as number,
      totalAreas: before.body.data.totalAreas as number,
      totalSteps: before.body.data.totalSteps as number,
      totalPlannedMinutes: before.body.data.totalPlannedMinutes as number,
    }

    const key = randomUUID()
    const res = await request(app)
      .post(`/api/v1/conveyors/${cid}/structure/items`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send(appendAreaBody(optionId))

    expect(res.status).toBe(200)
    expect(res.body.meta.appendKind).toBe('AREA')
    expect(res.body.meta.addedOptionId).toBeNull()
    expect(res.body.meta.addedAreaId).toBeTruthy()
    expect(res.body.meta.addedNodeId).toBe(res.body.meta.addedAreaId)
    expect(res.body.meta.addedStepIds).toHaveLength(1)
    expect(res.body.data.totalOptions).toBe(beforeTotals.totalOptions)
    expect(res.body.data.totalAreas).toBe(beforeTotals.totalAreas + 1)
    expect(res.body.data.totalSteps).toBe(beforeTotals.totalSteps + 1)
    expect(res.body.data.totalPlannedMinutes).toBe(beforeTotals.totalPlannedMinutes + 20)
    expect(res.body.data.operationalStatus).toBe('EM_ANDAMENTO')

    const stepId = res.body.meta.addedStepIds[0] as string
    const metaRow = await pool.query<{ metadata_json: unknown }>(
      `SELECT metadata_json FROM conveyor_nodes WHERE id = $1::uuid`,
      [stepId],
    )
    expect((metaRow.rows[0]?.metadata_json as Record<string, unknown>).lateAddToWeeklyBacklog).toBe(
      true,
    )

    const replay = await request(app)
      .post(`/api/v1/conveyors/${cid}/structure/items`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send(appendAreaBody(optionId))
    expect(replay.status).toBe(200)
    expect(replay.body.meta.structureItemAppendIdempotent).toBe(true)
    expect(replay.body.meta.addedAreaId).toBe(res.body.meta.addedAreaId)
    expect(replay.body.data.totalAreas).toBe(res.body.data.totalAreas)
  })

  it('append STEP sob AREA: 200, totais, meta sem addedOptionId', async () => {
    const cid = await seedEmAndamento()
    const cookie = await adminCookie()
    const before = await request(app).get(`/api/v1/conveyors/${cid}`).set('Cookie', cookie)
    expect(before.status).toBe(200)
    const areaId = before.body.data.structure.options[0].areas[0].id as string
    const beforeTotals = {
      totalOptions: before.body.data.totalOptions as number,
      totalAreas: before.body.data.totalAreas as number,
      totalSteps: before.body.data.totalSteps as number,
      totalPlannedMinutes: before.body.data.totalPlannedMinutes as number,
    }

    const key = randomUUID()
    const res = await request(app)
      .post(`/api/v1/conveyors/${cid}/structure/items`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send(appendStepBody(areaId))

    expect(res.status).toBe(200)
    expect(res.body.meta.appendKind).toBe('STEP')
    expect(res.body.meta.addedOptionId).toBeNull()
    expect(res.body.meta.addedAreaId).toBeNull()
    expect(res.body.meta.addedNodeId).toBe(res.body.meta.addedStepIds[0])
    expect(res.body.meta.addedStepIds).toHaveLength(1)
    expect(res.body.data.totalOptions).toBe(beforeTotals.totalOptions)
    expect(res.body.data.totalAreas).toBe(beforeTotals.totalAreas)
    expect(res.body.data.totalSteps).toBe(beforeTotals.totalSteps + 1)
    expect(res.body.data.totalPlannedMinutes).toBe(beforeTotals.totalPlannedMinutes + 10)

    const stepId = res.body.meta.addedStepIds[0] as string
    const metaRow = await pool.query<{ metadata_json: unknown }>(
      `SELECT metadata_json FROM conveyor_nodes WHERE id = $1::uuid`,
      [stepId],
    )
    expect((metaRow.rows[0]?.metadata_json as Record<string, unknown>).lateAddToWeeklyBacklog).toBe(
      true,
    )

    const replay = await request(app)
      .post(`/api/v1/conveyors/${cid}/structure/items`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', key)
      .send(appendStepBody(areaId))
    expect(replay.status).toBe(200)
    expect(replay.body.meta.structureItemAppendIdempotent).toBe(true)
    expect(replay.body.meta.addedStepIds[0]).toBe(stepId)
  })

  it('legado sem appendKind + option → tratado como OPTION', async () => {
    const cid = await seedEmAndamento()
    const cookie = await adminCookie()
    const legacy = appendBody('Legado OPTION')
    const withoutKind = { ...legacy }
    delete (withoutKind as { appendKind?: string }).appendKind
    const res = await request(app)
      .post(`/api/v1/conveyors/${cid}/structure/items`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send(withoutKind)
    expect(res.status).toBe(200)
    expect(res.body.meta.appendKind).toBe('OPTION')
    expect(res.body.meta.addedOptionId).toBeTruthy()
  })

  it('A6: STEP late-add ABORTED / restore preserva flag lateAddToWeeklyBacklog', async () => {
    const cid = await seedEmAndamento()
    const cookie = await adminCookie()
    const res = await request(app)
      .post(`/api/v1/conveyors/${cid}/structure/items`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send(appendBody())
    expect(res.status).toBe(200)
    // Happy path do append: esteira permanece EM_ANDAMENTO
    expect(res.body.data.operationalStatus).toBe('EM_ANDAMENTO')
    const stepId = res.body.meta.addedStepIds[0] as string

    await pool.query(
      `INSERT INTO conveyor_step_abort_reasons (code, label, requires_complement, sort_order, is_active)
       VALUES ('TEST_LATE_APPEND', 'Teste late append', false, 999, true)
       ON CONFLICT (code) DO UPDATE SET is_active = true, updated_at = now()`,
    )

    const abort = await request(app)
      .post(`/api/v1/conveyors/${cid}/steps/${stepId}/abort`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send({ reasonCode: 'TEST_LATE_APPEND' })
    expect(abort.status).toBe(200)

    const st = await pool.query<{
      operational_status: string
      metadata_json: Record<string, unknown>
    }>(`SELECT operational_status, metadata_json FROM conveyor_nodes WHERE id = $1::uuid`, [stepId])
    expect(st.rows[0]?.operational_status).toBe('ABORTED')
    expect(st.rows[0]?.metadata_json?.lateAddToWeeklyBacklog).toBe(true)

    const afterAbortCv = await pool.query<{ operational_status: string }>(
      `SELECT operational_status FROM conveyors WHERE id = $1::uuid`,
      [cid],
    )
    expect(afterAbortCv.rows[0]?.operational_status).toBe('EM_ANDAMENTO')

    const restore = await request(app)
      .post(`/api/v1/conveyors/${cid}/steps/${stepId}/restore-aborted`)
      .set('Cookie', cookie)
      .set('Idempotency-Key', randomUUID())
      .send({})
    expect(restore.status).toBe(200)

    const st2 = await pool.query<{
      operational_status: string
      metadata_json: Record<string, unknown>
    }>(`SELECT operational_status, metadata_json FROM conveyor_nodes WHERE id = $1::uuid`, [stepId])
    expect(st2.rows[0]?.operational_status).toBe('REOPENED')
    expect(st2.rows[0]?.metadata_json?.lateAddToWeeklyBacklog).toBe(true)

    const afterRestoreCv = await pool.query<{ operational_status: string }>(
      `SELECT operational_status FROM conveyors WHERE id = $1::uuid`,
      [cid],
    )
    expect(afterRestoreCv.rows[0]?.operational_status).toBe('EM_ANDAMENTO')
  })
})
