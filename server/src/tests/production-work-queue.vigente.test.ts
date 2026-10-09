import { afterEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import * as queueService from '../modules/my-work-queue/my-work-queue.service.js'
import * as workloadRepo from '../modules/conveyors/conveyorNodeWorkload.repository.js'
import type { MyWorkQueueItemApi } from '../modules/my-work-queue/my-work-queue.dto.js'
import { serviceGetProductionWorkQueue } from '../modules/production/production-work-queue.service.js'

const COLLABORATOR_ID = '00000000-0000-0000-0000-000000000002'

describe('serviceGetProductionWorkQueue — plano vigente', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('solicita somente itens PLANNED do plano publicado da semana', async () => {
    const spy = vi.spyOn(queueService, 'serviceGetWorkQueueForCollaborator').mockResolvedValue({
      date: '2026-06-02',
      planStatus: 'PUBLISHED',
      summary: {
        plannedItemsToday: 0,
        plannedMinutesToday: 0,
        overdueItems: 0,
        completedItemsToday: 0,
        outOfSequenceItems: 0,
        unassignedExceptionItems: 0,
        capacityMinutesToday: 0,
        overload: false,
      },
      items: [],
    })

    await serviceGetProductionWorkQueue({} as pg.Pool, {
      collaboratorId: COLLABORATOR_ID,
      date: '2026-06-02',
      includePastDue: true,
    })

    expect(spy).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        collaboratorId: COLLABORATOR_ID,
        listOptions: { planItemStatuses: ['PLANNED'] },
      }),
    )
  })

  it('expõe código da esteira/OS, cliente, veículo e placa (pesquisa do Kiosk)', async () => {
    const queueItem = {
      workPlanId: 'wp-1',
      workPlanItemId: 'wpi-1',
      plannedDate: '2026-06-02',
      plannedOrder: 1,
      plannedMinutes: 60,
      status: 'PLANNED',
      group: 'today',
      conveyorId: 'cv-1',
      conveyorOperationalStatus: 'EM_ANDAMENTO',
      conveyorTitle: 'Esteira 7070',
      conveyorCode: '7070',
      clientName: 'Cliente Alfa',
      vehicleDescription: 'Gol GTI',
      licensePlate: 'ABC1D23',
      taskTitle: 'Bancos dianteiros',
      sectorTitle: 'Tapeçaria',
      activityNodeId: 'step-1',
      activityTitle: 'Costura do tecido XPTO',
      activityOperationalStatus: 'PENDING',
      isActivityCompleted: false,
      isOverdue: false,
      isOutOfSequence: false,
      isNextRecommended: true,
      hasPreviousPendingStep: false,
      requiresOutOfSequenceJustification: false,
      canPointTime: true,
      previousOpenCount: 0,
      previousOpenActivities: [],
      allPreviousOpenActivities: [],
      awaitingPreviousActivities: [],
      hasPreviousOpenActivitiesFromOtherCollaborators: false,
      previousOpenActivitiesFromOtherCollaborators: [],
      previousOpenActivitiesWarningMessage: null,
    } as unknown as MyWorkQueueItemApi
    vi.spyOn(queueService, 'serviceGetWorkQueueForCollaborator').mockResolvedValue({
      date: '2026-06-02',
      planStatus: 'PUBLISHED',
      summary: {
        plannedItemsToday: 1,
        plannedMinutesToday: 60,
        overdueItems: 0,
        completedItemsToday: 0,
        outOfSequenceItems: 0,
        unassignedExceptionItems: 0,
        capacityMinutesToday: 0,
        overload: false,
      },
      items: [queueItem],
    })
    vi.spyOn(workloadRepo, 'sumRealizedMinutesByStepForConveyor').mockResolvedValue(new Map())
    vi.spyOn(workloadRepo, 'getLatestSessionCompletionPctByStepForCollaborator').mockResolvedValue(
      new Map(),
    )

    const result = await serviceGetProductionWorkQueue({} as pg.Pool, {
      collaboratorId: COLLABORATOR_ID,
      date: '2026-06-02',
      includePastDue: true,
    })

    expect(result.items[0]).toMatchObject({
      conveyorTitle: 'Esteira 7070',
      conveyorCode: '7070',
      clientName: 'Cliente Alfa',
      vehicleDescription: 'Gol GTI',
      licensePlate: 'ABC1D23',
      activityTitle: 'Costura do tecido XPTO',
    })
  })
})
