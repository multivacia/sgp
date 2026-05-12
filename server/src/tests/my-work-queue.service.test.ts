import { afterEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import * as authRepo from '../modules/auth/auth.repository.js'
import * as seqRepo from '../modules/conveyors/conveyors.repository.js'
import * as capacityService from '../modules/operational-settings/operational-settings.service.js'
import * as queueRepo from '../modules/my-work-queue/my-work-queue.repository.js'
import {
  groupWorkQueueItem,
  serviceGetMyWorkQueue,
} from '../modules/my-work-queue/my-work-queue.service.js'

const USER_ID = '00000000-0000-0000-0000-000000000001'
const COLLABORATOR_ID = '00000000-0000-0000-0000-000000000002'
const PLAN_ID = '00000000-0000-0000-0000-000000000003'
const CONVEYOR_ID = '00000000-0000-0000-0000-000000000004'
const PREVIOUS_STEP_ID = '00000000-0000-0000-0000-000000000005'
const TARGET_STEP_ID = '00000000-0000-0000-0000-000000000006'

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
      requiresUnassignedJustification: true,
      previousOpenCount: 1,
    })
    expect(result.data.items[1]).toMatchObject({
      group: 'completed',
      isActivityCompleted: true,
      isOutOfSequence: false,
    })
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
