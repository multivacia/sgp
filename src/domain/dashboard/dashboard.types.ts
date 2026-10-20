/** Resposta `data` de GET /api/v1/dashboard/operational */

/** Período aplicado devolvido pela API (`startDate`/`endDate`: dias civis de São Paulo). */
export type DashboardPeriodMeta = {
  startDate: string
  endDate: string
  timezone: 'America/Sao_Paulo'
  from: string
  to: string
}

export type OperationalBucketKey =
  | 'em_elaboracao'
  | 'aguardando_planejamento'
  | 'em_planejamento'
  | 'em_execucao'
  | 'em_atraso'
  | 'finalizadas'
  | 'canceladas'

export type OperationalDashboardData = {
  meta: {
    generatedAt: string
    scope: 'snapshot_atual'
    bucketRule: string
    semanticsVersion?: '1.5'
    period?: DashboardPeriodMeta
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
      preset: '7d' | '15d' | '30d' | 'month' | 'custom'
      startDate?: string
      endDate?: string
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
    period?: DashboardPeriodMeta
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
