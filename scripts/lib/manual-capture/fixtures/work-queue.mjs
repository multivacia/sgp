/** Minha fila (GET /me/work-queue) — contrato de `src/domain/my-work-queue/my-work-queue.types.ts`. */
import { TODAY } from './common.mjs'

function qi(o) {
  return {
    workPlanId: 'plan-2026-w27-pub',
    plannedOrder: 0,
    status: 'ACTIVE',
    conveyorOperationalStatus: 'EM_ANDAMENTO',
    clientName: 'Cliente Exemplo',
    vehicleDescription: 'Veículo Exemplo',
    licensePlate: 'ABC1D23',
    sectorTitle: 'Tapeçaria',
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
    structuralSequenceIndex: 1,
    isAssignedToMe: true,
    requiresUnassignedJustification: false,
    ...o,
  }
}

export function workQueuePayload({ overload = false } = {}) {
  const capacity = 480
  const items = [
    qi({
      workPlanItemId: 'wpi-03',
      plannedDate: '2026-06-30',
      plannedMinutes: 120,
      group: 'overdue',
      conveyorId: 'conv-101',
      conveyorTitle: 'ET-0101 · Reforma de bancos — Veículo Exemplo',
      taskTitle: 'Bancos dianteiros',
      activityNodeId: 'step-3',
      activityTitle: 'Recuperar espuma',
      activityOperationalStatus: 'IN_PROGRESS',
      isOverdue: true,
      structuralSequenceIndex: 3,
    }),
    qi({
      workPlanItemId: 'wpi-04',
      plannedDate: TODAY,
      plannedMinutes: 180,
      group: 'today',
      conveyorId: 'conv-103',
      conveyorTitle: 'ET-0103 · Painéis de porta — Veículo Exemplo',
      licensePlate: 'DEF2G34',
      taskTitle: 'Portas dianteiras',
      activityNodeId: 'step-p1',
      activityTitle: 'Desmontar painéis',
      isNextRecommended: true,
    }),
    qi({
      workPlanItemId: 'wpi-05',
      plannedDate: TODAY,
      plannedOrder: 1,
      plannedMinutes: overload ? 360 : 240,
      group: 'today',
      conveyorId: 'conv-101',
      conveyorTitle: 'ET-0101 · Reforma de bancos — Veículo Exemplo',
      taskTitle: 'Bancos dianteiros',
      activityNodeId: 'step-4',
      activityTitle: 'Aplicar manta acústica',
      structuralSequenceIndex: 4,
    }),
    qi({
      workPlanItemId: 'wpi-01',
      plannedDate: TODAY,
      plannedOrder: 2,
      plannedMinutes: 60,
      group: 'completed',
      conveyorId: 'conv-101',
      conveyorTitle: 'ET-0101 · Reforma de bancos — Veículo Exemplo',
      taskTitle: 'Bancos dianteiros',
      activityNodeId: 'step-1',
      activityTitle: 'Desmontar bancos',
      activityOperationalStatus: 'COMPLETED',
      isActivityCompleted: true,
    }),
  ]
  const plannedToday = items.filter((i) => i.plannedDate === TODAY).reduce((n, i) => n + i.plannedMinutes, 0)
  for (const i of items) {
    i.plannedVsCapacity = { plannedMinutesForDay: plannedToday, capacityMinutesForDay: capacity, overload: plannedToday > capacity }
  }
  return {
    date: TODAY,
    planStatus: 'PUBLISHED',
    summary: {
      plannedItemsToday: items.filter((i) => i.group === 'today').length,
      plannedMinutesToday: plannedToday,
      overdueItems: items.filter((i) => i.group === 'overdue').length,
      completedItemsToday: items.filter((i) => i.group === 'completed').length,
      outOfSequenceItems: 0,
      unassignedExceptionItems: 0,
      capacityMinutesToday: capacity,
      overload: plannedToday > capacity,
    },
    items,
  }
}
