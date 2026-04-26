import type pg from 'pg'
import { randomUUID } from 'node:crypto'

export type ConveyorNodeRow = {
  id: string
  conveyor_id: string
  node_type: 'OPTION' | 'AREA' | 'STEP'
}

export async function findConveyorNodeById(
  pool: pg.Pool,
  nodeId: string,
): Promise<ConveyorNodeRow | null> {
  const r = await pool.query<ConveyorNodeRow>(
    `SELECT id, conveyor_id, node_type
     FROM conveyor_nodes
     WHERE id = $1::uuid AND deleted_at IS NULL`,
    [nodeId],
  )
  return r.rows[0] ?? null
}

export type InsertConveyorNodeAssigneeRow = {
  id: string
  conveyor_id: string
  conveyor_node_id: string
  assignment_type: 'COLLABORATOR' | 'TEAM'
  collaborator_id: string | null
  team_id: string | null
  is_primary: boolean
  assignment_origin: 'manual' | 'base' | 'reaproveitada'
  order_index: number
  metadata_json: unknown | null
}

/** Pool ou cliente de transação. */
export type PoolOrClient = pg.Pool | pg.PoolClient

export async function insertConveyorNodeAssignee(
  pool: PoolOrClient,
  row: InsertConveyorNodeAssigneeRow,
): Promise<{ id: string }> {
  const r = await pool.query<{ id: string }>(
    `INSERT INTO conveyor_node_assignees (
      id, conveyor_id, conveyor_node_id, assignment_type, collaborator_id, team_id,
      is_primary, assignment_origin, order_index, metadata_json
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10::jsonb
    )
    RETURNING id`,
    [
      row.id,
      row.conveyor_id,
      row.conveyor_node_id,
      row.assignment_type,
      row.collaborator_id,
      row.team_id,
      row.is_primary,
      row.assignment_origin,
      row.order_index,
      row.metadata_json === null || row.metadata_json === undefined
        ? null
        : JSON.stringify(row.metadata_json),
    ],
  )
  const out = r.rows[0]
  if (!out) throw new Error('insert conveyor_node_assignees failed')
  return { id: out.id }
}

export type InsertConveyorTimeEntryRow = {
  id: string
  conveyor_id: string
  conveyor_node_id: string
  collaborator_id: string
  conveyor_node_assignee_id: string | null
  entry_at: Date | string
  minutes: number
  notes: string | null
  entry_mode: 'manual' | 'guided' | 'imported'
  metadata_json: unknown | null
}

export async function insertConveyorTimeEntry(
  pool: PoolOrClient,
  row: InsertConveyorTimeEntryRow,
): Promise<{ id: string }> {
  const r = await pool.query<{ id: string }>(
    `INSERT INTO conveyor_time_entries (
      id, conveyor_id, conveyor_node_id, collaborator_id,
      conveyor_node_assignee_id, entry_at, minutes, notes, entry_mode, metadata_json
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8, $9, $10::jsonb
    )
    RETURNING id`,
    [
      row.id,
      row.conveyor_id,
      row.conveyor_node_id,
      row.collaborator_id,
      row.conveyor_node_assignee_id,
      typeof row.entry_at === 'string' ? row.entry_at : row.entry_at.toISOString(),
      row.minutes,
      row.notes,
      row.entry_mode,
      row.metadata_json === null || row.metadata_json === undefined
        ? null
        : JSON.stringify(row.metadata_json),
    ],
  )
  const out = r.rows[0]
  if (!out) throw new Error('insert conveyor_time_entries failed')
  return { id: out.id }
}

export function newAssignmentId(): string {
  return randomUUID()
}

export type ConveyorNodeAssigneeRow = {
  id: string
  conveyor_id: string
  conveyor_node_id: string
  assignment_type: 'COLLABORATOR' | 'TEAM'
  collaborator_id: string | null
  team_id: string | null
  is_primary: boolean
  assignment_origin: 'manual' | 'base' | 'reaproveitada'
  order_index: number
  created_at: Date
  updated_at: Date
}

export type ConveyorNodeAssigneeListRow = {
  id: string
  assignment_type: 'COLLABORATOR' | 'TEAM'
  collaborator_id: string | null
  team_id: string | null
  collaborator_name: string | null
  team_name: string | null
  is_primary: boolean
  assignment_origin: 'manual' | 'base' | 'reaproveitada'
  order_index: number
  created_at: Date
  updated_at: Date
}

export async function findConveyorNodeAssigneeById(
  pool: pg.Pool,
  id: string,
): Promise<ConveyorNodeAssigneeRow | null> {
  const r = await pool.query<ConveyorNodeAssigneeRow>(
    `SELECT id, conveyor_id, conveyor_node_id, assignment_type, collaborator_id, team_id,
            is_primary, assignment_origin, order_index, created_at, updated_at
     FROM conveyor_node_assignees
     WHERE id = $1::uuid AND deleted_at IS NULL`,
    [id],
  )
  const row = r.rows[0]
  return row ?? null
}

