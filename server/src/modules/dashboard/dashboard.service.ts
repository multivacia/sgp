import type pg from 'pg'
import {
  getOperationalBucketForConveyor,
  type OperationalBucket,
} from '../../shared/operationalBucket.js'
import { resolveOperationalPeriod } from '../../shared/operationalPeriod.js'
import type {
  ExecutiveDashboardDto,
  OperationalDashboardDto,
} from './dashboard.dto.js'
import {
  dashboardPeriodDayCount,
  dashboardPeriodMeta,
  type DashboardPeriod,
} from './dashboard.period.js'
import { operationalDayEnd } from '../../shared/operationalWorkDate.js'
import {
  countActiveConveyors,
  countAssigneeRoles,
  countCompletedInRange,
  countCompletedInWindow,
  listCollaboratorLoadAggregates,
  listConveyorsForDashboard,
  listRecentTimeEntries,
  sumConveyorPlannedMinutes,
  sumRealizedMinutes,
  sumRealizedMinutesBetween,
  sumRealizedMinutesByCollaborator,
  sumRealizedMinutesInRange,
  sumStepPlannedMinutes,
} from './dashboard.repository.js'

/** Texto exibido no Dashboard — sem nomes de colunas nem termos técnicos. */
const PLANNED_VS_REALIZED_NOTES =
  'Tempo previsto das atividades: tempo unitário × quantidade das atividades ativas. Total por esteira (OS): tempo previsto registrado em cada OS, usado como referência (pode diferir se o total da OS não foi recalculado). Total de horas apontadas: todos os apontamentos registrados, sem filtro de período.'

function emptyBucketCounts(): Record<OperationalBucket, number> {
  return {
    em_elaboracao: 0,
    aguardando_planejamento: 0,
    em_planejamento: 0,
    em_execucao: 0,
    em_atraso: 0,
    finalizadas: 0,
    canceladas: 0,
  }
}

export async function serviceOperationalDashboard(
  pool: pg.Pool,
  opts?: {
    /** Período do Dashboard; tem precedência sobre `realizedPeriodPreset`. */
    period?: DashboardPeriod | null
    /** Legado: janela móvel até agora. */
    realizedPeriodPreset?: '7d' | '15d' | '30d' | 'month'
  },
): Promise<OperationalDashboardDto> {
  const [
    conveyors,
    assignRoles,
    plannedConv,
    plannedSteps,
    realized,
    collabRows,
    realizedByCollab,
    recentRows,
  ] = await Promise.all([
    listConveyorsForDashboard(pool),
    countAssigneeRoles(pool),
    sumConveyorPlannedMinutes(pool),
    sumStepPlannedMinutes(pool),
    sumRealizedMinutes(pool),
    listCollaboratorLoadAggregates(pool),
    sumRealizedMinutesByCollaborator(pool),
    listRecentTimeEntries(pool, 12),
  ])

  let realizedInPeriod: number | undefined
  let realizedPeriod: OperationalDashboardDto['plannedVsRealized']['realizedPeriod']
  if (opts?.period) {
    const p = opts.period
    realizedInPeriod = await sumRealizedMinutesInRange(pool, p.from, p.toExclusive)
    realizedPeriod = {
      from: p.from.toISOString(),
      to: operationalDayEnd(p.endDate).toISOString(),
      preset: 'custom',
      startDate: p.startDate,
      endDate: p.endDate,
    }
  } else if (opts?.realizedPeriodPreset) {
    const win = resolveOperationalPeriod({
      preset: opts.realizedPeriodPreset,
      now: new Date(),
    })
    realizedInPeriod = await sumRealizedMinutesBetween(pool, win.from, win.to)
    realizedPeriod = {
      from: win.from.toISOString(),
      to: win.to.toISOString(),
      preset: win.preset as '7d' | '15d' | '30d' | 'month',
    }
  }

  const conveyorsByBucket = emptyBucketCounts()
  for (const c of conveyors) {
    const b = getOperationalBucketForConveyor(
      c.operational_status,
      c.estimated_deadline,
    )
    conveyorsByBucket[b]++
  }

  const overdueHighlight = conveyors
    .filter(
      (c) =>
        getOperationalBucketForConveyor(c.operational_status, c.estimated_deadline) ===
        'em_atraso',
    )
    .slice(0, 12)
    .map((c) => ({
      conveyorId: c.id,
      name: c.name,
      code: c.code,
      operationalStatus: c.operational_status,
      estimatedDeadline: c.estimated_deadline,
    }))

  const collaboratorLoad = collabRows.map((row) => ({
    collaboratorId: row.collaborator_id,
    fullName: row.full_name,
    assignmentCount: Number.parseInt(row.assignment_count, 10) || 0,
    primaryCount: Number.parseInt(row.primary_count, 10) || 0,
    supportCount: Number.parseInt(row.support_count, 10) || 0,
    plannedMinutesOnSteps: Number.parseInt(row.planned_minutes_steps, 10) || 0,
    realizedMinutes: realizedByCollab.get(row.collaborator_id) ?? 0,
  }))

  const recentTimeEntries = recentRows.map((r) => ({
    id: r.id,
    conveyorId: r.conveyor_id,
    conveyorName: r.conveyor_name,
    stepNodeId: r.conveyor_node_id,
    stepName: r.step_name,
    collaboratorId: r.collaborator_id,
    collaboratorName: r.collaborator_name,
    minutes: r.minutes,
    entryAt: r.entry_at.toISOString(),
    notes: r.notes,
  }))

  const periodNote =
    realizedInPeriod !== undefined && realizedPeriod
      ? ' Horas apontadas no período: apontamentos com data de realização dentro do período selecionado (fuso de São Paulo).'
      : ''

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      scope: 'snapshot_atual',
      bucketRule: 'shared_operationalBucket_ts',
      ...(realizedPeriod ? { semanticsVersion: '1.5' as const } : {}),
      ...(opts?.period ? { period: dashboardPeriodMeta(opts.period) } : {}),
    },
    conveyorsByBucket,
    overdueHighlight,
    assignees: {
      totalAllocations: assignRoles.total,
      primaryAllocations: assignRoles.primary,
      supportAllocations: assignRoles.support,
    },
    plannedVsRealized: {
      plannedMinutesConveyorTotal: plannedConv,
      plannedMinutesStepNodes: plannedSteps,
      realizedMinutesTotal: realized,
      ...(realizedInPeriod !== undefined && realizedPeriod
        ? {
            realizedMinutesInPeriod: realizedInPeriod,
            realizedPeriod,
          }
        : {}),
      notes: PLANNED_VS_REALIZED_NOTES + periodNote,
    },
    collaboratorLoad,
    recentTimeEntries,
  }
}

