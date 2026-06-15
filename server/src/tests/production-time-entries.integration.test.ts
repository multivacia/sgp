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
  productionSessionCookie,
  seedProductionPinForCollaborator,
  SEED_COLLABORATOR_MARIA_ID,
} from './productionTestHelpers.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'
import { setConveyorProductionStatusForIntegration } from './integrationConveyorFixtures.js'
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

    it('não permite minutes <= 0', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries')
        .set('Cookie', cookie)
        .send({ conveyorId, stepNodeId: assignedStepId, minutes: 0 })
      expect(res.status).toBe(422)
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

      const seq = await serviceAnalyzeConveyorActivitySequence(pool, conv.id, secondStep)
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
})
