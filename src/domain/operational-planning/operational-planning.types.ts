/** Contratos da API `/api/v1/operational-planning/*` */

export type OperationalPlanStatus = 'DRAFT' | 'PUBLISHED'

export type OperationalPlanningWeekPayload = {
  hasPlan: boolean
  week: {
    weekStartDate: string
    weekEndDate: string
    weekdayDates: readonly string[]
  }
  plan: null | {
    id: string
    weekStartDate: string
    weekEndDate: string
    status: OperationalPlanStatus
    publishedAt: string | null
    items: OperationalPlanningPlanItem[]
    createdAt: string
    updatedAt: string
  }
  summary: {
    plannedMinutes: number
    plannedItems: number
    collaboratorsCount: number
  }
  capacityByCollaboratorDay: Array<{
    collaboratorId: string
    date: string
    capacityMinutes: number
    plannedMinutes: number
  }>
}

export type OperationalPlanningPlanItem = {
  id: string
  conveyorId: string
  conveyorTitle: string
  activityNodeId: string
  taskTitle: string
  sectorTitle: string
  activityTitle: string
  assignedCollaboratorId: string | null
  assignedCollaboratorName: string | null
  plannedDate: string
  plannedOrder: number
  plannedMinutes: number | null
  status: string
  notes: string | null
}

export type OperationalPlanningBacklogItem = {
  conveyorId: string
  conveyorTitle: string
  clientName: string | null
  vehicleDescription: string | null
  licensePlate: string | null
  taskTitle: string
  sectorTitle: string
  activityNodeId: string
  activityTitle: string
  plannedMinutes: number | null
  realizedMinutes: number
  pendingMinutes: number
  assignedCollaborators: Array<{ id: string; fullName: string }>
  assignedTeams: Array<{ id: string; name: string }>
  isOutOfSequence: boolean
  previousOpenCount: number
  isOverdue: boolean
  hasAssignees: boolean
}

export type OperationalPlanningBacklogPayload = {
  items: OperationalPlanningBacklogItem[]
  meta: { limit: number }
}

export type SaveOperationalWeekPlanInput = {
  weekStartDate: string
  weekEndDate: string
  items: Array<{
    conveyorId: string
    activityNodeId: string
    assignedCollaboratorId: string
    assignedTeamId?: string | null
    plannedDate: string
    plannedOrder: number
    plannedMinutes?: number | null
    notes?: string | null
  }>
}
