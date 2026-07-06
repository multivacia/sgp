import { afterEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import * as authRepo from '../modules/auth/auth.repository.js'
import * as seqRepo from '../modules/conveyors/conveyors.repository.js'
import * as activitiesRepo from '../modules/my-activities/my-activities.repository.js'
import type { TimeEntryCandidateRawRow } from '../modules/my-activities/my-activities.repository.js'
import { serviceListTimeEntryCandidates } from '../modules/my-activities/my-activities.service.js'

const COLLABORATOR_ID = '00000000-0000-0000-0000-000000000002'
const USER_ID = '00000000-0000-0000-0000-000000000001'
const CONVEYOR_ID = '00000000-0000-0000-0000-000000000004'
const STEP_STRUCTURAL = '00000000-0000-0000-0000-000000000010'
const STEP_PLAN_ONLY = '00000000-0000-0000-0000-000000000011'
const STEP_BOTH = '00000000-0000-0000-0000-000000000012'

function candidateRow(
  stepNodeId: string,
  overrides: Partial<TimeEntryCandidateRawRow> = {},
): TimeEntryCandidateRawRow {
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
    ...overrides,
  }
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
    expect(result.unavailableReason).toContain('colaborador operacional vinculado')
  })

  it('inclui atividade atribuída apenas pela estrutura', async () => {
    vi.spyOn(activitiesRepo, 'listTimeEntryCandidatesForCollaborator').mockResolvedValue([
      candidateRow(STEP_STRUCTURAL),
    ])
    vi.spyOn(activitiesRepo, 'listTimeEntryCandidatesFromPublishedPlan').mockResolvedValue([])
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
    vi.spyOn(activitiesRepo, 'listTimeEntryCandidatesForCollaborator').mockResolvedValue([])
    vi.spyOn(activitiesRepo, 'listTimeEntryCandidatesFromPublishedPlan').mockResolvedValue([
      candidateRow(STEP_PLAN_ONLY, {
        assignee_id: '',
        is_primary: false,
        planned_date: '2026-07-02',
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

  it('não duplica atividade presente na estrutura e no plano', async () => {
    vi.spyOn(activitiesRepo, 'listTimeEntryCandidatesForCollaborator').mockResolvedValue([
      candidateRow(STEP_BOTH, { is_primary: true }),
    ])
    vi.spyOn(activitiesRepo, 'listTimeEntryCandidatesFromPublishedPlan').mockResolvedValue([
      candidateRow(STEP_BOTH, {
        assignee_id: 'assignee-structural',
        is_primary: false,
        planned_date: '2026-07-02',
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
    expect(result.items[0]?.stepNodeId).toBe(STEP_BOTH)
    expect(result.items[0]?.roleInStep).toBe('primary')
  })

  it('marca atividade planejada em data anterior como atrasada', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-02T12:00:00'))
    vi.spyOn(activitiesRepo, 'listTimeEntryCandidatesForCollaborator').mockResolvedValue([])
    vi.spyOn(activitiesRepo, 'listTimeEntryCandidatesFromPublishedPlan').mockResolvedValue([
      candidateRow(STEP_PLAN_ONLY, {
        assignee_id: '',
        planned_date: '2026-07-01',
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
    vi.spyOn(activitiesRepo, 'listTimeEntryCandidatesForCollaborator').mockResolvedValue([])
    vi.spyOn(activitiesRepo, 'listTimeEntryCandidatesFromPublishedPlan').mockResolvedValue([
      candidateRow(STEP_PLAN_ONLY, { assignee_id: '', planned_date: '2026-07-02' }),
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
