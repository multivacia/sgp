import { randomUUID } from 'node:crypto'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
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
  serviceCreateConveyorTimeEntry,
  collaboratorActiveForOperations,
} from '../modules/conveyors/conveyorAssignments.service.js'
import { insertConveyorNodeAssignee } from '../modules/conveyors/conveyorAssignments.repository.js'
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'
loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

/** Colaborador seed (Maria) — ver seeds/0001_seed_base.sql */
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

describe.skipIf(!hasDb)('conveyor_node_assignees + conveyor_time_entries (integração)', () => {
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    createApp(pool, createLogger('silent'), env)
    await ensureMariaCollaboratorSeedForIntegration(pool)
  })

  afterAll(async () => {
    await closePool()
  })

  async function firstNodeId(
    conveyorId: string,
    nodeType: 'OPTION' | 'AREA' | 'STEP',
  ): Promise<string> {
    const r = await pool.query<{ id: string }>(
      `SELECT id FROM conveyor_nodes
       WHERE conveyor_id = $1::uuid AND node_type = $2 AND deleted_at IS NULL
       ORDER BY order_index, id
       LIMIT 1`,
      [conveyorId, nodeType],
    )
    const row = r.rows[0]
    if (!row) throw new Error(`nó ${nodeType} não encontrado`)
    return row.id
  }

  it('cria múltiplas alocações no mesmo STEP', async () => {
    const colabB = randomUUID()
    await pool.query(
      `INSERT INTO collaborators (id, full_name, status, is_active)
       VALUES ($1::uuid, 'Colab B Assign Test', 'ACTIVE', true)`,
      [colabB],
    )

    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`Multi-assign ${randomUUID().slice(0, 8)}`),
    )
    const stepId = await firstNodeId(created.id, 'STEP')

    const a1 = await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId: created.id,
      conveyorNodeId: stepId,
      collaboratorId: COLAB_SEED,
      isPrimary: true,
    })
    const a2 = await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId: created.id,
      conveyorNodeId: stepId,
      collaboratorId: colabB,
      isPrimary: false,
    })

    expect(a1.id).toBeTruthy()
    expect(a2.id).toBeTruthy()
    expect(a1.id).not.toBe(a2.id)
  })

  it('rejeita colaborador duplicado no mesmo STEP (409)', async () => {
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`Dup ${randomUUID().slice(0, 8)}`),
    )
    const stepId = await firstNodeId(created.id, 'STEP')

    await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId: created.id,
      conveyorNodeId: stepId,
      collaboratorId: COLAB_SEED,
      isPrimary: false,
    })

    await expect(
      serviceCreateConveyorNodeAssignee(pool, {
        conveyorId: created.id,
        conveyorNodeId: stepId,
        collaboratorId: COLAB_SEED,
        isPrimary: false,
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' })
  })

  it('rejeita dois principais ativos no mesmo STEP (409)', async () => {
    const colabB = randomUUID()
    const colabC = randomUUID()
    await pool.query(
      `INSERT INTO collaborators (id, full_name, status, is_active) VALUES
        ($1::uuid, 'Pri B', 'ACTIVE', true),
        ($2::uuid, 'Pri C', 'ACTIVE', true)`,
      [colabB, colabC],
    )

    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`Pri ${randomUUID().slice(0, 8)}`),
    )
    const stepId = await firstNodeId(created.id, 'STEP')

    await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId: created.id,
      conveyorNodeId: stepId,
      collaboratorId: COLAB_SEED,
      isPrimary: true,
    })

    await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId: created.id,
      conveyorNodeId: stepId,
      collaboratorId: colabB,
      isPrimary: false,
    })

    await expect(
      serviceCreateConveyorNodeAssignee(pool, {
        conveyorId: created.id,
        conveyorNodeId: stepId,
        collaboratorId: colabC,
        isPrimary: true,
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' })
  })

  it('cria apontamento analítico válido (com e sem assignee opcional)', async () => {
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`Time ${randomUUID().slice(0, 8)}`),
    )
    const stepId = await firstNodeId(created.id, 'STEP')

    const assignee = await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId: created.id,
      conveyorNodeId: stepId,
      collaboratorId: COLAB_SEED,
      isPrimary: true,
    })

    const t1 = await serviceCreateConveyorTimeEntry(pool, {
      conveyorId: created.id,
      conveyorNodeId: stepId,
      collaboratorId: COLAB_SEED,
      minutes: 15,
      conveyorNodeAssigneeId: assignee.id,
    })
    expect(t1.id).toBeTruthy()

    const t2 = await serviceCreateConveyorTimeEntry(pool, {
      conveyorId: created.id,
      conveyorNodeId: stepId,
      collaboratorId: COLAB_SEED,
      minutes: 5,
      conveyorNodeAssigneeId: null,
    })
    expect(t2.id).toBeTruthy()
  })

  it('rejeita apontamento em nó que não é STEP (422)', async () => {
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`Opt ${randomUUID().slice(0, 8)}`),
    )
    const optionId = await firstNodeId(created.id, 'OPTION')

    await expect(
      serviceCreateConveyorTimeEntry(pool, {
        conveyorId: created.id,
        conveyorNodeId: optionId,
        collaboratorId: COLAB_SEED,
        minutes: 10,
      }),
    ).rejects.toMatchObject({ statusCode: 422 })
  })

  it('rejeita minutes <= 0 (422)', async () => {
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`Min ${randomUUID().slice(0, 8)}`),
    )
    const stepId = await firstNodeId(created.id, 'STEP')

    await expect(
      serviceCreateConveyorTimeEntry(pool, {
        conveyorId: created.id,
        conveyorNodeId: stepId,
        collaboratorId: COLAB_SEED,
        minutes: 0,
      }),
    ).rejects.toMatchObject({ statusCode: 422 })

    await expect(
      serviceCreateConveyorTimeEntry(pool, {
        conveyorId: created.id,
        conveyorNodeId: stepId,
        collaboratorId: COLAB_SEED,
        minutes: -1,
      }),
    ).rejects.toMatchObject({ statusCode: 422 })
  })

  it('rejeita conveyor_id incompatível com o nó (422 no service)', async () => {
    const c1 = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`C1 ${randomUUID().slice(0, 8)}`),
    )
    const c2 = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`C2 ${randomUUID().slice(0, 8)}`),
    )
    const stepC1 = await firstNodeId(c1.id, 'STEP')

    await expect(
      serviceCreateConveyorNodeAssignee(pool, {
        conveyorId: c2.id,
        conveyorNodeId: stepC1,
        collaboratorId: COLAB_SEED,
        isPrimary: false,
      }),
    ).rejects.toMatchObject({ statusCode: 422 })
  })

  it('trigger bloqueia insert direto com conveyor_id incompatível (FK válido)', async () => {
    const c1 = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`Trg1 ${randomUUID().slice(0, 8)}`),
    )
    const c2 = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`Trg2 ${randomUUID().slice(0, 8)}`),
    )
    const stepC1 = await firstNodeId(c1.id, 'STEP')

    await expect(
      insertConveyorNodeAssignee(pool, {
        id: randomUUID(),
        conveyor_id: c2.id,
        conveyor_node_id: stepC1,
        collaborator_id: COLAB_SEED,
        is_primary: false,
        assignment_origin: 'manual',
        order_index: 0,
        metadata_json: null,
      }),
    ).rejects.toThrow()
  })

  it('colaborador INACTIVE não passa na validação de aplicação', async () => {
    const inactiveId = randomUUID()
    await pool.query(
      `INSERT INTO collaborators (id, full_name, status, is_active)
       VALUES ($1::uuid, 'Inativo', 'INACTIVE', false)`,
      [inactiveId],
    )

    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`Ina ${randomUUID().slice(0, 8)}`),
    )
    const stepId = await firstNodeId(created.id, 'STEP')

    const ok = await collaboratorActiveForOperations(pool, inactiveId)
    expect(ok).toBe(false)

    await expect(
      serviceCreateConveyorNodeAssignee(pool, {
        conveyorId: created.id,
        conveyorNodeId: stepId,
        collaboratorId: inactiveId,
        isPrimary: false,
      }),
    ).rejects.toMatchObject({ statusCode: 422 })
  })

  it('assignee_id em time entry deve bater STEP + colaborador', async () => {
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`Aref ${randomUUID().slice(0, 8)}`),
    )
    const stepId = await firstNodeId(created.id, 'STEP')
    const other = randomUUID()
    await pool.query(
      `INSERT INTO collaborators (id, full_name, status, is_active) VALUES ($1::uuid, 'Outro', 'ACTIVE', true)`,
      [other],
    )
    const assignee = await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId: created.id,
      conveyorNodeId: stepId,
      collaboratorId: COLAB_SEED,
      isPrimary: false,
    })

    await expect(
      serviceCreateConveyorTimeEntry(pool, {
        conveyorId: created.id,
        conveyorNodeId: stepId,
        collaboratorId: other,
        minutes: 3,
        conveyorNodeAssigneeId: assignee.id,
      }),
    ).rejects.toMatchObject({ statusCode: 422 })
  })
})
