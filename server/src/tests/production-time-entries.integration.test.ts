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
import { serviceCreateConveyor } from '../modules/conveyors/conveyors.service.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'
import { serviceCreateConveyorNodeAssignee } from '../modules/conveyors/conveyorAssignments.service.js'
import {
  insertConveyorTimeEntry,
  newAssignmentId,
} from '../modules/conveyors/conveyorAssignments.repository.js'
import {
  productionSessionCookie,
  seedProductionPinForCollaborator,
  SEED_COLLABORATOR_MARIA_ID,
} from './productionTestHelpers.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'
import { setConveyorProductionStatusForIntegration, seedOperationalWorkPlanItemsForSteps } from './integrationConveyorFixtures.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import { mondayOfWeekContaining } from '../modules/operational-planning/operational-planning.week.js'
import { serviceAnalyzeConveyorActivitySequence } from '../modules/conveyors/conveyorActivitySequence.service.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const SEED_ROLE_ID = '22222222-2222-2222-2222-222222222222'
const SEED_SECTOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const TE_UNASSIGNED_COLLAB_ID = 'cccccccc-0000-0000-0000-000000000001'
const TE_PLANNED_COLLAB_ID = 'cccccccc-0000-0000-0000-000000000003'
const TE_PRIMARY_COLLAB_ID = 'cccccccc-0000-0000-0000-000000000004'
const TE_ADMIN_USER_ID = 'cccccccc-0000-0000-0000-000000000002'
const TE_ADMIN_EMAIL = 'te-production-test@sgp-argos.local'

