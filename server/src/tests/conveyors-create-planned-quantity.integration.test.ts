import { randomUUID } from 'node:crypto'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import {
  hasDatabaseConnectionInEnv,
  loadDotenvFiles,
  loadEnv,
} from '../config/env.js'
import { closePool, getPool } from '../plugins/db.js'
import { serviceCreateConveyor } from '../modules/conveyors/conveyors.service.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'
import { resolveActivityPlannedTotalMinutes } from '../shared/activityOperationalQuantity.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

function stepPayload(
  sourceOrigin: 'manual' | 'base' | 'reaproveitada',
  plannedQuantity: number,
): PostConveyorBody['options'][0]['areas'][0]['steps'][0] {
  return {
    titulo: 'Etapa',
    orderIndex: 1,
    plannedMinutes: 15,
    plannedQuantity,
    sourceOrigin,
    required: true,
  }
}

function conveyorBody(
  sourceOrigin: 'manual' | 'base' | 'reaproveitada',
  plannedQuantity: number,
): PostConveyorBody {
  return {
    dados: {
      nome: `Qty-create ${randomUUID().slice(0, 8)}`,
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
    originType: sourceOrigin === 'base' ? 'BASE' : 'MANUAL',
    baseId: null,
    baseCode: null,
    baseName: null,
    baseVersion: null,
    options: [
      {
        titulo: 'Op',
        orderIndex: 1,
        sourceOrigin,
        areas: [
          {
            titulo: 'Área',
            orderIndex: 1,
            sourceOrigin,
            steps: [stepPayload(sourceOrigin, plannedQuantity)],
          },
        ],
      },
    ],
  }
}

async function readStepPlannedQuantity(
  pool: ReturnType<typeof getPool>,
  conveyorId: string,
): Promise<{ planned_quantity: number; planned_minutes: number | null }> {
  const r = await pool.query<{ planned_quantity: number; planned_minutes: number | null }>(
    `SELECT planned_quantity, planned_minutes
     FROM conveyor_nodes
     WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
     LIMIT 1`,
    [conveyorId],
  )
  const row = r.rows[0]
  if (!row) throw new Error('STEP não encontrado')
  return row
}

async function hasConveyorNodesPlannedQuantityColumn(
  pool: ReturnType<typeof getPool>,
): Promise<boolean> {
  const r = await pool.query<{ col: string }>(
    `
    SELECT column_name AS col
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'conveyor_nodes'
      AND column_name = 'planned_quantity'
    LIMIT 1
    `,
  )
  return r.rows.length > 0
}

describe.skipIf(!hasDb)('conveyor create — planned_quantity inicial', () => {
  let pool: ReturnType<typeof getPool>
  let hasPlannedQuantityColumn = false

  beforeAll(async () => {
    pool = getPool(loadEnv())
    hasPlannedQuantityColumn = await hasConveyorNodesPlannedQuantityColumn(pool)
  })

  afterAll(async () => {
    await closePool()
  })

  it.skipIf(!hasPlannedQuantityColumn)(
    'manual com plannedQuantity 10 no payload persiste 1',
    async () => {
    const created = await serviceCreateConveyor(
      pool,
      conveyorBody('manual', 10),
    )
    const row = await readStepPlannedQuantity(pool, created.id)
    expect(row.planned_quantity).toBe(1)
    },
  )

  it.skipIf(!hasPlannedQuantityColumn)(
    'base com plannedQuantity 10 no payload persiste 1',
    async () => {
    const created = await serviceCreateConveyor(pool, conveyorBody('base', 10))
    const row = await readStepPlannedQuantity(pool, created.id)
    expect(row.planned_quantity).toBe(1)
    },
  )

  it.skipIf(!hasPlannedQuantityColumn)(
    'reaproveitada com plannedQuantity 10 no payload persiste 1',
    async () => {
    const created = await serviceCreateConveyor(
      pool,
      conveyorBody('reaproveitada', 10),
    )
    const row = await readStepPlannedQuantity(pool, created.id)
    expect(row.planned_quantity).toBe(1)
    },
  )

  it.skipIf(!hasPlannedQuantityColumn)(
    'após UPDATE pós-criação, carga planejada usa min/un. × qtd',
    async () => {
    const created = await serviceCreateConveyor(
      pool,
      conveyorBody('manual', 10),
    )
    await pool.query(
      `UPDATE conveyor_nodes
       SET planned_quantity = 10
       WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL`,
      [created.id],
    )
    const row = await readStepPlannedQuantity(pool, created.id)
    expect(row.planned_quantity).toBe(10)
    expect(
      resolveActivityPlannedTotalMinutes(row.planned_minutes, row.planned_quantity),
    ).toBe(150)
    },
  )
})
