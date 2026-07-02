import { afterEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import * as authRepo from '../modules/auth/auth.repository.js'
import * as assigneesRepo from '../modules/my-work-queue/my-work-queue-step-assignees.repository.js'
import type { StepCollaboratorOwnership } from '../modules/my-work-queue/my-work-queue-step-assignees.repository.js'
import * as seqRepo from '../modules/conveyors/conveyors.repository.js'
import * as capacityService from '../modules/operational-settings/operational-settings.service.js'
import * as queueRepo from '../modules/my-work-queue/my-work-queue.repository.js'
import {
  groupWorkQueueItem,
  serviceGetMyWorkQueue,
  serviceGetWorkQueueForCollaborator,
} from '../modules/my-work-queue/my-work-queue.service.js'

const USER_ID = '00000000-0000-0000-0000-000000000001'
const COLLABORATOR_ID = '00000000-0000-0000-0000-000000000002'
const PLAN_ID = '00000000-0000-0000-0000-000000000003'
const CONVEYOR_ID = '00000000-0000-0000-0000-000000000004'
const PREVIOUS_STEP_ID = '00000000-0000-0000-0000-000000000005'
const TARGET_STEP_ID = '00000000-0000-0000-0000-000000000006'
const JOAO_ID = '00000000-0000-0000-0000-000000000101'
const MARIA_ID = '00000000-0000-0000-0000-000000000102'

function buildOwnershipIndex(
  assignments: Record<string, string | null>,
): Map<string, StepCollaboratorOwnership> {
  const index = new Map<string, StepCollaboratorOwnership>()
  for (const [stepId, collaboratorId] of Object.entries(assignments)) {
    if (!collaboratorId) {
      index.set(stepId, {
        collaboratorIds: new Set(),
        collaboratorNames: [],
        hasAssignee: false,
      })
      continue
    }
    index.set(stepId, {
      collaboratorIds: new Set([collaboratorId]),
      collaboratorNames: [
        collaboratorId === JOAO_ID ? 'João' : collaboratorId === MARIA_ID ? 'Maria' : 'Colaborador',
      ],
      hasAssignee: true,
    })
  }
  return index
}

function mockStepOwnership(assignments: Record<string, string | null>) {
  vi.spyOn(assigneesRepo, 'buildConveyorStepOwnershipIndex').mockResolvedValue(
    buildOwnershipIndex(assignments),
  )
}

describe('serviceGetMyWorkQueue', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('retorna fila vazia controlada quando usuário não possui collaboratorId', async () => {
    vi.spyOn(authRepo, 'findCollaboratorIdByAppUserId').mockResolvedValue(null)

    const result = await serviceGetMyWorkQueue({} as pg.Pool, {
      userId: USER_ID,
      date: '2026-05-04',
    })

    expect(result.data.items).toEqual([])
    expect(result.meta.collaboratorId).toBeNull()
    expect(result.meta.unavailableReason).toContain('colaborador operacional vinculado')
  })

  it('retorna vazio quando não há plano publicado na semana', async () => {
    vi.spyOn(authRepo, 'findCollaboratorIdByAppUserId').mockResolvedValue(COLLABORATOR_ID)
    vi.spyOn(queueRepo, 'findPublishedWorkPlanForWeek').mockResolvedValue(null)

    const result = await serviceGetMyWorkQueue({} as pg.Pool, {
      userId: USER_ID,
      date: '2026-05-04',
    })

    expect(queueRepo.findPublishedWorkPlanForWeek).toHaveBeenCalledWith({}, '2026-05-04')
    expect(result.data.planStatus).toBeNull()
    expect(result.data.items).toEqual([])
  })

  it('monta itens publicados com atrasadas, sequência, alocação e capacidade', async () => {
    vi.spyOn(authRepo, 'findCollaboratorIdByAppUserId').mockResolvedValue(COLLABORATOR_ID)
    vi.spyOn(queueRepo, 'findPublishedWorkPlanForWeek').mockResolvedValue({
      id: PLAN_ID,
      status: 'PUBLISHED',
      weekStartDate: '2026-05-04',
      weekEndDate: '2026-05-08',
    })
    vi.spyOn(queueRepo, 'listMyWorkQueueRows').mockResolvedValue([
      {
        work_plan_id: PLAN_ID,
        work_plan_item_id: 'item-overdue',
        planned_date: '2026-05-01',
        planned_order: 0,
        planned_minutes: 45,
        status: 'PLANNED',
        conveyor_id: CONVEYOR_ID,
        conveyor_operational_status: 'A_INICIAR',
        conveyor_title: '7452',
        client_name: 'Cliente A',
        vehicle_description: 'Veículo A',
        license_plate: 'ABC1D23',
        activity_node_id: TARGET_STEP_ID,
        activity_title: 'Remover banco esquerdo',
        task_title: 'Bancos dianteiros',
        sector_title: 'Desmontagem',
        activity_operational_status: 'PENDING',
        is_assigned_to_me: false,
      },
      {
        work_plan_id: PLAN_ID,
        work_plan_item_id: 'item-today-completed',
        planned_date: '2026-05-04',
        planned_order: 1,
        planned_minutes: 90,
        status: 'PLANNED',
        conveyor_id: CONVEYOR_ID,
        conveyor_operational_status: 'EM_ANDAMENTO',
        conveyor_title: '7452',
        client_name: null,
        vehicle_description: null,
        license_plate: null,
        activity_node_id: TARGET_STEP_ID,
        activity_title: 'Remover banco esquerdo',
        task_title: 'Bancos dianteiros',
        sector_title: 'Desmontagem',
        activity_operational_status: 'COMPLETED',
        is_assigned_to_me: true,
      },
    ])
    vi.spyOn(capacityService, 'serviceResolveCollaboratorDailyCapacity').mockResolvedValue({
      collaboratorId: COLLABORATOR_ID,
      date: '2026-05-04',
      defaultDailyMinutes: null,
      overrideDailyMinutes: null,
      resolvedDailyMinutes: 60,
      source: 'fallback',
    })
    const sequenceNodes: Awaited<
      ReturnType<typeof seqRepo.listConveyorNodesForSequenceAnalysis>
    > = [
      {
        id: 'option-1',
        parent_id: null,
        node_type: 'OPTION',
        order_index: 0,
        name: 'Bancos dianteiros',
        operational_status: null,
        is_active: true,
      },
      {
        id: 'area-1',
        parent_id: 'option-1',
        node_type: 'AREA',
        order_index: 0,
        name: 'Desmontagem',
        operational_status: null,
        is_active: true,
      },
      {
        id: PREVIOUS_STEP_ID,
        parent_id: 'area-1',
        node_type: 'STEP',
        order_index: 0,
        name: 'Remover capa',
        operational_status: 'PENDING',
        is_active: true,
      },
      {
        id: TARGET_STEP_ID,
        parent_id: 'area-1',
        node_type: 'STEP',
        order_index: 1,
        name: 'Remover banco esquerdo',
        operational_status: 'PENDING',
        is_active: true,
      },
    ]
    vi.spyOn(seqRepo, 'listConveyorNodesForSequenceAnalysis').mockResolvedValue(sequenceNodes)
    mockStepOwnership({
      [PREVIOUS_STEP_ID]: COLLABORATOR_ID,
      [TARGET_STEP_ID]: COLLABORATOR_ID,
    })

    const result = await serviceGetMyWorkQueue({} as pg.Pool, {
      userId: USER_ID,
      date: '2026-05-04',
    })

    expect(result.data.planStatus).toBe('PUBLISHED')
    expect(result.data.summary).toMatchObject({
      plannedItemsToday: 1,
      plannedMinutesToday: 90,
      overdueItems: 1,
      completedItemsToday: 1,
      outOfSequenceItems: 1,
      unassignedExceptionItems: 1,
      capacityMinutesToday: 60,
      overload: true,
    })
    expect(result.data.items[0]).toMatchObject({
      group: 'overdue',
      isOverdue: true,
      isOutOfSequence: true,
      isNextRecommended: false,
      requiresUnassignedJustification: true,
      previousOpenCount: 1,
    })
    expect(result.data.items[1]).toMatchObject({
      group: 'completed',
      isActivityCompleted: true,
      isOutOfSequence: false,
      isNextRecommended: false,
    })
  })
})