/** Alocação ativa do colaborador no STEP (para apontamento autenticado). */
export async function findAssigneeIdForStepAndCollaborator(
  pool: pg.Pool,
  conveyorId: string,
  conveyorNodeId: string,
  collaboratorId: string,
): Promise<string | null> {
  const r = await pool.query<{ id: string }>(
    `SELECT id::text
     FROM conveyor_node_assignees
     WHERE conveyor_id = $1::uuid
       AND conveyor_node_id = $2::uuid
       AND assignment_type = 'COLLABORATOR'
       AND collaborator_id = $3::uuid
       AND deleted_at IS NULL
     LIMIT 1`,
    [conveyorId, conveyorNodeId, collaboratorId],
  )
  return r.rows[0]?.id ?? null
}

export async function listConveyorNodeAssigneesByStep(
  pool: pg.Pool,
  conveyorId: string,
  conveyorNodeId: string,
): Promise<ConveyorNodeAssigneeListRow[]> {
  const r = await pool.query<ConveyorNodeAssigneeListRow>(
    `SELECT cna.id, cna.assignment_type, cna.collaborator_id, c.full_name AS collaborator_name,
            cna.team_id, t.name AS team_name,
            cna.is_primary, cna.assignment_origin, cna.order_index,
            cna.created_at, cna.updated_at
     FROM conveyor_node_assignees cna
     LEFT JOIN collaborators c ON c.id = cna.collaborator_id AND c.deleted_at IS NULL
     LEFT JOIN teams t ON t.id = cna.team_id AND t.deleted_at IS NULL
     WHERE cna.conveyor_id = $1::uuid
       AND cna.conveyor_node_id = $2::uuid
       AND cna.deleted_at IS NULL
     ORDER BY cna.is_primary DESC, cna.order_index ASC, cna.created_at ASC`,
    [conveyorId, conveyorNodeId],
  )
  return r.rows
}

export async function softDeleteConveyorNodeAssignee(
  pool: pg.Pool,
  args: { id: string; conveyorId: string; conveyorNodeId: string },
): Promise<boolean> {
  const r = await pool.query(
    `UPDATE conveyor_node_assignees
     SET deleted_at = now(), updated_at = now()
     WHERE id = $1::uuid
       AND conveyor_id = $2::uuid
       AND conveyor_node_id = $3::uuid
       AND deleted_at IS NULL
     RETURNING id`,
    [args.id, args.conveyorId, args.conveyorNodeId],
  )
  return r.rowCount !== null && r.rowCount > 0
}

export type ConveyorTimeEntryRow = {
  id: string
  conveyor_id: string
  conveyor_node_id: string
  collaborator_id: string
  conveyor_node_assignee_id: string | null
  entry_at: Date
  minutes: number
  notes: string | null
  entry_mode: 'manual' | 'guided' | 'imported'
  metadata_json: unknown | null
  created_at: Date
  updated_at: Date
}

export type ConveyorTimeEntryListRow = {
  id: string
  collaborator_id: string
  collaborator_name: string | null
  conveyor_node_assignee_id: string | null
  minutes: number
  notes: string | null
  entry_mode: 'manual' | 'guided' | 'imported'
  metadata_json: unknown | null
  recorded_by_user_email: string | null
  entry_at: Date
  created_at: Date
  updated_at: Date
}

export async function findConveyorTimeEntryById(
  pool: pg.Pool,
  id: string,
): Promise<ConveyorTimeEntryRow | null> {
  const r = await pool.query<ConveyorTimeEntryRow>(
    `SELECT id, conveyor_id, conveyor_node_id, collaborator_id,
            conveyor_node_assignee_id, entry_at, minutes, notes, entry_mode,
            metadata_json,
            created_at, updated_at
     FROM conveyor_time_entries
     WHERE id = $1::uuid AND deleted_at IS NULL`,
    [id],
  )
  return r.rows[0] ?? null
}

export async function listConveyorTimeEntriesByStep(
  pool: pg.Pool,
  conveyorId: string,
  conveyorNodeId: string,
): Promise<ConveyorTimeEntryListRow[]> {
  const r = await pool.query<ConveyorTimeEntryListRow>(
    `SELECT cte.id, cte.collaborator_id, c.full_name AS collaborator_name,
            cte.conveyor_node_assignee_id, cte.minutes, cte.notes, cte.entry_mode,
            cte.metadata_json,
            au.email AS recorded_by_user_email,
            cte.entry_at, cte.created_at, cte.updated_at
     FROM conveyor_time_entries cte
     LEFT JOIN collaborators c ON c.id = cte.collaborator_id AND c.deleted_at IS NULL
     LEFT JOIN app_users au
       ON au.id = (cte.metadata_json->>'recordedByAppUserId')::uuid
      AND au.deleted_at IS NULL
     WHERE cte.conveyor_id = $1::uuid
       AND cte.conveyor_node_id = $2::uuid
       AND cte.deleted_at IS NULL
     ORDER BY cte.entry_at DESC, cte.created_at DESC`,
    [conveyorId, conveyorNodeId],
  )
  return r.rows
}

export async function softDeleteConveyorTimeEntry(
  pool: PoolOrClient,
  args: { id: string; conveyorId: string; conveyorNodeId: string },
): Promise<boolean> {
  const r = await pool.query(
    `UPDATE conveyor_time_entries
     SET deleted_at = now(), updated_at = now()
     WHERE id = $1::uuid
       AND conveyor_id = $2::uuid
       AND conveyor_node_id = $3::uuid
       AND deleted_at IS NULL
     RETURNING id`,
    [args.id, args.conveyorId, args.conveyorNodeId],
  )
  return r.rowCount !== null && r.rowCount > 0
}
