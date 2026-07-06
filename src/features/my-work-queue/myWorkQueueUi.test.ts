import { describe, expect, it } from 'vitest'
import type { MyWorkQueueItem } from '../../domain/my-work-queue/my-work-queue.types'
import { sortWorkQueueItems, workQueueApontamentoCandidate } from './myWorkQueueUi'

function queueItem(overrides: Partial<MyWorkQueueItem>): MyWorkQueueItem {
  return {
    workPlanId: 'plan',
    workPlanItemId: 'item',
    plannedDate: '2026-05-04',
    plannedOrder: 0,
    plannedMinutes: 90,
    status: 'PLANNED',
    group: 'today',
    conveyorId: 'conveyor',
    conveyorOperationalStatus: 'A_INICIAR',
    conveyorTitle: '7452',
    clientName: 'Cliente',
    vehicleDescription: 'Veículo',
    licensePlate: 'ABC1D23',
    taskTitle: 'Bancos dianteiros',
    sectorTitle: 'Desmontagem',
    activityNodeId: 'step',
    activityTitle: 'Remover banco esquerdo',
    activityOperationalStatus: 'PENDING',
    isActivityCompleted: false,
    isOverdue: false,
    isOutOfSequence: false,
    isNextRecommended: false,
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
    structuralSequenceIndex: 0,
    isAssignedToMe: true,
    requiresUnassignedJustification: false,
    plannedVsCapacity: {
      plannedMinutesForDay: 90,
      capacityMinutesForDay: 480,
      overload: false,
    },
    ...overrides,
  }
}

describe('myWorkQueueUi', () => {
  it('ordena por data, plannedOrder e id', () => {
    const sorted = sortWorkQueueItems([
      queueItem({ workPlanItemId: 'c', plannedDate: '2026-05-05', plannedOrder: 0 }),
      queueItem({ workPlanItemId: 'b', plannedDate: '2026-05-04', plannedOrder: 1 }),
      queueItem({ workPlanItemId: 'a', plannedDate: '2026-05-04', plannedOrder: 0 }),
    ])

    expect(sorted.map((item) => item.workPlanItemId)).toEqual(['a', 'b', 'c'])
  })

  it('converte item planejado para candidato do drawer preservando S2 e S3', () => {
    const candidate = workQueueApontamentoCandidate(
      queueItem({
        isAssignedToMe: false,
        requiresUnassignedJustification: true,
        isOutOfSequence: true,
        requiresOutOfSequenceJustification: true,
        previousOpenCount: 1,
        previousOpenActivities: [
          {
            activityNodeId: 'prev',
            activityTitle: 'Remover capa',
            sectorTitle: 'Desmontagem',
            taskTitle: 'Bancos dianteiros',
            orderPath: '1.1.1',
          },
        ],
      }),
    )

    expect(candidate).toMatchObject({
      conveyorId: 'conveyor',
      stepNodeId: 'step',
      activityTitle: 'Remover banco esquerdo',
      isAssignedToMe: false,
      requiresJustification: true,
      isOutOfSequence: true,
      requiresOutOfSequenceJustification: true,
      previousOpenCount: 1,
    })
    expect(candidate.previousOpenActivities[0]).toEqual({
      taskTitle: 'Bancos dianteiros',
      sectorTitle: 'Desmontagem',
      activityTitle: 'Remover capa',
    })
  })
})
