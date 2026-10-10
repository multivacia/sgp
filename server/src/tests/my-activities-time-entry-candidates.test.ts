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

describe('serviceListTimeEntryCandidates — somente atividades planejadas', () => {
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

  function mockPlanned(mine: TimeEntryCandidateRawRow[], others: TimeEntryCandidateRawRow[] = []) {
    return vi
      .spyOn(activitiesRepo, 'listPlannedTimeEntryCandidates')
      .mockImplementation(async (_pool, input) => (input.scope === 'mine' ? mine : others))
  }

  it('lista padrão: somente atividades planejadas para o colaborador', async () => {
    const spy = mockPlanned([
      candidateRow(STEP_PLAN_ONLY, { assignee_id: '', is_primary: false, planned_date: '2026-07-02' }),
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
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0]?.[1]).toMatchObject({ scope: 'mine', collaboratorId: COLLABORATOR_ID })
  })

  it('pesquisa de outras atividades (>= 2 caracteres) traz planejadas para outros, com justificativa', async () => {
    const spy = mockPlanned(
      [candidateRow(STEP_PLAN_ONLY)],
      [candidateRow(STEP_STRUCTURAL, { assignee_id: '', is_primary: false })],
    )
    mockSequenceNodes()

    const result = await serviceListTimeEntryCandidates({} as pg.Pool, {
      collaboratorId: COLLABORATOR_ID,
      q: 'At',
      limit: 50,
      includeUnassigned: true,
    })

    expect(spy).toHaveBeenCalledTimes(2)
    expect(result.items.map((i) => i.stepNodeId)).toEqual([STEP_PLAN_ONLY, STEP_STRUCTURAL])
    const other = result.items.find((i) => i.stepNodeId === STEP_STRUCTURAL)
    expect(other?.isAssignedToMe).toBe(false)
    expect(other?.requiresJustification).toBe(true)
  })

  it('pesquisa com menos de 2 caracteres não consulta atividades de outros', async () => {
    const spy = mockPlanned([], [candidateRow(STEP_STRUCTURAL)])
    mockSequenceNodes()

    const result = await serviceListTimeEntryCandidates({} as pg.Pool, {
      collaboratorId: COLLABORATOR_ID,
      q: 'A',
      limit: 50,
      includeUnassigned: true,
    })

    expect(result.items).toHaveLength(0)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('não duplica atividade que é do colaborador e também aparece na pesquisa', async () => {
    mockPlanned([candidateRow(STEP_BOTH, { is_primary: true })], [candidateRow(STEP_BOTH)])
    mockSequenceNodes()

    const result = await serviceListTimeEntryCandidates({} as pg.Pool, {
      collaboratorId: COLLABORATOR_ID,
      q: 'Atividade',
      limit: 50,
      includeUnassigned: true,
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.isAssignedToMe).toBe(true)
    expect(result.items[0]?.roleInStep).toBe('primary')
  })

  it('marca atividade planejada em data anterior como atrasada', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-02T15:00:00Z'))
    mockPlanned([candidateRow(STEP_PLAN_ONLY, { assignee_id: '', planned_date: '2026-07-01' })])
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
    mockPlanned([candidateRow(STEP_PLAN_ONLY, { assignee_id: '', planned_date: '2026-07-02' })])
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
