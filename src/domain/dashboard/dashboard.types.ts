/** Resposta `data` de GET /api/v1/dashboard/operational */

export type OperationalBucketKey =
  | 'no_backlog'
  | 'em_revisao'
  | 'em_andamento'
  | 'em_atraso'
  | 'concluidas'

export type OperationalDashboardData = {
  meta: {
    generatedAt: string
    scope: 'snapshot_atual'
    bucketRule: string
    semanticsVersion?: '1.5'
  }
  conveyorsByBucket: Record<OperationalBucketKey, number>
  overdueHighlight: Array<{
    conveyorId: string
    name: string
    code: string | null
    operationalStatus: string
    estimatedDeadline: string | null
  }>
  assignees: {
    totalAllocations: number
    primaryAllocations: number
    supportAllocations: number
  }
  plannedVsRealized: {
    plannedMinutesConveyorTotal: number
    plannedMinutesStepNodes: number
    realizedMinutesTotal: number
    realizedMinutesInPeriod?: number
    realizedPeriod?: {
      from: string
      to: string
      preset: '7d' | '15d' | '30d' | 'month'
    }
    notes: string
  }
  collaboratorLoad: Array<{
    collaboratorId: string
    fullName: string | null
    assignmentCount: number
    primaryCount: number
    supportCount: number
    plannedMinutesOnSteps: number
    realizedMinutes: number
  }>
  recentTimeEntries: Array<{
    id: string
    conveyorId: string
    conveyorName: string
    stepNodeId: string
    stepName: string
    collaboratorId: string
    collaboratorName: string | null
    minutes: number
    entryAt: string
    notes: string | null
  }>
}

export type ExecutiveDashboardData = {
  meta: {
    generatedAt: string
    completedWithinDays: number
    scope: string
  }
  totals: {
    activeConveyors: number
    completedInWindow: number
    overdueConveyors: number
    delayRateVsActive: number | null
  }
  plannedVsRealized: {
    /** Apoio: soma de `total_planned_minutes` nas esteiras. */
    plannedMinutesConveyorTotal: number
    /** Previsto canônico: soma dos STEPs. */
    plannedMinutesStepNodes: number
    realizedMinutesTotal: number
    notes: string
  }
  topOverdueConveyors: Array<{
    conveyorId: string
    name: string
    code: string | null
    estimatedDeadline: string | null
  }>
}