const STEP_A = '00000000-0000-0000-0000-000000000010'
const STEP_B = '00000000-0000-0000-0000-000000000011'
const STEP_C = '00000000-0000-0000-0000-000000000012'

function abcSequenceNodes(
  completedStepIds: readonly string[] = [],
): Awaited<ReturnType<typeof seqRepo.listConveyorNodesForSequenceAnalysis>> {
  const completed = new Set(completedStepIds)
  const stepStatus = (id: string) => (completed.has(id) ? 'COMPLETED' : 'PENDING')
  return [
    {
      id: 'option-1',
      parent_id: null,
      node_type: 'OPTION',
      order_index: 0,
      name: 'Tarefa',
      operational_status: null,
      is_active: true,
    },
    {
      id: 'area-1',
      parent_id: 'option-1',
      node_type: 'AREA',
      order_index: 0,
      name: 'Setor',
      operational_status: null,
      is_active: true,
    },
    {
      id: STEP_A,
      parent_id: 'area-1',
      node_type: 'STEP',
      order_index: 0,
      name: 'Atividade A',
      operational_status: stepStatus(STEP_A),
      is_active: true,
    },
    {
      id: STEP_B,
      parent_id: 'area-1',
      node_type: 'STEP',
      order_index: 1,
      name: 'Atividade B',
      operational_status: stepStatus(STEP_B),
      is_active: true,
    },
    {
      id: STEP_C,
      parent_id: 'area-1',
      node_type: 'STEP',
      order_index: 2,
      name: 'Atividade C',
      operational_status: stepStatus(STEP_C),
      is_active: true,
    },
  ]
}

