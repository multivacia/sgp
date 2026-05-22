/** Apontamentos da semana sem item ativo correspondente no plano semanal (R7-S2). */

export const EXECUTION_OUTSIDE_PLAN_TIMEZONE = 'America/Sao_Paulo' as const

export type ExecutionOutsidePlanEntryRow = {
  id: string
  conveyor_id: string
  conveyor_title: string
  activity_node_id: string
  activity_title: string
  task_title: string
  sector_title: string
  collaborator_id: string
  collaborator_name: string
  entry_at: Date
  minutes: number
  entry_origin: 'ASSIGNED' | 'UNASSIGNED_EXCEPTION'
  exception_justification: string | null
  notes: string | null
}

export type ExecutionOutsidePlanSummary = {
  totalMinutes: number
  entriesCount: number
  activitiesCount: number
  conveyorsCount: number
}

export function buildExecutionOutsidePlanSummary(
  rows: readonly Pick<
    ExecutionOutsidePlanEntryRow,
    'minutes' | 'activity_node_id' | 'conveyor_id'
  >[],
): ExecutionOutsidePlanSummary {
  let totalMinutes = 0
  const activityIds = new Set<string>()
  const conveyorIds = new Set<string>()

  for (const row of rows) {
    totalMinutes += Math.max(0, Math.floor(row.minutes) || 0)
    activityIds.add(row.activity_node_id)
    conveyorIds.add(row.conveyor_id)
  }

  return {
    totalMinutes,
    entriesCount: rows.length,
    activitiesCount: activityIds.size,
    conveyorsCount: conveyorIds.size,
  }
}

export function mapExecutionOutsidePlanEntryToApi(row: ExecutionOutsidePlanEntryRow) {
  return {
    id: row.id,
    conveyorId: row.conveyor_id,
    conveyorTitle: row.conveyor_title,
    activityNodeId: row.activity_node_id,
    activityTitle: row.activity_title,
    taskTitle: row.task_title,
    sectorTitle: row.sector_title,
    collaboratorId: row.collaborator_id,
    collaboratorName: row.collaborator_name,
    entryAt: row.entry_at.toISOString(),
    minutes: row.minutes,
    entryOrigin: row.entry_origin,
    exceptionJustification: row.exception_justification,
    notes: row.notes,
  }
}
