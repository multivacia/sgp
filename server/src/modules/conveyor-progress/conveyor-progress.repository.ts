import type pg from 'pg'

export type ConveyorProgressConveyorRow = {
  id: string
  code: string | null
  name: string
  operational_status: string
}

export type ConveyorProgressStepRow = {
  conveyor_id: string
  step_id: string
  step_name: string
  step_order: number
  planned_minutes: number | null
  operational_status: string | null
  area_id: string
  area_name: string
  area_order: number
  option_id: string
  option_name: string
  option_order: number
}

export type ConveyorProgressTimeEntryRow = {
  id: string
  conveyor_id: string
  conveyor_node_id: string
  entry_at: Date
  minutes: number
  executed_quantity: number | null
  notes: string | null
  entry_mode: string
  collaborator_name: string
  session_completion_pct: number | null
}

export type ConveyorProgressAssigneeRow = {
  conveyor_node_id: string
  collaborator_name: string
}

export type ConveyorProgressFilters = {
  search?: string
  operationalStatus?: string
  timeEntryFrom?: string
  timeEntryTo?: string
  collaboratorId?: string
}

export async function listConveyorsForProgress(
  pool: pg.Pool,
  filters: ConveyorProgressFilters,
): Promise<ConveyorProgressConveyorRow[]> {
  const params: unknown[] = []
  const where: string[] = ['c.deleted_at IS NULL']

  if (filters.search) {
    params.push(`%${filters.search}%`)
    where.push(`(c.name ILIKE $${params.length} OR c.code ILIKE $${params.length})`)
  }
  if (filters.operationalStatus) {
    params.push(filters.operationalStatus)
    where.push(`c.operational_status = $${params.length}`)
  }

  const r = await pool.query<ConveyorProgressConveyorRow>(
    `
    SELECT
      c.id::text AS id,
      c.code,
      c.name,
      c.operational_status::text AS operational_status
    FROM conveyors c
    WHERE ${where.join(' AND ')}
    ORDER BY c.created_at DESC
    `,
    params,
  )
  return r.rows
}

export async function listStepHierarchyForConveyors(
  pool: pg.Pool,
  conveyorIds: string[],
): Promise<ConveyorProgressStepRow[]> {
  if (conveyorIds.length === 0) return []

  const r = await pool.query<{
    conveyor_id: string
    step_id: string
    step_name: string
    step_order: number
    planned_minutes: string | number | null
    operational_status: string | null
    area_id: string
    area_name: string
    area_order: number
    option_id: string
    option_name: string
    option_order: number
  }>(
    `
    SELECT
      step.conveyor_id::text AS conveyor_id,
      step.id::text AS step_id,
      step.name AS step_name,
      step.order_index AS step_order,
      step.planned_minutes,
      step.operational_status::text AS operational_status,
      area.id::text AS area_id,
      area.name AS area_name,
      area.order_index AS area_order,
      opt.id::text AS option_id,
      opt.name AS option_name,
      opt.order_index AS option_order
    FROM conveyor_nodes step
    INNER JOIN conveyor_nodes area
      ON area.id = step.parent_id
      AND area.node_type = 'AREA'
      AND area.deleted_at IS NULL
    INNER JOIN conveyor_nodes opt
      ON opt.id = area.parent_id
      AND opt.node_type = 'OPTION'
      AND opt.deleted_at IS NULL
    WHERE step.conveyor_id = ANY($1::uuid[])
      AND step.node_type = 'STEP'
      AND step.deleted_at IS NULL
    ORDER BY step.conveyor_id, opt.order_index, area.order_index, step.order_index
    `,
    [conveyorIds],
  )

  return r.rows.map((row) => ({
    conveyor_id: row.conveyor_id,
    step_id: row.step_id,
    step_name: row.step_name,
    step_order: row.step_order,
    operational_status: row.operational_status,
    planned_minutes:
      row.planned_minutes == null || row.planned_minutes === ''
        ? null
        : Number(row.planned_minutes),
    area_id: row.area_id,
    area_name: row.area_name,
    area_order: row.area_order,
    option_id: row.option_id,
    option_name: row.option_name,
    option_order: row.option_order,
  }))
}