/**
 * Gerencial. Com `period`, concluídas = FINALIZADA com `completed_at` no período (dias civis
 * de SP, inclusivos). Legado `completedWithinDays`: últimos N dias até agora. Ativas, atraso e
 * totais de tempo não dependem do período.
 */
export async function serviceExecutiveDashboard(
  pool: pg.Pool,
  window: { period: DashboardPeriod } | { completedWithinDays: number },
): Promise<ExecutiveDashboardDto> {
  const period = 'period' in window ? window.period : null
  const completedWithinDays = period
    ? dashboardPeriodDayCount(period)
    : (window as { completedWithinDays: number }).completedWithinDays
  const [rows, active, completedInWindow, plannedConv, plannedSteps, realized] =
    await Promise.all([
      listConveyorsForDashboard(pool),
      countActiveConveyors(pool),
      period
        ? countCompletedInRange(pool, period.from, period.toExclusive)
        : countCompletedInWindow(pool, completedWithinDays),
      sumConveyorPlannedMinutes(pool),
      sumStepPlannedMinutes(pool),
      sumRealizedMinutes(pool),
    ])

  let overdue = 0
  for (const c of rows) {
    if (
      getOperationalBucketForConveyor(c.operational_status, c.estimated_deadline) ===
      'em_atraso'
    ) {
      overdue++
    }
  }

  const delayRateVsActive =
    active > 0 ? Math.round((overdue / active) * 1000) / 1000 : null

  const topOverdue = rows
    .filter(
      (c) =>
        getOperationalBucketForConveyor(c.operational_status, c.estimated_deadline) ===
        'em_atraso',
    )
    .slice(0, 8)
    .map((c) => ({
      conveyorId: c.id,
      name: c.name,
      code: c.code,
      estimatedDeadline: c.estimated_deadline,
    }))

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      completedWithinDays,
      scope: period
        ? `esteiras_ativas_e_concluidas_periodo_${period.startDate}_${period.endDate}`
        : `esteiras_ativas_e_concluidas_ultimos_${completedWithinDays}_dias`,
      ...(period ? { period: dashboardPeriodMeta(period) } : {}),
    },
    totals: {
      activeConveyors: active,
      completedInWindow,
      overdueConveyors: overdue,
      delayRateVsActive,
    },
    plannedVsRealized: {
      plannedMinutesConveyorTotal: plannedConv,
      plannedMinutesStepNodes: plannedSteps,
      realizedMinutesTotal: realized,
      notes: PLANNED_VS_REALIZED_NOTES,
    },
    topOverdueConveyors: topOverdue,
  }
}
