import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { createLogger } from '../plugins/logger.js'
import { closePool, getPool } from '../plugins/db.js'
import { hasDatabaseConnectionInEnv, loadDotenvFiles, loadEnv } from '../config/env.js'
import { serviceCreateConveyor } from '../modules/conveyors/conveyors.service.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'
import { serviceCreateConveyorNodeAssignee } from '../modules/conveyors/conveyorAssignments.service.js'
import {
  productionSessionCookie,
  seedProductionPinForCollaborator,
  SEED_COLLABORATOR_MARIA_ID,
} from './productionTestHelpers.js'
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'
import { setConveyorProductionStatusForIntegration } from './integrationConveyorFixtures.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const UOA_UNASSIGNED_COLLAB_ID = 'cccccccc-1111-0000-0000-000000000001'

function minimalConveyorBody(nome: string): PostConveyorBody {
  return {
    dados: {
      nome,
      cliente: 'C-UOA',
      veiculo: 'V-UOA',
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
        titulo: 'Opção UOA',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'Área UOA',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: [
              {
                titulo: 'Etapa UOA',
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

describe.skipIf(!hasDb)('production unassigned time entries + candidates (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let env: ReturnType<typeof loadEnv>

  beforeAll(async () => {
    env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)

    await ensureMariaCollaboratorSeedForIntegration(pool)
    await seedProductionPinForCollaborator(pool, SEED_COLLABORATOR_MARIA_ID, '2468', true)

    await pool.query(
      `
      INSERT INTO collaborators (id, code, full_name, email, sector_id, role_id, status, is_active)
      VALUES ($1::uuid, 'COL-UOA-UNASSIGNED', 'Colab UOA Unassigned', 'uoa-unassigned@sgp.local',
              'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '22222222-2222-2222-2222-222222222222'::uuid,
              'ACTIVE', true)
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        status = EXCLUDED.status,
        is_active = EXCLUDED.is_active,
        deleted_at = NULL
      `,
      [UOA_UNASSIGNED_COLLAB_ID],
    )
    await seedProductionPinForCollaborator(pool, UOA_UNASSIGNED_COLLAB_ID, '1111', true)
  })

  afterAll(async () => {
    await closePool()
  })

  describe('GET /api/v1/production/me/time-entry-candidates', () => {
    it('sem cookie → 401', async () => {
      const res = await request(app).get('/api/v1/production/me/time-entry-candidates')
      expect(res.status).toBe(401)
    })

    it('busca por nome (>= 2 chars) retorna atividade real não alocada', async () => {
      const conv = await serviceCreateConveyor(
        pool,
        minimalConveyorBody(`UOA-Search-${Date.now()}`),
      )
      await setConveyorProductionStatusForIntegration(pool, conv.id)

      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .get('/api/v1/production/me/time-entry-candidates')
        .set('Cookie', cookie)
        .query({ q: 'Etapa UOA', includeUnassigned: 'true', limit: 20 })
      expect(res.status).toBe(200)
      const items = res.body.data as Array<{
        conveyorId: string
        isAssignedToMe: boolean
        activityTitle: string
      }>
      const found = items.find((i) => i.conveyorId === conv.id)
      expect(found).toBeDefined()
      expect(found?.isAssignedToMe).toBe(false)
    })
  })

  describe('POST /api/v1/production/time-entries/unassigned-exception', () => {
    it('sem cookie → 401', async () => {
      const res = await request(app)
        .post('/api/v1/production/time-entries/unassigned-exception')
        .send({ conveyorId: 'x', stepNodeId: 'y', minutes: 10 })
      expect(res.status).toBe(401)
    })

    it('payload inválido (uuid malformado) → 422', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries/unassigned-exception')
        .set('Cookie', cookie)
        .send({ conveyorId: 'not-a-uuid', stepNodeId: 'not-a-uuid', minutes: 10 })
      expect(res.status).toBe(422)
    })

    it('colaborador não alocado sem justificativa → 422 (exige justificativa)', async () => {
      const conv = await serviceCreateConveyor(
        pool,
        minimalConveyorBody(`UOA-NoJust-${Date.now()}`),
      )
      await setConveyorProductionStatusForIntegration(pool, conv.id)
      const stepId = await firstStepId(pool, conv.id)

      const cookie = productionSessionCookie(UOA_UNASSIGNED_COLLAB_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries/unassigned-exception')
        .set('Cookie', cookie)
        .send({ conveyorId: conv.id, stepNodeId: stepId, minutes: 10 })
      expect(res.status).toBe(422)
      expect(res.body.error?.code).toBe(
        ErrorCodes.TIME_ENTRY_UNASSIGNED_REQUIRES_JUSTIFICATION,
      )
    })

    it('colaborador não alocado com justificativa → 201, entry_origin=UNASSIGNED_EXCEPTION, sem criar alocação', async () => {
      const conv = await serviceCreateConveyor(
        pool,
        minimalConveyorBody(`UOA-Just-${Date.now()}`),
      )
      await setConveyorProductionStatusForIntegration(pool, conv.id)
      const stepId = await firstStepId(pool, conv.id)
      const justificationId = await planningJustificationId(pool)

      const beforeAssignees = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM conveyor_node_assignees
         WHERE conveyor_node_id = $1::uuid AND deleted_at IS NULL`,
        [stepId],
      )

      const cookie = productionSessionCookie(UOA_UNASSIGNED_COLLAB_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries/unassigned-exception')
        .set('Cookie', cookie)
        .send({
          conveyorId: conv.id,
          stepNodeId: stepId,
          minutes: 12,
          exceptionJustificationId: justificationId,
        })
      expect(res.status).toBe(201)
      const entryId = (res.body.data as { id: string }).id

      const row = await pool.query<{
        collaborator_id: string
        entry_origin: string
        conveyor_node_assignee_id: string | null
      }>(
        `SELECT collaborator_id::text, entry_origin, conveyor_node_assignee_id::text
         FROM conveyor_time_entries WHERE id = $1::uuid`,
        [entryId],
      )
      expect(row.rows[0]?.collaborator_id).toBe(UOA_UNASSIGNED_COLLAB_ID)
      expect(row.rows[0]?.entry_origin).toBe('UNASSIGNED_EXCEPTION')
      expect(row.rows[0]?.conveyor_node_assignee_id).toBeNull()

      const afterAssignees = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM conveyor_node_assignees
         WHERE conveyor_node_id = $1::uuid AND deleted_at IS NULL`,
        [stepId],
      )
      expect(afterAssignees.rows[0]?.count).toBe(beforeAssignees.rows[0]?.count)
    })

    it('colaborador alocado no STEP → 201, entry_origin=ASSIGNED, collaborator vindo da sessão', async () => {
      const conv = await serviceCreateConveyor(
        pool,
        minimalConveyorBody(`UOA-Assigned-${Date.now()}`),
      )
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
        .post('/api/v1/production/time-entries/unassigned-exception')
        .set('Cookie', cookie)
        .send({ conveyorId: conv.id, stepNodeId: stepId, minutes: 8 })
      expect(res.status).toBe(201)
      const entryId = (res.body.data as { id: string }).id

      const row = await pool.query<{
        collaborator_id: string
        entry_origin: string
      }>(
        `SELECT collaborator_id::text, entry_origin
         FROM conveyor_time_entries WHERE id = $1::uuid`,
        [entryId],
      )
      expect(row.rows[0]?.collaborator_id).toBe(SEED_COLLABORATOR_MARIA_ID)
      expect(row.rows[0]?.entry_origin).toBe('ASSIGNED')
    })
  })
})