function abcQueueRow(
  stepId: string,
  title: string,
  plannedOrder: number,
  status: string | null = 'PENDING',
) {
  return {
    work_plan_id: PLAN_ID,
    work_plan_item_id: `item-${title}`,
    planned_date: '2026-05-04',
    planned_order: plannedOrder,
    planned_minutes: 30,
    status: 'PLANNED',
    conveyor_id: CONVEYOR_ID,
    conveyor_operational_status: 'EM_ANDAMENTO',
    conveyor_title: '7452',
    client_name: null,
    vehicle_description: null,
    license_plate: null,
    activity_node_id: stepId,
    activity_title: title,
    task_title: 'Tarefa',
    sector_title: 'Setor',
    activity_operational_status: status,
    is_assigned_to_me: true,
  }
}

function mockAbcWorkQueue(
  rows: ReturnType<typeof abcQueueRow>[],
  nodes?: Awaited<ReturnType<typeof seqRepo.listConveyorNodesForSequenceAnalysis>>,
  ownership?: Record<string, string | null>,
) {
  vi.spyOn(queueRepo, 'findPublishedWorkPlanForWeek').mockResolvedValue({
    id: PLAN_ID,
    status: 'PUBLISHED',
    weekStartDate: '2026-05-04',
    weekEndDate: '2026-05-08',
  })
  vi.spyOn(queueRepo, 'listMyWorkQueueRows').mockResolvedValue(rows)
  vi.spyOn(capacityService, 'serviceResolveCollaboratorDailyCapacity').mockResolvedValue({
    collaboratorId: COLLABORATOR_ID,
    date: '2026-05-04',
    defaultDailyMinutes: null,
    overrideDailyMinutes: null,
    resolvedDailyMinutes: 480,
    source: 'fallback',
  })
  vi.spyOn(seqRepo, 'listConveyorNodesForSequenceAnalysis').mockResolvedValue(
    nodes ?? abcSequenceNodes(),
  )
  mockStepOwnership(
    ownership ?? {
      [STEP_A]: COLLABORATOR_ID,
      [STEP_B]: COLLABORATOR_ID,
      [STEP_C]: COLLABORATOR_ID,
    },
  )
}

describe('serviceGetWorkQueueForCollaborator — priorização A/B/C', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ordena A antes de C com planned_order invertido e marca A como recomendada', async () => {
    mockAbcWorkQueue([
      abcQueueRow(STEP_C, 'Atividade C', 0),
      abcQueueRow(STEP_A, 'Atividade A', 2),
      abcQueueRow(STEP_B, 'Atividade B', 1),
    ])

    const result = await serviceGetWorkQueueForCollaborator({} as pg.Pool, {
      collaboratorId: COLLABORATOR_ID,
      date: '2026-05-04',
    })

    expect(result.items.map((i) => i.activityTitle)).toEqual([
      'Atividade A',
      'Atividade B',
      'Atividade C',
    ])
    const a = result.items.find((i) => i.activityNodeId === STEP_A)
    const b = result.items.find((i) => i.activityNodeId === STEP_B)
    const c = result.items.find((i) => i.activityNodeId === STEP_C)
    expect(a?.isNextRecommended).toBe(true)
    expect(b?.isOutOfSequence).toBe(true)
    expect(b?.isNextRecommended).toBe(false)
    expect(c?.isOutOfSequence).toBe(true)
    expect(c?.isNextRecommended).toBe(false)
  })

  it('após concluir A, B é recomendada e C continua fora de sequência', async () => {
    mockAbcWorkQueue(
      [
        abcQueueRow(STEP_A, 'Atividade A', 0, 'COMPLETED'),
        abcQueueRow(STEP_B, 'Atividade B', 1),
        abcQueueRow(STEP_C, 'Atividade C', 2),
      ],
      abcSequenceNodes([STEP_A]),
    )

    const result = await serviceGetWorkQueueForCollaborator({} as pg.Pool, {
      collaboratorId: COLLABORATOR_ID,
      date: '2026-05-04',
    })

    const b = result.items.find((i) => i.activityNodeId === STEP_B)
    const c = result.items.find((i) => i.activityNodeId === STEP_C)
    expect(b?.isNextRecommended).toBe(true)
    expect(c?.isOutOfSequence).toBe(true)
    expect(c?.isNextRecommended).toBe(false)
  })

  it('após concluir A e B, C é recomendada', async () => {
    mockAbcWorkQueue(
      [
        abcQueueRow(STEP_A, 'Atividade A', 0, 'COMPLETED'),
        abcQueueRow(STEP_B, 'Atividade B', 1, 'COMPLETED'),
        abcQueueRow(STEP_C, 'Atividade C', 2),
      ],
      abcSequenceNodes([STEP_A, STEP_B]),
    )

    const result = await serviceGetWorkQueueForCollaborator({} as pg.Pool, {
      collaboratorId: COLLABORATOR_ID,
      date: '2026-05-04',
    })

    const c = result.items.find((i) => i.activityNodeId === STEP_C)
    expect(c?.isNextRecommended).toBe(true)
    expect(c?.isOutOfSequence).toBe(false)
  })

  it('colaborador alocado apenas em B com A pendente não recebe recomendação em B', async () => {
    mockAbcWorkQueue([abcQueueRow(STEP_B, 'Atividade B', 1)])

    const result = await serviceGetWorkQueueForCollaborator({} as pg.Pool, {
      collaboratorId: COLLABORATOR_ID,
      date: '2026-05-04',
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      activityNodeId: STEP_B,
      isOutOfSequence: true,
      isNextRecommended: false,
    })
  })
})

