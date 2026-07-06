import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import * as conveyorsRepo from '../modules/conveyors/conveyors.repository.js'
import { serviceCreateConveyor } from '../modules/conveyors/conveyors.service.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'

const CLIENT = {
  query: vi.fn().mockResolvedValue({ rows: [] }),
  release: vi.fn(),
} as unknown as pg.PoolClient

function conveyorBodyWithSourceKey(sourceKey: string | null): PostConveyorBody {
  return {
    dados: {
      nome: `SourceKey ${randomUUID().slice(0, 8)}`,
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
        titulo: 'Op',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'Área',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: [
              {
                titulo: 'Etapa',
                orderIndex: 1,
                plannedMinutes: 15,
                sourceOrigin: 'manual',
                required: true,
                ...(sourceKey != null ? { sourceKey } : {}),
              },
            ],
          },
        ],
      },
    ],
  }
}

describe('materializeConveyorOptions — source_key', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('STEP recebe source_key propagada; OPTION e AREA permanecem null', async () => {
    const poolConnect = vi.fn().mockResolvedValue(CLIENT)
    const pool = { connect: poolConnect } as unknown as pg.Pool

    vi.spyOn(conveyorsRepo, 'insertConveyor').mockResolvedValue({
      created_at: new Date().toISOString(),
    })
    const insertNode = vi
      .spyOn(conveyorsRepo, 'insertConveyorNode')
      .mockResolvedValue(undefined)

    await serviceCreateConveyor(pool, conveyorBodyWithSourceKey('lineage-xyz'))

    const calls = insertNode.mock.calls.map((c) => c[1])
    const option = calls.find((n) => n.node_type === 'OPTION')
    const area = calls.find((n) => n.node_type === 'AREA')
    const step = calls.find((n) => n.node_type === 'STEP')

    expect(option?.source_key).toBeNull()
    expect(area?.source_key).toBeNull()
    expect(step?.source_key).toBe('lineage-xyz')
  })

  it('STEP sem sourceKey no payload grava source_key null', async () => {
    const poolConnect = vi.fn().mockResolvedValue(CLIENT)
    const pool = { connect: poolConnect } as unknown as pg.Pool

    vi.spyOn(conveyorsRepo, 'insertConveyor').mockResolvedValue({
      created_at: new Date().toISOString(),
    })
    const insertNode = vi
      .spyOn(conveyorsRepo, 'insertConveyorNode')
      .mockResolvedValue(undefined)

    await serviceCreateConveyor(pool, conveyorBodyWithSourceKey(null))

    const step = insertNode.mock.calls
      .map((c) => c[1])
      .find((n) => n.node_type === 'STEP')
    expect(step?.source_key).toBeNull()
  })
})
