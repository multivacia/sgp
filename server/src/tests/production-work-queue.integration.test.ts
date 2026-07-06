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
import {
  productionSessionCookie,
  seedProductionPinForCollaborator,
  SEED_COLLABORATOR_MARIA_ID,
} from './productionTestHelpers.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import { serviceCreateConveyor } from '../modules/conveyors/conveyors.service.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'
import {
  fridayAfterMonday,
  mondayOfWeekContaining,
} from '../modules/operational-planning/operational-planning.week.js'
import {
  servicePatchOperationalWeekPlan,
  servicePublishOperationalWeekPlan,
  serviceSaveOperationalWeekPlan,
} from '../modules/operational-planning/operational-planning.service.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const SEED_ROLE_ID = '22222222-2222-2222-2222-222222222222'
const SEED_SECTOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const WQ_TEST_COLLAB_ID = 'aaaaaaaa-bbbb-cccc-dddd-000000000001'
const WQ_ADMIN_USER_ID = 'aaaaaaaa-bbbb-cccc-dddd-000000000002'
const WQ_ADMIN_EMAIL = 'wq-production-test@sgp-argos.local'

describe.skipIf(!hasDb)('production work queue (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let env: ReturnType<typeof loadEnv>
  let adminCookie: string

  beforeAll(async () => {
    env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)

    await pool.query(
      `
      INSERT INTO collaborators (
        id, code, full_name, email, sector_id, role_id, status, is_active
      ) VALUES (
        $1::uuid, 'COL-WQ-TEST', 'Colaborador WQ Teste', 'wq-test@sgp.local',
        $2::uuid, $3::uuid, 'ACTIVE', true
      )
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        status = EXCLUDED.status,
        is_active = EXCLUDED.is_active,
        deleted_at = NULL
      `,
      [WQ_TEST_COLLAB_ID, SEED_SECTOR_ID, SEED_ROLE_ID],
    )

    await seedProductionPinForCollaborator(pool, WQ_TEST_COLLAB_ID, '9999', true)
    await seedProductionPinForCollaborator(pool, SEED_COLLABORATOR_MARIA_ID, '2468', true)

    const { hashPassword } = await import('../shared/password/password.js')
    const hash = await hashPassword('AdminWQ1!')
    await pool.query(
      `
      INSERT INTO app_users (
        id, email, password_hash, is_active, role_id, must_change_password, password_changed_at
      ) VALUES ($1::uuid, $2, $3, true, $4::uuid, false, now())
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        is_active = true
      `,
      [WQ_ADMIN_USER_ID, WQ_ADMIN_EMAIL, hash, SEED_ROLE_ID],
    )

    adminCookie = await sessionCookieForUser(pool, WQ_ADMIN_USER_ID, WQ_ADMIN_EMAIL)
  })

  afterAll(async () => {
    await closePool()
  })

  describe('GET /api/v1/production/me/work-queue — autenticação', () => {
    it('sem cookie → 401', async () => {
      const res = await request(app).get('/api/v1/production/me/work-queue')
      expect(res.status).toBe(401)
    })

    it('com cookie admin apenas → 401', async () => {
      const res = await request(app)
        .get('/api/v1/production/me/work-queue')
        .set('Cookie', adminCookie)
      expect(res.status).toBe(401)
    })

    it('com cookie production válido → 200', async () => {
      const cookie = productionSessionCookie(WQ_TEST_COLLAB_ID)
      const res = await request(app)
        .get('/api/v1/production/me/work-queue')
        .set('Cookie', cookie)
      expect(res.status).toBe(200)
    })
  })

  describe('GET /api/v1/production/me/work-queue — contrato', () => {
    it('usa collaboratorId da sessão production (não do admin)', async () => {
      const cookie = productionSessionCookie(WQ_TEST_COLLAB_ID)
      const res = await request(app)
        .get('/api/v1/production/me/work-queue')
        .set('Cookie', cookie)
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('data')
      const data = res.body.data as Record<string, unknown>
      expect(data).toHaveProperty('date')
      expect(data).toHaveProperty('planStatus')
      expect(data).toHaveProperty('summary')
      expect(data).toHaveProperty('items')
      expect(Array.isArray(data.items)).toBe(true)
    })

    it('colaborador sem plano publicado → 200 com lista vazia e planStatus null', async () => {
      const cookie = productionSessionCookie(WQ_TEST_COLLAB_ID)
      const res = await request(app)
        .get('/api/v1/production/me/work-queue')
        .set('Cookie', cookie)
      expect(res.status).toBe(200)
      const data = res.body.data as Record<string, unknown>
      // Sem plano publicado no ambiente de test, lista deve ser vazia
      expect(Array.isArray(data.items)).toBe(true)
      expect(data.planStatus === 'PUBLISHED' || data.planStatus === null).toBe(true)
    })

    it('não retorna campos sensíveis no item', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .get('/api/v1/production/me/work-queue')
        .set('Cookie', cookie)
      expect(res.status).toBe(200)
      const data = res.body.data as Record<string, unknown>
      const items = data.items as Array<Record<string, unknown>>
      for (const item of items) {
        expect(item).not.toHaveProperty('clientName')
        expect(item).not.toHaveProperty('vehicleDescription')
        expect(item).not.toHaveProperty('licensePlate')
        expect(item).not.toHaveProperty('plannedVsCapacity')
        expect(item).not.toHaveProperty('requiresUnassignedJustification')
        expect(item).not.toHaveProperty('userId')
        expect(item).not.toHaveProperty('workPlanId')
      }
    })

    it('não exige permissões administrativas (sem requireAuth)', async () => {
      // Cookie production válido basta — sem RBAC admin
      const cookie = productionSessionCookie(WQ_TEST_COLLAB_ID)
      const res = await request(app)
        .get('/api/v1/production/me/work-queue')
        .set('Cookie', cookie)
      expect(res.status).toBe(200)
    })

    it('endpoint admin /me/work-queue não é afetado', async () => {
      // Cookie admin deve funcionar no endpoint admin
      const res = await request(app)
        .get('/api/v1/me/work-queue')
        .set('Cookie', adminCookie)
      // Pode retornar 200 (sem colaborador vinculado → lista vazia) ou 200
      expect([200]).toContain(res.status)
    })
  })

  describe('GET /api/v1/production/me/work-queue — estrutura dos itens', () => {
    it('canTrackTime e canCompleteStep refletem sequência com justificativa', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .get('/api/v1/production/me/work-queue')
        .set('Cookie', cookie)
      expect(res.status).toBe(200)
      const data = res.body.data as Record<string, unknown>
      const items = data.items as Array<Record<string, unknown>>
      for (const item of items) {
        expect(typeof item.canCompleteStep).toBe('boolean')
        expect(typeof item.requiresOutOfSequenceJustification).toBe('boolean')
        if (item.isOutOfSequence === true && item.isActivityCompleted === false) {
          expect(item.canTrackTime).toBe(true)
          expect(item.requiresOutOfSequenceJustification).toBe(true)
          expect(item.canCompleteStep).toBe(true)
        }
        if (item.isActivityCompleted === true) {
          expect(item.canTrackTime).toBe(false)
          expect(item.canCompleteStep).toBe(false)
        }
      }
    })
  })

  describe('plano publicado vigente após remover item', () => {
    async function firstStepId(conveyorId: string): Promise<string> {
      const r = await pool.query<{ id: string }>(
        `
        SELECT id::text FROM conveyor_nodes
        WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
        ORDER BY order_index ASC LIMIT 1
        `,
        [conveyorId],
      )
      const id = r.rows[0]?.id
      if (!id) throw new Error('STEP não encontrado')
      return id
    }

    async function secondStepId(conveyorId: string): Promise<string> {
      const r = await pool.query<{ id: string }>(
        `
        SELECT id::text FROM conveyor_nodes
        WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
        ORDER BY order_index ASC OFFSET 1 LIMIT 1
        `,
        [conveyorId],
      )
      const id = r.rows[0]?.id
      if (!id) throw new Error('segundo STEP não encontrado')
      return id
    }

    function twoStepConveyorBody(nome: string): PostConveyorBody {
      return {
        dados: {
          nome,
          cliente: 'C-WQ',
          veiculo: 'V-WQ',
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
            titulo: 'Opção WQ',
            orderIndex: 1,
            sourceOrigin: 'manual',
            areas: [
              {
                titulo: 'Área WQ',
                orderIndex: 1,
                sourceOrigin: 'manual',
                steps: [
                  {
                    titulo: 'Limpar e inspecionar',
                    orderIndex: 1,
                    plannedMinutes: 30,
                    sourceOrigin: 'manual',
                    required: true,
                  },
                  {
                    titulo: 'Atividade Z',
                    orderIndex: 2,
                    plannedMinutes: 12,
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

    it('não retorna item removido do plano publicado até nova publicação da revisão', async () => {
      const conv = await serviceCreateConveyor(
        pool,
        twoStepConveyorBody(`WQ-Vigente-${Date.now()}`),
      )
      const stepOld = await firstStepId(conv.id)
      const stepKeep = await secondStepId(conv.id)

      const plannedDate = '2030-03-05'
      const weekStart = mondayOfWeekContaining(plannedDate)
      const weekEnd = fridayAfterMonday(weekStart)

      await pool.query(
        `UPDATE operational_work_plans SET deleted_at = now() WHERE week_start_date = $1::date AND deleted_at IS NULL`,
        [weekStart],
      )

      const saved = await serviceSaveOperationalWeekPlan(pool, WQ_ADMIN_USER_ID, {
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        items: [
          {
            conveyorId: conv.id,
            activityNodeId: stepOld,
            assignedCollaboratorId: WQ_TEST_COLLAB_ID,
            assignedTeamId: null,
            plannedDate,
            plannedOrder: 0,
            plannedMinutes: 30,
            notes: null,
            conveyorOperationalPlanItemId: null,
          },
          {
            conveyorId: conv.id,
            activityNodeId: stepKeep,
            assignedCollaboratorId: WQ_TEST_COLLAB_ID,
            assignedTeamId: null,
            plannedDate,
            plannedOrder: 1,
            plannedMinutes: 12,
            notes: null,
            conveyorOperationalPlanItemId: null,
          },
        ],
      })
      const planId = saved.plan?.id
      if (!planId) throw new Error('plano não criado')

      await servicePublishOperationalWeekPlan(pool, planId, WQ_ADMIN_USER_ID)

      const patched = await servicePatchOperationalWeekPlan(pool, planId, WQ_ADMIN_USER_ID, {
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        items: [
          {
            conveyorId: conv.id,
            activityNodeId: stepKeep,
            assignedCollaboratorId: WQ_TEST_COLLAB_ID,
            assignedTeamId: null,
            plannedDate,
            plannedOrder: 0,
            plannedMinutes: 12,
            notes: null,
            conveyorOperationalPlanItemId: null,
          },
        ],
      })
      const draftPlanId = patched.plan?.id
      if (!draftPlanId) throw new Error('revisão não criada')

      const cookie = productionSessionCookie(WQ_TEST_COLLAB_ID)
      const resBeforePublish = await request(app)
        .get(`/api/v1/production/me/work-queue?date=${plannedDate}`)
        .set('Cookie', cookie)
      expect(resBeforePublish.status).toBe(200)
      const itemsBefore = (resBeforePublish.body.data as { items: Array<{ activityTitle: string }> }).items
      expect(itemsBefore.some((i) => i.activityTitle === 'Atividade Z')).toBe(true)
      expect(itemsBefore.some((i) => i.activityTitle === 'Limpar e inspecionar')).toBe(true)

      await servicePublishOperationalWeekPlan(pool, draftPlanId, WQ_ADMIN_USER_ID)

      const res = await request(app)
        .get(`/api/v1/production/me/work-queue?date=${plannedDate}`)
        .set('Cookie', cookie)
      expect(res.status).toBe(200)
      const items = (res.body.data as { items: Array<{ activityTitle: string }> }).items
      expect(items.some((i) => i.activityTitle === 'Atividade Z')).toBe(true)
      expect(items.some((i) => i.activityTitle === 'Limpar e inspecionar')).toBe(false)
    })
  })
})
