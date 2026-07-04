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
import { detectSyntheticSubtreeRollupNodesFromDetailStructure } from '../modules/conveyors/conveyorCreateDiagnostics.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const MARIA_APP_USER_ID = '44444444-4444-4444-4444-444444444444'
const MARIA_EMAIL = 'maria@exemplo.com'
const GOV_ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const GOV_ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'

function minimalValidBody() {
  return {
    dados: {
      nome: `Esteira teste ${randomUUID().slice(0, 8)}`,
      cliente: 'Cliente X',
      veiculo: 'V1',
      modeloVersao: '',
      placa: '',
      observacoes: '',
      responsavel: '',
      prazoEstimado: '',
      prioridade: 'media' as const,
      colaboradorId: null,
    },
    originType: 'MANUAL' as const,
    baseId: null,
    baseCode: null,
    baseName: null,
    baseVersion: null,
    options: [
      {
        titulo: 'Opção A',
        orderIndex: 1,
        sourceOrigin: 'manual' as const,
        areas: [
          {
            titulo: 'Área 1',
            orderIndex: 1,
            sourceOrigin: 'manual' as const,
            steps: [
              {
                titulo: 'Etapa 1',
                orderIndex: 1,
                plannedMinutes: 30,
                sourceOrigin: 'manual' as const,
                required: true,
              },
            ],
          },
        ],
      },
    ],
  }
}

