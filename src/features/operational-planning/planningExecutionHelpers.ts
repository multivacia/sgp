import { formatPlanningMinutes } from './planningBoardHelpers'

/** Entrada mínima para resumo de execução de um card planejado. */
export type PlanningExecutionInput = {
  plannedMinutes: number | null
  /** `undefined` ou omitido = indisponível; número = dado real (inclui 0). */
  realizedMinutes?: number | null
  /** Status operacional do STEP (ex.: PENDING, COMPLETED). */
  operationalStatus?: string | null
}

export type PlanningExecutionState =
  | 'unknown'
  | 'no_planned_minutes'
  | 'not_started'
  | 'in_progress'
  | 'reached_planned'
  | 'over_planned'
  | 'completed'

export type PlanningExecutionSummary = {
  plannedMinutes: number
  realizedMinutes: number | null
  pendingMinutes: number | null
  executionRatio: number | null
  state: PlanningExecutionState
  isRealizedAvailable: boolean
  isOperationallyCompleted: boolean
}

export type PlanningItemProgress = {
  showBar: boolean
  percent: number
  isOverPlanned: boolean
  emptyLabel: string | null
  overLabel: string | null
}

export type PlanningExecutionDisplayLines = {
  plannedLine: string
  realizedLine: string | null
  pendingLine: string | null
  alertLine: string | null
  unavailableLine: string | null
}

const OPERATIONAL_STATUS_UI_LABELS: Record<string, string> = {
  PENDING: 'Aberta',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  REOPENED: 'Reaberta',
  BLOCKED: 'Bloqueada',
  ABORTED: 'Dispensada',
}

function normalizePlannedMinutes(raw: number | null | undefined): number {
  if (raw == null || !Number.isFinite(raw)) return 0
  return Math.max(0, Math.floor(raw))
}

function normalizeRealizedMinutes(raw: number | null | undefined): number | null {
  if (raw === undefined || raw === null) return null
  if (!Number.isFinite(raw)) return null
  return Math.max(0, Math.floor(raw))
}

export function buildPlanningBacklogExecutionLookup(
  backlogItems: readonly { activityNodeId: string; realizedMinutes: number }[],
): ReadonlyMap<string, number> {
  const map = new Map<string, number>()
  for (const item of backlogItems) {
    const id = item.activityNodeId?.trim()
    if (!id) continue
    map.set(id, Math.max(0, Math.floor(Number.isFinite(item.realizedMinutes) ? item.realizedMinutes : 0)))
  }
  return map
}

export function resolvePlanningItemRealizedFromLookup(
  activityNodeId: string,
  lookup: ReadonlyMap<string, number>,
): number | null {
  const id = activityNodeId?.trim()
  if (!id || !lookup.has(id)) return null
  return lookup.get(id) ?? 0
}

/** Fonte principal: item semanal; fallback temporário: lookup do backlog. */
export function resolvePlanningItemRealizedForCard(
  item: { activityNodeId: string; realizedMinutes?: number | null },
  backlogLookup?: ReadonlyMap<string, number>,
): number | null {
  if (item.realizedMinutes !== undefined && item.realizedMinutes !== null) {
    if (!Number.isFinite(item.realizedMinutes)) return null
    return Math.max(0, Math.floor(item.realizedMinutes))
  }
  if (backlogLookup) {
    return resolvePlanningItemRealizedFromLookup(item.activityNodeId, backlogLookup)
  }
  return null
}

export function resolvePlanningItemOperationalStatusLabel(
  status: string | null | undefined,
): string | null {
  const key = status?.trim()
  if (!key) return null
  return OPERATIONAL_STATUS_UI_LABELS[key] ?? null
}

