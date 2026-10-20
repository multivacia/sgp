import { afterEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import * as authRepo from '../modules/auth/auth.repository.js'
import * as seqRepo from '../modules/conveyors/conveyors.repository.js'
import * as activitiesRepo from '../modules/my-activities/my-activities.repository.js'
import type { TimeEntryCandidatePageRow } from '../modules/my-activities/my-activities.repository.js'
import { serviceListTimeEntryCandidates } from '../modules/my-activities/my-activities.service.js'

const COLLABORATOR_ID = '00000000-0000-0000-0000-000000000002'
const USER_ID = '00000000-0000-0000-0000-000000000001'
const CONVEYOR_ID = '00000000-0000-0000-0000-000000000004'
const STEP_STRUCTURAL = '00000000-0000-0000-0000-000000000010'
const STEP_PLAN_ONLY = '00000000-0000-0000-0000-000000000011'
const STEP_BOTH = '00000000-0000-0000-0000-000000000012'

function candidateRow(
  stepNodeId: string,
  overrides: Partial<TimeEntryCandidatePageRow> = {},
): TimeEntryCandidatePageRow {
  return {
    assignee_id: `assignee-${stepNodeId}`,
    conveyor_id: CONVEYOR_ID,
    conveyor_code: null,
    conveyor_name: 'Esteira teste',
    client_name: 'Cliente',
    vehicle_label: 'Carro',
    plate: 'ABC1D23',
    step_node_id: stepNodeId,
    step_name: `Atividade ${stepNodeId.slice(-2)}`,
    area_name: 'Setor',
    option_name: 'Tarefa',
    is_primary: true,
    assignment_type: 'COLLABORATOR',
    planned_minutes: '30',
    planned_quantity: '1',
    realized_minutes: '0',
    opt_order_index: '1',
    area_order_index: '1',
    step_order_index: '1',
    planned_date: null,
    source_rank: 0,
    k_overdue: 0,
    k_planned_date: '1900-01-01',
    k_planned_order: 0,
    k_opt: 1,
    k_area: 1,
    k_step: 1,
    ...overrides,
  }
}

/** A consulta paginada já devolve as origens unidas e deduplicadas (ver integração). */
function mockCandidatePage(rows: TimeEntryCandidatePageRow[]) {
  return vi.spyOn(activitiesRepo, 'listTimeEntryCandidatesPage').mockResolvedValue(rows)
}

function mockSequenceNodes() {
  vi.spyOn(seqRepo, 'listConveyorNodesForSequenceAnalysis').mockResolvedValue([
    {
      id: STEP_STRUCTURAL,
      parent_id: 'area-1',
      node_type: 'STEP',
      order_index: 1,
      name: 'A',
      operational_status: 'PENDING',
      is_active: true,
    },
    {
      id: STEP_PLAN_ONLY,
      parent_id: 'area-1',
      node_type: 'STEP',
      order_index: 2,
      name: 'B',
      operational_status: 'PENDING',
      is_active: true,
    },
    {
      id: STEP_BOTH,
      parent_id: 'area-1',
      node_type: 'STEP',
      order_index: 3,
      name: 'C',
      operational_status: 'PENDING',
      is_active: true,
    },
  ] as never)
  vi.spyOn(seqRepo, 'listPlannedCollaboratorsByActivityNode').mockResolvedValue(new Map())
}

describe('serviceListTimeEntryCandidates — alocação estrutural vs plano semanal', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('retorna indisponível quando usuário não possui collaboratorId', async () => {
    const result = await serviceListTimeEntryCandidates({} as pg.Pool, {
      collaboratorId: null,
      q: null,
      limit: 50,
      includeUnassigned: false,
    })

    expect(result.items).toEqual([])
    expect(result.unavailableReason).toContain('não está vinculada a um colaborador operacional')
  })

  it('inclui atividade atribuída apenas pela estrutura', async () => {
    mockCandidatePage([candidateRow(STEP_STRUCTURAL)])
    mockSequenceNodes()

    const result = await serviceListTimeEntryCandidates({} as pg.Pool, {
      collaboratorId: COLLABORATOR_ID,
      q: null,
      limit: 50,
      includeUnassigned: false,
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.stepNodeId).toBe(STEP_STRUCTURAL)
    expect(result.items[0]?.isAssignedToMe).toBe(true)
    expect(result.items[0]?.requiresJustification).toBe(false)
  })

  it('inclui atividade atribuída apenas pelo plano semanal publicado', async () => {
    mockCandidatePage([
      candidateRow(STEP_PLAN_ONLY, {
        assignee_id: '',
        is_primary: false,
        planned_date: '2026-07-02',
        source_rank: 1,
      }),
    ])
    mockSequenceNodes()

    const result = await serviceListTimeEntryCandidates({} as pg.Pool, {
      collaboratorId: COLLABORATOR_ID,
      q: null,
      limit: 50,
      includeUnassigned: false,
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.stepNodeId).toBe(STEP_PLAN_ONLY)
    expect(result.items[0]?.isAssignedToMe).toBe(true)
    expect(result.items[0]?.requiresJustification).toBe(false)
    expect(result.items[0]?.plannedDate).toBe('2026-07-02')
  })

  it('origem fora da alocação exige justificativa; demais origens não', async () => {
    mockCandidatePage([
      candidateRow(STEP_BOTH, { is_primary: true }),
      candidateRow(STEP_STRUCTURAL, { assignee_id: '', is_primary: false, source_rank: 2 }),
    ])
    mockSequenceNodes()

    const result = await serviceListTimeEntryCandidates({} as pg.Pool, {
      collaboratorId: COLLABORATOR_ID,
      q: 'Esteira',
      limit: 50,
      includeUnassigned: true,
    })

    expect(result.items.map((i) => [i.stepNodeId, i.isAssignedToMe, i.requiresJustification])).toEqual([
      [STEP_BOTH, true, false],
      [STEP_STRUCTURAL, false, true],
    ])
    expect(result.items[0]?.roleInStep).toBe('primary')
  })

  it('busca página + 1; nextCursor vem do último item devolvido (não da linha extra)', async () => {
    const spy = mockCandidatePage([
      candidateRow(STEP_STRUCTURAL, { k_step: 1 }),
      candidateRow(STEP_PLAN_ONLY, { k_step: 2 }),
      candidateRow(STEP_BOTH, { k_step: 3 }),
    ])
    mockSequenceNodes()

    const result = await serviceListTimeEntryCandidates({} as pg.Pool, {
      collaboratorId: COLLABORATOR_ID,
      q: null,
      limit: 2,
      includeUnassigned: false,
    })

    expect(spy.mock.calls[0]?.[1]).toMatchObject({ fetchLimit: 3, after: null, includeUnassigned: false })
    expect(result.items.map((i) => i.stepNodeId)).toEqual([STEP_STRUCTURAL, STEP_PLAN_ONLY])
    expect(result.nextCursor).toBeTruthy()

    spy.mockClear()
    spy.mockResolvedValue([candidateRow(STEP_BOTH, { k_step: 3 })])
    const next = await serviceListTimeEntryCandidates({} as pg.Pool, {
      collaboratorId: COLLABORATOR_ID,
      q: null,
      limit: 2,
      includeUnassigned: false,
      cursor: result.nextCursor,
    })
    expect(spy.mock.calls[0]?.[1]?.after).toEqual([0, 0, '1900-01-01', 0, 1, 1, 2, STEP_PLAN_ONLY])
    expect(next.items.map((i) => i.stepNodeId)).toEqual([STEP_BOTH])
    expect(next.nextCursor).toBeNull()
  })

  it('origem fora da alocação só é consultada com includeUnassigned e termo ≥ 2 caracteres', async () => {
    const spy = mockCandidatePage([])
    for (const [q, includeUnassigned, expected] of [
      ['ab', true, true],
      ['a', true, false],
      ['abc', false, false],
      [null, true, false],
    ] as const) {
      spy.mockClear()
      await serviceListTimeEntryCandidates({} as pg.Pool, {
        collaboratorId: COLLABORATOR_ID,
        q,
        limit: 50,
        includeUnassigned,
      })
      expect(spy.mock.calls[0]?.[1]?.includeUnassigned).toBe(expected)
    }
  })

  it('cursor inválido é rejeitado mesmo sem colaborador vinculado', async () => {
    await expect(
      serviceListTimeEntryCandidates({} as pg.Pool, {
        collaboratorId: null,
        q: null,
        limit: 50,
        includeUnassigned: false,
        cursor: 'inválido!',
      }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('marca atividade planejada em data anterior como atrasada', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-02T12:00:00'))
    mockCandidatePage([
      candidateRow(STEP_PLAN_ONLY, {
        assignee_id: '',
        planned_date: '2026-07-01',
        source_rank: 1,
      }),
    ])
    mockSequenceNodes()

    const result = await serviceListTimeEntryCandidates({} as pg.Pool, {
      collaboratorId: COLLABORATOR_ID,
      q: null,
      limit: 50,
      includeUnassigned: false,
    })

    expect(result.items[0]?.isOverdue).toBe(true)
    expect(result.items[0]?.plannedDate).toBe('2026-07-01')
    vi.useRealTimers()
  })

  it('resolve collaboratorId a partir de user_id no controller (via serviço)', async () => {
    vi.spyOn(authRepo, 'findCollaboratorIdByAppUserId').mockResolvedValue(COLLABORATOR_ID)
    mockCandidatePage([
      candidateRow(STEP_PLAN_ONLY, { assignee_id: '', planned_date: '2026-07-02', source_rank: 1 }),
    ])
    mockSequenceNodes()

    const collaboratorId = await authRepo.findCollaboratorIdByAppUserId({} as pg.Pool, USER_ID)
    const result = await serviceListTimeEntryCandidates({} as pg.Pool, {
      collaboratorId,
      q: null,
      limit: 50,
      includeUnassigned: false,
    })

    expect(collaboratorId).toBe(COLLABORATOR_ID)
    expect(result.items).toHaveLength(1)
  })
})
