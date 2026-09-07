/**
 * Prova de ROLLBACK total quando a aplicação do diff falha no meio (critério
 * de aceite #12). Não há como forçar uma violação real de constraint do
 * Postgres a partir de um payload que já passou pela validação Zod + pelas
 * validações de negócio (ownership/hierarquia/assignees) — todas rodam antes
 * de qualquer escrita. Por isso, este teste mocka o repositório de baixo
 * nível para simular uma falha depois que o primeiro INSERT já foi
 * persistido, e verifica que o serviço emite ROLLBACK (nunca COMMIT) e
 * propaga o erro — mesmo padrão de mocking usado em
 * `conveyor-step-abort.idempotency.unit.test.ts`.
 */
import type pg from 'pg'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const eventsRepoMocks = vi.hoisted(() => ({
  getByIdempotencyKey: vi.fn(),
}))

const diffRepoMocks = vi.hoisted(() => ({
  listActiveConveyorNodesForDiff: vi.fn(),
}))

const conveyorsRepoMocks = vi.hoisted(() => ({
  insertConveyorNode: vi.fn(),
}))

vi.mock(
  '../modules/conveyors/operational-events/conveyor-operational-events.repository.js',
  async () => {
    const actual = await vi.importActual<
      typeof import('../modules/conveyors/operational-events/conveyor-operational-events.repository.js')
    >('../modules/conveyors/operational-events/conveyor-operational-events.repository.js')
    return {
      ...actual,
      getConveyorOperationalEventByIdempotencyKey: eventsRepoMocks.getByIdempotencyKey,
    }
  },
)

vi.mock('../modules/conveyors/conveyor-structure-diff.repository.js', async () => {
  const actual = await vi.importActual<
    typeof import('../modules/conveyors/conveyor-structure-diff.repository.js')
  >('../modules/conveyors/conveyor-structure-diff.repository.js')
  return {
    ...actual,
    listActiveConveyorNodesForDiff: diffRepoMocks.listActiveConveyorNodesForDiff,
  }
})

vi.mock('../modules/conveyors/conveyors.repository.js', async () => {
  const actual = await vi.importActual<
    typeof import('../modules/conveyors/conveyors.repository.js')
  >('../modules/conveyors/conveyors.repository.js')
  return {
    ...actual,
    insertConveyorNode: conveyorsRepoMocks.insertConveyorNode,
  }
})

const { serviceApplyConveyorStructureDiff } = await import(
  '../modules/conveyors/conveyor-structure-diff.service.js'
)

const CONVEYOR_ID = '11111111-1111-1111-1111-111111111111'
const ACTOR_ID = '55555555-5555-5555-5555-555555555555'

type FakeSequence = string[]

function createFakePool(conveyorRow: Record<string, unknown>): {
  pool: pg.Pool
  sequence: FakeSequence
} {
  const sequence: FakeSequence = []

  const client = {
    query: async (text: unknown) => {
      const sql = typeof text === 'string' ? text : String((text as { text?: string })?.text ?? '')
      const head = sql.trim().split(/\s+/)[0]?.toUpperCase() ?? ''
      sequence.push(`client.query:${head}`)
      if (sql.includes('FOR UPDATE')) {
        return { rows: [conveyorRow], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    },
    release: () => {
      sequence.push('client.release')
    },
  }

  const pool = {
    connect: async () => {
      sequence.push('pool.connect')
      return client
    },
    query: async () => {
      sequence.push('pool.query')
      return { rows: [], rowCount: 0 }
    },
  }

  return { pool: pool as unknown as pg.Pool, sequence }
}

function baseConveyorRow(): Record<string, unknown> {
  return {
    id: CONVEYOR_ID,
    metadata_json: null,
    origin_register: 'MANUAL',
    base_ref_snapshot: null,
    base_code_snapshot: null,
    base_name_snapshot: null,
    base_version_snapshot: null,
  }
}

function twoLevelInsertBody() {
  return {
    originType: 'MANUAL' as const,
    baseId: null,
    baseCode: null,
    baseName: null,
    baseVersion: null,
    matrixRootItemId: null,
    options: [
      {
        titulo: 'Opção nova',
        orderIndex: 1,
        sourceOrigin: 'manual' as const,
        areas: [
          {
            titulo: 'Área nova',
            orderIndex: 1,
            sourceOrigin: 'manual' as const,
            steps: [
              {
                titulo: 'Etapa nova',
                orderIndex: 1,
                plannedMinutes: 10,
                sourceOrigin: 'manual' as const,
                required: true,
                assignees: [],
              },
            ],
          },
        ],
      },
    ],
  }
}

describe('serviceApplyConveyorStructureDiff — ROLLBACK total em falha no meio da aplicação', () => {
  beforeEach(() => {
    eventsRepoMocks.getByIdempotencyKey.mockReset()
    diffRepoMocks.listActiveConveyorNodesForDiff.mockReset()
    conveyorsRepoMocks.insertConveyorNode.mockReset()

    eventsRepoMocks.getByIdempotencyKey.mockResolvedValue(null)
    diffRepoMocks.listActiveConveyorNodesForDiff.mockResolvedValue([])
  })

  it('2º insert (AREA) falha após o 1º (OPTION) já persistido → ROLLBACK, nunca COMMIT, erro propagado', async () => {
    let calls = 0
    conveyorsRepoMocks.insertConveyorNode.mockImplementation(async () => {
      calls += 1
      if (calls === 2) {
        throw new Error('forced mid-apply failure')
      }
      return undefined
    })

    const { pool, sequence } = createFakePool(baseConveyorRow())

    await expect(
      serviceApplyConveyorStructureDiff(pool, {
        conveyorId: CONVEYOR_ID,
        actorAppUserId: ACTOR_ID,
        idempotencyKey: 'key-rollback-1',
        body: twoLevelInsertBody(),
      }),
    ).rejects.toThrow('forced mid-apply failure')

    // 1º insert (OPTION) foi tentado antes da falha no 2º (AREA) — prova de
    // aplicação parcial ANTES do rollback (não é uma rejeição precoce).
    expect(conveyorsRepoMocks.insertConveyorNode).toHaveBeenCalledTimes(2)
    expect(sequence).toContain('client.query:BEGIN')
    expect(sequence).toContain('client.query:ROLLBACK')
    expect(sequence).not.toContain('client.query:COMMIT')
    expect(sequence).toContain('client.release')
  })
})
