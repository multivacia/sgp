/**
 * Unitários sem DB: exigência de motivo fora do backlog + late-append na coluna reason.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../shared/errors/AppError.js'

const repoMocks = vi.hoisted(() => ({
  findConveyorById: vi.fn(),
  updateConveyorDados: vi.fn(),
  listActiveConveyorNodesByConveyorId: vi.fn(),
  lockConveyorForStructureUpdate: vi.fn(),
  insertConveyorNode: vi.fn(),
  updateConveyorNodeStructureFields: vi.fn(),
  hardDeleteAssigneesForNodes: vi.fn(),
  softDeactivateConveyorNodes: vi.fn(),
  hardDeleteConveyorNodeSubtree: vi.fn(),
  findNodeIdsWithStructureDeps: vi.fn(),
  updateConveyorStructureMeta: vi.fn(),
}))

const eventsMocks = vi.hoisted(() => ({
  createEvent: vi.fn(),
}))

const delayMocks = vi.hoisted(() => ({
  detectAndRecordConveyorDelayTransition: vi.fn(),
}))

const workloadMocks = vi.hoisted(() => ({
  serviceGetConveyorPendingMinutes: vi.fn(),
}))

const assignmentsMocks = vi.hoisted(() => ({
  listConveyorNodeAssigneesForConveyorDetail: vi.fn(),
  insertConveyorNodeAssignee: vi.fn(),
  newAssignmentId: vi.fn(() => 'assign-1'),
}))

const assignmentsServiceMocks = vi.hoisted(() => ({
  collaboratorActiveForOperations: vi.fn(),
}))

const matrixMocks = vi.hoisted(() => ({
  collaboratorExists: vi.fn(),
}))

const teamsMocks = vi.hoisted(() => ({
  findTeamById: vi.fn(),
}))

const diffMocks = vi.hoisted(() => ({
  computeConveyorStructureDiff: vi.fn(),
}))

vi.mock('../modules/conveyors/conveyors.repository.js', async () => {
  const actual = await vi.importActual<
    typeof import('../modules/conveyors/conveyors.repository.js')
  >('../modules/conveyors/conveyors.repository.js')
  return {
    ...actual,
    findConveyorById: repoMocks.findConveyorById,
    updateConveyorDados: repoMocks.updateConveyorDados,
    listActiveConveyorNodesByConveyorId: repoMocks.listActiveConveyorNodesByConveyorId,
    lockConveyorForStructureUpdate: repoMocks.lockConveyorForStructureUpdate,
    insertConveyorNode: repoMocks.insertConveyorNode,
    updateConveyorNodeStructureFields: repoMocks.updateConveyorNodeStructureFields,
    hardDeleteAssigneesForNodes: repoMocks.hardDeleteAssigneesForNodes,
    softDeactivateConveyorNodes: repoMocks.softDeactivateConveyorNodes,
    hardDeleteConveyorNodeSubtree: repoMocks.hardDeleteConveyorNodeSubtree,
    findNodeIdsWithStructureDeps: repoMocks.findNodeIdsWithStructureDeps,
    updateConveyorStructureMeta: repoMocks.updateConveyorStructureMeta,
  }
})

vi.mock('../modules/conveyors/operational-events/conveyor-operational-events.service.js', () => ({
  serviceCreateConveyorOperationalEvent: eventsMocks.createEvent,
  serviceListConveyorOperationalEvents: vi.fn(),
  loadConveyorOperationalEventsForHealthSnapshot: vi.fn(),
}))

vi.mock('../modules/conveyors/operational-events/conveyor-delay-events.service.js', () => ({
  detectAndRecordConveyorDelayTransition: delayMocks.detectAndRecordConveyorDelayTransition,
}))

vi.mock('../modules/conveyors/conveyorNodeWorkload.service.js', () => ({
  serviceGetConveyorPendingMinutes: workloadMocks.serviceGetConveyorPendingMinutes,
}))

vi.mock('../modules/conveyors/conveyorAssignments.repository.js', async () => {
  const actual = await vi.importActual<
    typeof import('../modules/conveyors/conveyorAssignments.repository.js')
  >('../modules/conveyors/conveyorAssignments.repository.js')
  return {
    ...actual,
    listConveyorNodeAssigneesForConveyorDetail:
      assignmentsMocks.listConveyorNodeAssigneesForConveyorDetail,
    insertConveyorNodeAssignee: assignmentsMocks.insertConveyorNodeAssignee,
    newAssignmentId: assignmentsMocks.newAssignmentId,
  }
})

vi.mock('../modules/conveyors/conveyorAssignments.service.js', async () => {
  const actual = await vi.importActual<
    typeof import('../modules/conveyors/conveyorAssignments.service.js')
  >('../modules/conveyors/conveyorAssignments.service.js')
  return {
    ...actual,
    collaboratorActiveForOperations: assignmentsServiceMocks.collaboratorActiveForOperations,
  }
})

vi.mock('../modules/operation-matrix/operation-matrix.repository.js', async () => {
  const actual = await vi.importActual<
    typeof import('../modules/operation-matrix/operation-matrix.repository.js')
  >('../modules/operation-matrix/operation-matrix.repository.js')
  return {
    ...actual,
    collaboratorExists: matrixMocks.collaboratorExists,
  }
})

vi.mock('../modules/teams/teams.repository.js', async () => {
  const actual = await vi.importActual<
    typeof import('../modules/teams/teams.repository.js')
  >('../modules/teams/teams.repository.js')
  return {
    ...actual,
    findTeamById: teamsMocks.findTeamById,
  }
})

vi.mock('../modules/conveyors/conveyor-structure-diff.js', async () => {
  const actual = await vi.importActual<
    typeof import('../modules/conveyors/conveyor-structure-diff.js')
  >('../modules/conveyors/conveyor-structure-diff.js')
  return {
    ...actual,
    computeConveyorStructureDiff: diffMocks.computeConveyorStructureDiff,
  }
})

import {
  serviceApplyConveyorStructureDiff,
  servicePatchConveyorDados,
} from '../modules/conveyors/conveyors.service.js'

function conveyorRow(status: string) {
  return {
    id: 'c-1',
    name: 'Esteira',
    client_name: null,
    vehicle: null,
    model_version: null,
    plate: null,
    initial_notes: null,
    responsible: null,
    estimated_deadline: null,
    priority: 'media',
    origin_register: 'MANUAL',
    base_ref_snapshot: null,
    base_code_snapshot: null,
    base_name_snapshot: null,
    base_version_snapshot: null,
    metadata_json: null,
    operational_status: status,
    created_at: new Date(),
    updated_at: new Date(),
    completed_at: null,
    total_options: 1,
    total_areas: 1,
    total_steps: 1,
    total_planned_minutes: 30,
  }
}

function mockTxnPool() {
  const client = {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    release: vi.fn(),
  }
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
  }
  return { pool, client }
}

describe('servicePatchConveyorDados — justificativa fora do backlog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    workloadMocks.serviceGetConveyorPendingMinutes.mockResolvedValue(0)
    delayMocks.detectAndRecordConveyorDelayTransition.mockResolvedValue(undefined)
    repoMocks.listActiveConveyorNodesByConveyorId.mockResolvedValue([])
    assignmentsMocks.listConveyorNodeAssigneesForConveyorDetail.mockResolvedValue([])
    eventsMocks.createEvent.mockResolvedValue({ created: true, event: {} })
  })

  it('EM_ELABORACAO ok sem reason e não emite MANUAL_NOTE', async () => {
    const row = conveyorRow('EM_ELABORACAO')
    repoMocks.findConveyorById.mockResolvedValue(row)
    repoMocks.updateConveyorDados.mockResolvedValue({ ...row, name: 'Novo' })
    const { pool, client } = mockTxnPool()

    await servicePatchConveyorDados(pool as never, 'c-1', { nome: 'Novo' })

    expect(repoMocks.updateConveyorDados).toHaveBeenCalledWith(
      client,
      'c-1',
      expect.objectContaining({ name: 'Novo' }),
    )
    const patchArg = repoMocks.updateConveyorDados.mock.calls[0]![2] as Record<string, unknown>
    expect(patchArg).not.toHaveProperty('reason')
    expect(eventsMocks.createEvent).not.toHaveBeenCalled()
    expect(client.query).toHaveBeenCalledWith('BEGIN')
    expect(client.query).toHaveBeenCalledWith('COMMIT')
  })

  it('EM_ANDAMENTO sem reason → 422', async () => {
    repoMocks.findConveyorById.mockResolvedValue(conveyorRow('EM_ANDAMENTO'))
    await expect(
      servicePatchConveyorDados({} as never, 'c-1', { nome: 'Novo' }),
    ).rejects.toMatchObject({
      statusCode: 422,
      message: 'Motivo deve ter entre 3 e 500 caracteres.',
    } satisfies Partial<AppError>)
    expect(repoMocks.updateConveyorDados).not.toHaveBeenCalled()
  })

  it('EM_ANDAMENTO com reason → MANUAL_NOTE com coluna CONVEYOR_EDIT e metadata.reason', async () => {
    const row = conveyorRow('EM_ANDAMENTO')
    repoMocks.findConveyorById.mockResolvedValue(row)
    repoMocks.updateConveyorDados.mockResolvedValue({ ...row, name: 'Novo' })
    const { pool, client } = mockTxnPool()

    await servicePatchConveyorDados(
      pool as never,
      'c-1',
      { nome: 'Novo', reason: 'Correção solicitada pelo gestor' },
      { actorUserId: 'user-1' },
    )

    expect(eventsMocks.createEvent).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        eventType: 'MANUAL_NOTE',
        reason: 'CONVEYOR_EDIT',
        createdBy: 'user-1',
        metadataJson: expect.objectContaining({
          kind: 'CONVEYOR_EDIT',
          section: 'DATA',
          changedFields: ['nome'],
          reason: 'Correção solicitada pelo gestor',
        }),
      }),
    )
    expect(repoMocks.updateConveyorDados).toHaveBeenCalledWith(
      client,
      'c-1',
      expect.objectContaining({ name: 'Novo' }),
    )
    expect(delayMocks.detectAndRecordConveyorDelayTransition).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ conveyorId: 'c-1' }),
    )
  })

  it('rollback quando createEvent falha após update', async () => {
    const row = conveyorRow('EM_ANDAMENTO')
    repoMocks.findConveyorById.mockResolvedValue(row)
    repoMocks.updateConveyorDados.mockResolvedValue({ ...row, name: 'Novo' })
    eventsMocks.createEvent.mockRejectedValue(new Error('evento falhou'))
    const { pool, client } = mockTxnPool()

    await expect(
      servicePatchConveyorDados(
        pool as never,
        'c-1',
        { nome: 'Novo', reason: 'Correção solicitada pelo gestor' },
        { actorUserId: 'user-1' },
      ),
    ).rejects.toThrow('evento falhou')

    expect(client.query).toHaveBeenCalledWith('BEGIN')
    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
    expect(client.query).not.toHaveBeenCalledWith('COMMIT')
    expect(eventsMocks.createEvent).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ eventType: 'MANUAL_NOTE' }),
    )
    expect(client.release).toHaveBeenCalled()
  })

  it('sem mudança efetiva: EM_ANDAMENTO body igual ao persistido sem reason → OK', async () => {
    const row = conveyorRow('EM_ANDAMENTO')
    repoMocks.findConveyorById.mockResolvedValue(row)

    const result = await servicePatchConveyorDados({} as never, 'c-1', { nome: 'Esteira' })

    expect(result).toMatchObject({ id: 'c-1', name: 'Esteira' })
    expect(repoMocks.updateConveyorDados).not.toHaveBeenCalled()
    expect(eventsMocks.createEvent).not.toHaveBeenCalled()
    expect(delayMocks.detectAndRecordConveyorDelayTransition).not.toHaveBeenCalled()
  })

  it('trim igual ao persistido não conta como mudança; nome diferente + reason atualiza e emite evento', async () => {
    const row = conveyorRow('EM_ANDAMENTO')
    repoMocks.findConveyorById.mockResolvedValue(row)

    await servicePatchConveyorDados({} as never, 'c-1', { nome: '  Esteira  ' })
    expect(repoMocks.updateConveyorDados).not.toHaveBeenCalled()
    expect(eventsMocks.createEvent).not.toHaveBeenCalled()

    repoMocks.updateConveyorDados.mockResolvedValue({ ...row, name: 'Outro' })
    const { pool, client } = mockTxnPool()
    await servicePatchConveyorDados(
      pool as never,
      'c-1',
      { nome: 'Outro', reason: 'Ajuste de nomenclatura' },
      { actorUserId: 'user-2' },
    )

    expect(repoMocks.updateConveyorDados).toHaveBeenCalledWith(
      client,
      'c-1',
      expect.objectContaining({ name: 'Outro' }),
    )
    expect(eventsMocks.createEvent).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        eventType: 'MANUAL_NOTE',
        metadataJson: expect.objectContaining({
          changedFields: ['nome'],
          reason: 'Ajuste de nomenclatura',
        }),
      }),
    )
  })
})

describe('serviceApplyConveyorStructureDiff — justificativa fora do backlog', () => {
  const structureBody = {
    originType: 'MANUAL' as const,
    options: [
      {
        titulo: 'Opção A',
        orderIndex: 1,
        sourceOrigin: 'manual' as const,
        areas: [
          {
            titulo: 'Área 1',
            orderIndex: 1,
            sourceOrigin: 'manual' as const,
            steps: [
              {
                titulo: 'Etapa 1',
                orderIndex: 1,
                plannedMinutes: 30,
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

  beforeEach(() => {
    vi.clearAllMocks()
    repoMocks.listActiveConveyorNodesByConveyorId.mockResolvedValue([])
    assignmentsMocks.listConveyorNodeAssigneesForConveyorDetail.mockResolvedValue([])
    eventsMocks.createEvent.mockResolvedValue({ created: true, event: {} })
    assignmentsServiceMocks.collaboratorActiveForOperations.mockResolvedValue(true)
  })

  it('EM_ANDAMENTO sem reason → 422', async () => {
    repoMocks.findConveyorById.mockResolvedValue(conveyorRow('EM_ANDAMENTO'))
    await expect(
      serviceApplyConveyorStructureDiff({} as never, 'c-1', structureBody),
    ).rejects.toMatchObject({
      statusCode: 422,
      message: 'Motivo deve ter entre 3 e 500 caracteres.',
    } satisfies Partial<AppError>)
  })

  it('EM_ANDAMENTO com reason → coluna INCREMENTAL_STRUCTURE_EDIT + metadata.reason', async () => {
    const row = conveyorRow('EM_ANDAMENTO')
    repoMocks.findConveyorById.mockResolvedValue(row)
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    }
    const pool = {
      connect: vi.fn().mockResolvedValue(client),
    }
    repoMocks.lockConveyorForStructureUpdate.mockResolvedValue(row)
    diffMocks.computeConveyorStructureDiff.mockReturnValue({
      diff: {
        inserts: [],
        updates: [],
        removals: [],
        matchedStepIds: [],
      },
    })
    repoMocks.updateConveyorStructureMeta.mockResolvedValue(undefined)

    await serviceApplyConveyorStructureDiff(
      pool as never,
      'c-1',
      { ...structureBody, reason: 'Ajuste estrutural justificado' },
      { actorUserId: 'user-9' },
    )

    expect(eventsMocks.createEvent).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        eventType: 'CONVEYOR_STRUCTURE_UPDATED',
        reason: 'INCREMENTAL_STRUCTURE_EDIT',
        createdBy: 'user-9',
        metadataJson: expect.objectContaining({
          reason: 'Ajuste estrutural justificado',
        }),
      }),
    )
  })
})