describe('serviceGetWorkQueueForCollaborator — colaboradores diferentes', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Maria em B com A de João pendente: recomendada, alerta e sem justificativa', async () => {
    mockAbcWorkQueue(
      [abcQueueRow(STEP_B, 'Atividade B', 99)],
      abcSequenceNodes(),
      {
        [STEP_A]: JOAO_ID,
        [STEP_B]: MARIA_ID,
        [STEP_C]: MARIA_ID,
      },
    )

    const result = await serviceGetWorkQueueForCollaborator({} as pg.Pool, {
      collaboratorId: MARIA_ID,
      date: '2026-05-04',
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      activityNodeId: STEP_B,
      isNextRecommended: true,
      isOutOfSequence: false,
      requiresOutOfSequenceJustification: false,
      hasPreviousOpenActivitiesFromOtherCollaborators: true,
    })
    expect(result.items[0]?.previousOpenActivitiesWarningMessage).toContain(
      'outro colaborador',
    )
  })

  it('após João concluir A, alerta em B desaparece para Maria', async () => {
    mockAbcWorkQueue(
      [abcQueueRow(STEP_B, 'Atividade B', 1)],
      abcSequenceNodes([STEP_A]),
      {
        [STEP_A]: JOAO_ID,
        [STEP_B]: MARIA_ID,
      },
    )

    const result = await serviceGetWorkQueueForCollaborator({} as pg.Pool, {
      collaboratorId: MARIA_ID,
      date: '2026-05-04',
    })

    expect(result.items[0]).toMatchObject({
      hasPreviousOpenActivitiesFromOtherCollaborators: false,
      previousOpenActivitiesWarningMessage: null,
      isNextRecommended: true,
    })
  })

  it('Maria com B e C pendentes: B recomendada com alerta, C bloqueada por B', async () => {
    mockAbcWorkQueue(
      [
        abcQueueRow(STEP_C, 'Atividade C', 0),
        abcQueueRow(STEP_B, 'Atividade B', 99),
      ],
      abcSequenceNodes(),
      {
        [STEP_A]: JOAO_ID,
        [STEP_B]: MARIA_ID,
        [STEP_C]: MARIA_ID,
      },
    )

    const result = await serviceGetWorkQueueForCollaborator({} as pg.Pool, {
      collaboratorId: MARIA_ID,
      date: '2026-05-04',
    })

    expect(result.items.map((i) => i.activityNodeId)).toEqual([STEP_B, STEP_C])
    const b = result.items.find((i) => i.activityNodeId === STEP_B)
    const c = result.items.find((i) => i.activityNodeId === STEP_C)
    expect(b?.isNextRecommended).toBe(true)
    expect(b?.hasPreviousOpenActivitiesFromOtherCollaborators).toBe(true)
    expect(c?.isOutOfSequence).toBe(true)
    expect(c?.isNextRecommended).toBe(false)
  })
})

describe('groupWorkQueueItem', () => {
  it('separa atrasadas, concluídas de hoje e fila de hoje', () => {
    expect(
      groupWorkQueueItem(
        { planned_date: '2026-05-01', activity_operational_status: 'PENDING' },
        '2026-05-04',
      ),
    ).toBe('overdue')
    expect(
      groupWorkQueueItem(
        { planned_date: '2026-05-04', activity_operational_status: 'COMPLETED' },
        '2026-05-04',
      ),
    ).toBe('completed')
    expect(
      groupWorkQueueItem(
        { planned_date: '2026-05-04', activity_operational_status: 'PENDING' },
        '2026-05-04',
      ),
    ).toBe('today')
  })
})