describe.skipIf(!hasDb)('conveyors POST (integração)', () => {
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

  it('GET /api/v1/conveyors sem sessão → 401', async () => {
    const res = await request(app).get('/api/v1/conveyors')
    expect(res.status).toBe(401)
  })

  it('GET /api/v1/conveyors 200 e lista', async () => {
    const res = await request(app)
      .get('/api/v1/conveyors')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('GET /api/v1/conveyors/:id 404 quando UUID inexistente', async () => {
    const res = await request(app)
      .get(`/api/v1/conveyors/${randomUUID()}`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(res.status).toBe(404)
    expect(res.body.error?.code).toBe('NOT_FOUND')
  })

  it('GET /api/v1/conveyors/:id 200 após POST', async () => {
    const body = minimalValidBody()
    const post = await request(app)
      .post('/api/v1/conveyors')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send(body)
    expect(post.status).toBe(201)
    const cid = post.body.data.id as string
    const res = await request(app)
      .get(`/api/v1/conveyors/${cid}`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(res.status).toBe(200)
    const d = res.body.data
    expect(d.id).toBe(cid)
    expect(d.name).toBe(body.dados.nome)
    expect(d.priority).toBe('media')
    expect(d.originRegister).toBe('MANUAL')
    expect(d.operationalStatus).toBe('EM_ELABORACAO')
    expect(typeof d.createdAt).toBe('string')
    expect(d.totalSteps).toBe(1)
    expect('clientName' in d).toBe(true)
    expect('vehicle' in d).toBe(true)
    expect('initialNotes' in d).toBe(true)
    expect('estimatedDeadline' in d).toBe(true)
    expect(d.totalOptions).toBe(1)
    expect(d.totalAreas).toBe(1)
    expect(d.totalPlannedMinutes).toBe(30)
    expect(Array.isArray(d.structure?.options)).toBe(true)
    expect(d.structure.options[0]?.areas?.[0]?.steps?.[0]?.name).toBe('Etapa 1')
    expect(d.structure.options[0]?.areas?.[0]?.steps?.[0]?.operationalStatus).toBe('PENDING')
    expect(d.structure.options[0]?.areas?.[0]?.steps?.[0]?.isCompleted).toBe(false)
    expect(detectSyntheticSubtreeRollupNodesFromDetailStructure(d.structure)).toEqual([])
  })

  it('GET /api/v1/conveyors/:id/node-workload 200 — pendência e áreas', async () => {
    const body = minimalValidBody()
    const post = await request(app)
      .post('/api/v1/conveyors')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send(body)
    expect(post.status).toBe(201)
    const cid = post.body.data.id as string

    const res = await request(app)
      .get(`/api/v1/conveyors/${cid}/node-workload`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(res.status).toBe(200)
    const w = res.body.data
    expect(w.semanticsVersion).toBe('1.5')
    expect(w.conveyorId).toBe(cid)
    expect(w.conveyor.operationalBucket).toBe('em_elaboracao')
    expect(w.conveyor.isOverdueContext).toBe(false)
    expect(w.steps.length).toBe(1)
    expect(w.steps[0].plannedMinutes).toBe(30)
    expect(w.steps[0].realizedMinutes).toBe(0)
    expect(w.steps[0].pendingMinutes).toBe(30)
    expect(w.steps[0].operationalStatus).toBe('PENDING')
    expect(w.steps[0].isOperationallyCompleted).toBe(false)
    expect(w.areas.length).toBe(1)
    expect(w.areas[0].plannedMinutesSum).toBe(30)
    expect(w.areas[0].pendingMinutesSum).toBe(30)
    expect(typeof w.notes).toBe('string')
  })

  it('PATCH /api/v1/conveyors/:id/steps/:stepId/completion conclui etapa explicitamente', async () => {
    const body = minimalValidBody()
    const post = await request(app)
      .post('/api/v1/conveyors')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send(body)
    expect(post.status).toBe(201)
    const cid = post.body.data.id as string
    const det = await request(app)
      .get(`/api/v1/conveyors/${cid}`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(det.status).toBe(200)
    const stepId = det.body.data.structure.options[0].areas[0].steps[0].id as string

    const patch = await request(app)
      .patch(`/api/v1/conveyors/${cid}/steps/${stepId}/completion`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ action: 'COMPLETE', note: 'e2e' })
    expect(patch.status).toBe(200)
    expect(patch.body.meta.stepCompletionIdempotent).toBe(false)
    const st = patch.body.data.structure.options[0].areas[0].steps[0]
    expect(st.operationalStatus).toBe('COMPLETED')
    expect(st.isCompleted).toBe(true)

    const patch2 = await request(app)
      .patch(`/api/v1/conveyors/${cid}/steps/${stepId}/completion`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ action: 'COMPLETE' })
    expect(patch2.status).toBe(200)
    expect(patch2.body.meta.stepCompletionIdempotent).toBe(true)
  })

  it('PATCH completion action inválida responde 400/422 (Zod)', async () => {
    const body = minimalValidBody()
    const post = await request(app)
      .post('/api/v1/conveyors')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send(body)
    expect(post.status).toBe(201)
    const cid = post.body.data.id as string
    const det = await request(app)
      .get(`/api/v1/conveyors/${cid}`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(det.status).toBe(200)
    const stepId = det.body.data.structure.options[0].areas[0].steps[0].id as string

    const bad = await request(app)
      .patch(`/api/v1/conveyors/${cid}/steps/${stepId}/completion`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ action: 'INVALID' })
    expect(bad.status).toBeGreaterThanOrEqual(400)
    expect(bad.status).toBeLessThan(500)
  })

  it('PATCH completion REOPEN: volta a pendência e permite nova conclusão', async () => {
    const body = minimalValidBody()
    const post = await request(app)
      .post('/api/v1/conveyors')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send(body)
    expect(post.status).toBe(201)
    const cid = post.body.data.id as string
    const det = await request(app)
      .get(`/api/v1/conveyors/${cid}`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(det.status).toBe(200)
    const stepId = det.body.data.structure.options[0].areas[0].steps[0].id as string

    const complete1 = await request(app)
      .patch(`/api/v1/conveyors/${cid}/steps/${stepId}/completion`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ action: 'COMPLETE' })
    expect(complete1.status).toBe(200)

    const wDone = await request(app)
      .get(`/api/v1/conveyors/${cid}/node-workload`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(wDone.status).toBe(200)
    const stepDone = wDone.body.data.steps.find((s: { stepId: string }) => s.stepId === stepId)
    expect(stepDone.pendingMinutes).toBe(0)
    expect(stepDone.isOperationallyCompleted).toBe(true)

    const reopen = await request(app)
      .patch(`/api/v1/conveyors/${cid}/steps/${stepId}/completion`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ action: 'REOPEN', note: 'rever escopo' })
    expect(reopen.status).toBe(200)
    expect(reopen.body.data.structure.options[0].areas[0].steps[0].operationalStatus).toBe(
      'REOPENED',
    )

    const wOpen = await request(app)
      .get(`/api/v1/conveyors/${cid}/node-workload`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(wOpen.status).toBe(200)
    const stepOpen = wOpen.body.data.steps.find((s: { stepId: string }) => s.stepId === stepId)
    expect(stepOpen.pendingMinutes).toBe(30)
    expect(stepOpen.isOperationallyCompleted).toBe(false)

    const complete2 = await request(app)
      .patch(`/api/v1/conveyors/${cid}/steps/${stepId}/completion`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ action: 'COMPLETE' })
    expect(complete2.status).toBe(200)
    expect(complete2.body.meta.stepCompletionIdempotent).toBe(false)
    expect(complete2.body.data.structure.options[0].areas[0].steps[0].operationalStatus).toBe(
      'COMPLETED',
    )
  })

  it('PATCH completion REOPEN com etapa não concluída responde 422', async () => {
    const body = minimalValidBody()
    const post = await request(app)
      .post('/api/v1/conveyors')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send(body)
    expect(post.status).toBe(201)
    const cid = post.body.data.id as string
    const det = await request(app)
      .get(`/api/v1/conveyors/${cid}`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(det.status).toBe(200)
    const stepId = det.body.data.structure.options[0].areas[0].steps[0].id as string

    const reopen = await request(app)
      .patch(`/api/v1/conveyors/${cid}/steps/${stepId}/completion`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ action: 'REOPEN' })
    expect(reopen.status).toBe(422)
  })

  it('PATCH completion em nó OPTION responde 422', async () => {
    const body = minimalValidBody()
    const post = await request(app)
      .post('/api/v1/conveyors')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send(body)
    expect(post.status).toBe(201)
    const cid = post.body.data.id as string
    const det = await request(app)
      .get(`/api/v1/conveyors/${cid}`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(det.status).toBe(200)
    const optionId = det.body.data.structure.options[0].id as string
    const res = await request(app)
      .patch(`/api/v1/conveyors/${cid}/steps/${optionId}/completion`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ action: 'COMPLETE' })
    expect(res.status).toBe(422)
  })

  it('GET /api/v1/conveyors/:id/node-workload 404 UUID inexistente', async () => {
    const res = await request(app)
      .get(`/api/v1/conveyors/${randomUUID()}/node-workload`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(res.status).toBe(404)
  })

  it('PATCH /api/v1/conveyors/:id/status avanço e completed_at em FINALIZADA', async () => {
    const body = minimalValidBody()
    const post = await request(app)
      .post('/api/v1/conveyors')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send(body)
    expect(post.status).toBe(201)
    const cid = post.body.data.id as string

    const s1 = await request(app)
      .patch(`/api/v1/conveyors/${cid}/status`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ operationalStatus: 'AGUARDANDO_PLANEJAMENTO' })
    expect(s1.status).toBe(200)
    expect(s1.body.data.operationalStatus).toBe('AGUARDANDO_PLANEJAMENTO')
    expect(s1.body.data.completedAt).toBeNull()

    for (const st of ['EM_PLANEJAMENTO', 'A_INICIAR'] as const) {
      const r = await request(app)
        .patch(`/api/v1/conveyors/${cid}/status`)
        .set(
          'Cookie',
          await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
        )
        .send({ operationalStatus: st })
      expect(r.status).toBe(200)
    }

    await pool.query(
      `UPDATE conveyors SET operational_status = 'EM_ANDAMENTO' WHERE id = $1::uuid`,
      [cid],
    )

    const done = await request(app)
      .patch(`/api/v1/conveyors/${cid}/status`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ operationalStatus: 'FINALIZADA' })
    expect(done.status).toBe(200)
    expect(done.body.data.operationalStatus).toBe('FINALIZADA')
    expect(done.body.data.completedAt).toBeTruthy()
  })

  it('PATCH /api/v1/conveyors/:id/status 422 transição inválida', async () => {
    const body = minimalValidBody()
    const post = await request(app)
      .post('/api/v1/conveyors')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send(body)
    const cid = post.body.data.id as string

    await request(app)
      .patch(`/api/v1/conveyors/${cid}/status`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ operationalStatus: 'AGUARDANDO_PLANEJAMENTO' })
    await request(app)
      .patch(`/api/v1/conveyors/${cid}/status`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ operationalStatus: 'EM_PLANEJAMENTO' })
    await request(app)
      .patch(`/api/v1/conveyors/${cid}/status`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ operationalStatus: 'A_INICIAR' })

    const bad = await request(app)
      .patch(`/api/v1/conveyors/${cid}/status`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ operationalStatus: 'EM_PLANEJAMENTO' })
    expect(bad.status).toBe(422)
    expect(bad.body.error?.code).toBe('INVALID_STATUS_TRANSITION')
  })

  it('POST /api/v1/conveyors 201 e totais recalculados no servidor', async () => {
    const body = minimalValidBody()
    body.dados.observacoes =
      'Nota\n\n[Planeamento] Tempo total previsto: 9999 min'
    const res = await request(app)
      .post('/api/v1/conveyors')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send(body)
    expect(res.status).toBe(201)
    const d = res.body.data
    expect(d.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
    expect(d.code).toBeNull()
    expect(d.name).toBe(body.dados.nome)
    expect(d.priority).toBe('media')
    expect(d.originRegister).toBe('MANUAL')
    expect(d.totals).toEqual({
      totalOptions: 1,
      totalAreas: 1,
      totalSteps: 1,
      totalPlannedMinutes: 30,
    })
    const det = await request(app)
      .get(`/api/v1/conveyors/${d.id}`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
    expect(det.status).toBe(200)
    expect(det.body.data.initialNotes).toBe('Nota')
    expect(typeof d.createdAt).toBe('string')
  })

  it('prioridade vazia normaliza para media', async () => {
    const body = minimalValidBody()
    body.dados.prioridade = ''
    const res = await request(app)
      .post('/api/v1/conveyors')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send(body)
    expect(res.status).toBe(201)
    expect(res.body.data.priority).toBe('media')
  })

  it('422 quando orderIndex duplicado entre opções', async () => {
    const body = minimalValidBody()
    body.options = [
      {
        titulo: 'O1',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'A1',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: [
              {
                titulo: 'S1',
                orderIndex: 1,
                plannedMinutes: 10,
                sourceOrigin: 'manual',
                required: true,
              },
            ],
          },
        ],
      },
      {
        titulo: 'O2',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'A2',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: [
              {
                titulo: 'S2',
                orderIndex: 1,
                plannedMinutes: 5,
                sourceOrigin: 'manual',
                required: true,
              },
            ],
          },
        ],
      },
    ]
    const res = await request(app)
      .post('/api/v1/conveyors')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send(body)
    expect(res.status).toBe(422)
    expect(res.body.error?.code).toBe('VALIDATION_ERROR')
  })

  it('422 quando colaboradorId inexistente', async () => {
    const body = minimalValidBody()
    body.dados.colaboradorId = randomUUID()
    const res = await request(app)
      .post('/api/v1/conveyors')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send(body)
    expect(res.status).toBe(422)
    expect(res.body.error?.message).toContain('Colaborador')
  })

  it('POST 422 — S9.4.5 pseudo-rollup oficial (Área + step = opção com setores reais)', async () => {
    const t = '16 - VOLANTE'
    const body = minimalValidBody()
    body.options = [
      {
        titulo: t,
        orderIndex: 1,
        sourceOrigin: 'manual' as const,
        areas: [
          {
            titulo: 'Área',
            orderIndex: 1,
            sourceOrigin: 'manual' as const,
            steps: [
              {
                titulo: t,
                orderIndex: 1,
                plannedMinutes: 250,
                sourceOrigin: 'manual' as const,
                required: true,
                assignees: [],
              },
            ],
          },
          {
            titulo: 'PREPARAÇÃO',
            orderIndex: 2,
            sourceOrigin: 'manual' as const,
            steps: [
              {
                titulo: 'Remover revestimento',
                orderIndex: 1,
                plannedMinutes: 10,
                sourceOrigin: 'manual' as const,
                required: true,
                assignees: [],
              },
              {
                titulo: 'Limpar',
                orderIndex: 2,
                plannedMinutes: 10,
                sourceOrigin: 'manual' as const,
                required: true,
                assignees: [],
              },
            ],
          },
        ],
      },
    ]
    const res = await request(app)
      .post('/api/v1/conveyors')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send(body)
    expect(res.status).toBe(422)
    expect(res.body.error?.code).toBe('CONVEYOR_SYNTHETIC_ROLLUP_STEP')
  })

  it('POST 201 — S9.4.5 payload sem pseudo-rollup (só setores nomeados)', async () => {
    const body = minimalValidBody()
    body.options = [
      {
        titulo: '16 - VOLANTE',
        orderIndex: 1,
        sourceOrigin: 'manual' as const,
        areas: [
          {
            titulo: 'PREPARAÇÃO',
            orderIndex: 1,
            sourceOrigin: 'manual' as const,
            steps: [
              {
                titulo: 'Remover revestimento',
                orderIndex: 1,
                plannedMinutes: 10,
                sourceOrigin: 'manual' as const,
                required: true,
                assignees: [],
              },
              {
                titulo: 'Limpar',
                orderIndex: 2,
                plannedMinutes: 10,
                sourceOrigin: 'manual' as const,
                required: true,
                assignees: [],
              },
            ],
          },
          {
            titulo: 'CORTE',
            orderIndex: 2,
            sourceOrigin: 'manual' as const,
            steps: [
              {
                titulo: 'Corte couro',
                orderIndex: 1,
                plannedMinutes: 40,
                sourceOrigin: 'manual' as const,
                required: true,
                assignees: [],
              },
            ],
          },
        ],
      },
    ]
    const post = await request(app)
      .post('/api/v1/conveyors')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send(body)
    expect(post.status).toBe(201)
    const cid = post.body.data.id as string
    const res = await request(app)
      .get(`/api/v1/conveyors/${cid}`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(res.status).toBe(200)
    const d = res.body.data
    const areaNames = d.structure.options[0]?.areas?.map((a: { name: string }) => a.name) ?? []
    expect(areaNames).not.toContain('Área')
    expect(detectSyntheticSubtreeRollupNodesFromDetailStructure(d.structure)).toEqual([])
    expect(d.totalPlannedMinutes).toBe(60)
  })
})