export async function listTimeEntriesForConveyors(
  pool: pg.Pool,
  conveyorIds: string[],
  filters: Pick<ConveyorProgressFilters, 'timeEntryFrom' | 'timeEntryTo' | 'collaboratorId'>,
): Promise<ConveyorProgressTimeEntryRow[]> {
  if (conveyorIds.length === 0) return []

  const params: unknown[] = [conveyorIds]
  const where: string[] = [
    'te.conveyor_id = ANY($1::uuid[])',
    'te.deleted_at IS NULL',
  ]

  if (filters.timeEntryFrom) {
    params.push(filters.timeEntryFrom)
    where.push(`te.entry_at >= $${params.length}::timestamptz`)
  }
  if (filters.timeEntryTo) {
    params.push(filters.timeEntryTo)
    where.push(`te.entry_at <= $${params.length}::timestamptz`)
  }
  if (filters.collaboratorId) {
    params.push(filters.collaboratorId)
    where.push(`te.collaborator_id = $${params.length}::uuid`)
  }

  const r = await pool.query<{
    id: string
    conveyor_id: string
    conveyor_node_id: string
    entry_at: Date
    minutes: number
    executed_quantity: number | null
    notes: string | null
    entry_mode: string
    collaborator_name: string
    session_completion_pct: number | null
  }>(
    `
    SELECT
      te.id::text AS id,
      te.conveyor_id::text AS conveyor_id,
      te.conveyor_node_id::text AS conveyor_node_id,
      te.entry_at,
      te.minutes,
      te.executed_quantity,
      te.notes,
      te.entry_mode::text AS entry_mode,
      col.full_name AS collaborator_name,
      te.session_completion_pct
    FROM conveyor_time_entries te
    INNER JOIN collaborators col ON col.id = te.collaborator_id
    WHERE ${where.join(' AND ')}
    ORDER BY te.entry_at DESC
    `,
    params,
  )

  return r.rows
}

export async function listPrimaryAssigneesForConveyors(
  pool: pg.Pool,
  conveyorIds: string[],
): Promise<ConveyorProgressAssigneeRow[]> {
  if (conveyorIds.length === 0) return []

  const r = await pool.query<ConveyorProgressAssigneeRow>(
    `
    SELECT
      cna.conveyor_node_id::text AS conveyor_node_id,
      col.full_name AS collaborator_name
    FROM conveyor_node_assignees cna
    INNER JOIN collaborators col ON col.id = cna.collaborator_id
    WHERE cna.conveyor_id = ANY($1::uuid[])
      AND cna.is_primary = TRUE
      AND cna.deleted_at IS NULL
      AND col.deleted_at IS NULL
    `,
    [conveyorIds],
  )
  return r.rows
}

/** Esteiras com apontamentos ou alocação do colaborador (filtro de colaborador). */
export async function listConveyorIdsForCollaboratorFilter(
  pool: pg.Pool,
  conveyorIds: string[],
  collaboratorId: string,
): Promise<Set<string>> {
  if (conveyorIds.length === 0) return new Set()

  const r = await pool.query<{ conveyor_id: string }>(
    `
    SELECT DISTINCT conveyor_id::text AS conveyor_id
    FROM (
      SELECT te.conveyor_id
      FROM conveyor_time_entries te
      WHERE te.conveyor_id = ANY($1::uuid[])
        AND te.collaborator_id = $2::uuid
        AND te.deleted_at IS NULL
      UNION
      SELECT cna.conveyor_id
      FROM conveyor_node_assignees cna
      WHERE cna.conveyor_id = ANY($1::uuid[])
        AND cna.collaborator_id = $2::uuid
        AND cna.deleted_at IS NULL
    ) x
    `,
    [conveyorIds, collaboratorId],
  )
  return new Set(r.rows.map((row) => row.conveyor_id))
}
