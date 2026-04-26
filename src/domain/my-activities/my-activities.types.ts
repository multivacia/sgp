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
