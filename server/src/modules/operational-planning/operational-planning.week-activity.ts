/** Histórico operacional compacto da semana (R7-S4). */

import { EXECUTION_OUTSIDE_PLAN_TIMEZONE } from './operational-planning.execution-outside-plan.js'

export type WeekActivityKind = 'TIME_ENTRY' | 'STEP_COMPLETED' | 'STEP_REOPENED'

export type WeekActivityTimeEntryRow = {
  id: string
  occurred_at: Date
  conveyor_id: string
  conveyor_name: string
  activity_node_id: string
  activity_title: string
  task_title: string
  sector_title: string
  collaborator_id: string
  collaborator_name: string
  minutes: number
  entry_origin: 'ASSIGNED' | 'UNASSIGNED_EXCEPTION'
  exception_justification: string | null
  outside_plan: boolean
}

export type WeekActivityStepEventRow = {
  id: string
  occurred_at: Date
  event_type: 'CONVEYOR_STEP_COMPLETED' | 'CONVEYOR_STEP_REOPENED'
  conveyor_id: string
  conveyor_name: string
  activity_node_id: string
  activity_title: string
  task_title: string
  sector_title: string
  actor_name: string | null
}

export type OperationalPlanningWeekActivityItemApi = {
  id: string
  occurredAt: string
  kind: WeekActivityKind
  conveyorId: string
  conveyorName: string
  activityNodeId: string
  taskName: string | null
  areaName: string | null
  activityName: string
  collaboratorId: string | null
  collaboratorName: string | null
  actorName: string | null
  minutes: number | null
  entryOrigin: 'ASSIGNED' | 'UNASSIGNED_EXCEPTION' | null
  exceptionJustification: string | null
  outsidePlan: boolean | null
  description: string
}

export function mapWeekActivityTimeEntryToApi(
  row: WeekActivityTimeEntryRow,
): OperationalPlanningWeekActivityItemApi {
  const collaboratorName = row.collaborator_name?.trim() || null
  const activityName = row.activity_title?.trim() || 'Atividade'
  const minutes = Math.max(0, Math.floor(row.minutes) || 0)
  const exception =
    row.entry_origin === 'UNASSIGNED_EXCEPTION' ? row.exception_justification?.trim() : null

  let description = `${collaboratorName ?? 'Colaborador'} apontou ${minutes} min em ${activityName}`
  if (row.outside_plan) description += ' (fora do plano)'
  if (exception) description += ` — exceção: ${exception}`

  return {
    id: `te:${row.id}`,
    occurredAt: row.occurred_at.toISOString(),
    kind: 'TIME_ENTRY',
    conveyorId: row.conveyor_id,
    conveyorName: row.conveyor_name,
    activityNodeId: row.activity_node_id,
    taskName: row.task_title?.trim() || null,
    areaName: row.sector_title?.trim() || null,
    activityName,
    collaboratorId: row.collaborator_id,
    collaboratorName,
    actorName: null,
    minutes,
    entryOrigin: row.entry_origin,
    exceptionJustification: row.exception_justification,
    outsidePlan: row.outside_plan,
    description,
  }
}

export function mapWeekActivityStepEventToApi(
  row: WeekActivityStepEventRow,
): OperationalPlanningWeekActivityItemApi {
  const activityName = row.activity_title?.trim() || 'Atividade'
  const actorName = row.actor_name?.trim() || null
  const kind: WeekActivityKind =
    row.event_type === 'CONVEYOR_STEP_REOPENED' ? 'STEP_REOPENED' : 'STEP_COMPLETED'

  const verb = kind === 'STEP_REOPENED' ? 'reabriu' : 'concluiu'
  const description = actorName
    ? `${actorName} ${verb} ${activityName}`
    : `Atividade ${verb}: ${activityName}`

  return {
    id: `ev:${row.id}`,
    occurredAt: row.occurred_at.toISOString(),
    kind,
    conveyorId: row.conveyor_id,
    conveyorName: row.conveyor_name,
    activityNodeId: row.activity_node_id,
    taskName: row.task_title?.trim() || null,
    areaName: row.sector_title?.trim() || null,
    activityName,
    collaboratorId: null,
    collaboratorName: null,
    actorName,
    minutes: null,
    entryOrigin: null,
    exceptionJustification: null,
    outsidePlan: null,
    description,
  }
}

export function mergeWeekActivityItems(
  timeEntries: readonly WeekActivityTimeEntryRow[],
  stepEvents: readonly WeekActivityStepEventRow[],
  limit: number,
): { items: OperationalPlanningWeekActivityItemApi[]; hasMore: boolean } {
  const merged = [
    ...timeEntries.map(mapWeekActivityTimeEntryToApi),
    ...stepEvents.map(mapWeekActivityStepEventToApi),
  ].sort((a, b) => {
    const t = b.occurredAt.localeCompare(a.occurredAt)
    if (t !== 0) return t
    return b.id.localeCompare(a.id)
  })

  const capped = Math.max(1, Math.min(200, Math.floor(limit) || 100))
  const hasMore = merged.length > capped
  return {
    items: merged.slice(0, capped),
    hasMore,
  }
}

export { EXECUTION_OUTSIDE_PLAN_TIMEZONE }