export function resolvePlanningItemExecutionSummary(
  input: PlanningExecutionInput,
): PlanningExecutionSummary {
  const plannedMinutes = normalizePlannedMinutes(input.plannedMinutes)
  const realizedMinutes = normalizeRealizedMinutes(input.realizedMinutes)
  const isRealizedAvailable = realizedMinutes !== null
  const operationalStatus = input.operationalStatus?.trim() || null
  const isOperationallyCompleted = operationalStatus === 'COMPLETED'

  if (isOperationallyCompleted) {
    const realizedVal = realizedMinutes ?? 0
    const pendingMinutes =
      plannedMinutes > 0 && isRealizedAvailable
        ? Math.max(0, plannedMinutes - realizedVal)
        : isRealizedAvailable
          ? 0
          : null
    const executionRatio =
      plannedMinutes > 0 && isRealizedAvailable ? realizedVal / plannedMinutes : null
    return {
      plannedMinutes,
      realizedMinutes: isRealizedAvailable ? realizedVal : null,
      pendingMinutes,
      executionRatio,
      state: 'completed',
      isRealizedAvailable,
      isOperationallyCompleted: true,
    }
  }

  if (plannedMinutes <= 0) {
    return {
      plannedMinutes,
      realizedMinutes,
      pendingMinutes: isRealizedAvailable ? 0 : null,
      executionRatio: null,
      state: 'no_planned_minutes',
      isRealizedAvailable,
      isOperationallyCompleted: false,
    }
  }

  if (!isRealizedAvailable) {
    return {
      plannedMinutes,
      realizedMinutes: null,
      pendingMinutes: null,
      executionRatio: null,
      state: 'unknown',
      isRealizedAvailable: false,
      isOperationallyCompleted: false,
    }
  }

  const realizedVal = realizedMinutes
  const pendingMinutes = Math.max(0, plannedMinutes - realizedVal)
  const executionRatio = realizedVal / plannedMinutes

  if (realizedVal === 0) {
    return {
      plannedMinutes,
      realizedMinutes: 0,
      pendingMinutes: plannedMinutes,
      executionRatio: 0,
      state: 'not_started',
      isRealizedAvailable: true,
      isOperationallyCompleted: false,
    }
  }

  if (realizedVal > plannedMinutes) {
    return {
      plannedMinutes,
      realizedMinutes: realizedVal,
      pendingMinutes: 0,
      executionRatio,
      state: 'over_planned',
      isRealizedAvailable: true,
      isOperationallyCompleted: false,
    }
  }

  if (realizedVal >= plannedMinutes) {
    return {
      plannedMinutes,
      realizedMinutes: realizedVal,
      pendingMinutes: 0,
      executionRatio,
      state: 'reached_planned',
      isRealizedAvailable: true,
      isOperationallyCompleted: false,
    }
  }

  return {
    plannedMinutes,
    realizedMinutes: realizedVal,
    pendingMinutes,
    executionRatio,
    state: 'in_progress',
    isRealizedAvailable: true,
    isOperationallyCompleted: false,
  }
}

export function resolvePlanningItemProgress(
  summary: PlanningExecutionSummary,
): PlanningItemProgress {
  if (summary.plannedMinutes <= 0) {
    return {
      showBar: false,
      percent: 0,
      isOverPlanned: false,
      emptyLabel: 'Sem tempo previsto',
      overLabel: null,
    }
  }

  if (!summary.isRealizedAvailable || summary.realizedMinutes === null) {
    return {
      showBar: false,
      percent: 0,
      isOverPlanned: false,
      emptyLabel: null,
      overLabel: null,
    }
  }

  const ratio = summary.realizedMinutes / summary.plannedMinutes
  const isOverPlanned = summary.state === 'over_planned'
  return {
    showBar: true,
    percent: Math.min(100, Math.round(ratio * 100)),
    isOverPlanned,
    emptyLabel: null,
    overLabel: isOverPlanned ? 'Acima do planejado' : null,
  }
}

export function buildPlanningExecutionDisplayLines(
  summary: PlanningExecutionSummary,
): PlanningExecutionDisplayLines {
  const plannedLine = `Planejado: ${formatPlanningMinutes(summary.plannedMinutes)}`

  if (!summary.isRealizedAvailable) {
    return {
      plannedLine,
      realizedLine: null,
      pendingLine: null,
      alertLine: null,
      unavailableLine: 'Realizado indisponível',
    }
  }

  const realizedVal = summary.realizedMinutes ?? 0
  const realizedLine =
    realizedVal === 0
      ? 'Sem apontamento'
      : `Realizado: ${formatPlanningMinutes(realizedVal)}`

  let pendingLine: string | null = null
  if (
    summary.pendingMinutes != null &&
    summary.pendingMinutes > 0 &&
    (summary.state === 'in_progress' || summary.state === 'not_started')
  ) {
    pendingLine = `Pendente: ${formatPlanningMinutes(summary.pendingMinutes)}`
  }

  let alertLine: string | null = null
  if (summary.state === 'over_planned') {
    alertLine = 'Acima do planejado'
  } else if (summary.state === 'reached_planned') {
    alertLine = 'Realizado atingiu o planejado'
  }

  return {
    plannedLine,
    realizedLine,
    pendingLine,
    alertLine,
    unavailableLine: null,
  }
}
