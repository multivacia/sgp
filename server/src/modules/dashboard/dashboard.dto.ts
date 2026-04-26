import type { OperationalBucket } from '../../shared/operationalBucket.js'

export type ConveyorRowForBucket = {
  id: string
  name: string
  code: string | null
  operational_status: string
  estimated_deadline: string | null
}

export type OperationalDashboardDto = {
  meta: {
    generatedAt: string
    /** Indicadores são snapshot do estado atual (sem janela temporal nas contagens de esteira). */
    scope: 'snapshot_atual'
    bucketRule: 'shared_operationalBucket_ts'
    /** Presença quando a resposta inclui campos V1.5 de semântica operacional. */
    semanticsVersion?: '1.5'
  }
  conveyorsByBucket: Record<OperationalBucket, number>
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
    /**
     * Apoio: soma de `conveyors.total_planned_minutes` (agregado na OS).
     * Pode divergir da soma dos STEPs se o total da esteira não foi recalculado.
     */
    plannedMinutesConveyorTotal: number
    /**
     * Previsto canônico: soma de `planned_minutes` nos nós STEP ativos
     * (estrutura operacional — alinha com alocações e apontamentos por etapa).
     */
    plannedMinutesStepNodes: number
    /** Soma de `conveyor_time_entries.minutes` (não apagados). — Minutos apontados (acumulado) global. */
    realizedMinutesTotal: number
    /**
     * Quando `GET ?realizedPeriodPreset=` é enviado: soma de apontamentos na janela.
     * Minutos apontados (período), independente do acumulado total.
     */
    realizedMinutesInPeriod?: number
    /** Janela resolvida para `realizedMinutesInPeriod` (UTC). */
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

export type ExecutiveDashboardDto = {
  meta: {
    generatedAt: string
    completedWithinDays: number
    scope: string
  }
  totals: {
    /** Esteiras não concluídas (operational_status <> CONCLUIDA). */
    activeConveyors: number
    /** CONCLUIDA com completed_at na janela. */
    completedInWindow: number
    /** Contagem com bucket operacional em_atraso (mesma regra do painel). */
    overdueConveyors: number
    /** em_atraso / (ativas), 0–1. */
    delayRateVsActive: number | null
  }
  plannedVsRealized: {
    /** Apoio: soma de `total_planned_minutes` nas esteiras. */
    plannedMinutesConveyorTotal: number
    /** Previsto canônico: soma de `planned_minutes` nos STEPs. */
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