function minimalConveyorBody(nome: string): PostConveyorBody {
  return {
    dados: {
      nome,
      cliente: 'C-Prod-TE',
      veiculo: 'V-Prod-TE',
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
        titulo: 'Opção Prod',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'Área Prod',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: [
              {
                titulo: 'Etapa Prod',
                orderIndex: 1,
                plannedMinutes: 60,
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

async function firstStepId(
  pool: ReturnType<typeof getPool>,
  conveyorId: string,
): Promise<string> {
  const r = await pool.query<{ id: string }>(
    `SELECT id FROM conveyor_nodes
     WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
     ORDER BY order_index, id LIMIT 1`,
    [conveyorId],
  )
  const row = r.rows[0]
  if (!row) throw new Error('STEP não encontrado')
  return row.id
}

async function setWorkPlanPlannedMinutesForStep(
  pool: ReturnType<typeof getPool>,
  conveyorId: string,
  stepId: string,
  collaboratorId: string,
  plannedMinutes: number,
): Promise<void> {
  await pool.query(
    `
    UPDATE operational_work_plan_items i
    SET planned_minutes = $4::int
    FROM operational_work_plans p
    WHERE i.work_plan_id = p.id
      AND p.status = 'PUBLISHED'
      AND p.deleted_at IS NULL
      AND i.deleted_at IS NULL
      AND i.conveyor_id = $1::uuid
      AND i.activity_node_id = $2::uuid
      AND i.assigned_collaborator_id = $3::uuid
    `,
    [conveyorId, stepId, collaboratorId, plannedMinutes],
  )
}

async function planningJustificationId(pool: ReturnType<typeof getPool>): Promise<string> {
  const r = await pool.query<{ id: string }>(
    `SELECT id::text FROM operational_time_entry_justifications
     WHERE category = 'PLANNING' AND is_active = true
     ORDER BY sort_order
     LIMIT 1`,
  )
  const id = r.rows[0]?.id
  if (!id) throw new Error('justificativa PLANNING não encontrada')
  return id
}

async function seedExcessTimeFixture(
  pool: ReturnType<typeof getPool>,
  suffix: string,
  input: {
    plannedMinutes: number
    priorRealizedMinutes?: number
  },
): Promise<{ conv: { id: string }; stepId: string; assigneeId: string }> {
  const conv = await serviceCreateConveyor(pool, minimalConveyorBody(`TE-EXCESS-${suffix}`))
  await setConveyorProductionStatusForIntegration(pool, conv.id)
  const stepId = await firstStepId(pool, conv.id)
  const assignee = await serviceCreateConveyorNodeAssignee(pool, {
    conveyorId: conv.id,
    conveyorNodeId: stepId,
    collaboratorId: SEED_COLLABORATOR_MARIA_ID,
    isPrimary: true,
  })
  await seedOperationalWorkPlanItemsForSteps(pool, {
    createdByUserId: TE_ADMIN_USER_ID,
    conveyorId: conv.id,
    steps: [{ activityNodeId: stepId, collaboratorId: SEED_COLLABORATOR_MARIA_ID }],
  })
  await setWorkPlanPlannedMinutesForStep(
    pool,
    conv.id,
    stepId,
    SEED_COLLABORATOR_MARIA_ID,
    input.plannedMinutes,
  )
  if (input.priorRealizedMinutes && input.priorRealizedMinutes > 0) {
    await insertConveyorTimeEntry(pool, {
      id: newAssignmentId(),
      conveyor_id: conv.id,
      conveyor_node_id: stepId,
      collaborator_id: SEED_COLLABORATOR_MARIA_ID,
      conveyor_node_assignee_id: assignee.id,
      entry_at: new Date(),
      minutes: input.priorRealizedMinutes,
      executed_quantity: null,
      notes: null,
      entry_mode: 'manual',
      metadata_json: { accessChannel: 'PRODUCTION_AVATAR_PIN' },
      entry_origin: 'ASSIGNED',
      exception_justification: null,
      is_out_of_sequence: false,
      out_of_sequence_justification: null,
      session_completion_pct: null,
      mark_as_done: false,
    })
  }
  return { conv, stepId, assigneeId: assignee.id }
}

describe.skipIf(!hasDb)('production time entries (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let env: ReturnType<typeof loadEnv>
  let adminCookie: string

  let conveyorId: string
  let assignedStepId: string
  let unassignedStepId: string

  beforeAll(async () => {
    env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)

    await ensureMariaCollaboratorSeedForIntegration(pool)

    await pool.query(
      `
      INSERT INTO collaborators (id, code, full_name, email, sector_id, role_id, status, is_active)
      VALUES ($1::uuid, 'COL-TE-UNASSIGNED', 'Colab TE Unassigned', 'te-unassigned@sgp.local',
              $2::uuid, $3::uuid, 'ACTIVE', true)
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        status = EXCLUDED.status,
        is_active = EXCLUDED.is_active,
        deleted_at = NULL
      `,
      [TE_UNASSIGNED_COLLAB_ID, SEED_SECTOR_ID, SEED_ROLE_ID],
    )

    for (const [id, code, email, name] of [
      [TE_PLANNED_COLLAB_ID, 'COL-TE-PLANNED', 'te-planned@sgp.local', 'Colab TE Planejado'],
      [TE_PRIMARY_COLLAB_ID, 'COL-TE-PRIMARY', 'te-primary@sgp.local', 'Colab TE Principal'],
    ] as const) {
      await pool.query(
        `
        INSERT INTO collaborators (id, code, full_name, email, sector_id, role_id, status, is_active)
        VALUES ($1::uuid, $2, $3, $4, $5::uuid, $6::uuid, 'ACTIVE', true)
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          status = EXCLUDED.status,
          is_active = EXCLUDED.is_active,
          deleted_at = NULL
        `,
        [id, code, name, email, SEED_SECTOR_ID, SEED_ROLE_ID],
      )
    }

    await seedProductionPinForCollaborator(pool, SEED_COLLABORATOR_MARIA_ID, '2468', true)
    await seedProductionPinForCollaborator(pool, TE_UNASSIGNED_COLLAB_ID, '1111', true)
    await seedProductionPinForCollaborator(pool, TE_PLANNED_COLLAB_ID, '3333', true)
    await seedProductionPinForCollaborator(pool, TE_PRIMARY_COLLAB_ID, '4444', true)

    const { hashPassword } = await import('../shared/password/password.js')
    const hash = await hashPassword('AdminTE1!')
    await pool.query(
      `
      INSERT INTO app_users (id, email, password_hash, is_active, role_id, must_change_password, password_changed_at)
      VALUES ($1::uuid, $2, $3, true, $4::uuid, false, now())
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        is_active = true
      `,
      [TE_ADMIN_USER_ID, TE_ADMIN_EMAIL, hash, SEED_ROLE_ID],
    )
    adminCookie = await sessionCookieForUser(pool, TE_ADMIN_USER_ID, TE_ADMIN_EMAIL)

    // Criar esteira com dois STEPs: um atribuído à Maria, um sem atribuição
    const conveyorWithTwo: PostConveyorBody = {
      dados: {
        nome: `TE-Prod-${Date.now()}`,
        cliente: 'C-TE',
        veiculo: 'V-TE',
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
          titulo: 'Opção TE',
          orderIndex: 1,
          sourceOrigin: 'manual',
          areas: [
            {
              titulo: 'Área TE',
              orderIndex: 1,
              sourceOrigin: 'manual',
              steps: [
                {
                  titulo: 'Etapa Atribuída',
                  orderIndex: 1,
                  plannedMinutes: 60,
                  sourceOrigin: 'manual',
                  required: true,
                },
                {
                  titulo: 'Etapa Sem Atribuição',
                  orderIndex: 2,
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
    const conv = await serviceCreateConveyor(pool, conveyorWithTwo)
    conveyorId = conv.id
    await setConveyorProductionStatusForIntegration(pool, conveyorId)

    const steps = await pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM conveyor_nodes
       WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
       ORDER BY order_index`,
      [conveyorId],
    )
    assignedStepId = steps.rows[0]!.id
    unassignedStepId = steps.rows[1]!.id

    await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId,
      conveyorNodeId: assignedStepId,
      collaboratorId: SEED_COLLABORATOR_MARIA_ID,
      isPrimary: true,
    })
  })

  afterAll(async () => {
    await closePool()
  })

  describe('POST /api/v1/production/time-entries — autenticação', () => {
    it('sem cookie → 401', async () => {
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .send({ conveyorId, stepNodeId: assignedStepId, minutes: 30 })
      expect(res.status).toBe(401)
    })

    it('com cookie admin apenas → 401', async () => {
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', adminCookie)
        .send({ conveyorId, stepNodeId: assignedStepId, minutes: 30 })
      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/v1/production/time-entries — apontamento normal', () => {
    it('com cookie production válido + alocação → 201', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({ conveyorId, stepNodeId: assignedStepId, minutes: 45 })
      expect(res.status).toBe(201)
      const data = res.body.data as Record<string, unknown>
      expect(data).toHaveProperty('id')
      expect(data.minutes).toBe(45)
    })

    it('collaborator_id gravado é o da sessão production', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({ conveyorId, stepNodeId: assignedStepId, minutes: 10 })
      expect(res.status).toBe(201)

      const data = res.body.data as Record<string, unknown>
      const entryId = data.id as string
      const row = await pool.query<{ collaborator_id: string; entry_origin: string; metadata_json: unknown }>(
        `SELECT collaborator_id::text, entry_origin, metadata_json
         FROM conveyor_time_entries WHERE id = $1::uuid`,
        [entryId],
      )
      expect(row.rows[0]?.collaborator_id).toBe(SEED_COLLABORATOR_MARIA_ID)
      expect(row.rows[0]?.entry_origin).toBe('ASSIGNED')
    })

    it('accessChannel PRODUCTION_AVATAR_PIN gravado em metadata_json', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({ conveyorId, stepNodeId: assignedStepId, minutes: 5 })
      expect(res.status).toBe(201)

      const entryId = (res.body.data as Record<string, unknown>).id as string
      const row = await pool.query<{ metadata_json: { accessChannel?: string } }>(
        `SELECT metadata_json FROM conveyor_time_entries WHERE id = $1::uuid`,
        [entryId],
      )
      expect(row.rows[0]?.metadata_json?.accessChannel).toBe('PRODUCTION_AVATAR_PIN')
    })

    it('não permite minutes=0 sem markAsDone', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({ conveyorId, stepNodeId: assignedStepId, minutes: 0 })
      expect(res.status).toBe(422)
    })

    it('não permite minutes negativo', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({ conveyorId, stepNodeId: assignedStepId, minutes: -5 })
      expect(res.status).toBe(422)
    })

    it('permite minutes=0 quando markAsDone=true e conclui STEP', async () => {
      const conv = await serviceCreateConveyor(
        pool,
        minimalConveyorBody(`TE-ZERO-DONE-${Date.now()}`),
      )
      await setConveyorProductionStatusForIntegration(pool, conv.id)
      const stepId = await firstStepId(pool, conv.id)
      await serviceCreateConveyorNodeAssignee(pool, {
        conveyorId: conv.id,
        conveyorNodeId: stepId,
        collaboratorId: SEED_COLLABORATOR_MARIA_ID,
        isPrimary: true,
      })
      await seedOperationalWorkPlanItemsForSteps(pool, {
        createdByUserId: TE_ADMIN_USER_ID,
        conveyorId: conv.id,
        steps: [{ activityNodeId: stepId, collaboratorId: SEED_COLLABORATOR_MARIA_ID }],
      })

      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({
          conveyorId: conv.id,
          stepNodeId: stepId,
          minutes: 0,
          markAsDone: true,
        })
      expect(res.status).toBe(201)
      expect((res.body.data as { minutes: number }).minutes).toBe(0)

      const st = await pool.query<{ operational_status: string | null }>(
        `SELECT operational_status FROM conveyor_nodes WHERE id = $1::uuid`,
        [stepId],
      )
      expect(st.rows[0]?.operational_status).toBe('COMPLETED')
    })

    it('completion-only audita conclusão em evento operacional sem conveyor_time_entries', async () => {
      const conv = await serviceCreateConveyor(
        pool,
        minimalConveyorBody(`TE-COMPLETION-ONLY-AUDIT-${Date.now()}`),
      )
      await setConveyorProductionStatusForIntegration(pool, conv.id)
      const stepId = await firstStepId(pool, conv.id)
      await serviceCreateConveyorNodeAssignee(pool, {
        conveyorId: conv.id,
        conveyorNodeId: stepId,
        collaboratorId: SEED_COLLABORATOR_MARIA_ID,
        isPrimary: true,
      })
      await seedOperationalWorkPlanItemsForSteps(pool, {
        createdByUserId: TE_ADMIN_USER_ID,
        conveyorId: conv.id,
        steps: [{ activityNodeId: stepId, collaboratorId: SEED_COLLABORATOR_MARIA_ID }],
      })

      const beforeCount = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM conveyor_time_entries
         WHERE conveyor_node_id = $1::uuid AND deleted_at IS NULL`,
        [stepId],
      )
      const beforeEntries = Number(beforeCount.rows[0]?.count ?? 0)

      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({
          conveyorId: conv.id,
          stepNodeId: stepId,
          minutes: 0,
          markAsDone: true,
        })
      expect(res.status).toBe(201)

      const syntheticId = (res.body.data as { id: string }).id
      const stepStatus = await pool.query<{ operational_status: string | null }>(
        `SELECT operational_status FROM conveyor_nodes WHERE id = $1::uuid`,
        [stepId],
      )
      expect(stepStatus.rows[0]?.operational_status).toBe('COMPLETED')

      const persistedEntry = await pool.query<{ id: string }>(
        `SELECT id::text FROM conveyor_time_entries WHERE id = $1::uuid`,
        [syntheticId],
      )
      expect(persistedEntry.rows).toHaveLength(0)

      const afterCount = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM conveyor_time_entries
         WHERE conveyor_node_id = $1::uuid AND deleted_at IS NULL`,
        [stepId],
      )
      expect(Number(afterCount.rows[0]?.count ?? 0)).toBe(beforeEntries)

      const event = await pool.query<{
        event_type: string
        metadata_json: {
          productionCollaboratorId?: string
          accessChannel?: string
          trigger?: string
        }
      }>(
        `
        SELECT event_type, metadata_json
        FROM conveyor_operational_events
        WHERE conveyor_id = $1::uuid
          AND node_id = $2::uuid
          AND event_type = 'CONVEYOR_STEP_COMPLETED'
        ORDER BY occurred_at DESC
        LIMIT 1
        `,
        [conv.id, stepId],
      )
      expect(event.rows[0]?.event_type).toBe('CONVEYOR_STEP_COMPLETED')
      expect(event.rows[0]?.metadata_json?.productionCollaboratorId).toBe(
        SEED_COLLABORATOR_MARIA_ID,
      )
      expect(event.rows[0]?.metadata_json?.accessChannel).toBe('PRODUCTION_AVATAR_PIN')
      expect(event.rows[0]?.metadata_json?.trigger).toBe('PRODUCTION_MARK_AS_DONE')
    })

    it('não permite colaborador não alocado nesta sprint', async () => {
      const cookie = productionSessionCookie(TE_UNASSIGNED_COLLAB_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({ conveyorId, stepNodeId: assignedStepId, minutes: 30 })
      expect(res.status).toBe(422)
      expect(res.body.error?.code).toBe(ErrorCodes.TIME_ENTRY_UNASSIGNED_REQUIRES_JUSTIFICATION)
    })

    it('step sem alocação → 422 para colaborador não alocado', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const conv = await serviceCreateConveyor(pool, {
        ...minimalConveyorBody(`TE-Unassigned-${Date.now()}`),
        options: [
          {
            titulo: 'Opção UE',
            orderIndex: 1,
            sourceOrigin: 'manual',
            areas: [
              {
                titulo: 'Área UE',
                orderIndex: 1,
                sourceOrigin: 'manual',
                steps: [
                  {
                    titulo: 'Etapa Atribuída UE',
                    orderIndex: 1,
                    plannedMinutes: 60,
                    sourceOrigin: 'manual',
                    required: true,
                  },
                  {
                    titulo: 'Etapa Sem Atribuição UE',
                    orderIndex: 2,
                    plannedMinutes: 30,
                    sourceOrigin: 'manual',
                    required: true,
                  },
                ],
              },
            ],
          },
        ],
      })
      await setConveyorProductionStatusForIntegration(pool, conv.id)
      const steps = await pool.query<{ id: string; name: string }>(
        `SELECT id, name FROM conveyor_nodes
         WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
         ORDER BY order_index`,
        [conv.id],
      )
      const assigned = steps.rows[0]!.id
      const unassigned = steps.rows[1]!.id
      await serviceCreateConveyorNodeAssignee(pool, {
        conveyorId: conv.id,
        conveyorNodeId: assigned,
        collaboratorId: SEED_COLLABORATOR_MARIA_ID,
        isPrimary: true,
      })

      await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({
          conveyorId: conv.id,
          stepNodeId: assigned,
          minutes: 5,
          markAsDone: true,
        })

      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({ conveyorId: conv.id, stepNodeId: unassigned, minutes: 20 })
      expect(res.status).toBe(422)
      expect(res.body.error?.code).toBe(ErrorCodes.TIME_ENTRY_UNASSIGNED_REQUIRES_JUSTIFICATION)
    })

    it('step fora da esteira informada → 422', async () => {
      // Criar outra esteira para ter um stepId de outra esteira
      const otherConv = await serviceCreateConveyor(pool, minimalConveyorBody(`Other-${Date.now()}`))
      const otherStep = await firstStepId(pool, otherConv.id)

      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({ conveyorId, stepNodeId: otherStep, minutes: 30 })
      expect(res.status).toBe(422)
    })

    it('não exige RBAC admin', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({ conveyorId, stepNodeId: assignedStepId, minutes: 1 })
      expect(res.status).toBe(201)
    })

    it('endpoint admin conveyor time-entries não é afetado', async () => {
      // Verifica apenas que a rota admin ainda responde (sem alocação → 422, não 404 ou 500)
      const res = await request(app)
        .post(`/api/v1/conveyors/${conveyorId}/steps/${assignedStepId}/time-entries`)
        .set('Cookie', adminCookie)
        .send({ minutes: 10 })
      // Admin sem alocação → 422 TIME_ENTRY_UNASSIGNED ou 422 sem collaborador
      expect([200, 201, 422]).toContain(res.status)
    })
  })

  describe('POST /api/v1/production/time-entries — plano publicado vs principal', () => {
    it('colaborador do plano diferente do principal aponta com assignee não principal', async () => {
      const conv = await serviceCreateConveyor(
        pool,
        minimalConveyorBody(`TE-Plan-Primary-${Date.now()}`),
      )
      await setConveyorProductionStatusForIntegration(pool, conv.id)
      const stepId = await firstStepId(pool, conv.id)

      await serviceCreateConveyorNodeAssignee(pool, {
        conveyorId: conv.id,
        conveyorNodeId: stepId,
        collaboratorId: TE_PRIMARY_COLLAB_ID,
        isPrimary: true,
      })

      const today = new Date()
      const todayIso = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0'),
      ].join('-')
      const weekStart = mondayOfWeekContaining(todayIso)

      await pool.query(
        `DELETE FROM operational_work_plan_items
         WHERE work_plan_id IN (
           SELECT id FROM operational_work_plans WHERE week_start_date = $1::date
         )`,
        [weekStart],
      )
      await pool.query(
        `DELETE FROM operational_work_plans WHERE week_start_date = $1::date`,
        [weekStart],
      )

      const plan = await pool.query<{ id: string }>(
        `
        INSERT INTO operational_work_plans (
          week_start_date, week_end_date, status, created_by, published_at
        ) VALUES ($2::date, ($2::date + 6), 'PUBLISHED', $1::uuid, now())
        RETURNING id::text
        `,
        [TE_ADMIN_USER_ID, weekStart],
      )
      const planId = plan.rows[0]?.id
      if (!planId) throw new Error('plano não criado')

      await pool.query(
        `
        INSERT INTO operational_work_plan_items (
          work_plan_id, conveyor_id, activity_node_id, assigned_collaborator_id,
          planned_date, planned_order, status
        ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::date, 1, 'PLANNED')
        `,
        [planId, conv.id, stepId, TE_PLANNED_COLLAB_ID, todayIso],
      )

      const cookie = productionSessionCookie(TE_PLANNED_COLLAB_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({ conveyorId: conv.id, stepNodeId: stepId, minutes: 25, executedQuantity: 2 })
      expect(res.status).toBe(201)

      const assignees = await pool.query<{
        id: string
        collaborator_id: string
        is_primary: boolean
        metadata_json: { source?: string } | null
      }>(
        `
        SELECT id::text, collaborator_id::text, is_primary, metadata_json
        FROM conveyor_node_assignees
        WHERE conveyor_node_id = $1::uuid AND deleted_at IS NULL
        ORDER BY is_primary DESC, order_index
        `,
        [stepId],
      )
      expect(assignees.rows.some((r) => r.collaborator_id === TE_PRIMARY_COLLAB_ID && r.is_primary)).toBe(
        true,
      )
      const plannedAssignee = assignees.rows.find(
        (r) => r.collaborator_id === TE_PLANNED_COLLAB_ID,
      )
      expect(plannedAssignee).toBeDefined()
      expect(plannedAssignee?.is_primary).toBe(false)
      expect(plannedAssignee?.metadata_json?.source).toBe('production_published_plan')

      const entryId = (res.body.data as Record<string, unknown>).id as string
      const entry = await pool.query<{
        collaborator_id: string
        executed_quantity: number | null
        conveyor_node_assignee_id: string
      }>(
        `SELECT collaborator_id::text, executed_quantity, conveyor_node_assignee_id::text
         FROM conveyor_time_entries WHERE id = $1::uuid`,
        [entryId],
      )
      expect(entry.rows[0]?.collaborator_id).toBe(TE_PLANNED_COLLAB_ID)
      expect(entry.rows[0]?.executed_quantity).toBe(2)
      expect(entry.rows[0]?.conveyor_node_assignee_id).toBe(plannedAssignee?.id ?? null)
    })

    it('fora de sequência sem justificativa → 422', async () => {
      const conv = await serviceCreateConveyor(pool, {
        ...minimalConveyorBody(`TE-OOS-${Date.now()}`),
        options: [
          {
            titulo: 'Opção OOS',
            orderIndex: 1,
            sourceOrigin: 'manual',
            areas: [
              {
                titulo: 'Área OOS',
                orderIndex: 1,
                sourceOrigin: 'manual',
                steps: [
                  {
                    titulo: 'Primeira',
                    orderIndex: 1,
                    plannedMinutes: 30,
                    sourceOrigin: 'manual',
                    required: true,
                  },
                  {
                    titulo: 'Segunda',
                    orderIndex: 2,
                    plannedMinutes: 30,
                    sourceOrigin: 'manual',
                    required: true,
                  },
                ],
              },
            ],
          },
        ],
      })
      await setConveyorProductionStatusForIntegration(pool, conv.id)
      const steps = await pool.query<{ id: string }>(
        `SELECT id FROM conveyor_nodes
         WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
         ORDER BY order_index`,
        [conv.id],
      )
      const firstStep = steps.rows[0]!.id
      const secondStep = steps.rows[1]!.id

      await serviceCreateConveyorNodeAssignee(pool, {
        conveyorId: conv.id,
        conveyorNodeId: firstStep,
        collaboratorId: SEED_COLLABORATOR_MARIA_ID,
        isPrimary: true,
      })
      await serviceCreateConveyorNodeAssignee(pool, {
        conveyorId: conv.id,
        conveyorNodeId: secondStep,
        collaboratorId: SEED_COLLABORATOR_MARIA_ID,
        isPrimary: true,
      })

      await seedOperationalWorkPlanItemsForSteps(pool, {
        createdByUserId: TE_ADMIN_USER_ID,
        conveyorId: conv.id,
        steps: [
          { activityNodeId: firstStep, collaboratorId: SEED_COLLABORATOR_MARIA_ID },
          { activityNodeId: secondStep, collaboratorId: SEED_COLLABORATOR_MARIA_ID },
        ],
      })

      const seq = await serviceAnalyzeConveyorActivitySequence(
        pool,
        conv.id,
        secondStep,
        SEED_COLLABORATOR_MARIA_ID,
      )
      expect(seq.isOutOfSequence).toBe(true)

      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({ conveyorId: conv.id, stepNodeId: secondStep, minutes: 10 })
      expect(res.status).toBe(422)
      expect(res.body.error?.code).toBe(
        ErrorCodes.TIME_ENTRY_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION,
      )
    })

    it('fora de sequência com justificativa → 201 e persiste justificativa', async () => {
      const conv = await serviceCreateConveyor(pool, {
        ...minimalConveyorBody(`TE-OOS-OK-${Date.now()}`),
        options: [
          {
            titulo: 'Opção OOS OK',
            orderIndex: 1,
            sourceOrigin: 'manual',
            areas: [
              {
                titulo: 'Área',
                orderIndex: 1,
                sourceOrigin: 'manual',
                steps: [
                  {
                    titulo: 'Primeira',
                    orderIndex: 1,
                    plannedMinutes: 30,
                    sourceOrigin: 'manual',
                    required: true,
                  },
                  {
                    titulo: 'Segunda',
                    orderIndex: 2,
                    plannedMinutes: 30,
                    sourceOrigin: 'manual',
                    required: true,
                  },
                ],
              },
            ],
          },
        ],
      })
      await setConveyorProductionStatusForIntegration(pool, conv.id)
      const steps = await pool.query<{ id: string }>(
        `SELECT id FROM conveyor_nodes
         WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
         ORDER BY order_index`,
        [conv.id],
      )
      const secondStep = steps.rows[1]!.id

      await serviceCreateConveyorNodeAssignee(pool, {
        conveyorId: conv.id,
        conveyorNodeId: steps.rows[0]!.id,
        collaboratorId: SEED_COLLABORATOR_MARIA_ID,
        isPrimary: true,
      })
      await serviceCreateConveyorNodeAssignee(pool, {
        conveyorId: conv.id,
        conveyorNodeId: secondStep,
        collaboratorId: SEED_COLLABORATOR_MARIA_ID,
        isPrimary: true,
      })

      await seedOperationalWorkPlanItemsForSteps(pool, {
        createdByUserId: TE_ADMIN_USER_ID,
        conveyorId: conv.id,
        steps: [
          { activityNodeId: steps.rows[0]!.id, collaboratorId: SEED_COLLABORATOR_MARIA_ID },
          { activityNodeId: secondStep, collaboratorId: SEED_COLLABORATOR_MARIA_ID },
        ],
      })

      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({
          conveyorId: conv.id,
          stepNodeId: secondStep,
          minutes: 10,
          outOfSequenceJustification: 'Autorizado pelo gestor.',
        })
      expect(res.status).toBe(201)

      const entryId = (res.body.data as Record<string, unknown>).id as string
      const row = await pool.query<{
        is_out_of_sequence: boolean
        out_of_sequence_justification: string | null
      }>(
        `SELECT is_out_of_sequence, out_of_sequence_justification
         FROM conveyor_time_entries WHERE id = $1::uuid`,
        [entryId],
      )
      expect(row.rows[0]?.is_out_of_sequence).toBe(true)
      expect(row.rows[0]?.out_of_sequence_justification).toBe('Autorizado pelo gestor.')
    })
  })

  describe('POST /api/v1/production/time-entries — markAsDone conclui STEP', () => {
    it('markAsDone=false não altera operational_status', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({ conveyorId, stepNodeId: assignedStepId, minutes: 5, markAsDone: false })

      const st = await pool.query<{ operational_status: string | null }>(
        `SELECT operational_status FROM conveyor_nodes WHERE id = $1::uuid`,
        [assignedStepId],
      )
      expect(st.rows[0]?.operational_status).not.toBe('COMPLETED')
    })

    it('markAsDone=true define operational_status COMPLETED', async () => {
      const conv = await serviceCreateConveyor(pool, minimalConveyorBody(`TE-DONE-${Date.now()}`))
      await setConveyorProductionStatusForIntegration(pool, conv.id)
      const stepId = await firstStepId(pool, conv.id)

      await serviceCreateConveyorNodeAssignee(pool, {
        conveyorId: conv.id,
        conveyorNodeId: stepId,
        collaboratorId: SEED_COLLABORATOR_MARIA_ID,
        isPrimary: true,
      })

      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({
          conveyorId: conv.id,
          stepNodeId: stepId,
          minutes: 15,
          markAsDone: true,
          sessionCompletionPct: 100,
        })
      expect(res.status).toBe(201)

      const st = await pool.query<{ operational_status: string | null; mark_as_done: boolean }>(
        `
        SELECT cn.operational_status, te.mark_as_done
        FROM conveyor_nodes cn
        JOIN conveyor_time_entries te ON te.conveyor_node_id = cn.id
        WHERE cn.id = $1::uuid
        ORDER BY te.created_at DESC LIMIT 1
        `,
        [stepId],
      )
      expect(st.rows[0]?.operational_status).toBe('COMPLETED')
      expect(st.rows[0]?.mark_as_done).toBe(true)
    })

    it('após concluir primeira, segunda deixa de ser fora de sequência', async () => {
      const conv = await serviceCreateConveyor(pool, {
        ...minimalConveyorBody(`TE-SEQ-${Date.now()}`),
        options: [
          {
            titulo: 'Op',
            orderIndex: 1,
            sourceOrigin: 'manual',
            areas: [
              {
                titulo: 'Ar',
                orderIndex: 1,
                sourceOrigin: 'manual',
                steps: [
                  {
                    titulo: 'A1',
                    orderIndex: 1,
                    plannedMinutes: 15,
                    sourceOrigin: 'manual',
                    required: true,
                  },
                  {
                    titulo: 'A2',
                    orderIndex: 2,
                    plannedMinutes: 15,
                    sourceOrigin: 'manual',
                    required: true,
                  },
                ],
              },
            ],
          },
        ],
      })
      await setConveyorProductionStatusForIntegration(pool, conv.id)
      const steps = await pool.query<{ id: string }>(
        `SELECT id FROM conveyor_nodes
         WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
         ORDER BY order_index`,
        [conv.id],
      )
      const first = steps.rows[0]!.id
      const second = steps.rows[1]!.id

      for (const sid of [first, second]) {
        await serviceCreateConveyorNodeAssignee(pool, {
          conveyorId: conv.id,
          conveyorNodeId: sid,
          collaboratorId: SEED_COLLABORATOR_MARIA_ID,
          isPrimary: true,
        })
      }

      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({ conveyorId: conv.id, stepNodeId: first, minutes: 15, markAsDone: true })

      const seq = await serviceAnalyzeConveyorActivitySequence(pool, conv.id, second)
      expect(seq.isOutOfSequence).toBe(false)
    })
  })

  describe('POST /api/v1/production/time-entries — step concluído', () => {
    it('não permite apontar em step com status COMPLETED', async () => {
      // Criar esteira, alocar Maria, marcar step como COMPLETED
      const conv = await serviceCreateConveyor(pool, minimalConveyorBody(`COMPLETED-${Date.now()}`))
      await setConveyorProductionStatusForIntegration(pool, conv.id)
      const stepId = await firstStepId(pool, conv.id)

      await serviceCreateConveyorNodeAssignee(pool, {
        conveyorId: conv.id,
        conveyorNodeId: stepId,
        collaboratorId: SEED_COLLABORATOR_MARIA_ID,
        isPrimary: true,
      })

      await pool.query(
        `UPDATE conveyor_nodes SET operational_status = 'COMPLETED' WHERE id = $1::uuid`,
        [stepId],
      )

      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({ conveyorId: conv.id, stepNodeId: stepId, minutes: 30 })
      expect(res.status).toBe(422)
    })
  })

  describe('GET /api/v1/production/me/work-queue — lastSessionCompletionPct', () => {
    async function workQueueItemForStep(cookie: string, stepId: string) {
      const res = await request(app)
        .get('/api/v1/production/me/work-queue')
        .set('Cookie', cookie)
      expect(res.status).toBe(200)
      const items = (res.body.data as { items: Array<Record<string, unknown>> }).items
      return items.find((i) => i.activityNodeId === stepId)
    }

    async function seedKioskWorkQueueFixture(suffix: string) {
      const conv = await serviceCreateConveyor(pool, minimalConveyorBody(`TE-PCT-${suffix}`))
      await setConveyorProductionStatusForIntegration(pool, conv.id)
      const stepId = await firstStepId(pool, conv.id)
      await serviceCreateConveyorNodeAssignee(pool, {
        conveyorId: conv.id,
        conveyorNodeId: stepId,
        collaboratorId: SEED_COLLABORATOR_MARIA_ID,
        isPrimary: true,
      })
      await seedOperationalWorkPlanItemsForSteps(pool, {
        createdByUserId: TE_ADMIN_USER_ID,
        conveyorId: conv.id,
        steps: [{ activityNodeId: stepId, collaboratorId: SEED_COLLABORATOR_MARIA_ID }],
      })
      return { conv, stepId }
    }

    it('retorna lastSessionCompletionPct após apontamento com evolução', async () => {
      const { conv, stepId } = await seedKioskWorkQueueFixture(`${Date.now()}-50`)
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)

      const post = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({
          conveyorId: conv.id,
          stepNodeId: stepId,
          minutes: 15,
          sessionCompletionPct: 50,
          markAsDone: false,
        })
      expect(post.status).toBe(201)

      const item = await workQueueItemForStep(cookie, stepId)
      expect(item?.lastSessionCompletionPct).toBe(50)
    })

    it('atualiza lastSessionCompletionPct para o último valor registrado', async () => {
      const { conv, stepId } = await seedKioskWorkQueueFixture(`${Date.now()}-70`)
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)

      await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({
          conveyorId: conv.id,
          stepNodeId: stepId,
          minutes: 10,
          sessionCompletionPct: 50,
        })
        .expect(201)

      await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({
          conveyorId: conv.id,
          stepNodeId: stepId,
          minutes: 5,
          sessionCompletionPct: 70,
        })
        .expect(201)

      const item = await workQueueItemForStep(cookie, stepId)
      expect(item?.lastSessionCompletionPct).toBe(70)
    })

    it('apontamento posterior sem sessionCompletionPct não apaga o último percentual', async () => {
      const { conv, stepId } = await seedKioskWorkQueueFixture(`${Date.now()}-null`)
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)

      await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({
          conveyorId: conv.id,
          stepNodeId: stepId,
          minutes: 10,
          sessionCompletionPct: 50,
        })
        .expect(201)

      await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({
          conveyorId: conv.id,
          stepNodeId: stepId,
          minutes: 5,
        })
        .expect(201)

      const item = await workQueueItemForStep(cookie, stepId)
      expect(item?.lastSessionCompletionPct).toBe(50)
    })

    it('não contamina com sessionCompletionPct de outro colaborador', async () => {
      const { conv, stepId } = await seedKioskWorkQueueFixture(`OTHER-${Date.now()}`)
      const mariaCookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)

      await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', mariaCookie)
        .send({
          conveyorId: conv.id,
          stepNodeId: stepId,
          minutes: 10,
          sessionCompletionPct: 50,
        })
        .expect(201)

      const otherAssignee = await serviceCreateConveyorNodeAssignee(pool, {
        conveyorId: conv.id,
        conveyorNodeId: stepId,
        collaboratorId: TE_PLANNED_COLLAB_ID,
        isPrimary: false,
      })

      await insertConveyorTimeEntry(pool, {
        id: newAssignmentId(),
        conveyor_id: conv.id,
        conveyor_node_id: stepId,
        collaborator_id: TE_PLANNED_COLLAB_ID,
        conveyor_node_assignee_id: otherAssignee.id,
        entry_at: new Date(),
        minutes: 10,
        executed_quantity: null,
        notes: null,
        entry_mode: 'manual',
        metadata_json: { accessChannel: 'PRODUCTION_AVATAR_PIN' },
        entry_origin: 'ASSIGNED',
        exception_justification: null,
        is_out_of_sequence: false,
        out_of_sequence_justification: null,
        session_completion_pct: 80,
        mark_as_done: false,
      })

      const mariaItem = await workQueueItemForStep(mariaCookie, stepId)
      expect(mariaItem?.lastSessionCompletionPct).toBe(50)
    })
  })

  describe('POST /api/v1/production/time-entries — excesso de tempo previsto', () => {
    it('POST com realized + minutes > planned sem justificativa retorna 422', async () => {
      const { conv, stepId } = await seedExcessTimeFixture(pool, `${Date.now()}-422`, {
        plannedMinutes: 30,
        priorRealizedMinutes: 20,
      })
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({ conveyorId: conv.id, stepNodeId: stepId, minutes: 15 })
      expect(res.status).toBe(422)
      expect(res.body.error?.code).toBe(
        ErrorCodes.TIME_ENTRY_EXCEEDED_PLANNED_REQUIRES_JUSTIFICATION,
      )
    })

    it('mesmo POST com justificationId válido retorna 201', async () => {
      const { conv, stepId } = await seedExcessTimeFixture(pool, `${Date.now()}-201`, {
        plannedMinutes: 30,
        priorRealizedMinutes: 20,
      })
      const planningId = await planningJustificationId(pool)
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({
          conveyorId: conv.id,
          stepNodeId: stepId,
          minutes: 15,
          justificationId: planningId,
        })
      expect(res.status).toBe(201)
    })

    it('justificativa é persistida em standard_justification_*', async () => {
      const { conv, stepId } = await seedExcessTimeFixture(pool, `${Date.now()}-snap`, {
        plannedMinutes: 30,
        priorRealizedMinutes: 20,
      })
      const planningId = await planningJustificationId(pool)
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({
          conveyorId: conv.id,
          stepNodeId: stepId,
          minutes: 15,
          justificationId: planningId,
        })
      expect(res.status).toBe(201)

      const entryId = (res.body.data as Record<string, unknown>).id as string
      const row = await pool.query<{
        standard_justification_id: string | null
        standard_justification_label_snapshot: string | null
        standard_justification_category_snapshot: string | null
        out_of_sequence_justification: string | null
        is_out_of_sequence: boolean
      }>(
        `SELECT standard_justification_id::text,
                standard_justification_label_snapshot,
                standard_justification_category_snapshot,
                out_of_sequence_justification,
                is_out_of_sequence
         FROM conveyor_time_entries WHERE id = $1::uuid`,
        [entryId],
      )
      expect(row.rows[0]?.standard_justification_id).toBe(planningId)
      expect(row.rows[0]?.standard_justification_label_snapshot).toBeTruthy()
      expect(row.rows[0]?.standard_justification_category_snapshot).toBe('PLANNING')
      expect(row.rows[0]?.is_out_of_sequence).toBe(false)
      expect(row.rows[0]?.out_of_sequence_justification).toBeNull()
    })

    it('minutes=0 + markAsDone=true acima do previsto retorna 201 sem exigir justificativa de excesso', async () => {
      const { conv, stepId } = await seedExcessTimeFixture(pool, `${Date.now()}-done`, {
        plannedMinutes: 30,
        priorRealizedMinutes: 45,
      })
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({
          conveyorId: conv.id,
          stepNodeId: stepId,
          minutes: 0,
          markAsDone: true,
        })
      expect(res.status).toBe(201)
    })

    it('exatamente no previsto não exige justificativa', async () => {
      const { conv, stepId } = await seedExcessTimeFixture(pool, `${Date.now()}-exact`, {
        plannedMinutes: 30,
        priorRealizedMinutes: 20,
      })
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({ conveyorId: conv.id, stepNodeId: stepId, minutes: 10 })
      expect(res.status).toBe(201)
    })

    it('OOS continua exigindo justificativa como antes', async () => {
      const conv = await serviceCreateConveyor(pool, {
        ...minimalConveyorBody(`TE-OOS-EXCESS-${Date.now()}`),
        options: [
          {
            titulo: 'Opção OOS',
            orderIndex: 1,
            sourceOrigin: 'manual',
            areas: [
              {
                titulo: 'Área OOS',
                orderIndex: 1,
                sourceOrigin: 'manual',
                steps: [
                  {
                    titulo: 'Primeira',
                    orderIndex: 1,
                    plannedMinutes: 30,
                    sourceOrigin: 'manual',
                    required: true,
                  },
                  {
                    titulo: 'Segunda',
                    orderIndex: 2,
                    plannedMinutes: 30,
                    sourceOrigin: 'manual',
                    required: true,
                  },
                ],
              },
            ],
          },
        ],
      })
      await setConveyorProductionStatusForIntegration(pool, conv.id)
      const steps = await pool.query<{ id: string }>(
        `SELECT id FROM conveyor_nodes
         WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
         ORDER BY order_index`,
        [conv.id],
      )
      const secondStep = steps.rows[1]!.id

      await serviceCreateConveyorNodeAssignee(pool, {
        conveyorId: conv.id,
        conveyorNodeId: steps.rows[0]!.id,
        collaboratorId: SEED_COLLABORATOR_MARIA_ID,
        isPrimary: true,
      })
      await serviceCreateConveyorNodeAssignee(pool, {
        conveyorId: conv.id,
        conveyorNodeId: secondStep,
        collaboratorId: SEED_COLLABORATOR_MARIA_ID,
        isPrimary: true,
      })
      await seedOperationalWorkPlanItemsForSteps(pool, {
        createdByUserId: TE_ADMIN_USER_ID,
        conveyorId: conv.id,
        steps: [
          { activityNodeId: steps.rows[0]!.id, collaboratorId: SEED_COLLABORATOR_MARIA_ID },
          { activityNodeId: secondStep, collaboratorId: SEED_COLLABORATOR_MARIA_ID },
        ],
      })
      await setWorkPlanPlannedMinutesForStep(
        pool,
        conv.id,
        secondStep,
        SEED_COLLABORATOR_MARIA_ID,
        30,
      )

      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({ conveyorId: conv.id, stepNodeId: secondStep, minutes: 10 })
      expect(res.status).toBe(422)
      expect(res.body.error?.code).toBe(
        ErrorCodes.TIME_ENTRY_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION,
      )
    })
  })
})
