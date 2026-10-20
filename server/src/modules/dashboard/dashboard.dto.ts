import type { OperationalBucket } from '../../shared/operationalBucket.js'
import type { DashboardPeriodMeta } from './dashboard.period.js'

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
    /** Período aplicado (`startDate`/`endDate`); ausente em chamadas legadas. */
    period?: DashboardPeriodMeta
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
     * Pode divergir do previsto estrutural se o total da esteira não foi recalculado.
     */
    plannedMinutesConveyorTotal: number
    /**
     * Previsto estrutural: soma do tempo unitário × quantidade dos nós STEP ativos.
     */
    plannedMinutesStepNodes: number
    /** Soma de `conveyor_time_entries.minutes` (não apagados). — Minutos apontados (acumulado) global. */
    realizedMinutesTotal: number
    /**
     * Com `startDate`/`endDate` (ou o legado `realizedPeriodPreset`): soma dos apontamentos
     * com data de realização (`entry_at`) no período. Independente do acumulado total.
     */
    realizedMinutesInPeriod?: number
    /**
     * Período resolvido para `realizedMinutesInPeriod`. `preset: 'custom'` quando veio de
     * `startDate`/`endDate` (com as datas civis); `to` é inclusivo (23:59:59.999 em SP).
     */
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

export type ExecutiveDashboardDto = {
  meta: {
    generatedAt: string
    /** Dias do período (com `startDate`/`endDate`: dias civis inclusivos; legado: `days`). */
    completedWithinDays: number
    scope: string
    /** Período aplicado às concluídas; ausente em chamadas legadas com `days`. */
    period?: DashboardPeriodMeta
  }
  totals: {
    /** Esteiras não concluídas (operational_status <> CONCLUIDA). */
    activeConveyors: number
    /** FINALIZADA com `completed_at` no período (ou nos últimos `days`, legado). */
    completedInWindow: number
    /** Contagem com bucket operacional em_atraso (mesma regra do painel). */
    overdueConveyors: number
    /** em_atraso / (ativas), 0–1. */
    delayRateVsActive: number | null
  }
  plannedVsRealized: {
    /** Apoio: soma de `total_planned_minutes` nas esteiras. Pode diferir do previsto estrutural se a coluna não foi recalculada. */
    plannedMinutesConveyorTotal: number
    /** Previsto estrutural: soma do tempo unitário × quantidade dos STEPs ativos. */
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
