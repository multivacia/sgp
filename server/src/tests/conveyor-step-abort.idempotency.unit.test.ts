/**
 * Unitários sem banco para abort/restore de STEP:
 *
 * 1. `resolveStepAbortIdempotencyReplay` — replay só com correspondência exata
 *    de `event_type` + `conveyor_id` + `node_id`; qualquer outra combinação → 409.
 * 2. Ordem de liberação do `PoolClient` — `loadDetail` (que pede outra conexão ao
 *    pool) só pode rodar DEPOIS de `client.release()`. O fake de pool simula
 *    `max: 1` e falha se `pool.query` acontecer com client retido.
 */
import type pg from 'pg'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../shared/errors/AppError.js'
import type { ConveyorOperationalEventRow } from '../modules/conveyors/operational-events/conveyor-operational-events.types.js'

const eventsRepoMocks = vi.hoisted(() => ({
  getByIdempotencyKey: vi.fn(),
}))

const eventsServiceMocks = vi.hoisted(() => ({
  createEvent: vi.fn(),
}))

const permissionsMocks = vi.hoisted(() => ({
  appUserHasPermission: vi.fn(),
}))

const lockMocks = vi.hoisted(() => ({
  lockConveyorAndStepForUpdate: vi.fn(),
}))

const conveyorsRepoMocks = vi.hoisted(() => ({
  findConveyorById: vi.fn(),
  listConveyorNodesByConveyorId: vi.fn(),
  updateConveyorNodeStepAborted: vi.fn(),
  updateConveyorNodeStepRestoreAborted: vi.fn(),
}))

const conveyorsServiceMocks = vi.hoisted(() => ({
  loadConveyorStructureWithAssignees: vi.fn(),
  mapDetailRowToApi: vi.fn(),
}))

