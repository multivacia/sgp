/** Bucket operacional (mesma regra do painel de esteiras). */
export type MyActivityOperationalBucket =
  | 'no_backlog'
  | 'em_revisao'
  | 'em_andamento'
  | 'em_atraso'
  | 'concluidas'

/** GET /api/v1/my-activities — item alinhado ao backend (`MyActivityItemApi`). */
export type MyActivityRoleInStep = 'primary' | 'support'

export type MyActivityItem = {
  assigneeId: string
  conveyorId: string
  conveyorCode: string | null
  conveyorName: string
  conveyorStatus: string
  estimatedDeadline: string | null
  operationalBucket: MyActivityOperationalBucket
  stepNodeId: string
  stepName: string
  optionName: string
  areaName: string
  roleInStep: MyActivityRoleInStep
  plannedMinutes: number | null
  realizedMinutes: number | null
}

/** GET /api/v1/me/time-entry-candidates — item alinhado ao backend. */
export type TimeEntryCandidateItem = {
  conveyorId: string
  conveyorCode: string | null
  conveyorName: string
  clientName: string | null
  vehicleLabel: string | null
  plate: string | null
  stepNodeId: string
  stepName: string
  areaName: string
  roleInStep: MyActivityRoleInStep
  assignmentType: 'COLLABORATOR' | 'TEAM'
  plannedMinutes: number | null
  realizedMinutes: number
  pendingMinutes: number
}
