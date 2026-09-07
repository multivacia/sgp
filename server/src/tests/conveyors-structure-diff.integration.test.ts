/**
 * PATCH /api/v1/conveyors/:id/structure — diff incremental (integração).
 *
 * Cobre os critérios de aceite do hotfix "diff incremental de estrutura":
 * preserva ids, funciona em qualquer status, nunca faz hard-delete de nó
 * (soft-delete via `conveyor_nodes.deleted_at`), recalcula totais a partir
 * do estado final ativo, valida ownership/hierarquia de `id`s e suporta
 * replay idempotente via header `Idempotency-Key`.
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
import { hashPassword } from '../shared/password/password.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import {
  ensureMariaCollaboratorSeedForIntegration,
  MARIA_COLLABORATOR_ID,
} from './integrationSeedFixtures.js'
import { setConveyorProductionStatusForIntegration } from './integrationConveyorFixtures.js'
import { serviceListOperationalPlanningBacklog } from '../modules/operational-planning/operational-planning.service.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const GOV_ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const GOV_ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'

const ALL_STATUSES = [
  'EM_ELABORACAO',
  'AGUARDANDO_PLANEJAMENTO',
  'EM_PLANEJAMENTO',
  'A_INICIAR',
  'EM_ANDAMENTO',
  'FINALIZADA',
  'CANCELADA',
] as const

function minimalConveyorBody(nome: string) {
  return {
    dados: {
      nome,
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

describe.skipIf(!hasDb)('conveyors PATCH structure — diff incremental (integração)', () => {
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

  function cookie(): Promise<string> {
    return sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL)
  }

  async function createConveyor(nome = `Diff ${randomUUID().slice(0, 8)}`) {
    const res = await request(app)
      .post('/api/v1/conveyors')
      .set('Cookie', await cookie())
      .send(minimalConveyorBody(nome))
    expect(res.status).toBe(201)
    return res.body.data.id as string
  }

  async function getDetail(cid: string) {
    const res = await request(app)
      .get(`/api/v1/conveyors/${cid}`)
      .set('Cookie', await cookie())
    expect(res.status).toBe(200)
    return res.body.data
  }

  function patchStructure(cid: string, body: unknown, idempotencyKey = randomUUID()) {
    return cookie().then((c) =>
      request(app)
        .patch(`/api/v1/conveyors/${cid}/structure`)
        .set('Cookie', c)
        .set('Idempotency-Key', idempotencyKey)
        .send(body),
    )
  }

  /** Corpo mínimo, com `id`s preservados a partir do detalhe atual (no-op salvo overrides). */
  function bodyFromSingleStepDetail(
    detail: {
      structure: { options: Array<{ id: string; name: string; orderIndex: number; areas: Array<{ id: string; name: string; orderIndex: number; steps: Array<{ id: string; name: string; orderIndex: number; plannedMinutes: number | null }> }> }> }
    },
    overrides?: {
      optionTitulo?: string
      areaTitulo?: string
      stepTitulo?: string
      stepPlannedMinutes?: number
    },
  ) {
    const opt = detail.structure.options[0]!
    const area = opt.areas[0]!
    const step = area.steps[0]!
    return {
      originType: 'MANUAL' as const,
      baseId: null,
      baseCode: null,
      baseName: null,
      baseVersion: null,
      matrixRootItemId: null,
      options: [
        {
          id: opt.id,
          titulo: overrides?.optionTitulo ?? opt.name,
          orderIndex: opt.orderIndex,
          sourceOrigin: 'manual' as const,
          areas: [
            {
              id: area.id,
              titulo: overrides?.areaTitulo ?? area.name,
              orderIndex: area.orderIndex,
              sourceOrigin: 'manual' as const,
              steps: [
                {
                  id: step.id,
                  titulo: overrides?.stepTitulo ?? step.name,
                  orderIndex: step.orderIndex,
                  plannedMinutes: overrides?.stepPlannedMinutes ?? step.plannedMinutes ?? 0,
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

  it.each(ALL_STATUSES)('PATCH funciona (200) no status %s', async (status) => {
    const cid = await createConveyor()
    await setConveyorProductionStatusForIntegration(pool, cid, status)
    const detail = await getDetail(cid)
    const body = bodyFromSingleStepDetail(detail, { stepTitulo: `Etapa ${status}` })
    const res = await patchStructure(cid, body)
    expect(res.status).toBe(200)
    expect(res.body.error?.errorRef).not.toBe('SGP-API-HANDLER-001')
    expect(res.body.data.structure.options[0].areas[0].steps[0].name).toBe(`Etapa ${status}`)
  })

  it('UPDATE de STEP existente (enviando id) preserva o id e atualiza título/tempo', async () => {
    const cid = await createConveyor()
    const before = await getDetail(cid)
    const stepId = before.structure.options[0].areas[0].steps[0].id as string

    const body = bodyFromSingleStepDetail(before, {
      stepTitulo: 'Etapa atualizada',
      stepPlannedMinutes: 90,
    })
    const res = await patchStructure(cid, body)
    expect(res.status).toBe(200)
    const stepAfter = res.body.data.structure.options[0].areas[0].steps[0]
    expect(stepAfter.id).toBe(stepId)
    expect(stepAfter.name).toBe('Etapa atualizada')
    expect(stepAfter.plannedMinutes).toBe(90)
    expect(res.body.data.totalPlannedMinutes).toBe(90)
  })

  it('INSERT de novo STEP (sem id) gera id novo, parent correto', async () => {
    const cid = await createConveyor()
    const before = await getDetail(cid)
    const opt = before.structure.options[0]
    const area = opt.areas[0]
    const step = area.steps[0]

    const body = {
      originType: 'MANUAL' as const,
      baseId: null,
      baseCode: null,
      baseName: null,
      baseVersion: null,
      matrixRootItemId: null,
      options: [
        {
          id: opt.id,
          titulo: opt.name,
          orderIndex: opt.orderIndex,
          sourceOrigin: 'manual' as const,
          areas: [
            {
              id: area.id,
              titulo: area.name,
              orderIndex: area.orderIndex,
              sourceOrigin: 'manual' as const,
              steps: [
                {
                  id: step.id,
                  titulo: step.name,
                  orderIndex: 1,
                  plannedMinutes: step.plannedMinutes,
                  sourceOrigin: 'manual' as const,
                  required: true,
                },
                {
                  titulo: 'Etapa nova',
                  orderIndex: 2,
                  plannedMinutes: 25,
                  sourceOrigin: 'manual' as const,
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    }
    const res = await patchStructure(cid, body)
    expect(res.status).toBe(200)
    const steps = res.body.data.structure.options[0].areas[0].steps as Array<{
      id: string
      name: string
      orderIndex: number
    }>
    expect(steps).toHaveLength(2)
    const newStep = steps.find((s) => s.name === 'Etapa nova')
    expect(newStep).toBeTruthy()
    expect(newStep!.id).not.toBe(step.id)

    const parentRow = await pool.query<{ parent_id: string }>(
      `SELECT parent_id::text FROM conveyor_nodes WHERE id = $1::uuid`,
      [newStep!.id],
    )
    expect(parentRow.rows[0]?.parent_id).toBe(area.id)
  })

  it('REORDER de STEPs irmãos preserva todos os ids, sem recriar linhas', async () => {
    const cid = await createConveyor()
    const before = await getDetail(cid)
    const opt = before.structure.options[0]
    const area = opt.areas[0]
    const step1 = area.steps[0]

    // Adiciona um segundo step primeiro (INSERT), depois reordena os dois.
    const addRes = await patchStructure(cid, {
      originType: 'MANUAL',
      baseId: null,
      baseCode: null,
      baseName: null,
      baseVersion: null,
      matrixRootItemId: null,
      options: [
        {
          id: opt.id,
          titulo: opt.name,
          orderIndex: opt.orderIndex,
          sourceOrigin: 'manual',
          areas: [
            {
              id: area.id,
              titulo: area.name,
              orderIndex: area.orderIndex,
              sourceOrigin: 'manual',
              steps: [
                { id: step1.id, titulo: step1.name, orderIndex: 1, plannedMinutes: step1.plannedMinutes, sourceOrigin: 'manual', required: true },
                { titulo: 'Etapa B', orderIndex: 2, plannedMinutes: 20, sourceOrigin: 'manual', required: true },
              ],
            },
          ],
        },
      ],
    })
    expect(addRes.status).toBe(200)
    const stepsAfterAdd = addRes.body.data.structure.options[0].areas[0].steps as Array<{
      id: string
      name: string
    }>
    const step2Id = stepsAfterAdd.find((s) => s.name === 'Etapa B')!.id
    const idsBefore = new Set([step1.id, step2Id])

    const nRowsBefore = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM conveyor_nodes WHERE conveyor_id = $1::uuid AND node_type = 'STEP'`,
      [cid],
    )

    const reorderRes = await patchStructure(cid, {
      originType: 'MANUAL',
      baseId: null,
      baseCode: null,
      baseName: null,
      baseVersion: null,
      matrixRootItemId: null,
      options: [
        {
          id: opt.id,
          titulo: opt.name,
          orderIndex: opt.orderIndex,
          sourceOrigin: 'manual',
          areas: [
            {
              id: area.id,
              titulo: area.name,
              orderIndex: area.orderIndex,
              sourceOrigin: 'manual',
              steps: [
                { id: step2Id, titulo: 'Etapa B', orderIndex: 1, plannedMinutes: 20, sourceOrigin: 'manual', required: true },
                { id: step1.id, titulo: step1.name, orderIndex: 2, plannedMinutes: step1.plannedMinutes, sourceOrigin: 'manual', required: true },
              ],
            },
          ],
        },
      ],
    })
    expect(reorderRes.status).toBe(200)
    const stepsAfterReorder = reorderRes.body.data.structure.options[0].areas[0].steps as Array<{
      id: string
      name: string
      orderIndex: number
    }>
    expect(new Set(stepsAfterReorder.map((s) => s.id))).toEqual(idsBefore)
    expect(stepsAfterReorder.find((s) => s.id === step2Id)?.orderIndex).toBe(1)
    expect(stepsAfterReorder.find((s) => s.id === step1.id)?.orderIndex).toBe(2)

    const nRowsAfter = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM conveyor_nodes WHERE conveyor_id = $1::uuid AND node_type = 'STEP'`,
      [cid],
    )
    expect(nRowsAfter.rows[0]?.n).toBe(nRowsBefore.rows[0]?.n)
  })

  it('omitir um STEP existente do payload → deleted_at preenchido, linha permanece', async () => {
    const cid = await createConveyor()
    const before = await getDetail(cid)
    const opt = before.structure.options[0]
    const area = opt.areas[0]
    const step = area.steps[0]

    // Área precisa de ao menos 1 step no payload (schema min(1)) — insere um novo e
    // omite o antigo, que deve ser soft-deletado.
    const res = await patchStructure(cid, {
      originType: 'MANUAL',
      baseId: null,
      baseCode: null,
      baseName: null,
      baseVersion: null,
      matrixRootItemId: null,
      options: [
        {
          id: opt.id,
          titulo: opt.name,
          orderIndex: opt.orderIndex,
          sourceOrigin: 'manual',
          areas: [
            {
              id: area.id,
              titulo: area.name,
              orderIndex: area.orderIndex,
              sourceOrigin: 'manual',
              steps: [
                { titulo: 'Etapa substituta', orderIndex: 1, plannedMinutes: 15, sourceOrigin: 'manual', required: true },
              ],
            },
          ],
        },
      ],
    })
    expect(res.status).toBe(200)

    const row = await pool.query<{ deleted_at: Date | null; id: string }>(
      `SELECT id::text, deleted_at FROM conveyor_nodes WHERE id = $1::uuid`,
      [step.id],
    )
    expect(row.rows).toHaveLength(1)
    expect(row.rows[0]?.deleted_at).not.toBeNull()
  })

  it('omitir uma OPTION inteira → toda a subárvore ativa fica com deleted_at preenchido', async () => {
    const cid = await createConveyor()
    const before = await getDetail(cid)
    const opt = before.structure.options[0]
    const area = opt.areas[0]
    const step = area.steps[0]

    const res = await patchStructure(cid, {
      originType: 'MANUAL',
      baseId: null,
      baseCode: null,
      baseName: null,
      baseVersion: null,
      matrixRootItemId: null,
      options: [
        {
          titulo: 'Opção substituta',
          orderIndex: 1,
          sourceOrigin: 'manual',
          areas: [
            {
              titulo: 'Área substituta',
              orderIndex: 1,
              sourceOrigin: 'manual',
              steps: [
                { titulo: 'Etapa substituta', orderIndex: 1, plannedMinutes: 10, sourceOrigin: 'manual', required: true },
              ],
            },
          ],
        },
      ],
    })
    expect(res.status).toBe(200)

    const rows = await pool.query<{ id: string; deleted_at: Date | null }>(
      `SELECT id::text, deleted_at FROM conveyor_nodes WHERE id = ANY($1::uuid[])`,
      [[opt.id, area.id, step.id]],
    )
    expect(rows.rows).toHaveLength(3)
    for (const r of rows.rows) {
      expect(r.deleted_at).not.toBeNull()
    }
  })

  it('remover STEP com conveyor_time_entries vinculado → sucesso (soft-delete), sem 23503; time entry preservada', async () => {
    const cid = await createConveyor()
    await setConveyorProductionStatusForIntegration(pool, cid, 'EM_ANDAMENTO')
    const before = await getDetail(cid)
    const step = before.structure.options[0].areas[0].steps[0]

    const entryId = randomUUID()
    await pool.query(
      `INSERT INTO conveyor_time_entries (id, conveyor_id, conveyor_node_id, collaborator_id, minutes)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 10)`,
      [entryId, cid, step.id, MARIA_COLLABORATOR_ID],
    )

    const res = await patchStructure(cid, {
      originType: 'MANUAL',
      baseId: null,
      baseCode: null,
      baseName: null,
      baseVersion: null,
      matrixRootItemId: null,
      options: [
        {
          titulo: 'Opção substituta',
          orderIndex: 1,
          sourceOrigin: 'manual',
          areas: [
            {
              titulo: 'Área substituta',
              orderIndex: 1,
              sourceOrigin: 'manual',
              steps: [
                { titulo: 'Etapa substituta', orderIndex: 1, plannedMinutes: 10, sourceOrigin: 'manual', required: true },
              ],
            },
          ],
        },
      ],
    })
    expect(res.status).toBe(200)
    expect(res.body.error?.errorRef).not.toBe('SGP-API-HANDLER-001')

    const entryRow = await pool.query<{ conveyor_node_id: string; deleted_at: Date | null }>(
      `SELECT conveyor_node_id::text, deleted_at FROM conveyor_time_entries WHERE id = $1::uuid`,
      [entryId],
    )
    expect(entryRow.rows[0]?.conveyor_node_id).toBe(step.id)
    expect(entryRow.rows[0]?.deleted_at).toBeNull()

    const nodeRow = await pool.query<{ deleted_at: Date | null }>(
      `SELECT deleted_at FROM conveyor_nodes WHERE id = $1::uuid`,
      [step.id],
    )
    expect(nodeRow.rows[0]?.deleted_at).not.toBeNull()
  })

  it('remover STEP com operational_work_plan_items/conveyor_operational_plan_items vinculado → sucesso, sem bloqueio', async () => {
    const cid = await createConveyor()
    const before = await getDetail(cid)
    const step = before.structure.options[0].areas[0].steps[0]

    const planId = randomUUID()
    await pool.query(
      `INSERT INTO conveyor_operational_plans (
        id, conveyor_id, status, version, factory_planning_status, created_at, updated_at
      ) VALUES ($1::uuid, $2::uuid, 'DRAFT', 1, 'NOT_SCHEDULED', now(), now())`,
      [planId, cid],
    )
    await pool.query(
      `INSERT INTO conveyor_operational_plan_items (
        id, plan_id, conveyor_id, activity_node_id, planned_date, planned_order,
        planned_minutes, status, source_kind, created_at, updated_at
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, CURRENT_DATE, 0, 30, 'PLANNED', 'MANUAL', now(), now())`,
      [randomUUID(), planId, cid, step.id],
    )

    const res = await patchStructure(cid, {
      originType: 'MANUAL',
      baseId: null,
      baseCode: null,
      baseName: null,
      baseVersion: null,
      matrixRootItemId: null,
      options: [
        {
          titulo: 'Opção substituta',
          orderIndex: 1,
          sourceOrigin: 'manual',
          areas: [
            {
              titulo: 'Área substituta',
              orderIndex: 1,
              sourceOrigin: 'manual',
              steps: [
                { titulo: 'Etapa substituta', orderIndex: 1, plannedMinutes: 10, sourceOrigin: 'manual', required: true },
              ],
            },
          ],
        },
      ],
    })
    expect(res.status).toBe(200)
    expect(res.body.error?.errorRef).not.toBe('SGP-API-HANDLER-001')

    const nodeRow = await pool.query<{ deleted_at: Date | null }>(
      `SELECT deleted_at FROM conveyor_nodes WHERE id = $1::uuid`,
      [step.id],
    )
    expect(nodeRow.rows[0]?.deleted_at).not.toBeNull()
  })

  it('UPDATE de STEP COMPLETED altera título mas preserva operational_status/completed_at/completed_by', async () => {
    const cid = await createConveyor()
    const before = await getDetail(cid)
    const step = before.structure.options[0].areas[0].steps[0]

    const completedAt = new Date('2026-01-15T12:00:00.000Z')
    await pool.query(
      `UPDATE conveyor_nodes SET
         operational_status = 'COMPLETED',
         operational_completed_at = $2::timestamptz,
         operational_completed_by = $3::uuid
       WHERE id = $1::uuid`,
      [step.id, completedAt.toISOString(), GOV_ADMIN_USER_ID],
    )

    const detail = await getDetail(cid)
    const body = bodyFromSingleStepDetail(detail, { stepTitulo: 'Etapa concluída renomeada' })
    const res = await patchStructure(cid, body)
    expect(res.status).toBe(200)
    expect(res.body.data.structure.options[0].areas[0].steps[0].name).toBe(
      'Etapa concluída renomeada',
    )

    const row = await pool.query<{
      operational_status: string
      operational_completed_at: Date
      operational_completed_by: string
    }>(
      `SELECT operational_status, operational_completed_at, operational_completed_by::text
         FROM conveyor_nodes WHERE id = $1::uuid`,
      [step.id],
    )
    expect(row.rows[0]?.operational_status).toBe('COMPLETED')
    expect(row.rows[0]?.operational_completed_at?.toISOString()).toBe(completedAt.toISOString())
    expect(row.rows[0]?.operational_completed_by).toBe(GOV_ADMIN_USER_ID)
  })

  it('UPDATE de STEP ABORTED altera plannedMinutes mas preserva aborted_at/aborted_by/abort_reason_*', async () => {
    const cid = await createConveyor()
    const before = await getDetail(cid)
    const step = before.structure.options[0].areas[0].steps[0]

    await pool.query(
      `INSERT INTO conveyor_step_abort_reasons (code, label, requires_complement, sort_order, is_active)
       VALUES ('TESTE_DIFF', 'Motivo de teste', false, 999, true)
       ON CONFLICT (code) DO UPDATE SET is_active = true, updated_at = now()`,
    )

    const abortedAt = new Date('2026-02-10T09:30:00.000Z')
    await pool.query(
      `UPDATE conveyor_nodes SET
         operational_status = 'ABORTED',
         aborted_at = $2::timestamptz,
         aborted_by = $3::uuid,
         abort_reason_code = 'TESTE_DIFF',
         abort_reason_text = 'Motivo de teste',
         abort_reason_label_snapshot = 'Motivo de teste (snapshot)'
       WHERE id = $1::uuid`,
      [step.id, abortedAt.toISOString(), GOV_ADMIN_USER_ID],
    )

    const detail = await getDetail(cid)
    const body = bodyFromSingleStepDetail(detail, { stepPlannedMinutes: 77 })
    const res = await patchStructure(cid, body)
    expect(res.status).toBe(200)
    expect(res.body.data.structure.options[0].areas[0].steps[0].plannedMinutes).toBe(77)

    const row = await pool.query<{
      aborted_at: Date
      aborted_by: string
      abort_reason_code: string
      abort_reason_text: string
      abort_reason_label_snapshot: string
      operational_status: string
    }>(
      `SELECT aborted_at, aborted_by::text, abort_reason_code, abort_reason_text,
              abort_reason_label_snapshot, operational_status
         FROM conveyor_nodes WHERE id = $1::uuid`,
      [step.id],
    )
    expect(row.rows[0]?.operational_status).toBe('ABORTED')
    expect(row.rows[0]?.aborted_at?.toISOString()).toBe(abortedAt.toISOString())
    expect(row.rows[0]?.aborted_by).toBe(GOV_ADMIN_USER_ID)
    expect(row.rows[0]?.abort_reason_code).toBe('TESTE_DIFF')
    expect(row.rows[0]?.abort_reason_text).toBe('Motivo de teste')
    expect(row.rows[0]?.abort_reason_label_snapshot).toBe('Motivo de teste (snapshot)')
  })

  it('totais da esteira após PATCH batem com COUNT/SUM direto em conveyor_nodes ativos', async () => {
    const cid = await createConveyor()
    const before = await getDetail(cid)
    const opt = before.structure.options[0]
    const area = opt.areas[0]
    const step = area.steps[0]

    const res = await patchStructure(cid, {
      originType: 'MANUAL',
      baseId: null,
      baseCode: null,
      baseName: null,
      baseVersion: null,
      matrixRootItemId: null,
      options: [
        {
          id: opt.id,
          titulo: opt.name,
          orderIndex: 1,
          sourceOrigin: 'manual',
          areas: [
            {
              id: area.id,
              titulo: area.name,
              orderIndex: 1,
              sourceOrigin: 'manual',
              steps: [
                { id: step.id, titulo: step.name, orderIndex: 1, plannedMinutes: 40, sourceOrigin: 'manual', required: true },
                { titulo: 'Etapa extra', orderIndex: 2, plannedMinutes: 20, sourceOrigin: 'manual', required: true },
              ],
            },
            {
              titulo: 'Área extra',
              orderIndex: 2,
              sourceOrigin: 'manual',
              steps: [
                { titulo: 'Etapa da área extra', orderIndex: 1, plannedMinutes: 5, sourceOrigin: 'manual', required: true },
              ],
            },
          ],
        },
      ],
    })
    expect(res.status).toBe(200)

    const direct = await pool.query<{
      total_options: string
      total_areas: string
      total_steps: string
      total_minutes: string
    }>(
      `
      SELECT
        COUNT(*) FILTER (WHERE node_type = 'OPTION')::text AS total_options,
        COUNT(*) FILTER (WHERE node_type = 'AREA')::text AS total_areas,
        COUNT(*) FILTER (WHERE node_type = 'STEP')::text AS total_steps,
        COALESCE(SUM(planned_minutes * planned_quantity) FILTER (WHERE node_type = 'STEP'), 0)::text AS total_minutes
      FROM conveyor_nodes
      WHERE conveyor_id = $1::uuid AND deleted_at IS NULL
      `,
      [cid],
    )
    const d = direct.rows[0]!
    expect(res.body.data.totalOptions).toBe(Number(d.total_options))
    expect(res.body.data.totalAreas).toBe(Number(d.total_areas))
    expect(res.body.data.totalSteps).toBe(Number(d.total_steps))
    expect(res.body.data.totalPlannedMinutes).toBe(Number(d.total_minutes))
  })

  it('id de nó de outra esteira no payload → 4xx, nada alterado', async () => {
    const cid1 = await createConveyor()
    const cid2 = await createConveyor()
    const detail1 = await getDetail(cid1)
    const detail2 = await getDetail(cid2)
    const foreignStepId = detail2.structure.options[0].areas[0].steps[0].id as string

    const body = bodyFromSingleStepDetail(detail1)
    body.options[0].areas[0].steps[0] = {
      ...body.options[0].areas[0].steps[0],
      id: foreignStepId,
    }

    const res = await patchStructure(cid1, body)
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)

    const afterCid1 = await getDetail(cid1)
    expect(afterCid1.structure.options[0].areas[0].steps[0].id).toBe(
      detail1.structure.options[0].areas[0].steps[0].id,
    )
    const afterCid2 = await getDetail(cid2)
    expect(afterCid2.structure.options[0].areas[0].steps[0].id).toBe(foreignStepId)
  })

  it('id de STEP usado como pai de uma AREA (hierarquia inválida) → 422', async () => {
    const cid = await createConveyor()
    const detail = await getDetail(cid)
    const stepId = detail.structure.options[0].areas[0].steps[0].id as string

    const res = await patchStructure(cid, {
      originType: 'MANUAL',
      baseId: null,
      baseCode: null,
      baseName: null,
      baseVersion: null,
      matrixRootItemId: null,
      options: [
        {
          titulo: 'Opção',
          orderIndex: 1,
          sourceOrigin: 'manual',
          areas: [
            {
              id: stepId,
              titulo: 'Área com id de STEP',
              orderIndex: 1,
              sourceOrigin: 'manual',
              steps: [
                { titulo: 'Etapa', orderIndex: 1, plannedMinutes: 10, sourceOrigin: 'manual', required: true },
              ],
            },
          ],
        },
      ],
    })
    expect(res.status).toBe(422)
  })

  it('duas chamadas com mesmo Idempotency-Key e mesmo corpo → segunda é noop', async () => {
    const cid = await createConveyor()
    const detail = await getDetail(cid)
    const body = bodyFromSingleStepDetail(detail, { stepTitulo: 'Etapa idempotente' })
    const key = randomUUID()

    const first = await patchStructure(cid, body, key)
    expect(first.status).toBe(200)
    expect(first.body.meta.structureUpdateIdempotent).toBe(false)

    const second = await patchStructure(cid, body, key)
    expect(second.status).toBe(200)
    expect(second.body.meta.structureUpdateIdempotent).toBe(true)

    const rows = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM conveyor_nodes WHERE conveyor_id = $1::uuid AND deleted_at IS NULL`,
      [cid],
    )
    expect(Number(rows.rows[0]?.n)).toBe(3) // OPTION + AREA + STEP, sem duplicar
  })

  it('item incluído via late append em esteira EM_ANDAMENTO continua elegível ao backlog após PATCH structure', async () => {
    const cid = await createConveyor()
    await setConveyorProductionStatusForIntegration(pool, cid, 'EM_ANDAMENTO')

    const appendRes = await request(app)
      .post(`/api/v1/conveyors/${cid}/structure/items`)
      .set('Cookie', await cookie())
      .set('Idempotency-Key', randomUUID())
      .send({
        appendKind: 'OPTION',
        reason: 'Necessidade operacional emergencial',
        originType: 'MANUAL',
        matrixRootItemId: null,
        option: {
          titulo: 'Item tardio',
          orderIndex: 1,
          sourceOrigin: 'manual',
          areas: [
            {
              titulo: 'Setor tardio',
              orderIndex: 1,
              sourceOrigin: 'manual',
              steps: [
                { titulo: 'Atividade tardia', orderIndex: 1, plannedMinutes: 45, sourceOrigin: 'manual', required: true },
              ],
            },
          ],
        },
      })
    expect(appendRes.status).toBe(200)
    const lateStepId = appendRes.body.meta.addedStepIds[0] as string

    const detail = await getDetail(cid)
    // Duas OPTIONs agora: a original + a incluída tardiamente. Ambas devem ser
    // referenciadas por `id` (UPDATE) para permanecerem ativas — omitir a
    // tardia a removeria (soft-delete), o que não é o que este teste quer provar.
    const originalOption = detail.structure.options.find(
      (o: { id: string }) => o.id !== appendRes.body.meta.addedOptionId,
    )
    const lateOption = detail.structure.options.find(
      (o: { id: string }) => o.id === appendRes.body.meta.addedOptionId,
    )
    expect(originalOption).toBeTruthy()
    expect(lateOption).toBeTruthy()

    const body = {
      originType: 'MANUAL' as const,
      baseId: null,
      baseCode: null,
      baseName: null,
      baseVersion: null,
      matrixRootItemId: null,
      options: [
        {
          id: originalOption.id,
          titulo: 'Etapa original renomeada (opção)',
          orderIndex: originalOption.orderIndex,
          sourceOrigin: 'manual' as const,
          areas: originalOption.areas.map(
            (ar: { id: string; name: string; orderIndex: number; steps: Array<{ id: string; name: string; orderIndex: number; plannedMinutes: number | null }> }) => ({
              id: ar.id,
              titulo: ar.name,
              orderIndex: ar.orderIndex,
              sourceOrigin: 'manual' as const,
              steps: ar.steps.map((st) => ({
                id: st.id,
                titulo: 'Etapa original renomeada',
                orderIndex: st.orderIndex,
                plannedMinutes: st.plannedMinutes ?? 0,
                sourceOrigin: 'manual' as const,
                required: true,
              })),
            }),
          ),
        },
        {
          id: lateOption.id,
          titulo: lateOption.name,
          orderIndex: lateOption.orderIndex,
          sourceOrigin: 'manual' as const,
          areas: lateOption.areas.map(
            (ar: { id: string; name: string; orderIndex: number; steps: Array<{ id: string; name: string; orderIndex: number; plannedMinutes: number | null }> }) => ({
              id: ar.id,
              titulo: ar.name,
              orderIndex: ar.orderIndex,
              sourceOrigin: 'manual' as const,
              steps: ar.steps.map((st) => ({
                id: st.id,
                titulo: st.name,
                orderIndex: st.orderIndex,
                plannedMinutes: st.plannedMinutes ?? 0,
                sourceOrigin: 'manual' as const,
                required: true,
              })),
            }),
          ),
        },
      ],
    }
    const patchRes = await patchStructure(cid, body)
    expect(patchRes.status).toBe(200)

    const lateStepRow = await pool.query<{
      metadata_json: Record<string, unknown>
      deleted_at: Date | null
      operational_status: string
    }>(
      `SELECT metadata_json, deleted_at, operational_status FROM conveyor_nodes WHERE id = $1::uuid`,
      [lateStepId],
    )
    expect(lateStepRow.rows[0]?.deleted_at).toBeNull()
    expect(lateStepRow.rows[0]?.metadata_json?.lateAddToWeeklyBacklog).toBe(true)
    expect(lateStepRow.rows[0]?.operational_status).toBe('PENDING')

    const backlog = await serviceListOperationalPlanningBacklog(pool, {
      q: null,
      limit: 200,
      conveyorId: cid,
      collaboratorId: null,
    })
    expect(backlog.items.some((i) => i.activityNodeId === lateStepId)).toBe(true)
  })
})