const stepAbortReasonsRepoMocks = vi.hoisted(() => ({
  findStepAbortReasonByCode: vi.fn(),
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

vi.mock(
  '../modules/conveyors/operational-events/conveyor-operational-events.service.js',
  async () => {
    const actual = await vi.importActual<
      typeof import('../modules/conveyors/operational-events/conveyor-operational-events.service.js')
    >('../modules/conveyors/operational-events/conveyor-operational-events.service.js')
    return {
      ...actual,
      serviceCreateConveyorOperationalEvent: eventsServiceMocks.createEvent,
    }
  },
)

vi.mock('../modules/permissions/permissions.repository.js', async () => {
  const actual = await vi.importActual<
    typeof import('../modules/permissions/permissions.repository.js')
  >('../modules/permissions/permissions.repository.js')
  return {
    ...actual,
    appUserHasPermission: permissionsMocks.appUserHasPermission,
  }
})

vi.mock('../modules/conveyors/lockConveyorAndStepForUpdate.js', async () => {
  const actual = await vi.importActual<
    typeof import('../modules/conveyors/lockConveyorAndStepForUpdate.js')
  >('../modules/conveyors/lockConveyorAndStepForUpdate.js')
  return {
    ...actual,
    lockConveyorAndStepForUpdate: lockMocks.lockConveyorAndStepForUpdate,
  }
})

vi.mock('../modules/conveyors/conveyors.repository.js', async () => {
  const actual = await vi.importActual<
    typeof import('../modules/conveyors/conveyors.repository.js')
  >('../modules/conveyors/conveyors.repository.js')
  return {
    ...actual,
    findConveyorById: conveyorsRepoMocks.findConveyorById,
    listConveyorNodesByConveyorId: conveyorsRepoMocks.listConveyorNodesByConveyorId,
    updateConveyorNodeStepAborted: conveyorsRepoMocks.updateConveyorNodeStepAborted,
    updateConveyorNodeStepRestoreAborted:
      conveyorsRepoMocks.updateConveyorNodeStepRestoreAborted,
  }
})

vi.mock('../modules/conveyors/conveyors.service.js', async () => {
  const actual = await vi.importActual<
    typeof import('../modules/conveyors/conveyors.service.js')
  >('../modules/conveyors/conveyors.service.js')
  return {
    ...actual,
    loadConveyorStructureWithAssignees: conveyorsServiceMocks.loadConveyorStructureWithAssignees,
    mapDetailRowToApi: conveyorsServiceMocks.mapDetailRowToApi,
  }
})

vi.mock('../modules/operational-settings/step-abort-reasons.repository.js', async () => {
  const actual = await vi.importActual<
    typeof import('../modules/operational-settings/step-abort-reasons.repository.js')
  >('../modules/operational-settings/step-abort-reasons.repository.js')
  return {
    ...actual,
    findStepAbortReasonByCode: stepAbortReasonsRepoMocks.findStepAbortReasonByCode,
  }
})

const {
  resolveStepAbortIdempotencyReplay,
  serviceAbortConveyorStep,
  serviceRestoreAbortedConveyorStep,
} = await import('../modules/conveyors/conveyor-step-abort.service.js')

const CONVEYOR_ID = '11111111-1111-1111-1111-111111111111'
const OTHER_CONVEYOR_ID = '22222222-2222-2222-2222-222222222222'
const STEP_ID = '33333333-3333-3333-3333-333333333333'
const OTHER_STEP_ID = '44444444-4444-4444-4444-444444444444'
const ACTOR_ID = '55555555-5555-5555-5555-555555555555'
const KEY = 'idem-key-1'

function eventRow(
  overrides: Partial<ConveyorOperationalEventRow> = {},
): ConveyorOperationalEventRow {
  return {
    id: 'evt-1',
    conveyor_id: CONVEYOR_ID,
    node_id: STEP_ID,
    event_type: 'CONVEYOR_STEP_ABORTED',
    previous_value: 'PENDING',
    new_value: 'ABORTED',
    reason: 'NAO_MAIS_NECESSARIA',
    source: 'USER_ACTION',
    occurred_at: new Date('2026-08-08T12:00:00.000Z'),
    created_by: ACTOR_ID,
    metadata_json: null,
    idempotency_key: KEY,
    created_at: new Date('2026-08-08T12:00:00.000Z'),
    ...overrides,
  }
}

const fakeClient = {} as pg.PoolClient

describe('resolveStepAbortIdempotencyReplay', () => {
  beforeEach(() => {
    eventsRepoMocks.getByIdempotencyKey.mockReset()
  })

  const abortInput = {
    idempotencyKey: KEY,
    expectedEventType: 'CONVEYOR_STEP_ABORTED' as const,
    conveyorId: CONVEYOR_ID,
    stepNodeId: STEP_ID,
    currentStatus: 'ABORTED' as const,
    expectedStatusAfterOperation: 'ABORTED' as const,
  }

  it('chave inexistente → replay false', async () => {
    eventsRepoMocks.getByIdempotencyKey.mockResolvedValue(null)
    await expect(
      resolveStepAbortIdempotencyReplay(fakeClient, {
        ...abortInput,
        currentStatus: 'PENDING',
      }),
    ).resolves.toEqual({ replay: false })
  })

  it('correspondência exata + estado coerente → replay true', async () => {
    eventsRepoMocks.getByIdempotencyKey.mockResolvedValue(eventRow())
    await expect(resolveStepAbortIdempotencyReplay(fakeClient, abortInput)).resolves.toEqual({
      replay: true,
    })
  })

  it('correspondência exata + estado incoerente → 409 e log técnico', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    eventsRepoMocks.getByIdempotencyKey.mockResolvedValue(eventRow())
    await expect(
      resolveStepAbortIdempotencyReplay(fakeClient, {
        ...abortInput,
        currentStatus: 'PENDING',
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' })
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('outro event_type → 409 sem replay', async () => {
    eventsRepoMocks.getByIdempotencyKey.mockResolvedValue(
      eventRow({ event_type: 'CONVEYOR_STEP_COMPLETED' }),
    )
    const err = await resolveStepAbortIdempotencyReplay(fakeClient, abortInput).catch((e) => e)
    expect(err).toBeInstanceOf(AppError)
    expect(err).toMatchObject({ statusCode: 409, code: 'CONFLICT' })
  })

  it('outro conveyor_id → 409', async () => {
    eventsRepoMocks.getByIdempotencyKey.mockResolvedValue(
      eventRow({ conveyor_id: OTHER_CONVEYOR_ID }),
    )
    await expect(
      resolveStepAbortIdempotencyReplay(fakeClient, abortInput),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' })
  })

  it('outro node_id → 409', async () => {
    eventsRepoMocks.getByIdempotencyKey.mockResolvedValue(eventRow({ node_id: OTHER_STEP_ID }))
    await expect(
      resolveStepAbortIdempotencyReplay(fakeClient, abortInput),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' })
  })

  it('restore: evento de abort com a mesma chave → 409', async () => {
    eventsRepoMocks.getByIdempotencyKey.mockResolvedValue(eventRow())
    await expect(
      resolveStepAbortIdempotencyReplay(fakeClient, {
        idempotencyKey: KEY,
        expectedEventType: 'CONVEYOR_STEP_RESTORED',
        conveyorId: CONVEYOR_ID,
        stepNodeId: STEP_ID,
        currentStatus: 'REOPENED',
        expectedStatusAfterOperation: 'REOPENED',
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' })
  })
})

/**
 * Fake de pool com semântica `max: 1`: `pool.query` com client retido é
 * exatamente o deadlock que a Correção 2 elimina.
 */
function createFakePool(): { pool: pg.Pool; sequence: string[] } {
  const sequence: string[] = []
  let checkedOut = 0

  const client = {
    query: async (text: unknown) => {
      const sql = typeof text === 'string' ? text : String((text as { text?: string })?.text ?? '')
      sequence.push(`client.query:${sql.trim().split(/\s+/)[0]?.toUpperCase() ?? ''}`)
      return { rows: [], rowCount: 0 }
    },
    release: () => {
      checkedOut -= 1
      sequence.push('client.release')
    },
  }

  const pool = {
    connect: async () => {
      if (checkedOut >= 1) {
        throw new Error('FAKE_POOL_EXHAUSTED: connect com client retido (max: 1)')
      }
      checkedOut += 1
      sequence.push('pool.connect')
      return client
    },
    query: async () => {
      if (checkedOut >= 1) {
        throw new Error('FAKE_POOL_EXHAUSTED: pool.query com client retido (max: 1)')
      }
      sequence.push('pool.query')
      return { rows: [], rowCount: 0 }
    },
  }

  return { pool: pool as unknown as pg.Pool, sequence }
}

describe('abort/restore liberam o PoolClient antes de carregar o detalhe', () => {
  let fake: ReturnType<typeof createFakePool>

  beforeEach(() => {
    fake = createFakePool()

    eventsRepoMocks.getByIdempotencyKey.mockReset()
    eventsServiceMocks.createEvent.mockReset()
    permissionsMocks.appUserHasPermission.mockReset()
    lockMocks.lockConveyorAndStepForUpdate.mockReset()
    conveyorsRepoMocks.findConveyorById.mockReset()
    conveyorsRepoMocks.listConveyorNodesByConveyorId.mockReset()
    conveyorsRepoMocks.updateConveyorNodeStepAborted.mockReset()
    conveyorsRepoMocks.updateConveyorNodeStepRestoreAborted.mockReset()
    conveyorsServiceMocks.loadConveyorStructureWithAssignees.mockReset()
    conveyorsServiceMocks.mapDetailRowToApi.mockReset()
    stepAbortReasonsRepoMocks.findStepAbortReasonByCode.mockReset()

    permissionsMocks.appUserHasPermission.mockResolvedValue(true)
    conveyorsRepoMocks.updateConveyorNodeStepAborted.mockResolvedValue(true)
    conveyorsRepoMocks.updateConveyorNodeStepRestoreAborted.mockResolvedValue(true)
    stepAbortReasonsRepoMocks.findStepAbortReasonByCode.mockImplementation(
      async (_q: unknown, code: string) => ({
        code,
        label: code === 'OUTRO' ? 'Outro' : 'Motivo teste',
        description: null,
        requires_complement: code === 'OUTRO',
        sort_order: 10,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }),
    )
    eventsServiceMocks.createEvent.mockImplementation(
      async (_q: unknown, payload: { eventType: string }) => ({
        created: true,
        event: eventRow({
          event_type: payload.eventType as ConveyorOperationalEventRow['event_type'],
        }),
      }),
    )

    // `loadDetail` usa o pool: cada leitura passa pelo fake para entrar na sequência.
    conveyorsRepoMocks.findConveyorById.mockImplementation(async (pool: pg.Pool) => {
      await pool.query('SELECT conveyor detail')
      return { id: CONVEYOR_ID }
    })
    conveyorsRepoMocks.listConveyorNodesByConveyorId.mockImplementation(async (pool: pg.Pool) => {
      await pool.query('SELECT conveyor nodes')
      return []
    })
    conveyorsServiceMocks.loadConveyorStructureWithAssignees.mockResolvedValue({ options: [] })
    conveyorsServiceMocks.mapDetailRowToApi.mockReturnValue({ id: CONVEYOR_ID })
  })

  function lockedStep(operationalStatus: string): void {
    lockMocks.lockConveyorAndStepForUpdate.mockResolvedValue({
      conveyor: { id: CONVEYOR_ID, operational_status: 'EM_ANDAMENTO' },
      step: {
        id: STEP_ID,
        conveyor_id: CONVEYOR_ID,
        node_type: 'STEP',
        operational_status: operationalStatus,
        operational_completed_at: null,
        operational_completed_by: null,
        aborted_at: null,
        aborted_by: null,
        abort_reason_code: null,
        abort_reason_text: null,
        abort_reason_label_snapshot: null,
      },
    })
  }

  function assertReleaseBeforePoolQuery(sequence: string[]): void {
    const releaseIndex = sequence.indexOf('client.release')
    const poolQueryIndex = sequence.indexOf('pool.query')
    expect(releaseIndex).toBeGreaterThanOrEqual(0)
    expect(poolQueryIndex).toBeGreaterThanOrEqual(0)
    expect(releaseIndex).toBeLessThan(poolQueryIndex)
  }

  it('abort caminho normal: release antes da primeira consulta de loadDetail', async () => {
    lockedStep('PENDING')
    eventsRepoMocks.getByIdempotencyKey.mockResolvedValue(null)

    const out = await serviceAbortConveyorStep(fake.pool, {
      conveyorId: CONVEYOR_ID,
      stepNodeId: STEP_ID,
      actorAppUserId: ACTOR_ID,
      idempotencyKey: KEY,
      reasonCode: 'NAO_MAIS_NECESSARIA',
    })

    expect(out.idempotent).toBe(false)
    expect(fake.sequence).toContain('client.query:COMMIT')
    assertReleaseBeforePoolQuery(fake.sequence)
  })

  it('abort replay: release antes da primeira consulta de loadDetail', async () => {
    lockedStep('ABORTED')
    eventsRepoMocks.getByIdempotencyKey.mockResolvedValue(eventRow())

    const out = await serviceAbortConveyorStep(fake.pool, {
      conveyorId: CONVEYOR_ID,
      stepNodeId: STEP_ID,
      actorAppUserId: ACTOR_ID,
      idempotencyKey: KEY,
      reasonCode: 'NAO_MAIS_NECESSARIA',
    })

    expect(out.idempotent).toBe(true)
    expect(eventsServiceMocks.createEvent).not.toHaveBeenCalled()
    expect(conveyorsRepoMocks.updateConveyorNodeStepAborted).not.toHaveBeenCalled()
    assertReleaseBeforePoolQuery(fake.sequence)
  })

  it('restore caminho normal: release antes da primeira consulta de loadDetail', async () => {
    lockedStep('ABORTED')
    eventsRepoMocks.getByIdempotencyKey.mockResolvedValue(null)

    const out = await serviceRestoreAbortedConveyorStep(fake.pool, {
      conveyorId: CONVEYOR_ID,
      stepNodeId: STEP_ID,
      actorAppUserId: ACTOR_ID,
      idempotencyKey: KEY,
    })

    expect(out.idempotent).toBe(false)
    expect(fake.sequence).toContain('client.query:COMMIT')
    assertReleaseBeforePoolQuery(fake.sequence)
  })

  it('restore replay: release antes da primeira consulta de loadDetail', async () => {
    lockedStep('REOPENED')
    eventsRepoMocks.getByIdempotencyKey.mockResolvedValue(
      eventRow({ event_type: 'CONVEYOR_STEP_RESTORED', new_value: 'REOPENED' }),
    )

    const out = await serviceRestoreAbortedConveyorStep(fake.pool, {
      conveyorId: CONVEYOR_ID,
      stepNodeId: STEP_ID,
      actorAppUserId: ACTOR_ID,
      idempotencyKey: KEY,
    })

    expect(out.idempotent).toBe(true)
    expect(eventsServiceMocks.createEvent).not.toHaveBeenCalled()
    expect(conveyorsRepoMocks.updateConveyorNodeStepRestoreAborted).not.toHaveBeenCalled()
    assertReleaseBeforePoolQuery(fake.sequence)
  })

  it('abort: chave de outro STEP → 409 antes de qualquer mutação', async () => {
    lockedStep('PENDING')
    eventsRepoMocks.getByIdempotencyKey.mockResolvedValue(eventRow({ node_id: OTHER_STEP_ID }))

    await expect(
      serviceAbortConveyorStep(fake.pool, {
        conveyorId: CONVEYOR_ID,
        stepNodeId: STEP_ID,
        actorAppUserId: ACTOR_ID,
        idempotencyKey: KEY,
        reasonCode: 'NAO_MAIS_NECESSARIA',
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' })

    expect(conveyorsRepoMocks.updateConveyorNodeStepAborted).not.toHaveBeenCalled()
    expect(eventsServiceMocks.createEvent).not.toHaveBeenCalled()
    expect(fake.sequence).toContain('client.query:ROLLBACK')
    expect(fake.sequence).not.toContain('client.query:COMMIT')
    expect(fake.sequence).toContain('client.release')
  })

  it('abort: evento reutilizado divergente após criação → 409, log técnico e ROLLBACK', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    lockedStep('PENDING')
    eventsRepoMocks.getByIdempotencyKey.mockResolvedValue(null)
    eventsServiceMocks.createEvent.mockResolvedValue({
      created: false,
      event: eventRow({ conveyor_id: OTHER_CONVEYOR_ID }),
    })

    const err = await serviceAbortConveyorStep(fake.pool, {
      conveyorId: CONVEYOR_ID,
      stepNodeId: STEP_ID,
      actorAppUserId: ACTOR_ID,
      idempotencyKey: KEY,
      reasonCode: 'NAO_MAIS_NECESSARIA',
    }).catch((e) => e)
    expect(err).toBeInstanceOf(AppError)
    expect(err).toMatchObject({ statusCode: 409, code: 'CONFLICT' })
    expect(warnSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain(
      'conveyor_step_abort_reused_event_mismatch',
    )

    expect(fake.sequence).toContain('client.query:ROLLBACK')
    expect(fake.sequence).not.toContain('client.query:COMMIT')
    warnSpy.mockRestore()
  })

  it('restore: evento reutilizado divergente após criação → 409, log técnico e ROLLBACK', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    lockedStep('ABORTED')
    eventsRepoMocks.getByIdempotencyKey.mockResolvedValue(null)
    eventsServiceMocks.createEvent.mockResolvedValue({
      created: false,
      event: eventRow({ event_type: 'CONVEYOR_STEP_RESTORED', node_id: OTHER_STEP_ID }),
    })

    const err = await serviceRestoreAbortedConveyorStep(fake.pool, {
      conveyorId: CONVEYOR_ID,
      stepNodeId: STEP_ID,
      actorAppUserId: ACTOR_ID,
      idempotencyKey: KEY,
    }).catch((e) => e)
    expect(err).toBeInstanceOf(AppError)
    expect(err).toMatchObject({ statusCode: 409, code: 'CONFLICT' })
    expect(warnSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain(
      'conveyor_step_abort_reused_event_mismatch',
    )

    expect(fake.sequence).toContain('client.query:ROLLBACK')
    expect(fake.sequence).not.toContain('client.query:COMMIT')
    warnSpy.mockRestore()
  })

  it('abort replay: esteira FINALIZADA não bloqueia repetição da mesma chave', async () => {
    lockMocks.lockConveyorAndStepForUpdate.mockResolvedValue({
      conveyor: { id: CONVEYOR_ID, operational_status: 'FINALIZADA' },
      step: {
        id: STEP_ID,
        conveyor_id: CONVEYOR_ID,
        node_type: 'STEP',
        operational_status: 'ABORTED',
        operational_completed_at: null,
        operational_completed_by: null,
        aborted_at: null,
        aborted_by: null,
        abort_reason_code: null,
        abort_reason_text: null,
        abort_reason_label_snapshot: null,
      },
    })
    eventsRepoMocks.getByIdempotencyKey.mockResolvedValue(eventRow())

    const out = await serviceAbortConveyorStep(fake.pool, {
      conveyorId: CONVEYOR_ID,
      stepNodeId: STEP_ID,
      actorAppUserId: ACTOR_ID,
      idempotencyKey: KEY,
      reasonCode: 'NAO_MAIS_NECESSARIA',
    })

    expect(out.idempotent).toBe(true)
    expect(conveyorsRepoMocks.updateConveyorNodeStepAborted).not.toHaveBeenCalled()
    expect(eventsServiceMocks.createEvent).not.toHaveBeenCalled()
  })

  it('abort chave nova: esteira FINALIZADA continua rejeitando 409', async () => {
    lockMocks.lockConveyorAndStepForUpdate.mockResolvedValue({
      conveyor: { id: CONVEYOR_ID, operational_status: 'FINALIZADA' },
      step: {
        id: STEP_ID,
        conveyor_id: CONVEYOR_ID,
        node_type: 'STEP',
        operational_status: 'PENDING',
        operational_completed_at: null,
        operational_completed_by: null,
        aborted_at: null,
        aborted_by: null,
        abort_reason_code: null,
        abort_reason_text: null,
        abort_reason_label_snapshot: null,
      },
    })
    eventsRepoMocks.getByIdempotencyKey.mockResolvedValue(null)

    await expect(
      serviceAbortConveyorStep(fake.pool, {
        conveyorId: CONVEYOR_ID,
        stepNodeId: STEP_ID,
        actorAppUserId: ACTOR_ID,
        idempotencyKey: KEY,
        reasonCode: 'NAO_MAIS_NECESSARIA',
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' })

    expect(conveyorsRepoMocks.updateConveyorNodeStepAborted).not.toHaveBeenCalled()
  })
})
