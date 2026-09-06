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
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'
import { setConveyorProductionStatusForIntegration } from './integrationConveyorFixtures.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const SEED_SECTOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const SEED_ROLE_ID = '22222222-2222-2222-2222-222222222222'
const UT_OTHER_COLLAB_ID = 'dddddddd-0000-0000-0000-000000000001'

function conveyorWithTwoSteps(nome: string): PostConveyorBody {
  return {
    dados: {
      nome,
      cliente: 'C-UT',
      veiculo: 'V-UT',
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
        titulo: 'Opção UT',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'Área UT',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: [
              {
                titulo: 'Etapa Alocada Outro Colaborador',
                orderIndex: 1,
                plannedMinutes: 30,
                sourceOrigin: 'manual',
                required: true,
              },
              {
                titulo: 'Etapa Sem Nenhuma Alocação',
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
}

describe.skipIf(!hasDb)('production unassigned time entries — "Outra Atividade" (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let env: ReturnType<typeof loadEnv>

  let conveyorId: string
  let stepAssignedToOther: string
  let stepUnassigned: string

  beforeAll(async () => {
    env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)

    await ensureMariaCollaboratorSeedForIntegration(pool)
    await seedProductionPinForCollaborator(pool, SEED_COLLABORATOR_MARIA_ID, '2468', true)

    await pool.query(
      `
      INSERT INTO collaborators (id, code, full_name, email, sector_id, role_id, status, is_active)
      VALUES ($1::uuid, 'COL-UT-OTHER', 'Colab UT Outro', 'ut-other@sgp.local',
              $2::uuid, $3::uuid, 'ACTIVE', true)
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        status = EXCLUDED.status,
        is_active = EXCLUDED.is_active,
        deleted_at = NULL
      `,
      [UT_OTHER_COLLAB_ID, SEED_SECTOR_ID, SEED_ROLE_ID],
    )

    const conv = await serviceCreateConveyor(pool, conveyorWithTwoSteps(`UT-Outra-${Date.now()}`))
    conveyorId = conv.id
    await setConveyorProductionStatusForIntegration(pool, conveyorId)

    const steps = await pool.query<{ id: string }>(
      `SELECT id FROM conveyor_nodes
       WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
       ORDER BY order_index`,
      [conveyorId],
    )
    stepAssignedToOther = steps.rows[0]!.id
    stepUnassigned = steps.rows[1]!.id

    // Aloca outro colaborador (não a Maria) no primeiro STEP — a Maria vai
    // apontar aqui via "Outra Atividade" sem ter alocação própria.
    await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId,
      conveyorNodeId: stepAssignedToOther,
      collaboratorId: UT_OTHER_COLLAB_ID,
      isPrimary: true,
    })
  })

  afterAll(async () => {
    await closePool()
  })

  describe('GET /api/v1/production/me/time-entry-candidates', () => {
    it('sem cookie → 401', async () => {
      const res = await request(app).get('/api/v1/production/me/time-entry-candidates')
      expect(res.status).toBe(401)
    })

    it('com includeUnassigned=true retorna candidatos fora da alocação da Maria', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .get('/api/v1/production/me/time-entry-candidates')
        .set('Cookie', cookie)
        .query({ q: 'UT-Outra', includeUnassigned: 'true', limit: 50 })
      expect(res.status).toBe(200)
      const items = res.body.data as Array<Record<string, unknown>>
      expect(Array.isArray(items)).toBe(true)
      const found = items.filter((i) => i.conveyorId === conveyorId)
      expect(found.length).toBeGreaterThan(0)
      expect(found.every((i) => i.isAssignedToMe === false)).toBe(true)
    })
  })

  describe('POST /api/v1/production/time-entries/unassigned-exception — autenticação', () => {
    it('sem cookie → 401', async () => {
      const res = await request(app)
        .post('/api/v1/production/time-entries/unassigned-exception')
        .send({ conveyorId, stepNodeId: stepUnassigned, minutes: 10 })
      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/v1/production/time-entries/unassigned-exception — ASSIGNED', () => {
    it('quando o colaborador já tem alocação estrutural no STEP, registra como ASSIGNED', async () => {
      const conv = await serviceCreateConveyor(
        pool,
        conveyorWithTwoSteps(`UT-Assigned-${Date.now()}`),
      )
      await setConveyorProductionStatusForIntegration(pool, conv.id)
      const steps = await pool.query<{ id: string }>(
        `SELECT id FROM conveyor_nodes
         WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
         ORDER BY order_index`,
        [conv.id],
      )
      const stepId = steps.rows[0]!.id
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
        .send({ conveyorId: conv.id, stepNodeId: stepId, minutes: 20 })

      expect(res.status).toBe(201)
      const data = res.body.data as Record<string, unknown>
      expect(data.entryOrigin).toBe('ASSIGNED')

      const row = await pool.query<{ entry_origin: string; collaborator_id: string }>(
        `SELECT entry_origin, collaborator_id::text FROM conveyor_time_entries WHERE id = $1::uuid`,
        [data.id as string],
      )
      expect(row.rows[0]?.entry_origin).toBe('ASSIGNED')
      expect(row.rows[0]?.collaborator_id).toBe(SEED_COLLABORATOR_MARIA_ID)
    })
  })

  describe('POST /api/v1/production/time-entries/unassigned-exception — UNASSIGNED_EXCEPTION', () => {
    it('sem alocação e sem justificativa → 422', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries/unassigned-exception')
        .set('Cookie', cookie)
        .send({ conveyorId, stepNodeId: stepAssignedToOther, minutes: 15 })
      expect(res.status).toBe(422)
      expect(res.body.error?.code).toBe(ErrorCodes.TIME_ENTRY_UNASSIGNED_REQUIRES_JUSTIFICATION)
    })

    it('sem alocação e com justificativa em texto livre → 201 e entryOrigin UNASSIGNED_EXCEPTION', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries/unassigned-exception')
        .set('Cookie', cookie)
        .send({
          conveyorId,
          stepNodeId: stepAssignedToOther,
          minutes: 15,
          exceptionJustification: 'Cobrindo colega ausente.',
        })
      expect(res.status).toBe(201)
      const data = res.body.data as Record<string, unknown>
      expect(data.entryOrigin).toBe('UNASSIGNED_EXCEPTION')

      const row = await pool.query<{
        entry_origin: string
        exception_justification: string | null
        collaborator_id: string
        conveyor_node_assignee_id: string | null
      }>(
        `SELECT entry_origin, exception_justification, collaborator_id::text, conveyor_node_assignee_id::text
         FROM conveyor_time_entries WHERE id = $1::uuid`,
        [data.id as string],
      )
      expect(row.rows[0]?.entry_origin).toBe('UNASSIGNED_EXCEPTION')
      expect(row.rows[0]?.exception_justification).toBe('Cobrindo colega ausente.')
      expect(row.rows[0]?.collaborator_id).toBe(SEED_COLLABORATOR_MARIA_ID)
      expect(row.rows[0]?.conveyor_node_assignee_id).toBeNull()
    })

    it('node que não é STEP da esteira informada → 422', async () => {
      const other = await serviceCreateConveyor(pool, conveyorWithTwoSteps(`UT-Other-${Date.now()}`))
      const otherSteps = await pool.query<{ id: string }>(
        `SELECT id FROM conveyor_nodes
         WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
         ORDER BY order_index LIMIT 1`,
        [other.id],
      )
      const foreignStepId = otherSteps.rows[0]!.id

      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries/unassigned-exception')
        .set('Cookie', cookie)
        .send({
          conveyorId,
          stepNodeId: foreignStepId,
          minutes: 10,
          exceptionJustification: 'Justificativa qualquer.',
        })
      expect(res.status).toBe(422)
    })

    it('minutes<=0 → 400/422 pela validação do schema', async () => {
      const cookie = productionSessionCookie(SEED_COLLABORATOR_MARIA_ID)
      const res = await request(app)
        .post('/api/v1/production/time-entries/unassigned-exception')
        .set('Cookie', cookie)
        .send({
          conveyorId,
          stepNodeId: stepUnassigned,
          minutes: 0,
          exceptionJustification: 'Qualquer coisa.',
        })
      expect([400, 422]).toContain(res.status)
    })
  })
})
